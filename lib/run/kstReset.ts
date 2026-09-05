/**
 * KST 자정 리셋 — 리포에서 이 판정을 하는 유일한 곳 (핸드오프 §3.0 조건 3).
 *
 * `tournament_runs` 와 `guest_runs` 는 자정에 문서를 지우거나 새로 만들지 않는다.
 * 대신 저장된 `lastRunDate` 가 오늘(KST)이 아니면 그날 값은 **없는 것으로 읽는다.**
 * 리셋 로직이 하나여야 테스트도 하나다.
 *
 * 날짜 문자열은 반드시 KST 기준이어야 한다(§3.0 조건 1) — 서버는
 * `functions/src/core/voteRecord.ts` 의 `kstDate()`, 클라이언트는 `lib/kst.ts` 의
 * `getTodayKST()` 를 쓴다. `new Date().toISOString()` 은 UTC라 매일 0~9시에
 * "어제"로 잘못 판정한다.
 *
 * ⚠️ 이 파일은 `functions/src/_run/` 로 복사되므로 import를 가지지 않는다.
 */
export function isSameKstDay(
  lastRunDate: string | null,
  todayKST: string,
): boolean {
  return Boolean(lastRunDate) && lastRunDate === todayKST;
}
