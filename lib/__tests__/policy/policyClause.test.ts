/**
 * POLICY-ES-1 Phase D — "한국어 원문 우선" 조항 + 문서 버전 1.1 (§9 게이트 3 · 대표 승인 2026-10-05).
 *
 * 12개 문서(3언어 × 4종) 모두 같은 자리 — 날짜 줄 바로 아래 인용 블록 — 에 그 언어의 조항 문장이
 * 있어야 한다. 본문의 "최종 업데이트" 줄도 2026-10-05 로 맞춘다(대표 지시 ②). 시행일은 그대로.
 *
 * R4: 문서 버전(1.0 → 1.1)은 동의 버전과 **별개**다. CURRENT_POLICY_VERSION 은 "1.0" 그대로이고,
 * 이미 동의한 팬의 흔적 쿠키 "1.0.<ms>" 는 계속 유효하다 — 동의 바가 다시 뜨지 않는다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { POLICY_TYPES } from "@/lib/policyTypes";
import { CURRENT_POLICY_VERSION, parseConsentBreadcrumb } from "@/lib/cookieConsent";

const ROOT = path.resolve(__dirname, "../../..");

const CLAUSE = {
  ko: "이 문서는 한국어로 작성되었으며, 번역본과 내용이 다를 경우 한국어 원문이 우선합니다.",
  en: "This document was written in Korean. If a translation differs from the Korean original, the Korean original prevails.",
  es: "Este documento fue redactado en coreano. Si una traducción difiere del original en coreano, prevalecerá el original en coreano.",
} as const;

const UPDATED = {
  ko: "최종 업데이트: 2026년 10월 5일",
  en: "Last updated: October 5, 2026",
  es: "Última actualización: 5 de octubre de 2026",
} as const;

const LANGS = ["ko", "en", "es"] as const;

for (const lang of LANGS) {
  describe(`정책 문서 머리 (${lang})`, () => {
    for (const type of POLICY_TYPES) {
      const raw = readFileSync(path.join(ROOT, "content", lang, `${type}.md`), "utf8");
      const { data, content } = matter(raw);
      const lines = content.split("\n").filter((l) => l.trim() !== "");

      it(`${type}: H1 → 날짜 줄(2026-10-05) → 원문 우선 인용 블록`, () => {
        expect(lines[0]).toMatch(/^# /);
        expect(lines[1]).toMatch(new RegExp(`^\\*\\*${UPDATED[lang]}( · .*)?\\*\\*$`));
        expect(lines[2]).toBe(`> ${CLAUSE[lang]}`);
      });

      it(`${type}: 조항은 한 번뿐`, () => {
        expect(raw.split(CLAUSE[lang]).length - 1).toBe(1);
      });

      it(`${type}: 프론트매터 version 1.1 · lastUpdated 2026-10-05 · 꼬리말 v1.1`, () => {
        expect(String(data.version)).toBe("1.1");
        const d = data.lastUpdated instanceof Date ? data.lastUpdated.toISOString().slice(0, 10) : String(data.lastUpdated);
        expect(d).toBe("2026-10-05");
        expect(raw).not.toMatch(/ v1\.0\*/);
        expect(raw).toMatch(/ v1\.1\*\s*$/);
      });
    }
  });
}

describe("R4 — 문서 버전과 동의 버전은 별개", () => {
  it("CURRENT_POLICY_VERSION 은 1.0 그대로", () => {
    expect(CURRENT_POLICY_VERSION).toBe("1.0");
  });

  it("이미 동의한 팬의 흔적 쿠키 1.0.<ms> 는 문서가 1.1 이 된 뒤에도 유효하다", () => {
    const saved = new Date("2026-09-01T00:00:00Z");
    const now = new Date("2026-10-06T00:00:00Z");
    expect(parseConsentBreadcrumb(`1.0.${saved.getTime()}`, now)?.getTime()).toBe(saved.getTime());
  });
});
