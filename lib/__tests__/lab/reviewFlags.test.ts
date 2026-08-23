/**
 * LAB-UX-1 Phase A — "손볼 칸"을 화면에서 다시 계산하는 층.
 *
 * 컴포넌트 렌더 테스트가 금지된 스택이므로 배지가 붙는 조건은 전부 여기서 잠근다.
 * 표본은 AI-2 골든에서 실제로 나온 모양을 쓴다 — 상상한 입력으로 통과시키면
 * 프로덕션에서 다시 놓친다.
 */
import { describe, expect, it } from "vitest";
import {
  countFlaggedSlots,
  deriveReviewFlags,
  hintTokens,
  inferTeamTokens,
  parentheticalContradictsHint,
  personTokens,
  TEAM_TOKEN_MIN_OWNERS,
  type ReviewSlot,
} from "@/lib/lab/reviewFlags";
import { isRenamedTo, normalizeNameKey, parentheticalOf } from "@/lib/lab/nameKey";

function slot(
  name: string,
  affiliation = "",
  imageSearchKeyword = "",
): ReviewSlot {
  return { name, affiliation, imageSearchKeyword };
}

describe("normalizeNameKey — functions/core와 같은 규칙이어야 한다", () => {
  it("괄호 꼬리·공백·대소문자를 무시한다", () => {
    expect(normalizeNameKey("설윤(엔믹스)")).toBe(normalizeNameKey("설윤"));
    expect(normalizeNameKey("설윤（엔믹스）")).toBe(normalizeNameKey("설윤"));
    expect(normalizeNameKey("설윤 [NMIXX]")).toBe(normalizeNameKey("설윤"));
    expect(normalizeNameKey("  I U ")).toBe(normalizeNameKey("iu"));
  });

  it("닫는 괄호가 없어도(잘린 입력) 꼬리를 지운다", () => {
    expect(normalizeNameKey("지수 (JISOO")).toBe(normalizeNameKey("지수"));
  });

  it("다른 이름은 다른 키다", () => {
    expect(normalizeNameKey("설윤")).not.toBe(normalizeNameKey("지우"));
  });

  it("빈 이름은 빈 키다", () => {
    expect(normalizeNameKey("   ")).toBe("");
  });
});

describe("parentheticalOf", () => {
  it("괄호 안쪽만 돌려준다", () => {
    expect(parentheticalOf("지수 (JISOO)")).toBe("JISOO");
    expect(parentheticalOf("김채원(허윤진)")).toBe("허윤진");
  });

  it("괄호가 없으면 빈 문자열", () => {
    expect(parentheticalOf("허윤진")).toBe("");
  });
});

describe("isRenamedTo — 영상·힌트 해제의 방아쇠", () => {
  it("한글 알맹이가 바뀌면 다른 인물이다", () => {
    expect(isRenamedTo("하린", "허윤진")).toBe(true);
  });

  it("로마자 꼬리만 손질한 건 같은 인물이다 — 떼지 않는다", () => {
    expect(isRenamedTo("지수 (JISOO)", "지수 (Jisoo)")).toBe(false);
    expect(isRenamedTo("지수 (JISOO)", "지수")).toBe(false);
  });

  it("빈칸으로 만드는 경로는 여기서 다루지 않는다(카드 비우기가 처리)", () => {
    expect(isRenamedTo("하린", "")).toBe(false);
    expect(isRenamedTo("", "하린")).toBe(false);
  });
});

describe("hintTokens / inferTeamTokens / personTokens", () => {
  it("보조어를 뺀 알맹이만 남긴다", () => {
    expect(hintTokens("BLACKPINK Jisoo stage performance").sort()).toEqual([
      "blackpink",
      "jisoo",
    ]);
  });

  it(`같은 낱말을 쓰는 인물이 ${TEAM_TOKEN_MIN_OWNERS}명 이상이면 팀 토큰이다`, () => {
    const teams = inferTeamTokens([
      slot("김채원", "", "LE SSERAFIM Chaewon stage"),
      slot("허윤진", "", "LE SSERAFIM Yunjin stage"),
      slot("사쿠라", "", "LE SSERAFIM Sakura stage"),
      slot("지수", "", "BLACKPINK Jisoo stage"),
    ]);
    expect(teams.has("sserafim")).toBe(true);
    expect(teams.has("le")).toBe(true);
    expect(teams.has("yunjin")).toBe(false);
    // 한 명뿐인 그룹은 팀으로 승격되지 않는다 — 알려진 한계(서버 주석과 동일).
    expect(teams.has("blackpink")).toBe(false);
  });

  it("인물 토큰 = 힌트에서 팀 낱말을 뺀 나머지", () => {
    const teams = new Set(["sserafim", "le"]);
    expect(personTokens("LE SSERAFIM Yunjin stage", teams)).toEqual(["yunjin"]);
  });
});

