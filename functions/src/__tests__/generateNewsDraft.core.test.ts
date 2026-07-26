/**
 * ND-1 §3 #4 — generateNewsDraft cores: rate limit 20/KST일 + draft assembly
 * (origin 기록 · draft-only). AC 7 · AC 1.
 *
 * The callable itself is a thin Firestore/Anthropic adapter (emulator-integration
 * tested in Phase 7); its DECISIONS live in these injected-dep cores:
 *   - newsRateLimit: pure "count < 20 today?" + docId + error-code contract
 *   - assembleLocalizedDraft: Haiku reply → parse → translate → 3-lang DRAFT
 */
import { describe, expect, it, vi } from "vitest";
import {
  NEWS_DAILY_LIMIT,
  NEWS_ERROR_CODES,
  decideNewsGeneration,
  newsRateDocId,
} from "../core/newsRateLimit";
import { assembleLocalizedDraft } from "../core/newsDraftPipeline";

describe("newsRateLimit — 20/KST일 (AC 7)", () => {
  it("allows below the limit, rejects at/above it", () => {
    expect(decideNewsGeneration(0).status).toBe("allowed");
    expect(decideNewsGeneration(19).status).toBe("allowed");
    expect(decideNewsGeneration(20).status).toBe("limit_reached");
    expect(decideNewsGeneration(21).status).toBe("limit_reached");
  });
  it("exposes the limit as 20 and a stable error code", () => {
    expect(NEWS_DAILY_LIMIT).toBe(20);
    expect(NEWS_ERROR_CODES.DAILY_LIMIT).toBe("news_daily_limit");
  });
  it("keys the counter per uid + KST day", () => {
    expect(newsRateDocId("admin1", "2026-07-22")).toBe("admin1_2026-07-22");
  });
});

// A fake createMessage that answers BOTH the draft prompt and the per-language
// translation prompts (translation prompts carry a "(en)"/"(es)" + 번역 marker).
function fakeMessage(prompt: string): string {
  const isTranslate = /번역/.test(prompt) && /\((en|es)\)/.test(prompt);
  if (isTranslate) {
    const l = prompt.includes("(en)") ? "en" : "es";
    return JSON.stringify({
      title: `T-${l}`,
      subhead: `S-${l}`,
      body: [{ type: "lead", text: `lead-${l}` }],
    });
  }
  // draft reply — OUTPUT_SPEC uses "blocks"
  return JSON.stringify({
    title: "여름 차트가 움직였다",
    subhead: "48곡이 한 무대에",
    blocks: [{ type: "lead", text: "지난주 순위는 세 번 바뀌었다." }],
  });
}

describe("assembleLocalizedDraft — draft-only + origin 기록 (AC 1)", () => {
  const args = {
    slug: "20260722-a1b2c3",
    template: "open" as const,
    origin: "manual_ai" as const,
    sourceLang: "ko" as const,
    prompt: "[오픈 기사] ... 스타일가이드 ...",
    evidence: { asOf: "2026-07-22 08:00 KST", stats: [{ label: "C", value: "48" }] },
    tournamentId: "t1",
  };

  it("produces a DRAFT (never published) with the origin recorded", async () => {
    const doc = await assembleLocalizedDraft(args, {
      createMessage: vi.fn(fakeMessage),
    });
    expect(doc.status).toBe("draft");
    expect(doc.publishedAt).toBeNull();
    expect(doc.origin).toBe("manual_ai");
    expect(doc.tournamentId).toBe("t1");
  });

  it("lands 3-language (source authored + en/es translated)", async () => {
    const doc = await assembleLocalizedDraft(args, {
      createMessage: vi.fn(fakeMessage),
    });
    expect(doc.title.ko).toBe("여름 차트가 움직였다");
    expect(doc.title.en).toBe("T-en");
    expect(doc.title.es).toBe("T-es");
    expect(doc.body.ko[0]).toEqual({ type: "lead", text: "지난주 순위는 세 번 바뀌었다." });
    expect((doc.body.en[0] as { text: string }).text).toBe("lead-en");
  });

  it("carries the evidence snapshot into the doc", async () => {
    const doc = await assembleLocalizedDraft(args, {
      createMessage: vi.fn(fakeMessage),
    });
    expect(doc.evidence.stats[0]).toEqual({ label: "C", value: "48" });
    expect(doc.evidence.asOf).toBe("2026-07-22 08:00 KST");
  });

  it("throws when the draft reply has no usable blocks", async () => {
    const createMessage = vi.fn(async (p: string) =>
      /번역/.test(p) ? fakeMessage(p) : JSON.stringify({ title: "x", subhead: "y", blocks: [] }),
    );
    await expect(assembleLocalizedDraft(args, { createMessage })).rejects.toThrow();
  });
});
