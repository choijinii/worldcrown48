/**
 * POLICY-ES-1 Phase D — "한국어 원문 우선" 조항 + 문서 버전 1.1 (§9 게이트 3 · 대표 승인 2026-10-05).
 *
 * 12개 문서(3언어 × 4종) 모두 같은 자리 — 날짜 줄 바로 아래 인용 블록 — 에 그 언어의 조항 문장이
 * 있어야 한다. 본문의 "최종 업데이트" 줄도 2026-10-05 로 맞춘다(대표 지시 ②). 시행일은 그대로.
 *
 * POLICY-YT-1 (2026-10-10): 문서 버전 1.1 → 1.2 · 최종 업데이트 2026-10-10 (부록 A·B 반영).
 * R4: 문서 버전(1.0 → 1.1 → 1.2)은 동의 버전과 **별개**다. CURRENT_POLICY_VERSION 은 "1.0" 그대로이고,
 * 이미 동의한 팬의 흔적 쿠키 "1.0.<ms>" 는 계속 유효하다 — 동의 바가 다시 뜨지 않는다.
 *
 * PRE-REG-1 (2026-10-18): 개인정보처리방침·쿠키 정책만 1.2 → 1.3 · 최종 업데이트 2026-10-18
 * (사전등록 순번·처음 들어온 경로·wc48_utm). 이용약관·커뮤니티 정책은 1.2 · 2026-10-10 그대로 —
 * 그래서 판 번호·날짜를 문서마다 따로 본다.
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

const UPDATED_1010 = {
  ko: "최종 업데이트: 2026년 10월 10일",
  en: "Last updated: October 10, 2026",
  es: "Última actualización: 10 de octubre de 2026",
} as const;
const UPDATED_1018 = {
  ko: "최종 업데이트: 2026년 10월 18일",
  en: "Last updated: October 18, 2026",
  es: "Última actualización: 18 de octubre de 2026",
} as const;

/** 문서마다 판 번호 · 최종 업데이트. */
const DOC: Record<string, { version: string; date: string; updated: typeof UPDATED_1010 | typeof UPDATED_1018 }> = {
  privacy: { version: "1.3", date: "2026-10-18", updated: UPDATED_1018 },
  cookies: { version: "1.3", date: "2026-10-18", updated: UPDATED_1018 },
  terms: { version: "1.2", date: "2026-10-10", updated: UPDATED_1010 },
  community: { version: "1.2", date: "2026-10-10", updated: UPDATED_1010 },
};

const LANGS = ["ko", "en", "es"] as const;

for (const lang of LANGS) {
  describe(`정책 문서 머리 (${lang})`, () => {
    for (const type of POLICY_TYPES) {
      const raw = readFileSync(path.join(ROOT, "content", lang, `${type}.md`), "utf8");
      const { data, content } = matter(raw);
      const lines = content.split("\n").filter((l) => l.trim() !== "");

      const want = DOC[type];

      it(`${type}: H1 → 날짜 줄(${want.date}) → 원문 우선 인용 블록`, () => {
        expect(lines[0]).toMatch(/^# /);
        expect(lines[1]).toMatch(new RegExp(`^\\*\\*${want.updated[lang]}( · .*)?\\*\\*$`));
        expect(lines[2]).toBe(`> ${CLAUSE[lang]}`);
      });

      it(`${type}: 조항은 한 번뿐`, () => {
        expect(raw.split(CLAUSE[lang]).length - 1).toBe(1);
      });

      it(`${type}: 프론트매터 version ${want.version} · lastUpdated ${want.date} · 꼬리말 v${want.version}`, () => {
        expect(String(data.version)).toBe(want.version);
        const d = data.lastUpdated instanceof Date ? data.lastUpdated.toISOString().slice(0, 10) : String(data.lastUpdated);
        expect(d).toBe(want.date);
        expect(raw.match(/ v1\.\d\*/g)).toEqual([` v${want.version}*`]);
        expect(raw).toMatch(new RegExp(` v${want.version.replace(".", "\\.")}\\*\\s*$`));
      });
    }
  });
}

describe("R4 — 문서 버전과 동의 버전은 별개", () => {
  it("CURRENT_POLICY_VERSION 은 1.0 그대로", () => {
    expect(CURRENT_POLICY_VERSION).toBe("1.0");
  });

  it("이미 동의한 팬의 흔적 쿠키 1.0.<ms> 는 문서가 1.3 이 된 뒤에도 유효하다", () => {
    const saved = new Date("2026-09-01T00:00:00Z");
    const now = new Date("2026-10-06T00:00:00Z");
    expect(parseConsentBreadcrumb(`1.0.${saved.getTime()}`, now)?.getTime()).toBe(saved.getTime());
  });
});
