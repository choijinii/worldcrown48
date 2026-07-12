/**
 * aiSuggestKeywords — callable Cloud Function (Domain 2 · The Lab, STEP 1, B-2).
 *
 * Thin adapter around aiSuggestKeywordsCore: owns the Firebase/Anthropic wiring,
 * leaves validation/prompt/parse to the unit-tested core. Mirrors the
 * aiFillContestants conventions exactly (secret, CORS, per-uid rate limit, cost
 * guard) — the ONLY differences are the Haiku model (cheap/fast for short output)
 * and the returned shape.
 *
 *   request.data:  { title: string, category: string, description?: string }
 *   returns:       { keywords: string[8..12] }
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import Anthropic from "@anthropic-ai/sdk";
import { ALLOWED_ORIGINS } from "./cors";
import {
  aiSuggestKeywordsCore,
  SuggestKeywordsError,
} from "./core/aiSuggestKeywordsCore";
import { HAIKU_MODEL } from "./core/models";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const KW_MAX_TOKENS = 512;

// Per-uid token bucket — 5 calls / uid / minute / instance (trap #10). Same
// algorithm as aiFillContestants; kept separate so keyword + fill quotas don't
// starve each other.
const KW_RATE_LIMIT = 5;
const KW_RATE_WINDOW_MS = 60_000;
const uidBuckets = new Map<string, { count: number; windowStart: number }>();

export function checkUidRateLimit(uid: string, now: number): boolean {
  const bucket = uidBuckets.get(uid);
  if (!bucket || now - bucket.windowStart >= KW_RATE_WINDOW_MS) {
    uidBuckets.set(uid, { count: 1, windowStart: now });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= KW_RATE_LIMIT;
}

/** Test-only — clears the per-instance buckets between cases. */
export function __resetKwRateBucketsForTest(): void {
  uidBuckets.clear();
}

export const aiSuggestKeywords = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 30,
  },
  async (req): Promise<{ keywords: string[] }> => {
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
        max_tokens: KW_MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      });
      const block = resp.content[0];
      return block && block.type === "text" ? block.text : "";
    };

    try {
      const keywords = await aiSuggestKeywordsCore(
        {
          uid,
          title: req.data?.title,
          category: req.data?.category,
          description: req.data?.description,
        },
        { createMessage, logError: (msg, e) => logger.error(msg, e) },
      );
      return { keywords };
    } catch (e) {
      if (e instanceof SuggestKeywordsError) {
        const code =
          e.reason === "unauthenticated"
            ? "unauthenticated"
            : e.reason === "invalid-argument"
              ? "invalid-argument"
              : "internal";
        throw new HttpsError(code, e.message);
      }
      throw new HttpsError("internal", "알 수 없는 오류. 다시 시도해주세요.");
    }
  },
);
