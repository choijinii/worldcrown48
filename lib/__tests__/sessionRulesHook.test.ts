// SESSION-RULES-1 — 세션 시작·압축 때 규칙 글을 넣는 SessionStart 훅
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { readFileSync } from "node:fs";

const SCRIPT = path.resolve(__dirname, "../../.claude/hooks/session-rules.sh");

function run(env: Record<string, string> = {}) {
  return spawnSync("bash", [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

describe("session-rules.sh", () => {
  it("① 출력이 JSON 으로 파싱된다", () => {
    const r = run();
    expect(r.status).toBe(0);
    expect(() => JSON.parse(r.stdout)).not.toThrow();
  });

  it("② hookSpecificOutput.hookEventName 은 SessionStart", () => {
    const out = JSON.parse(run().stdout);
    expect(out.hookSpecificOutput.hookEventName).toBe("SessionStart");
  });

  it("③ additionalContext 에 규칙 글(Superpowers 필수)이 들어 있다", () => {
    const out = JSON.parse(run().stdout);
    expect(out.hookSpecificOutput.additionalContext).toContain("Superpowers 필수");
    expect(out.hookSpecificOutput.additionalContext).toContain("# 월크48 세션 규칙");
  });

  it("④ 최상위 additional_context 는 없다 (같은 글 두 번 방지)", () => {
    const out = JSON.parse(run().stdout);
    expect(out).not.toHaveProperty("additional_context");
    expect(Object.keys(out)).toEqual(["hookSpecificOutput"]);
  });

  it("⑥ session-rules.md = 머리 3줄 + 프로젝트 지침(정본) 두 번째 줄부터 끝까지 글자 그대로 (v1.1)", () => {
    const root = path.resolve(__dirname, "../..");
    const rules = readFileSync(path.join(root, ".claude/session-rules.md"), "utf8");
    const source = readFileSync(
      path.join(root, "outputs/PROJECT-INSTRUCTIONS_wc48_v1.0_2026-11-08.md"),
      "utf8",
    );
    const head = [
      "# 월크48 세션 규칙 (훅이 세션 시작·비우기·압축 때마다 자동으로 넣음)",
      "## 0. 작업 순서 — Superpowers 필수",
      '- 코드 작업은 brainstorming → writing-plans → test-driven-development(RED→GREEN→REFACTOR) → systematic-debugging → verification-before-completion 순서. 지시서 §11의 3층 테스트와 §10 완료 기준을 실제로 돌린 증거 없이 "끝났다"고 하지 않는다. 대표 눈검사 전에 사전 점검 결과 표를 먼저 보고한다.',
    ].join("\n");
    const tail = source.split("\n").slice(1).join("\n").replace(/^\n+/, "");
    expect(tail.startsWith("# 월크48 소통 규칙")).toBe(true);
    expect(rules).toBe(`${head}\n\n${tail}`);
  });

  it("⑤ 규칙 파일이 없으면 조용히 exit 0", () => {
    const r = run({ SESSION_RULES_FILE: "/nonexistent/session-rules.md" });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });
});
