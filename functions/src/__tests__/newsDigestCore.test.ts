/**
 * ND-1 §3 #2 — newsDigestCore: ranking_cache → 기사 근거 수치. AC 3·4.
 *
 * The digest REUSES the existing ranking_cache (no new aggregation is invented).
 * 기사 숫자 허용 목록 (대표 확정 2026-11-25 · T5 PR 2): 순위 · Crown Score · 1등 비율 ·
 * 선택 비율 · 엔트리 수 · 날짜만. 선택 수와 옛 rate 는 근거에 없다 — 전체 잠금은
 * newsNumberLock.test.ts.
 */
import { describe, expect, it } from "vitest";
import {
  buildOpenDigest,
  buildResultDigest,
  buildWeeklyDigest,
  nameGlossaryOf,
  rankingRowFromCache,
  formatKstMonthDay,
  type RankingRowLike,
} from "../core/newsDigestCore";

const rows: RankingRowLike[] = [
  { rank: 1, contestantId: "c1", name: "Blue Flame", crownScore: 812, winRate: 0.333, shareRate: 0.6 },
  { rank: 2, contestantId: "c2", name: "Neon Tide", crownScore: 640, winRate: 0.211, shareRate: 0.5 },
  { rank: 3, contestantId: "c3", name: "Last Splash", crownScore: 500, winRate: 0.125, shareRate: 0.4 },
];

const meta = {
  id: "t_summer48",
  title: "2026 서머 컴백 타이틀곡 48",
  category: "KPOP",
  totalContestants: 48,
  deadlineMs: Date.UTC(2026, 7, 31, 3, 0, 0), // 2026-08-31 12:00 KST
};

describe("formatKstMonthDay", () => {
  it("renders an epoch ms as MM-DD in KST", () => {
    expect(formatKstMonthDay(Date.UTC(2026, 7, 31, 3, 0, 0))).toBe("08-31");
  });
  it("respects the KST day boundary (UTC 15:00 → next day)", () => {
    expect(formatKstMonthDay(Date.UTC(2026, 6, 21, 15, 0, 0))).toBe("07-22");
  });
});

describe("buildOpenDigest — 오픈 기사 근거 (아직 투표 없음)", () => {
  it("surfaces contestant count, deadline, languages — no votes needed", () => {
    const d = buildOpenDigest(meta, "2026-07-22 08:00 KST");
    const labels = d.stats.map((s) => s.label);
    expect(labels).toContain("CONTESTANTS");
    expect(labels).toContain("DEADLINE · KST");
    expect(labels).toContain("LANGUAGES");
    expect(d.stats.find((s) => s.label === "CONTESTANTS")?.value).toBe("48");
    expect(d.stats.find((s) => s.label === "DEADLINE · KST")?.value).toBe("08-31");
    expect(d.leaders).toEqual([]);
    expect(d.tournamentId).toBe("t_summer48");
    expect(d.asOf).toBe("2026-07-22 08:00 KST");
  });

  it("tolerates a missing deadline (shows TBD, no crash)", () => {
    const d = buildOpenDigest({ ...meta, deadlineMs: null }, "now");
    expect(d.stats.find((s) => s.label === "DEADLINE · KST")?.value).toBe("TBD");
  });
});

describe("buildResultDigest — 결과 기사 근거 (Crown Score 기반)", () => {
  it("surfaces the Champion + 차트 1위 CROWN SCORE 칸", () => {
    const d = buildResultDigest({
      meta,
      rankings: rows,
      championId: "c1",
      asOf: "2026-08-31 12:00 KST",
    });
    expect(d.leaders[0]).toMatchObject({ rank: 1, name: "Blue Flame", crownScore: 812, winRate: 0.333 });
    expect(d.stats.find((s) => s.label === "CROWN SCORE")?.value).toBe("812");
    // 숫자 칸에 퍼센트는 없다(옛 TOP RATE · RUNNER-UP RATE 삭제).
    expect(d.stats.map((s) => s.value).join(" | ")).not.toContain("%");
  });

  it("marks the Champion among the leaders", () => {
    const d = buildResultDigest({
      meta,
      rankings: rows,
      championId: "c1",
      asOf: "x",
    });
    expect(d.leaders.find((l) => l.contestantId === "c1")?.isChampion).toBe(true);
    expect(d.leaders.find((l) => l.contestantId === "c2")?.isChampion).toBe(false);
  });

  it("caps leaders at the top 3", () => {
    const many: RankingRowLike[] = Array.from({ length: 10 }, (_, i) => ({
      rank: i + 1,
      contestantId: `c${i}`,
      name: `N${i}`,
      crownScore: 900 - i,
      winRate: 0.1,
      shareRate: 0.2,
    }));
    const d = buildResultDigest({ meta, rankings: many, championId: "c0", asOf: "x" });
    expect(d.leaders).toHaveLength(3);
  });
});

