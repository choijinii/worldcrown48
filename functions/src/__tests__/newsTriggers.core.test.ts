/**
 * ND-1 §3 #6 — news trigger cores: 멱등(idempotency) + draft-only + reply parse.
 * AC 1 · AC 2.
 *
 * The event triggers (onTournamentOpened · onChampionForNews) and the weekly cron
 * are thin Firestore adapters; their guards are pure:
 *   - newsDraftExists: origin+tournamentId 중복 draft 방지 (at-least-once 대비)
 *   - parseNewsDraftReply: Haiku 블록 JSON → 검증된 blocks
 *   - assembleLocalizedDraft always yields status:'draft' — no trigger can publish.
 */
import { describe, expect, it, vi } from "vitest";
import {
  parseNewsDraftReply,
  newsDraftExists,
  NewsDraftParseError,
} from "../core/newsDraftAssembly";
import { assembleLocalizedDraft } from "../core/newsDraftPipeline";

describe("newsDraftExists — 멱등 (origin + tournamentId)", () => {
  const existing = [
    { origin: "event_open", tournamentId: "t1" },
    { origin: "event_champion", tournamentId: "t2" },
  ];
  it("true when the same origin+tournament draft already exists", () => {
    expect(newsDraftExists(existing, "event_open", "t1")).toBe(true);
  });
  it("false for a new tournament", () => {
    expect(newsDraftExists(existing, "event_open", "t3")).toBe(false);
  });
  it("false for a different origin on the same tournament (open vs result coexist)", () => {
    expect(newsDraftExists(existing, "event_champion", "t1")).toBe(false);
  });
});

describe("parseNewsDraftReply — Haiku 블록 JSON → 검증된 초안", () => {
  it("parses a well-formed reply (blocks key)", () => {
    const r = parseNewsDraftReply(
      JSON.stringify({
        title: "제목",
        subhead: "부제",
        blocks: [
          { type: "lead", text: "리드" },
          { type: "stats", items: [{ n: "48", l: "CONTESTANTS" }] },
        ],
      }),
    );
    expect(r.title).toBe("제목");
    expect(r.body).toHaveLength(2);
  });

  it("strips prose around the JSON object", () => {
    const r = parseNewsDraftReply(
      'Here is your article:\n{ "title": "T", "subhead": "S", "blocks": [{"type":"closer","text":"c"}] }\nThanks!',
    );
    expect(r.title).toBe("T");
  });

  it("throws on missing title", () => {
    expect(() =>
      parseNewsDraftReply(JSON.stringify({ subhead: "s", blocks: [{ type: "lead", text: "x" }] })),
    ).toThrow(NewsDraftParseError);
  });

  it("throws on empty/invalid blocks", () => {
    expect(() =>
      parseNewsDraftReply(JSON.stringify({ title: "t", subhead: "s", blocks: [] })),
    ).toThrow(NewsDraftParseError);
  });

  it("throws on unparseable text", () => {
    expect(() => parseNewsDraftReply("not json at all")).toThrow(NewsDraftParseError);
  });
});

describe("triggers can only draft (AC 1)", () => {
  function fake(prompt: string): string {
    if (/번역/.test(prompt) && /\((en|es)\)/.test(prompt)) {
      const l = prompt.includes("(en)") ? "en" : "es";
      return JSON.stringify({ title: `T-${l}`, subhead: `S-${l}`, body: [{ type: "lead", text: `l-${l}` }] });
    }
    return JSON.stringify({
      title: "Champion 확정",
      subhead: "팬들이 골랐다",
      blocks: [{ type: "lead", text: "결과가 나왔다." }],
    });
  }
  for (const origin of ["event_open", "event_champion", "cron_weekly"] as const) {
    it(`${origin} 경로 산출물은 draft (published 불가)`, async () => {
      const doc = await assembleLocalizedDraft(
        {
          slug: "20260722-zzz999",
          template: origin === "cron_weekly" ? "weekly" : origin === "event_open" ? "open" : "result",
          origin,
          sourceLang: "ko",
          prompt: "draft prompt",
          evidence: { asOf: "now", stats: [] },
          tournamentId: origin === "cron_weekly" ? undefined : "t1",
        },
        { createMessage: vi.fn(fake) },
      );
      expect(doc.status).toBe("draft");
      expect(doc.publishedAt).toBeNull();
      expect(doc.origin).toBe(origin);
    });
  }
});
