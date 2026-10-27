/**
 * arenaHomeData — `/arena` 아레나 홈이 서버에서 읽는 공개 데이터 (ARENA-2 PR 1).
 *
 * `/records`(lib/records/recordsData)와 같은 방식: Firebase **클라이언트 SDK**(비로그인)로 읽어
 * firestore.rules 가 공개로 허락한 것만 읽힌다 — 대회 `status == 'active'` · `ranking_cache`
 * (D-30 상시 공개) · `categories`(공개). 규칙·색인 변경 없음(조건 하나짜리 쿼리 + 문서 읽기).
 *
 * 읽기 = 공개 대회 1쿼리 + 카테고리 1쿼리 + **마감 대회의** 차트 캐시 문서 수만큼(챔피언 칸).
 * 챔피언 출처 = 차트 캐시 1위(대표 2026-10-27 A안). T5 증분 집계가 "확정 때 대회 문서에 챔피언을
 * 적기"로 정해지면 `readChampion` 한 곳만 바꾼다.
 *
 * 엔트리 48명은 전광판 대회가 바뀔 때마다 화면이 따로 읽는다(components/arenaHome/useEntries).
 * 실패·시간 초과면 `failed` — 화면은 목록 없이 머리·배너만(없는 사실을 말하지 않는다).
 */
import { collection, doc, getDoc, getDocs, query, where, type Firestore } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { currentDeployEnv } from "@/lib/deployEnv";
import { chartChampion, crownedOnly, splitChartTournaments, type ChampionCache } from "@/lib/records/chartList";
import { validateCategoryDoc, type CategoryDoc } from "@/lib/taxonomy/category";
import type { NamedLike } from "@/lib/contestantName";
import { tabCategories, toArenaTournament, type ArenaTournament, type ClosedRow } from "./arenaHome";

const READ_TIMEOUT_MS = 5000;

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
  failed: boolean;
}

/** 챔피언 출처 한 곳 (지금 = 차트 캐시 1위). */
async function readChampion(db: Firestore, tournamentId: string): Promise<NamedLike | null> {
  const s = await getDoc(doc(db, "ranking_cache", tournamentId));
  return chartChampion(s.exists() ? (s.data() as ChampionCache) : null);
}

export async function loadArenaHome(nowMs: number): Promise<ArenaHomeData> {
  return withTimeout<ArenaHomeData>(
    (async (): Promise<ArenaHomeData> => {
      const db = getDb();
      const [tSnap, cSnap] = await Promise.all([
        getDocs(query(collection(db, "tournaments"), where("status", "==", "active"))),
        getDocs(collection(db, "categories")).catch(() => null),
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
      const champions = await Promise.all(ended.map((t) => readChampion(db, t.id).catch(() => null)));
      return {
        active,
        // 챔피언이 없는(10판 미만) 대회는 게시판에서만 뺀다 — Record Room 과 같은 함수(원장 D-72).
        closed: crownedOnly(ended.map((t, i) => ({ t, champion: champions[i] }))),
        categories: tabCategories(cats),
        failed: false,
      };
    })(),
    { active: [], closed: [], categories: [], failed: true },
  );
}
