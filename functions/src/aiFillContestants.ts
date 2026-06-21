/**
 * aiFillContestants — callable Cloud Function (Domain 2 · The Lab, Step 1).
 *
 * Thin adapter around aiFillCore: it owns the Firebase/Anthropic wiring and
 * leaves all logic (validation, prompt, parsing) to the unit-tested core.
 *
 *   request.data:  { title: string, category: Category }
 *   returns:       { contestants: AiContestantSuggestion[48] }
 *
 * Conventions mirrored from hashIp (index.ts):
 *   - Functions v2 callable, inherits global maxInstances=10 + Seoul region.
 *   - cors: ALLOWED_ORIGINS (shared list).
 *   - Secret via defineSecret — set with:
 *       firebase functions:secrets:set ANTHROPIC_API_KEY
 *     (NOT a .env file; matches the IP_HASH_SALT pattern.)
 *
 * Cost defense (handoff §9 trap #10): auth + per-uid rate limit run BEFORE the
 * secret is read or the model is called, so a flood spends no Claude tokens.
 * Per-minute in-memory limit (5/uid/min/instance). A cross-instance DAILY cap
 * (50/day) needs a Firestore counter and is tracked as a follow-up — noted in
 * the PR so it isn't silently dropped.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";
import { ALLOWED_ORIGINS } from "./cors";
import { aiFillCore, AiFillError } from "./core/aiFillCore";
import { ContestantParseError } from "./core/parseContestants";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const AI_MODEL = "claude-sonnet-4-6";
const AI_MAX_TOKENS = 4096;

// Per-uid token bucket — 5 calls / uid / minute / instance (trap #10).
const AI_RATE_LIMIT = 5;
const AI_RATE_WINDOW_MS = 60_000;
const uidBuckets = new Map<string, { count: number; windowStart: number }>();

function checkUidRateLimit(uid: string, now: number): boolean {
  const bucket = uidBuckets.get(uid);
  if (!bucket || now - bucket.windowStart >= AI_RATE_WINDOW_MS) {
    uidBuckets.set(uid, { count: 1, windowStart: now });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= AI_RATE_LIMIT;
}

export const aiFillContestants = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
  },
  async (req): Promise<{ contestants: unknown[] }> => {
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
        model: AI_MODEL,
        max_tokens: AI_MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      });
      const block = resp.content[0];
      return block && block.type === "text" ? block.text : "";
    };

    try {
      const contestants = await aiFillCore(
        { uid, title: req.data?.title, category: req.data?.category },
        { createMessage },
      );
      return { contestants };
    } catch (e) {
      if (e instanceof AiFillError) {
        const code =
          e.reason === "unauthenticated"
            ? "unauthenticated"
            : e.reason === "invalid-argument"
              ? "invalid-argument"
              : "internal";
        throw new HttpsError(code, e.message);
      }
      if (e instanceof ContestantParseError) {
        throw new HttpsError(
          "internal",
          `AI 추천 결과 처리 실패 (${e.reason}). 다시 시도해주세요.`,
        );
      }
      throw new HttpsError("internal", "알 수 없는 오류. 다시 시도해주세요.");
    }
  },
);
