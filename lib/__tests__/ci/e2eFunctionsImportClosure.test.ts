/**
 * 루트 Playwright E2E(`e2e/*.ts`)가 가져오는 functions 코드는 `firebase-functions` 에 닿으면 안 된다.
 *
 * 루트 E2E 워크플로(ARENA-2 · Lab 등)는 functions 패키지를 설치하지 않는다. 가져오는 길 어딘가에
 * `firebase-functions` 가 있으면 시험이 하나도 돌지 못하고 "Cannot find module 'firebase-functions'"
 * 로 끝난다(#185 ARENA-2 검사 · T5 PR 1 — tournamentAdminStore → rankingAccumStore → logger).
 * 에뮬레이터 E2E(`e2e/emulator/`)는 functions 를 설치하고 돌므로 대상이 아니다.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../..");
const IMPORT_RE = /(?:import|export)\s[^;]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function specifiers(file: string): string[] {
  const src = readFileSync(file, "utf8");
  const out: string[] = [];
  for (const m of Array.from(src.matchAll(IMPORT_RE))) out.push(m[1] ?? m[2]);
  return out;
}

function resolveTs(from: string, spec: string): string | null {
  const base = resolve(dirname(from), spec);
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (existsSync(c) && c.match(/\.tsx?$/)) return c;
  }
  return null;
}

/** e2e 최상위 파일에서 시작해 상대 경로 import 를 따라가며, functions/ 안에서 firebase-functions 를 찾는다. */
function offenders(): string[] {
  const e2eDir = join(ROOT, "e2e");
  const starts = readdirSync(e2eDir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(e2eDir, f));
  const seen = new Set<string>();
  const bad: string[] = [];
  const stack = [...starts];
  while (stack.length > 0) {
    const file = stack.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of specifiers(file)) {
      if (spec.startsWith(".")) {
        const next = resolveTs(file, spec);
        if (next) stack.push(next);
      } else if (
        file.includes(`${join(ROOT, "functions")}/`) &&
        (spec === "firebase-functions" || spec.startsWith("firebase-functions/"))
      ) {
        bad.push(file.slice(ROOT.length + 1));
      }
    }
  }
  return bad.sort();
}

describe("루트 E2E 가 가져오는 functions 코드", () => {
  it("firebase-functions 를 가져오지 않는다(루트 E2E CI 는 functions 패키지를 설치하지 않음)", () => {
    expect(offenders()).toEqual([]);
  });
});
