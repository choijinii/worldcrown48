/**
 * scheduleRankingCache — v2 scheduler (every 60 min · asia-northeast3).
 *
 * For every ACTIVE Tournament (tournamentDeadline > now — handoff §9 trap #4; a
 * per-Voter bracket model has no global round to key off) it:
 *   1. loads `votes` ONCE and groups in memory (rankingAggregator — trap #2: no
 *      per-contestant aggregation query, just one collection read),
 *   2. joins contestant metadata so the cache is denormalized for the UI,
 *   3. runs the SAME pure computeRankings / anomaly rules as the client
 *      (buildRankingUpdate core),
 *   4. rotates history (keeps 24 — the T-3 24h baseline), writes
 *      `ranking_cache/{tournamentId}`, and creates/refreshes `admin_alerts`.
 *
 * This wrapper is the ONLY place with Firestore I/O + Timestamps; every decision
 * lives in the node-env-tested cores. RTDB is never used (stack consistency).
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { buildTallies, tallyVotes, type VoteLike } from "./core/rankingAggregator";
import { buildRankingUpdate } from "./core/scheduleRankingCacheCore";
import type { AnomalyTag, RankingCache, RankingSnapshot } from "./_ranking/rankingTypes";

/** History generations retained — the T-3 baseline is exactly 24 cron runs back. */
const HISTORY_KEEP = 24;

/** Narrow a stored ranking_cache doc to the timestamp-free shape the cores use. */
function toSnapshot(data: FirebaseFirestore.DocumentData): RankingSnapshot {
  return {
    tournamentId: data.tournamentId,
    rankings: data.rankings ?? [],
    totalVotes: data.totalVotes ?? 0,
    generationSequence: data.generationSequence ?? 0,
  };
}

export const scheduleRankingCache = onSchedule(
  {
    schedule: "every 60 minutes",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const now = Timestamp.now();

    // Active = Tournament still open. Single-field range → auto-indexed.
    const active = await adminDb
      .collection("tournaments")
      .where("tournamentDeadline", ">", now)
      .get();

    for (const tournamentDoc of active.docs) {
      const tournamentId = tournamentDoc.id;
      const cacheRef = adminDb.collection("ranking_cache").doc(tournamentId);
      const historyRef = cacheRef.collection("history");

      // 1. votes (one read) + 2. contestants (for name/videoId join).
      const [votesSnap, contestantsSnap, prevSnap] = await Promise.all([
        adminDb.collection("votes").where("tournamentId", "==", tournamentId).get(),
        adminDb.collection("contestants").where("tournamentId", "==", tournamentId).get(),
        cacheRef.get(),
      ]);

      const counts = tallyVotes(
        votesSnap.docs.map((d) => d.data() as VoteLike),
      );
      const tallies = buildTallies(
        counts,
        contestantsSnap.docs.map((d) => ({
          id: d.id,
          name: (d.data().name as string) ?? "",
          // media.embed.videoId — Contestant의 그림은 전부 여기서 나온다(PR-2).
          videoId:
            ((d.data().media as { embed?: { videoId?: string } } | undefined)
              ?.embed?.videoId as string) ?? "",
        })),
      );

      const prevData = prevSnap.exists ? prevSnap.data()! : null;
      const prevCache = prevData ? toSnapshot(prevData) : null;
      const generationSequence = prevCache ? prevCache.generationSequence + 1 : 0;

      // 3. baselines: T-4 = prevCache (1h ago); T-3 = the doc 24 generations back.
      let history24: RankingSnapshot | null = null;
      const wantSeq = generationSequence - HISTORY_KEEP;
      if (wantSeq >= 0) {
        const h = await historyRef.doc(String(wantSeq)).get();
        if (h.exists) history24 = toSnapshot(h.data()!);
      }

      // Persistent (T-1/T-2) alerts already open → dedup (trap #8).
      const openAlerts = await adminDb
        .collection("admin_alerts")
        .where("tournamentId", "==", tournamentId)
        .where("resolved", "==", false)
        .get();
      const existingUnresolvedTags = openAlerts.docs.map(
        (d) => d.data().type as AnomalyTag,
      );

      const update = buildRankingUpdate({
        tournamentId,
        tallies,
        prevCache,
        history24,
        existingUnresolvedTags,
      });

      // 4a. rotate history — store the now-previous cache under its own sequence,
      //     then prune anything older than the 24-generation window.
      if (prevData) {
        await historyRef
          .doc(String(prevCache!.generationSequence))
          .set(prevData);
        const stale = generationSequence - 1 - HISTORY_KEEP;
        if (stale >= 0) {
          await historyRef.doc(String(stale)).delete().catch(() => undefined);
        }
      }

      // 4b. write the fresh cache — PURE Voter data, no anomaly signal (W-2).
      //     (Vote Count carried in voteCount — internal only.)
      const newCache: RankingCache = {
        tournamentId,
        rankings: update.rankings,
        totalVotes: update.totalVotes,
        generationSequence,
        generatedAt: now,
        previousGeneratedAt: (prevData?.generatedAt as Timestamp | undefined) ?? null,
      };
      await cacheRef.set(newCache);

      // 4c. admin_alerts — create new, or refresh the open persistent one (dedup).
      for (const action of update.alertActions) {
        if (action.create) {
          await adminDb.collection("admin_alerts").add({
            type: action.type,
            tournamentId,
            detail: action.detail,
            createdAt: now,
            resolved: false,
          });
        } else {
          const open = openAlerts.docs.find(
            (d) => (d.data().type as AnomalyTag) === action.type,
          );
          if (open) await open.ref.update({ createdAt: now, detail: action.detail });
        }
      }
    }
  },
);
