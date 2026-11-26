/**
 * schedulePressDrafts — 매일 06:40 KST · TIO 가 K-POP · CREATOR 외신 종합 초안을 1건씩(PRESS-1 PR 1 · 지시서 3-2).
 * `40 6 * * *` + Asia/Seoul · asia-northeast3 (scheduleWeeklyNews 와 같은 모양). 초안만 — 발행은 대표가 뉴스데스크에서.
 * 대표 검수 07:00 · 발행 07:30(킥 v0.2 결정 1).
 *
 * 켜고 끄는 곳 = core/pressDraftCore `pressDraftsEnabled` 하나(PRESS_DRAFTS=off · 시험 서버는 가짜 AI 주소일 때만).
 * 한 달 한도 = 환경 값 PRESS_MONTHLY_LIMIT_USD(기본 15달러) — 닿으면 AI 를 부르지 않는다.
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { pressDraftsEnabled, runDailyPress } from "./core/pressDraftCore";
import { makePressDeps } from "./pressShared";

export const schedulePressDrafts = onSchedule(
  {
    schedule: "40 6 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    secrets: ["ANTHROPIC_API_KEY"],
    timeoutSeconds: 540,
    // 겹쳐 도는 것을 줄인다(그날 표지 문서가 최종 방어).
    maxInstances: 1,
  },
  async () => {
    if (!pressDraftsEnabled(process.env)) {
      logger.info("schedulePressDrafts: off (PRESS_DRAFTS / emulator without fake AI) — skip");
      return;
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logger.error("schedulePressDrafts: ANTHROPIC_API_KEY unset — skipping");
      return;
    }
    const out = await runDailyPress(makePressDeps(apiKey));
    logger.info("schedulePressDrafts: done", out);
  },
);
