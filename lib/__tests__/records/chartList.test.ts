/**
 * NAV-1 G — `/records` Charts 대회 목록의 규칙 (프롬프트 §3-C · §0-B 7 · 11).
 *
 * 끝난 대회 = 마감 시각(`tournamentDeadline`)이 지난 대회 — `status` 로 판단하지 않는다
 * (`ended` 로 바꾸는 코드가 없다, 대표 정의 10/10). 집합은 사이트맵과 같은 공개 대회.
 */
import { describe, expect, it } from "vitest";
import {
  categoryChip,
  championName,
  chartHref,
  splitChartTournaments,
  type ChartTournament,
} from "@/lib/records/chartList";

const NOW = 1_760_000_000_000;
const H = 60 * 60 * 1000;

function t(id: string, deadlineMs: number | null, extra: Partial<ChartTournament> = {}): ChartTournament {
  return { id, status: "active", hostUid: "u1", deadlineMs, title: id, category: "KPOP", ...extra };
}

describe("splitChartTournaments — 진행 중 / 끝난 대회", () => {
  it("마감 > 지금 = 진행 중 · 마감 ≤ 지금 = 끝남 (정확히 지금도 끝남)", () => {
    const r = splitChartTournaments([t("future", NOW + 1), t("now", NOW), t("past", NOW - 1)], NOW);
    expect(r.active.map((x) => x.id)).toEqual(["future"]);
    expect(r.ended.map((x) => x.id)).toEqual(["now", "past"]);
  });

  it("마감 시각이 없는 대회는 진행 중 — 계속 열려 있다", () => {
    const r = splitChartTournaments([t("open", null)], NOW);
    expect(r.active.map((x) => x.id)).toEqual(["open"]);
    expect(r.ended).toEqual([]);
  });

  it("status 로 판단하지 않는다 — 'ended' 문자열이어도 공개 집합 밖이라 빠지고, active 는 마감으로만 나뉜다", () => {
    const r = splitChartTournaments([t("st-ended", NOW - H, { status: "ended" }), t("draft", NOW + H, { status: "draft" })], NOW);
    expect(r.active).toEqual([]);
    expect(r.ended).toEqual([]);
  });

  it("사이트맵과 같은 공개 집합 — 시드(hostUid seed-) 제외", () => {
    const r = splitChartTournaments([t("seed", NOW + H, { hostUid: "seed-operator" }), t("real", NOW + H)], NOW);
    expect(r.active.map((x) => x.id)).toEqual(["real"]);
  });

  it("정렬: 진행 중 = 마감 가까운 순(마감 없음은 뒤) · 끝난 대회 = 마감 최근 순", () => {
    const r = splitChartTournaments(
      [t("a3", NOW + 3 * H), t("none", null), t("a1", NOW + H), t("e1", NOW - H), t("e3", NOW - 3 * H), t("a2", NOW + 2 * H)],
      NOW,
    );
    expect(r.active.map((x) => x.id)).toEqual(["a1", "a2", "a3", "none"]);
    expect(r.ended.map((x) => x.id)).toEqual(["e1", "e3"]);
  });
});

describe("championName — 차트의 Crown Score 1위", () => {
  const ok = { runsTotal: 12, rankings: [{ name: "서하린" }, { name: "유도윤" }] };

  it("차트가 점수를 보이는 상태면 1위 이름", () => {
    expect(championName(ok)).toBe("서하린");
  });

  it("캐시 없음 · 아직 10판 미만 · 순위 없음 = 비움(줄은 그대로 보인다)", () => {
    expect(championName(null)).toBeNull();
    expect(championName(undefined)).toBeNull();
    expect(championName({ runsTotal: 9, rankings: [{ name: "x" }] })).toBeNull();
    expect(championName({ runsTotal: 50, rankings: [] })).toBeNull();
  });

  it("이름이 비었으면 비움", () => {
    expect(championName({ runsTotal: 12, rankings: [{ name: "  " }] })).toBeNull();
  });
});

describe("chartHref — 줄의 '차트 보기' = 그 대회 차트", () => {
  it("/arena/{id}/ranking", () => {
    expect(chartHref("abc")).toBe("/arena/abc/ranking");
    expect(chartHref("a b")).toBe("/arena/a%20b/ranking");
  });
});

describe("categoryChip — 정본 31: 모든 언어에서 영어 대문자(K-POP · CREATOR)", () => {
  const cats = [
    { id: "KPOP", name: { ko: "케이팝", en: "K-pop", es: "K-pop" } },
    { id: "CREATOR", name: { ko: "크리에이터", en: "Creator", es: "Creador" } },
  ];
  it("카테고리 문서의 영어 이름을 대문자로", () => {
    expect(categoryChip("KPOP", cats)).toBe("K-POP");
    expect(categoryChip("CREATOR", cats)).toBe("CREATOR");
  });
  it("문서가 없으면 id 그대로 · 카테고리 없으면 null", () => {
    expect(categoryChip("FOOTBALL", cats)).toBe("FOOTBALL");
    expect(categoryChip(undefined, cats)).toBeNull();
    expect(categoryChip("", cats)).toBeNull();
  });
});
