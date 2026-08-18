import { describe, it, expect } from "vitest";
import {
  parseAiContestants,
  ContestantParseError,
  TOTAL_CONTESTANTS,
  HINT_MAX_LENGTH,
  isPollutedHint,
  normalizeNameKey,
  type DiscardedContestant,
} from "../core/parseContestants";

function fakeArray(n: number): string {
  return JSON.stringify(
    Array.from({ length: n }, (_, i) => ({
      name: `Player ${i + 1}`,
      nationality: "KR",
      position: "FW",
      imageSearchKeyword: `player ${i + 1} portrait`,
    })),
  );
}

describe("parseAiContestants (functions)", () => {
  it("parses a clean JSON array of 48", () => {
    expect(parseAiContestants(fakeArray(TOTAL_CONTESTANTS))).toHaveLength(48);
  });

  it("extracts the array out of surrounding prose", () => {
    const text = `Here you go:\n${fakeArray(48)}\nDone.`;
    expect(parseAiContestants(text)).toHaveLength(48);
  });

  it("normalizes to exactly the four suggestion fields", () => {
    // 이름은 서로 달라야 한다 — AI-1부터 파서가 동명이인을 중복으로 접는다.
    const text = JSON.stringify(
      Array.from({ length: 48 }, (_, i) => ({
        name: `X${i + 1}`,
        nationality: "US",
        position: "Guard",
        // AI-2: 힌트도 서로 달라야 한다 — 같은 힌트는 이제 같은 인물로 접힌다.
        imageSearchKeyword: `x${i + 1}`,
        junk: 1,
      })),
    );
    expect(Object.keys(parseAiContestants(text)[0]).sort()).toEqual([
      "imageSearchKeyword",
      "name",
      "nationality",
      "position",
    ]);
  });

  it("accepts an explicit expectedCount (blank-only fill requests fewer)", () => {
    // 47칸 채우고 빈칸만 AI → 1명만 요청/파싱 (§8 edge).
    expect(parseAiContestants(fakeArray(1), 1)).toHaveLength(1);
    expect(parseAiContestants(fakeArray(5), 5)).toHaveLength(5);
  });

  it("throws unparseable / not_array with reasons", () => {
    expect(() => parseAiContestants("nope")).toThrowError(ContestantParseError);
    try {
      parseAiContestants("nope");
    } catch (e) {
      expect((e as ContestantParseError).reason).toBe("unparseable");
    }
    try {
      parseAiContestants('{"a":1}');
    } catch (e) {
      expect((e as ContestantParseError).reason).toBe("not_array");
    }
  });
});

/**
 * AI-1 — 과다 요청 + 관용 파싱 (대표 결정).
 * 프롬프트가 50~52명을 요청하고, 여기서 중복 제거 후 정확히 48명을 취한다.
 */
describe("parseAiContestants — 과다 공급 절단 · 중복 제거 · 부족분 허용 (AI-1)", () => {
  it("50~52명이 와도 앞에서부터 정확히 48명만 취한다", () => {
    for (const n of [49, 50, 52]) {
      const out = parseAiContestants(fakeArray(n));
      expect(out).toHaveLength(TOTAL_CONTESTANTS);
      expect(out[0].name).toBe("Player 1"); // 순서 보존
      expect(out[47].name).toBe("Player 48");
    }
  });

  it("blank-only 모드에서도 과다 공급분을 잘라낸다", () => {
    expect(parseAiContestants(fakeArray(48), 1)).toHaveLength(1);
    expect(parseAiContestants(fakeArray(48), 5)).toHaveLength(5);
  });

  // AI-2: 이름 키가 "공백 축약"에서 "공백 제거"로 바뀌어 `I U` = `IU`가 됐다.
  // 예전에는 이 둘이 서로 다른 인물로 남았다 — 사람이 보기에 같은 인물이다.
  it("중복은 먼저 나온 것만 남긴다 (대소문자·공백 차이 포함)", () => {
    const dupes = JSON.stringify([
      { name: "IU", nationality: "KR", position: "Vocal", imageSearchKeyword: "iu" },
      { name: "iu", nationality: "KR", position: "Vocal", imageSearchKeyword: "iu" },
      { name: "  I U  ", nationality: "KR", position: "Vocal", imageSearchKeyword: "iu" },
      { name: "Taeyeon", nationality: "KR", position: "Vocal", imageSearchKeyword: "ty" },
    ]);
    const out = parseAiContestants(dupes, 2);
    expect(out.map((c) => c.name)).toEqual(["IU", "Taeyeon"]);
  });

  it("이름이 빈 항목은 슬롯을 채우지 못한다", () => {
    const withBlanks = JSON.stringify([
      { name: "", nationality: "KR", position: "V", imageSearchKeyword: "x" },
      { name: "   ", nationality: "KR", position: "V", imageSearchKeyword: "x" },
      { name: "Rosé", nationality: "KR", position: "V", imageSearchKeyword: "rose" },
    ]);
    expect(parseAiContestants(withBlanks, 1).map((c) => c.name)).toEqual(["Rosé"]);
  });

  it("46·47명은 통과하고 45명은 실패한다 (floor = 48 - 2)", () => {
    expect(parseAiContestants(fakeArray(47))).toHaveLength(47);
    expect(parseAiContestants(fakeArray(46))).toHaveLength(46);
    try {
      parseAiContestants(fakeArray(45));
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as ContestantParseError).reason).toBe("wrong_count");
      expect((e as ContestantParseError).received).toBe(45);
    }
  });

  it("중복 제거 후 floor 미만이면 실패한다 (개수만 채운 응답을 거른다)", () => {
    // 48개지만 실제 인물은 3명 — 중복으로 개수만 맞춘 응답.
    // 힌트는 항목마다 다르게 둔다: 이 테스트가 재려는 건 **이름** 중복이다.
    const padded = JSON.stringify(
      Array.from({ length: 48 }, (_, i) => ({
        name: `Player ${(i % 3) + 1}`,
        nationality: "KR",
        position: "FW",
        imageSearchKeyword: `x${i + 1}`,
      })),
    );
    try {
      parseAiContestants(padded);
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as ContestantParseError).reason).toBe("wrong_count");
      expect((e as ContestantParseError).received).toBe(3);
    }
  });

  it("스키마는 불변이다 — 필드 4개 그대로 (RULE R1)", () => {
    expect(Object.keys(parseAiContestants(fakeArray(50))[0]).sort()).toEqual([
      "imageSearchKeyword",
      "name",
      "nationality",
      "position",
    ]);
  });
});

