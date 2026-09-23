/**
 * ARENA-1 PR 2b — 첫 입장 안내 팝업의 "기기당 1회" (원장 D-13 · 디자인 24~26).
 *
 * 매 입장마다 뜨면 선택의 흐름을 해친다(D-13 정의). 기기가 기억한다.
 * ⚠️ localStorage 가 막힌 환경(사생활 보호 모드·차단)에서 **매번 뜨면 안 된다** —
 *    읽지도 쓰지도 못하면 그 세션 동안은 "이미 봤다"로 친다(§8 Auto-STOP 조건).
 */
import { describe, expect, it, vi } from "vitest";
import { INTRO_SEEN_KEY, markIntroSeen, shouldShowIntro } from "@/lib/arena/introSeen";

function storage(initial: Record<string, string> = {}, opts: { blocked?: boolean } = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => {
      if (opts.blocked) throw new Error("blocked");
      return data.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (opts.blocked) throw new Error("blocked");
      data.set(k, v);
    },
    data,
  };
}

describe("shouldShowIntro", () => {
  it("처음 들어온 기기에는 보여 준다", () => {
    expect(shouldShowIntro(storage())).toBe(true);
  });

  it("한 번 본 기기에는 보여 주지 않는다", () => {
    expect(shouldShowIntro(storage({ [INTRO_SEEN_KEY]: "1" }))).toBe(false);
  });

  it("저장소가 막혀 있으면 보여 주지 않는다 — 매번 뜨는 것이 더 나쁘다", () => {
    expect(shouldShowIntro(storage({}, { blocked: true }))).toBe(false);
  });

  it("저장소 자체가 없으면(서버 렌더 등) 보여 주지 않는다", () => {
    expect(shouldShowIntro(null)).toBe(false);
  });

  it("키 이름은 킥에 적힌 그대로", () => {
    expect(INTRO_SEEN_KEY).toBe("wc48:arena:intro:v1");
  });
});

describe("markIntroSeen", () => {
  it("본 것으로 적는다", () => {
    const s = storage();
    markIntroSeen(s);
    expect(s.data.get(INTRO_SEEN_KEY)).toBe("1");
  });

  it("저장소가 막혀 있어도 터지지 않는다", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => markIntroSeen(storage({}, { blocked: true }))).not.toThrow();
    warn.mockRestore();
  });
});
