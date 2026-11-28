/**
 * NEWS-1 · 5층 생성 뒤 검사 (결정 G) — 경고만 남기고 발행을 막지 않는다.
 * 검사 1 금지 낱말(3언어 · 대표 승인 목록 2026-11-27) · 검사 2 사실과 다른 숫자 · 검사 3 허용 목록 밖 퍼센트.
 */
import { describe, expect, it } from "vitest";
import { checkDraftText, findForbidden, findRateClaims, findRateNames, findWrongNumbers } from "../core/newsCheck";
import type { ArticleBlock } from "../_news/articleDoc";

const words = (lang: "ko" | "en" | "es", s: string) => findForbidden(lang, s);

describe("검사 1 금지 낱말", () => {
  it.each([
    ["ko", "팬들의 투표가 몰렸다", "투표"],
    ["ko", "48개 팀의 애정 전쟁 시작", "전쟁"],
    ["ko", "참가자 48명이 모였다", "참가자"],
    ["ko", "단 1표 차이", "표"],
    ["ko", "표를 던졌다", "표"],
    ["ko", "첫 경기부터 뜨겁다", "경기"],
    ["ko", "월드컵처럼 뜨겁다", "월드컵"],
    ["ko", "왕좌를 노린다", "왕좌"],
    ["en", "Fans cast their votes", "votes"],
    ["en", "48 candidates on one stage", "candidates"],
    ["en", "the battle begins", "battle"],
    ["en", "a fan war", "war"],
    ["en", "Official ranking", "Official"],
    ["en", "like the World Cup", "World Cup"],
    ["es", "los votos de los fans", "votos"],
    ["es", "48 candidatos", "candidatos"],
    ["es", "una guerra de cariño", "guerra"],
    ["es", "la batalla final", "batalla"],
    ["es", "como el Mundial", "Mundial"],
  ] as const)("%s 「%s」 → %s", (lang, s, hit) => {
    expect(words(lang, s)).toContain(hit);
  });

  it.each([
    ["ko", "대표 그룹이 신곡을 발표하며 표시된 순위"],
    ["ko", "이상형 월드컵 방식으로 고른다"],
    ["ko", "ROUND OF 48의 Match 24개에서 팬의 선택이 이어졌다"],
    ["ko", "경기도 출신 아티스트"],
    ["en", "the official music video"],
    ["en", "fans keep choosing"],
    ["en", "a warm welcome"],
    ["es", "el video oficial"],
    ["es", "los fans eligen"],
  ] as const)("%s 「%s」 → 안 걸림", (lang, s) => {
    expect(words(lang, s)).toEqual([]);
  });
});

describe("검사 2 사실과 다른 숫자", () => {
  it.each([
    "첫 라운드는 48개 팀이 16경기로 나뉘어",
    "16강에 오른 팀",
    "8강 진출",
    "ROUND OF 16 begins",
    "the QUARTERFINAL round",
    "SEMIFINAL",
    "참가 엔트리 48명",
    "48 entries split into 16 matches",
    "ROUND OF 48의 Match 16개",
  ])("「%s」 → 잡힘", (s) => {
    expect(findWrongNumbers(s).length).toBeGreaterThan(0);
  });

  it.each([
    "ROUND OF 48의 Match 24개",
    "ROUND OF 24(Match 12개)를 지나",
    "48 entries meet in 24 Matches",
    "엔트리 48개가 한 무대에",
    "ROUND OF 6의 Match 3개",
    "THE FINAL에서 셋 중 하나",
  ])("「%s」 → 통과", (s) => {
    expect(findWrongNumbers(s)).toEqual([]);
  });
});

