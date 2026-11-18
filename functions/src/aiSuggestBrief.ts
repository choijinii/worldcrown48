/**
 * aiSuggestBrief — callable (LAB-FIX-4 · The Lab STEP 1 [AI에게 제안 받기]).
 *
 * 대회 제목 · 설명 · 카테고리 → 엔트리 단위 + "AI에게 알려 줄 내용" 세 줄 **제안**. 화면이 칸에 채울 뿐
 * 확정은 운영자가 한다. aiSuggestKeywords 와 같은 틀: requireAdmin(첫 줄) → 분당 5 → 하루 한도(aiDailyLimit)
 * → 비밀 → Haiku(짧은 출력 · 값싼 층).
 *
 *   request.data:  { title: string, category: string, description?: string }
 *   returns:       { entryUnit, entry, extra, rules }
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import Anthropic from "@anthropic-ai/sdk";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import { consumeAiDailyQuota } from "./aiQuota";
import { aiSuggestBriefCore, SuggestBriefError, type SuggestedBrief } from "./core/aiSuggestBriefCore";
import { HAIKU_MODEL } from "./core/models";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const BRIEF_MAX_TOKENS = 512;

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

export const aiSuggestBrief = onCall(
  {
    secrets: [ANTHROPIC_API_KEY, "ADMIN_UID"],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 30,
  },
  async (req): Promise<SuggestedBrief> => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);
    const uid = req.auth!.uid;

    if (!checkRateLimit(uid, Date.now())) {
      throw new HttpsError("resource-exhausted", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
    }
    await consumeAiDailyQuota("aiSuggestBrief");

    const apiKey = ANTHROPIC_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "ANTHROPIC_API_KEY secret is not set.");
    }
    const anthropic = new Anthropic({ apiKey });
    const createMessage = async (prompt: string): Promise<string> => {
      const resp = await anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: BRIEF_MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      });
      logger.info("aiSuggestBrief usage", {
        model: HAIKU_MODEL,
        inputTokens: resp.usage?.input_tokens,
        outputTokens: resp.usage?.output_tokens,
        stopReason: resp.stop_reason,
      });
      const block = resp.content[0];
      return block && block.type === "text" ? block.text : "";
    };

    try {
      return await aiSuggestBriefCore(
        { uid, title: req.data?.title, category: req.data?.category, description: req.data?.description },
        { createMessage, logError: (msg, e) => logger.error(msg, e) },
      );
    } catch (e) {
      if (e instanceof SuggestBriefError) {
        const code =
          e.reason === "unauthenticated" ? "unauthenticated" : e.reason === "invalid-argument" ? "invalid-argument" : "internal";
        throw new HttpsError(code, e.message);
      }
      throw new HttpsError("internal", "알 수 없는 오류. 다시 시도해주세요.");
    }
  },
);
