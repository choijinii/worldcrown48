/**
 * 불변 원칙 #5 — "FIFA"·"Official" 표기 금지 (CLAUDE.md · 대표 재확인 2026-10-05 POLICY-ES-1).
 *
 * 잡으려는 사고: 정책 문서(ko·en)의 면책 문구에 "FIFA®·IOC·올림픽®"이 들어 있었고, 스페인어판을
 * 만들면서 같은 글자가 세 번째 언어로 번질 뻔했다. 화면 코드에도 iframe 제목 "Official video
 * embed"가 남아 있었다(화면 낭독기가 읽는 이름).
 *
 * 범위: content/ 의 정책 문서 전부 + app·components·lib 의 화면 문자열.
 * 코드 주석의 "FIFA 금지" 경고문은 대상이 아니다 — 주석을 걷어낸 뒤 검사한다.
 * 축구 예시 금지(원장 D-07 — 축구 컨셉 폐기 · 대표 2026-10-05): "(축구·K-pop 등)" 같은 예시가
 * 동의 창·쿠키 정책·개인정보처리방침에 남아 있었다. 축구·football·fútbol·soccer 를 막는다.
 * "Official"은 표기(대문자로 시작하는 낱말)를 막는다. 소문자 일반 낱말 "official"(예: "any official
 * organization")은 대표 승인 문장에 쓰이므로 허용.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

function walk(dir: string, exts: RegExp, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, exts, out);
    else if (exts.test(name)) out.push(full);
  }
  return out;
}
const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join("/");

/** 블록 주석(/* *\/ · JSX {/* *\/}) · 줄 주석(// …)을 걷어낸다. URL 의 "://" 는 남긴다. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const BANNED = /FIFA|\bOfficial\b/;

describe("FIFA · Official 표기 금지", () => {
  it("정책 문서(content/**.md)에 FIFA · Official · IOC · 올림픽이 없다", () => {
    const hits = walk(path.join(ROOT, "content"), /\.md$/, [])
      .flatMap((f) =>
        readFileSync(f, "utf8")
          .split("\n")
          .map((line, i) => ({ f: rel(f), i: i + 1, line }))
          .filter(({ line }) => /FIFA|\bOfficial\b|\bIOC\b|\bCOI\b|올림픽|Olympic|Olímpic/.test(line)),
      )
      .map(({ f, i, line }) => `${f}:${i}: ${line.trim()}`);
    expect(hits).toEqual([]);
  });

  it("화면 코드(app · components · lib 의 .ts/.tsx — 주석 제외)에 FIFA · Official 이 없다", () => {
    const hits = ["app", "components", "lib"]
      .flatMap((d) => walk(path.join(ROOT, d), /\.(ts|tsx)$/, []))
      .flatMap((f) =>
        stripComments(readFileSync(f, "utf8"))
          .split("\n")
          .map((line, i) => ({ f: rel(f), i: i + 1, line }))
          .filter(({ line }) => BANNED.test(line)),
      )
      .map(({ f, line }) => `${f}: ${line.trim()}`);
    expect(hits).toEqual([]);
  });

  it("주석 걷어내기는 경고문만 지우고 문자열은 남긴다 (검사기 자체 확인)", () => {
    expect(stripComments('// FIFA 금지\nconst a = "x";')).not.toMatch(/FIFA/);
    expect(stripComments("/* NO FIFA */ const b = 1;")).not.toMatch(/FIFA/);
    expect(stripComments('const t = "Official video";')).toMatch(/Official/);
    expect(stripComments('const u = "https://example.com"; // FIFA')).toContain("https://example.com");
  });
});

const FOOTBALL = /축구|football|fútbol|futbol|soccer/i;

describe("축구 예시 금지 (원장 D-07)", () => {
  it("정책 문서(content/**.md)에 축구·football·fútbol·soccer 가 없다", () => {
    const hits = walk(path.join(ROOT, "content"), /\.md$/, [])
      .flatMap((f) =>
        readFileSync(f, "utf8")
          .split("\n")
          .map((line, i) => ({ f: rel(f), i: i + 1, line }))
          .filter(({ line }) => FOOTBALL.test(line)),
      )
      .map(({ f, i, line }) => `${f}:${i}: ${line.trim()}`);
    expect(hits).toEqual([]);
  });

  it("화면 코드(app · components · lib — 주석 제외)에 축구·football·fútbol·soccer 가 없다", () => {
    const hits = ["app", "components", "lib"]
      .flatMap((d) => walk(path.join(ROOT, d), /\.(ts|tsx)$/, []))
      .flatMap((f) =>
        stripComments(readFileSync(f, "utf8"))
          .split("\n")
          .map((line) => ({ f: rel(f), line }))
          .filter(({ line }) => FOOTBALL.test(line)),
      )
      .map(({ f, line }) => `${f}: ${line.trim()}`);
    expect(hits).toEqual([]);
  });
});