describe("buildWeeklyDigest — 주간 랭킹 동향 (대회마다 차트 1위 · Crown Score 큰 순)", () => {
  const caches = [
    { tournamentId: "t1", title: "A48", rankings: rows },
    {
      tournamentId: "t2",
      title: "B48",
      rankings: [{ rank: 1, contestantId: "x", name: "X", crownScore: 950, winRate: 0.55, shareRate: 0.7 }],
    },
  ];

  it("ranks tournaments by their leader's Crown Score and counts the active field", () => {
    const d = buildWeeklyDigest({ caches, asOf: "2026-07-24 12:00 KST" });
    expect(d.stats.find((s) => s.label === "ACTIVE TOURNAMENTS")?.value).toBe("2");
    // B48 (950) leads A48 (812).
    expect(d.leaders[0]).toMatchObject({ name: "X", crownScore: 950 });
    expect(d.leaders[0].tournamentTitle).toBe("B48");
  });

  it("handles an empty field (참가 직후 크론, evidence 0건) without crashing", () => {
    const d = buildWeeklyDigest({ caches: [], asOf: "now" });
    expect(d.stats.find((s) => s.label === "ACTIVE TOURNAMENTS")?.value).toBe("0");
    expect(d.leaders).toEqual([]);
  });

  it("숫자 칸은 ACTIVE TOURNAMENTS 하나 — 옛 TOP MOMENTUM 없음", () => {
    const d = buildWeeklyDigest({ caches, asOf: "now" });
    expect(d.stats.map((s) => s.label)).toEqual(["ACTIVE TOURNAMENTS"]);
  });
});

// NAME-I18N-1 (원장 D-61) — 차트 캐시에 실린 공식 영어 이름을 기사 근거까지 실어 나른다.
describe("이름 3언어 — 기사 근거", () => {
  it("rankingRowFromCache 는 nameI18n.en 을 nameEn 으로 읽는다(없으면 빈칸)", () => {
    expect(
      rankingRowFromCache({
        rank: 1,
        contestantId: "c1",
        name: "뉴진스",
        nameI18n: { ko: "뉴진스", en: "NewJeans", es: "NewJeans" },
        crownScore: 700,
        winRate: 0.4,
        shareRate: 0.5,
        rate: 40,
        voteCount: 9,
      }),
    ).toEqual({
      rank: 1,
      contestantId: "c1",
      name: "뉴진스",
      nameEn: "NewJeans",
      crownScore: 700,
      winRate: 0.4,
      shareRate: 0.5,
    });
    expect(rankingRowFromCache({ rank: 2, contestantId: "c2", name: "옛" }).nameEn).toBe("");
  });

  it("결과·주간 근거의 선두가 nameEn 을 갖는다", () => {
    const named: RankingRowLike[] = [
      { rank: 1, contestantId: "c1", name: "뉴진스", nameEn: "NewJeans", crownScore: 700, winRate: 0.4, shareRate: 0.5 },
    ];
    expect(buildResultDigest({ meta, rankings: named, championId: "c1", asOf: "x" }).leaders[0].nameEn).toBe(
      "NewJeans",
    );
    expect(
      buildWeeklyDigest({ caches: [{ tournamentId: "t", title: "T", rankings: named }], asOf: "x" }).leaders[0]
        .nameEn,
    ).toBe("NewJeans");
  });

  it("nameGlossaryOf 는 영어 이름이 따로 있는 선두만 모은다", () => {
    expect(
      nameGlossaryOf({
        asOf: "x",
        stats: [],
        leaders: [
          { rank: 1, contestantId: "c1", name: "뉴진스", nameEn: "NewJeans", crownScore: 700, winRate: 0.4, shareRate: 0.5 },
          { rank: 2, contestantId: "c2", name: "IVE", nameEn: "IVE", crownScore: 600, winRate: 0.3, shareRate: 0.4 },
          { rank: 3, contestantId: "c3", name: "옛 엔트리", crownScore: 500, winRate: 0.2, shareRate: 0.3 },
        ],
      }),
    ).toEqual([{ ko: "뉴진스", en: "NewJeans" }]);
  });
});
