/**
 * LAB-FIX-4 — "AI에게 알려 줄 내용" 묶음이 **비어 있을 때** 세 AI 일의 지시문이 고치기 전과
 * 글자 하나 다르지 않음을 잠근다(지시서 §3-2 잠금 주의 · §10). 개인 링크 제목 읽기 지시문은
 * extractContestantsCore.test.ts 가 이미 잠근다 — 여기는 나머지(팀 추출 · 명단 채우기 개인/팀 ·
 * 이름 3언어)다. 값은 LAB-FIX-4 를 시작하기 전 main(9e2b629)에서 잰 것이다.
 */
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { buildTeamExtractPrompt, type ExtractItem } from "../core/extractContestantsCore";
import { buildPrompt } from "../core/aiFillCore";
import { buildNamesPrompt } from "../core/translateContestantNamesCore";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

const items: ExtractItem[] = [
  { videoId: "aaaaaaaaaaa", title: "[KARINA FOCUS] aespa 카리나 직캠", channelTitle: "MNET K-POP" },
  { videoId: "bbbbbbbbbbb", title: "무대 모음", channelTitle: "someone" },
];
const fillOpts = {
  title: "최고의 무대",
  category: "KPOP",
  description: "현역 아이돌",
  keywords: ["무대", "직캠"],
  existing: ["카리나"],
  count: 47,
};

describe("LAB-FIX-4 — 묶음이 빈 대회의 지시문 잠금", () => {
  it("팀 링크 제목 읽기", () => {
    expect(sha(buildTeamExtractPrompt(items))).toBe("e88bcd7716f393ede1b6904a95d4435e29ea076b24bd4cc9de006b9e5713c536");
  });
  it("명단 채우기 — 개인", () => {
    expect(sha(buildPrompt({ ...fillOpts }))).toBe("40a366c525f3939b2e8f2a9f668ab2a3cf0a93b70b3aad84357ff8ecc36cc861");
  });
  it("명단 채우기 — 팀", () => {
    expect(sha(buildPrompt({ ...fillOpts, entryUnit: "group" }))).toBe("b7d7fe74c2119b7bf58bb0dae08dc8cde4f5d9425978bb020f9af276a1528916");
  });
  it("이름 3언어", () => {
    expect(sha(buildNamesPrompt([{ name: "카리나", affiliation: "aespa" }, { name: "뉴진스" }], "KPOP"))).toBe("f8244ce3b0071b525a120ec081e3036965a1871fb59805237e60b09d5968298c");
  });
});
