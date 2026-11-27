/**
 * NEWS-1 · 5층 생성 뒤 검사 (결정 G) — 경고만 남기고 발행을 막지 않는다.
 * 검사 1 금지 낱말(3언어 · 대표 승인 목록 2026-11-27) · 검사 2 사실과 다른 숫자 · 검사 3 허용 목록 밖 퍼센트.
 */
import { describe, expect, it } from "vitest";
import { checkDraftText, findForbidden, findWrongNumbers, findStrayPercents } from "../core/newsCheck";
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

describe("검사 3 허용 목록 밖 퍼센트", () => {
  it("비율 낱말이 없는 문장의 퍼센트는 잡힌다", () => {
    expect(findStrayPercents("팬의 71.8%가 이 곡을 골랐다.")).toEqual(["71.8%"]);
  });
  it("1등 비율 · 점유율 · Wins · Picks 와 같은 문장이면 통과", () => {
    expect(findStrayPercents("Crown Score 812, 점유율 64.2%를 기록했다.")).toEqual([]);
    expect(findStrayPercents("1등 비율 31.0%로 앞섰다.")).toEqual([]);
    expect(findStrayPercents("Wins 31.0% and Picks 64.2%.")).toEqual([]);
  });
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
