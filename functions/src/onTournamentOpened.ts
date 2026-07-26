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
import { buildOpenDigest } from "./core/newsDigestCore";
import { buildOpenPrompt } from "./core/newsPrompts";
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

export const onTournamentOpened = onDocumentCreated(
  { document: "tournaments/{tournamentId}", secrets: ["ANTHROPIC_API_KEY"] },
  async (event) => {
    const tournamentId = event.params.tournamentId;
    const data = event.data?.data();
    // Only real Lab publishes (status 'active'). Drafts/ended never fire.
    if (!data || data.status !== "active") return;

    try {
      // Idempotency — one open draft per Tournament (origin+tournamentId).
      const existing = await existingDraftKeys(tournamentId);
      if (newsDraftExists(existing, "event_open", tournamentId)) return;

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        logger.error("onTournamentOpened: ANTHROPIC_API_KEY unset — skipping");
        return;
      }
      const asOf = kstStamp(Date.now());
      const meta = {
        id: tournamentId,
        title: String(data.title ?? ""),
        category: String(data.category ?? ""),
        totalContestants: Number(data.totalContestants ?? 48),
        deadlineMs:
          typeof data.tournamentDeadline === "number"
            ? data.tournamentDeadline
            : (data.tournamentDeadline?.toMillis?.() ?? null),
      };
      const digest = buildOpenDigest(meta, asOf);
      const prompt = buildOpenPrompt({ title: meta.title, category: meta.category, digest });

      const draft = await assembleLocalizedDraft(
        {
          slug: newNewsSlug(kstDate()),
          template: "open",
          origin: "event_open",
          sourceLang: "ko",
          prompt,
          evidence: { asOf: digest.asOf, stats: digest.stats, tournamentId },
          tournamentId,
        },
        { createMessage: makeNewsCreateMessage(apiKey), logError: (m, e) => logger.error(m, e) },
      );
      await writeNewsDraft(draft);
      logger.info(`onTournamentOpened: open draft ${draft.slug} for ${tournamentId}`);
    } catch (err) {
      // Never throw — a permanent failure must not retry-storm the trigger.
      logger.error(`onTournamentOpened: failed for ${tournamentId}`, err);
    }
  },
);
