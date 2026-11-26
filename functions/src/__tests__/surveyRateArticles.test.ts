/**
 * survey-rate-articles — 옛 rate · 퍼센트 숫자가 남은 기사를 찾는 읽기 전용 조사(T5 PR 2 · Task 12).
 *
 * 걸리는 조건(대표 2026-11-25 · 보고만, 고치거나 지우지 않는다):
 *   ① evidence.stats 라벨이 /RATE|MOMENTUM/ 이거나 값에 "%"
 *   ② 본문 블록(언어마다)의 stats 항목 값(n)이나 라벨(l)에 "%"
 * 실서비스에 대고 돌리는 도구라 쓰기 호출이 소스에 한 줄이라도 있으면 막는다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  judgeArticle,
  fmtKstDate,
  surveyRows,
  renderMarkdown,
} from "../../scripts/survey-rate-articles.lib.mjs";

const base = () => ({
  title: { ko: "제목", en: "Title", es: "Título" },
  status: "published",
  evidence: { asOf: "2026-11-01", stats: [{ label: "CONTESTANTS", value: "48" }] },
  body: {
    ko: [{ type: "stats", items: [{ n: "48", l: "CONTESTANTS" }] }],
    en: [{ type: "paragraph", text: "60% of fans" }],
    es: [],
  },
});

describe("judgeArticle", () => {
  it("깨끗한 기사는 걸린 칸 0", () => {
    expect(judgeArticle(base())).toEqual([]);
  });

  it("문단 글 속 %는 조건 밖이다(stats 항목만 본다)", () => {
    expect(judgeArticle(base())).toEqual([]);
  });

  it("① evidence 라벨 TOP RATE · TOP MOMENTUM · RUNNER-UP RATE", () => {
    const a = base();
    a.evidence.stats.push({ label: "TOP RATE", value: "31" });
    a.evidence.stats.push({ label: "top momentum", value: "+3" });
    a.evidence.stats.push({ label: "RUNNER-UP RATE", value: "20" });
    expect(judgeArticle(a)).toEqual([
      "evidence.stats[1] TOP RATE",
      "evidence.stats[2] top momentum",
      "evidence.stats[3] RUNNER-UP RATE",
    ]);
  });

  it("① evidence 값에 %", () => {
    const a = base();
    a.evidence.stats.push({ label: "SHARE", value: "42%" });
    expect(judgeArticle(a)).toEqual(["evidence.stats[1] SHARE=42%"]);
  });

  it("② 본문 stats 항목 값이나 라벨에 % — 언어마다 따로 적는다", () => {
    const a = base();
    a.body.ko.push({ type: "stats", items: [{ n: "31%", l: "TOP RATE" }] });
    a.body.es = [{ type: "stats", items: [{ n: "7", l: "% votos" }] }];
    expect(judgeArticle(a)).toEqual(["body.ko[1].items[0] TOP RATE=31%", "body.es[0].items[0] % votos=7"]);
  });

  it("모양이 깨진 문서도 멈추지 않는다", () => {
    expect(judgeArticle({})).toEqual([]);
    expect(judgeArticle({ evidence: null, body: { ko: null, en: "x" } })).toEqual([]);
    expect(judgeArticle({ evidence: { stats: [null, { label: 3, value: 5 }] } })).toEqual([]);
  });
});

describe("fmtKstDate", () => {
  it("Timestamp 모양 · Date · 없음", () => {
    expect(fmtKstDate({ toMillis: () => Date.UTC(2026, 10, 25, 16, 30) })).toBe("2026-11-26 01:30");
    expect(fmtKstDate(new Date(Date.UTC(2026, 0, 1, 0, 0)))).toBe("2026-01-01 09:00");
    expect(fmtKstDate(null)).toBe("—");
  });
});

describe("surveyRows · renderMarkdown", () => {
  it("걸린 기사만 만든 날짜 순으로 · 목록 글자에 금지 낱말 없음", () => {
    const hit = base();
    hit.evidence.stats.push({ label: "TOP RATE", value: "31" });
    const docs = [
      { id: "b", data: { ...hit, createdAt: new Date(Date.UTC(2026, 9, 2)) } },
      { id: "clean", data: { ...base(), createdAt: new Date(Date.UTC(2026, 9, 1)) } },
      { id: "a", data: { ...hit, status: "draft", createdAt: new Date(Date.UTC(2026, 9, 1)) } },
    ];
    const rows = surveyRows(docs);
    expect(rows.map((r: { id: string }) => r.id)).toEqual(["a", "b"]);
    expect(rows[0]).toMatchObject({ titleKo: "제목", status: "draft", created: "2026-10-01 09:00" });
    const md = renderMarkdown(rows, { project: "p", scanned: 3, at: "2026-11-26 10:00" });
    expect(md).toContain("evidence.stats[1] TOP RATE");
    expect(md).toContain("읽은 기사 3건 · 걸린 기사 2건");
    for (const w of ["표", "투표", "참가자", "후보자", "48명", "FIFA", "경기", "배틀"]) expect(md).not.toContain(w);
  });

  it("걸린 기사가 없으면 없다고 적는다", () => {
    expect(renderMarkdown([], { project: "p", scanned: 0, at: "x" })).toContain("걸린 기사 0건");
  });

  it("제목 속 | 는 목록 칸을 깨지 않게 바꾼다", () => {
    const a = base();
    a.title.ko = "A | B";
    a.evidence.stats.push({ label: "TOP RATE", value: "1" });
    const md = renderMarkdown(surveyRows([{ id: "x", data: a }]), { project: "p", scanned: 1, at: "x" });
    expect(md).toContain("A ∣ B");
  });
});

describe("읽기 전용 — 소스 글자 검사", () => {
  const FORBIDDEN = [".set(", ".update(", ".delete(", ".add(", "batch(", ".create(", "runTransaction", "bulkWriter", "recursiveDelete"];
  for (const file of ["survey-rate-articles.mjs", "survey-rate-articles.lib.mjs"]) {
    const SRC = readFileSync(join(__dirname, "../../scripts", file), "utf8");
    for (const word of FORBIDDEN) {
      it(`${file} 에 ${word} 0건`, () => {
        expect(SRC.split(word).length - 1).toBe(0);
      });
    }
  }
});
