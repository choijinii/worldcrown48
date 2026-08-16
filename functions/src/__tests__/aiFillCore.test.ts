import { describe, it, expect, vi } from "vitest";
import { aiFillCore, AiFillError } from "../core/aiFillCore";
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
