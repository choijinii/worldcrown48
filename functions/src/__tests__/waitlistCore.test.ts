/**
 * waitlistCore — 사전등록 입력 다듬기 (PRE-REG-1).
 *
 * 등록 함수(registerWaitlist)가 저장 전에 거치는 순수 규칙들. 트랜잭션·번호 매기기는
 * 에뮬레이터 시험(tests/rules/waitlist-register.store.test.ts)이 맡는다.
 */
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  TEST_EMAIL_DOMAIN,
  isTestEmail,
  isValidWaitlistEmail,
  normalizeEmail,
  sanitizeLang,
  sanitizeUtm,
  waitlistDocId,
} from "../core/waitlistCore";

describe("normalizeEmail — 앞뒤 공백 · 소문자", () => {
  it("공백을 자르고 소문자로 바꾼다", () => {
    expect(normalizeEmail("  Fan@Example.COM \n")).toBe("fan@example.com");
  });
  it("문자열이 아니면 빈 문자열", () => {
    expect(normalizeEmail(undefined)).toBe("");
    expect(normalizeEmail(42)).toBe("");
    expect(normalizeEmail({ email: "a@b.co" })).toBe("");
  });
});

describe("isValidWaitlistEmail — 화면과 같은 모양 + 규칙과 같은 길이", () => {
  it.each(["fan@example.com", "a.b+c@sub.example.co.kr", `fan@${TEST_EMAIL_DOMAIN}`])("받는다: %s", (e) => {
    expect(isValidWaitlistEmail(e)).toBe(true);
  });
  it.each(["", "fan", "fan@", "@example.com", "fan@example", "fan @example.com", "a@b"])("거른다: %s", (e) => {
    expect(isValidWaitlistEmail(e)).toBe(false);
  });
  it("320자를 넘으면 거른다", () => {
    const long = `${"a".repeat(310)}@example.com`;
    expect(long.length).toBeGreaterThan(320);
    expect(isValidWaitlistEmail(long)).toBe(false);
  });
});

describe("waitlistDocId — 문서 ID = sha256(정규화한 메일) · 옛 화면과 같은 값", () => {
  it("64자리 소문자 16진수이고 node sha256 과 같다", () => {
    const id = waitlistDocId("fan@example.com");
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(id).toBe(createHash("sha256").update("fan@example.com").digest("hex"));
  });
});

describe("isTestEmail — 시험 전용 도메인", () => {
  it("시험 도메인은 .test 최상위 도메인이다(실제로 배달될 수 없는 주소 · RFC 2606)", () => {
    expect(TEST_EMAIL_DOMAIN.endsWith(".test")).toBe(true);
  });
  it("시험 도메인 메일만 시험으로 본다", () => {
    expect(isTestEmail(`e2e-1@${TEST_EMAIL_DOMAIN}`)).toBe(true);
    expect(isTestEmail(`fan@example.com`)).toBe(false);
    expect(isTestEmail(`fan@not${TEST_EMAIL_DOMAIN}`)).toBe(false);
    expect(isTestEmail(`fan@${TEST_EMAIL_DOMAIN}.example.com`)).toBe(false);
  });
});

describe("sanitizeUtm — 다섯 칸 중 있는 것만", () => {
  it("source·medium·campaign·content·term 만 남긴다", () => {
    expect(
      sanitizeUtm({ source: "x", medium: "share", campaign: "best_stage_48", content: "crown_card", term: "k", other: "zz" }),
    ).toEqual({ source: "x", medium: "share", campaign: "best_stage_48", content: "crown_card", term: "k" });
  });
  it("빈 값·문자열 아닌 값은 버리고, 하나도 없으면 null", () => {
    expect(sanitizeUtm({ source: "  ", medium: 3, campaign: null })).toBeNull();
    expect(sanitizeUtm(undefined)).toBeNull();
    expect(sanitizeUtm("utm_source=x")).toBeNull();
    expect(sanitizeUtm({ source: " ig " })).toEqual({ source: "ig" });
  });
  it("값은 100자로 자른다", () => {
    expect(sanitizeUtm({ campaign: "c".repeat(300) })?.campaign).toHaveLength(100);
  });
});

describe("sanitizeLang — 화면 언어 셋만", () => {
  it.each(["ko", "en", "es"])("%s 는 그대로", (l) => {
    expect(sanitizeLang(l)).toBe(l);
  });
  it.each(["fr", "", undefined, 1, "KO"])("그 밖(%s)은 null", (l) => {
    expect(sanitizeLang(l)).toBeNull();
  });
});
