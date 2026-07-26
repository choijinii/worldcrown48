/**
 * generateNewsDraft — admin-only callable that produces an AI news DRAFT
 * (ND-1 §3 #4). Thin adapter over the tested cores: rate limit (newsRateLimit) +
 * evidence (newsDigestCore) + prompt (newsPrompts) + pipeline (assembleLocalizedDraft).
 *
 *   request.data: { template: 'open'|'result'|'weekly'|'column',
 *                   sourceLang?: 'ko'|'en'|'es', topic?: string, tournamentId?: string }
 *   returns:      { slug }
 *
 * NEVER publishes — the pipeline hard-codes status:'draft' (AC 1). Security: a
 * Voter hitting the URL from devtools is rejected by requireAdmin BEFORE any read
 * (handoff §9 trap #5). Rate limit 20/KST일 (AC 7) via an atomic counter doc.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import { kstDate } from "./core/voteRecord";
import {
  NEWS_ERROR_CODES,
  decideNewsGeneration,
  newsRateDocId,
} from "./core/newsRateLimit";
import {
  buildOpenDigest,
  buildResultDigest,
  buildWeeklyDigest,
  type NewsDigest,
  type RankingRowLike,
} from "./core/newsDigestCore";
import {
  buildOpenPrompt,
  buildResultPrompt,
  buildWeeklyPrompt,
  buildColumnPrompt,
} from "./core/newsPrompts";
import { assembleLocalizedDraft } from "./core/newsDraftPipeline";
import { makeNewsCreateMessage, newNewsSlug, kstStamp } from "./newsShared";
import type { ArticleTemplate, Lang, Evidence } from "./_news/articleDoc";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const TEMPLATES: ArticleTemplate[] = ["open", "result", "weekly", "column"];
const LANGS: Lang[] = ["ko", "en", "es"];

function rankingsOf(data: FirebaseFirestore.DocumentData | undefined): RankingRowLike[] {
  const rows = (data?.rankings ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    rank: Number(r.rank ?? 0),
    contestantId: String(r.contestantId ?? ""),
    name: String(r.name ?? ""),
    rate: Number(r.rate ?? 0),
  }));
}

export const generateNewsDraft = onCall(
  { secrets: [ANTHROPIC_API_KEY, "ADMIN_UID"], cors: ALLOWED_ORIGINS, timeoutSeconds: 120 },
  async (req): Promise<{ slug: string }> => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);
    const uid = req.auth!.uid;

    const data = (req.data ?? {}) as {
      template?: string;
      sourceLang?: string;
      topic?: string;
      tournamentId?: string;
    };
    const template = data.template as ArticleTemplate;
    if (!TEMPLATES.includes(template)) {
      throw new HttpsError("invalid-argument", "template은 open/result/weekly/column 중 하나여야 합니다.");
    }
    const sourceLang: Lang = LANGS.includes(data.sourceLang as Lang)
      ? (data.sourceLang as Lang)
      : "ko";

    // ── Rate limit 20/KST일 — atomic increment (AC 7). Only 대표 조작인 이 경로만
    //    카운트한다 (트리거·크론 면제). ──
    const date = kstDate();
    const rateRef = adminDb.collection("news_generation").doc(newsRateDocId(uid, date));
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(rateRef);
      const count = snap.exists ? Number(snap.data()?.count ?? 0) : 0;
      if (decideNewsGeneration(count).status === "limit_reached") {
        throw new HttpsError(
          "resource-exhausted",
          "daily news draft limit reached",
          { code: NEWS_ERROR_CODES.DAILY_LIMIT },
        );
      }
      tx.set(
        rateRef,
        { count: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    });

    const apiKey = ANTHROPIC_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError(
        "failed-precondition",
        "ANTHROPIC_API_KEY secret is not set.",
      );
    }
    const createMessage = makeNewsCreateMessage(apiKey);
    const asOf = kstStamp(Date.now());

    // ── evidence + prompt per template ──
    let digest: NewsDigest;
    let prompt: string;
    const tournamentId = data.tournamentId || undefined;

    if (template === "open" || template === "result") {
      if (!tournamentId) {
        throw new HttpsError("invalid-argument", "이 템플릿은 tournamentId가 필요합니다.");
      }
      const tSnap = await adminDb.collection("tournaments").doc(tournamentId).get();
      if (!tSnap.exists) {
        throw new HttpsError("not-found", "Tournament를 찾을 수 없습니다.");
      }
      const t = tSnap.data()!;
      const meta = {
        id: tournamentId,
        title: String(t.title ?? ""),
        category: String(t.category ?? ""),
        totalContestants: Number(t.totalContestants ?? 48),
        deadlineMs:
          typeof t.tournamentDeadline === "number"
            ? t.tournamentDeadline
            : (t.tournamentDeadline?.toMillis?.() ?? null),
      };
      if (template === "open") {
        digest = buildOpenDigest(meta, asOf);
        prompt = buildOpenPrompt({ title: meta.title, category: meta.category, digest });
      } else {
        const cacheSnap = await adminDb.collection("ranking_cache").doc(tournamentId).get();
        const rankings = rankingsOf(cacheSnap.data());
        const championId = rankings[0]?.contestantId;
        digest = buildResultDigest({ meta, rankings, championId, asOf });
        prompt = buildResultPrompt({
          title: meta.title,
          championName: digest.leaders[0]?.name ?? "",
          digest,
        });
      }
    } else if (template === "weekly") {
      const cachesSnap = await adminDb.collection("ranking_cache").get();
      const caches = cachesSnap.docs.map((d) => ({
        tournamentId: d.id,
        title: String(d.data().tournamentId ?? d.id),
        rankings: rankingsOf(d.data()),
      }));
      digest = buildWeeklyDigest({ caches, asOf });
      prompt = buildWeeklyPrompt({ digest });
    } else {
      // column
      const topic = String(data.topic ?? "").trim();
      if (!topic) {
        throw new HttpsError("invalid-argument", "칼럼은 주제(topic)가 필요합니다.");
      }
      digest = { asOf, stats: [], leaders: [], tournamentId };
      prompt = buildColumnPrompt({ topic, digest });
    }

    const evidence: Evidence = {
      asOf: digest.asOf,
      stats: digest.stats,
      ...(tournamentId ? { tournamentId } : {}),
    };

    const slug = newNewsSlug(date);
    let draft;
    try {
      draft = await assembleLocalizedDraft(
        {
          slug,
          template,
          origin: "manual_ai",
          sourceLang,
          prompt,
          evidence,
          tournamentId,
        },
        { createMessage, logError: (m, e) => logger.error(m, e) },
      );
    } catch (e) {
      logger.error("generateNewsDraft: assembly failed", e);
      throw new HttpsError("internal", "초안 생성에 실패했습니다.");
    }

    await adminDb
      .collection("news")
      .doc(slug)
      .set({ ...draft, createdAt: FieldValue.serverTimestamp() });

    return { slug };
  },
);
