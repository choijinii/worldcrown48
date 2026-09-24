/**
 * lib/ranking/rateFormatter — 차트 화면의 수치 표기.
 *
 * ⚠️ **화면에 나가는 수치는 이제 Crown Score 하나뿐이다** (대표 2026-09-24).
 * `formatRate` 는 더 이상 팬 화면에서 쓰이지 않는다 — "Vote Rate / 득표율"은 폐기된
 * 낱말이다(2026-09-23). 함수를 남겨 둔 이유는 하나: 이상 징후(T-1·T-2)가 여전히 rate 로
 * 판정하고, 관리자 경보 문구가 그 값을 사람이 읽을 형태로 찍기 때문이다.
 *
 * 절대 수치(`voteCount`)는 여전히 어디에도 표시하지 않는다 (CLAUDE.md 원칙 #8).
 * `barWidth` 는 1위를 100%로 잡는 막대 길이 — 이제 Crown Score 로 먹인다.
 */

/** Format a 1-decimal percentage share. NaN/Infinity guarded → "0.0%". */
export function formatRate(rate: number): string {
  if (!Number.isFinite(rate)) return "0.0%";
  return `${rate.toFixed(1)}%`;
}

/** Bar fill width (%) relative to the leader's rate. Guards 0/NaN top → 0. */
export function barWidth(rate: number, topRate: number): number {
  if (!Number.isFinite(rate) || !Number.isFinite(topRate) || topRate <= 0) {
    return 0;
  }
  return Math.round((rate / topRate) * 100);
}

/** Avatar glyph fallback when imageUrl is null — wireframe `r[0].split('. ').pop().charAt(0)`. */
export function avatarGlyph(name: string): string {
  const last = name.trim().split(". ").pop() ?? "";
  return (last.charAt(0) || "?").toUpperCase();
}

/**
 * Crown Score 표기 — 0~1000 **정수**, 단위 없음 (정본 §4).
 *
 * 퍼센트가 아니다. 퍼센트로 찍으면 팬이 "득표율"로 읽는데, 그 낱말은 폐기됐고 계산도
 * 다르다(점유율의 분모는 대회 전체 선택이 아니라 그 Contestant이 나온 대결이다).
 */
export function formatCrownScore(score: number): string {
  if (!Number.isFinite(score)) return "0";
  return String(Math.round(score));
}
