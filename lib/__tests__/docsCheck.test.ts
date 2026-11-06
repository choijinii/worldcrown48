// 문서 검사(scripts/check-docs.lib.mjs) 로직 시험 — 가드가 조용히 고장 나면 초록도 뜻이 없다.
import { describe, expect, it } from "vitest";
import {
  addedLines,
  extractPaths,
  findForbidden,
  ledgerPrinciple,
  missingPaths,
  staleChecks,
} from "../../scripts/check-docs.lib.mjs";

const PRINCIPLE = "런칭 후 언론사 등록 전까지는, 막지 않는다. 적극 수렴한다.";
const LEDGER = [
  "## D-76 · 무대",
  '- **정의** — **"다른 문장"**',
  "## D-77 · 이미지 엔트리",
  "- **무엇** — 무엇",
  `- **정의** — *원칙 문장*: **"${PRINCIPLE}"** 법적인 문제는…`,
  "## D-83 · 창구",
].join("\n");

const claude = (row6: string, launch: string[]) =>
  ["## 🔒 불변 원칙", `| 6 | 이미지 소싱 | ${row6} |`, "", "## 🚀 런칭 목표일과 런칭 전 순서", ...launch, "## 🚀 MVP"].join("\n");

const GOOD_LAUNCH = [
  "- **런칭 = 2026-11-26(목)** — 원래 목표 10/08은 '49일 밀림'으로 남긴다",
  "- **런칭 전 작업 순서**: ARENA-2(✅) → IMAGE-1 PR 1 · 2 · 3 → 크라운 카드",
  "- 그 뒤 카테고리의 날짜는 11/26 런칭 기준",
];

describe("addedLines", () => {
  it("diff 의 + 줄만 파일 이름과 함께 모은다 (+++ 머리·- 줄 제외)", () => {
    const diff = "+++ b/CLAUDE.md\n@@ -1 +1 @@\n-옛 줄\n+새 줄\n+++ b/LANGUAGE.md\n+둘째";
    expect(addedLines(diff)).toEqual([
      { file: "CLAUDE.md", text: "새 줄" },
      { file: "LANGUAGE.md", text: "둘째" },
    ]);
  });
});

describe("findForbidden", () => {
  const f = (text: string) => findForbidden([{ file: "CLAUDE.md", text }]).map((h) => h.word);
  it("금지 낱말을 잡는다", () => {
    expect(f("FIFA 표준")).toEqual(["FIFA"]);
    expect(f("참가자 48명")).toEqual(["참가자"]);
    expect(f("투표 화면")).toEqual(["투표"]);
    expect(f("Vote Now")).toEqual(["Vote"]);
    expect(f("1일 5표")).toEqual(["표(단위)"]);
    expect(f("팀 경로로 채운다")).toEqual(["팀 경로"]);
    expect(f("월드컵 방식")).toEqual(["월드컵"]);
  });
  it("Voter · 표(table) · 예외 구절은 통과", () => {
    expect(f("Voter 흐름 · 도메인 표 · 순서표")).toEqual([]);
    expect(f("이상형 월드컵 방식")).toEqual([]);
    expect(f("코드 밖에서 '팀 경로'라 부르지 않는다")).toEqual([]);
    expect(f("| 팀 경로(코드 이름) | 팀 AI 지시문 |")).toEqual([]);
  });
});

describe("extractPaths · missingPaths", () => {
  it("marketing/ · docs/ · lib/ 경로만, 끝 문장부호와 자리표시는 뺀다", () => {
    const text = "정본 `marketing/a.md` · docs/b/. 그리고 lib/c.ts) 와 lib/… 와 app/d.ts";
    expect(extractPaths(text).sort()).toEqual(["docs/b/", "lib/c.ts", "marketing/a.md"]);
  });
  it("확장자 없는 모듈 경로는 .tsx 등으로 찾고, allowlist 는 건너뛴다", () => {
    const files = new Set(["components/x.tsx", "lib/y.tsx"]);
    const exists = (p: string) => files.has(p);
    expect(missingPaths(["lib/y", "lib/z.ts", "lib/old.ts"], exists, ["lib/old.ts"])).toEqual(["lib/z.ts"]);
  });
});

describe("ledgerPrinciple", () => {
  it("D-77 정의 줄의 굵은 따옴표 안 문장 (다른 D 번호 것은 아님)", () => {
    expect(ledgerPrinciple(LEDGER)).toBe(PRINCIPLE);
  });
});

describe("staleChecks", () => {
  it("모두 맞으면 빈 배열", () => {
    const row6 = `이미지 엔트리 원칙(원장 D-77): ${PRINCIPLE} ~~Level 1 자동허용(CC)~~`;
    expect(staleChecks(claude(row6, GOOD_LAUNCH), LEDGER)).toEqual([]);
  });
  it("옛 문서(main f3170b8 모양)는 ①~⑤ 전부 실패", () => {
    const fails = staleChecks(
      claude("Level 1 자동허용(CC) / Level 2 수동승인(SNS)", [
        "- **런칭 목표일 = 2026-10-08(목)**",
        "- **런칭 전 작업 순서**: ARENA-2 → 크라운 카드",
        "- 그 뒤 카테고리의 날짜는 10/8 런칭 기준",
      ]),
      LEDGER,
    );
    expect(fails.map((s) => s[0])).toEqual(["①", "②", "③", "④", "⑤", "⑤"]);
  });
  it("원칙 문장이 한 글자라도 다르면 ①", () => {
    const row6 = PRINCIPLE.replace("적극", "즉시");
    expect(staleChecks(claude(row6, GOOD_LAUNCH), LEDGER)).toEqual([
      "① 불변 원칙 6행에 원장 D-77 원칙 문장이 글자 그대로 없음",
    ]);
  });
});
