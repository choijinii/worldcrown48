/**
 * PRESS-1 PR 1 · 3-2 — TIO 응답 읽기: 검색 결과 주소 모으기 · 3언어 JSON 읽기 · 지어낸 주소 버리기.
 */
import { describe, expect, it } from "vitest";
import {
  PressReplyError,
  collectSearchResults,
  filterSources,
  parsePressReply,
  replyText,
  usageOf,
} from "../core/pressReply";

const lang = (t: string) => ({
  title: `${t} 제목`,
  subhead: `${t} 부제`,
  blocks: [
    { type: "lead", text: `${t} 훅` },
    { type: "paragraph", text: `${t} 사실` },
    { type: "closer", text: `${t} 끝 한 줄` },
  ],
});

const good = {
  ko: lang("ko"),
  en: lang("en"),
  es: lang("es"),
  sources: [{ outlet: "Billboard", title: "Hot 100", url: "https://www.billboard.com/a" }],
  photoKeyword: "chart",
};

describe("collectSearchResults", () => {
  it("web_search_tool_result 블록의 주소 → 제목 (오류 블록 · 다른 블록은 무시)", () => {
    const content = [
      { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "q" } },
      {
        type: "web_search_tool_result",
        tool_use_id: "s1",
        content: [
          { type: "web_search_result", url: "https://www.billboard.com/a", title: "Hot 100", page_age: "1 day" },
          { type: "web_search_result", url: "https://kpopnews.com/b/", title: "B" },
        ],
      },
      { type: "web_search_tool_result", tool_use_id: "s2", content: { type: "web_search_tool_result_error", error_code: "max_uses_exceeded" } },
      { type: "text", text: "x" },
    ];
    const m = collectSearchResults(content);
    expect([...m.keys()]).toEqual(["https://www.billboard.com/a", "https://kpopnews.com/b"]);
    expect(m.get("https://www.billboard.com/a")).toBe("Hot 100");
  });
});

describe("replyText", () => {
  it("인용 때문에 여러 text 블록으로 나뉜 글을 순서대로 잇는다", () => {
    expect(replyText([{ type: "text", text: '{"a":' }, { type: "server_tool_use" }, { type: "text", text: "1}" }])).toBe('{"a":1}');
  });
});

describe("usageOf", () => {
  it("usage 의 읽기 · 쓰기 토큰 · 검색 횟수를 읽는다", () => {
    expect(
      usageOf({ input_tokens: 10, output_tokens: 20, server_tool_use: { web_search_requests: 3 } }),
    ).toEqual({ inputTokens: 10, outputTokens: 20, searches: 3 });
  });
  it("usage 가 없으면 undefined(모름)", () => {
    expect(usageOf(undefined)).toBeUndefined();
  });
});

describe("parsePressReply", () => {
  it("3언어 · 출처 · 키워드를 읽는다(JSON 앞뒤 글은 무시)", () => {
    const r = parsePressReply(`여기 있습니다\n${JSON.stringify(good)}\n끝`);
    expect(r.title).toEqual({ ko: "ko 제목", en: "en 제목", es: "es 제목" });
    expect(r.body.es[2]).toEqual({ type: "closer", text: "es 끝 한 줄" });
    expect(r.sources).toEqual(good.sources);
    expect(r.photoKeyword).toBe("chart");
  });

  it("JSON 이 아니면 · 한 언어라도 비면 · 뼈대(훅 → 사실 → 끝 한 줄)가 아니면 PressReplyError", () => {
    const bad = [
      "글만 있음",
      JSON.stringify({ ...good, en: { ...good.en, title: "" } }),
      JSON.stringify({ ...good, es: undefined }),
      JSON.stringify({ ...good, ko: { ...good.ko, blocks: [{ type: "paragraph", text: "x" }] } }),
      JSON.stringify({ ...good, ko: { ...good.ko, blocks: [{ type: "lead", text: "x" }, { type: "stats", items: [{ n: "1", l: "x" }] }, { type: "closer", text: "y" }] } }),
    ];
    for (const b of bad) expect(() => parsePressReply(b)).toThrow(PressReplyError);
  });

  it("sources 가 배열이 아니면 빈 목록으로 읽는다(서버가 다시 거른다)", () => {
    expect(parsePressReply(JSON.stringify({ ...good, sources: "x" })).sources).toEqual([]);
  });
});

describe("filterSources", () => {
  const allowed = new Map([
    ["https://www.billboard.com/a", "Hot 100 (검색 제목)"],
    ["https://kpopnews.com/b", "B"],
  ]);

  it("검색 결과에 없는 주소는 버린다(지어낸 주소 금지)", () => {
    const out = filterSources(
      [
        { outlet: "Billboard", title: "Hot 100", url: "https://www.billboard.com/a" },
        { outlet: "Fake", title: "가짜", url: "https://made-up.com/x" },
      ],
      allowed,
      "2026-11-27",
    );
    expect(out).toEqual([{ outlet: "Billboard", title: "Hot 100", url: "https://www.billboard.com/a", readAt: "2026-11-27" }]);
  });

  it("끝 / · # 차이는 같은 주소로 보고, 같은 주소는 한 번만", () => {
    const out = filterSources(
      [
        { outlet: "K", title: "B", url: "https://kpopnews.com/b/" },
        { outlet: "K", title: "B", url: "https://kpopnews.com/b#top" },
      ],
      allowed,
      "2026-11-27",
    );
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe("https://kpopnews.com/b");
  });

  it("제목이 비면 검색 결과 제목 · 매체가 비면 주소의 도메인", () => {
    const out = filterSources([{ outlet: "", title: "", url: "https://www.billboard.com/a" }], allowed, "2026-11-27");
    expect(out[0]).toEqual({ outlet: "billboard.com", title: "Hot 100 (검색 제목)", url: "https://www.billboard.com/a", readAt: "2026-11-27" });
  });

  it("http(s) 가 아닌 값 · 모양이 틀린 줄은 버린다", () => {
    expect(filterSources([null, { url: 5 }, { url: "javascript:x" }] as unknown[], allowed, "2026-11-27")).toEqual([]);
  });
});