describe("parentheticalContradictsHint", () => {
  it("이름 꼬리의 소속이 힌트의 소속과 어긋나면 참", () => {
    expect(parentheticalContradictsHint("설윤(NMIXX)", "NewJeans Sullyoon stage")).toBe(
      true,
    );
  });

  it("꼬리가 힌트에 나오면 거짓", () => {
    expect(parentheticalContradictsHint("설윤(NMIXX)", "NMIXX Sullyoon stage")).toBe(
      false,
    );
  });

  it("한글 괄호는 판단하지 않는다 — 로마자 변환은 추측이다", () => {
    expect(
      parentheticalContradictsHint("김채원(허윤진)", "LE SSERAFIM Yunjin stage"),
    ).toBe(false);
  });

  it("힌트가 비면 판단하지 않는다", () => {
    expect(parentheticalContradictsHint("설윤(NMIXX)", "")).toBe(false);
  });
});

describe("deriveReviewFlags — 중복 의심", () => {
  it("이름 키가 같은 칸끼리 서로를 가리킨다", () => {
    const flags = deriveReviewFlags([
      slot("설윤", "", "NMIXX Sullyoon stage"),
      slot("지수", "", "BLACKPINK Jisoo stage"),
      slot("설윤(엔믹스)", "", "NMIXX Sullyoon performance"),
    ]);
    expect(flags[0]?.[0].kind).toBe("duplicate-suspect");
    expect(flags[0]?.[0].pairedIndexes).toEqual([2]);
    expect(flags[2]?.[0].pairedIndexes).toEqual([0]);
    expect(flags[1]).toBeUndefined();
  });

  it("소속이 둘 다 적혀 있고 서로 다르면 동명이인 — 배지를 달지 않는다 (§6 오탐 조건)", () => {
    const flags = deriveReviewFlags([
      slot("지우", "NMIXX", "NMIXX Jiwoo stage"),
      slot("지우", "KEP1ER", "KEP1ER Jiwoo performance"),
    ]);
    expect(flags[0]).toBeUndefined();
    expect(flags[1]).toBeUndefined();
  });

  it("한쪽 소속이 비면 모름이므로 사람에게 보여준다", () => {
    const flags = deriveReviewFlags([
      slot("지우", "NMIXX", "NMIXX Jiwoo stage"),
      slot("지우", "", "Jiwoo performance"),
    ]);
    expect(flags[0]?.[0].kind).toBe("duplicate-suspect");
    expect(flags[1]?.[0].kind).toBe("duplicate-suspect");
  });

  it("이름이 달라도 검색 힌트가 통째로 같으면 중복이다 (AI-2 골든의 모양)", () => {
    const flags = deriveReviewFlags([
      slot("설윤", "", "LE SSERAFIM Sakura"),
      slot("사쿠라", "", "le sserafim sakura"),
    ]);
    expect(flags[0]?.[0].kind).toBe("duplicate-suspect");
    expect(flags[0]?.[0].pairedIndexes).toEqual([1]);
  });

  it("빈 칸은 서로 중복이 아니다", () => {
    const flags = deriveReviewFlags([slot(""), slot(""), slot("")]);
    expect(countFlaggedSlots(flags)).toBe(0);
  });

  it("세 칸이 겹치면 각자 나머지 둘을 가리킨다", () => {
    const flags = deriveReviewFlags([slot("설윤"), slot("설윤"), slot("설윤")]);
    expect(flags[1]?.[0].pairedIndexes).toEqual([0, 2]);
  });
});

describe("deriveReviewFlags — 이름↔힌트 불일치", () => {
  it("이름 꼬리가 힌트와 어긋나면 배지 + 정정 후보를 남긴다", () => {
    const flags = deriveReviewFlags([
      slot("설윤(NMIXX)", "", "NewJeans Sullyoon stage"),
      slot("민지", "", "NewJeans Minji stage"),
      slot("하니", "", "NewJeans Hanni stage"),
      slot("해린", "", "NewJeans Haerin stage"),
    ]);
    const flag = flags[0]?.find((f) => f.kind === "name-hint-mismatch");
    expect(flag).toBeDefined();
    // newjeans는 네 명이 쓰므로 팀 토큰 → 정정 후보에서 빠진다.
    expect(flag?.suggestedNameTokens).toEqual(["sullyoon"]);
  });

  it("이름·힌트가 맞으면 아무 배지도 없다", () => {
    const flags = deriveReviewFlags([
      slot("지수 (JISOO)", "BLACKPINK", "BLACKPINK Jisoo stage"),
      slot("윈터 (WINTER)", "aespa", "aespa Winter stage"),
    ]);
    expect(countFlaggedSlots(flags)).toBe(0);
  });

  it("한 칸에 두 배지가 같이 붙을 수 있다", () => {
    const flags = deriveReviewFlags([
      slot("설윤(NMIXX)", "", "NewJeans Sullyoon stage"),
      slot("설윤", "", "NMIXX Sullyoon stage"),
    ]);
    const kinds = (flags[0] ?? []).map((f) => f.kind).sort();
    expect(kinds).toEqual(["duplicate-suspect", "name-hint-mismatch"]);
  });
});
