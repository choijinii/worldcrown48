/**
 * waitlistSubmit — 사전등록 화면 ↔ 등록 함수(registerWaitlist) (PRE-REG-1).
 *
 * 화면은 더 이상 `waitlist` 에 직접 쓰지 않는다. 함수에 메일·처음 경로·화면 언어를 넘기고,
 * 돌아온 상태(번호 없음)를 기존 화면 상태로 옮긴다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/lib/i18n/messages";
import {
  REGISTER_WAITLIST_FN,
  waitlistOutcomeFromError,
  waitlistOutcomeFromResult,
  waitlistPayload,
} from "@/lib/launch/waitlistSubmit";

const ROOT = path.resolve(__dirname, "../../..");

describe("waitlistPayload — 함수에 넘기는 값", () => {
  it("정규화한 메일 · 처음 경로 · 화면 언어", () => {
    expect(waitlistPayload(" Fan@Example.com ", { source: "ig" }, "es")).toEqual({
      email: "fan@example.com",
      utm: { source: "ig" },
      lang: "es",
    });
  });
  it("경로가 없으면 utm 칸을 넣지 않는다", () => {
    expect(waitlistPayload("a@b.co", null, "ko")).toEqual({ email: "a@b.co", lang: "ko" });
  });
});

describe("결과 → 화면 상태", () => {
  it("registered → success · duplicate → duplicate", () => {
    expect(waitlistOutcomeFromResult({ status: "registered" })).toBe("success");
    expect(waitlistOutcomeFromResult({ status: "duplicate" })).toBe("duplicate");
  });
  it("모르는 모양은 실패로 본다(성공으로 속이지 않는다)", () => {
    expect(waitlistOutcomeFromResult(null)).toBe("invalid");
    expect(waitlistOutcomeFromResult({ status: "weird" })).toBe("invalid");
  });
  it("invalid-argument → invalid · resource-exhausted → rateLimited", () => {
    expect(waitlistOutcomeFromError({ code: "functions/invalid-argument" })).toBe("invalid");
    expect(waitlistOutcomeFromError({ code: "functions/resource-exhausted" })).toBe("rateLimited");
  });
  it("그 밖의 실패는 지금처럼 invalid(기존 화면 동작 유지)", () => {
    expect(waitlistOutcomeFromError({ code: "functions/internal" })).toBe("invalid");
    expect(waitlistOutcomeFromError(new Error("network"))).toBe("invalid");
  });
});

describe("화면 코드", () => {
  const src = readFileSync(path.join(ROOT, "components/launch/WaitlistForm.tsx"), "utf8");
  it("브라우저가 waitlist 에 직접 쓰지 않는다 — 등록 함수만 부른다", () => {
    expect(src).not.toMatch(/setDoc|addDoc|from "firebase\/firestore"/);
    expect(src).toContain("callRegisterWaitlist");
    expect(REGISTER_WAITLIST_FN).toBe("registerWaitlist");
  });
  it("이벤트 이름은 그대로 waitlist_submit · waitlist_duplicate", () => {
    expect(src).toContain('"waitlist_submit"');
    expect(src).toContain('"waitlist_duplicate"');
  });
  it("선착순 번호를 화면 코드가 다루지 않는다", () => {
    expect(src).not.toMatch(/founding|rank/i);
  });
  it("속도 제한 안내 문구가 3언어로 있다", () => {
    const m = MESSAGES["launch.waitlist.errRateLimited"];
    expect(m.ko && m.en && m.es).toBeTruthy();
  });
});
