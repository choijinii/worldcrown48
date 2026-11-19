/**
 * WORLD PRESS 열(홈 NEWS ROOM 셋째 열)의 자료 — 이 함수 하나로만 읽는다 (PITCH-2 추가 지시 ① · D-79 후보 바뀜).
 *
 * 셋째 열 = 뉴스 AI TIO 가 여러 매체 보도를 재료로 직접 쓴 **우리 기사**(매체 이름 자리 = "TIOZ").
 * 외신 개편(LAB-FIX-4 다음) 전까지는 **언제나 빈 목록** → 열은 "기사 없음" 모양.
 * 외신 개편 때 이 함수 안만 고쳐 `news` 컬렉션의 외신 종합 기사를 읽게 한다. 다른 곳에서 이 열의 자료를 직접 읽지 않는다.
 * 뉴스 모음 업체(TheNewsAPI 등) 연결은 만들지 않는다(대표 11/18).
 */
import type { HomeArticle } from "./home";

/** 카드의 매체 이름 자리 글자 — 대표가 정한 매체 이름(11/18 21:10) · 3언어 공통. 새 화면 문구가 아니다. */
export const WORLD_PRESS_MEDIA_NAME = "TIOZ";

export async function loadWorldPress(_cat: string | null): Promise<HomeArticle[]> {
  return [];
}
