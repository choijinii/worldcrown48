/**
 * ND-1 §3 #5 — translateArticleCore: Option A 복제 (언어별 개별 호출 + 실패 언어만
 * 원문 fallback + logError). AC 8.
 *
 * Same resilience contract as translateTournamentMetaCore, extended to the block
 * body: ONE call per target language, each returning the full article (title +
 * subhead + body). A per-language failure/parse-error/structural-mismatch falls
 * that WHOLE language back to the source AND logs — a working language is never
 * lost to a sibling's failure (the prod es-slot regression this pattern guards).
 */
import { describe, expect, it, vi } from "vitest";
import {
  translateArticleCore,
  buildArticleTranslatePrompt,
  type ArticleBlock,
} from "../core/translateArticleCore";
import {
  TRANSLATION_GLOSSARY,
  UNTRANSLATABLE_PROPER_NOUNS,
} from "../core/displayTerms";

function targetOf(prompt: string): string {
  return ["ko", "en", "es"].find((l) => prompt.includes(`(${l})`)) ?? "??";
}

const sourceBody: ArticleBlock[] = [
  { type: "lead", text: "리드 문장" },
  { type: "stats", items: [{ n: "48", l: "CONTESTANTS" }] },
  { type: "closer", text: "클로저" },
];

// A faithful fake: returns the SAME structure with text fields translated per lang,
// stats.n + matchup proper nouns preserved.
function fakeFor(prompt: string): string {
  const l = targetOf(prompt);
  const body: ArticleBlock[] = [
    { type: "lead", text: `lead-${l}` },
    { type: "stats", items: [{ n: "48", l: `CONTESTANTS-${l}` }] },
    { type: "closer", text: `closer-${l}` },
  ];
  return JSON.stringify({ title: `T-${l}`, subhead: `S-${l}`, body });
}

const base = {
  title: "여름 차트",
  subhead: "48곡이 한 무대에",
  body: sourceBody,
  sourceLang: "ko" as const,
};

/**
 * 번역 층 용어집 (2026-08-08 대표 결정 B). newsPrompts를 고쳐도 여기가 비어 있으면
 * 지칭이 번역 과정에서 흐른다 — 실측: ko "팬"이 es 에서 "aficionados"로 번역됐다.
 * 표시 용어는 소스 언어에서만 정해지는 게 아니라 번역문에서도 고정돼야 한다.
 */
describe("buildArticleTranslatePrompt — 용어집 박제", () => {
  const body: ArticleBlock[] = [{ type: "lead", text: "팬들의 선택" }];
  const input = { title: "제목", subhead: "부제", body, sourceLang: "ko" as const };

  for (const target of ["en", "es"] as const) {
    it(`${target} 프롬프트가 용어집을 담는다`, () => {
      const p = buildArticleTranslatePrompt(input, target);
      expect(p).toContain(TRANSLATION_GLOSSARY);
    });

    it(`${target} 프롬프트가 번역 불가 고유명사를 전부 나열한다`, () => {
      const p = buildArticleTranslatePrompt(input, target);
      for (const noun of UNTRANSLATABLE_PROPER_NOUNS) expect(p).toContain(noun);
    });
  }

  it("지칭을 fan(s)으로 고정하고 대체어를 반례로 금지한다", () => {
    const p = buildArticleTranslatePrompt(input, "es");
    expect(p).toContain('"팬"');
    expect(p).toContain("fan(s)");
    // 실측된 오역들 — 반례로 박아두지 않으면 모델이 자연스러운 쪽으로 흐른다.
    expect(p).toContain("aficionado");
    expect(p).toContain("votante");
    expect(p).toContain("voter");
  });

  it("원문에 Voter가 있어도 번역문에 쓰지 않도록 지시한다", () => {
    const p = buildArticleTranslatePrompt(input, "en");
    expect(p).toContain('"Voter"');
  });

  it("기존 계약(구조 유지·수치/고유명사 원문)을 깨지 않는다", () => {
    const p = buildArticleTranslatePrompt(input, "es");
    expect(p).toContain("블록 구조(type·순서·개수)를 그대로 유지");
    expect(p).toContain("수치(stats.n)와 고유명사(matchups group/title)는 원문 데이터 그대로");
    expect(p).toContain("JSON 외 텍스트 금지");
  });
});

