/**
 * FONT-1 (2026-10-17) — 화면 글꼴은 가벼운 woff2 만 부른다.
 *
 * 잡으려는 사고: Pretendard OTF 9개(각 약 1.5MB)를 통째로 불러 홈 첫 화면이 글꼴 3~4MB를
 * 기다렸다(실사이트 피치 Lighthouse 48). 무거운 파일이 다시 들어오면 이 시험이 빨개진다.
 *
 * 지키는 것:
 * ① 어떤 CSS 도 .otf/.ttf 를 부르지 않고, 모든 @font-face 는 woff2 만 쓴다.
 * ② Pretendard 는 가변 글꼴(굵기 축 하나) 한 벌의 유니코드 구간별 분할(dynamic subset)이다 —
 *    조각들이 한글 음절 전체(U+AC00–D7A3)를 덮어야 한다. 글자 목록을 고정해 잘라 낸 파일
 *    (static subset)은 사람이 넣는 대회 제목·엔트리 이름의 낯선 글자를 깨뜨리므로 금지.
 * ②-1 글꼴 선언 CSS 는 첫 화면을 막는(render-blocking) 스타일시트에 실린다. 굵기별 고정 글꼴
 *    6벌(552 선언 · 300KB)을 실었더니 첫 그림이 1.0초 늦어졌다(FONT-1 실측) → 크기 상한.
 * ③ 부르는 파일은 전부 public/ 안에 실제로 있다(외부 CDN 금지).
 * ④ public/fonts 에 옛 OTF·TTF 가 남아 있지 않다.
 * 서버 크라운 카드(함수 canvas)의 글꼴은 이 시험 대상이 아니다.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const SCAN_DIRS = ["app", "components"];
/** 가변 글꼴 한 벌이 덮는 굵기 범위 — 공식 배포본 pretendardvariable-dynamic-subset.css 값. */
const PRETENDARD_WEIGHT_RANGE = "45 920";
/** 첫 화면을 막는 글꼴 선언 CSS 상한(압축 전). 가변 한 벌 ≈ 50KB · 고정 6벌 ≈ 300KB. */
const FONT_CSS_MAX_BYTES = 80 * 1024;

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".css")) out.push(full);
  }
}

function cssFiles(): string[] {
  const out: string[] = [];
  for (const d of SCAN_DIRS) walk(path.join(ROOT, d), out);
  return out;
}

type Face = { file: string; body: string };

function fontFaces(): Face[] {
  const faces: Face[] = [];
  for (const file of cssFiles()) {
    const css = readFileSync(file, "utf8");
    for (const m of Array.from(css.matchAll(/@font-face\s*\{([^}]*)\}/g))) {
      faces.push({ file: path.relative(ROOT, file), body: m[1] });
    }
  }
  return faces;
}

function prop(body: string, name: string): string | undefined {
  return new RegExp(`${name}\\s*:\\s*([^;]+)`).exec(body)?.[1].trim();
}

function srcUrls(body: string): string[] {
  return Array.from((prop(body, "src") ?? "").matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)).map(
    (m) => m[1],
  );
}

/** "U+ac00-ac0f, U+ac11" → [[0xac00,0xac0f],[0xac11,0xac11]] */
function ranges(body: string): [number, number][] {
  const raw = prop(body, "unicode-range");
  if (!raw) return [];
  return raw.split(",").map((part) => {
    const [a, b] = part.trim().replace(/^U\+/i, "").split("-");
    const lo = parseInt(a, 16);
    return [lo, b ? parseInt(b, 16) : lo];
  });
}

describe("FONT-1 — 화면 글꼴", () => {
  const faces = fontFaces();

  it("어떤 CSS 도 .otf/.ttf 를 부르지 않는다", () => {
    const heavy = cssFiles().filter((f) => /\.(otf|ttf)["')\s]/i.test(readFileSync(f, "utf8")));
    expect(heavy.map((f) => path.relative(ROOT, f))).toEqual([]);
  });

  it("모든 @font-face 는 woff2 만 쓰고 font-display: swap 이다", () => {
    expect(faces.length).toBeGreaterThan(0);
    const bad = faces.filter((f) => {
      const urls = srcUrls(f.body);
      return (
        urls.length === 0 ||
        urls.some((u) => !u.endsWith(".woff2")) ||
        !/format\(\s*["']woff2["']\s*\)/.test(f.body) ||
        prop(f.body, "font-display") !== "swap"
      );
    });
    expect(bad.map((f) => `${f.file}: ${f.body.slice(0, 120)}`)).toEqual([]);
  });

  it("부르는 글꼴 파일은 전부 public/ 안에 있다(외부 CDN 금지)", () => {
    const missing = faces
      .flatMap((f) => srcUrls(f.body))
      .filter((u) => !u.startsWith("/") || !existsSync(path.join(ROOT, "public", u)));
    expect(missing).toEqual([]);
  });

  it("Pretendard 는 가변 글꼴 한 벌이고 구간별 분할 조각들이 한글 음절 전체를 덮는다", () => {
    const mine = faces.filter((f) => /Pretendard/.test(prop(f.body, "font-family") ?? ""));
    expect(mine.length).toBeGreaterThan(1);
    expect(Array.from(new Set(mine.map((f) => prop(f.body, "font-weight"))))).toEqual([
      PRETENDARD_WEIGHT_RANGE,
    ]);
    expect(mine.every((f) => ranges(f.body).length > 0)).toBe(true);
    const covered = new Set<number>();
    for (const f of mine) {
      for (const [lo, hi] of ranges(f.body)) {
        for (let c = Math.max(lo, 0xac00); c <= Math.min(hi, 0xd7a3); c++) covered.add(c);
      }
    }
    expect(covered.size).toBe(0xd7a3 - 0xac00 + 1);
  });

  it("글꼴 선언 CSS 는 첫 화면을 막지 않을 만큼 작다", () => {
    const heavy = cssFiles()
      .filter((f) => /@font-face/.test(readFileSync(f, "utf8")))
      .map((f) => ({ f: path.relative(ROOT, f), bytes: statSync(f).size }))
      .filter((x) => x.bytes > FONT_CSS_MAX_BYTES);
    expect(heavy).toEqual([]);
  });

  // 미리 받기는 지금 0개 — Playfair 1개를 미리 받았더니 첫 화면 CSS 와 대역폭을 다퉈 피치 첫 그림이
  // 1.4초 → 1.6초로 늦어졌다(FONT-1 실측). 다시 넣는다면 2개까지, woff2 이고 실제로 있어야 한다.
  it("layout 이 미리 받는 글꼴은 2개 이하 · woff2 · 실제로 있다", () => {
    const layout = readFileSync(path.join(ROOT, "app/layout.tsx"), "utf8");
    const preloads = Array.from(layout.matchAll(/rel="preload"\s+href="([^"]+)"\s+as="font"/g)).map(
      (m) => m[1],
    );
    expect(preloads.length).toBeLessThanOrEqual(2);
    for (const href of preloads) {
      expect(href.endsWith(".woff2")).toBe(true);
      expect(existsSync(path.join(ROOT, "public", href))).toBe(true);
    }
  });

  it("public/fonts 에 옛 OTF·TTF 가 없다", () => {
    const out: string[] = [];
    const walkAll = (d: string) => {
      for (const n of readdirSync(d)) {
        const full = path.join(d, n);
        if (statSync(full).isDirectory()) walkAll(full);
        else out.push(path.relative(ROOT, full));
      }
    };
    walkAll(path.join(ROOT, "public/fonts"));
    expect(out.filter((f) => /\.(otf|ttf)$/i.test(f))).toEqual([]);
  });
});
