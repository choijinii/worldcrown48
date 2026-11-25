/**
 * RUN-FIX-1 통합 (2026-11-25) — 화면 한 장이 판을 넘길 때의 흐름을 이어 본다.
 *
 * 실제 스토어([다시 참여] = `startNextRun` · 언마운트 없음)로 회차를 1 → 2 → 3 으로 바꾸고, 페이지가 쓰는 것과 같은
 * 두 판정(훅의 `eventForRun` · 페이지의 `shouldShowRoundTransition`)에 진행 문서 이벤트를 흘려 넣은 뒤,
 * 안내가 열리는 순간 라운드 전환 화면(`data-testid="round-transition"`)이 실제로 그려지는지 서버 렌더로 확인한다.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useVoteStore } from "@/lib/arena/voteStore";
import { RoundTransition } from "@/components/arena/RoundTransition";
import type { RoundIndex } from "@/lib/arena/roundConfig";
import type { RoundProgressEvent } from "@/lib/arena/useRoundTransition";
import { runDocId } from "@/lib/run/runDocId";
import {
  NO_DISMISSED_ROUND,
  dismissRound,
  eventForRun,
  shouldShowRoundTransition,
  type DismissedRound,
} from "@/lib/arena/roundTransitionGate";

const UID = "u1";
const TID = "t1";

/** 페이지 한 장(언마운트 없음)의 화면 state 와 훅이 마지막으로 받은 스냅숏. */
let dismissed: DismissedRound;
let stored: { key: string | null; event: RoundProgressEvent | null };

const runIndex = () => useVoteStore.getState().run!.displayRunIndex;
const currentKey = () => runDocId(UID, TID, runIndex());
/** 지금 판 문서에서 스냅숏이 왔다(onSnapshot). */
const snapshot = (event: RoundProgressEvent | null) => (stored = { key: currentKey(), event });
/** 페이지가 이번 렌더에 그리는 것: 라운드 전환 화면이면 그 HTML, 아니면 null. */
function render(): string | null {
  const progress = eventForRun(stored, currentKey());
  if (!progress || !shouldShowRoundTransition(progress, dismissed, runIndex())) return null;
  return renderToStaticMarkup(
    createElement(RoundTransition, {
      fromRound: progress.fromRound as RoundIndex,
      toRound: progress.toRound as RoundIndex,
      onDone: () => {},
    }),
  );
}
/** 팬이 안내를 닫았다(onDone). */
const close = () => (dismissed = dismissRound(runIndex(), eventForRun(stored, currentKey())!.toRound!));

/** 한 판을 끝까지: 라운드 2~5 안내가 차례로 그려지고 닫히고, 마지막에 완주 이벤트. 그려진 횟수를 돌려준다. */
function playWholeRun(): number {
  let shown = 0;
  for (const to of [2, 3, 4, 5]) {
    snapshot({ fromRound: to - 1, toRound: to });
    const html = render();
    if (html) {
      expect(html).toContain('data-testid="round-transition"');
      shown++;
      close();
      expect(render()).toBeNull(); // 닫은 안내는 같은 판에서 다시 안 뜬다
    }
  }
  snapshot({ complete: true, championId: "c1" });
  return shown;
}

function playAgain() {
  useVoteStore.setState({
    run: { ...useVoteStore.getState().run!, nextRunIndex: runIndex() + 1, canPlayAgain: true, screen: "complete" },
  });
  useVoteStore.getState().startNextRun();
}

beforeEach(() => {
  useVoteStore.getState().reset();
  useVoteStore.setState({
    run: { screen: "play", displayRunIndex: 1, nextRunIndex: 2, runsToday: 1, limit: 5, canPlayAgain: false, blockedReason: null },
  });
  dismissed = NO_DISMISSED_ROUND;
  stored = { key: null, event: null };
});

describe("판이 바뀌어도 라운드 전환 화면이 다시 그려진다 (언마운트 없음)", () => {
  it("1판 · 2판 · 3판 모두 안내 4번", () => {
    expect(playWholeRun()).toBe(4);
    playAgain();
    expect(runIndex()).toBe(2);
    expect(playWholeRun()).toBe(4);
    playAgain();
    expect(runIndex()).toBe(3);
    expect(playWholeRun()).toBe(4);
  });

  it("[다시 참여] 직후 새 판 문서를 받기 전에는 지난 판의 완주 이벤트를 넘기지 않는다", () => {
    playWholeRun();
    expect(eventForRun(stored, currentKey())).toEqual({ complete: true, championId: "c1" });
    playAgain();
    // 같은 렌더 — 훅은 아직 1판째 스냅숏만 들고 있다
    expect(eventForRun(stored, currentKey())).toBeNull();
    snapshot(null); // 2판째 문서는 아직 없다
    expect(eventForRun(stored, currentKey())).toBeNull();
    snapshot({ fromRound: 1, toRound: 2 });
    expect(render()).toContain('data-testid="round-transition"');
  });
});
