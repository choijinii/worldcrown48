/**
 * KST (UTC+9) date helper.
 *
 * RUN-1 (2026-09-05): 계산은 `lib/run/kstReset` 의 `todayKST` 한 곳에만 있다.
 * 이 값은 모든 판 판정의 입력이고, 서버(`functions` 의 `kstDate`)와 클라이언트가 각자 세면
 * 자정 근처에 하루가 어긋난다 — §9 함정 5가 경고한 P0다. `lib/run/` 을 만든 이유가 "같은
 * 테스트로 검증된 두 코드"가 아니라 "문자 그대로 같은 코드"인데, 정작 입력값이 두 코드로
 * 남으면 헛일이다. 여기는 기존 호출부의 이름을 지키기 위한 얇은 위임이다.
 *
 * ❌ 이 파일에 Intl 설정을 다시 적지 말 것.
 * ❌ `new Date().toISOString().slice(0,10)` 은 UTC라 매일 0~9시에 "어제"를 준다
 *    (핸드오프 §9 trap 4에서 실제로 겪은 사고).
 */
import { todayKST } from "./run/kstReset";

export function getTodayKST(): string {
  return todayKST(new Date());
}
