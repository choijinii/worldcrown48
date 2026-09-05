/**
 * KST 자정 리셋 — 리포에서 이 판정을 하는 유일한 곳 (핸드오프 §3.0 조건 3).
 *
 * `tournament_runs` 와 `guest_runs` 는 자정에 문서를 지우거나 새로 만들지 않는다.
 * 대신 저장된 `lastRunDate` 가 오늘(KST)이 아니면 그날 값은 **없는 것으로 읽는다.**
 * 리셋 로직이 하나여야 테스트도 하나다.
 *
 * 날짜 문자열은 반드시 KST 기준이어야 한다(§3.0 조건 1). 그 값을 세는 함수도 여기 있다 —
 * `todayKST`. 서버(`kstDate`)와 클라이언트(`getTodayKST`)는 이제 이 함수를 부르는 얇은
 * 위임일 뿐이다 (2026-09-05 대표 지시).
 *
 * ⚠️ 이 파일은 `functions/src/_run/` 로 복사되므로 import를 가지지 않는다.
 */

/**
 * 오늘(KST)의 YYYY-MM-DD — **모든 판 판정의 입력이 되는 유일한 시계**.
 *
 * 서버와 클라이언트가 각자 세면 자정 근처에 하루가 어긋나고, 그게 §9 함정 5가 경고한 P0다.
 * `lib/run/` 을 만든 이유가 "같은 테스트로 검증된 두 코드"가 아니라 "문자 그대로 같은 코드"인데,
 * 정작 입력값이 두 코드로 남아 있으면 헛일이다.
 *
 * ❌ `new Date().toISOString().slice(0, 10)` 은 UTC라 매일 0~9시에 "어제"를 준다.
 * 'en-CA' 로케일이 YYYY-MM-DD를 주는 것을 이용한다 — Firestore 문서 id에 그대로 들어가는 형식이다.
 */
export function todayKST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function isSameKstDay(
  lastRunDate: string | null,
  todayKST: string,
): boolean {
  return Boolean(lastRunDate) && lastRunDate === todayKST;
}
