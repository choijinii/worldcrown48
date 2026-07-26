/**
 * scheduleWeeklyNews — 매주 금 12:00 KST 크론 → 주간 랭킹 동향 news DRAFT
 * (ND-1 §3 #7, AC 3). `0 12 * * 5` + Asia/Seoul, asia-northeast3.
 *
 * Reuses the existing ranking_cache (누적 기반, 현행 — TODO(ND-CROWN-SCORE) 랭킹
 * 개편 시 데이터 소스 스왑). DRAFT-ONLY (AC 1). An empty field (참가 직후) yields a
 * 0-active digest — still a draft, never a throw. Idempotency uses the KST week's
 * date in the doc — a re-fire on the same day is deduped by an existing weekly
 * draft dated today.
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { adminDb } from "./admin";
import { buildWeeklyDigest, type RankingRowLike } from "./core/newsDigestCore";
import { buildWeeklyPrompt } from "./core/newsPrompts";
import { assembleLocalizedDraft } from "./core/newsDraftPipeline";
import { makeNewsCreateMessage, newNewsSlug, kstStamp, writeNewsDraft } from "./newsShared";
import { kstDate } from "./core/voteRecord";

function rankingsOf(data: FirebaseFirestore.DocumentData | undefined): RankingRowLike[] {
  const rows = (data?.rankings ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    rank: Number(r.rank ?? 0),
    contestantId: String(r.contestantId ?? ""),
    name: String(r.name ?? ""),
    rate: Number(r.rate ?? 0),
  }));
}

export const scheduleWeeklyNews = onSchedule(
  {
    schedule: "0 12 * * 5",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    secrets: ["ANTHROPIC_API_KEY"],
    timeoutSeconds: 300,
  },
  async () => {
    const date = kstDate();
    try {
      // Idempotency — skip if a weekly draft already exists for today (KST).
      const dupe = await adminDb
        .collection("news")
        .where("origin", "==", "cron_weekly")
        .where("slug", ">=", date.replace(/-/g, ""))
        .where("slug", "<", date.replace(/-/g, "") + "z")
        .limit(1)
        .get();
      if (!dupe.empty) {
        logger.info("scheduleWeeklyNews: weekly draft already exists today — skip");
        return;
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        logger.error("scheduleWeeklyNews: ANTHROPIC_API_KEY unset — skipping");
        return;
      }

      const cachesSnap = await adminDb.collection("ranking_cache").get();
      const caches = cachesSnap.docs.map((d) => ({
        tournamentId: d.id,
        title: String(d.data().tournamentId ?? d.id),
        rankings: rankingsOf(d.data()),
      }));
      const asOf = kstStamp(Date.now());
      const digest = buildWeeklyDigest({ caches, asOf });
      const prompt = buildWeeklyPrompt({ digest });

      const draft = await assembleLocalizedDraft(
        {
          slug: newNewsSlug(date),
          template: "weekly",
          origin: "cron_weekly",
          sourceLang: "ko",
          prompt,
          evidence: { asOf: digest.asOf, stats: digest.stats },
        },
        { createMessage: makeNewsCreateMessage(apiKey), logError: (m, e) => logger.error(m, e) },
      );
      await writeNewsDraft(draft);
      logger.info(`scheduleWeeklyNews: weekly draft ${draft.slug}`);
    } catch (err) {
      logger.error("scheduleWeeklyNews: failed", err);
    }
  },
);
