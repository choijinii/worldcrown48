/**
 * /arena — 아레나 홈 (ARENA-2 PR 1 · 원장 D-37 · D-63 · D-67~D-71 · 킥 v1.0).
 *
 * 전광판(= 대기실) · 카테고리 줄 + 검색 · 진행 중 대회 · 가로 띠 · 마감 대회 게시판, 각 구역 오른쪽에
 * 관련 뉴스 칸과 광고 자리. 화이트(D-40) · 메뉴바는 사이트 공통(NAV-1).
 * `/arena/[tournamentId]` 이하(매치 무대 · 크라운 카드 · 차트)는 이 파일과 무관하다.
 *
 * 요청 때마다 읽는다(force-dynamic) — `/records` 와 같은 이유: 빌드가 데이터베이스에 묶이지 않게,
 * 마감이 지난 대회가 곧바로 게시판으로 옮겨 가게(시각은 서버의 지금). 검색 색인 허용 · 사이트맵에 있음.
 */
import type { Metadata } from "next";
import { loadArenaHome } from "@/lib/arenaHome/arenaHomeData";
import { ArenaHome } from "@/components/arenaHome/ArenaHome";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Arena · WorldCrown48",
  description: "Pick an active Tournament to enter, or look back at the rankings of closed ones",
};

export default async function ArenaHomePage(): Promise<JSX.Element> {
  const data = await loadArenaHome(Date.now());
  return <ArenaHome data={data} />;
}
