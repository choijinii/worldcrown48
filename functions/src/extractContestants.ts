/**
 * extractContestantsFromVideos — callable (LAB-UX-1 마무리 ③).
 *
 * 붙여넣은 링크의 제목·채널명 → 인물(이름·소속·국가). 검수기가 이미 받아 둔
 * 문자열만 넘기므로 **YouTube API를 한 콜도 더 쓰지 않는다** — 비용은 Sonnet 1콜뿐(LAB-FIX-4 결정 E · 전엔 Haiku).
 *
 *   request.data:  { items: [{ videoId, title, channelTitle }], entryUnit?: "individual" | "group" | "other",
 *                    aiBrief?: { entry, extra, rules }, tournamentTitle?, tournamentDescription? }  (≤48 · 단위 빠지면 개인)
 *   returns:       { extractions: [{ videoId, name, affiliation, nationality, confident }] }
 *
 * 검증·프롬프트·파싱은 단위 테스트된 core에 있다. 여기는 배선만:
 * requireAdmin → 분당 속도 제한 → 일일 캡 → 시크릿 → 모델.
 * aiSuggestKeywords의 관례를 그대로 따른다(어드민 전용·같은 순서·같은 모델).
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import Anthropic from "@anthropic-ai/sdk";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import { consumeAiDailyQuota } from "./aiQuota";
import {
  extractContestantsCore,
  ExtractError,
  MAX_EXTRACT_ITEMS,
  type ExtractedContestant,
} from "./core/extractContestantsCore";
import { SONNET_MODEL, SONNET_THINKING } from "./core/models";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

/** 48건 × 한 줄 JSON — 넉넉히. */
const EXTRACT_MAX_TOKENS = 4096;

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const uidBuckets = new Map<string, { count: number; windowStart: number }>();

export function checkExtractRateLimit(uid: string, now: number): boolean {
  const bucket = uidBuckets.get(uid);
  if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
    uidBuckets.set(uid, { count: 1, windowStart: now });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT;
}

/** Test-only — clears the per-instance buckets between cases. */
export function __resetExtractRateBucketsForTest(): void {
  uidBuckets.clear();
}

export const extractContestantsFromVideos = onCall(
  {
    secrets: [ANTHROPIC_API_KEY, "ADMIN_UID"],
    cors: ALLOWED_ORIGINS,
    // Sonnet 이 48줄을 읽는 데 Haiku 보다 오래 걸린다 — 여유를 둔다(브라우저 쪽 기다림도 같이 늘렸다).
    timeoutSeconds: 120,
  },
  async (req): Promise<{ extractions: ExtractedContestant[] }> => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);
    const uid = req.auth!.uid;

    if (!checkExtractRateLimit(uid, Date.now())) {
      throw new HttpsError(
        "resource-exhausted",
        "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      );
    }

    // 교차 인스턴스 일일 상한 — 시크릿을 읽기 전에 건다(AI-1 패턴).
    await consumeAiDailyQuota("extractContestantsFromVideos");

    const apiKey = ANTHROPIC_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError(
        "failed-precondition",
        "ANTHROPIC_API_KEY secret is not set.",
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const createMessage = async (prompt: string): Promise<string> => {
      const resp = await anthropic.messages.create({
        // LAB-FIX-4 결정 E — 대회의 뜻에 맞춰 제목을 해석해야 한다(원곡 가수와 춤춘 팀 가르기).
        // Sonnet 5 는 thinking 을 생략하면 adaptive 가 켜진다 — 명시적으로 끈다(models.ts).
        model: SONNET_MODEL,
        max_tokens: EXTRACT_MAX_TOKENS,
        thinking: SONNET_THINKING,
        messages: [{ role: "user", content: prompt }],
      });
      // 비용 실측용 — 프롬프트 전문은 남기지 않는다. 토큰 수만.
      logger.info("extractContestantsFromVideos usage", {
        model: SONNET_MODEL,
        inputTokens: resp.usage?.input_tokens,
        outputTokens: resp.usage?.output_tokens,
        stopReason: resp.stop_reason,
      });
      const block = resp.content[0];
      return block && block.type === "text" ? block.text : "";
    };

    try {
      const extractions = await extractContestantsCore(
        {
          uid,
          items: req.data?.items,
          entryUnit: req.data?.entryUnit,
          aiBrief: req.data?.aiBrief,
          tournamentTitle: req.data?.tournamentTitle,
          tournamentDescription: req.data?.tournamentDescription,
        },
        {
          createMessage,
          logInfo: (msg) => logger.info(msg),
          logError: (msg, e) => logger.error(msg, e),
        },
      );
      return { extractions };
    } catch (e) {
      if (e instanceof ExtractError) {
        const code =
          e.reason === "unauthenticated"
            ? "unauthenticated"
            : e.reason === "invalid-argument"
              ? "invalid-argument"
              : "internal";
        throw new HttpsError(code, e.message);
      }
      logger.error("extractContestantsFromVideos failed", e);
      throw new HttpsError("internal", "추출에 실패했습니다.");
    }
  },
);

export { MAX_EXTRACT_ITEMS };
