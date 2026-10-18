/**
 * 사전등록 보관 기간 한 줄 (PRE-REG-1 · 원장 D-57 · 대표 승인 2026-10-18).
 *
 * `/launch` 이메일 칸 아래 기존 작은 글씨(`launch.waitlist.privacy`) 바로 아래에 한 줄을 더 둔다 —
 * 처리방침 안에만 두면 팬이 모르니 등록하는 자리에서 알린다. 끝 낱말 "개인정보처리방침"은 처리방침
 * 1.1(사전등록 문단)으로 가는 링크. 날짜는 쓰지 않는다(대외 문안 날짜 금지).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/lib/i18n/messages";
import { retentionNoteParts, retentionPolicyHref } from "@/lib/launch/retentionNote";

const ROOT = path.resolve(__dirname, "../../..");

const APPROVED = {
  ko: "등록 정보는 정식 개막 후 12개월 보관 · 요청하면 바로 삭제 · 개인정보처리방침",
  en: "Kept for 12 months after the official opening · deleted right away on request · Privacy Policy",
  es: "Se conserva 12 meses tras la apertura oficial · se borra de inmediato si lo pides · Política de privacidad",
} as const;

describe("launch.waitlist.retention — 승인 글자 그대로", () => {
  it.each(Object.entries(APPROVED))("%s", (lang, text) => {
    expect(MESSAGES["launch.waitlist.retention"][lang as keyof typeof APPROVED]).toBe(text);
  });

  it("날짜·혜택 낱말이 없다", () => {
    for (const text of Object.values(APPROVED)) {
      expect(text).not.toMatch(/\d{1,2}\/\d{1,2}|20\d\d|\b200\b|배지|badge|insignia|파운딩|founding|The Lab/i);
    }
  });
});

describe("retentionNoteParts — 끝 낱말만 링크", () => {
  it.each([
    ["ko", "등록 정보는 정식 개막 후 12개월 보관 · 요청하면 바로 삭제 · ", "개인정보처리방침"],
    ["en", "Kept for 12 months after the official opening · deleted right away on request · ", "Privacy Policy"],
    ["es", "Se conserva 12 meses tras la apertura oficial · se borra de inmediato si lo pides · ", "Política de privacidad"],
  ] as const)("%s", (lang, before, link) => {
    expect(retentionNoteParts(APPROVED[lang])).toEqual({ before, link });
  });

  it("구분점이 없으면 링크 없이 글자 그대로", () => {
    expect(retentionNoteParts("plain")).toEqual({ before: "plain", link: null });
  });
});

describe("retentionPolicyHref — 처리방침 1.1(사전등록 문단) · 화면 언어 그대로", () => {
  it.each(["ko", "en", "es"] as const)("%s", (lang) => {
    expect(retentionPolicyHref(lang)).toBe(`/policies/privacy?lang=${lang}#1.1`);
  });

  it.each(["ko", "en", "es"] as const)("%s 처리방침에 1.1 절이 있고 사전등록 문단이 그 안에 있다", (lang) => {
    const md = readFileSync(path.join(ROOT, "content", lang, "privacy.md"), "utf8");
    const lines = md.split("\n");
    const at = lines.findIndex((l) => /^### 1\.1 /.test(l));
    expect(at).toBeGreaterThan(-1);
    const end = lines.findIndex((l, i) => i > at && /^#{2,3} /.test(l));
    expect(lines.slice(at, end).join("\n")).toMatch(/Waitlist/);
  });
});

describe("WaitlistForm — 기존 작은 글씨 바로 아래 한 줄", () => {
  it("wl-privacy 다음에 wl-retention · 기존 privacy 키는 그대로", () => {
    const src = readFileSync(path.join(ROOT, "components/launch/WaitlistForm.tsx"), "utf8");
    const privacy = src.indexOf('<p className="wl-privacy">{t("launch.waitlist.privacy")}</p>');
    const retention = src.indexOf('<p className="wl-retention">');
    expect(privacy).toBeGreaterThan(-1);
    expect(retention).toBeGreaterThan(privacy);
    expect(src).toContain('t("launch.waitlist.retention")');
  });
});
