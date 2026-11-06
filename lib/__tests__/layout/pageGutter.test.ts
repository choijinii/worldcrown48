/**
 * D-78 (2026-11-06 대표) — 공개 페이지 좌우 여백은 모든 폭에서 20px 하나(매치 무대 제외).
 *
 * 잡으려는 사고: 페이지마다 16·20·24·27·40·48·5vw 로 제각각이라 같은 서비스로 보이지 않았고,
 * 768 에서 피치·아레나 홈 배너가 728 대신 320 으로 떨어졌다(2026-11-02 실측).
 * 정해진 모양: 공통 값 `--page-gutter: 20px` 하나를 globals.css(코드 원장)와 디자인 정본 사본에 두고,
 * 여섯 페이지의 좌우 여백 규칙은 모두 그 값을 쓴다. 넓은 화면의 최대 폭·가운데 정렬은 이 시험 밖이다.
 * 실제 화면의 여백은 e2e/gutter20-pages.spec.ts 가 잰다.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

/** 파일에서 선택자로 시작하는 규칙 몸통을 모두 모은다(미디어·컨테이너 쿼리 안 포함). */
function ruleBodies(css: string, selector: string): string[] {
  const out: string[] = [];
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[\\s,}])${esc}\\s*\\{([^}]*)\\}`, "g");
  for (const m of Array.from(css.matchAll(re))) out.push(m[2]);
  return out;
}

/** 괄호 바깥의 공백으로만 나눈다 — calc(var(--nav-h) + 32px) 는 한 덩어리. */
function splitTopLevel(v: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of v) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (cur) parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) parts.push(cur);
  return parts;
}

/** padding 단축 속성의 좌우 값(2~4개 값일 때 두 번째 · 네 번째)을 돌려준다. */
function inlinePadding(body: string): string[] {
  const vals: string[] = [];
  for (const m of Array.from(body.matchAll(/(?:^|;|\s)padding\s*:\s*([^;]+);/g))) {
    const parts = splitTopLevel(m[1].trim());
    if (parts.length === 2 || parts.length === 3) vals.push(parts[1]);
    if (parts.length === 4) vals.push(parts[1], parts[3]);
    if (parts.length === 1) vals.push(parts[0]);
  }
  for (const m of Array.from(body.matchAll(/padding-(?:left|right|inline)\s*:\s*([^;]+);/g))) vals.push(m[1].trim());
  return vals;
}

const GUTTER_RULES: Array<[file: string, selector: string]> = [
  ["components/pitch/pitch.css", ".pitch .pitch-inner"], // 피치
  ["components/arenaHome/arenaHome.module.css", ".page"], // 아레나 홈
  ["components/records/chartsList.module.css", ".page"], // Record Room
  ["components/account/lockerGuest.module.css", ".page"], // Locker Room(로그인 전)
  ["app/globals.css", ".lp-inner"], // 사전등록
  ["app/globals.css", ".lp-banner"], // 사전등록 배너 줄
  ["components/news/news.module.css", ".listWrap"], // 뉴스 목록
  ["components/news/news.module.css", ".masthead"], // 뉴스 기사 지면
  ["components/news/news.module.css", ".rail"],
  ["components/news/news.module.css", ".article"],
  ["components/news/news.module.css", ".articleFooter"],
];

describe("D-78 공개 페이지 좌우 여백 = --page-gutter(20px) 하나", () => {
  it("globals.css 와 디자인 정본 사본에 --page-gutter: 20px 이 있다", () => {
    expect(read("app/globals.css")).toMatch(/--page-gutter:\s*20px/);
    expect(read("docs/design/colors_and_type.css")).toMatch(/--page-gutter:\s*20px/);
  });

  for (const [file, selector] of GUTTER_RULES) {
    it(`${file} ${selector} 의 좌우 여백은 모든 폭에서 var(--page-gutter)`, () => {
      const bodies = ruleBodies(read(file), selector);
      const vals = bodies.flatMap(inlinePadding);
      expect(vals.length, `${selector} 에 padding 규칙이 없다`).toBeGreaterThan(0);
      for (const v of vals) expect(v).toBe("var(--page-gutter)");
    });
  }

  it("Locker Room(로그인 뒤) 본문도 같은 값을 쓴다", () => {
    const src = read("app/account/page.tsx");
    const pads = Array.from(src.matchAll(/padding:\s*"64px ([^"]+)"/g)).map((m) => m[1]);
    expect(pads.length).toBeGreaterThan(0);
    for (const p of pads) expect(p).toBe("var(--page-gutter)");
  });
});
