import { describe, it, expect, vi } from "vitest";
import { aiFillCore, AiFillError, buildPrompt } from "../core/aiFillCore";
import { ContestantParseError } from "../core/parseContestants";

function fakeArray(n: number): string {
  return JSON.stringify(
    Array.from({ length: n }, (_, i) => ({
      name: `P${i + 1}`,
      nationality: "KR",
      position: "FW",
      imageSearchKeyword: `p${i + 1}`,
    })),
  );
}

const okDeps = { createMessage: vi.fn(async () => fakeArray(48)) };

const validInput = { uid: "admin1", title: "Best Strikers", category: "FOOTBALL" };

describe("aiFillCore", () => {
  it("returns 48 suggestions for a valid request", async () => {
    const result = await aiFillCore(validInput, okDeps);
    expect(result).toHaveLength(48);
  });

  it("passes a prompt containing the title and category to the model", async () => {
    const createMessage = vi.fn(async () => fakeArray(48));
    await aiFillCore(validInput, { createMessage });
    const prompt = createMessage.mock.calls[0][0];
    expect(prompt).toContain("Best Strikers");
    expect(prompt).toContain("FOOTBALL");
  });

  it("throws unauthenticated when uid is missing", async () => {
    await expect(
      aiFillCore({ ...validInput, uid: undefined }, okDeps),
    ).rejects.toMatchObject({ reason: "unauthenticated" });
  });

  it("throws invalid-argument for empty title", async () => {
    await expect(
      aiFillCore({ ...validInput, title: "   " }, okDeps),
    ).rejects.toBeInstanceOf(AiFillError);
  });

  it("throws invalid-argument for a title over 50 chars", async () => {
    await expect(
      aiFillCore({ ...validInput, title: "a".repeat(51) }, okDeps),
    ).rejects.toMatchObject({ reason: "invalid-argument" });
  });

  // TX-0: categories are DATA, not an enum. aiFillCore only builds a prompt, so
  // it enforces category SHAPE (non-empty string); the authoritative id check is
  // at Tournament creation (buildTournamentDoc), so a bad category can never
  // become a real Tournament. An empty/blank category is still rejected BEFORE
  // the model is called (cost guard, trap #10).
  it("throws invalid-argument for a blank category", async () => {
    await expect(
      aiFillCore({ ...validInput, category: "   " }, okDeps),
    ).rejects.toMatchObject({ reason: "invalid-argument" });
  });

  it("does NOT call the model when validation fails (cost guard, trap #10)", async () => {
    const createMessage = vi.fn(async () => fakeArray(48));
    await aiFillCore({ ...validInput, category: "" }, { createMessage }).catch(
      () => {},
    );
    expect(createMessage).not.toHaveBeenCalled();
  });

  it("throws ai-failed when the model call rejects", async () => {
    const createMessage = vi.fn(async () => {
      throw new Error("network");
    });
    await expect(
      aiFillCore(validInput, { createMessage }),
    ).rejects.toMatchObject({ reason: "ai-failed" });
  });

  // AI-1: 47명은 이제 허용 범위(floor 46)다 — floor 아래인 45명으로 내려서 검사한다.
  it("propagates a ContestantParseError when the model returns too few", async () => {
    const createMessage = vi.fn(async () => fakeArray(45));
    await expect(
      aiFillCore(validInput, { createMessage }),
    ).rejects.toBeInstanceOf(ContestantParseError);
  });

  it("injects description + keywords as prompt hints when provided", async () => {
    const createMessage = vi.fn(async () => fakeArray(48));
    await aiFillCore(
      { ...validInput, description: "글로벌 톱 스트라이커", keywords: ["goal", "speed"] },
      { createMessage },
    );
    const prompt = createMessage.mock.calls[0][0];
    expect(prompt).toContain("글로벌 톱 스트라이커");
    expect(prompt).toContain("goal");
    expect(prompt).toContain("speed");
  });

  describe("blank-only mode (existing[])", () => {
    it("requests only the missing count and excludes existing names", async () => {
      const createMessage = vi.fn(async () => fakeArray(1));
      const existing = Array.from({ length: 47 }, (_, i) => `P${i + 1}`);
      const result = await aiFillCore(
        { ...validInput, existing },
        { createMessage },
      );
      expect(result).toHaveLength(1); // only the 1 blank
      const prompt = createMessage.mock.calls[0][0];
      expect(prompt).toContain("P1"); // exclusion list injected
      expect(prompt).toContain("47"); // already-have count referenced
    });

    it("rejects when there are no blanks to fill (existing >= 48)", async () => {
      const createMessage = vi.fn(async () => fakeArray(48));
      const existing = Array.from({ length: 48 }, (_, i) => `P${i + 1}`);
      await expect(
        aiFillCore({ ...validInput, existing }, { createMessage }),
      ).rejects.toMatchObject({ reason: "invalid-argument" });
      expect(createMessage).not.toHaveBeenCalled(); // cost guard
    });
  });

  it("logs the original error via logError before throwing ai-failed", async () => {
    const original = new Error("anthropic 500");
    const createMessage = vi.fn(async () => {
      throw original;
    });
    const logError = vi.fn();
    await expect(
      aiFillCore(validInput, { createMessage, logError }),
    ).rejects.toMatchObject({ reason: "ai-failed" });
    expect(logError).toHaveBeenCalledWith(expect.any(String), original);
  });
});

