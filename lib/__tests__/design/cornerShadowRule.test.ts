/**
 * D-85 (2026-11-06 대표) — 디자인 정본 규칙 C + 모서리 최대 2px · 밝은 면 그림자 없음.
 *
 * 잡으려는 사고: 디자인 시스템은 모서리를 5px로 정했는데 코드 곳곳에 8·10·12·16·20px 모서리가
 * 손으로 적혀 있었고, 밝은 면(화이트 테마)에는 그림자가 남아 있었다. 정본을 맞추려면 코드가 먼저 맞아야 한다.
 * 정해진 모양: 상자 모서리는 다크·화이트 모두 2px 이하(`--radius-border: 2px`).
 *   예외 = 알약·칩(999px · `--radius-chip`)과 원(50%) — 상자가 아니다.
 *   밝은 면 그림자 토큰(--shadow-light · --shadow-gnb · --shadow-modal · --shadow-banner · 관리자 --shadow-card*)은 none.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(css|tsx|ts)$/.test(name)) out.push(full);
  }
}

const ALLOWED = [
  /^var\(--radius-(border|chip|rect)\)$/,
  /^var\(--arena-nav-radius\)$/,
  /^(0|1|2)(px)?$/,
  /^999(px)?$/,
  /^50%$/,
  /^inherit$/,
];

/** 값 하나("8" · "6px 6px 0 0" · "var(--radius-border) 0")를 낱개로 나눠 모두 허용되는지 본다. */
function badParts(value: string): string[] {
  const v = value.replace(/!important/, "").trim();
  const parts = v.match(/var\([^)]*\)|\S+/g) ?? [];
  return parts.filter((p) => !ALLOWED.some((re) => re.test(p)));
}

describe("D-85 모서리 최대 2px (알약·칩·원 예외)", () => {
  it("--radius-border 토큰은 2px — 코드 원장 · 관리자 · 디자인 정본 사본", () => {
    expect(read("app/globals.css")).toMatch(/--radius-border:\s*2px/);
    expect(read("app/admin/admin.css")).toMatch(/--radius-border:\s*2px/);
    expect(read("docs/design/colors_and_type.css")).toMatch(/--radius-border:\s*2px/);
  });

  it("app · components 에 2px 넘는 모서리가 없다", () => {
    const files: string[] = [];
    for (const d of ["app", "components"]) walk(path.join(ROOT, d), files);
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const rel = path.relative(ROOT, f);
      // CSS: border-radius: 8px;   TSX: borderRadius: 8,  borderRadius: "50%"
      for (const m of Array.from(src.matchAll(/border-radius\s*:\s*([^;}\n]+)/g))) {
        const bad = badParts(m[1]);
        if (bad.length) offenders.push(`${rel}: border-radius: ${m[1].trim()}`);
      }
      for (const m of Array.from(src.matchAll(/borderRadius\s*:\s*("[^"]*"|'[^']*'|[^,}\n]+)/g))) {
        const raw = m[1].trim().replace(/^["']|["']$/g, "");
        const bad = badParts(raw);
        if (bad.length) offenders.push(`${rel}: borderRadius: ${m[1].trim()}`);
      }
      // 반경 토큰을 새로 정의하는 곳도 2px 이하
      for (const m of Array.from(src.matchAll(/--[a-z0-9-]*radius[a-z0-9-]*\s*:\s*([^;}\n]+)/g))) {
        if (/var\(/.test(m[1])) continue;
        const bad = badParts(m[1].replace(/\/\*.*$/, ""));
        if (bad.length) offenders.push(`${rel}: ${m[0].trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("D-85 밝은 면 그림자 없음", () => {
  it("화이트 스코프의 그림자 토큰은 none", () => {
    const css = read("app/globals.css");
    const scope = css.slice(css.indexOf('[data-theme="light"],'));
    for (const t of ["--shadow-light", "--shadow-gnb", "--shadow-modal", "--shadow-banner"]) {
      expect(scope).toMatch(new RegExp(`${t}:\\s*none;`));
    }
  });

  it("관리자(화이트) 그림자 토큰도 none — 금색 빛(--shadow-gold)은 그림자가 아니라 남는다", () => {
    const css = read("app/admin/admin.css");
    for (const t of ["--shadow-light", "--shadow-card", "--shadow-card-hover"]) {
      expect(css).toMatch(new RegExp(`${t}:\\s*none;`));
    }
  });
});
