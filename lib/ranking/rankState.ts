/**
 * lib/ranking/rankState — 차트 화면의 상태 판정 (순수).
 *
 * ## 없어진 상태: locked
 *
 * 마감 전에는 `locked` 로 숫자를 감췄다(W-7). **D-30(2026-09-23 대표)으로 폐기**됐다 —
 * 차트는 마감 전에도, 로그인하지 않아도 열린다. `firestore.rules` 의 마감 게이트도 같은
 * PR에서 지웠다. 두 곳 중 하나만 고치면 화면은 열렸는데 읽기가 막히는(또는 그 반대의)
 * 어긋남이 생긴다.
 *
 * ## 생긴 상태: waiting
 *
 * 대회 전체 완주 판수가 {@link MIN_RUNS_FOR_CHART} 에 닿기 전에는 점수를 보여 주지 않는다
 * (정본 §5). 판수가 적으면 비율이 크게 흔들리기 때문이다 — 3판 중 1번 1등이면 우승율 33%.
 * **차트로 가는 길(메뉴·링크)은 숨기지 않는다.** 먼저 온 팬은 차트가 궁금하다.
 *
 * 캐시 문서가 아예 없는 경우도 팬에게는 같은 상황("아직 참여가 적다")이라 같은 상태로
 * 합쳤다(대표 승인 2026-09-24).
 */

/** 차트가 열리는 최소 완주 판수 (정본 §5). 게스트 판은 이 수에 들어가지 않는다. */
export const MIN_RUNS_FOR_CHART = 10;

export type RankState = "loading" | "waiting" | "loaded";

/** 판정에 필요한 캐시 문서의 필드만 — SDK 타입에 묶이지 않게 좁게 받는다. */
export interface RankStateCache {
  runsTotal?: number;
  rankings?: unknown[];
}

/**
 * `undefined` = 첫 스냅샷을 아직 못 받음 · `null` = 캐시 문서 없음.
 *
 * 판수는 **캐시에 실려 온 값**으로 판정한다 — 화면이 votes를 따로 세지 않는다(킥 §E).
 */
export function deriveRankState(
  cache: RankStateCache | null | undefined,
): RankState {
  if (cache === undefined) return "loading";
  if (!cache) return "waiting";
  // 옛 캐시에는 runsTotal 이 없다. 없으면 0으로 읽어 기다림 안내를 보여 준다 —
  // 다음 발표(하루 두 번)가 값을 채우면 저절로 열린다.
  if ((cache.runsTotal ?? 0) < MIN_RUNS_FOR_CHART) return "waiting";
  if (!cache.rankings || cache.rankings.length === 0) return "waiting";
  return "loaded";
}

/**
 * "다음 발표" 한 줄을 보여 줄까.
 *
 * D-30 전에는 이 줄이 **늘 거짓말**이었다 — 팬이 숫자를 볼 수 있는 시점(마감 후)에는 그
 * 캐시가 다시 갱신될 일이 없었기 때문이다. 이제 마감 전에 보이므로 사실이 됐고, 반대로
 * **마감 뒤에는 감춘다** (더 발표되지 않는다).
 *
 * `undefined` = 대회 문서 미로딩 → 감춘다(모르는 채로 말하지 않는다).
 * `null` = 마감 시각이 없는 대회 → 계속 발표되므로 보여 준다.
 */
export function showNextUpdateLine(
  deadlineMs: number | null | undefined,
  nowMs: number,
): boolean {
  if (deadlineMs === undefined) return false;
  if (deadlineMs === null) return true;
  return deadlineMs > nowMs;
}

/**
 * Crown Score 설명창(?)에 넣을 문구 — 없으면 `null`.
 *
 * 설명창은 **계산식을 쉬운 말로 알려 주는 공통 문구 하나**다(대표 2026-09-24).
 * Contestant마다 다른 수치를 보여 주는 자리가 아니다.
 *
 * 문안은 마케팅이 정본 §6을 근거로 따로 짓는다. 그 전에는 **자리만 두고 그리지 않는다** —
 * 임시 문구를 지어 넣는 것은 킥 §4에서 금지다. 대기 표식이 화면에 새어 나가지 않게
 * 막는 곳이 여기다.
 */
export function resolveHelpText(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text) return null;
  // `MARKETING_PENDING` 을 import 하면 lib/ranking 이 i18n 에 묶인다(이 폴더는
  // functions 로 복사되는 순수 모듈들과 이웃이다). 표식의 모양으로 판정한다.
  if (text.startsWith("⟪") && text.endsWith("⟫")) return null;
  return text;
}