/**
 * AI-2 (2026-08-18) — 힌트 칸 계약 · 불확실 인물 출구 · 명단 적격성.
 *
 * 문구는 골든(실호출)이 진짜 검증자다(R2). 여기서 재는 건 "그 문구가 프롬프트에
 * 실제로 실려 나가는가" 하나다 — AI-1에서 프롬프트를 고쳐 놓고 조건 분기 때문에
 * 안 실려 나간 적이 있다면 이 테스트가 잡는다.
 */
describe("buildPrompt — AI-2 계약 문구", () => {
  const base = { title: "K-POP 4세대 걸그룹 최강자", category: "KPOP", count: 48 };

  it("imageSearchKeyword가 '그대로 넣을 검색어'임을 정의한다", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("imageSearchKeyword 규칙:");
    expect(prompt).toContain("유튜브 검색창에 그대로 붙여 넣을 검색어");
    expect(prompt).toContain("메모장이 아니다");
  });

  it("메모·의문·물음표를 금지한다", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("물음표를 절대 넣지 말 것");
  });

  // AI-2.5: 곡명 금지. 스모크에서 곡명 한 낱말이 검색 과협소·중복 미병합·플래그
  // 오탐을 한꺼번에 만들었다. 검증기로는 못 거르므로(임의의 낱말) 계약이 유일한 방어다.
  it("곡 제목을 금지하고 형식을 3~4단어로 좁힌다", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("곡 제목·노래 이름은 넣지 말 것");
    expect(prompt).toContain("그룹 영문명 + 활동명 영문 + stage 또는 performance");
    expect(prompt).toContain("3~4단어로 끝낸다");
  });

  it("금지 이유까지 함께 실어 보낸다 (규칙만 주면 잘 안 지킨다)", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("검색이 지나치게 좁아져");
    expect(prompt).toContain("같은 인물이 곡만 바꿔 두 번 오른다");
  });

  it("불확실 인물의 출구를 준다 — 확신 없으면 빼라", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("확신할 수 없으면 그 인물을 목록에서 빼라");
    expect(prompt).toContain("여유 있게 요청했으니");
  });

  it("명단 적격성 규칙을 싣는다 (탈퇴·활동중단·논란 제외)", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("탈퇴·퇴출된 전 멤버");
    expect(prompt).toContain("해체했거나 활동을 중단한 팀");
    expect(prompt).toContain("학교폭력·범죄");
  });

  // AI-2.2: 이 규칙은 2026-08-19 골든에서 **한 번 뚫렸다**. 강화 문구가 통째로
  // 빠지면 같은 사고가 조용히 재발하므로 세 조각을 각각 못 박는다.
  it("강화된 적격성 문구 3요소가 모두 나간다 (금지 목록 · 현재 멤버 · 자문 절차)", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("지금 그 팀의 현재 공식 멤버");
    expect(prompt).toContain("지금 활동 중인가");
    expect(prompt).toContain("다른 사람으로 채운다");
  });

  it("blank-only 모드에서도 계약 문구가 함께 나간다", () => {
    // 빈칸만 채우는 경로가 계약을 잃으면 오염이 그 경로로만 되살아난다.
    const prompt = buildPrompt({ ...base, count: 6, existing: ["설윤", "지수"] });
    expect(prompt).toContain("imageSearchKeyword 규칙:");
    expect(prompt).toContain("탈퇴·퇴출된 전 멤버");
  });

  it("기존 규칙은 그대로 남는다 (추가만 — RULE 1)", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("실존 인물만");
    expect(prompt).toContain("같은 인물을 두 번 넣지 말 것");
    expect(prompt).toContain("미성년자 금지");
    expect(prompt).toContain("국적을 가리지 말 것");
  });
});

describe("aiFillCore — 폐기 로그 (AI-2)", () => {
  it("검증기가 버린 항목을 사유와 함께 로그로 남긴다", async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      name: `P${i + 1}`,
      nationality: "KR",
      position: "FW",
      imageSearchKeyword: i === 0 ? "Group1 아님 P2 확인" : `group${i} stage`,
    }));
    const logInfo = vi.fn();
    const result = await aiFillCore(validInput, {
      createMessage: async () => JSON.stringify(rows),
      logInfo,
    });
    expect(result).toHaveLength(48);
    expect(result.some((c) => c.name === "P1")).toBe(false);
    expect(logInfo).toHaveBeenCalledTimes(1);
    const line = logInfo.mock.calls[0][0] as string;
    expect(line).toContain("polluted-hint");
    expect(line).toContain("P1");
  });

  it("버릴 게 없으면 로그도 남기지 않는다", async () => {
    const logInfo = vi.fn();
    await aiFillCore(validInput, { createMessage: async () => fakeArray(48), logInfo });
    expect(logInfo).not.toHaveBeenCalled();
  });
});
