/**
 * NAV-1 G2 — 차트로 가는 문은 2개 이상이다 (프롬프트 §6 G2 · §0-B 7 · 8).
 *
 * 아레나 탭 줄(ModuleNav)이 차트로 가는 유일한 링크였다(10-10 실측). 그것을 지우면서
 *   ① 메뉴 Record Room ▸ Charts → /records 의 줄마다 "차트 보기" → /arena/{id}/ranking
 *   ② 크라운 카드 화면의 "차트 보기" → /arena/{id}/ranking
 * 를 둔다. 어느 하나가 빠지면 이 시험이 막는다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dropdownItems, NAV_ITEMS } from "@/lib/layout/navMap";

const read = (p: string) => readFileSync(path.resolve(__dirname, "../../..", p), "utf8");

describe("차트로 가는 문", () => {
  it("① 메뉴 Record Room ▸ Charts 는 /records 로 간다", () => {
    expect(NAV_ITEMS.find((n) => n.key === "records")?.href).toBe("/records");
    expect(dropdownItems("records").find((s) => s.key === "charts")?.href).toBe("/records");
  });

  it("① /records 의 줄 링크는 chartHref(= /arena/{id}/ranking)", () => {
    const src = read("components/records/ChartsList.tsx");
    expect(src).toMatch(/href=\{chartHref\(r\.id\)\}/);
  });

  it("② 크라운 카드 화면에 chartHref 링크", () => {
    const src = read("app/arena/[tournamentId]/champion/page.tsx");
    expect(src).toMatch(/href=\{chartHref\(tournamentId\)\}/);
  });

  it("아레나 탭 줄(ModuleNav)은 다시 붙지 않는다", () => {
    for (const p of ["app/arena/[tournamentId]/ranking/page.tsx", "app/arena/[tournamentId]/champion/page.tsx"]) {
      expect(read(p)).not.toMatch(/<ModuleNav\b/);
    }
  });
});
