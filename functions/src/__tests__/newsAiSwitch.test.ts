/**
 * 시험 서버(에뮬레이터)에서만 뉴스 초안 AI 끄기 (대표 승인 2026-11-26).
 *
 * 에뮬레이터에는 AI 가 없어 대회가 열릴 때마다 뉴스 초안 트리거가 닫힌 주소를 부르다 약 1.2초씩 헛돈다.
 * 피치 홈 시험처럼 대회를 많이 만들면 그 줄이 밀려 라운드를 넘기는 함수(advanceRound)가 차례를 못 받았다.
 * 스위치는 NEWS_DRAFT_AI=off 이고, **에뮬레이터 안(FUNCTIONS_EMULATOR=true)일 때만** 듣는다 —
 * 실서비스에 같은 값이 잘못 들어가도 뉴스 초안은 그대로 만든다.
 */
import { describe, expect, it } from "vitest";
import { newsDraftAiOff } from "../core/newsAiSwitch";

describe("newsDraftAiOff — 에뮬레이터에서만 듣는 스위치", () => {
  it("에뮬레이터 + NEWS_DRAFT_AI=off → 끔", () => {
    expect(newsDraftAiOff({ FUNCTIONS_EMULATOR: "true", NEWS_DRAFT_AI: "off" })).toBe(true);
  });
  it("에뮬레이터라도 스위치가 없으면 켬(예전 그대로)", () => {
    expect(newsDraftAiOff({ FUNCTIONS_EMULATOR: "true" })).toBe(false);
    expect(newsDraftAiOff({ FUNCTIONS_EMULATOR: "true", NEWS_DRAFT_AI: "" })).toBe(false);
  });
  it("실서비스(에뮬레이터 아님)는 스위치가 off 여도 켬", () => {
    expect(newsDraftAiOff({ NEWS_DRAFT_AI: "off" })).toBe(false);
    expect(newsDraftAiOff({ FUNCTIONS_EMULATOR: "false", NEWS_DRAFT_AI: "off" })).toBe(false);
  });
});

describe("대회가 열릴 때 · Champion 이 정해질 때 도는 뉴스 초안 트리거가 스위치를 AI 부르기 전에 본다", () => {
  const { readFileSync } = require("node:fs") as typeof import("node:fs");
  const { join } = require("node:path") as typeof import("node:path");
  for (const file of ["onTournamentOpened.ts", "onChampionForNews.ts"]) {
    it(file, () => {
      const src = readFileSync(join(__dirname, "..", file), "utf8");
      const at = src.indexOf("newsDraftAiOff(process.env)");
      expect(at, "스위치를 부른다").toBeGreaterThan(-1);
      expect(at, "기존 초안 읽기 · AI 부르기보다 먼저").toBeLessThan(src.indexOf("existingDraftKeys(tournamentId)"));
    });
  }
});
