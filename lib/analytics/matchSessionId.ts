/**
 * `match_session_id` — 한 판(Run)을 가리키는 16자 열쇠 (EVENT_SPEC v1.2 ⑩ · RUN-1 PR 3).
 *
 * 참가 규칙 v2.0으로 한 사람이 같은 대회를 하루 5판까지 돈다. 이벤트에 회차가 실리지 않으면
 * 완주율도 이탈 라운드도 판 단위로 안 나뉜다 — "사람 × 대회 = 1:1" 가정은 폐기됐다.
 *
 * 설계 조건 세 가지:
 *   1. **저장하지 않는다.** 입력이 같으면 기기·세션이 달라도 같은 값이 나온다. 그래서 새로고침
 *      이나 이어하기로 돌아와도 같은 판이 같은 열쇠로 이어진다.
 *   2. **동기 · 외부 의존 없음.** SubtleCrypto(`crypto.subtle.digest`)는 Promise를 돌려준다 —
 *      비동기가 한 번 섞이면 이 값을 쓰는 발화 지점이 전부 오염된다(순서·누락). 그래서 암호
 *      해시가 아니라 FNV-1a 같은 짧은 비암호 해시를 쓴다. 이 값은 비밀이 아니라 **묶는 열쇠**다.
 *   3. **구분자에 `_` 를 쓰지 않는다.** 실제 `tournamentId` 는 `gen4_idol_48` 처럼 `_` 를 품고
 *      있어서, `_` 로 이으면 `"a_b" + "c"` 와 `"a" + "b_c"` 가 같은 문자열이 된다 — 서로 다른
 *      두 판이 한 열쇠를 쓰게 되는 자리다(§9 함정 2와 같은 유형). uid·tournamentId 어디에도
 *      나타나지 않는 `|` 를 쓴다.
 */

/** FNV-1a 32비트. `offset` 을 달리해 독립적인 두 번을 돌린다. */
function fnv1a(input: string, offset: number): number {
  let hash = offset;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // ×16777619 를 32비트 곱셈 오버플로 없이 — Math.imul 이 그 자리다.
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const OFFSET_A = 0x811c9dc5; // FNV-1a 표준 offset basis
const OFFSET_B = 0x01000193; // 두 번째 자릿수용 다른 시드

/**
 * 한 판의 열쇠 — 같은 (uid, tournamentId, runIndex) 면 언제나 같은 16자 hex.
 *
 * 게스트도 익명 계정 uid가 있으므로 값이 나온다. 동의 게이트는 기존 `trackWithConsent`
 * 경로 그대로다 — 이 함수는 값만 만든다.
 */
export function matchSessionId(
  uid: string,
  tournamentId: string,
  runIndex: number,
): string {
  const input = `${uid}|${tournamentId}|${runIndex}`;
  const a = fnv1a(input, OFFSET_A);
  // ⚠️ 두 번째 자리는 **다른 입력**으로 돌린다. 시드만 바꿔 같은 문자열을 두 번 돌리면
  // FNV의 낮은 비트가 거의 확산되지 않아 두 자리가 서로 묶인다 — 곱하는 소수가 홀수라
  // 최하위 비트가 `offset ^ 입력`으로만 정해지고, 두 offset의 최하위 비트가 같아
  // **뒷자리의 낮은 두 비트가 앞자리로 완전히 결정된다.** 16자가 16자만큼 일하지 않는다.
  // 입력을 뒤집어 넣으면 그 종속이 사라진다. (비밀이 아니라 묶는 열쇠지만, 열쇠는
  // 적힌 자릿수만큼 실제로 갈라져야 한다.)
  const b = fnv1a(input.split("").reverse().join(""), OFFSET_B);
  return `${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`;
}
