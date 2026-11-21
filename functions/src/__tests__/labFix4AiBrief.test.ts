/**
 * LAB-FIX-4 — "AI에게 알려 줄 내용" 묶음(원장 결정 A) 이 세 AI 일의 **맨 위 규칙**으로 들어가는지.
 *
 * 묶음이 비면 옛 지시문 그대로(labFix4PromptLocks.test.ts 가 sha256 으로 잠근다). 묶음이 있거나 단위가
 * "그 외"면 새 지시문 함수로 간다. §7 정답 자료(대회 ④ 48줄)는 fixtures/lab-fix4-crews.json.
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AI_BRIEF_LIMITS,
  briefRuleLines,
  isAiBriefEmpty,
  parseAiBrief,
  usesBriefPrompt,
} from "../core/aiBrief";
import {
  buildBriefExtractPrompt,
  buildExtractPrompt,
  buildTeamExtractPrompt,
  extractContestantsCore,
  ExtractError,
  parseExtractions,
  type ExtractItem,
} from "../core/extractContestantsCore";
import { aiFillCore, buildPrompt, parseEntryUnit } from "../core/aiFillCore";
import {
  buildBriefNamesPrompt,
  buildNamesPrompt,
  translateContestantNamesCore,
} from "../core/translateContestantNamesCore";

const fixture = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "lab-fix4-crews.json"), "utf8"),
) as {
  brief: { entryUnit: "group"; entry: string; extra: string; rules: string };
  tournamentTitle: string;
  items: { videoId: string; title: string; channelTitle: string; expectedName: string; expectedCountry: string }[];
};
const crewBrief = { entry: fixture.brief.entry, extra: fixture.brief.extra, rules: fixture.brief.rules };
const crewItems: ExtractItem[] = fixture.items.map(({ videoId, title, channelTitle }) => ({ videoId, title, channelTitle }));

describe("parseAiBrief — 묶음 읽기", () => {
  it("빠지거나 모양이 다르면 빈 묶음(옛 화면 호환)", () => {
    expect(parseAiBrief(undefined)).toEqual({ entry: "", extra: "", rules: "" });
    expect(parseAiBrief(null)).toEqual({ entry: "", extra: "", rules: "" });
    expect(parseAiBrief("x")).toEqual({ entry: "", extra: "", rules: "" });
  });
  it("앞뒤 공백을 지우고, 공백뿐인 칸은 빈 칸", () => {
    const b = parseAiBrief({ entry: "  노래 제목 ", extra: "   ", rules: "\n" });
    expect(b).toEqual({ entry: "노래 제목", extra: "", rules: "" });
    expect(isAiBriefEmpty(parseAiBrief({ entry: " ", extra: " ", rules: " " })!)).toBe(true);
  });
  it("글자 수 한도 40 · 40 · 300 — 넘으면 null(호출자가 invalid-argument)", () => {
    expect(AI_BRIEF_LIMITS).toEqual({ entry: 40, extra: 40, rules: 300 });
    expect(parseAiBrief({ entry: "가".repeat(40), extra: "나".repeat(40), rules: "다".repeat(300) })).not.toBeNull();
    expect(parseAiBrief({ entry: "가".repeat(41) })).toBeNull();
    expect(parseAiBrief({ extra: "나".repeat(41) })).toBeNull();
    expect(parseAiBrief({ rules: "다".repeat(301) })).toBeNull();
  });
  it("새 지시문을 쓰는 때 = 묶음에 글자가 있거나 단위가 그 외", () => {
    const empty = { entry: "", extra: "", rules: "" };
    expect(usesBriefPrompt(empty, "individual")).toBe(false);
    expect(usesBriefPrompt(empty, "group")).toBe(false);
    expect(usesBriefPrompt(empty, "other")).toBe(true);
    expect(usesBriefPrompt({ ...empty, rules: "어린이 팀 제외" }, "group")).toBe(true);
  });
  it("엔트리 단위에 그 외(other)가 있다 — 모르는 값은 여전히 거부", () => {
    expect(parseEntryUnit("other")).toBe("other");
    expect(parseEntryUnit("song")).toBeNull();
  });
});

describe("briefRuleLines — 맨 위 규칙 세 줄", () => {
  it("엔트리 · 덧붙이는 정보 · 고르는 조건을 그대로 싣는다", () => {
    const text = briefRuleLines({ entry: "노래 제목", extra: "가수", rules: "2026년 발매곡만" }, "other").join("\n");
    expect(text).toContain("이 대회의 엔트리는 노래 제목이다");
    expect(text).toContain("덧붙이는 정보(affiliation)는 가수이다");
    expect(text).toContain("고르는 조건: 2026년 발매곡만");
  });
});

describe("buildBriefExtractPrompt — 링크 제목 읽기(새 지시문)", () => {
  const p = buildBriefExtractPrompt(crewItems, {
    brief: crewBrief,
    entryUnit: "group",
    tournamentTitle: fixture.tournamentTitle,
    tournamentDescription: "",
  });
  it("묶음 규칙이 맨 위 규칙 — 일반 규칙보다 앞", () => {
    const top = p.indexOf("이 대회의 엔트리는 영상에서 춤춘 댄스 크루이다");
    expect(top).toBeGreaterThan(-1);
    expect(top).toBeLessThan(p.indexOf("지어내지 마라"));
    expect(p).toContain("고르는 조건: K-pop 곡에 맞춰 춤춘 국내외 댄스 크루. 원곡 가수는 엔트리가 아니다.");
    // 링크 제목 읽기는 영상이 이미 골라진 뒤 — 조건은 누가 엔트리인지 가리는 데만(LAB-FIX-4b).
    expect(p).toContain("누가 엔트리인지 가리는 데만");
  });
  it("대회 제목을 함께 넘긴다", () => {
    expect(p).toContain(fixture.tournamentTitle);
  });
  it("커버·리뷰 영상의 원곡 가수 · 올린 사람이 엔트리가 아니면 적지 않는다", () => {
    expect(p).toContain("원곡 가수");
    expect(p).toContain("엔트리가 아닌 이름");
  });
  it("국가는 제목의 from Vietnam 같은 문구로 정한다 · 모르면 비우고 지어내지 않는다", () => {
    expect(p).toContain("from Vietnam");
    expect(p).toContain("확신할 수 없으면");
    expect(p).toContain("지어내지 마라");
  });
  // LAB-FIX-5 결정 F(D-61 일부 바뀜) — 한글은 한국 인물 · 팀에만, 외국은 원래 공식 표기.
  it("이름 표기 = 결정 F(한국은 한글 · 외국은 원래 공식 표기)", () => {
    expect(p).toContain("원래 공식 표기");
  });
  it("48줄 모두 싣는다", () => {
    for (const it of crewItems) expect(p).toContain(`id="${it.videoId}"`);
  });
  it("옛 두 지시문과 다른 함수다(옛 지시문엔 묶음이 없다)", () => {
    expect(buildExtractPrompt(crewItems)).not.toContain("이 대회의 엔트리는");
    expect(buildTeamExtractPrompt(crewItems)).not.toContain("이 대회의 엔트리는");
  });
});

describe("다른 카테고리 시험 줄(지시서 §7 끝)", () => {
  const song = buildBriefExtractPrompt(
    [{ videoId: "ccccccccccc", title: "aespa 'Whiplash' MV", channelTitle: "SMTOWN" }],
    { brief: { entry: "노래 제목", extra: "가수", rules: "" }, entryUnit: "other", tournamentTitle: "올해의 노래", tournamentDescription: "" },
  );
  it("노래 대회 — 엔트리 = 노래 제목 · 덧붙임 = 가수", () => {
    expect(song).toContain("이 대회의 엔트리는 노래 제목이다");
    expect(song).toContain("덧붙이는 정보(affiliation)는 가수이다");
  });
  it("드라마 배역 — 엔트리 = 배역 이름 · 덧붙임 = 배우와 드라마 제목", () => {
    const p = buildBriefFill({ entry: "드라마 배역 이름", extra: "배우와 드라마 제목", rules: "" });
    expect(p).toContain("이 대회의 엔트리는 드라마 배역 이름이다");
    expect(p).toContain("덧붙이는 정보(affiliation)는 배우와 드라마 제목이다");
  });
  it("사물 — 리뷰 채널 이름이 엔트리로 들어가지 않게(올린 사람 규칙)", () => {
    const p = buildBriefExtractPrompt(
      [{ videoId: "ddddddddddd", title: "신라면 블랙 솔직 리뷰", channelTitle: "먹방리뷰TV" }],
      { brief: { entry: "라면 제품 이름", extra: "만든 회사", rules: "" }, entryUnit: "other", tournamentTitle: "최고의 라면", tournamentDescription: "" },
    );
    expect(p).toContain("올린 사람");
    expect(p).toContain("이 대회의 엔트리는 라면 제품 이름이다");
  });
});

function buildBriefFill(brief: { entry: string; extra: string; rules: string }) {
  return buildPrompt({ title: "주인공 대전", category: "KDRAMA", count: 48, entryUnit: "other", aiBrief: brief });
}

describe("buildPrompt(명단 채우기) — 묶음이 있으면 새 지시문", () => {
  it("묶음 규칙이 맨 위 · 수는 '개'", () => {
    const p = buildPrompt({ title: "올해의 노래", category: "KPOP", description: "2026 발매", count: 48, entryUnit: "other", aiBrief: { entry: "노래 제목", extra: "가수", rules: "타이틀곡만" } });
    expect(p.indexOf("이 대회의 엔트리는 노래 제목이다")).toBeLessThan(p.indexOf("지어내지"));
    expect(p).toContain("고르는 조건: 타이틀곡만");
    expect(p).toContain("51~53개");
    expect(p).toContain("imageSearchKeyword");
  });
  it("묶음이 비면 개인·팀 지시문 그대로(잠금은 labFix4PromptLocks)", () => {
    const base = { title: "t", category: "KPOP", count: 48 };
    expect(buildPrompt({ ...base, aiBrief: { entry: "", extra: "", rules: "" } })).toBe(buildPrompt(base));
    expect(buildPrompt({ ...base, entryUnit: "group", aiBrief: { entry: " ", extra: "", rules: "" } })).toBe(
      buildPrompt({ ...base, entryUnit: "group" }),
    );
  });
  it("aiFillCore 가 묶음을 받아 새 지시문으로 부른다 · 한도를 넘으면 모델을 부르지 않는다", async () => {
    const createMessage = vi.fn(async () => "[]");
    await expect(
      aiFillCore({ uid: "u", title: "t", category: "KPOP", entryUnit: "group", aiBrief: { rules: "다".repeat(301) } }, { createMessage }),
    ).rejects.toMatchObject({ reason: "invalid-argument" });
    expect(createMessage).not.toHaveBeenCalled();
    await aiFillCore({ uid: "u", title: "t", category: "KPOP", entryUnit: "group", aiBrief: crewBrief }, { createMessage }).catch(() => {});
    expect((createMessage.mock.calls[0] as unknown as [string])[0]).toContain("이 대회의 엔트리는 영상에서 춤춘 댄스 크루이다");
  });
});

describe("extractContestantsCore — 묶음 · 대회 제목 전달", () => {
  it("묶음이 있으면 새 지시문, 없으면 옛 지시문", async () => {
    const createMessage = vi.fn(async () => '{"extractions":[]}');
    await extractContestantsCore(
      { uid: "u", items: crewItems.slice(0, 2), entryUnit: "group", aiBrief: crewBrief, tournamentTitle: fixture.tournamentTitle },
      { createMessage },
    );
    await extractContestantsCore({ uid: "u", items: crewItems.slice(0, 2), entryUnit: "group" }, { createMessage });
    const [first, second] = createMessage.mock.calls.map((c) => (c as unknown as [string])[0]);
    expect(first).toContain(fixture.tournamentTitle);
    expect(first).toContain("이 대회의 엔트리는");
    expect(second).toBe(buildTeamExtractPrompt(crewItems.slice(0, 2)));
  });
  it("묶음이 한도를 넘으면 invalid-argument(모델 0콜)", async () => {
    const createMessage = vi.fn(async () => "");
    await expect(
      extractContestantsCore({ uid: "u", items: crewItems.slice(0, 1), entryUnit: "other", aiBrief: { entry: "가".repeat(41) } }, { createMessage }),
    ).rejects.toBeInstanceOf(ExtractError);
    expect(createMessage).not.toHaveBeenCalled();
  });
});

describe("parseExtractions — §7 48줄 응답을 바르게 읽는다", () => {
  it("정답 응답을 그대로 돌려준다(이름 · 국가 · 확신)", () => {
    const reply = JSON.stringify({
      extractions: fixture.items.map((x) => ({ id: x.videoId, name: x.expectedName, affiliation: "", nationality: x.expectedCountry.toLowerCase(), confident: true })),
    });
    const out = parseExtractions("머리말\n" + reply, crewItems);
    expect(out).toHaveLength(48);
    out.forEach((o, i) => {
      expect(o.videoId).toBe(fixture.items[i].videoId);
      expect(o.name).toBe(fixture.items[i].expectedName);
      expect(o.nationality).toBe(fixture.items[i].expectedCountry);
      expect(o.confident).toBe(true);
    });
  });
});

describe("이름 3언어 — 엔트리 종류를 넘긴다", () => {
  it("묶음이 있으면 새 지시문 — 대상에 맞는 공식 표기", () => {
    const p = buildBriefNamesPrompt([{ name: "사랑비", affiliation: "윤석호" }], "KDRAMA", { entry: "드라마 제목", extra: "감독", rules: "" }, "other");
    expect(p).toContain("이 대회의 엔트리는 드라마 제목이다");
    expect(p).toContain("공식 영어 표기");
    expect(p).not.toBe(buildNamesPrompt([{ name: "사랑비", affiliation: "윤석호" }], "KDRAMA"));
  });
  it("그 외 대회는 발음 대조로 버리지 않는다(작품의 공식 영어 제목은 발음과 다를 수 있다)", async () => {
    const createMessage = async () => '{"names":[{"i":1,"en":"Love Rain","sure":true}]}';
    const other = await translateContestantNamesCore(
      { entries: [{ name: "사랑비" }], category: "KDRAMA", entryUnit: "other", aiBrief: { entry: "드라마 제목", extra: "", rules: "" } },
      { createMessage },
    );
    expect(other.nameI18n[0]).toEqual({ ko: "사랑비", en: "Love Rain", es: "Love Rain" });
    const person = await translateContestantNamesCore({ entries: [{ name: "사랑비" }], category: "KDRAMA" }, { createMessage });
    expect(person.nameI18n[0].en).toBe("");
  });
  it("묶음이 없으면 옛 지시문 그대로 부른다", async () => {
    const createMessage = vi.fn(async () => "{}");
    await translateContestantNamesCore({ entries: [{ name: "카리나", affiliation: "aespa" }], category: "KPOP" }, { createMessage });
    expect((createMessage.mock.calls[0] as unknown as [string])[0]).toBe(
      buildNamesPrompt([{ i: 1, name: "카리나", affiliation: "aespa" }], "KPOP"),
    );
  });
});

describe("preferChannelFullName — 제목의 줄인 이름 → 채널의 전체 이름(서버 그물 · LAB-FIX-4b)", () => {
  it("이름이 채널 이름의 앞부분이고 뒤가 크루 · 팀 말이면 채널 이름", async () => {
    const { preferChannelFullName } = await import("../core/extractContestantsCore");
    expect(preferChannelFullName("HANABI", "Hanabi Dance Crew")).toBe("Hanabi Dance Crew");
    expect(preferChannelFullName("AFTER", "AFTER DANCE CREW")).toBe("AFTER DANCE CREW");
    expect(preferChannelFullName("DARE", "DARE Crew • Official")).toBe("DARE Crew");
    expect(preferChannelFullName("Principium", "Principium PH")).toBe("Principium PH");
    expect(preferChannelFullName("404", "404 DANCE CREW")).toBe("404 DANCE CREW");
    expect(preferChannelFullName("SUGAR X SPICY", "SUGAR X SPICY DC")).toBe("SUGAR X SPICY DC");
  });
  it("꾸밈말만 붙은 채널 · 방송사 · 소속사 · 다른 이름 · 한글 병기는 바꾸지 않는다", async () => {
    const { preferChannelFullName } = await import("../core/extractContestantsCore");
    expect(preferChannelFullName("Mad.G", "Mad.G Official")).toBe("Mad.G");
    expect(preferChannelFullName("TWICE", "TWICE JAPAN OFFICIAL YouTube Channel")).toBe("TWICE");
    expect(preferChannelFullName("IVE", "IVE Entertainment")).toBe("IVE");
    expect(preferChannelFullName("HUSH BOSTON", "HUSH CREW")).toBe("HUSH BOSTON");
    expect(preferChannelFullName("Chocomint HK", "Chocomint HK 초코민트")).toBe("Chocomint HK");
    expect(preferChannelFullName("라치카", "라치카 La Chica")).toBe("라치카");
    expect(preferChannelFullName("MOVENESS", "Aico - MOVENESS")).toBe("MOVENESS");
    expect(preferChannelFullName("NOVA", "NOVAK Dance Crew")).toBe("NOVA");
    expect(preferChannelFullName("", "Hanabi Dance Crew")).toBe("");
  });
  it("코어는 묶음 지시문 · 사람/팀 단위에서만 적용한다(노래 대회 · 옛 지시문은 그대로)", async () => {
    const reply = '{"extractions":[{"id":"fIVvOkZUOTo","name":"HANABI","affiliation":"","nationality":"DE","confident":true}]}';
    const item = [{ videoId: "fIVvOkZUOTo", title: "… Dance Cover by HANABI", channelTitle: "Hanabi Dance Crew" }];
    const run = (entryUnit: string, aiBrief?: unknown) =>
      extractContestantsCore({ uid: "u", items: item, entryUnit, aiBrief }, { createMessage: async () => reply });
    expect((await run("group", crewBrief))[0].name).toBe("Hanabi Dance Crew");
    expect((await run("group"))[0].name).toBe("HANABI");
    expect((await run("other", { entry: "노래 제목", extra: "가수", rules: "" }))[0].name).toBe("HANABI");
  });
});
