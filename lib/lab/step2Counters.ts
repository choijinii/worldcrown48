/**
 * step2Counters — STEP 2 헤더 한 줄의 숫자 (LAB-UX-1 B).
 *
 * "채움 46/48 · 제안 41 · 손볼 칸 5". 운영자가 48칸을 눈으로 훑는 대신 이 줄만
 * 보고 다음 행동을 정하게 하는 것이 재편의 목적이다. 그래서 **손볼 칸**의 정의가
 * 곧 화면의 약속이다:
 *
 *   · 검수 배지(중복 의심·이름↔힌트 불일치)가 붙은 칸
 *   · 소싱이 돌았는데 "제안"으로 끝나지 않은 칸(수동 필요·실존 의심)
 *
 * 소싱을 **아직 돌리지 않은** 칸은 세지 않는다. 이미지 경로([🖼 이미지 생성])는
 * 영상을 찾지 않으므로, 그걸 손볼 칸으로 세면 48칸 전부가 빨간 숫자가 된다.
 */
import type { SourcingStates } from "@/lib/lab/sourcingDraft";
import type { ReviewFlags } from "@/lib/lab/reviewFlags";

export interface Step2Counters {
  filled: number;
  total: number;
  suggested: number;
  todo: number;
}

export function step2Counters(
  drafts: readonly { name: string }[],
  states: SourcingStates,
  flags: ReviewFlags,
  total: number,
): Step2Counters {
  let filled = 0;
  let suggested = 0;
  const todo = new Set<number>();

  for (let i = 0; i < total; i += 1) {
    const named = (drafts[i]?.name ?? "").trim() !== "";
    if (!named) continue;
    filled += 1;
    const state = states[i];
    if (state?.status === "suggested") suggested += 1;
    else if (state) todo.add(i);
    if (flags[i]?.length) todo.add(i);
  }

  return { filled, total, suggested, todo: todo.size };
}
