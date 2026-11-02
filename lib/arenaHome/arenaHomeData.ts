/**
 * arenaHomeData — `/arena` 아레나 홈이 서버에서 읽는 공개 데이터 (ARENA-2 PR 1).
 *
 * `/records`(lib/records/recordsData)와 같은 방식: Firebase **클라이언트 SDK**(비로그인)로 읽어
 * firestore.rules 가 공개로 허락한 것만 읽힌다 — 대회 `status == 'active'` · `ranking_cache`
 * (D-30 상시 공개) · `categories`(공개). 규칙·색인 변경 없음(조건 하나짜리 쿼리 + 문서 읽기).
 *
 * 읽기 = 공개 대회 1쿼리 + 카테고리 1쿼리 + 공개 기사 1쿼리(최신 ARTICLE_LIMIT 건 · 기존 색인
 * news status+publishedAt) + **마감 대회의** 차트 캐시 문서 수만큼(챔피언 칸).
 * 챔피언 출처 = 차트 캐시 1위(대표 2026-10-27 A안). T5 증분 집계가 "확정 때 대회 문서에 챔피언을
 * 적기"로 정해지면 `readChampion` 한 곳만 바꾼다.
 *
 * 엔트리 48명은 전광판 대회가 바뀔 때마다 화면이 따로 읽는다(components/arenaHome/useEntries).
 * 실패·시간 초과면 `failed` — 화면은 목록 없이 머리·배너만(없는 사실을 말하지 않는다).
 */
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where, type Firestore } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { currentDeployEnv } from "@/lib/deployEnv";
import { chartChampion, crownedOnly, splitChartTournaments, type ChampionCache } from "@/lib/records/chartList";
import { validateCategoryDoc, type CategoryDoc } from "@/lib/taxonomy/category";
import type { NamedLike } from "@/lib/contestantName";
import { tabCategories, toArenaTournament, type ArenaTournament, type ClosedRow } from "./arenaHome";
import type { ArenaArticle } from "./arenaPicks";
import { toMs } from "@/lib/news/articleRecord";
import type { LocalizedBlocks, LocalizedText } from "@/lib/news/articleDoc";

const READ_TIMEOUT_MS = 5000;
/** 뉴스 칸 3개가 고를 기사 더미 — 공개 기사 최신순 이만큼만 읽는다. */
const ARTICLE_LIMIT = 60;

function withTimeout<T>(p: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((resolve) => {
      timer = setTimeout(() => resolve(fallback), READ_TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timer));
}

export interface ArenaHomeData {
  /** 진행 중 — 마감 가까운 순. */
  active: ArenaTournament[];
  /** 마감 — 마감 최신순 · 챔피언이 있는 대회만(D-72). */
  closed: ClosedRow[];
  /** 탭 — 공개 카테고리 · order 순. */
  categories: CategoryDoc[];
  /** 공개 기사 — 발행 최신순(뉴스 칸 3개 · D-70). 읽기 실패면 빈 목록(칸은 "뉴스 없음"). */
  articles: ArenaArticle[];
  /** 공개 대회 id → 카테고리(진행 중 + 마감 · 카테고리 뉴스 맞추기). */
  categoryOf: Record<string, string>;
  failed: boolean;
}

/** 챔피언 출처 한 곳 (지금 = 차트 캐시 1위). */
async function readChampion(db: Firestore, tournamentId: string): Promise<NamedLike | null> {
  const s = await getDoc(doc(db, "ranking_cache", tournamentId));
  return chartChampion(s.exists() ? (s.data() as ChampionCache) : null);
}

function heroThumb(body: unknown): string | null {
  const b = (body ?? {}) as Partial<LocalizedBlocks>;
  for (const l of ["ko", "en", "es"] as const) {
    const hero = b[l]?.find((x) => x.type === "hero");
    if (hero && hero.type === "hero" && hero.imageUrl) return hero.imageUrl;
  }
  return null;
}

/** 공개 기사 → 뉴스 칸 값. 기사를 못 읽어도 화면 전체를 실패로 만들지 않는다. */
async function readArticles(db: Firestore): Promise<ArenaArticle[]> {
  const snap = await getDocs(
    query(collection(db, "news"), where("status", "==", "published"), orderBy("publishedAt", "desc"), limit(ARTICLE_LIMIT)),
  );
  return snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    const title = (x.title ?? {}) as Partial<LocalizedText>;
    return {
      slug: typeof x.slug === "string" && x.slug ? x.slug : d.id,
      title: { ko: title.ko ?? "", en: title.en ?? "", es: title.es ?? "" },
      publishedAtMs: toMs(x.publishedAt),
      tournamentId: typeof x.tournamentId === "string" && x.tournamentId ? x.tournamentId : null,
      thumb: heroThumb(x.body),
    };
  });
}

export async function loadArenaHome(nowMs: number): Promise<ArenaHomeData> {
  return withTimeout<ArenaHomeData>(
    (async (): Promise<ArenaHomeData> => {
      const db = getDb();
      const [tSnap, cSnap, articles] = await Promise.all([
        getDocs(query(collection(db, "tournaments"), where("status", "==", "active"))),
        getDocs(collection(db, "categories")).catch(() => null),
        readArticles(db).catch(() => [] as ArenaArticle[]),
      ]);
      const cats: CategoryDoc[] = [];
      for (const d of cSnap?.docs ?? []) {
        try {
          cats.push(validateCategoryDoc({ ...d.data(), id: d.id }));
        } catch {
          // 잘못된 카테고리 문서 하나가 탭 전체를 지우지 않게 건너뛴다(loadCategories 와 같은 규칙).
        }
      }
      const tournaments = tSnap.docs.map((d) => toArenaTournament(d.id, d.data() as Record<string, unknown>));
      const { active, ended } = splitChartTournaments(tournaments, nowMs, currentDeployEnv());
      const categoryOf: Record<string, string> = {};
      for (const t of [...active, ...ended]) if (t.category) categoryOf[t.id] = t.category;
      const champions = await Promise.all(ended.map((t) => readChampion(db, t.id).catch(() => null)));
      return {
        active,
        // 챔피언이 없는(10판 미만) 대회는 게시판에서만 뺀다 — Record Room 과 같은 함수(원장 D-72).
        closed: crownedOnly(ended.map((t, i) => ({ t, champion: champions[i] }))),
        categories: tabCategories(cats),
        articles,
        categoryOf,
        failed: false,
      };
    })(),
    { active: [], closed: [], categories: [], articles: [], categoryOf: {}, failed: true },
  );
}
