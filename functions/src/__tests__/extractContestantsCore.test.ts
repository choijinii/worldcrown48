/**
 * LAB-UX-1 ③ — 제목·채널에서 인물을 읽는 층.
 *
 * 이 프롬프트는 AI-1의 허구 인물 생성 사고와 같은 위험군이다("영상 제목을 보고
 * 사람 이름을 적어라"). 그래서 여기서 잠그는 것은 정확도가 아니라 **자제**다:
 * 모르면 비운다, 지어낸 값은 파서가 막는다, 요청하지 않은 id는 버린다.
 */
import { describe, expect, it, vi } from "vitest";
import {
  buildExtractPrompt,
  extractContestantsCore,
  ExtractError,
  MAX_EXTRACT_ITEMS,
  parseExtractions,
  type ExtractItem,
} from "../core/extractContestantsCore";

const A = "aaaaaaaaaaa";
const B = "bbbbbbbbbbb";

const items: ExtractItem[] = [
  { videoId: A, title: "[KARINA FOCUS] aespa 카리나 직캠", channelTitle: "MNET K-POP" },
  { videoId: B, title: "무대 모음", channelTitle: "someone" },
];

describe("buildExtractPrompt", () => {
  it("자제 규칙을 명시한다 — 이 문장들이 이 기능의 안전장치다", () => {
    const p = buildExtractPrompt(items);
    expect(p).toContain("확신할 수 없으면");
    expect(p).toContain("지어내지 마라");
    expect(p).toContain("제목·채널에 적힌 것만");
    expect(p).toContain("국적을 추측하지 마라");
  });

  it("★표기 규칙을 명시한다 — 로마자로 옮기지 않는다 (2026-08-27 골든)", () => {
    // `카리나`가 적힌 제목에서 `Karina`가 돌아왔다. AI 채우기는 한글로 채우므로
    // 섞이면 같은 사람이 두 표기로 앉고 중복 판정도 못 잡는다.
    const p = buildExtractPrompt(items);
    expect(p).toContain("적힌 표기를 그대로");
    expect(p).toContain("로마자로 옮기거나 번역하지 마라");
    expect(p).toContain("한글 표기");
  });

  it("항목의 id·제목·채널을 모두 싣는다", () => {
    const p = buildExtractPrompt(items);
    expect(p).toContain(A);
    expect(p).toContain("KARINA FOCUS");
    expect(p).toContain("MNET K-POP");
  });

  it("★소속(affiliation)은 영문 공식 표기를 우선하고, 없으면 원문 그대로다 (2026-08-28 대표 확정)", () => {
    // 화면 전체 소속 표기 = 영문 공식명(aespa·IVE·BLACKPINK), 공식 로마자가 없으면
    // 원문 그대로, 그마저 없으면 빈칸 — aiFillCore와 같은 규칙 (name-i18n-gap.md ②).
    const p = buildExtractPrompt(items);
    expect(p).toContain("영문(로마자) 공식 표기가 있으면 그걸 쓴다");
    expect(p).toContain("원문 그대로 쓴다");
  });
});

describe("parseExtractions", () => {
  it("정상 응답을 항목 순서대로 돌려준다", () => {
    const raw = JSON.stringify({
      extractions: [
        { id: A, name: "카리나", affiliation: "aespa", nationality: "kr", confident: true },
        { id: B, name: "", affiliation: "", nationality: "", confident: false },
      ],
    });
    const out = parseExtractions(raw, items);
    expect(out[0]).toEqual({
      videoId: A, name: "카리나", affiliation: "aespa", nationality: "KR", confident: true,
    });
    expect(out[1].confident).toBe(false);
  });

  it("★이름이 비었는데 confident:true면 믿지 않는다", () => {
    const raw = JSON.stringify({ extractions: [{ id: A, name: "", confident: true }] });
    expect(parseExtractions(raw, [items[0]])[0].confident).toBe(false);
  });

  it("★국가가 두 글자 코드가 아니면 버린다 — 추측한 국적을 싣지 않는다", () => {
    const raw = JSON.stringify({
      extractions: [{ id: A, name: "카리나", nationality: "대한민국", confident: true }],
    });
    expect(parseExtractions(raw, [items[0]])[0].nationality).toBe("");
  });

  it("★요청하지 않은 id는 버리고, 빠진 항목은 빈 결과로 채운다", () => {
    const raw = JSON.stringify({
      extractions: [{ id: "zzzzzzzzzzz", name: "유령", confident: true }],
    });
    const out = parseExtractions(raw, items);
    expect(out).toHaveLength(2);
    expect(out.every((x) => x.name === "")).toBe(true);
  });

  it("형식이 깨지면 전부 빈 결과 — 사람에게 넘긴다", () => {
    expect(parseExtractions("그럴듯한 설명만 있고 JSON이 없음", items).every((x) => !x.confident)).toBe(true);
  });

  it("```json 펜스를 둘러도 읽는다", () => {
    const raw = '```json\n{"extractions":[{"id":"' + A + '","name":"카리나","confident":true}]}\n```';
    expect(parseExtractions(raw, [items[0]])[0].name).toBe("카리나");
  });
});

describe("extractContestantsCore — 게이트", () => {
  const deps = { createMessage: vi.fn(async () => JSON.stringify({ extractions: [] })) };

  it("로그인 없으면 거부", async () => {
    await expect(extractContestantsCore({ uid: null, items }, deps)).rejects.toBeInstanceOf(ExtractError);
  });

  it("빈 목록은 거부 — 모델을 부르지 않는다(비용 가드)", async () => {
    const spy = vi.fn(async () => "");
    await expect(
      extractContestantsCore({ uid: "u1", items: [] }, { createMessage: spy }),
    ).rejects.toBeInstanceOf(ExtractError);
    expect(spy).not.toHaveBeenCalled();
  });

  it(`${MAX_EXTRACT_ITEMS}건을 넘으면 거부`, async () => {
    const many = Array.from({ length: MAX_EXTRACT_ITEMS + 1 }, (_, i) => ({
      videoId: `v${i}`, title: "t", channelTitle: "c",
    }));
    await expect(
      extractContestantsCore({ uid: "u1", items: many }, deps),
    ).rejects.toBeInstanceOf(ExtractError);
  });

  it("모델이 실패하면 ai-failed", async () => {
    const boom = { createMessage: vi.fn(async () => { throw new Error("upstream"); }) };
    await expect(
      extractContestantsCore({ uid: "u1", items }, boom),
    ).rejects.toMatchObject({ reason: "ai-failed" });
  });
});
