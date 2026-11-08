// SESSION-RULES-1 — 세션 시작·압축 때 규칙 글을 넣는 SessionStart 훅
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";

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

  it("⑤ 규칙 파일이 없으면 조용히 exit 0", () => {
    const r = run({ SESSION_RULES_FILE: "/nonexistent/session-rules.md" });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });
});
