/**
 * scheduleRankingCache — v2 scheduler (KST 09:00·21:00 · asia-northeast3).
 *
 * For every ACTIVE Tournament (tournamentDeadline > now — handoff §9 trap #4; a
 * per-Voter bracket model has no global round to key off) it:
 *   1. loads `votes` ONCE and groups in memory (rankingAggregator — trap #2: no
 *      per-contestant aggregation query, just one collection read),
 *   2. joins contestant metadata so the cache is denormalized for the UI,
 *   3. runs the SAME pure computeRankings / anomaly rules as the client
 *      (buildRankingUpdate core),
 *   4. rotates history (keeps 2 runs — the T-3 24h baseline; see HISTORY_KEEP), writes
 *      `ranking_cache/{tournamentId}`, and creates/refreshes `admin_alerts`.
 *
 * This wrapper is the ONLY place with Firestore I/O + Timestamps; every decision
 * lives in the node-env-tested cores. RTDB is never used (stack consistency).
 *
 * RUN-1 PR 3 (AC 14) — 매시간 전량 재읽기가 비용·중단의 원인이라 **하루 두 번**으로 줄였다.
 * 시각을 고정한 이유는 부하가 아니라 **문구다**: §8 승인 문구가 "오늘 21:00"·"내일 09:00"
 * 이라는 고정 시각이라, 배포 시각 기준 상대 주기(`every 12 hours`)로 두면 발표 시각이
 * 배포할 때마다 달라져 화면이 거짓말을 한다. 크론식 + `timeZone` 은 한 쌍이다 — `timeZone`
 * 이 빠지면 UTC로 돌아 KST 18:00·06:00에 발표된다.
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { buildTallies, tallyVotes, type VoteLike } from "./core/rankingAggregator";
import { buildRankingUpdate } from "./core/scheduleRankingCacheCore";
import type { AnomalyTag, RankingCache, RankingSnapshot } from "./_ranking/rankingTypes";

/**
 * History generations retained — the T-3 baseline is exactly 2 runs back
 * (= 24h at the 09:00/21:00 cadence).
 *
 * 60분 주기 시절에는 24였다. 주기를 하루 2회로 바꾸면서 그대로 두면 T-3(#1 +200% over 24h)의
 * 기준선이 **12일 전**을 가리키게 되어 경보 문구가 사실과 어긋난다 (대표 확정, 2026-09-10).
 *
 * ⚠️ **전환 직후 두 번은 기준선이 짧다.** 배포 후 첫 실행의 `gen-2` 문서는 60분 주기 시절에
 * 쓰인 것이라 24시간이 아니라 ~2시간 전이다 → T-3(+200%)이 헐거워져 거짓 경보가 날 수 있다.
 * T-3은 `PERSISTENT_TAGS` 가 아니라 매번 새 `admin_alerts` 문서를 만든다. 두 번 발표되면
 * (= 24시간) 저절로 맞으므로 코드로 보정하지 않는다.
 *
 * ⚠️ 보관 세대가 24 → 2로 줄어도 회전 로직은 실행당 1건만 지운다. 과거 24세대 시절에 쌓인
 * 문서 일부는 아무 실행도 도달하지 못해 남는다 — 읽히지 않는 데이터이고, 일괄 삭제는
 * §5 DON'T 3으로 금지다.
 */
const HISTORY_KEEP = 2;

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
    // KST 09:00 · 21:00 고정 (AC 14). ❌ "every 12 hours" 금지 — 상대 주기다.
    schedule: "0 9,21 * * *",
    timeZone: "Asia/Seoul",
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

      // 3. baselines: T-4 = prevCache (= 직전 발표, 이제 12시간 전); T-3 = the doc
      //    2 generations back (= 24h at the 09:00/21:00 cadence).
      //    ⚠️ T-4 의 기준선이 1시간 → 12시간으로 늘어난 것은 **알고 남긴 것**이다. 이상 판정
      //    규칙 재설계는 이 PR의 범위 밖이고(대표 지시 2026-09-10), 경보 문구도 건드리지
      //    않는다 — `anomalyRules` 의 "1h" 표기는 실제와 어긋난 채 남아 있다.
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
      //     then prune anything older than the HISTORY_KEEP window.
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
