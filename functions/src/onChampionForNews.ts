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
import { runResultDraft } from "./core/newsDraftRunners";
import {
  makeNewsCreateMessage,
  newNewsSlug,
  kstStamp,
  existingDraftKeys,
  writeNewsDraft,
} from "./newsShared";
import { kstDate } from "./core/voteRecord";
import { newsDraftAiOff } from "./core/newsAiSwitch";

export const onChampionForNews = onDocumentUpdated(
  { document: "roundProgress/{progressId}", secrets: ["ANTHROPIC_API_KEY"] },
  async (event) => {
    const before = event.data?.before.data() as RoundProgressData | undefined;
    const after = event.data?.after.data() as RoundProgressData | undefined;
    if (!shouldGenerateCrownCard(before, after) || !after) return;
    const tournamentId = String(after.tournamentId);
    // 시험 서버에서만 끄는 스위치(core/newsAiSwitch) — 실서비스는 늘 만든다.
    if (newsDraftAiOff(process.env)) return;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logger.error("onChampionForNews: ANTHROPIC_API_KEY unset — skipping");
      return;
    }

    try {
      // 시험 대회(NEWS-0a · isTestTournament) 는 몸통이 AI 를 부르기 전에 거른다.
      const outcome = await runResultDraft(tournamentId, {
        existingDraftKeys,
        loadTournament: async (tid) => (await adminDb.collection("tournaments").doc(tid).get()).data(),
        loadRankingCache: async (tid) => (await adminDb.collection("ranking_cache").doc(tid).get()).data(),
        createMessage: makeNewsCreateMessage(apiKey),
        writeNewsDraft,
        newSlug: newNewsSlug,
        kstDay: kstDate,
        stamp: kstStamp,
        nowMs: Date.now,
        logError: (m, e) => logger.error(m, e),
        logInfo: (m) => logger.info(m),
      });
      if (outcome === "test-tournament") logger.info(`onChampionForNews: test tournament ${tournamentId} — no draft`);
    } catch (err) {
      logger.error(`onChampionForNews: failed for ${tournamentId}`, err);
    }
  },
);
