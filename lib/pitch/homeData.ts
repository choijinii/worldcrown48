/**
 * homeData — The Pitch(홈)가 한 번 읽는 공개 자료 (PITCH-2 PR A · 계획 docs/plans/PITCH-2_PR-A.md).
 *
 * 대회 목록은 실시간 구독(lib/pitch/pitchStore — 내린 엔트리가 1분 안에 표지에서 빠지게 · D-93)이고,
 * 나머지는 여기서 **한 번** 읽는다(실시간 아님 — 기사·조회 칸이 바뀔 때마다 홈 전체가 다시 받지 않게):
 *
 *   · 카테고리(탭) · `config/pitch.promoVideoUrl` · `promoPosterUrl`(히어로 홍보 장 — 우리가 만든 영상 파일과
 *     정지 그림 · 우리 버킷 `pitch/promo/` 아래 주소만 받는다 · 추가 지시 ②)
 *   · 대회마다 `ranking_cache/{id}` — 완주 판 수(히어로 정렬) · 발표 시각 · 1·2·3…위 이름과 그림
 *   · 공개 기사(최신 ARTICLE_LIMIT 건) · 기사마다 `news_views/{slug}`(조회 칸 · PR B)
 *
 * 하나가 실패해도 화면 전체를 실패로 만들지 않는다(빈 값). 순수 규칙은 lib/pitch/home.ts.
 */
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where, type Firestore } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { toMs } from "@/lib/news/articleRecord";
import { avatarUrl } from "@/lib/ranking/rateFormatter";
import { tabCategories } from "@/lib/arenaHome/arenaHome";
import { validateCategoryDoc, type CategoryDoc } from "@/lib/taxonomy/category";
import type { ArticleViews } from "@/lib/news/articleViews";
import type { LocalizedBlocks, LocalizedText } from "@/lib/news/articleDoc";
import type { NamedLike } from "@/lib/contestantName";
import { promoAssetUrl, type HeroPromo, type HomeArticle, type HomeChartCache } from "./home";

const ARTICLE_LIMIT = 60;
/** 차트 한 줄에 싣는 등수(CHARTS 큰 차트 1~5위). */
const CHART_TOP = 5;

export type HomeCache = HomeChartCache;

export interface PitchHomeData {
  categories: CategoryDoc[];
  promo: HeroPromo;
  articles: HomeArticle[];
  viewsBySlug: Record<string, ArticleViews>;
}

function heroThumb(body: unknown): string | null {
  const b = (body ?? {}) as Partial<LocalizedBlocks>;
  for (const l of ["ko", "en", "es"] as const) {
    const hero = b[l]?.find((x) => x.type === "hero");
    if (hero && hero.type === "hero" && hero.imageUrl) return hero.imageUrl;
  }
  return null;
}

const text = (v: unknown): LocalizedText => {
  const x = (v ?? {}) as Partial<LocalizedText>;
  return { ko: x.ko ?? "", en: x.en ?? "", es: x.es ?? "" };
};

async function readCategories(db: Firestore): Promise<CategoryDoc[]> {
  const snap = await getDocs(collection(db, "categories"));
  const out: CategoryDoc[] = [];
  for (const d of snap.docs) {
    try {
      out.push(validateCategoryDoc({ ...d.data(), id: d.id }));
    } catch {
      // 잘못된 카테고리 문서 하나가 탭 전체를 지우지 않게 건너뛴다(loadCategories 와 같은 규칙).
    }
  }
  return tabCategories(out);
}

async function readArticles(db: Firestore): Promise<HomeArticle[]> {
  const snap = await getDocs(
    query(collection(db, "news"), where("status", "==", "published"), orderBy("publishedAt", "desc"), limit(ARTICLE_LIMIT)),
  );
  return snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      slug: typeof x.slug === "string" && x.slug ? x.slug : d.id,
      title: text(x.title),
      subhead: text(x.subhead),
      publishedAtMs: toMs(x.publishedAt),
      tournamentId: typeof x.tournamentId === "string" && x.tournamentId ? x.tournamentId : null,
      thumb: heroThumb(x.body),
    };
  });
}

async function readViews(db: Firestore, slugs: readonly string[]): Promise<Record<string, ArticleViews>> {
  const out: Record<string, ArticleViews> = {};
  await Promise.all(
    slugs.map((slug) =>
      getDoc(doc(db, "news_views", slug))
        .then((s) => {
          if (s.exists()) out[slug] = s.data() as ArticleViews;
        })
        .catch(() => undefined),
    ),
  );
  return out;
}

export async function loadPitchHome(): Promise<PitchHomeData> {
  const db = getDb();
  const [categories, promo, articles] = await Promise.all([
    readCategories(db).catch(() => [] as CategoryDoc[]),
    getDoc(doc(db, "config", "pitch"))
      .then((s) => (s.exists() ? (s.data() as Record<string, unknown>) : {}))
      .catch(() => ({}) as Record<string, unknown>),
    readArticles(db).catch(() => [] as HomeArticle[]),
  ]);
  const viewsBySlug = await readViews(db, articles.map((a) => a.slug));
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
  return {
    categories,
    promo: {
      videoUrl: promoAssetUrl(promo.promoVideoUrl, bucket, "video"),
      posterUrl: promoAssetUrl(promo.promoPosterUrl, bucket, "image"),
    },
    articles,
    viewsBySlug,
  };
}

/** 대회마다 차트 캐시 한 문서. 없거나 못 읽으면 그 대회는 판 수 0 · 차트 없음. */
export async function loadHomeCaches(ids: readonly string[]): Promise<Record<string, HomeCache>> {
  const db = getDb();
  const out: Record<string, HomeCache> = {};
  await Promise.all(
    ids.map((id) =>
      getDoc(doc(db, "ranking_cache", id))
        .then((s) => {
          if (!s.exists()) return;
          const x = s.data() as {
            runsTotal?: number;
            generatedAt?: unknown;
            rankings?: { name?: string; nameI18n?: Partial<LocalizedText> | null; videoId?: string | null; imageUrl?: string | null }[];
          };
          out[id] = {
            runsTotal: typeof x.runsTotal === "number" ? x.runsTotal : 0,
            generatedAtMs: toMs(x.generatedAt),
            top: (x.rankings ?? [])
              .slice(0, CHART_TOP)
              .filter((r) => typeof r.name === "string" && r.name.trim())
              .map((r) => ({
                name: (r.name as string).trim(),
                ...(r.nameI18n ? { nameI18n: r.nameI18n } : {}),
                avatar: avatarUrl({ videoId: r.videoId ?? null, imageUrl: r.imageUrl ?? null }),
              })),
          };
        })
        .catch(() => undefined),
    ),
  );
  return out;
}
