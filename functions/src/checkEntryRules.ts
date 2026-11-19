/**
 * checkEntryRules — callable (LAB-FIX-5 §3-2 · The Lab 채운 뒤 "고르는 조건" 다시 검사).
 *
 * 편집기가 명단 채우기 직후 **고르는 조건이 있을 때만** 부른다. 명단을 조건과 대조해 손볼 칸 · 사유(화면 언어)를
 * 돌려준다 — 칸을 지우지 않는다. 틀은 aiSuggestBrief 와 같다: requireAdmin(첫 줄) → 분당 5 → 하루 한도(aiDailyLimit)
 * → 비밀 → 모델. 모델 = Sonnet(명단 채우기와 같은 층): 놓친 칸은 그대로 발행되므로 값싼 층으로 내리지 않는다.
 *
 *   request.data:  { title, category?, entryUnit, aiBrief, entries: [{slot, name, affiliation?}], lang: "ko"|"en"|"es" }
 *   returns:       { flags: [{ slot, reason }] }
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import Anthropic from "@anthropic-ai/sdk";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import { consumeAiDailyQuota } from "./aiQuota";
import { checkEntryRulesCore, CheckRulesError, type RulesFlag } from "./core/checkEntryRulesCore";
import { SONNET_MODEL, SONNET_THINKING } from "./core/models";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

/** 48칸 모두 걸려도 한 줄 사유 × 48 이 들어갈 만큼. */
const RULES_MAX_TOKENS = 4096;

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const uidBuckets = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(uid: string, now: number): boolean {
  const bucket = uidBuckets.get(uid);
  if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
    uidBuckets.set(uid, { count: 1, windowStart: now });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT;
}

export const checkEntryRules = onCall(
  {
    secrets: [ANTHROPIC_API_KEY, "ADMIN_UID"],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 120,
  },
  async (req): Promise<{ flags: RulesFlag[] }> => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);
    const uid = req.auth!.uid;

    if (!checkRateLimit(uid, Date.now())) {
      throw new HttpsError("resource-exhausted", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
    }
    await consumeAiDailyQuota("checkEntryRules");

    const apiKey = ANTHROPIC_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "ANTHROPIC_API_KEY secret is not set.");
    }
    const anthropic = new Anthropic({ apiKey });
    const createMessage = async (prompt: string): Promise<string> => {
      const resp = await anthropic.messages.create({
        model: SONNET_MODEL,
        max_tokens: RULES_MAX_TOKENS,
        // 생략하면 Sonnet 5는 adaptive thinking이 켜진다 — 명시적으로 끈다(core/models.ts · aiFillContestants 와 같음).
        thinking: SONNET_THINKING,
        messages: [{ role: "user", content: prompt }],
      });
      logger.info("checkEntryRules usage", {
        model: SONNET_MODEL,
        inputTokens: resp.usage?.input_tokens,
        outputTokens: resp.usage?.output_tokens,
        stopReason: resp.stop_reason,
      });
      const block = resp.content[0];
      return block && block.type === "text" ? block.text : "";
    };

    try {
      return await checkEntryRulesCore(
        {
          uid,
          title: req.data?.title,
          category: req.data?.category,
          entryUnit: req.data?.entryUnit,
          aiBrief: req.data?.aiBrief,
          entries: req.data?.entries,
          lang: req.data?.lang,
        },
        { createMessage, logInfo: (m) => logger.info(m), logError: (msg, e) => logger.error(msg, e) },
      );
    } catch (e) {
      if (e instanceof CheckRulesError) {
        const code =
          e.reason === "unauthenticated" ? "unauthenticated" : e.reason === "invalid-argument" ? "invalid-argument" : "internal";
        throw new HttpsError(code, e.message);
      }
      throw new HttpsError("internal", "알 수 없는 오류. 다시 시도해주세요.");
    }
  },
);
