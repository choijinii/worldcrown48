/**
 * 시험 서버(에뮬레이터)에서만 뉴스 초안 AI 끄기 (대표 승인 2026-11-26).
 *
 * 에뮬레이터에는 AI 가 없다 — 대회가 열릴 때(onTournamentOpened) · Champion 이 정해질 때(onChampionForNews)
 * 트리거가 닫힌 주소를 부르다 약 1.2초씩 헛돌고, 대회를 많이 만드는 시험 뒤에는 그 줄이 밀려 라운드를 넘기는
 * 함수(advanceRound)가 차례를 못 받는다. scripts/e2e-emulator.sh 가 NEWS_DRAFT_AI=off 를 넣는다.
 *
 * FUNCTIONS_EMULATOR 는 함수 에뮬레이터가 스스로 "true" 로 채운다. 실서비스에서는 없으므로 NEWS_DRAFT_AI 를
 * 잘못 넣어도 뉴스 초안은 그대로 만든다.
 */
export function newsDraftAiOff(env: Record<string, string | undefined>): boolean {
  return env.FUNCTIONS_EMULATOR === "true" && env.NEWS_DRAFT_AI === "off";
}
