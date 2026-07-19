import { describe, it, expect } from "vitest";
import { MESSAGES } from "@/lib/i18n/messages";

describe("messages content (B-2 편승 · 오탈 정정)", () => {
  it("champion.returning.banner uses the correct Korean particle (는, not 은)", () => {
    // "Tournament" reads ending in a vowel → 는. (§3 #7 오탈 편승 수정)
    expect(MESSAGES["champion.returning.banner"].ko).toContain("이 Tournament는");
    expect(MESSAGES["champion.returning.banner"].ko).not.toContain("이 Tournament은");
  });

  it("has the #12 arena vote error copy in all three languages", () => {
    for (const key of [
      "arena.vote.dailyLimit",
      "arena.vote.rateLimited",
      "arena.vote.failed",
    ] as const) {
      expect(MESSAGES[key].ko).toBeTruthy();
      expect(MESSAGES[key].en).toBeTruthy();
      expect(MESSAGES[key].es).toBeTruthy();
    }
  });

  it("has the Lab create-flow copy in all three languages (스코프 #8)", () => {
    const labKeys = (Object.keys(MESSAGES) as (keyof typeof MESSAGES)[]).filter(
      (k) => k.startsWith("lab."),
    );
    // The flow is substantial — make sure the block actually landed.
    expect(labKeys.length).toBeGreaterThanOrEqual(30);
    for (const key of labKeys) {
      const entry = MESSAGES[key] as { ko: string; en: string; es?: string };
      expect(entry.ko, `${key}.ko`).toBeTruthy();
      expect(entry.en, `${key}.en`).toBeTruthy();
      expect(entry.es, `${key}.es`).toBeTruthy();
    }
  });
});
