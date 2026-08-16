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
 * Cost defense (handoff §9 trap #10): 어드민 판정 + rate limit이 시크릿을 읽거나
 * 모델을 부르기 전에 끝나므로, 실패한 요청은 Claude 토큰을 1개도 쓰지 않는다.
 * 3층으로 쌓는다 (AI-1):
 *   requireAdmin → 5회/분(인스턴스 메모리, 연타 방지) → 50회/일(Firestore, 지출 상한)
 *
 * AI-1 (2026-08-16): 편집기 콘솔은 어드민 전용이다 — requireAdmin이 **첫 줄**에서
 * 돈다(LAB-EV-1 검수 콜러블 2종과 같은 유틸). B-2 이래 열려 있던 "교차 인스턴스
 * 일일 캡은 후속" 주석은 consumeAiDailyQuota로 닫혔다.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import Anthropic from "@anthropic-ai/sdk";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import { consumeAiDailyQuota } from "./aiQuota";
import { aiFillCore, AiFillError } from "./core/aiFillCore";
import { ContestantParseError } from "./core/parseContestants";
import { SONNET_MODEL, SONNET_THINKING } from "./core/models";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

/**
 * 4096 → 8192 (AI-1). 48명 JSON은 4096에 들어가지만 여유가 없었고, LAB-EV-2가
 * 여기에 URL·메타데이터를 얹는다. thinking을 명시적으로 껐으므로(SONNET_THINKING)
 * 이 상한은 전부 응답 몫이다.
 */
const AI_MAX_TOKENS = 8192;

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
    secrets: [ANTHROPIC_API_KEY, "ADMIN_UID"],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
  },
  async (req): Promise<{ contestants: unknown[] }> => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);
    const uid = req.auth!.uid;

    if (!checkUidRateLimit(uid, Date.now())) {
      throw new HttpsError(
        "resource-exhausted",
        "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      );
    }

    // 교차 인스턴스 일일 상한 — 시크릿을 읽기 전에 건다.
    await consumeAiDailyQuota("aiFillContestants");

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
        model: SONNET_MODEL,
        max_tokens: AI_MAX_TOKENS,
        // 생략하면 Sonnet 5는 adaptive thinking이 켜진다 — 명시적으로 끈다. 근거: core/models.ts
        thinking: SONNET_THINKING,
        messages: [{ role: "user", content: prompt }],
      });
      // 비용 실측용 — 프롬프트 전문은 남기지 않는다(RULE R2). 토큰 수만.
      logger.info("aiFillContestants usage", {
        model: SONNET_MODEL,
        inputTokens: resp.usage?.input_tokens,
        outputTokens: resp.usage?.output_tokens,
        stopReason: resp.stop_reason,
      });
      const block = resp.content[0];
      return block && block.type === "text" ? block.text : "";
    };

    try {
      const contestants = await aiFillCore(
        {
          uid,
          title: req.data?.title,
          category: req.data?.category,
          description: req.data?.description,
          keywords: req.data?.keywords,
          existing: req.data?.existing,
        },
        { createMessage, logError: (msg, e) => logger.error(msg, e) },
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