describe("검사 3 순위와 연결된 비정본 이름(대표 2026-11-28 · 옛 퍼센트 검사를 대신함)", () => {
  it.each([
    ["ko", "점유율 64.2%로 1위", "점유율"],
    ["ko", "선택 비율이 가장 높았다", "선택 비율"],
    ["ko", "승률 15%", "승률"],
    ["ko", "1등 비율 31.0%", "1등 비율"],
    ["ko", "점유률 71.8%", "점유률"],
    ["ko", "선택률 64.2%로 1위", "선택률"],
    ["ko", "우승률 31.0%", "우승률"],
    ["ko", "순위점수률 77%", "순위점수률"],
    ["en", "a vote rate of 60%", "vote rate"],
    ["es", "una tasa de votos del 60 %", "tasa de votos"],
  ] as const)("(가) %s 「%s」 → rate_name %s", (lang, s, hit) => {
    expect(findRateNames(lang, s)).toContain(hit);
  });

  it.each([
    ["ko", "순위를 결정한 화제율 30%", "화제율"],
    ["ko", "조회율이 Crown Score를 끌어올렸다", "조회율"],
    ["en", "an engagement rate that decided the ranking", "engagement rate"],
    ["es", "la tasa de audiencia que determinó la clasificación", "tasa de audiencia"],
  ] as const)("(나) %s 「%s」 → rate_claim %s", (lang, s, hit) => {
    expect(findRateClaims(lang, s)).toContain(hit);
  });

  it.each([
    ["ko", "인도 크리에이터의 멤버십 수익은 전년 동기 대비 25% 넘게 늘었다."],
    ["ko", "집계에서 이용자의 85%는 해외 팬으로 나타났다."],
    ["ko", "선택율 64.2% · 우승율 31.0% · 순위점수율 77.0%로 1위를 지켰다."],
    ["ko", "순위점수율이 순위를 끌어올렸다."],
    ["en", "revenue rose more than 25% year on year"],
    ["es", "el 85 % de los usuarios eran fans del extranjero"],
    // RATE-1 결정 L — 영어 · 스페인어 정본 이름(여러 낱말)은 통과 · 보통 낱말 picks · elecciones 도 통과
    ["en", "A Pick rate of 64.2% and a Champion rate of 31.0% kept them No. 1."],
    ["en", "Their Placement score rate of 77% pushed the Crown Score to 812."],
    ["en", "Crown Score is rated out of 1,000 — shaped entirely by fans' picks."],
    ["en", "Fans' picks decided the ranking."],
    ["es", "Una Tasa de elección del 64,2 % y una Tasa de campeón del 31,0 % lo mantuvieron n.º 1."],
    ["es", "La Tasa de puntuación por posición del 77 % impulsó la clasificación."],
    ["es", "Crown Score va de 0 a 1000 y lo deciden las elecciones de los fans."],
  ] as const)("순위와 관계없는 퍼센트 · 정본 이름은 통과 — %s 「%s」", (lang, s) => {
    expect(findRateNames(lang, s)).toEqual([]);
    expect(findRateClaims(lang, s)).toEqual([]);
  });

  // RATE-1 결정 L(대표 2026-11-28) — 옛 화면 낱말 · 11/27 안은 정본이 아니다. 비율 자리(퍼센트 옆)에서만 잡는다.
  it.each([
    ["en", "Reach 40%", "Reach"],
    ["en", "Wins of 31.0%", "Wins"],
    ["en", "64.2% Picks", "Picks"],
    ["en", "a Share of 64.2%", "Share"],
    ["en", "a win rate of 31%", "win rate"],
    ["en", "a share rate of 64%", "share rate"],
    ["es", "Alcance 40 %", "Alcance"],
    ["es", "Victorias del 31,0 %", "Victorias"],
    ["es", "64,2 % de Elecciones", "Elecciones"],
    ["es", "una Cuota del 64,2 %", "Cuota"],
    ["es", "una tasa de victorias del 31 %", "tasa de victorias"],
  ] as const)("(가) 결정 L 비정본 %s 「%s」 → rate_name %s", (lang, s, hit) => {
    expect(findRateNames(lang, s)).toContain(hit);
  });
});

