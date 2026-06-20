import { describe, it, expect } from "vitest";
import {
  countFilledContestants,
  isPublishReady,
} from "@/lib/lab/publishReady";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

function draft(name: string): ContestantDraft {
  return { name, nationality: "", position: "", imageUrl: "", imageSearchKeyword: "" };
}

describe("publishReady", () => {
  it("counts only nodes with a non-empty (trimmed) name", () => {
    const drafts = [draft("A"), draft(""), draft("  "), draft("B")];
    expect(countFilledContestants(drafts)).toBe(2);
  });

  it("is ready only when exactly 48 are named", () => {
    const full = Array.from({ length: 48 }, (_, i) => draft(`P${i}`));
    expect(isPublishReady(full)).toBe(true);
  });

  it("is not ready at 47 named", () => {
    const drafts = Array.from({ length: 48 }, (_, i) =>
      draft(i === 0 ? "" : `P${i}`),
    );
    expect(countFilledContestants(drafts)).toBe(47);
    expect(isPublishReady(drafts)).toBe(false);
  });
});
