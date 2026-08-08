/**
 * ND-1 §3 #3 / §5.5 — newsPrompts: 4종 템플릿 프롬프트. AC 9.
 *
 * The §5.5 작성 지침 6항 + 전투 은유 금지어는 4종 프롬프트 전부의 시스템 프롬프트에
 * 박제되어야 한다. These tests prove each guidance item and every forbidden war-word
 * is physically present in each of the four prompt strings (existence검증).
 */
import { describe, expect, it } from "vitest";
import {
  buildOpenPrompt,
  buildResultPrompt,
  buildWeeklyPrompt,
  buildColumnPrompt,
  NEWS_STYLE_GUIDE,
  FORBIDDEN_WAR_WORDS,
} from "../core/newsPrompts";
import { UNTRANSLATABLE_PROPER_NOUNS } from "../core/displayTerms";

const digestStub = {
  asOf: "2026-07-22 08:00 KST",
  stats: [{ label: "CONTESTANTS", value: "48" }],
  leaders: [],
  tournamentId: "t1",
};

const prompts: Record<string, string> = {
  open: buildOpenPrompt({ title: "여름 48", category: "KPOP", digest: digestStub }),
  result: buildResultPrompt({
    title: "여름 48",
    championName: "Blue Flame",
    digest: { ...digestStub, leaders: [{ rank: 1, name: "Blue Flame", rate: 33.3, isChampion: true }] },
  }),
  weekly: buildWeeklyPrompt({ digest: { ...digestStub, leaders: [] } }),
  column: buildColumnPrompt({ topic: "여름 플레이리스트의 심리학", digest: digestStub }),
};

describe("§5.5 지침 7항 — 4종 프롬프트 전부에 박제 (AC 9)", () => {
  // Each guidance item leaves a distinctive fingerprint the prompt must carry.
  const GUIDANCE_MARKERS = [
    "사용설명 금지", // 1
    "훅 필수", // 2
    "비주얼 병행", // 3
    "정서적 클로저", // 4
    "축제의 언어", // 5
    "Vote Count", // 6 (절대 득표수 금지)
    "킥 비트", // 7 (클로저 직전 반전·콜백·의외의 강조)
  ];

  for (const [name, prompt] of Object.entries(prompts)) {
    it(`${name} 프롬프트가 지침 7항 마커를 모두 포함한다`, () => {
      for (const marker of GUIDANCE_MARKERS) {
        expect(prompt).toContain(marker);
      }
    });

    it(`${name} 프롬프트가 전투 은유 금지어를 모두 나열한다`, () => {
      for (const word of FORBIDDEN_WAR_WORDS) {
        expect(prompt).toContain(word);
      }
    });

    it(`${name} 프롬프트가 구조화 블록 JSON 출력을 지시한다`, () => {
      expect(prompt).toMatch(/JSON/);
      expect(prompt).toMatch(/blocks/);
    });
  }
});

describe("표시 용어(Display Term) 층 — 독자 지칭은 팬/Fan (2026-08-06 대표 확정)", () => {
  // LANGUAGE.md §1 표시 용어: 코드·DB의 Voter는 불변, 독자에게 보이는 지칭만 팬/Fan.
  const DISPLAY_TERM_MARKERS = [
    "표시 용어", // 층 자체의 이름
    '"팬"', // ko 지칭
    "fan", // en·es 지칭
    "참여 팬 수(Fan Count)", // Voter Count 의 기사 표기
  ];

  for (const [name, prompt] of Object.entries(prompts)) {
    it(`${name} 프롬프트가 표시 용어 지침을 담는다`, () => {
      for (const marker of DISPLAY_TERM_MARKERS) {
        expect(prompt).toContain(marker);
      }
    });
  }

  it("Voter Count 를 기사 지표 표기로 지시하지 않는다", () => {
    expect(NEWS_STYLE_GUIDE).not.toContain("Voter Count");
  });

  it("Voter 는 '쓰지 않는다' 금지 지시로만 등장한다", () => {
    // 프롬프트에서 Voter 가 나오는 유일한 자리 = 독자 노출 금지 지시.
    expect(NEWS_STYLE_GUIDE).toContain('"Voter"라고 쓰지 않는다');
    expect(NEWS_STYLE_GUIDE.match(/Voter/g)).toHaveLength(1);
  });

  it("지칭 교체 범위를 '지칭에 한해'로 좁혀 고유명사와 분리한다", () => {
    // 범위를 좁히지 않으면 모델이 "영문 용어 금지"로 일반화한다 (2026-08-08 회귀).
    expect(NEWS_STYLE_GUIDE).toContain("지칭에 한해");
  });
});

describe("§10 번역 불가 고유명사 보존 — 표시 용어 일반화 방지 (2026-08-08 회귀)", () => {
  // 실측: 지칭 규칙만 있던 판이 Tournament→"토너먼트", WorldCrown48→"월드크라운" 음차를
  // 유발했다. 고유명사 보존 지시가 지칭 규칙보다 먼저 나와야 한다.
  // 작성 프롬프트와 번역 프롬프트가 같은 목록을 쓰는지 — 갈라지면 한쪽만 음차된다.
  const PROPER_NOUNS = UNTRANSLATABLE_PROPER_NOUNS;

  for (const [name, prompt] of Object.entries(prompts)) {
    it(`${name} 프롬프트가 영문 원형 유지 고유명사를 나열한다`, () => {
      expect(prompt).toContain("영문 원형 그대로");
      for (const noun of PROPER_NOUNS) expect(prompt).toContain(noun);
    });

    it(`${name} 프롬프트가 한글 음차를 명시적으로 금지한다`, () => {
      expect(prompt).toContain("음차 금지");
      expect(prompt).toContain("토너먼트");
      expect(prompt).toContain("월드크라운");
    });
  }

  it("고유명사 보존이 지칭 규칙보다 앞에 온다", () => {
    const properNounAt = NEWS_STYLE_GUIDE.indexOf("영문 원형 그대로");
    const displayTermAt = NEWS_STYLE_GUIDE.indexOf("지칭만은 표시 용어");
    expect(properNounAt).toBeGreaterThan(-1);
    expect(displayTermAt).toBeGreaterThan(properNounAt);
  });
});

describe("NEWS_STYLE_GUIDE — 단일 진실", () => {
  it("7개 지침 마커 + 전 금지어를 담는다", () => {
    for (const w of FORBIDDEN_WAR_WORDS) expect(NEWS_STYLE_GUIDE).toContain(w);
    expect(NEWS_STYLE_GUIDE).toContain("사용설명 금지");
    expect(NEWS_STYLE_GUIDE).toContain("킥 비트"); // 지침 7 (반전·콜백·의외의 강조)
  });

  it("포함하는 금지어가 최소 8개(전투 은유 목록 전체)이다", () => {
    expect(FORBIDDEN_WAR_WORDS.length).toBeGreaterThanOrEqual(8);
  });
});

describe("템플릿별 근거 주입", () => {
  it("open 프롬프트에 근거 수치가 들어간다", () => {
    expect(prompts.open).toContain("48");
    expect(prompts.open).toContain("KPOP");
  });
  it("result 프롬프트에 Champion 이름이 들어간다", () => {
    expect(prompts.result).toContain("Blue Flame");
  });
  it("column 프롬프트에 주제가 들어간다", () => {
    expect(prompts.column).toContain("여름 플레이리스트의 심리학");
  });
});
