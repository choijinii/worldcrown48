/**
 * e2eMark — 시험이 심는 대회 문서에 붙이는 "시험" 표시 (OPS-FIX-1 · 원장 D-66).
 *
 * 미리보기와 실서비스가 같은 Firebase 프로젝트를 쓴다. 이 표시가 있는 대회는 실서비스 목록
 * (isPublicTournament)에서 빠지고, 미리보기에서는 그대로 보여 시험이 돈다.
 * `e2eSeededAt` 은 전역 마무리(global-teardown)가 "2시간 넘은 시험 대회만" 고르는 기준이다 —
 * 시험이 `createdAt` 을 일부러 옛날로 심는 경우가 있어 그 칸으로는 나이를 알 수 없다.
 *
 * tournaments 에 쓰는 e2e 파일은 이 도우미를 써야 한다(lib/__tests__/ci/e2eTournamentMark.test.ts).
 */
export function e2eMark(): { e2e: true; e2eSeededAt: Date } {
  return { e2e: true, e2eSeededAt: new Date() };
}
