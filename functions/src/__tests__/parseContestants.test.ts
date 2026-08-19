import { describe, it, expect } from "vitest";
import {
  parseAiContestants,
  ContestantParseError,
  TOTAL_CONTESTANTS,
  HINT_MAX_LENGTH,
  isPollutedHint,
  normalizeNameKey,
  inferTeamTokens,
  judgeSameContestant,
  affiliationContradicts,
  parentheticalContradictsHint,
  hintTokenSet,
  personTokens,
  findExclusion,
  type ContestantNotice,
  type DiscardedContestant,
} from "../core/parseContestants";
import { ROSTER_EXCLUSIONS } from "../core/rosterExclusions";

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

  // AI-2.1: "개수만 채운 응답"의 판정 기준이 이름에서 **힌트**로 옮겨졌다.
  // 이름도 힌트도 같으면 여전히 같은 인물로 접혀 floor에 걸린다.
  it("중복 제거 후 floor 미만이면 실패한다 (개수만 채운 응답을 거른다)", () => {
    const padded = JSON.stringify(
      Array.from({ length: 48 }, (_, i) => ({
        name: `Player ${(i % 3) + 1}`,
        nationality: "KR",
        position: "FW",
        imageSearchKeyword: `group${(i % 3) + 1} player${(i % 3) + 1} stage`,
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

  it("이름만 같고 힌트가 다르면 이제 버리지 않는다 — 전부 검수 플래그로 넘긴다", () => {
    const notices: ContestantNotice[] = [];
    const rows = Array.from({ length: 6 }, (_, i) => ({
      name: "Player 1", // 전부 같은 이름
      nationality: "KR",
      position: "FW",
      imageSearchKeyword: `teamx member${i + 1} stage`, // 인물 토큰은 제각각
    }));
    const out = parseAiContestants(JSON.stringify(rows), 6, {
      onNotice: (n) => notices.push(n),
    });
    expect(out).toHaveLength(6);
    expect(notices.filter((n) => n.flag === "name-hint-mismatch")).toHaveLength(5);
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

  it("증거의 설윤 중복 — 오염분은 빠지고 정상분이 남는다", () => {
    const text = JSON.stringify([
      item("설윤", "NewJeans Sullyoon 아님 Hyein 확인"), // 슬롯 11 (오염 + 소속 오기)
      item("지수", "BLACKPINK Jisoo stage"),
      item("설윤(엔믹스)", "NMIXX Sullyoon"), // 슬롯 38 (정상)
    ]);
    const out = parseAiContestants(text, 2);
    expect(out.map((c) => c.name)).toEqual(["지수", "설윤(엔믹스)"]);
  });

  it("정규화한 힌트가 같으면 이름 표기가 달라도 같은 인물로 병합한다", () => {
    const text = JSON.stringify([
      item("Sullyoon", "NMIXX Sullyoon stage"),
      item("설윤", "nmixx  sullyoon  STAGE"),
      item("지수", "BLACKPINK Jisoo stage"),
    ]);
    // 3개를 요청해도 둘이 접혀 2명이 나온다(floor = 3 - 2 = 1 이라 통과).
    const out = parseAiContestants(text, 3);
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

/**
 * AI-2.1 (2026-08-19) — "버리지 말고 가려내라" (대표 결정).
 *
 * 1차 골든이 실측으로 보여준 것: 이름만 보고 병합하면 `김채원`(LE SSERAFIM) 뒤에
 * 온 `김채원(허윤진)`·`김채원(위클리)`가 사라진다 — 빠진 건 허윤진과 이재희다.
 */
describe("inferTeamTokens — 소속 낱말을 응답 자체에서 뽑는다 (①의 재료)", () => {
  const roster = [
    { name: "김채원", imageSearchKeyword: "LE SSERAFIM Chaewon stage" },
    { name: "허윤진", imageSearchKeyword: "LE SSERAFIM Yunjin stage" },
    { name: "홍은채", imageSearchKeyword: "LE SSERAFIM Eunchae stage" },
    { name: "카리나", imageSearchKeyword: "aespa Karina stage" },
    { name: "윈터", imageSearchKeyword: "aespa Winter stage" },
    { name: "닝닝", imageSearchKeyword: "aespa Ningning stage" },
  ];

  it("두 사람 이상의 힌트에 나오면 팀 토큰이다", () => {
    const teams = inferTeamTokens(roster);
    expect(teams.has("sserafim")).toBe(true);
    expect(teams.has("aespa")).toBe(true);
  });

  it("한 사람에게만 나오는 낱말은 인물 토큰으로 남긴다", () => {
    const teams = inferTeamTokens(roster);
    for (const person of ["chaewon", "yunjin", "eunchae", "karina", "ningning"]) {
      expect(teams.has(person)).toBe(false);
    }
  });

  it("stage·performance 같은 보조어는 애초에 토큰이 아니다", () => {
    expect(hintTokenSet("LE SSERAFIM Yunjin stage")).toEqual(["le", "sserafim", "yunjin"]);
  });
});

describe("judgeSameContestant — 이름이 겹칠 때 힌트로 가른다", () => {
  const teams = new Set(["sserafim", "le", "weeekly", "nmixx", "newjeans", "aespa"]);

  it("① 소속이 다르면 동명이인 — 둘 다 남긴다 (김채원: LE SSERAFIM vs Weeekly)", () => {
    const j = judgeSameContestant(
      { imageSearchKeyword: "LE SSERAFIM Chaewon stage" },
      { imageSearchKeyword: "Weeekly Kim Zaehee stage" },
      teams,
    );
    expect(j.verdict).toBe("different");
    expect(j.detail).toContain("동명이인");
  });

  it("② 소속이 같고 인물이 다르면 둘 다 남긴다 (LE SSERAFIM Chaewon vs Yunjin)", () => {
    const j = judgeSameContestant(
      { imageSearchKeyword: "LE SSERAFIM Chaewon stage" },
      { imageSearchKeyword: "LE SSERAFIM Yunjin stage" },
      teams,
    );
    expect(j.verdict).toBe("different");
    expect(j.personTokens).toContain("yunjin");
  });

  it("② 소속·인물이 모두 같으면 동일 인물로 병합한다 (NMIXX Sullyoon 2건)", () => {
    const j = judgeSameContestant(
      { imageSearchKeyword: "NMIXX Sullyoon stage" },
      { imageSearchKeyword: "nmixx sullyoon performance" },
      teams,
    );
    expect(j.verdict).toBe("same");
  });

  it("③ 인물은 같은데 소속이 다르면 못 가린 것으로 본다 — 소속 오기일 수 있다", () => {
    const j = judgeSameContestant(
      { imageSearchKeyword: "NewJeans Sullyoon" },
      { imageSearchKeyword: "NMIXX Sullyoon" },
      teams,
    );
    expect(j.verdict).toBe("unsure");
    expect(j.detail).toContain("소속이 다르다");
  });

  it("③ 힌트에 팀 이름만 있으면 못 가린다", () => {
    const j = judgeSameContestant(
      { imageSearchKeyword: "LE SSERAFIM stage" },
      { imageSearchKeyword: "LE SSERAFIM performance" },
      teams,
    );
    expect(j.verdict).toBe("unsure");
  });

  it("③ 힌트가 비어 있으면 못 가린다", () => {
    expect(
      judgeSameContestant({ imageSearchKeyword: "" }, { imageSearchKeyword: "aespa Karina" }, teams)
        .verdict,
    ).toBe("unsure");
  });
});

describe("parseAiContestants — 이름이 겹쳐도 버리지 않는다 (AI-2.1)", () => {
  const row = (name: string, hint: string, position = "") => ({
    name,
    nationality: "KR",
    position,
    imageSearchKeyword: hint,
  });

  /** 팀 토큰이 뽑히도록 같은 그룹 멤버를 여럿 깔아 준다(실제 48명 응답의 조건). */
  const roster = [
    row("김채원", "LE SSERAFIM Chaewon stage"),
    row("사쿠라", "LE SSERAFIM Sakura stage"),
    row("카즈하", "LE SSERAFIM Kazuha stage"),
    row("이수진", "Weeekly Lee Soojin stage"),
    row("신지윤", "Weeekly Shin Jiyoon stage"),
  ];

  it("동명이인은 둘 다 살아남는다 — 골든이 잃었던 이재희가 돌아온다", () => {
    const text = JSON.stringify([...roster, row("김채원(위클리)", "Weeekly Kim Zaehee stage")]);
    const out = parseAiContestants(text, 6);
    expect(out.map((c) => c.name)).toContain("김채원(위클리)");
    expect(out).toHaveLength(6);
  });

  it("같은 팀의 다른 인물도 둘 다 살아남는다 — 허윤진이 돌아온다", () => {
    const notices: ContestantNotice[] = [];
    const text = JSON.stringify([...roster, row("김채원(허윤진)", "LE SSERAFIM Yunjin stage")]);
    const out = parseAiContestants(text, 6, { onNotice: (n) => notices.push(n) });

    expect(out.map((c) => c.name)).toContain("김채원(허윤진)");
    // 이름은 겹치는데 다른 인물이다 → 이름 칸이 틀렸다는 신호를 남긴다(요구 2).
    const flagged = notices.find((n) => n.flag === "name-hint-mismatch");
    expect(flagged?.name).toBe("김채원(허윤진)");
    expect(flagged?.suggestedNameTokens).toContain("yunjin"); // 정정 후보
    expect(flagged?.index).toBe(5); // 슬롯 6
  });

  it("같은 인물이 확인될 때만 병합한다", () => {
    const discarded: DiscardedContestant[] = [];
    const text = JSON.stringify([
      row("설윤", "NMIXX Sullyoon stage"),
      row("지우", "NMIXX Jiwoo stage"),
      row("배이", "NMIXX Bae stage"),
      row("설윤(엔믹스)", "NMIXX Sullyoon performance"),
    ]);
    const out = parseAiContestants(text, 4, { onDiscard: (d) => discarded.push(d) });
    expect(out.map((c) => c.name)).toEqual(["설윤", "지우", "배이"]);
    expect(discarded.map((d) => d.reason)).toEqual(["duplicate-merged"]);
    expect(discarded[0].detail).toContain("인물 토큰이 일치");
  });

  it("못 가리면 둘 다 남기고 '중복 의심'을 단다", () => {
    const notices: ContestantNotice[] = [];
    const text = JSON.stringify([
      row("설윤", "NewJeans Sullyoon"),
      row("혜인", "NewJeans Hyein stage"),
      row("다니엘", "NewJeans Danielle stage"),
      row("지우", "NMIXX Jiwoo stage"),
      row("배이", "NMIXX Bae stage"),
      row("설윤(엔믹스)", "NMIXX Sullyoon"),
    ]);
    const out = parseAiContestants(text, 6, { onNotice: (n) => notices.push(n) });

    expect(out).toHaveLength(6); // 둘 다 남았다
    const suspect = notices.find((n) => n.flag === "duplicate-suspect");
    expect(suspect?.name).toBe("설윤(엔믹스)");
    expect(suspect?.pairedIndex).toBe(0);
    // 같은 인물이 두 소속으로 오르면 그 인물 토큰이 팀으로 오분류될 수 있다
    // (inferTeamTokens 한계 ②). 그래도 결론은 같다 — 조용히 병합하지 않는다.
    expect(suspect?.detail).toMatch(/소속이 다르다|가릴 수 없다/);
  });

  it("병합할 때 소속이 힌트와 어긋나는 쪽을 접는다 (일관된 쪽 유지)", () => {
    // 증거 슬롯 11의 모양 그대로다: 이름 설윤 · position "NewJeans 메인댄서" ·
    // 실제로는 NMIXX. NewJeans 멤버가 함께 실려 있어야 `newjeans`가 팀 낱말로
    // 인식되고, 그래야 "소속이 힌트와 어긋난다"를 말할 수 있다(실제 48명 응답의 조건).
    const text = JSON.stringify([
      row("설윤", "NMIXX Sullyoon stage", "NewJeans 메인댄서"), // 소속 오기
      row("혜인", "NewJeans Hyein stage", "NewJeans 막내"),
      row("다니엘", "NewJeans Danielle stage", "NewJeans 보컬"),
      row("해린", "NewJeans Haerin stage", "NewJeans 댄서"),
      row("지우", "NMIXX Jiwoo stage", "NMIXX 메인댄서"),
      row("배이", "NMIXX Bae stage", "NMIXX 리더"),
      row("설윤(엔믹스)", "NMIXX Sullyoon stage", "NMIXX 메인보컬"), // 일관됨
    ]);
    const out = parseAiContestants(text, 7);
    expect(out[0].name).toBe("설윤(엔믹스)");
    expect(out[0].position).toBe("NMIXX 메인보컬");
  });

  it("한국어 직책만 있는 position은 모순이 아니다 (정보 없음)", () => {
    const teams = new Set(["nmixx"]);
    expect(
      affiliationContradicts(
        { position: "메인보컬", imageSearchKeyword: "NMIXX Sullyoon" },
        teams,
      ),
    ).toBe(false);
    expect(
      affiliationContradicts(
        { position: "NewJeans 메인댄서", imageSearchKeyword: "NMIXX Sullyoon" },
        new Set(["nmixx", "newjeans"]),
      ),
    ).toBe(true);
  });

  it("이름 괄호가 라틴 문자로 힌트와 어긋나면 겹치는 상대가 없어도 알린다", () => {
    expect(parentheticalContradictsHint("설윤(NMIXX)", "NewJeans Sullyoon")).toBe(true);
    expect(parentheticalContradictsHint("설윤(NMIXX)", "NMIXX Sullyoon")).toBe(false);
    // 한글 괄호는 로마자 힌트와 문자가 달라 여기서 판단하지 않는다.
    expect(parentheticalContradictsHint("김채원(허윤진)", "LE SSERAFIM Yunjin")).toBe(false);
  });
});

/**
 * AI-2.2 (2026-08-20) — 인물 토큰 충돌 검출 + 서버 제외 목록.
 *
 * 2026-08-19 골든이 남긴 두 구멍을 막는다:
 *   ① 이름도 검색어도 다른데 **같은 인물**인 중복 6쌍을 아무도 못 잡았다
 *   ② 프롬프트에 적격성 규칙이 있는데도 수진이 3회 중 2회 명단에 올랐다
 */
describe("인물 토큰 충돌 — 이름이 달라도 같은 사람을 가리키면 잡는다 (AI-2.2 ①)", () => {
  const row = (name: string, hint: string, position = "") => ({
    name,
    nationality: "KR",
    position,
    imageSearchKeyword: hint,
  });

  /** 팀 토큰이 서려면 그룹당 3명 이상이 필요하다(TEAM_TOKEN_MIN_OWNERS). */
  const sserafim = [
    row("김채원", "LE SSERAFIM Kim Chaewon stage"),
    row("허윤진", "LE SSERAFIM Yunjin stage"),
    row("카즈하", "LE SSERAFIM Kazuha stage"),
    row("홍은채", "LE SSERAFIM Eunchae stage"),
  ];

  it("골든 #3의 `설윤`🔎Sakura + `사쿠라`🔎Sakura 를 같은 인물로 잡는다", () => {
    const notices: ContestantNotice[] = [];
    const text = JSON.stringify([
      ...sserafim,
      row("설윤", "LE SSERAFIM Sakura stage"), // 이름표가 틀린 항목
      row("사쿠라", "LE SSERAFIM Sakura performance"),
    ]);
    const out = parseAiContestants(text, 6, { onNotice: (n) => notices.push(n) });

    expect(out).toHaveLength(5); // 둘이 하나로 접혔다
    // 이름 표기가 서로 달랐으므로 살아남은 이름을 확인하라고 알린다.
    const flag = notices.find((n) => n.flag === "name-hint-mismatch");
    expect(flag?.suggestedNameTokens).toContain("sakura");
    expect(flag?.detail).toContain("같은 인물을 가리킨다");
  });

  it("골든 #1의 `채원` + `김채원`(둘 다 Chaewon)을 잡는다 — 부분집합", () => {
    const text = JSON.stringify([
      row("채원", "LE SSERAFIM Chaewon stage"),
      ...sserafim.slice(1),
      row("김채원", "LE SSERAFIM Kim Chaewon stage"),
    ]);
    expect(parseAiContestants(text, 5)).toHaveLength(4);
  });

  it("같은 팀의 다른 멤버는 여전히 전원 살아남는다 (오탐 없음)", () => {
    const out = parseAiContestants(JSON.stringify(sserafim), 4);
    expect(out.map((c) => c.name)).toEqual([
      "김채원",
      "허윤진",
      "카즈하",
      "홍은채",
    ]);
  });

  it("인물 토큰이 일부만 겹치면 같다고 단정하지 않는다 — 둘 다 남기고 플래그", () => {
    const notices: ContestantNotice[] = [];
    // 소속이 팀으로 안 잡히는 작은 응답(2명)에서 `nmixx`가 인물 토큰으로 남는 경우.
    const text = JSON.stringify([
      row("해원", "NMIXX Haewon stage"),
      row("릴리", "NMIXX Lily stage"),
    ]);
    const out = parseAiContestants(text, 2, { onNotice: (n) => notices.push(n) });
    expect(out).toHaveLength(2);
    expect(notices[0]?.flag).toBe("duplicate-suspect");
    expect(notices[0]?.detail).toContain("일부만 겹친다");
  });

  it("한 음절 활동명도 인물 토큰으로 남는다 (STAYC 윤)", () => {
    const teams = new Set(["stayc"]);
    expect(personTokens("STAYC 윤 stage", teams)).toEqual(["윤"]);
  });
});

describe("findExclusion — 이름과 소속이 함께 맞을 때만 제외한다 (AI-2.2 ③)", () => {
  const at = (name: string, hint: string, position = "") => ({
    name,
    position,
    imageSearchKeyword: hint,
  });

  it("골든에 실제로 올라왔던 두 형태를 모두 잡는다", () => {
    expect(findExclusion(at("수진", "(G)I-DLE Soyeon stage"))?.reason).toContain(
      "학교폭력",
    );
    expect(findExclusion(at("수진", "GIDLE Soojin stage"))).not.toBeNull();
  });

  it("이름표가 엉뚱해도 힌트가 제외 대상을 가리키면 잡는다", () => {
    // 슬롯에 들어갈 영상이 제외 대상의 것이면 이름이 뭐든 막아야 한다.
    expect(findExclusion(at("미연", "GIDLE Soojin stage"))).not.toBeNull();
  });

  it("동명이인은 막지 않는다 — 소속이 다르면 통과 (위클리 이수진)", () => {
    expect(findExclusion(at("이수진", "Weeekly Lee Soojin stage"))).toBeNull();
    expect(findExclusion(at("수진", "Weeekly Soojin stage"))).toBeNull();
  });

  it("소속이 position 쪽에만 적혀 있어도 잡는다", () => {
    expect(findExclusion(at("수진", "Soojin stage", "(여자)아이들 메인댄서"))).not.toBeNull();
  });

  it("관계없는 인물은 건드리지 않는다", () => {
    expect(findExclusion(at("카리나", "aespa Karina stage"))).toBeNull();
    expect(findExclusion(at("우기", "(G)I-DLE Yuqi stage"))).toBeNull();
  });

  it("목록 항목은 사유와 등록일을 반드시 갖는다 (근거 없이 사람을 막지 않는다)", () => {
    expect(ROSTER_EXCLUSIONS.length).toBeGreaterThan(0);
    for (const entry of ROSTER_EXCLUSIONS) {
      expect(entry.names.length).toBeGreaterThan(0);
      expect(entry.affiliation.length).toBeGreaterThan(0);
      expect(entry.reason.trim()).not.toBe("");
      expect(entry.addedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("파서가 제외 항목을 사유와 함께 버린다", () => {
    const discarded: DiscardedContestant[] = [];
    const rows = [
      { name: "우기", nationality: "KR", position: "(G)I-DLE 래퍼", imageSearchKeyword: "(G)I-DLE Yuqi stage" },
      { name: "미연", nationality: "KR", position: "(G)I-DLE 보컬", imageSearchKeyword: "(G)I-DLE Miyeon stage" },
      { name: "수진", nationality: "KR", position: "(G)I-DLE 댄서", imageSearchKeyword: "(G)I-DLE Soojin stage" },
      { name: "민니", nationality: "KR", position: "(G)I-DLE 보컬", imageSearchKeyword: "(G)I-DLE Minnie stage" },
    ];
    const out = parseAiContestants(JSON.stringify(rows), 4, {
      onDiscard: (d) => discarded.push(d),
    });
    expect(out.map((c) => c.name)).toEqual(["우기", "미연", "민니"]);
    expect(discarded).toHaveLength(1);
    expect(discarded[0]).toMatchObject({ reason: "excluded", name: "수진" });
    expect(discarded[0].detail).toContain("탈퇴");
  });
});
