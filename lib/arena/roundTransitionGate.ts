/**
 * RUN-FIX-1 (2026-11-25) — 라운드 전환 안내를 "판(회차) 단위"로 판정한다.
 *
 * [다시 참여]는 페이지를 언마운트하지 않고 스토어만 바꾼다(`voteStore.startNextRun`). 그래서 화면 state 는
 * 판이 바뀌어도 그대로 남는다. 예전에는 "이미 본 안내 번호"를 숫자 하나로 들고 있어서, 1판째 끝에 5(THE FINAL)
 * 까지 올라간 값이 2판째의 24강·12강·6강·결승 안내를 전부 막았다. 계측 가드(RUN-1 PR 3)처럼 판을 키로 쓴다.
 */
import type { RoundProgressEvent } from "@/lib/arena/useRoundTransition";

/** 마지막으로 닫은 안내 — 어느 판(`run`)에서 몇 번째 라운드(`to`)까지 봤는가. */
export interface DismissedRound {
  run: number | undefined;
  to: number;
}

export const NO_DISMISSED_ROUND: DismissedRound = { run: undefined, to: 0 };

export function dismissRound(runIndex: number | undefined, toRound: number): DismissedRound {
  return { run: runIndex, to: toRound };
}

/** 지금 판에서 아직 닫지 않은 라운드로 넘어가는 중이면 true. 다른 판에서 닫은 기록은 0으로 본다. */
export function shouldShowRoundTransition(
  progress: RoundProgressEvent | null | undefined,
  dismissed: DismissedRound,
  runIndex: number | undefined,
): boolean {
  if (!progress?.toRound || progress.complete) return false;
  const seenTo = dismissed.run === runIndex ? dismissed.to : 0;
  return progress.toRound > seenTo;
}

/**
 * 진행 문서 이벤트를 "어느 판 문서에서 왔는지"와 함께 저장해 두고, 지금 판의 것만 돌려준다.
 * [다시 참여] 직후 새 판 문서의 첫 스냅숏이 오기 전 한 렌더 동안, 1판째 완주 이벤트가 2판째 화면에
 * 새면 완주 화면이 깜빡이고 2판째 이름으로 champion_confirmed 가 잘못 나간다(그 뒤 진짜 완주가 가드에 막힘).
 */
export function eventForRun<T>(
  stored: { key: string | null; event: T | null },
  currentKey: string | null,
): T | null {
  return currentKey !== null && stored.key === currentKey ? stored.event : null;
}

/**
 * RUN-FIX-2 (2026-11-25) — 완주 뒤 판 숫자를 서버에서 다시 읽었는지 기억하는 열쇠. 판 번호를 함께 넣는다.
 * Champion 이름만으로 기억하면, 같은 Champion이 두 판 연속 나왔을 때 2판째 완주 뒤 다시 읽지 않아
 * [다시 참여]가 "(1/5)"로 꺼진 채 남았다(3판째 불가 · 새로고침해야 풀림).
 */
export function completedRunKey(runIndex: number | undefined, championId: string): string {
  return `${runIndex ?? 0}:${championId}`;
}
