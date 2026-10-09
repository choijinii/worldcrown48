/**
 * POLICY-ES-1 Phase C — 정책 문서 스페인어판 content/es/*.md (R3 원문 = 한국어).
 *
 * 잡으려는 사고: 번역하다 절 하나·표 줄 하나·링크 하나를 빠뜨려도 화면은 멀쩡해 보인다.
 * 원문(ko)과 구조가 같은지 기계로 대조한다 — 프론트매터 키 · H1/H2/H3 개수 · 표 줄 수 · 링크 대상.
 * 뜻이 맞는지는 사람(되번역 표)이 본다.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { POLICY_TYPES } from "@/lib/policyTypes";

const ROOT = path.resolve(__dirname, "../../..");
const read = (lang: string, type: string) => readFileSync(path.join(ROOT, "content", lang, `${type}.md`), "utf8");

/** 원문과 견줄 구조 지문. */
function shape(md: string) {
  const { data, content } = matter(md);
  const lines = content.split("\n");
  return {
    keys: Object.keys(data).sort(),
    h1: lines.filter((l) => /^# /.test(l)).length,
    h2: lines.filter((l) => /^## /.test(l)).length,
    h3: lines.filter((l) => /^### /.test(l)).length,
    tableRows: lines.filter((l) => /^\|/.test(l)).length,
    links: Array.from(content.matchAll(/\]\(([^)]+)\)/g)).map((m) => m[1]),
  };
}

describe("정책 문서 스페인어판", () => {
  for (const type of POLICY_TYPES) {
    describe(type, () => {
      it("content/es 파일이 있다", () => {
        expect(existsSync(path.join(ROOT, "content", "es", `${type}.md`))).toBe(true);
      });

      it("프론트매터: lang=es · type 일치 · 키 집합이 ko 와 같다 · version·lastUpdated 가 ko 와 같다", () => {
        const es = matter(read("es", type)).data;
        const ko = matter(read("ko", type)).data;
        expect(es.lang).toBe("es");
        expect(es.type).toBe(type);
        expect(Object.keys(es).sort()).toEqual(Object.keys(ko).sort());
        expect(String(es.version)).toBe(String(ko.version));
        expect(String(es.lastUpdated)).toBe(String(ko.lastUpdated));
      });

      it("구조가 ko 원문과 같다 (제목 개수 · 표 줄 수 · 링크 대상)", () => {
        const { keys: _k1, ...es } = shape(read("es", type));
        const { keys: _k2, ...ko } = shape(read("ko", type));
        expect(es).toEqual(ko);
      });
    });
  }

  it("검사기 자체 확인 — 절 하나를 빠뜨리면 구조가 달라진다", () => {
    const ko = read("ko", "cookies");
    const dropped = ko.replace(/^## .*$/m, "");
    expect(shape(dropped).h2).toBe(shape(ko).h2 - 1);
  });
});
