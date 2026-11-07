/**
 * 대회 문서 읽기 실패를 화면에 어떻게 보일까 — ARENA-2 PR 3 (원장 D-86).
 *
 * 공개 대회(status active)는 규칙이 누구에게나 읽기를 허락한다. 그러니 규칙 거절(permission-denied)은
 * "공개가 아닌 대회" — 숨긴 대회(hidden)나 공개 전 대회다 — 이고, 팬에게는 기존 "찾을 수 없어요"가 맞다.
 * 연결 끊김 같은 그 밖의 실패는 지금처럼 "불러오지 못했어요 · 다시 시도".
 */
export function tournamentReadFailureIsNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "permission-denied"
  );
}
