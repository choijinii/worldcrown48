/**
 * E2E 고아 방지 (E2E-1, 2026-10-04).
 *
 * `e2e/` 의 시험 파일은 어느 워크플로엔가 연결돼 있어야 CI에서 돈다. `hf3-guest-run.spec.ts`
 * 는 9/20에 고아인 것이 발견되고도 2주 넘게 그대로였고, 그 사이 문법 오류까지 생겼지만 아무도
 * 몰랐다 — 돌지 않는 시험은 깨져도 빨강을 내지 않는다. 사람이 기억하는 대신 이 시험이 막는다.
 *
 * 판정은 일부러 단순하다: 시험 파일 이름이 `.github/workflows/*.yml` 어딘가에 글자 그대로
 * 있으면 연결된 것으로 본다. 워크플로 명령은 파일을 이름으로 지정하기 때문이다.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const E2E_DIR = path.join(ROOT, "e2e");
const WORKFLOW_DIR = path.join(ROOT, ".github/workflows");

/**
 * 의도적으로 CI에 연결하지 않는 시험 파일 — **이유를 반드시 함께 적는다.**
 * 예: `"foo.spec.ts": "로컬 전용 시각 점검 — 프리뷰 비밀값 없이는 의미 없음 (2026-10-04 대표)"`
 */
const UNWIRED_ALLOWLIST: Record<string, string> = {};

function specFiles(): string[] {
  return readdirSync(E2E_DIR).filter((f) => f.endsWith(".spec.ts")).sort();
}

function workflowText(): string {
  return readdirSync(WORKFLOW_DIR)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map((f) => readFileSync(path.join(WORKFLOW_DIR, f), "utf8"))
    .join("\n");
}

describe("e2e wiring — 모든 e2e 시험 파일은 워크플로에 연결돼 있다", () => {
  it("e2e/*.spec.ts 가 하나 이상 있다 (경로가 틀려 빈 목록으로 초록이 되지 않게)", () => {
    expect(specFiles().length).toBeGreaterThan(0);
  });

  it("허용 목록에 없는 시험 파일은 전부 .github/workflows/*.yml 에 이름이 있다", () => {
    const text = workflowText();
    const orphans = specFiles().filter(
      (f) => !(f in UNWIRED_ALLOWLIST) && !text.includes(f),
    );
    expect(orphans, "워크플로에 연결되지 않은 e2e 시험 파일").toEqual([]);
  });

  it("허용 목록의 항목은 실제 파일이고 이유가 적혀 있다 (낡은 예외가 남지 않게)", () => {
    const files = new Set(specFiles());
    for (const [file, reason] of Object.entries(UNWIRED_ALLOWLIST)) {
      expect(files.has(file), `허용 목록의 ${file} 이 e2e/ 에 없다`).toBe(true);
      expect(reason.trim().length, `${file} 의 이유가 비어 있다`).toBeGreaterThan(0);
    }
  });
});
