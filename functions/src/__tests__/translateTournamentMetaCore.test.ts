import { describe, it, expect, vi } from "vitest";
import {
  translateTournamentMetaCore,
  TranslateMetaError,
} from "../core/translateTournamentMetaCore";

// Option A: the core makes ONE call PER target language. Each prompt names its
// target as "(en)" / "(es)". The fake replies with a per-language JSON object,
// so one language's reply can never drop another's slot.
function targetOf(prompt: string): string {
  return ["ko", "en", "es"].find((l) => prompt.includes(`(${l})`)) ?? "??";
}
function fakeFor(prompt: string): string {
  const l = targetOf(prompt);
  return JSON.stringify({ title: `T-${l}`, description: `D-${l}` });
}

const deps = { createMessage: vi.fn(async (p: string) => fakeFor(p)) };

const base = {
  uid: "admin1",
  title: "Best Idols",
  description: "글로벌 4세대",
  sourceLang: "ko" as const,
};

describe("translateTournamentMetaCore (Option A — per-language calls)", () => {
  it("keeps the source text in the source slot, fills BOTH other languages", async () => {
    const r = await translateTournamentMetaCore(base, deps);
    expect(r.titleI18n.ko).toBe("Best Idols"); // source untouched
    expect(r.titleI18n.en).toBe("T-en");
    expect(r.titleI18n.es).toBe("T-es"); // <-- the slot that regressed in prod
    expect(r.descriptionI18n.ko).toBe("글로벌 4세대");
    expect(r.descriptionI18n.en).toBe("D-en");
    expect(r.descriptionI18n.es).toBe("D-es");
  });

  it("makes one call per TARGET (2 for a ko source) and never for the source lang", async () => {
    const createMessage = vi.fn(async (p: string) => fakeFor(p));
    await translateTournamentMetaCore(base, { createMessage });
    expect(createMessage).toHaveBeenCalledTimes(2); // en + es, not ko
    const prompts = createMessage.mock.calls.map((c) => targetOf(c[0])).sort();
    expect(prompts).toEqual(["en", "es"]);
  });

  it("leaves description slots empty when there is no description (선택)", async () => {
    const createMessage = vi.fn(async (p: string) => fakeFor(p));
    const r = await translateTournamentMetaCore(
      { ...base, description: "" },
      { createMessage },
    );
    expect(r.descriptionI18n).toEqual({ ko: "", en: "", es: "" });
  });

  // ── Resilience: a FAILED target falls back to source + logs, and NEVER drags
  // down a target that DID translate (this is the exact prod regression). ──

  it("es model call rejects → es falls back to source (logged), en still translated", async () => {
    const err = new Error("timeout on es");
    const createMessage = vi.fn(async (p: string) => {
      if (targetOf(p) === "es") throw err;
      return fakeFor(p);
    });
    const logError = vi.fn();
    const r = await translateTournamentMetaCore(base, { createMessage, logError });
    expect(r.titleI18n.en).toBe("T-en"); // unaffected
    expect(r.titleI18n.es).toBe("Best Idols"); // source fallback, not silent
    expect(logError).toHaveBeenCalled();
  });

  it("es reply unparseable → es falls back to source + logs, en intact", async () => {
    const createMessage = vi.fn(async (p: string) =>
      targetOf(p) === "es" ? "sorry, no json" : fakeFor(p),
    );
    const logError = vi.fn();
    const r = await translateTournamentMetaCore(base, { createMessage, logError });
    expect(r.titleI18n.en).toBe("T-en");
    expect(r.titleI18n.es).toBe("Best Idols");
    expect(logError).toHaveBeenCalled();
  });

  it("es returns an EMPTY title → es falls back to source + logs (the prod bug)", async () => {
    const createMessage = vi.fn(async (p: string) =>
      targetOf(p) === "es"
        ? JSON.stringify({ title: "", description: "" })
        : fakeFor(p),
    );
    const logError = vi.fn();
    const r = await translateTournamentMetaCore(base, { createMessage, logError });
    expect(r.titleI18n.en).toBe("T-en");
    expect(r.titleI18n.es).toBe("Best Idols"); // never a silent Korean-only slot
    expect(logError).toHaveBeenCalled();
  });

  // ── Validation still throws (cost/contract guard). ──

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
});
