/**
 * LAB-FIX-5 3-3 — 조건 확인 때 칸마다 웹 검색 1번(Brave · 이미지 검색과 같은 키).
 * AI 기억만으로는 놓친 칸(뷰티 묶음 레오제이 = 남성)을 검색 결과로 잡으려는 것이다.
 * 결과는 메모리에서만 쓴다(Brave 약관) — 이 모듈은 저장 · 로그를 하지 않는다.
 */
import { describe, expect, it, vi } from "vitest";
import {
  WEB_SEARCH,
  buildWebQuery,
  cleanSnippetText,
  gatherWebEvidence,
  parseBraveWeb,
  type WebSearchOutcome,
} from "../core/entryWebSearch";

describe("buildWebQuery — 이름 + 엔트리 정의(괄호 풀이는 뺀다)", () => {
  it("이름 + 정의", () => {
    expect(buildWebQuery("레오제이", "뷰티 크리에이터")).toBe("레오제이 뷰티 크리에이터");
  });
  it("정의의 괄호 풀이 '(활동명)'은 검색어에 넣지 않는다", () => {
    expect(buildWebQuery("Lisa Eldridge", "여성 뷰티 크리에이터 (활동명)")).toBe("Lisa Eldridge 여성 뷰티 크리에이터");
  });
  it("정의가 비면 이름만 · 공백 정리", () => {
    expect(buildWebQuery("  James  Charles ", "")).toBe("James Charles");
  });
  it("정의가 길면 앞 40자까지만", () => {
    const q = buildWebQuery("A", "x".repeat(80));
    expect(q).toBe(`A ${"x".repeat(WEB_SEARCH.ENTRY_WORDS_MAX)}`);
  });
});

describe("cleanSnippetText — Brave 요약의 <strong> · 글자 참조를 걷어낸다", () => {
  it("태그 제거 · &amp; &quot; &#39; &lt; &gt; &nbsp; 풀기 · 공백 한 칸", () => {
    expect(cleanSnippetText("<strong>대한민국의</strong> &amp; &quot;뷰티&quot; &#39;크리에이터&#39; &lt;x&gt;&nbsp; \n 끝", 200)).toBe(
      "대한민국의 & \"뷰티\" '크리에이터' <x> 끝",
    );
  });
  it("상한을 넘으면 자르고 … 를 붙인다", () => {
    expect(cleanSnippetText("가".repeat(30), 10)).toBe(`${"가".repeat(10)}…`);
  });
  it("문자열이 아니면 빈 글", () => {
    expect(cleanSnippetText(undefined, 10)).toBe("");
  });
});

describe("parseBraveWeb — 위 3개의 제목 · 요약만", () => {
  const json = {
    web: {
      results: [
        { title: "레오제이 - 나무위키", description: "<strong>대한민국의 메이크업 아티스트</strong> 겸 뷰티 크리에이터. 그는", url: "https://x" },
        { title: "Leo J Select Store", description: "137만 뷰티 크리에이터 레오제이" },
        { title: "", description: "" },
        { title: "세 번째", description: "c" },
        { title: "네 번째", description: "d" },
      ],
    },
  };
  it("빈 결과는 건너뛰고 앞에서 3개 · 주소는 넘기지 않는다", () => {
    const s = parseBraveWeb(json);
    expect(s).toEqual([
      { title: "레오제이 - 나무위키", description: "대한민국의 메이크업 아티스트 겸 뷰티 크리에이터. 그는" },
      { title: "Leo J Select Store", description: "137만 뷰티 크리에이터 레오제이" },
      { title: "세 번째", description: "c" },
    ]);
  });
  it("모양이 다르면 빈 목록", () => {
    expect(parseBraveWeb(null)).toEqual([]);
    expect(parseBraveWeb({ web: {} })).toEqual([]);
    expect(parseBraveWeb({ web: { results: "x" } })).toEqual([]);
  });
});

describe("gatherWebEvidence — 칸마다 1번 · 실패해도 멈추지 않는다", () => {
  const entries = [
    { slot: 0, name: "Lisa Eldridge" },
    { slot: 5, name: "레오제이" },
    { slot: 9, name: "Nobody" },
  ];
  const ok = (t: string): WebSearchOutcome => ({ kind: "ok", snippets: [{ title: t, description: `${t} 요약` }] });

  it("칸마다 이름 + 정의로 1번 · 결과는 칸 번호에 묶인다", async () => {
    const search = vi.fn(async (q: string) => ok(q));
    const r = await gatherWebEvidence(entries, "뷰티 크리에이터", search);
    expect(search).toHaveBeenCalledTimes(3);
    expect(search.mock.calls.map((c) => c[0]).sort()).toEqual(
      ["Lisa Eldridge 뷰티 크리에이터", "Nobody 뷰티 크리에이터", "레오제이 뷰티 크리에이터"].sort(),
    );
    expect(r.evidence.get(5)).toEqual([{ title: "레오제이 뷰티 크리에이터", description: "레오제이 뷰티 크리에이터 요약" }]);
    expect(r).toMatchObject({ searched: 3, failed: 0, limited: false });
  });

  it("한 칸이 오류면 그 칸만 빠진다(근거 없음) — 나머지는 그대로", async () => {
    const search = vi.fn(async (q: string): Promise<WebSearchOutcome> => (q.startsWith("Nobody") ? { kind: "error" } : ok(q)));
    const r = await gatherWebEvidence(entries, "", search);
    expect(r.evidence.has(9)).toBe(false);
    expect(r.evidence.has(0)).toBe(true);
    expect(r).toMatchObject({ searched: 2, failed: 1, limited: false });
  });

  it("결과 0개도 '검색했는데 없음'으로 남긴다(빈 목록)", async () => {
    const r = await gatherWebEvidence([{ slot: 2, name: "Ghost" }], "", async () => ({ kind: "ok", snippets: [] }));
    expect(r.evidence.get(2)).toEqual([]);
    expect(r.searched).toBe(1);
  });

  it("한도(limit)가 오면 새 검색을 더 시작하지 않는다", async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ slot: i, name: `N${i}` }));
    const search = vi.fn(async (): Promise<WebSearchOutcome> => ({ kind: "limit" }));
    const r = await gatherWebEvidence(many, "", search);
    expect(r.limited).toBe(true);
    expect(search.mock.calls.length).toBeLessThanOrEqual(WEB_SEARCH.CONCURRENCY);
    expect(r.evidence.size).toBe(0);
  });

  it("검색 함수가 던져도 실패 칸으로만 센다", async () => {
    const r = await gatherWebEvidence([{ slot: 1, name: "X" }], "", async () => {
      throw new Error("boom");
    });
    expect(r).toMatchObject({ searched: 0, failed: 1 });
  });

  it("동시에 도는 검색은 CONCURRENCY 개까지", async () => {
    let running = 0;
    let peak = 0;
    const many = Array.from({ length: 12 }, (_, i) => ({ slot: i, name: `N${i}` }));
    await gatherWebEvidence(many, "", async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return { kind: "ok", snippets: [] };
    });
    expect(peak).toBeLessThanOrEqual(WEB_SEARCH.CONCURRENCY);
    expect(peak).toBeGreaterThan(1);
  });
});
