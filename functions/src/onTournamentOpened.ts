/**
 * onTournamentOpened — Firestore trigger: a new Tournament (Lab 발행 = status
 * 'active' 생성) → an OPEN news DRAFT (ND-1 §3 #6, AC 2).
 *
 * Separate file from onChampionConfirmed (Crown Card) — never modify that trigger.
 * Idempotent (at-least-once 대비): skips if an event_open draft already exists for
 * this Tournament. DRAFT-ONLY — the pipeline hard-codes status:'draft' (AC 1). A
 * generation failure is logged and swallowed (no retry-storm), never thrown.
 *
 * Region inherits asia-northeast3 from setGlobalOptions (index.ts).
 */
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { runOpenDraft } from "./core/newsDraftRunners";
import {
  makeNewsCreateMessage,
  newNewsSlug,
  kstStamp,
  existingDraftKeys,
  writeNewsDraft,
} from "./newsShared";
import { kstDate } from "./core/voteRecord";
import { newsDraftAiOff } from "./core/newsAiSwitch";

export const onTournamentOpened = onDocumentCreated(
  { document: "tournaments/{tournamentId}", secrets: ["ANTHROPIC_API_KEY"] },
  async (event) => {
    const tournamentId = event.params.tournamentId;
    const data = event.data?.data();
    // Only real Lab publishes (status 'active'). Drafts/ended never fire.
    if (!data || data.status !== "active") return;
    // 시험 서버에서만 끄는 스위치(core/newsAiSwitch) — 실서비스는 늘 만든다.
    if (newsDraftAiOff(process.env)) return;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logger.error("onTournamentOpened: ANTHROPIC_API_KEY unset — skipping");
      return;
    }

    try {
      // 시험 대회(NEWS-0a · isTestTournament) 는 몸통이 AI 를 부르기 전에 거른다. 멱등도 몸통에서.
      const outcome = await runOpenDraft(tournamentId, data, {
        existingDraftKeys,
        createMessage: makeNewsCreateMessage(apiKey),
        writeNewsDraft,
        newSlug: newNewsSlug,
        kstDay: kstDate,
        stamp: kstStamp,
        nowMs: Date.now,
        logError: (m, e) => logger.error(m, e),
        logInfo: (m) => logger.info(m),
      });
      if (outcome === "test-tournament") logger.info(`onTournamentOpened: test tournament ${tournamentId} — no draft`);
    } catch (err) {
      // Never throw — a permanent failure must not retry-storm the trigger.
      logger.error(`onTournamentOpened: failed for ${tournamentId}`, err);
    }
  },
);
