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
