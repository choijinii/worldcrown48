/**
 * recordsData — `/records` 가 서버에서 읽는 공개 데이터 (NAV-1 G).
 *
 * NOT "use client": sitemapData 와 같은 방식으로 Firebase **클라이언트 SDK**(비로그인)로 읽어
 * firestore.rules 가 공개로 허락한 것만 읽힌다 — 대회 `status == 'active'` · `ranking_cache`
 * (D-30 상시 공개) · `categories`(공개). 규칙 변경 없음.
 *
 * 읽기 = 공개 대회 1쿼리 + 카테고리 1쿼리 + **끝난 대회의** 차트 캐시 문서 수만큼(챔피언 칸).
 * 실패·시간 초과면 빈 목록 — 화면은 빈 상태로 200.
 */
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { toMs } from "@/lib/news/articleRecord";
import { categoryChip, championName, splitChartTournaments, type ChartTournament } from "./chartList";
import type { LocalizedText } from "@/lib/types/tournament";

const READ_TIMEOUT_MS = 5000;

function withTimeout<T>(p: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), READ_TIMEOUT_MS)),
  ]);
}

/** 화면 한 줄 — 언어 고르기는 화면이 한다. */
export interface ChartRowData {
  id: string;
  title: string;
  titleI18n: Partial<LocalizedText> | null;
  chip: string | null;
  champion: string | null;
}

export interface RecordsData {
  active: ChartRowData[];
  ended: ChartRowData[];
}

export async function loadRecords(nowMs: number): Promise<RecordsData> {
  return withTimeout(
    (async () => {
      const db = getDb();
      const [tSnap, cSnap] = await Promise.all([
        getDocs(query(collection(db, "tournaments"), where("status", "==", "active"))),
        getDocs(collection(db, "categories")).catch(() => null),
      ]);
      const categories = (cSnap?.docs ?? []).map((d) => {
        const name = (d.data().name ?? {}) as { en?: unknown };
        return { id: d.id, name: { en: typeof name.en === "string" ? name.en : "" } };
      });
      const tournaments: ChartTournament[] = tSnap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          status: data.status,
          hostUid: data.hostUid,
          deadlineMs: toMs(data.tournamentDeadline),
          title: typeof data.title === "string" ? data.title : "",
          titleI18n:
            typeof data.titleI18n === "object" && data.titleI18n !== null
              ? (data.titleI18n as Partial<LocalizedText>)
              : null,
          category: typeof data.category === "string" ? data.category : undefined,
        };
      });
      const { active, ended } = splitChartTournaments(tournaments, nowMs);

      const champions = await Promise.all(
        ended.map((t) =>
          getDoc(doc(db, "ranking_cache", t.id))
            .then((s) => championName(s.exists() ? (s.data() as Parameters<typeof championName>[0]) : null))
            .catch(() => null),
        ),
      );
      const row = (t: ChartTournament, champion: string | null): ChartRowData => ({
        id: t.id,
        title: t.title,
        titleI18n: t.titleI18n ?? null,
        chip: categoryChip(t.category, categories),
        champion,
      });
      return {
        active: active.map((t) => row(t, null)),
        ended: ended.map((t, i) => row(t, champions[i])),
      };
    })(),
    { active: [], ended: [] },
  );
}
