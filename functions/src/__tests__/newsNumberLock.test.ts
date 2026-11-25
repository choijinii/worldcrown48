/**
 * T5 PR 2 · 기사 숫자 허용 목록 잠금 시험 (대표 확정 2026-11-25).
 *
 * 기준 = 계획서 docs/superpowers/plans/2026-11-25-t5-incremental-ranking.md
 * "기사 숫자 허용 목록" 절. 근거(digest) · AI 재료(evidence 줄) · AI 지시 · 서버 그물 ·
 * 번역 용어 표가 그 목록을 벗어나면 이 시험이 실패한다.
 *
 * 쓸 수 없는 것: 엔트리별 선택 수(voteCount) · 대회 전체 선택 수(totalVotes) · 옛 rate ·
 * 1등 횟수 · 결승 오른 횟수 · 대결에 나온 횟수 · 순위 점수 합계 · 순위점수율(placementRate).
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
    { tournamentId: "t1", title: "여름 컴백 48", rankings },
    {
      tournamentId: "t2",
      title: "B 대회",
      rankings: [rankingRowFromCache({ rank: 1, contestantId: "x", name: "엑스", crownScore: 900, winRate: 0.4, shareRate: 0.7, rate: 88.8 })],
    },
    {
      tournamentId: "t3",
      title: "A 대회",
      rankings: [rankingRowFromCache({ rank: 1, contestantId: "y", name: "와이", crownScore: 900, winRate: 0.2, shareRate: 0.6 })],
    },
    {
      tournamentId: "t4",
      title: "C 대회",
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
    const d = buildResultDigest({ meta, rankings: shuffled, championId: "c1", asOf: "x" });
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

  it("rankingRowFromCache 는 허용된 7개 칸만 읽는다", () => {
    expect(rankingRowFromCache(cacheRows[0])).toEqual({
      rank: 1,
      contestantId: "c1",
      name: "블루 플레임",
      nameEn: "Blue Flame",
      crownScore: 812,
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
  it("캐시에 voteCount·rate·placementRate·wins·appearances·picks·totalVotes 가 있어도 근거·AI 재료로 새지 않는다", () => {
    const blob = [JSON.stringify(resultDigest), JSON.stringify(weeklyDigest), ...allPrompts].join("\n");
    for (const leak of ["1204", "61.2", "0.77", "77.0", "77.1", "77.2", "333", "4417", "2718", "5555", "7777", "88.8", "21.1", "999", "375"]) {
      expect(blob).not.toContain(leak);
    }
    // 1등 횟수 9 — 다른 숫자 속이 아니라 홀로 나오지 않는다.
    expect(evidenceLines(resultDigest)).not.toMatch(/(^|[^\d.])9([^\d.]|$)/);
  });

  it("AI 재료: 1등 비율·선택 비율은 Crown Score 와 같은 줄에만", () => {
    for (const d of [resultDigest, weeklyDigest]) {
      const lines = evidenceLines(d).split("\n");
      for (const line of lines) {
        if (/^\s+- \d+위 /.test(line) && /1등 비율|선택 비율/.test(line)) {
          expect(line).toMatch(/Crown Score \d+/);
        }
      }
    }
    expect(evidenceLines(resultDigest)).toContain(
      "  - 1위 블루 플레임 (공식 영어 이름: Blue Flame) Crown Score 812 · 1등 비율 31.0% · 선택 비율 64.2% (Champion)",
    );
    expect(evidenceLines(weeklyDigest)).toContain("  - 1위 와이 Crown Score 900 · 1등 비율 20.0% · 선택 비율 60.0% [A 대회]");
    expect(evidenceLines(resultDigest)).toContain("선두(차트 순위 · Crown Score · 1등 비율 · 선택 비율):");
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
      "   숫자는 허용 목록의 숫자만 쓴다: 엔트리 수 · 마감 날짜 · 지원 언어 · 카테고리 · 대회 종류 · 진행 중인 대회 수 · 순위 · Crown Score · 순위 변동 · Crown Score 변동 · 1위를 지킨 기간 · 1등 비율 · 선택 비율 · 참여 팬 수 · 대회 전체 참여 횟수.",
      "   1등 비율과 선택 비율은 Crown Score 순위와 함께만 쓴다. Crown Score는 '얻었다'가 아니라 '기록했다'로 쓴다.",
      "   선택 수 · 득표수 · 1등 횟수 · 결승 오른 횟수 · 대결에 나온 횟수 · 순위점수율은 쓰지 않는다. 참여 횟수는 '판'이 아니라 '참여'로 쓴다.",
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

  it("그물: 61.2% 라벨 TOP RATE · '선택 수 1,204' · '순위점수율 77%' 항목은 빠지고 '1등 비율 31.0%' 는 남는다", () => {
    const r = parseNewsDraftReply(
      reply([
        { n: "61.2%", l: "TOP RATE" },
        { n: "1,204", l: "선택 수" },
        { n: "77%", l: "순위점수율" },
        { n: "31.0%", l: "1등 비율" },
        { n: "812", l: "CROWN SCORE" },
        { n: "48", l: "CONTESTANTS" },
      ]),
    );
    const stats = r.body.find((b) => b.type === "stats") as { items: { n: string; l: string }[] };
    expect(stats.items).toEqual([
      { n: "31.0%", l: "1등 비율" },
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
        { n: "55%", l: "RUNNER-UP" },
        { n: "12%", l: "TOP MOMENTUM" },
        { n: "33%", l: "점유율" },
        { n: "64.2%", l: "Picks" },
        { n: "31.0%", l: "Victorias" },
        { n: "31.0%", l: "WINS" },
        { n: "64.2%", l: "Elecciones" },
        { n: "64.2%", l: "선택 비율" },
      ]),
    );
    const stats = r.body.find((b) => b.type === "stats") as { items: { n: string; l: string }[] };
    expect(stats.items.map((it) => it.l)).toEqual(["Picks", "Victorias", "WINS", "Elecciones", "선택 비율"]);
  });

  it("그물: 다 빠져 빈 stats 블록이 되면 블록째 버린다 · 본문 문장은 고치지 않는다", () => {
    const r = parseNewsDraftReply(
      reply([{ n: "61.2%", l: "TOP RATE" }], [{ type: "paragraph", text: "득표 61.2% 를 기록했다" }]),
    );
    expect(r.body.map((b) => b.type)).toEqual(["lead", "paragraph"]);
    expect(r.body[1]).toEqual({ type: "paragraph", text: "득표 61.2% 를 기록했다" });
  });
});

describe("기사 숫자 허용 목록 — 번역 용어 표", () => {
  const input = {
    title: "제목",
    subhead: "부제",
    body: [{ type: "lead" as const, text: "1등 비율 31.0%" }],
    sourceLang: "ko" as const,
  };

  it("번역 용어 표: Wins/Picks · Victorias/Elecciones", () => {
    const en = buildArticleTranslatePrompt(input, "en");
    expect(en).toContain("  - 1등 비율 → Wins");
    expect(en).toContain("  - 선택 비율 → Picks");
    expect(en).toContain("  - Crown Score → Crown Score");
    const es = buildArticleTranslatePrompt(input, "es");
    expect(es).toContain("  - 1등 비율 · Wins → Victorias");
    expect(es).toContain("  - 선택 비율 · Picks → Elecciones");
    expect(es).toContain("  - Crown Score → Crown Score");
    // ko 로 옮길 때는 싣지 않는다(한글이 정본).
    expect(buildArticleTranslatePrompt({ ...input, sourceLang: "en" }, "ko")).not.toContain("→ Wins");
  });

  it("번역 용어 표의 낱말은 차트 설명창(chart.score.help)과 같다", () => {
    const src = readFileSync(join(process.cwd(), "..", "lib", "i18n", "messages.ts"), "utf8");
    const start = src.indexOf('"chart.score.help"');
    expect(start).toBeGreaterThan(-1);
    const block = src.slice(start, src.indexOf("},", start));
    const lang = (l: "ko" | "en" | "es") => {
      const s = block.indexOf(`${l}: [`);
      return block.slice(s, block.indexOf("].join", s));
    };
    for (const t of [CHART_RATE_TERMS.win, CHART_RATE_TERMS.pick]) {
      expect(lang("ko")).toContain(`· ${t.ko} `);
      expect(lang("en")).toContain(`· ${t.en} `);
      expect(lang("es")).toContain(`· ${t.es} `);
    }
  });
});
