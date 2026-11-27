/**
 * scheduleWeeklyNews — 매주 금 12:00 KST 크론 → 주간 랭킹 동향 news DRAFT
 * (ND-1 §3 #7, AC 3). `0 12 * * 5` + Asia/Seoul, asia-northeast3.
 *
 * Reuses the existing ranking_cache (누적 기반, 현행 — TODO(ND-CROWN-SCORE) 랭킹
 * 개편 시 데이터 소스 스왑). DRAFT-ONLY (AC 1). An empty field (참가 직후) yields a
 * 0-active digest — still a draft, never a throw. Idempotency uses the KST week's
 * date in the doc — a re-fire on the same day is deduped by an existing weekly
 * draft dated today.
 *
 * NEWS-0a — 시험 대회(isTestTournament)와 문서가 없는 대회의 순위 기록은 세지 않는다(몸통 runWeeklyDraft).
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { adminDb } from "./admin";
import { runWeeklyDraft } from "./core/newsDraftRunners";
import { makeNewsCreateMessage, newNewsSlug, kstStamp, writeNewsDraft } from "./newsShared";
import { kstDate } from "./core/voteRecord";

export const scheduleWeeklyNews = onSchedule(
  {
    schedule: "0 12 * * 5",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    secrets: ["ANTHROPIC_API_KEY"],
    timeoutSeconds: 300,
  },
  async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logger.error("scheduleWeeklyNews: ANTHROPIC_API_KEY unset — skipping");
      return;
    }
    try {
      const r = await runWeeklyDraft({
        // Idempotency — skip if a weekly draft already exists for today (KST).
        weeklyDraftExistsToday: async (date) => {
          const dupe = await adminDb
            .collection("news")
            .where("origin", "==", "cron_weekly")
            .where("slug", ">=", date.replace(/-/g, ""))
            .where("slug", "<", date.replace(/-/g, "") + "z")
            .limit(1)
            .get();
          return !dupe.empty;
        },
        loadRankingCaches: async () => (await adminDb.collection("ranking_cache").get()).docs.map((d) => ({ id: d.id, data: d.data() })),
        loadTournaments: async (ids) => {
          const map = new Map<string, Record<string, unknown> | undefined>();
          if (ids.length === 0) return map;
          const snaps = await adminDb.getAll(...ids.map((id) => adminDb.collection("tournaments").doc(id)));
          for (const s of snaps) map.set(s.id, s.exists ? s.data() : undefined);
          return map;
        },
        createMessage: makeNewsCreateMessage(apiKey),
        writeNewsDraft,
        newSlug: newNewsSlug,
        kstDay: kstDate,
        stamp: kstStamp,
        nowMs: Date.now,
        logError: (m, e) => logger.error(m, e),
        logInfo: (m) => logger.info(m),
      });
      if (r.outcome === "exists") logger.info("scheduleWeeklyNews: weekly draft already exists today — skip");
    } catch (err) {
      logger.error("scheduleWeeklyNews: failed", err);
    }
  },
);
