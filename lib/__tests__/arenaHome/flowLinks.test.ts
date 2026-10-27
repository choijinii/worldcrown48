/**
 * ARENA-2 · 원장 D-71 — 피치 → 대기실(아레나 홈 전광판) → 입장하기 → 매치.
 *
 * 피치의 대회 카드와 사전등록(/launch)의 추천 대회 버튼은 매치 무대(`/arena/{id}`)로 바로 가지
 * 않고 `/arena?t={id}` 로 간다(대표 2026-10-27 — 사전등록 버튼도 같은 원칙). 크라운 카드·공유
 * 링크·이어하기 알약·차트 주소는 그대로다.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const src = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

const FAN_ENTRY_FILES = [
  ...readdirSync(path.join(ROOT, "components/pitch"))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => `components/pitch/${f}`),
  "components/launch/FeaturedTournament.tsx",
];

describe("D-71 — 피치·사전등록에서 매치 무대로 바로 가는 링크가 없다", () => {
  it.each(FAN_ENTRY_FILES)("%s", (file) => {
    expect(src(file)).not.toMatch(/["'`]\/arena\/\$\{/);
  });

  it("피치 대회 카드 · 사전등록 추천 대회 = 아레나 홈 주소(arenaHomeHref)", () => {
    for (const f of ["components/pitch/TournamentCard.tsx", "components/launch/FeaturedTournament.tsx"]) {
      expect(src(f), f).toMatch(/arenaHomeHref\(\{\s*t:\s*tournament\.id\s*\}\)/);
    }
  });

  it("이어하기 알약 · 크라운 카드 주소는 그대로(매치 무대 · /champion)", () => {
    expect(src("lib/run/continueMemo.ts")).toContain("`/arena/${encodeURIComponent(memo.tournamentId)}`");
    expect(src("lib/crown/championLoader.ts")).toContain("/arena/${tournament.id}/champion");
  });
});
