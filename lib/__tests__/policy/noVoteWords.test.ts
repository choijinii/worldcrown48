/**
 * 원장 D-03 — "월크48은 투표가 아니다" (POLICY-YT-1 부록 B · 대표 승인 2026-10-10).
 *
 * 잡으려는 사고: 정책 문서 4종 × 3언어에 투표·vote·Voter·votación 이 ko 25 · en 25 · es 21곳 남아 있었다.
 * 화면 낱말은 "선택"(Voter = 팬/Fan)으로 바뀐 지 오래인데 정책 문서만 옛 낱말이었다.
 *
 * R2: "투표"를 지우다 "표"만 남기면 안 된다 — "표" 낱말 자체가 금지어(CLAUDE.md 참가 규칙).
 * ko 문서의 "표"가 든 낱말은 아래 허용 목록(표시·표기·표준·상표…)으로만 시작해야 한다.
 * 같은 방식: noFifaOfficial.test.ts.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const CONTENT = path.join(ROOT, "content");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".md")) out.push(full);
  }
  return out;
}
const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join("/");

function hits(re: RegExp, files: string[]): string[] {
  return files.flatMap((f) =>
    readFileSync(f, "utf8")
      .split("\n")
      .map((line, i) => ({ f: rel(f), i: i + 1, line }))
      .filter(({ line }) => re.test(line))
      .map(({ f, i, line }) => `${f}:${i}: ${line.trim()}`),
  );
}

/** 투표 · vote/voting/voted/votes · Voter · votación/votar/voto/vota/votan… */
const VOTE = /투표|\bvot(e|es|ed|ing|er|ers)\b|\bvot(ación|aciones|ar|o|os|a|an|e|en)\b/i;

/** ko 문서에 남아도 되는 "표" 낱말의 앞머리 — 투표·득표·"표" 단독은 여기에 없다. */
const ALLOWED_PYO = ["대표", "상표", "재표시", "표기", "표시", "표장", "표적", "표준", "표현"];

describe("투표 계열 낱말 금지 (원장 D-03)", () => {
  const files = walk(CONTENT);

  it("정책 문서 12개를 모두 읽는다", () => {
    expect(files.length).toBe(12);
  });

  it("content/**.md 에 투표 · vote · Voter · votación 계열이 0개", () => {
    expect(hits(VOTE, files)).toEqual([]);
  });

  it("ko 문서의 '표' 낱말은 허용 목록뿐 — '표'가 새로 생기지 않았다 (R2)", () => {
    const words = files
      .filter((f) => rel(f).startsWith("content/ko/"))
      .flatMap((f) => readFileSync(f, "utf8").match(/[가-힣]*표[가-힣]*/g) ?? []);
    const bad = words.filter((w) => !ALLOWED_PYO.some((p) => w.startsWith(p)));
    expect(bad).toEqual([]);
  });

  it("커뮤니티 §2.1 의 '시안 모달 4 카테고리' 문장(en 은 뜻이 틀린 번역)이 없다", () => {
    expect(hits(/시안 모달|cookie-consent categories|ventana modal del borrador/, files)).toEqual([]);
  });

  it("검사기 자체 확인 — 잡을 것은 잡고 비슷한 낱말은 통과", () => {
    for (const s of ["투표 기록", "Voting history", "cast votes", "Voter", "votación", "votar", "con su voto", "ni votar"]) {
      expect(s).toMatch(VOTE);
    }
    for (const s of ["devoted", "pivot", "votre", "선택 기록", "Pick history"]) {
      expect(s).not.toMatch(VOTE);
    }
  });
});
