/**
 * onChampionForNews — Firestore trigger: a Voter completing THE FINAL
 * (roundProgress.complete false→true) is the timing signal that a Tournament has
 * reached a conclusion → a RESULT news DRAFT (ND-1 §3 #6, AC 2).
 *
 * Separate file from onChampionConfirmed (Crown Card) — that trigger is never
 * modified. Reuses its pure false→true edge guard (shouldGenerateCrownCard).
 * Idempotent: only the FIRST completion edge per Tournament creates the result
 * draft (event_champion+tournamentId); later completers skip. The headline
 * Champion is the aggregate ranking_cache #1 (a per-Voter bracket has no single
 * global winner). DRAFT-ONLY (AC 1); failures are logged, never thrown.
 */
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { adminDb } from "./admin";
import {
  shouldGenerateCrownCard,
  type RoundProgressData,
} from "./core/onChampionConfirmedCore";
import { buildResultDigest, type RankingRowLike } from "./core/newsDigestCore";
import { buildResultPrompt } from "./core/newsPrompts";
import { assembleLocalizedDraft } from "./core/newsDraftPipeline";
import { newsDraftExists } from "./core/newsDraftAssembly";
import {
  makeNewsCreateMessage,
  newNewsSlug,
  kstStamp,
  existingDraftKeys,
  writeNewsDraft,
} from "./newsShared";
import { kstDate } from "./core/voteRecord";

function rankingsOf(data: FirebaseFirestore.DocumentData | undefined): RankingRowLike[] {
  const rows = (data?.rankings ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    rank: Number(r.rank ?? 0),
    contestantId: String(r.contestantId ?? ""),
    name: String(r.name ?? ""),
    rate: Number(r.rate ?? 0),
  }));
}

export const onChampionForNews = onDocumentUpdated(
  { document: "roundProgress/{progressId}", secrets: ["ANTHROPIC_API_KEY"] },
  async (event) => {
    const before = event.data?.before.data() as RoundProgressData | undefined;
    const after = event.data?.after.data() as RoundProgressData | undefined;
    if (!shouldGenerateCrownCard(before, after) || !after) return;
    const tournamentId = String(after.tournamentId);

    try {
      const existing = await existingDraftKeys(tournamentId);
      if (newsDraftExists(existing, "event_champion", tournamentId)) return;

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        logger.error("onChampionForNews: ANTHROPIC_API_KEY unset — skipping");
        return;
      }

      const [tSnap, cacheSnap] = await Promise.all([
        adminDb.collection("tournaments").doc(tournamentId).get(),
        adminDb.collection("ranking_cache").doc(tournamentId).get(),
      ]);
      const t = tSnap.data();
      const rankings = rankingsOf(cacheSnap.data());
      // evidence 0건 (아직 집계 없음) → 결과 기사 무의미, 조용히 skip.
      if (!t || rankings.length === 0) {
        logger.info(`onChampionForNews: no evidence yet for ${tournamentId} — skip`);
        return;
      }

      const asOf = kstStamp(Date.now());
      const meta = {
        id: tournamentId,
        title: String(t.title ?? ""),
        category: String(t.category ?? ""),
        totalContestants: Number(t.totalContestants ?? 48),
      };
      const championId = rankings[0]?.contestantId;
      const digest = buildResultDigest({ meta, rankings, championId, asOf });
      const prompt = buildResultPrompt({
        title: meta.title,
        championName: digest.leaders[0]?.name ?? "",
        digest,
      });

      const draft = await assembleLocalizedDraft(
        {
          slug: newNewsSlug(kstDate()),
          template: "result",
          origin: "event_champion",
          sourceLang: "ko",
          prompt,
          evidence: { asOf: digest.asOf, stats: digest.stats, tournamentId },
          tournamentId,
        },
        { createMessage: makeNewsCreateMessage(apiKey), logError: (m, e) => logger.error(m, e) },
      );
      await writeNewsDraft(draft);
      logger.info(`onChampionForNews: result draft ${draft.slug} for ${tournamentId}`);
    } catch (err) {
      logger.error(`onChampionForNews: failed for ${tournamentId}`, err);
    }
  },
);