it("숫자 칸 라벨이 비정본 이름 그대로면 rate_name(en · es)", () => {
  const w = checkDraftText({
    title: { ko: "", en: "", es: "" },
    subhead: { ko: "", en: "", es: "" },
    body: {
      ko: [],
      en: [{ type: "stats", items: [{ n: "64.2%", l: "PICKS" }, { n: "64.2%", l: "Pick rate" }] }],
      es: [{ type: "stats", items: [{ n: "64,2 %", l: "Cuota" }, { n: "64,2 %", l: "Tasa de elección" }] }],
    },
  } as never);
  expect(w.filter((x) => x.rule === "rate_name").map((x) => `${x.lang}:${x.match}`)).toEqual(["en:PICKS", "es:Cuota"]);
});

describe("checkDraftText — 제목 · 부제 · 본문 3언어", () => {
  const body = (text: string): ArticleBlock[] => [
    { type: "lead", text },
    { type: "stats", items: [{ n: "48", l: "엔트리" }] },
    { type: "closer", text: "끝" },
  ];
  it("합격선 — 「16경기」 · 「애정 전쟁」 · 「투표」 셋 다 잡힘(자리 · 언어 포함)", () => {
    const w = checkDraftText({
      title: { ko: "48개 팀의 애정 전쟁 시작", en: "Love war", es: "Guerra" },
      subhead: { ko: "팬들의 투표", en: "", es: "" },
      body: { ko: body("첫 라운드는 48개 팀이 16경기로 나뉘어"), en: body("fans"), es: body("fans") },
    });
    expect(w).toEqual(
      expect.arrayContaining([
        { rule: "forbidden_word", lang: "ko", field: "title", match: "전쟁" },
        { rule: "forbidden_word", lang: "ko", field: "subhead", match: "투표" },
        { rule: "wrong_number", lang: "ko", field: "body.0", match: expect.stringContaining("16") },
        { rule: "forbidden_word", lang: "en", field: "title", match: "war" },
        { rule: "forbidden_word", lang: "es", field: "title", match: "Guerra" },
      ]),
    );
  });
  it("맞는 글은 경고 0", () => {
    const ok = body("ROUND OF 48의 Match 24개, 팬의 선택이 시작됐다.");
    expect(
      checkDraftText({ title: { ko: "설렘의 첫날", en: "First day", es: "Primer día" }, subhead: { ko: "", en: "", es: "" }, body: { ko: ok, en: ok, es: ok } }),
    ).toEqual([]);
  });
  it("matchups · hero · stats 라벨도 본다", () => {
    const w = checkDraftText({
      title: { ko: "제목", en: "t", es: "t" },
      subhead: { ko: "", en: "", es: "" },
      body: {
        ko: [
          { type: "hero", kicker: "배틀", title: "t", subtitle: "s" },
          { type: "matchups", pairs: [], note: "앙숙의 만남" },
        ],
        en: [],
        es: [],
      },
    });
    expect(w.map((x) => [x.field, x.match])).toEqual([
      ["body.0", "배틀"],
      ["body.1", "앙숙"],
    ]);
  });
});

describe("checkDraftText — 퍼센트 경고 없음 · 비정본 이름 경고(대표 2026-11-28)", () => {
  const one = (ko: string) => ({ title: { ko: "제목", en: "t", es: "t" }, subhead: { ko: "", en: "", es: "" }, body: { ko: [{ type: "lead" as const, text: ko }], en: [], es: [] } });
  it("외신 인용 퍼센트는 경고 0", () => {
    expect(checkDraftText(one("수익은 전년보다 25% 넘게 늘었고, 이용자의 85%는 해외 팬이었다."))).toEqual([]);
  });
  it("점유율 → rate_name · 순위를 결정한 화제율 → rate_claim", () => {
    expect(checkDraftText(one("점유율 64.2%. 순위를 결정한 화제율 30%."))).toEqual([
      { rule: "rate_name", lang: "ko", field: "body.0", match: "점유율" },
      { rule: "rate_claim", lang: "ko", field: "body.0", match: "화제율" },
    ]);
  });
});

it("비정본 철자가 순위 문장에 있어도 경고는 rate_name 하나(rate_claim 으로 겹치지 않음)", () => {
  expect(findRateClaims("ko", "선택률이 순위를 결정했다.")).toEqual([]);
  expect(findRateNames("ko", "선택률이 순위를 결정했다.")).toEqual(["선택률"]);
});
