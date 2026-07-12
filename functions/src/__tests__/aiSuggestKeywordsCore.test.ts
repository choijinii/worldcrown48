import { describe, it, expect, vi } from "vitest";
import {
  aiSuggestKeywordsCore,
  SuggestKeywordsError,
} from "../core/aiSuggestKeywordsCore";

function fakeKeywords(list: string[]): string {
  return JSON.stringify(list);
}

const okList = [
  "kpop",
  "idol",
  "dance",
  "vocal",
  "global",
  "concert",
  "fandom",
  "debut",
];
const okDeps = { createMessage: vi.fn(async () => fakeKeywords(okList)) };
const validInput = {
  uid: "admin1",
  title: "Best K-POP Idols",
  category: "KPOP",
};

describe("aiSuggestKeywordsCore", () => {
  it("returns the parsed keyword list (8~12)", async () => {
    const result = await aiSuggestKeywordsCore(validInput, okDeps);
    expect(result).toEqual(okList);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("passes a prompt containing title + category to the model", async () => {
    const createMessage = vi.fn(async () => fakeKeywords(okList));
    await aiSuggestKeywordsCore(validInput, { createMessage });
    const prompt = createMessage.mock.calls[0][0];
    expect(prompt).toContain("Best K-POP Idols");
    expect(prompt).toContain("KPOP");
  });

  it("injects an optional description into the prompt", async () => {
    const createMessage = vi.fn(async () => fakeKeywords(okList));
    await aiSuggestKeywordsCore(
      { ...validInput, description: "글로벌 4세대 아이돌" },
      { createMessage },
    );
    expect(createMessage.mock.calls[0][0]).toContain("글로벌 4세대 아이돌");
  });

  it("normalizes: trims, drops empties, dedupes, caps at 12", async () => {
    const messy = [" kpop ", "kpop", "", "IDOL", "idol"].concat(
      Array.from({ length: 12 }, (_, i) => `k${i}`),
    );
    const createMessage = vi.fn(async () => fakeKeywords(messy));
    const result = await aiSuggestKeywordsCore(validInput, { createMessage });
    expect(result.length).toBeLessThanOrEqual(12);
    expect(result).toContain("kpop");
    expect(result).toContain("IDOL");
    // case-insensitive dedupe kept the first spelling only
    expect(result.filter((k) => k.toLowerCase() === "kpop")).toHaveLength(1);
  });

  it("throws unauthenticated when uid is missing", async () => {
    await expect(
      aiSuggestKeywordsCore({ ...validInput, uid: undefined }, okDeps),
    ).rejects.toMatchObject({ reason: "unauthenticated" });
  });

  it("throws invalid-argument for a blank title (cost guard — no model call)", async () => {
    const createMessage = vi.fn(async () => fakeKeywords(okList));
    await expect(
      aiSuggestKeywordsCore({ ...validInput, title: "  " }, { createMessage }),
    ).rejects.toMatchObject({ reason: "invalid-argument" });
    expect(createMessage).not.toHaveBeenCalled();
  });

  it("throws invalid-argument for a blank category", async () => {
    await expect(
      aiSuggestKeywordsCore({ ...validInput, category: "" }, okDeps),
    ).rejects.toBeInstanceOf(SuggestKeywordsError);
  });

  it("throws ai-failed and logs the original error when the model rejects", async () => {
    const original = new Error("timeout");
    const createMessage = vi.fn(async () => {
      throw original;
    });
    const logError = vi.fn();
    await expect(
      aiSuggestKeywordsCore(validInput, { createMessage, logError }),
    ).rejects.toMatchObject({ reason: "ai-failed" });
    expect(logError).toHaveBeenCalledWith(expect.any(String), original);
  });

  it("throws unparseable when the model returns no JSON array", async () => {
    const createMessage = vi.fn(async () => "sorry, no keywords");
    await expect(
      aiSuggestKeywordsCore(validInput, { createMessage }),
    ).rejects.toMatchObject({ reason: "unparseable" });
  });

  it("throws unparseable when the array normalizes to empty", async () => {
    const createMessage = vi.fn(async () => fakeKeywords(["", "   "]));
    await expect(
      aiSuggestKeywordsCore(validInput, { createMessage }),
    ).rejects.toMatchObject({ reason: "unparseable" });
  });
});
