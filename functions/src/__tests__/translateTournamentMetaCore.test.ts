import { describe, it, expect, vi } from "vitest";
import {
  translateTournamentMetaCore,
  TranslateMetaError,
} from "../core/translateTournamentMetaCore";

// The model is asked to translate into the MISSING languages and reply with a
// JSON map keyed by lang. The fake echoes a marked translation per lang.
function fakeTranslation(langs: string[]): string {
  const out: Record<string, { title: string; description: string }> = {};
  for (const l of langs) out[l] = { title: `T-${l}`, description: `D-${l}` };
  return JSON.stringify(out);
}

const deps = {
  createMessage: vi.fn(async (prompt: string) => {
    // Reply for whichever target langs the prompt asked about.
    const langs = ["ko", "en", "es"].filter((l) => prompt.includes(`"${l}"`));
    return fakeTranslation(langs);
  }),
};

const base = {
  uid: "admin1",
  title: "Best Idols",
  description: "글로벌 4세대",
  sourceLang: "ko" as const,
};

describe("translateTournamentMetaCore", () => {
  it("keeps the source text in the source slot, fills the other two", async () => {
    const r = await translateTournamentMetaCore(base, deps);
    expect(r.titleI18n.ko).toBe("Best Idols"); // source untouched
    expect(r.titleI18n.en).toBe("T-en");
    expect(r.titleI18n.es).toBe("T-es");
    expect(r.descriptionI18n.ko).toBe("글로벌 4세대");
    expect(r.descriptionI18n.en).toBe("D-en");
    expect(r.descriptionI18n.es).toBe("D-es");
  });

  it("does not ask the model to translate the source language", async () => {
    const createMessage = vi.fn(async () => fakeTranslation(["en", "es"]));
    await translateTournamentMetaCore(base, { createMessage });
    const prompt = createMessage.mock.calls[0][0];
    // Source lang 'ko' must NOT be a requested target.
    expect(prompt).toContain('"en"');
    expect(prompt).toContain('"es"');
  });

  it("leaves description slots empty when there is no description (선택)", async () => {
    const createMessage = vi.fn(async () => fakeTranslation(["en", "es"]));
    const r = await translateTournamentMetaCore(
      { ...base, description: "" },
      { createMessage },
    );
    expect(r.descriptionI18n).toEqual({ ko: "", en: "", es: "" });
  });

  it("throws unauthenticated without a uid", async () => {
    await expect(
      translateTournamentMetaCore({ ...base, uid: undefined }, deps),
    ).rejects.toMatchObject({ reason: "unauthenticated" });
  });

  it("throws invalid-argument for a blank title or bad sourceLang", async () => {
    await expect(
      translateTournamentMetaCore({ ...base, title: "  " }, deps),
    ).rejects.toBeInstanceOf(TranslateMetaError);
    await expect(
      translateTournamentMetaCore({ ...base, sourceLang: "fr" as never }, deps),
    ).rejects.toMatchObject({ reason: "invalid-argument" });
  });

  it("throws ai-failed and logs the original error when the model rejects", async () => {
    const original = new Error("timeout");
    const createMessage = vi.fn(async () => {
      throw original;
    });
    const logError = vi.fn();
    await expect(
      translateTournamentMetaCore(base, { createMessage, logError }),
    ).rejects.toMatchObject({ reason: "ai-failed" });
    expect(logError).toHaveBeenCalledWith(expect.any(String), original);
  });

  it("throws unparseable when the model reply is not the expected JSON map", async () => {
    const createMessage = vi.fn(async () => "sorry");
    await expect(
      translateTournamentMetaCore(base, { createMessage }),
    ).rejects.toMatchObject({ reason: "unparseable" });
  });
});
