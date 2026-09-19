/**
 * fix-loop-15.lib.mjs — 기존 참가자 루프 구간 보정 계획 (순수 · I/O 없음).
 *
 * 원장 D-12: 무대 루프는 15초(10초는 "반복이 티 나서" 기각). ARENA-1 PR 1 이전에 Lab 이
 * 저장한 참가자는 `media.embed.end = start + 10` 이다. 무대는 저장된 구간을 그대로 쓰므로
 * 이 문서들을 한 번 보정한다 (대표 판정 2026-09-19):
 *
 *   end = start + 15   ·   이미 15초 이상이면 건드리지 않는다   ·   영상 없는 문서는 대상 아님
 *
 * 영상 길이는 모른다(저장돼 있지 않다). 15초가 영상 끝을 넘으면 플레이어가 끝에서 멈추고
 * LoopPlayer 가 ENDED 에서 start 로 되감는다 — 재생은 깨지지 않는다.
 *
 * lib/__tests__/embed/fixLoop15.test.ts 가 이 계획을 잠근다. 실행기 = fix-loop-15.mjs.
 */

/** 원장 D-12 — lib/embed/constants.ts LOOP_SECONDS 와 같은 값(스크립트는 TS 를 못 읽어 복사). */
export const LOOP_15_SECONDS = 15;

/**
 * @param {{ id: string, data: Record<string, any> }[]} docs contestants 문서
 * @returns {{ id: string, name: string, tournamentId: string, start: number, oldEnd: number|null, newEnd: number }[]}
 */
export function planLoopFix(docs) {
  const plan = [];
  for (const { id, data } of docs) {
    const media = data?.media;
    const embed = media?.embed;
    if (!media || media.type !== "embed" || !embed || typeof embed.videoId !== "string" || !embed.videoId) {
      continue;
    }
    const start = typeof embed.start === "number" && embed.start > 0 ? Math.floor(embed.start) : 0;
    const oldEnd = typeof embed.end === "number" ? embed.end : null;
    if (oldEnd !== null && oldEnd - start >= LOOP_15_SECONDS) continue;
    plan.push({
      id,
      name: String(data.name ?? ""),
      tournamentId: String(data.tournamentId ?? ""),
      start,
      oldEnd,
      newEnd: start + LOOP_15_SECONDS,
    });
  }
  return plan;
}
