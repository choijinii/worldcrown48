/**
 * PRESS-1 PR 1 · 3-2 — TIO 지시문(킥 v0.1 4절 전문 · 기사 뼈대 · 금지 낱말 · 최근 24시간 · 키워드 목록 · 3언어 JSON).
 */
import { describe, expect, it } from "vitest";
import { PRESS_KEYWORD_MEANING, PRESS_WRITING_RULES, buildPressPrompt } from "../core/pressPrompt";
import { PRESS_PHOTO_KEYWORDS } from "../_news/articleDoc";
import { FORBIDDEN_WAR_WORDS } from "../core/newsPrompts";

const KICK_V01_SECTION4 = [
  "사실(누가 · 무엇 · 언제 · 몇 위)만 가져오고, 남의 문장 · 표현 · 구성은 옮기지 않는다.",
  '서로 다른 매체 두 곳 이상에서 확인된 사실로 쓴다. 한 곳에만 있으면 "○○ 보도에 따르면"으로 밝힌다.',
  "따옴표 인용은 기사당 1~2개, 한 줄 이내.",
  '차트 인용(빌보드 등)은 필요한 순위 몇 개만 "빌보드 ○○ 차트(○월 ○일자) ○위" + 원문 링크. 차트 전체를 옮겨 싣지 않는다.',
  "확인 안 된 것 · 소문 · 사생활 · 추측은 쓰지 않는다. 날짜와 숫자는 출처와 대조.",
  "중국발 출처는 검증을 거쳐서만 쓴다(대표 소통 규칙 10).",
  "월크48 낱말 규칙 · 기사 뼈대(1절 11 · 12) 그대로.",
];

describe("PRESS_WRITING_RULES", () => {
  it("킥 v0.1 4절 일곱 줄을 글자 그대로 담는다", () => {
    for (const line of KICK_V01_SECTION4) expect(PRESS_WRITING_RULES).toContain(line);
  });
});

describe("buildPressPrompt", () => {
  const p = buildPressPrompt({ category: "kpop", todayKst: "2026-11-27" });

  it("쓰기 규칙 · 기사 뼈대(훅 · 사실 · 끝 한 줄) · 최근 24시간 · 오늘 날짜", () => {
    expect(p).toContain(PRESS_WRITING_RULES);
    expect(p).toMatch(/훅/);
    expect(p).toMatch(/끝 한 줄/);
    expect(p).toContain("최근 24시간");
    expect(p).toContain("2026-11-27");
  });

  it("금지 낱말(LANGUAGE.md) + 전투 은유 금지어를 모두 적는다", () => {
    for (const w of ["표", "투표", "참가자", "후보자", "48명", "FIFA", ...FORBIDDEN_WAR_WORDS]) {
      expect(p).toContain(w);
    }
  });

  it("그 분야의 키워드 목록만 적고 하나만 고르라고 한다", () => {
    for (const k of PRESS_PHOTO_KEYWORDS.kpop) expect(p).toContain(`${k}(`);
    expect(p).not.toContain("revenue");
    expect(p).toMatch(/하나만/);
    const c = buildPressPrompt({ category: "creator", todayKst: "2026-11-27" });
    for (const k of PRESS_PHOTO_KEYWORDS.creator) expect(c).toContain(`${k}(`);
    expect(c).not.toContain("reverse-run");
  });

  it("사생활 주제는 고르지 않는다 — 대표 문장(2026-11-26) 글자 그대로", () => {
    const rule =
      "열애 · 결혼 · 이혼 · 건강 · 가족 같은 사생활 소식은 기사의 주제로 고르지 않는다. 음악 · 활동 · 기록 · 사업 소식을 주제로 고른다. 다만 그런 기사 안에서, 본인이 공개 발표한 사실을 배경 설명으로 한두 문장 언급하는 것은 된다.";
    expect(p).toContain(rule);
    expect(buildPressPrompt({ category: "creator", todayKst: "2026-11-27" })).toContain(rule);
  });

  it("키워드마다 뜻(킥 v0.2 키워드 폴더 표)을 붙이고 · 기사 중심 소식과 맞을 때만 고르게 한다", () => {
    for (const cat of ["kpop", "creator"] as const) {
      const q = buildPressPrompt({ category: cat, todayKst: "2026-11-27" });
      for (const k of PRESS_PHOTO_KEYWORDS[cat]) {
        expect(PRESS_KEYWORD_MEANING[k], `${k} 뜻 없음`).toBeTruthy();
        expect(q).toContain(`${k}(${PRESS_KEYWORD_MEANING[k]})`);
      }
    }
    expect(PRESS_KEYWORD_MEANING["reverse-run"]).toBe("역주행");
    expect(PRESS_KEYWORD_MEANING.record).toBe("조회수·기록");
    expect(p).toMatch(/중심 소식/);
    expect(p).toMatch(/default/);
  });

  it("3언어(ko · en · es) JSON 과 출처(검색 결과 주소만)를 요구한다", () => {
    for (const k of ['"ko"', '"en"', '"es"', '"sources"', '"photoKeyword"']) expect(p).toContain(k);
    expect(p).toMatch(/검색 결과/);
  });

  it("다시 쓰기면 옛 본문 · 옛 출처 · 고칠 점을 함께 준다", () => {
    const r = buildPressPrompt({
      category: "creator",
      todayKst: "2026-11-27",
      rewrite: {
        oldTitle: "옛 제목",
        oldText: "옛 본문 한 줄",
        oldSources: [{ outlet: "BBC", title: "기사", url: "https://bbc.com/a", readAt: "2026-11-27" }],
        note: "첫 문장을 더 짧게",
      },
    });
    expect(r).toContain("옛 제목");
    expect(r).toContain("옛 본문 한 줄");
    expect(r).toContain("https://bbc.com/a");
    expect(r).toContain("첫 문장을 더 짧게");
  });
});
