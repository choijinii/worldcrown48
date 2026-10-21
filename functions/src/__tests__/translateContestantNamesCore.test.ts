import { describe, it, expect, vi } from "vitest";
import {
  buildNamesPrompt,
  parseNamesReply,
  translateContestantNamesCore,
} from "../core/translateContestantNamesCore";

// NAME-I18N-1 (원장 D-61): 발행 때 Haiku 1번으로 48명의 공식 영어 이름을 받는다.
// es = en 복사 · ko = name · 실패해도 던지지 않는다(발행은 진행, 화면은 한글 폴백).

const entries = [
  { name: "뉴진스", affiliation: "ADOR" },
  { name: "에스파", affiliation: "SM" },
  { name: "아이유", affiliation: "" },
];

const reply = (rows: unknown) => JSON.stringify({ names: rows });

describe("buildNamesPrompt", () => {
  it("한 번의 호출에 모든 이름을 번호와 함께 싣는다", () => {
    const p = buildNamesPrompt(entries, "KPOP");
    expect(p).toContain("1. 뉴진스");
    expect(p).toContain("2. 에스파");
    expect(p).toContain("3. 아이유");
    expect(p).toContain("ADOR");
    expect(p).toContain("KPOP");
  });

  it("발음 옮겨 적기가 아니라 본인·소속사가 쓰는 철자를 요구하고, 모르면 sure:false", () => {
    const p = buildNamesPrompt(entries, "KPOP");
    expect(p).toMatch(/공식/);
    expect(p).toMatch(/옮겨 적기/);
    expect(p).toContain('"sure"');
  });
});

describe("parseNamesReply", () => {
  it("번호(i)로 맞춰 순서를 지킨다 — 응답 순서가 섞여도", () => {
    const r = parseNamesReply(
      reply([
        { i: 3, en: "IU", sure: true },
        { i: 1, en: "NewJeans", sure: true },
        { i: 2, en: "aespa", sure: true },
      ]),
      3,
    );
    expect(r.map((x) => x?.en)).toEqual(["NewJeans", "aespa", "IU"]);
  });

  it("빠진 사람은 null — 그 칸만 폴백", () => {
    const r = parseNamesReply(reply([{ i: 1, en: "NewJeans", sure: true }]), 3);
    expect(r[0]?.en).toBe("NewJeans");
    expect(r[1]).toBeNull();
    expect(r[2]).toBeNull();
  });

  it("한글이 섞인 en·빈 en·범위 밖 번호는 버린다", () => {
    const r = parseNamesReply(
      reply([
        { i: 1, en: "뉴진스", sure: true },
        { i: 2, en: "  ", sure: true },
        { i: 9, en: "Ghost", sure: true },
        { i: 3, en: "IU", sure: true },
      ]),
      3,
    );
    expect(r).toEqual([null, null, { en: "IU", sure: true }]);
  });

  it("sure 가 true 가 아니면 확신 낮음", () => {
    const r = parseNamesReply(reply([{ i: 1, en: "Newjeans" }]), 1);
    expect(r[0]).toEqual({ en: "Newjeans", sure: false });
  });

  it("엉뚱한 응답은 전부 null", () => {
    expect(parseNamesReply("I don't know", 2)).toEqual([null, null]);
    expect(parseNamesReply(JSON.stringify({ foo: 1 }), 2)).toEqual([null, null]);
  });
});

describe("translateContestantNamesCore", () => {
  it("es = en 복사 · ko = name · 정렬 유지 · 호출은 1번", async () => {
    const createMessage = vi.fn(async () =>
      reply([
        { i: 1, en: "NewJeans", sure: true },
        { i: 2, en: "aespa", sure: true },
        { i: 3, en: "IU", sure: false },
      ]),
    );
    const r = await translateContestantNamesCore({ entries, category: "KPOP" }, { createMessage });
    expect(createMessage).toHaveBeenCalledTimes(1);
    expect(r.nameI18n).toEqual([
      { ko: "뉴진스", en: "NewJeans", es: "NewJeans" },
      { ko: "에스파", en: "aespa", es: "aespa" },
      { ko: "아이유", en: "IU", es: "IU" },
    ]);
    expect(r.unsure).toEqual([2]);
    expect(r.failed).toEqual([]);
  });

  it("빠진 사람은 en·es 빈칸(화면은 한글 폴백 · 백필이 다시 채울 수 있다) + 로그", async () => {
    const logError = vi.fn();
    const r = await translateContestantNamesCore(
      { entries, category: "KPOP" },
      { createMessage: async () => reply([{ i: 1, en: "NewJeans", sure: true }]), logError },
    );
    expect(r.nameI18n[1]).toEqual({ ko: "에스파", en: "", es: "" });
    expect(r.failed).toEqual([1, 2]);
    expect(logError).toHaveBeenCalled();
  });

  it("모델 호출이 던져도 던지지 않는다 — 전부 폴백 + 로그", async () => {
    const logError = vi.fn();
    const r = await translateContestantNamesCore(
      { entries, category: "KPOP" },
      {
        createMessage: async () => {
          throw new Error("overloaded");
        },
        logError,
      },
    );
    expect(r.nameI18n.map((n) => n.en)).toEqual(["", "", ""]);
    expect(r.nameI18n.map((n) => n.ko)).toEqual(["뉴진스", "에스파", "아이유"]);
    expect(r.failed).toEqual([0, 1, 2]);
    expect(logError).toHaveBeenCalled();
  });

  it("이름이 이미 로마자면 AI 없이 그대로 쓴다(호출 0번)", async () => {
    const createMessage = vi.fn(async () => reply([]));
    const r = await translateContestantNamesCore(
      { entries: [{ name: "IVE", affiliation: "" }], category: "KPOP" },
      { createMessage },
    );
    expect(createMessage).not.toHaveBeenCalled();
    expect(r.nameI18n).toEqual([{ ko: "IVE", en: "IVE", es: "IVE" }]);
  });

  it("빈 이름 칸은 AI 에 보내지 않고 빈칸으로 둔다", async () => {
    const createMessage = vi.fn(async (p: string) => {
      expect(p).not.toMatch(/\d\. \s*$/m);
      return reply([{ i: 1, en: "NewJeans", sure: true }]);
    });
    const r = await translateContestantNamesCore(
      { entries: [{ name: "뉴진스", affiliation: "" }, { name: " ", affiliation: "" }], category: "" },
      { createMessage },
    );
    expect(r.nameI18n).toEqual([
      { ko: "뉴진스", en: "NewJeans", es: "NewJeans" },
      { ko: "", en: "", es: "" },
    ]);
  });
});
