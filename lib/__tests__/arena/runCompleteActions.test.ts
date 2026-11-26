/**
 * 완주 화면 액션 영역 (지시서 RUN-FIX-2 완주화면 v1.0 · 2026-11-25) — 안내 줄은 밝고 크게.
 * 대표 지적: "오늘 남은 참여 가능 횟수는 : 2판 · 저장하려면 로그인" 글씨가 너무 작고 어둡다 — 중요한 안내다.
 * 안내 줄(남은 판 · 오늘 한도 · 마감) 전부 15px · 본문 글자색 토큰. 문구는 한 글자도 바꾸지 않는다.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RunCompleteActions } from "@/components/arena/RunCompleteActions";
import type { ActiveRunState } from "@/lib/run/activeRun";

const run = (over: Partial<ActiveRunState>): ActiveRunState => ({
  screen: "complete",
  displayRunIndex: 1,
  nextRunIndex: 2,
  runsToday: 1,
  limit: 3,
  canPlayAgain: true,
  blockedReason: null,
  ...over,
});
const render = (r: ActiveRunState, isGuest: boolean) =>
  renderToStaticMarkup(
    createElement(RunCompleteActions, {
      run: r,
      uid: "u",
      tournamentId: "t",
      isGuest,
      nameOf: () => undefined,
      onPlayAgain: () => {},
      onSignIn: () => {},
    }),
  );
/** 안내 줄(<p>)의 style 속성들. */
const paragraphStyles = (html: string) => Array.from(html.matchAll(/<p style="([^"]*)"/g), (m) => m[1]);

describe("RunCompleteActions 안내 줄 — 15px · 본문 글자색 토큰", () => {
  const cases: Array<[string, ActiveRunState, boolean]> = [
    ["게스트 남은 판", run({}), true],
    ["오늘 한도", run({ limit: 5, runsToday: 5, canPlayAgain: false, blockedReason: "daily_limit" }), false],
    ["마감", run({ canPlayAgain: false, blockedReason: "deadline_passed" }), false],
  ];
  for (const [label, r, guest] of cases) {
    it(label, () => {
      const styles = paragraphStyles(render(r, guest));
      expect(styles.length).toBeGreaterThan(0);
      for (const s of styles) {
        expect(s).toContain("font-size:15px");
        expect(s).toContain("color:var(--color-text)");
        expect(s).not.toContain("--color-text-muted");
      }
    });
  }

  it("문구는 그대로 — 게스트 남은 판 안내(서버 렌더 기본 언어 en)", () => {
    expect(render(run({}), true)).toContain("Entries left today: 2 · Sign in to save");
  });
});
