/**
 * PRE-REG-1 — 개인정보처리방침의 사전등록 문장 (문구승인표 C1·C2 · 쿠키 정책 C3).
 *
 * 사전등록 메일을 개막 안내·계정 연결 안내에 쓰고, 등록 순번·처음 들어온 경로·화면 언어를 함께
 * 기록한다는 사실을 3언어로 1.1 · 2절 표에 적는다. 처음 경로의 브라우저 기억(`wc48_utm`, 7일 ·
 * 분석 동의 뒤)은 쿠키 정책 분석 표에 적는다.
 *
 * 대외 글에 숫자 200 · 배지 · The Lab 우선 입장을 아직 밝히지 않는다(대표 10/08) — 정책 문서도
 * 대외 글이다. 선착순 혜택을 암시하는 낱말이 새지 않는지 함께 본다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const read = (lang: string, doc: string) => readFileSync(path.join(ROOT, "content", lang, `${doc}.md`), "utf8");

/** 절 하나(머리부터 다음 같은 단계 머리 전까지). */
function section(md: string, heading: RegExp): string {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => heading.test(l));
  expect(start, `${heading} 절이 없다`).toBeGreaterThan(-1);
  const level = lines[start].match(/^#+/)![0].length;
  const end = lines.findIndex((l, i) => i > start && new RegExp(`^#{1,${level}} `).test(l));
  return lines.slice(start, end === -1 ? undefined : end).join("\n");
}

const WORDS = {
  ko: { s11: /^### 1\.1 /, s2: /^## 2\. /, rank: "등록 순번", path: "처음 들어온 경로", lang: "등록 때 화면 언어", use: ["개막 안내", "계정 연결 안내"], keep: "정식 개막 후 12개월 (그 전에 삭제를 요청하면 즉시 삭제)" },
  en: { s11: /^### 1\.1 /, s2: /^## 2\. /, rank: "Sign-up order number", path: "First entry path", lang: "Screen language at sign-up", use: ["opening notice", "account-linking notice"], keep: "12 months after the official opening (deleted at once if you ask earlier)" },
  es: { s11: /^### 1\.1 /, s2: /^## 2\. /, rank: "Número de orden de inscripción", path: "Ruta de primera entrada", lang: "Idioma de la pantalla al inscribirse", use: ["aviso de apertura", "aviso para vincular la cuenta"], keep: "12 meses después de la apertura oficial (se eliminan de inmediato si lo solicita antes)" },
} as const;

describe.each(Object.entries(WORDS))("개인정보처리방침 (%s)", (lang, w) => {
  const md = read(lang, "privacy");

  it("1.1 — Waitlist 등록 때 함께 기록하는 셋(순번 · 처음 경로 · 화면 언어)과 7일 · 동의 조건", () => {
    const s = section(md, w.s11);
    for (const item of [w.rank, w.path, w.lang]) expect(s).toContain(item);
    expect(s).toMatch(/7/);
  });

  it("2절 표 — 사전등록 안내 줄(개막 안내 · 계정 연결 안내)에 같은 항목", () => {
    const s = section(md, w.s2);
    const row = s.split("\n").find((l) => l.startsWith("|") && w.use.every((u) => l.toLowerCase().includes(u.toLowerCase())));
    expect(row, "사전등록 안내 줄이 없다").toBeTruthy();
    for (const item of [w.rank, w.path, w.lang]) expect(row!.toLowerCase()).toContain(item.toLowerCase());
  });

  it("2절 표 — 보관 기간 = 정식 개막 후 12개월 · 요청 시 즉시 삭제(원장 D-57) · 날짜 없음", () => {
    const row = section(md, w.s2)
      .split("\n")
      .find((l) => l.startsWith("|") && w.use.every((u) => l.toLowerCase().includes(u.toLowerCase())))!;
    const keep = row.split("|").map((c) => c.trim()).filter(Boolean).at(-1);
    expect(keep).toBe(w.keep);
    expect(keep).not.toMatch(/\d{1,2}\/\d{1,2}|20\d\d/);
  });
});

describe.each(["ko", "en", "es"])("쿠키 정책 (%s)", (lang) => {
  it("분석 표에 wc48_utm · 7일", () => {
    const row = read(lang, "cookies")
      .split("\n")
      .find((l) => l.startsWith("|") && l.includes("`wc48_utm`"));
    expect(row).toBeTruthy();
    expect(row).toMatch(/7/);
  });
});

describe("선착순 혜택을 대외 글에 밝히지 않는다(대표 10/08)", () => {
  it.each(["ko", "en", "es"])("%s 정책 문서 4종에 200 · 배지 · The Lab 우선 · 파운딩이 없다", (lang) => {
    for (const doc of ["privacy", "cookies", "terms", "community"]) {
      const md = read(lang, doc);
      expect(md, `${lang}/${doc}`).not.toMatch(/\b200\b|배지|badge|insignia|파운딩|founding|The Lab/i);
    }
  });
});
