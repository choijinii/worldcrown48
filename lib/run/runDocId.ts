/**
 * 회차가 붙는 문서 이름을 만드는 **유일한 곳** (핸드오프 §3.0 B안 조건 1).
 *
 * 규칙: **1회차는 접미사 없음 · 2회차부터 `_r{n}`**.
 * 1회차 이름을 현행과 같게 두는 것이 B안의 전부다 — PR 1(서버)만 배포된 구간에
 * 옛 화면이 접미사 없는 `roundProgress` 를 계속 구독해도 정상 동작한다. 1회차 이름이
 * 바뀌면 라운드 전환 안내가 영영 안 뜨고 THE FINAL에서 멈춘다(2026-07-06 HF-1.6과 같은 유형).
 *
 * 덤으로 옛 문서가 곧 1회차 문서가 되어 폴백 코드가 필요 없다(AC 11).
 *
 * 호출부는 이 규칙을 몰라야 한다. 어디서도 문자열을 직접 조합하지 말고 이 함수를 통과시킨다 —
 * "1회차만 예외"가 분기로 흩어지면 그게 다음 버그다.
 *
 * ⚠️ 이 파일은 `functions/src/_run/` 로 복사되므로 import를 가지지 않는다.
 */

/** 1회차는 빈 문자열. 이 규칙을 아는 코드는 이 파일 안뿐이다. */
function runSuffix(runIndex: number): string {
  if (!Number.isInteger(runIndex) || runIndex < 1) {
    throw new Error(`runIndex는 1 이상의 정수여야 합니다 (받음: ${runIndex}).`);
  }
  return runIndex === 1 ? "" : `_r${runIndex}`;
}

/**
 * `bracket_seeds` · `roundProgress` · `crown_cards` 공통 문서 id.
 *
 * Firebase uid에는 '_' 가 없으므로 `docId.split('_')[0]` 은 tournamentId나 `_r{n}` 이
 * 뒤에 붙어도 언제나 uid다 — 기존 소유자 판정 규칙이 그대로 통과한다(§9 함정 1).
 * 반대로 이 id를 잘라 tournamentId를 복원하지는 말 것: 실제 슬러그가 `gen4_idol_48` 처럼
 * '_' 를 포함한다(§9 함정 2).
 */
export function runDocId(
  uid: string,
  tournamentId: string,
  runIndex: number,
): string {
  return `${uid}_${tournamentId}${runSuffix(runIndex)}`;
}

/** Crown Card PNG의 Storage 경로 — 회차마다 파일이 따로여야 지난 카드가 보존된다(AC 5). */
export function crownCardStoragePath(
  tournamentId: string,
  uid: string,
  runIndex: number,
): string {
  return `crown-cards/${tournamentId}/${uid}${runSuffix(runIndex)}.png`;
}

/** 아직 서버가 확인해 주지 않은 씨앗의 localStorage 키 (회차마다 다르다). */
export function bracketSeedCacheKey(
  uid: string,
  tournamentId: string,
  runIndex: number,
): string {
  return `wc48_bracket_seed_${runDocId(uid, tournamentId, runIndex)}`;
}
