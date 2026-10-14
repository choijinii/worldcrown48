// TEMP(NAV-1): ARENA-2가 이 파일을 아레나 홈으로 교체한다. 주소 /arena 는 유지.
/**
 * /arena — 아레나 홈 자리의 임시 페이지 (NAV-1 E2 · 프롬프트 §3-B · §0-B 5).
 *
 * 메뉴의 The Arena · 서랍의 Arena Home 이 이미 이 주소를 가리킨다. ARENA-2 가 같은 주소에서
 * 아레나 홈(대기실 · D-37 마감 대회 게시판)으로 바꾸면서 ① 이 파일 교체 ② noindex 해제 +
 * 사이트맵에 /arena 추가 ③ 배너 자리(D-21) 결정 ④ 서랍 K-POP·CREATOR 를 실제 주소로.
 *
 * 화이트(D-40 아레나 홈) · 메뉴바는 다크 · 데이터 읽기 없음 · 배너 없음.
 * `/arena/[tournamentId]` 이하는 이 파일과 무관하다(한 글자도 안 바뀜).
 */
import type { Metadata } from "next";
import { ArenaTempPage } from "@/components/arena/ArenaTempPage";

export const metadata: Metadata = {
  title: "The Arena · WorldCrown48",
  robots: { index: false, follow: true },
};

export default function ArenaIndexPage(): JSX.Element {
  return <ArenaTempPage />;
}
