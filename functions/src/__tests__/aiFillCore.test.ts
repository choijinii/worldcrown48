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

  it("throws invalid-argument for a non-enum category", async () => {
    await expect(
      aiFillCore({ ...validInput, category: "WORLD CUP 2026" }, okDeps),
    ).rejects.toMatchObject({ reason: "invalid-argument" });
  });

  it("does NOT call the model when validation fails (cost guard, trap #10)", async () => {
    const createMessage = vi.fn(async () => fakeArray(48));
    await aiFillCore({ ...validInput, category: "BAD" }, { createMessage }).catch(
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

  it("propagates a ContestantParseError when the model returns the wrong count", async () => {
    const createMessage = vi.fn(async () => fakeArray(47));
    await expect(
      aiFillCore(validInput, { createMessage }),
    ).rejects.toBeInstanceOf(ContestantParseError);
  });
});
