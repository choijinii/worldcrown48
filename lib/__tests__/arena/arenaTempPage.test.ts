/**
 * NAV-1 E2 — `/arena` 임시 페이지 (프롬프트 §3-B · §0-B 5).
 * 화이트 · noindex · 사이트맵 제외(sitemap.test) · The Pitch 링크 1개 · 데이터 읽기 없음.
 * ARENA-2 가 같은 주소에서 아레나 홈으로 교체한다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { metadata } from "@/app/arena/page";
import { ArenaTempPage } from "@/components/arena/ArenaTempPage";

const src = (p: string) => readFileSync(path.resolve(__dirname, "../../..", p), "utf8");

describe("/arena 임시 페이지", () => {
  it("검색에 올리지 않는다(noindex)", () => {
    expect(metadata.robots).toMatchObject({ index: false });
  });

  it("맨 위 TEMP 주석 — ARENA-2 가 이 파일을 교체한다", () => {
    expect(src("app/arena/page.tsx").split("\n")[0]).toBe(
      "// TEMP(NAV-1): ARENA-2가 이 파일을 아레나 홈으로 교체한다. 주소 /arena 는 유지.",
    );
  });

  it("제목 The Arena · The Pitch 링크 하나 · 화이트", () => {
    const html = renderToStaticMarkup(createElement(ArenaTempPage));
    expect(html).toContain(">The Arena</h1>");
    expect(html.match(/<a /g)?.length).toBe(1);
    expect(html).toContain('href="/"');
    expect(html).toContain('data-theme="light"');
  });

  it("데이터를 읽지 않는다", () => {
    const s = src("components/arena/ArenaTempPage.tsx") + src("app/arena/page.tsx");
    expect(s).not.toMatch(/firebase|getDoc|getDocs|onSnapshot/);
  });
});
