/**
 * /records — Record Room ▸ Charts 대회 목록 (NAV-1 G · §0-B 7 · 정본 31 · 32).
 *
 * MVP 1.5에 같은 주소에서 "모든 대회의 차트를 한곳에서" 화면으로 바뀐다 — 주소를 지금 고정해
 * 메뉴를 다시 고치지 않는다. 검색 색인 허용 · 사이트맵에 있음(lib/seo/sitemapEntries).
 *
 * 요청 때마다 읽는다(force-dynamic) — 빌드가 데이터베이스에 묶이지 않게 하고, 마감이 지난
 * 대회가 곧바로 "끝난 대회"로 옮겨 가게 한다(시각은 서버의 지금).
 */
import type { Metadata } from "next";
import { loadRecords } from "@/lib/records/recordsData";
import { ChartsList } from "@/components/records/ChartsList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Charts · WorldCrown48",
  // 승인 문구(§9 게이트 8) 재사용 — 새 문구를 짓지 않는다.
  description: "See the Crown Score chart for each Tournament",
};

export default async function RecordsPage(): Promise<JSX.Element> {
  const data = await loadRecords(Date.now());
  return <ChartsList data={data} />;
}
