/**
 * ARENA-2 — /arena 는 임시 페이지가 아니다: 검색 색인 허용(NAV-1 인계 ②) · 요청마다 읽기.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(path.resolve(__dirname, "../../../app/arena/page.tsx"), "utf8");

describe("app/arena/page.tsx", () => {
  it("noindex 를 두지 않는다 · TEMP 주석이 없다", () => {
    expect(src).not.toMatch(/robots/);
    expect(src).not.toMatch(/TEMP\(NAV-1\)/);
  });

  it("요청마다 읽는다(force-dynamic) — 마감이 지난 대회가 곧바로 게시판으로", () => {
    expect(src).toContain('export const dynamic = "force-dynamic"');
  });
});
