/**
 * lib/ranking/rateFormatter — Vote Rate (%) display formatting.
 *
 * The ONLY surface allowed to show a percentage is the ranking screen (CLAUDE.md
 * 대진 흐름 #8). This formatter renders a 1-decimal share ("33.3%") — it NEVER
 * emits an absolute count. `barWidth` mirrors the wireframe bar, normalized to
 * the #1 rate (wireframe JS line 992: `Math.round(r/top*100)`).
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
