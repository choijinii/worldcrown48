/**
 * IMAGE-1 PR 1 (마티오 메모 · D-77 보충) — 이름↔영상 불일치 판정 + 발행 확인창 켜짐 조건.
 * 영상 제목·채널에 엔트리 이름(한글) · 영어 이름 · 소속(그룹) 중 하나라도 있으면 통과.
 * 대소문자·공백 무시. 영상이 없거나 제목·채널 재료가 없으면 판정하지 않는다(false).
 */
import { describe, expect, it } from "vitest";
import { mismatchSlots, nameVideoMismatch, publishConfirmReady } from "@/lib/lab/nameVideoMismatch";

describe("nameVideoMismatch", () => {
  const v = (title: string, channel = "") => ({ title, channel });
  it("한글 이름이 제목에 있으면 통과", () => {
    expect(nameVideoMismatch({ name: "뉴진스" }, v("뉴진스 Ditto 무대"))).toBe(false);
  });
  it("영어 이름 · 소속이 있으면 통과 · 채널만 맞아도 통과", () => {
    expect(nameVideoMismatch({ name: "민지", nameEn: "MINJI" }, v("Minji fancam"))).toBe(false);
    expect(nameVideoMismatch({ name: "민지", affiliation: "NewJeans" }, v("Ditto MV", "NewJeans"))).toBe(false);
  });
  it("대소문자 · 공백 무시", () => {
    expect(nameVideoMismatch({ name: "x", nameEn: "New Jeans" }, v("NEWJEANS live"))).toBe(false);
    expect(nameVideoMismatch({ name: "아이 유" }, v("아이유 콘서트"))).toBe(false);
  });
  it("아무것도 없으면 불일치", () => {
    expect(nameVideoMismatch({ name: "민지", nameEn: "Minji", affiliation: "NewJeans" }, v("IVE 'LOVE DIVE' MV", "STARSHIP"))).toBe(true);
  });
  it("영상 없음 · 재료 없음 · 이름 없음 → 판정 안 함", () => {
    expect(nameVideoMismatch({ name: "민지" }, null)).toBe(false);
    expect(nameVideoMismatch({ name: "민지" }, v("", ""))).toBe(false);
    expect(nameVideoMismatch({ name: "" }, v("anything"))).toBe(false);
  });
  it("한 글자 이름 조각은 쓰지 않는다(빈 소속 · 공백만인 영어 이름)", () => {
    expect(nameVideoMismatch({ name: "민지", nameEn: " ", affiliation: "" }, v("IVE MV"))).toBe(true);
  });
});

describe("mismatchSlots", () => {
  it("영상 칸 중 불일치 칸 번호(0부터)만", () => {
    const slots = [
      { name: "민지", videoId: "dQw4w9WgXcQ", videoTitle: "IVE MV", videoChannel: "STARSHIP" },
      { name: "하니", videoId: "dQw4w9WgXcQ", videoTitle: "하니 직캠" },
      { name: "다니엘", imageUrl: "x" },
      { name: "혜인", videoId: "dQw4w9WgXcQ" },
    ];
    expect(mismatchSlots(slots)).toEqual([0]);
  });
});

describe("publishConfirmReady", () => {
  it("체크 3개가 다 켜져야 true", () => {
    expect(publishConfirmReady([true, true, true])).toBe(true);
    expect(publishConfirmReady([true, false, true])).toBe(false);
    expect(publishConfirmReady([true, true])).toBe(false);
    expect(publishConfirmReady([])).toBe(false);
  });
});