/**
 * AI-2 (2026-08-18) — 오염 힌트 폐기 · 중복 정규화.
 * 근거: outputs/handoffs-staging/EVIDENCE_AI-2_hint-pollution_2026-08-17.md
 */
describe("isPollutedHint — 힌트 칸이 검색어인가 메모인가 (AI-2 ④)", () => {
  it("증거의 오염 힌트 6종을 전부 잡는다", () => {
    // 슬롯 11·35·36·37·44 원문 + 슬롯 29(원문 미캡처, 동일 패턴 대역)
    for (const hint of [
      "NewJeans Sullyoon 아님 Hyein 확인",
      "LOONA Kim Lip 아님 확인 Kim Minjoo",
      "Weeekly Kim Zaeyeon 확인",
      "NMIXX Midori 확인",
      "GIDLE Yuqi 아님 확인 Miyeon",
      "ITZY Yuna 아님 Ryujin 확인",
    ]) {
      expect(isPollutedHint(hint)).toBe(true);
    }
  });

  it("물음표가 있으면 검색어가 아니다 (반각·전각)", () => {
    expect(isPollutedHint("NMIXX Sullyoon stage?")).toBe(true);
    expect(isPollutedHint("NMIXX Sullyoon stage？")).toBe(true);
  });

  it("HINT_MAX_LENGTH를 넘으면 폐기한다 — 문장으로 흘러나온 메모", () => {
    expect(isPollutedHint("a".repeat(HINT_MAX_LENGTH))).toBe(false);
    expect(isPollutedHint("a".repeat(HINT_MAX_LENGTH + 1))).toBe(true);
  });

  it("빈 힌트는 오염이 아니다 — 소싱에 이름+키워드 폴백이 있다", () => {
    expect(isPollutedHint("")).toBe(false);
    expect(isPollutedHint("   ")).toBe(false);
  });

  it("한국어 정상 힌트는 살린다 — 한글 자체는 금지가 아니다", () => {
    for (const hint of ["임영웅 무대", "이찬원 트로트 무대", "NMIXX 설윤 무대"]) {
      expect(isPollutedHint(hint)).toBe(false);
    }
  });

  it("메모 낱말이 고유명사 안에 들어 있으면 잡지 않는다 (오탐 방지)", () => {
    // "박인지"는 실존 골퍼다. `인지`를 부분 일치로 잡으면 멀쩡한 인물을 버린다.
    expect(isPollutedHint("박인지 골프 스윙")).toBe(false);
    expect(isPollutedHint("아마존 프라임 스탠드업")).toBe(false);
  });

  it("정상 영문 검색어는 통과한다", () => {
    for (const hint of [
      "NMIXX Sullyoon stage",
      "BLACKPINK Jisoo performance",
      "Stray Kids Felix stage",
    ]) {
      expect(isPollutedHint(hint)).toBe(false);
    }
  });
});

