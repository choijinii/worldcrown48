/**
 * T5 PR 2 · 기사 숫자 허용 목록 잠금 시험 (대표 확정 2026-11-25).
 *
 * 기준 = 계획서 docs/superpowers/plans/2026-11-25-t5-incremental-ranking.md
 * "기사 숫자 허용 목록" 절. 근거(digest) · AI 재료(evidence 줄) · AI 지시 · 서버 그물 ·
 * 번역 용어 목록이 그 목록을 벗어나면 이 시험이 실패한다.
 *
 * 쓸 수 없는 것: 엔트리별 선택 수(voteCount) · 대회 전체 선택 수(totalVotes) · 옛 rate ·
 * 1등 횟수 · 결승 오른 횟수 · 대결에 나온 횟수 · 순위 점수 합계.
 * 2026-11-28 대표(D-108): 순위점수율(placementRate)은 이제 기사에 쓸 수 있다 · 세 비율 정본 이름 = 순위점수율 · 우승율 · 선택율.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALLOWED_STAT_LABELS,
  LEADER_KEYS,
  buildOpenDigest,
  buildResultDigest,
  buildWeeklyDigest,
  rankingRowFromCache,
  runsTotalFromCache,
} from "../core/newsDigestCore";
import {
  NEWS_STYLE_GUIDE,
  NUMBER_RULE_LINES,
  buildColumnPrompt,
  buildOpenPrompt,
  buildResultPrompt,
  buildWeeklyPrompt,
  evidenceLines,
} from "../core/newsPrompts";
import { parseNewsDraftReply } from "../core/newsDraftAssembly";
import { buildArticleTranslatePrompt } from "../core/translateArticleCore";
import { CHART_RATE_TERMS } from "../core/displayTerms";
import { MIN_RUNS_FOR_CHART } from "../core/newsDigestCore";
import { CHART_TERM_RULE_LINE, CHART_WAITING_LINE } from "../core/newsPrompts";
import { TIO_FACT_SHEET, TIO_KIND_SKILLS } from "../core/tioKnowledge";

// 공개 캐시 행 — 서버 전용·옛 칸을 눈에 띄는 값으로 심는다(9 · 61.2 · 0.77 · 1204 · 333 · 4417).
const cacheRows: Record<string, unknown>[] = [
  {
    rank: 1,
    contestantId: "c1",
    name: "블루 플레임",
    nameI18n: { ko: "블루 플레임", en: "Blue Flame", es: "Blue Flame" },
    crownScore: 812,
    placementRate: 0.77,
    winRate: 0.31,
    shareRate: 0.642,
    voteCount: 1204,
    rate: 61.2,
    wins: 9,
    finals: 333,
    appearances: 4417,
    picks: 2718,
    placementPoints: 5555,
  },
  {
    rank: 2,
    contestantId: "c2",
    name: "네온 타이드",
    crownScore: 640,
    placementRate: 0.7711,
    winRate: 0.12,
    shareRate: 0.5,
    voteCount: 999,
    rate: 21.1,
  },
  {
    rank: 3,
    contestantId: "c3",
    name: "라스트 스플래시",
    crownScore: 500,
    placementRate: 0.7722,
    winRate: 0.05,
    shareRate: 0.4,
    voteCount: 375,
    rate: 12.5,
  },
  { rank: 4, contestantId: "c4", name: "넷째", crownScore: 100, winRate: 0, shareRate: 0.1 },
];
const cacheDoc = { rankings: cacheRows, runsTotal: 2026, totalVotes: 7777 };
const rankings = cacheRows.map(rankingRowFromCache);

const meta = {
  id: "t1",
  title: "여름 컴백 48",
  category: "KPOP",
  totalContestants: 48,
  deadlineMs: Date.UTC(2026, 7, 31, 3, 0, 0),
};

const openDigest = buildOpenDigest(meta, "2026-11-25 09:00 KST");
const resultDigest = buildResultDigest({
  meta,
  rankings,
  championId: "c1",
  asOf: "2026-11-25 09:00 KST",
  runsTotal: runsTotalFromCache(cacheDoc),
});
const weeklyDigest = buildWeeklyDigest({
  caches: [
    { tournamentId: "t1", title: "여름 컴백 48", rankings, runsTotal: 2026 },
    {
      tournamentId: "t2",
      title: "B 대회",
      runsTotal: 40,
      rankings: [rankingRowFromCache({ rank: 1, contestantId: "x", name: "엑스", crownScore: 900, winRate: 0.4, shareRate: 0.7, rate: 88.8 })],
    },
    {
      tournamentId: "t3",
      title: "A 대회",
      runsTotal: 40,
      rankings: [rankingRowFromCache({ rank: 1, contestantId: "y", name: "와이", crownScore: 900, winRate: 0.2, shareRate: 0.6 })],
    },
    {
      tournamentId: "t4",
      title: "C 대회",
      runsTotal: 40,
      rankings: [rankingRowFromCache({ rank: 1, contestantId: "z", name: "제트", crownScore: 10, winRate: 0, shareRate: 0.2 })],
    },
  ],
  asOf: "2026-11-27 12:00 KST",
});

const resultPrompt = buildResultPrompt({
  title: meta.title,
  championName: resultDigest.leaders[0].name,
  championNameEn: resultDigest.leaders[0].nameEn,
  digest: resultDigest,
});
const allPrompts = [
  buildOpenPrompt({ title: meta.title, category: meta.category, digest: openDigest }),
  resultPrompt,
  buildWeeklyPrompt({ digest: weeklyDigest }),
  buildColumnPrompt({ topic: "여름 노래", digest: weeklyDigest }),
];

describe("기사 숫자 허용 목록 — 근거(digest)", () => {
  it("근거의 숫자 칸 라벨은 허용 목록뿐", () => {
    for (const d of [openDigest, resultDigest, weeklyDigest]) {
      for (const s of d.stats) expect(ALLOWED_STAT_LABELS).toContain(s.label);
    }
  });

  it("결과 기사: CROWN SCORE 칸 = 차트 1위 crownScore · TOP RATE/RUNNER-UP RATE 없음", () => {
    expect(resultDigest.stats).toEqual([
      { label: "CONTESTANTS", value: "48" },
      { label: "CROWN SCORE", value: "812" },
    ]);
    const labels = resultDigest.stats.map((s) => s.label).join(" ");
    expect(labels).not.toMatch(/TOP RATE|RUNNER-UP/);
    // 차트 행이 없으면 CROWN SCORE 칸도 없다.
    const empty = buildResultDigest({ meta, rankings: [], asOf: "x" });
    expect(empty.stats).toEqual([{ label: "CONTESTANTS", value: "48" }]);
  });

  it("결과 기사: CROWN SCORE 는 rank 1 행의 점수(행 순서와 무관) · 정수", () => {
    const shuffled = [...rankings].reverse();
    const d = buildResultDigest({ meta, rankings: shuffled, championId: "c1", asOf: "x", runsTotal: 10 });
    expect(d.stats.find((s) => s.label === "CROWN SCORE")?.value).toBe("812");
    expect(d.leaders.map((l) => l.rank)).toEqual([1, 2, 3]);
  });

  it("주간 기사: TOP MOMENTUM 없음 · ACTIVE TOURNAMENTS 남음 · 선두 = crownScore 큰 순", () => {
    expect(weeklyDigest.stats).toEqual([{ label: "ACTIVE TOURNAMENTS", value: "4" }]);
    // 900 · 900(제목 순 A < B) · 812 — 10 점은 빠진다.
    expect(weeklyDigest.leaders.map((l) => l.tournamentTitle)).toEqual(["A 대회", "B 대회", "여름 컴백 48"]);
    expect(weeklyDigest.leaders.map((l) => l.crownScore)).toEqual([900, 900, 812]);
    expect(weeklyDigest.runsTotal).toBeUndefined();
  });

  it("선두 행 키는 LEADER_KEYS 뿐", () => {
    for (const d of [resultDigest, weeklyDigest]) {
      for (const l of d.leaders) {
        for (const k of Object.keys(l)) expect(LEADER_KEYS).toContain(k);
      }
    }
  });

  it("rankingRowFromCache 는 허용된 8개 칸만 읽는다(D-108 순위점수율 더함)", () => {
    expect(rankingRowFromCache(cacheRows[0])).toEqual({
      rank: 1,
      contestantId: "c1",
      name: "블루 플레임",
      nameEn: "Blue Flame",
      crownScore: 812,
      placementRate: 0.77,
      winRate: 0.31,
      shareRate: 0.642,
    });
  });

  it("runsTotalFromCache — 정수만 · 없으면 undefined", () => {
    expect(runsTotalFromCache(cacheDoc)).toBe(2026);
    expect(runsTotalFromCache({})).toBeUndefined();
    expect(runsTotalFromCache(undefined)).toBeUndefined();
    expect(runsTotalFromCache({ runsTotal: "12" })).toBeUndefined();
    expect(runsTotalFromCache({ runsTotal: -1 })).toBeUndefined();
  });
});

describe("기사 숫자 허용 목록 — AI 재료(evidence 줄)", () => {
  it("캐시에 voteCount·rate·wins·appearances·picks·totalVotes 가 있어도 근거·AI 재료로 새지 않는다(순위점수율은 D-108부터 허용)", () => {
    const blob = [JSON.stringify(resultDigest), JSON.stringify(weeklyDigest), ...allPrompts].join("\n");
    for (const leak of ["1204", "61.2", "333", "4417", "2718", "5555", "7777", "88.8", "21.1", "999", "375"]) {
      expect(blob).not.toContain(leak);
    }
    // 1등 횟수 9 — 다른 숫자 속이 아니라 홀로 나오지 않는다.
    expect(evidenceLines(resultDigest)).not.toMatch(/(^|[^\d.])9([^\d.]|$)/);
  });

  it("AI 재료: 세 비율(순위점수율 · 우승율 · 선택율)은 Crown Score 와 같은 줄에만", () => {
    for (const d of [resultDigest, weeklyDigest]) {
      const lines = evidenceLines(d).split("\n");
      for (const line of lines) {
        if (/^\s+- \d+위 /.test(line) && /순위점수율|우승율|선택율/.test(line)) {
          expect(line).toMatch(/Crown Score \d+/);
        }
      }
    }
    expect(evidenceLines(resultDigest)).toContain(
      "  - 1위 블루 플레임 (공식 영어 이름: Blue Flame) Crown Score 812 · 순위점수율 77.0% · 우승율 31.0% · 선택율 64.2% (Champion)",
    );
    expect(evidenceLines(weeklyDigest)).toContain("  - 1위 와이 Crown Score 900 · 순위점수율 0.0% · 우승율 20.0% · 선택율 60.0% [A 대회]");
    expect(evidenceLines(resultDigest)).toContain("선두(차트 순위 · Crown Score · 순위점수율 · 우승율 · 선택율):");
  });

  it("AI 재료에 '대회 전체 참여 횟수' 줄 · '판' 낱말 없음", () => {
    const ev = evidenceLines(resultDigest);
    expect(ev).toContain("\n대회 전체 참여 횟수: 2026");
    expect(ev).not.toContain("판");
    // 주간 기사 · runsTotal 없는 결과 기사에는 이 줄이 없다.
    expect(evidenceLines(weeklyDigest)).not.toContain("참여 횟수");
    expect(evidenceLines(buildResultDigest({ meta, rankings, asOf: "x" }))).not.toContain("참여 횟수");
  });

  it("AI 재료에 옛 '선두(순위·비율)' 줄이 없다", () => {
    for (const p of allPrompts) expect(p).not.toContain("선두(순위·비율)");
  });
});

describe("기사 숫자 허용 목록 — AI 지시", () => {
  it("NUMBER_RULE_LINES 글자 그대로", () => {
    expect(NUMBER_RULE_LINES).toEqual([
      "   숫자는 허용 목록의 숫자만 쓴다: 엔트리 수 · 마감 날짜 · 지원 언어 · 카테고리 · 대회 종류 · 진행 중인 대회 수 · 순위 · Crown Score · 순위 변동 · Crown Score 변동 · 1위를 지킨 기간 · 참여 팬 수 · 대회 전체 참여 횟수 · 순위를 정하는 세 비율(순위점수율 · 우승율 · 선택율) · 순위와 관계없는 비율(외신 인용 등).",
      "   세 비율은 Crown Score 순위와 함께만 쓴다. Crown Score는 '얻었다'가 아니라 '기록했다'로 쓴다.",
      "   순위점수율을 쓸 때 설명이 필요하면 marketing/00_strategy/CROWN_SCORE_v1.1.md 의 정의를 따라 한 문장으로 붙인다 — 정의: 순위점수율 = (받은 순위 점수 합계 ÷ 대회 전체 판수) ÷ 10. 판마다 1등 10점 · 2등(결승에 오른 나머지 둘) 5점 · 3등(6강에서 멈춘 셋) 2점을 받으며, 매 판 1등이면 100%다.",
      "   세 비율을 정본이 아닌 이름(선택 비율 · 점유율 · 승률 · 득표율 · 1등 비율)으로 쓰지 않는다. 세 비율이 아닌 비율을 순위나 Crown Score를 정하거나 영향을 주는 것처럼 쓰지 않는다.",
      "   선택 수 · 득표수 · 1등 횟수 · 결승 오른 횟수 · 대결에 나온 횟수는 쓰지 않는다. 참여 횟수는 '판'이 아니라 '참여'로 쓴다.",
    ]);
  });

  it("AI 지시에 NUMBER_RULE_LINES 가 글자 그대로 · 옛 비율 지시 없음", () => {
    expect(NEWS_STYLE_GUIDE).toContain(NUMBER_RULE_LINES.join("\n"));
    for (const p of allPrompts) {
      expect(p).toContain(NUMBER_RULE_LINES.join("\n"));
      expect(p).not.toContain("비율·순위·참여 팬 수(Fan Count)만 쓴다");
      expect(p).not.toContain("비율(%)");
    }
    expect(resultPrompt).toContain("상위 순위를 Crown Score 순위로 전한다.");
    expect(buildWeeklyPrompt({ digest: weeklyDigest })).toContain(
      "주목받는 Contestant를 Crown Score 순위로 소개하고",
    );
  });
});

describe("기사 숫자 허용 목록 — 서버 그물(parseNewsDraftReply)", () => {
  const reply = (items: { n: string; l: string }[], extra: unknown[] = []) =>
    JSON.stringify({
      title: "제목",
      subhead: "부제",
      blocks: [{ type: "lead", text: "리드" }, { type: "stats", items }, ...extra],
    });

  it("그물: 61.2% 라벨 TOP RATE · '선택 수 1,204' 는 빠지고 '순위점수율 77%' · '우승율 31.0%' 는 남는다 · 비정본 '1등 비율'은 빠진다(D-108)", () => {
    const r = parseNewsDraftReply(
      reply([
        { n: "61.2%", l: "TOP RATE" },
        { n: "1,204", l: "선택 수" },
        { n: "77%", l: "순위점수율" },
        { n: "31.0%", l: "우승율" },
        { n: "31.0%", l: "1등 비율" },
        { n: "812", l: "CROWN SCORE" },
        { n: "48", l: "CONTESTANTS" },
      ]),
    );
    const stats = r.body.find((b) => b.type === "stats") as { items: { n: string; l: string }[] };
    expect(stats.items).toEqual([
      { n: "77%", l: "순위점수율" },
      { n: "31.0%", l: "우승율" },
      { n: "812", l: "CROWN SCORE" },
      { n: "48", l: "CONTESTANTS" },
    ]);
  });

  it("그물: 금지 낱말 · 허용 비율 낱말 아닌 % 는 버린다(3언어)", () => {
    const r = parseNewsDraftReply(
      reply([
        { n: "9", l: "1등 횟수" },
        { n: "2,026", l: "대회 전체 참여 횟수" },
        { n: "1,204", l: "VOTES" },
        { n: "40%", l: "Reach" },
        { n: "40%", l: "Alcance" },
        { n: "77%", l: "Placement score rate" },
        { n: "77%", l: "Tasa de puntuación por posición" },
        { n: "55%", l: "RUNNER-UP" },
        { n: "12%", l: "TOP MOMENTUM" },
        { n: "33%", l: "점유율" },
        { n: "33%", l: "선택율" },
        { n: "64.2%", l: "Share" },
        { n: "31.0%", l: "Victorias" },
        { n: "31.0%", l: "WINS" },
        { n: "31.0%", l: "CHAMPION RATE" },
        { n: "31.0%", l: "Tasa de campeón" },
        { n: "64.2%", l: "Cuota" },
        { n: "64.2%", l: "Picks" },
        { n: "64.2%", l: "Pick rate" },
        { n: "64.2%", l: "Tasa de elección" },
        { n: "64.2%", l: "선택 비율" },
        { n: "812", l: "CROWN SCORE" },
      ]),
    );
    const stats = r.body.find((b) => b.type === "stats") as { items: { n: string; l: string }[] };
    // D-108 · 결정 L(2026-11-28) — 세 비율 정본 이름(3언어)만 비율 낱말. 점유율 · 선택 비율 · Reach · Wins ·
    // Picks · Share / Alcance · Victorias · Elecciones · Cuota 는 버린다.
    expect(stats.items.map((it) => it.l)).toEqual([
      "Placement score rate",
      "Tasa de puntuación por posición",
      "선택율",
      "CHAMPION RATE",
      "Tasa de campeón",
      "Pick rate",
      "Tasa de elección",
      "CROWN SCORE",
    ]);
  });

  it("그물: 다 빠져 빈 stats 블록이 되면 블록째 버린다 · 본문 문장은 고치지 않는다", () => {
    const r = parseNewsDraftReply(
      reply([{ n: "61.2%", l: "TOP RATE" }], [{ type: "paragraph", text: "득표 61.2% 를 기록했다" }]),
    );
    expect(r.body.map((b) => b.type)).toEqual(["lead", "paragraph"]);
    expect(r.body[1]).toEqual({ type: "paragraph", text: "득표 61.2% 를 기록했다" });
  });
});

describe("기사 숫자 허용 목록 — 번역 용어 목록", () => {
  const input = {
    title: "제목",
    subhead: "부제",
    body: [{ type: "lead" as const, text: "우승율 31.0%" }],
    sourceLang: "ko" as const,
  };

  it("번역 용어 목록: 세 비율 — 3언어 정본 이름(D-108 · 결정 L)", () => {
    const en = buildArticleTranslatePrompt(input, "en");
    expect(en).toContain("  - 순위점수율 · Tasa de puntuación por posición → Placement score rate");
    expect(en).toContain("  - 우승율 · Tasa de campeón → Champion rate");
    expect(en).toContain("  - 선택율 · Tasa de elección → Pick rate");
    expect(en).toContain("  - Crown Score → Crown Score");
    const es = buildArticleTranslatePrompt(input, "es");
    expect(es).toContain("  - 순위점수율 · Placement score rate → Tasa de puntuación por posición");
    expect(es).toContain("  - 우승율 · Champion rate → Tasa de campeón");
    expect(es).toContain("  - 선택율 · Pick rate → Tasa de elección");
    expect(es).toContain("  - Crown Score → Crown Score");
    // ko 로 옮길 때는 싣지 않는다(한글이 정본).
    expect(buildArticleTranslatePrompt({ ...input, sourceLang: "en" }, "ko")).not.toContain("→ Champion rate");
  });

  it("번역 용어 목록의 낱말은 차트 설명창(chart.score.help)과 같다", () => {
    const src = readFileSync(join(process.cwd(), "..", "lib", "i18n", "messages.ts"), "utf8");
    const start = src.indexOf('"chart.score.help"');
    expect(start).toBeGreaterThan(-1);
    const block = src.slice(start, src.indexOf("},", start));
    const lang = (l: "ko" | "en" | "es") => {
      const s = block.indexOf(`${l}: [`);
      return block.slice(s, block.indexOf("].join", s));
    };
    // 설명창(§3)의 항목 줄은 "· 이름 — 뜻" 모양이다 — 세 비율 모두.
    for (const t of [CHART_RATE_TERMS.place, CHART_RATE_TERMS.win, CHART_RATE_TERMS.pick]) {
      expect(lang("ko")).toContain(`· ${t.ko} — `);
      expect(lang("en")).toContain(`· ${t.en} — `);
      expect(lang("es")).toContain(`· ${t.es} — `);
    }
  });
});

// ── Fix round 1 (검토 I-1 · M-1 · M-2 · M-3) ─────────────────────────────────────

describe("10판 기준 — 차트가 점수를 감추는 동안 기사도 점수를 쓰지 않는다", () => {
  it("MIN_RUNS_FOR_CHART 는 lib/ranking/rankState.ts 와 같은 값", () => {
    const src = readFileSync(join(process.cwd(), "..", "lib", "ranking", "rankState.ts"), "utf8");
    const m = src.match(/export const MIN_RUNS_FOR_CHART = (\d+);/);
    expect(m).not.toBeNull();
    expect(MIN_RUNS_FOR_CHART).toBe(Number(m![1]));
  });

  for (const runsTotal of [undefined, 0, 9]) {
    it(`결과 기사 runsTotal ${runsTotal}: CROWN SCORE 칸 없음 · 선두는 이름만 · 기다림 줄`, () => {
      const d = buildResultDigest({ meta, rankings, championId: "c1", asOf: "x", runsTotal });
      expect(d.stats).toEqual([{ label: "CONTESTANTS", value: "48" }]);
      for (const l of d.leaders) {
        expect(l).not.toHaveProperty("crownScore");
        expect(l).not.toHaveProperty("winRate");
        expect(l).not.toHaveProperty("shareRate");
      }
      const ev = evidenceLines(d);
      // 최종 검토 I-2: 차트가 순위를 감추는 동안 선두 줄은 이름(+Champion)만 — "N위" 없음.
      expect(ev).toContain("  - 블루 플레임 (공식 영어 이름: Blue Flame) (Champion)");
      expect(ev).not.toMatch(/^ {2}- \d+위/m);
      expect(ev).not.toMatch(/Crown Score \d|순위점수율 \d|우승율 \d|선택율 \d|812/);
      expect(ev).toContain(CHART_WAITING_LINE);
      expect(CHART_WAITING_LINE).toBe(
        "차트는 아직 참여가 적어 순위와 점수를 공개하지 않는다 — 순위 · Crown Score · 비율을 쓰지 않는다.",
      );
    });

    it(`결과 기사 프롬프트 runsTotal ${runsTotal}: 지시 · 재료에 순위 · Crown Score 순위 · % 없음`, () => {
      const d = buildResultDigest({ meta, rankings, championId: "c1", asOf: "x", runsTotal });
      const prompt = buildResultPrompt({
        title: "여름 컴백 48",
        championName: "블루 플레임",
        championNameEn: "Blue Flame",
        digest: d,
      });
      expect(prompt).toContain(TIO_KIND_SKILLS.result);
      expect(prompt).toContain(
          '[결과 기사] Tournament "여름 컴백 48"가 끝났고 Champion은 "블루 플레임"(공식 영어 이름 "Blue Flame")이다. ' +
          "차트는 아직 참여가 적어 순위와 점수를 쓰지 않는다.",
      );
      // 공통 층(사실표 · 문체 — 허용 목록 설명 "1위를 지킨 기간" 등)은 모든 기사에 같은 글이라 빼고 본다.
      const body = prompt.replace(TIO_FACT_SHEET, "").replace(NEWS_STYLE_GUIDE, "");
      expect(body).not.toMatch(/\d+위/);
      expect(body).not.toContain("Crown Score 순위");
      expect(body).not.toContain("%");
    });
  }

  it("결과 기사 runsTotal 0 · 점수 전부 0(전부 1위): 재료에 '1위' 줄이 없다", () => {
    const zero = rankings.map((r) => ({ ...r, rank: 1, crownScore: 0 }));
    const d = buildResultDigest({ meta, rankings: zero, championId: "c1", asOf: "x", runsTotal: 0 });
    const ev = evidenceLines(d);
    expect(ev).not.toMatch(/\d+위/);
    expect(d.leaders.length).toBeGreaterThan(1);
  });

  it("결과 기사 runsTotal 10: 지시 줄은 Crown Score 순위 그대로 · 선두 줄에 순위", () => {
    const d = buildResultDigest({ meta, rankings, championId: "c1", asOf: "x", runsTotal: 10 });
    const prompt = buildResultPrompt({ title: "여름 컴백 48", championName: "블루 플레임", digest: d });
    expect(prompt).toContain(TIO_KIND_SKILLS.result);
    expect(prompt).toContain("이다. 상위 순위를 Crown Score 순위로 전한다.");
    expect(prompt).toMatch(/^ {2}- 1위 블루 플레임/m);
  });

  it("결과 기사 runsTotal 10: 점수가 실리고 기다림 줄 없음", () => {
    const d = buildResultDigest({ meta, rankings, championId: "c1", asOf: "x", runsTotal: 10 });
    expect(d.stats.map((s) => s.label)).toEqual(["CONTESTANTS", "CROWN SCORE"]);
    expect(evidenceLines(d)).not.toContain(CHART_WAITING_LINE);
    expect(evidenceLines(d)).toContain("Crown Score 812 · 순위점수율 77.0% · 우승율 31.0%");
  });

  it("주간 기사: runsTotal 10 미만(또는 없음) 대회는 선두에서 빠지고 ACTIVE TOURNAMENTS 에는 센다", () => {
    const d = buildWeeklyDigest({
      caches: [
        { tournamentId: "a", title: "적은 대회", rankings, runsTotal: 9 },
        { tournamentId: "b", title: "모르는 대회", rankings },
        { tournamentId: "c", title: "충분한 대회", rankings, runsTotal: 10 },
      ],
      asOf: "x",
    });
    expect(d.stats).toEqual([{ label: "ACTIVE TOURNAMENTS", value: "3" }]);
    expect(d.leaders.map((l) => l.tournamentTitle)).toEqual(["충분한 대회"]);
  });
});

describe("서버 그물 — 선택 수 3언어 · 횟수 칸 · 비율은 CROWN SCORE 칸과 함께만", () => {
  const statsOf = (items: { n: string; l: string }[]) => {
    const r = parseNewsDraftReply(
      JSON.stringify({ title: "t", subhead: "s", blocks: [{ type: "lead", text: "x" }, { type: "stats", items }] }),
    );
    const b = r.body.find((x) => x.type === "stats") as { items: { n: string; l: string }[] } | undefined;
    return b ? b.items.map((it) => it.l) : [];
  };

  it("Votos · Voto · Votes · 득표 · 선택 수 라벨은 버린다", () => {
    expect(
      statsOf([
        { n: "1.204", l: "Votos" },
        { n: "1", l: "Voto" },
        { n: "1,204", l: "Votes" },
        { n: "1,204", l: "득표" },
        { n: "1,204", l: "선택 수" },
        { n: "812", l: "CROWN SCORE" },
      ]),
    ).toEqual(["CROWN SCORE"]);
  });

  it("비율 낱말 라벨인데 값에 % 가 없으면 버린다 · 9회 · 9 times · veces 는 버린다", () => {
    expect(
      statsOf([
        { n: "2,718", l: "선택율" },
        { n: "9회", l: "우승율" },
        { n: "9", l: "Tasa de campeón" },
        { n: "3회", l: "결승 진출" },
        { n: "9 times", l: "Champion" },
        { n: "9 veces", l: "Campeón" },
        { n: "31.0%", l: "우승율" },
        { n: "812", l: "CROWN SCORE" },
      ]),
    ).toEqual(["우승율", "CROWN SCORE"]);
  });

  it("같은 stats 블록에 CROWN SCORE(또는 Crown Score 라벨) 칸이 없으면 비율 칸을 버린다", () => {
    expect(
      statsOf([
        { n: "31.0%", l: "우승율" },
        { n: "48", l: "CONTESTANTS" },
      ]),
    ).toEqual(["CONTESTANTS"]);
    expect(
      statsOf([
        { n: "64.2%", l: "Pick rate" },
        { n: "812", l: "Crown Score · 1위" },
      ]),
    ).toEqual(["Pick rate", "Crown Score · 1위"]);
  });
});

describe("en·es 원문 초안에도 차트 낱말 3언어", () => {
  it("AI 지시에 3언어 낱말 줄이 한 번 있다", () => {
    expect(CHART_TERM_RULE_LINE).toBe(
      "   순위점수율 · 우승율 · 선택율은 영어로 Placement score rate · Champion rate · Pick rate, 스페인어로 Tasa de puntuación por posición · Tasa de campeón · Tasa de elección 로 쓴다(차트 설명창과 같은 말).",
    );
    for (const p of allPrompts) {
      expect(p.split(CHART_TERM_RULE_LINE)).toHaveLength(2);
    }
  });
});
