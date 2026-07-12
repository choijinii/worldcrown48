/**
 * translateTournamentMeta — callable Cloud Function (Domain 2 · The Lab, B-2 §3 #4).
 *
 * Thin adapter around translateTournamentMetaCore. Called at publish to translate
 * title + description into the two missing languages (Haiku, one call). Mirrors
 * aiSuggestKeywords conventions (secret, CORS, per-uid rate limit, cost guard).
 *
 *   request.data:  { title, description, sourceLang }
 *   returns:       { titleI18n:{ko,en,es}, descriptionI18n:{ko,en,es} }
 *
 * On any failure the client (lib/lab/translateMeta.ts) falls back to the original
 * text in every slot so publish still succeeds (ADR-B2 §4).
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import Anthropic from "@anthropic-ai/sdk";
import { ALLOWED_ORIGINS } from "./cors";
import {
  translateTournamentMetaCore,
  TranslateMetaError,
} from "./core/translateTournamentMetaCore";
import { HAIKU_MODEL } from "./core/models";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const TR_MAX_TOKENS = 1024;

const TR_RATE_LIMIT = 5;
const TR_RATE_WINDOW_MS = 60_000;
const uidBuckets = new Map<string, { count: number; windowStart: number }>();

export function checkUidRateLimit(uid: string, now: number): boolean {
  const bucket = uidBuckets.get(uid);
  if (!bucket || now - bucket.windowStart >= TR_RATE_WINDOW_MS) {
    uidBuckets.set(uid, { count: 1, windowStart: now });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= TR_RATE_LIMIT;
}

/** Test-only — clears the per-instance buckets between cases. */
export function __resetTrRateBucketsForTest(): void {
  uidBuckets.clear();
}

export const translateTournamentMeta = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 30,
  },
  async (req): Promise<{ titleI18n: unknown; descriptionI18n: unknown }> => {
    const uid = req.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!checkUidRateLimit(uid, Date.now())) {
      throw new HttpsError(
        "resource-exhausted",
        "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      );
    }

    const apiKey = ANTHROPIC_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError(
        "failed-precondition",
        "ANTHROPIC_API_KEY secret is not set. Run `firebase functions:secrets:set ANTHROPIC_API_KEY`.",
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const createMessage = async (prompt: string): Promise<string> => {
      const resp = await anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: TR_MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      });
      const block = resp.content[0];
      return block && block.type === "text" ? block.text : "";
    };

    try {
      const result = await translateTournamentMetaCore(
        {
          uid,
          title: req.data?.title,
          description: req.data?.description,
          sourceLang: req.data?.sourceLang,
        },
        { createMessage, logError: (msg, e) => logger.error(msg, e) },
      );
      return result;
    } catch (e) {
      if (e instanceof TranslateMetaError) {
        const code =
          e.reason === "unauthenticated"
            ? "unauthenticated"
            : e.reason === "invalid-argument"
              ? "invalid-argument"
              : "internal";
        throw new HttpsError(code, e.message);
      }
      throw new HttpsError("internal", "번역 처리 실패.");
    }
  },
);
