/**
 * Tournament Deadline 판정 (AC 9·16) — 클라이언트와 서버가 **같은 코드**를 돌린다.
 *
 * 서버는 admin SDK Timestamp, 클라이언트는 web SDK Timestamp라 타입이 다르다. 그래서 판정을
 * **ms 숫자 하나**로 좁힌다 — 두 SDK의 Timestamp가 공통으로 갖는 `toMillis()` 만 쓰면
 * 나머지는 같은 함수가 처리한다(§9 함정 5: 두 게이트가 어긋나면 P0).
 *
 * §9 함정 12: 마감 검사는 투표 경로에 **존재하지 않았다.** AC 9는 "기존 원칙 유지"가 아니라
 * 신규 구현이다. 2026-09-06 P0는 이 강제를 설명하는 화면이 없어서 났다(§14) — 판정은 단순하게,
 * 설명은 화면에서.
 *
 * ⚠️ 이 파일은 `functions/src/_run/` 로 복사되므로 import를 가지지 않는다.
 */

/**
 * Firestore Timestamp | Date | number → ms. 그 밖의 값은 **마감 없음**(null)으로 읽는다.
 *
 * 모르는 값을 마감으로 오독하면 팬이 못 들어간다. 반대로 마감을 놓치면 끝난 대회를 한 판 더
 * 도는 것뿐이다 — 두 오류의 값이 다르므로 모호한 입력은 언제나 "마감 아님"으로 떨어뜨린다.
 */
export function toDeadlineMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (
    typeof value === "object" &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    const ms = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

/**
 * 마감이 지났는가. **마감이 없으면 절대 막지 않는다.**
 *
 * 경계(`deadlineMs === nowMs`)는 아직 마감이 아니다 — 마감 시각 정각에 고르는 팬을 끊지 않는다.
 */
export function isDeadlinePassed(
  deadlineMs: number | null,
  nowMs: number,
): boolean {
  return deadlineMs !== null && deadlineMs < nowMs;
}
