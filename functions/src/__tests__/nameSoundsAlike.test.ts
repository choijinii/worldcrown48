import { describe, it, expect } from "vitest";
import { nameSoundsAlike } from "../core/nameSoundsAlike";
import { REVIEWED_NAME_PAIRS } from "./fixtures/reviewedNames";

// NAME-I18N-1 PR 2 (대표 2026-10-24 · A안): AI 가 다른 엔트리의 영어 이름을 확신 있게 넣은
// 사례가 백필 dry-run 에서 7건 나왔다. 번호 맞추기로는 못 막는다 — 영어 이름이 한글 발음과
// 맞지 않으면 그 칸을 비우고 "먼저 볼 이름"으로 올린다. 이 함수가 그 판정이다.

describe("nameSoundsAlike — 다른 사람 이름을 잡는다", () => {
  // 2026-10-22 백필 dry-run 에서 실제로 나온 7건 (대표 검수표에서 고친 것).
  const WRONG_PERSON: [string, string][] = [
    ["설윤", "Yeji"],
    ["채령", "Ryujin"],
    ["전소연", "Soojin"],
    ["가을", "Kazuha"],
    ["허윤진", "Chaewon"],
    ["이채연", "Leeseo"],
    ["화란", "Huh Yunjin"],
  ];
  it.each(WRONG_PERSON)("%s → %s 는 맞지 않는다", (ko, en) => {
    expect(nameSoundsAlike(ko, en)).toBe(false);
  });
});

describe("nameSoundsAlike — 맞는 이름은 통과", () => {
  it("대표가 고친 11곳은 전부 통과", () => {
    const FIXED: [string, string][] = [
      ["허윤진", "Huh Yunjin"],
      ["채령", "Chaeryeong"],
      ["김채원", "Kim Chaewon"],
      ["전소연", "Soyeon"],
      ["김재중", "Kim Jaejoong"],
      ["설윤", "Sullyoon"],
      ["이채연", "Lee Chaeyeon"],
      ["가을", "Gaeul"],
    ];
    for (const [ko, en] of FIXED) expect(nameSoundsAlike(ko, en), `${ko} → ${en}`).toBe(true);
  });

  it("성을 빼거나 뒤로 보낸 표기도 같은 사람", () => {
    expect(nameSoundsAlike("허윤진", "Yunjin")).toBe(true);
    expect(nameSoundsAlike("허윤진", "Yunjin Huh")).toBe(true);
    expect(nameSoundsAlike("김채원", "Chaewon")).toBe(true);
    expect(nameSoundsAlike("김재중", "Kim Jae-joong")).toBe(true);
    expect(nameSoundsAlike("설윤", "Seol-yun")).toBe(true);
  });

  it("발음과 다른 공식 이름(아이유 → IU · 뉴진스 → NewJeans · 에스파 → aespa)", () => {
    expect(nameSoundsAlike("아이유", "IU")).toBe(true);
    expect(nameSoundsAlike("뉴진스", "NewJeans")).toBe(true);
    expect(nameSoundsAlike("에스파", "aespa")).toBe(true);
  });

  it("이름 칸에 이미 로마자가 들어 있으면 그것과 같으면 통과", () => {
    expect(nameSoundsAlike("Kai (카이) – EXO-K", "KAI")).toBe(true);
    expect(nameSoundsAlike("J-Hope (제이홉)", "j-hope")).toBe(true);
    expect(nameSoundsAlike("Lay Zhang (레이)", "Lay")).toBe(true);
    expect(nameSoundsAlike("로제 (Rosé)", "Rosé")).toBe(true);
  });

  it("대소문자·띄어쓰기·악센트는 따지지 않는다", () => {
    expect(nameSoundsAlike("로제", "ROSE")).toBe(true);
    expect(nameSoundsAlike("뱀뱀", "BamBam")).toBe(true);
  });

  it("대표 검수를 마친 실제 이름 128쌍은 전부 통과 (잘못 올리는 이름 0)", () => {
    const flagged = REVIEWED_NAME_PAIRS.filter(([ko, en]) => !nameSoundsAlike(ko, en));
    expect(REVIEWED_NAME_PAIRS.length).toBe(128);
    expect(flagged).toEqual([]);
  });
});