describe("normalizeNameKey — 중복 판정 키 (AI-2 ⑤)", () => {
  it("괄호 꼬리를 떼면 설윤 = 설윤(엔믹스)", () => {
    expect(normalizeNameKey("설윤(엔믹스)")).toBe(normalizeNameKey("설윤"));
    expect(normalizeNameKey("설윤（엔믹스）")).toBe(normalizeNameKey("설윤"));
    expect(normalizeNameKey("설윤 [NMIXX]")).toBe(normalizeNameKey("설윤"));
  });

  it("공백·대소문자를 무시한다", () => {
    expect(normalizeNameKey("  I U ")).toBe(normalizeNameKey("iu"));
  });

  it("다른 인물은 합치지 않는다", () => {
    expect(normalizeNameKey("설윤")).not.toBe(normalizeNameKey("지우"));
  });
});

describe("parseAiContestants — AI-2 폐기·중복 파이프라인", () => {
  const item = (name: string, hint: string) => ({
    name,
    nationality: "KR",
    position: "Vocal",
    imageSearchKeyword: hint,
  });

  it("오염 힌트 항목은 힌트만 비우지 않고 항목째 버린다 (설계 결정 ③)", () => {
    const text = JSON.stringify([
      item("설윤", "NewJeans Sullyoon 아님 Hyein 확인"),
      item("지수", "BLACKPINK Jisoo stage"),
    ]);
    const out = parseAiContestants(text, 1);
    expect(out.map((c) => c.name)).toEqual(["지수"]);
  });

  it("증거의 설윤 중복을 하나로 접는다 — 오염분이 먼저 빠지고 정상분이 남는다", () => {
    const text = JSON.stringify([
      item("설윤", "NewJeans Sullyoon 아님 Hyein 확인"), // 슬롯 11 (오염 + 소속 오기)
      item("지수", "BLACKPINK Jisoo stage"),
      item("설윤(엔믹스)", "NMIXX Sullyoon"), // 슬롯 38 (정상)
    ]);
    const out = parseAiContestants(text, 2);
    expect(out.map((c) => c.name)).toEqual(["지수", "설윤(엔믹스)"]);
  });

  it("정규화한 힌트가 같으면 이름 표기가 달라도 중복이다", () => {
    const text = JSON.stringify([
      item("Sullyoon", "NMIXX Sullyoon stage"),
      item("설윤", "nmixx  sullyoon  STAGE"),
      item("지수", "BLACKPINK Jisoo stage"),
    ]);
    const out = parseAiContestants(text, 2);
    expect(out.map((c) => c.name)).toEqual(["Sullyoon", "지수"]);
  });

  it("빈 힌트끼리는 중복이 아니다 — 폴백 검색어로 각자 찾는다", () => {
    const text = JSON.stringify([item("설윤", ""), item("지수", ""), item("카리나", "")]);
    expect(parseAiContestants(text, 3)).toHaveLength(3);
  });

  it("폐기 항목을 사유와 함께 알려준다 (골든 눈검사의 원천)", () => {
    const discarded: DiscardedContestant[] = [];
    const text = JSON.stringify([
      item("", "x"),
      item("설윤", "NewJeans Sullyoon 아님 Hyein 확인"),
      item("지수", "BLACKPINK Jisoo stage"),
      item("설윤(엔믹스)", "NMIXX Sullyoon"),
      item("Jisoo", "blackpink jisoo stage"),
    ]);
    parseAiContestants(text, 2, { onDiscard: (d) => discarded.push(d) });
    expect(discarded.map((d) => d.reason)).toEqual(["no-name", "polluted-hint"]);
    expect(discarded[1].name).toBe("설윤");
    expect(discarded[1].imageSearchKeyword).toBe("NewJeans Sullyoon 아님 Hyein 확인");
  });

  it("폐기 후 floor 미만이면 기존 오류 그대로 (재시도 안내)", () => {
    // 48개 전부 오염 힌트 → 남는 게 없다.
    const text = JSON.stringify(
      Array.from({ length: TOTAL_CONTESTANTS }, (_, i) =>
        item(`Player ${i + 1}`, `Group ${i + 1} 아님 확인`),
      ),
    );
    try {
      parseAiContestants(text);
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as ContestantParseError).reason).toBe("wrong_count");
      expect((e as ContestantParseError).received).toBe(0);
    }
  });

  it("과다 요청 여유분이 폐기분을 메운다 (48 요청 → 52개 중 4개 오염)", () => {
    const rows = Array.from({ length: TOTAL_CONTESTANTS + 4 }, (_, i) =>
      item(`Player ${i + 1}`, i % 13 === 0 ? `G${i} 아님 확인` : `group${i} stage`),
    );
    const out = parseAiContestants(JSON.stringify(rows));
    expect(out).toHaveLength(TOTAL_CONTESTANTS);
    expect(out.every((c) => !isPollutedHint(c.imageSearchKeyword))).toBe(true);
  });

  it("스키마는 여전히 불변이다 — 필드 4개 (RULE R1)", () => {
    const out = parseAiContestants(fakeArray(50), TOTAL_CONTESTANTS, {
      onDiscard: () => undefined,
    });
    expect(Object.keys(out[0]).sort()).toEqual([
      "imageSearchKeyword",
      "name",
      "nationality",
      "position",
    ]);
  });
});