describe("translateArticleCore (Option A — per-language, block-aware)", () => {
  it("keeps source in the source slot, fills both other languages", async () => {
    const r = await translateArticleCore(base, {
      createMessage: vi.fn(async (p: string) => fakeFor(p)),
    });
    expect(r.title.ko).toBe("여름 차트");
    expect(r.title.en).toBe("T-en");
    expect(r.title.es).toBe("T-es");
    expect(r.subhead.es).toBe("S-es");
    expect(r.body.ko).toEqual(sourceBody); // untouched original
    expect((r.body.en[0] as { text: string }).text).toBe("lead-en");
    expect((r.body.es[2] as { text: string }).text).toBe("closer-es");
  });

  it("makes exactly one call per TARGET (2 for ko source), never for source", async () => {
    const createMessage = vi.fn(async (p: string) => fakeFor(p));
    await translateArticleCore(base, { createMessage });
    expect(createMessage).toHaveBeenCalledTimes(2);
    expect(createMessage.mock.calls.map((c) => targetOf(c[0])).sort()).toEqual([
      "en",
      "es",
    ]);
  });

  it("es call rejects → es WHOLE article falls back to source (logged), en intact", async () => {
    const createMessage = vi.fn(async (p: string) => {
      if (targetOf(p) === "es") throw new Error("timeout");
      return fakeFor(p);
    });
    const logError = vi.fn();
    const r = await translateArticleCore(base, { createMessage, logError });
    expect(r.title.en).toBe("T-en");
    expect(r.title.es).toBe("여름 차트"); // source fallback
    expect(r.body.es).toEqual(sourceBody);
    expect(logError).toHaveBeenCalled();
  });

  it("es reply unparseable → fallback + log, en intact", async () => {
    const createMessage = vi.fn(async (p: string) =>
      targetOf(p) === "es" ? "no json here" : fakeFor(p),
    );
    const logError = vi.fn();
    const r = await translateArticleCore(base, { createMessage, logError });
    expect(r.title.en).toBe("T-en");
    expect(r.title.es).toBe("여름 차트");
    expect(logError).toHaveBeenCalled();
  });

  it("structural mismatch (block count differs) → fallback + log", async () => {
    const createMessage = vi.fn(async (p: string) => {
      if (targetOf(p) === "es") {
        return JSON.stringify({
          title: "T-es",
          subhead: "S-es",
          body: [{ type: "lead", text: "only one" }], // wrong length
        });
      }
      return fakeFor(p);
    });
    const logError = vi.fn();
    const r = await translateArticleCore(base, { createMessage, logError });
    expect(r.body.es).toEqual(sourceBody); // rejected → source
    expect(r.body.en).toHaveLength(3);
    expect(logError).toHaveBeenCalled();
  });

  it("block type reordering (type mismatch at index) → fallback + log", async () => {
    const createMessage = vi.fn(async (p: string) => {
      if (targetOf(p) === "en") {
        return JSON.stringify({
          title: "T-en",
          subhead: "S-en",
          body: [
            { type: "closer", text: "swapped" }, // index 0 should be lead
            { type: "stats", items: [{ n: "48", l: "C" }] },
            { type: "lead", text: "x" },
          ],
        });
      }
      return fakeFor(p);
    });
    const logError = vi.fn();
    const r = await translateArticleCore(base, { createMessage, logError });
    expect(r.body.en).toEqual(sourceBody);
    expect(logError).toHaveBeenCalled();
  });

  it("empty title in reply → fallback + log", async () => {
    const createMessage = vi.fn(async (p: string) =>
      targetOf(p) === "es"
        ? JSON.stringify({ title: "", subhead: "S", body: sourceBody })
        : fakeFor(p),
    );
    const logError = vi.fn();
    const r = await translateArticleCore(base, { createMessage, logError });
    expect(r.title.es).toBe("여름 차트");
    expect(logError).toHaveBeenCalled();
  });

  it("throws on empty source title (contract guard)", async () => {
    await expect(
      translateArticleCore(
        { ...base, title: "  " },
        { createMessage: vi.fn(async () => "") },
      ),
    ).rejects.toThrow();
  });
});
