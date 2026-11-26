/**
 * pressShared — TIO 외신 초안(PRESS-1)의 SDK · Firestore 어댑터. 판단은 core/pressDraftCore · pressBudget 에 있다.
 * 크론(schedulePressDrafts)과 PR 2 의 [다시 쓰기] 콜러블이 같은 deps 를 쓴다.
 *
 *   press_usage/{YYYY-MM}           달마다 쓴 금액 · 검색 수 · 토큰(문서 id = 기간 · 정리 크론 없음)
 *   press_runs/{YYYY-MM-DD}_{분야}  그날 표지 — create() 가 두 번째 실행을 막는다
 * 사용량은 기록(logger)에도 남긴다 — LAB-FIX-6 checkEntryRules 의 "usage" 기록과 같은 모양.
 */
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "firebase-functions";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { PRESS_MODEL, PRESS_THINKING } from "./core/models";
import { resolvePressMonthlyLimit } from "./core/pressBudget";
import type { PressDeps } from "./core/pressDraftCore";
import { newNewsSlug, writeNewsDraft } from "./newsShared";

export const PRESS_USAGE_COLLECTION = "press_usage";
export const PRESS_RUNS_COLLECTION = "press_runs";

/** 3언어 기사 한 건이 잘리지 않을 만큼(검색 결과는 읽기 쪽이라 여기 안 든다). */
const PRESS_MAX_TOKENS = 8000;

/** Firestore ALREADY_EXISTS. */
const ALREADY_EXISTS = 6;

export function makePressDeps(apiKey: string): PressDeps {
  const anthropic = new Anthropic({ apiKey });
  return {
    now: () => Date.now(),
    limitUsd: resolvePressMonthlyLimit(process.env.PRESS_MONTHLY_LIMIT_USD),
    newSlug: (day) => newNewsSlug(day.replace(/-/g, "")),
    claimRun: async (runId) => {
      try {
        await adminDb.collection(PRESS_RUNS_COLLECTION).doc(runId).create({ at: FieldValue.serverTimestamp() });
        return true;
      } catch (e) {
        if ((e as { code?: unknown }).code === ALREADY_EXISTS) return false;
        throw e;
      }
    },
    monthSpentUsd: async (month) => {
      const snap = await adminDb.collection(PRESS_USAGE_COLLECTION).doc(month).get();
      const v = snap.get("usd");
      return typeof v === "number" ? v : 0;
    },
    addUsage: async (month, rec) => {
      await adminDb
        .collection(PRESS_USAGE_COLLECTION)
        .doc(month)
        .set(
          {
            usd: FieldValue.increment(rec.usd),
            searches: FieldValue.increment(rec.searches),
            inputTokens: FieldValue.increment(rec.inputTokens),
            outputTokens: FieldValue.increment(rec.outputTokens),
            requests: FieldValue.increment(1),
            overLongContextRequests: FieldValue.increment(rec.overLongContext ? 1 : 0),
            unknownUsageRequests: FieldValue.increment(rec.unknown ? 1 : 0),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      logger.info("press usage", { model: PRESS_MODEL, month, ...rec });
    },
    request: async ({ prompt, maxUses, priorContent }) => {
      const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
      if (priorContent) messages.push({ role: "assistant", content: priorContent as Anthropic.ContentBlockParam[] });
      const resp = await anthropic.messages.create({
        model: PRESS_MODEL,
        max_tokens: PRESS_MAX_TOKENS,
        // 생략하지 않는다 — core/models.ts PRESS_THINKING(AI-1 교훈).
        thinking: PRESS_THINKING,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxUses }],
        messages,
      });
      return { content: resp.content as unknown[], usage: resp.usage, stopReason: resp.stop_reason };
    },
    saveDraft: (doc) => writeNewsDraft(doc),
    logInfo: (m, data) => logger.info(m, data ?? {}),
    logError: (m, e) => logger.error(m, e),
  };
}
