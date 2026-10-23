/**
 * 시험 대회 표시 누락 방지 (OPS-FIX-1 · 원장 D-66 ④).
 *
 * 미리보기와 실서비스가 같은 Firebase 프로젝트를 쓴다. 시험이 심은 "진행 중" 대회는
 * `e2e: true` 표시가 있어야 실서비스 목록(isPublicTournament)에서 빠진다. 표시를 잊은 시험
 * 파일이 생기면 팬 화면에 가짜 대회가 다시 뜬다 — 사람이 기억하는 대신 이 시험이 막는다
 * (e2eWiring.test.ts 와 같은 방식).
 *
 * 판정은 일부러 단순하다. 아래 둘 중 하나라도 하는 e2e 파일은 표시 도우미 `e2eMark(` 또는
 * 글자 그대로 `e2e: true` 가 있어야 한다:
 *   1. firebase-admin 으로 `tournaments` 컬렉션에 손댄다 (심기 · 읽기 · 지우기 모두 — 손대는
 *      파일이면 심는 파일일 가능성이 높고, 넓게 잡아도 비용은 한 줄이다)
 *   2. Lab 화면에서 발행 버튼을 누른다 — 화면으로 만든 대회도 실서비스에 뜬다(b1-admin-lab)
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const E2E_DIR = path.join(ROOT, "e2e");

const TOUCHES_TOURNAMENTS = /collection\(\s*["'`]tournaments["'`]\s*\)|["'`]tournaments\//;
const PUBLISHES_IN_LAB = /publish\w*\.click\(|토너먼트 생성/;
const HAS_MARK = /e2eMark\(|e2e:\s*true/;

/**
 * 대회를 심지 않고 지우기만 하는 파일 — **이유를 반드시 함께 적는다.**
 */
const NOT_A_SEEDER: Record<string, string> = {
  "global-teardown.ts": "표시(e2e == true)가 붙은 오래된 시험 대회를 지우기만 한다 — 심지 않는다 (OPS-FIX-1)",
};

function needsMark(text: string): boolean {
  return TOUCHES_TOURNAMENTS.test(text) || PUBLISHES_IN_LAB.test(text);
}

function e2eFiles(): { file: string; text: string }[] {
  return readdirSync(E2E_DIR)
    .filter((f) => f.endsWith(".ts"))
    .sort()
    .map((file) => ({ file, text: readFileSync(path.join(E2E_DIR, file), "utf8") }));
}

describe("e2e 시험 대회 표시 — tournaments 에 쓰는 시험은 e2e: true 를 붙인다", () => {
  it("판정 규칙 자체 (심기 · 경로 문자열 · 화면 발행 · 무관한 파일)", () => {
    expect(needsMark(`db.collection("tournaments").doc(TID).set({})`)).toBe(true);
    expect(needsMark("await d.doc(`tournaments/${TID}`).delete();")).toBe(true);
    expect(needsMark("await publish.click();")).toBe(true);
    expect(needsMark(`await page.goto("/news");`)).toBe(false);
  });

  it("검사 대상 파일이 실제로 잡힌다 (경로가 틀려 빈 목록으로 초록이 되지 않게)", () => {
    const targets = e2eFiles().filter((f) => needsMark(f.text)).map((f) => f.file);
    // 2026-10-24 기준 9개: arena1 · b1 · c1 · c2 · c2-mobile · c3 · hf3 · run1 · thumb1-pitch
    expect(targets.length).toBeGreaterThanOrEqual(9);
    expect(targets).toContain("b1-admin-lab.spec.ts");
    expect(targets).toContain("thumb1-pitch.spec.ts");
  });

  it("대상 파일은 전부 e2eMark( 또는 e2e: true 가 있다", () => {
    const missing = e2eFiles()
      .filter((f) => !(f.file in NOT_A_SEEDER) && needsMark(f.text) && !HAS_MARK.test(f.text))
      .map((f) => f.file);
    expect(missing, "시험 대회 표시(e2e: true)가 없는 e2e 파일").toEqual([]);
  });

  it("예외 목록의 항목은 실제 파일이고 이유가 적혀 있다 (낡은 예외가 남지 않게)", () => {
    const files = new Set(e2eFiles().map((f) => f.file));
    for (const [file, reason] of Object.entries(NOT_A_SEEDER)) {
      expect(files.has(file), `예외 목록의 ${file} 이 e2e/ 에 없다`).toBe(true);
      expect(reason.trim().length).toBeGreaterThan(0);
    }
  });
});
