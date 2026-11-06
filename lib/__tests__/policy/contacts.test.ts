/**
 * LEGAL-CS-1 (원장 D-83 · 대표 결정 2026-11-06 09:53) — 법적 문제 창구는 policy@ 하나.
 *
 * 잡으려는 사고: 신고 = report@ · 이의신청·정책 = policy@ 로 창구가 둘이었다. 혼자 운영하고 두 주소가
 * 같은 편지함으로 들어와 분리는 혼란만 낳았다. 그리고 그림 엔트리(D-77)가 공개되면 권리자의 제지에
 * **24시간 안에** 내리는 절차가 이용약관에 있어야 대표 원칙("제지·경고 오면 적극 수렴")이 실행된다.
 *
 * - report@ 는 문서에서만 뺀다(주소 자체는 Cloudflare 전달로 살아 있다 — 옛 링크 보호).
 * - 24시간 = 달력 시간. §5.4 에 "영업일"을 쓰지 않는다.
 * - 금지 낱말 검사는 이번에 고친 블록만 본다(옛 문장 "승부 예측·베팅과 무관"은 금지 선언이라 남는다).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const CONTENT = path.join(ROOT, "content");
const LANGS = ["ko", "en", "es"] as const;
type Lang = (typeof LANGS)[number];

const POLICY = "policy@worldcrown48.com";
const read = (lang: Lang, doc: string) => readFileSync(path.join(CONTENT, lang, `${doc}.md`), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".md")) out.push(full);
  }
  return out;
}

/** `## N.` 절 하나(다음 `## ` 앞까지). */
function h2(raw: string, n: number): string {
  const start = raw.search(new RegExp(`^## ${n}\\.`, "m"));
  expect(start, `## ${n}. 절이 없다`).toBeGreaterThanOrEqual(0);
  const rest = raw.slice(start + 1);
  const end = rest.search(/^## /m);
  return end < 0 ? rest : rest.slice(0, end);
}

/** `### N.M` 소절 하나(다음 제목이나 `---` 앞까지). */
function h3(raw: string, num: string): string {
  const start = raw.search(new RegExp(`^### ${num.replace(".", "\\.")} `, "m"));
  expect(start, `### ${num} 소절이 없다`).toBeGreaterThanOrEqual(0);
  const rest = raw.slice(start);
  const bodyStart = rest.indexOf("\n") + 1; // 제목 줄 자체는 끝 표시로 세지 않는다
  const end = rest.slice(bodyStart).search(/^(#{2,3} |---)/m);
  return end < 0 ? rest : rest.slice(0, bodyStart + end);
}

/** 문의 절 — 문서마다 번호가 다르다. */
const CONTACT_SECTION = { community: 10, terms: 13, privacy: 14, cookies: 8 } as const;

const HOURS = { ko: "24시간", en: "24 hours", es: "24 horas" } as const;
const BUSINESS_DAY = { ko: /영업일/, en: /business day/i, es: /días? hábil/i } as const;

/** community §7 응답 약속 — "영업일 기준 24시간 내 1차 검토"를 바꾼 문구. */
const FIRST_REVIEW = {
  ko: "접수 후 24시간 안에 1차 검토",
  en: "First review within 24 hours of receipt",
  es: "primera revisión en un plazo de 24 horas desde la recepción",
} as const;

/** 새 블록 금지 낱말: 표 · 투표 · Vote · Voter · 예측 · 배당 · 월드컵 · FIFA · 참가자 · 전투 은유. */
const FORBIDDEN: Record<Lang, RegExp> = {
  ko: /(^|[^가-힣])표([^가-힣]|$)|투표|예측|배당|월드컵|FIFA|참가자|전투|배틀|격돌/,
  en: /\bvot(e|es|ed|ing|er|ers)\b|predict|odds|betting|world cup|FIFA|participant|battle|combat|fight/i,
  es: /\bvot(o|os|ar|ación|ante|antes)\b|predic|cuota|apuesta|mundial|FIFA|participante|batalla|combate/i,
};

describe("report@ 는 정책 문서 어디에도 없다", () => {
  it("content/**.md 12개에 report@ 0건", () => {
    const files = walk(CONTENT);
    expect(files.length).toBe(12);
    const hits = files.flatMap((f) =>
      readFileSync(f, "utf8")
        .split("\n")
        .map((l, i) => `${path.relative(ROOT, f)}:${i + 1}: ${l.trim()}`)
        .filter((l) => l.includes("report@")),
    );
    expect(hits).toEqual([]);
  });
});

for (const lang of LANGS) {
  describe(`창구 policy@ 하나 (${lang})`, () => {
    for (const [doc, n] of Object.entries(CONTACT_SECTION)) {
      it(`${doc} §${n} 문의 절에 policy@ 가 있다`, () => {
        expect(h2(read(lang, doc), n)).toContain(POLICY);
      });
    }

    it("community §7 신고 = policy@ · 제목 머리말 [신고] [내리기 요청] [이의신청] 안내 · CSAM 머리말 유지", () => {
      const s7 = h2(read(lang, "community"), 7);
      expect(s7).toContain(POLICY);
      for (const tag of ["[신고]", "[내리기 요청]", "[이의신청]", "[URGENT-CSAM]"]) expect(s7).toContain(tag);
    });

    it("community §10 · terms §13 · privacy §14 — policy@ 줄은 하나(신고 줄을 합침), 일반 문의 hello@ 는 그대로", () => {
      for (const [doc, n] of [["community", 10], ["terms", 13], ["privacy", 14]] as const) {
        const lines = h2(read(lang, doc), n).split("\n").filter((l) => l.includes(`mailto:${POLICY}`));
        expect(lines, `${doc} §${n}`).toHaveLength(1);
        expect(h2(read(lang, doc), n)).toContain("mailto:hello@worldcrown48.com");
      }
    });

    it("cookies §8 — 메일 주소는 policy@ 하나", () => {
      const mails = h2(read(lang, "cookies"), 8).match(/mailto:[^)]+/g) ?? [];
      expect(mails).toEqual([`mailto:${POLICY}`]);
    });

    it("terms §5.4 권리자의 내리기 요청 — policy@ · [내리기 요청] · 24시간 · 영업일 없음", () => {
      const s = h3(read(lang, "terms"), "5.4");
      expect(s).toContain(POLICY);
      expect(s).toContain("[내리기 요청]");
      expect(s).toContain("[이의신청]");
      expect(s).toContain(HOURS[lang]);
      expect(s).not.toMatch(BUSINESS_DAY[lang]);
    });

    it("community §7 1차 검토 = 접수 후 24시간(달력 시간) · 영업일 없음 (대표 2026-11-06 · D-83)", () => {
      const s7 = h2(read(lang, "community"), 7);
      expect(s7).toContain(FIRST_REVIEW[lang]);
      expect(s7).not.toMatch(BUSINESS_DAY[lang]);
    });

    it("terms §5.4 는 §5.3 바로 뒤(§6 앞)에 한 번뿐", () => {
      const raw = read(lang, "terms");
      expect(raw.match(/^### 5\.4 /gm)).toHaveLength(1);
      const i53 = raw.search(/^### 5\.3 /m);
      const i54 = raw.search(/^### 5\.4 /m);
      const i6 = raw.search(/^## 6\./m);
      expect(i53).toBeLessThan(i54);
      expect(i54).toBeLessThan(i6);
    });

    it("community §2.8 지식재산권 — 운영 대회 엔트리 그림은 이용약관 §5.4 를 따른다는 참조", () => {
      expect(h3(read(lang, "community"), "2.8")).toContain("(/policies/terms#5.4)");
    });

    it("고친 블록에 금지 낱말 0건", () => {
      const blocks = [
        h3(read(lang, "terms"), "5.4"),
        h2(read(lang, "terms"), 13),
        h3(read(lang, "community"), "2.8"),
        h2(read(lang, "community"), 7),
        h2(read(lang, "community"), 10),
        h2(read(lang, "privacy"), 14),
        h2(read(lang, "cookies"), 8),
      ];
      const bad = blocks.flatMap((b) => b.split("\n").filter((l) => FORBIDDEN[lang].test(l)));
      expect(bad).toEqual([]);
    });
  });
}

describe("정책 밖 창구 표기도 policy@ 하나 (대표 2026-11-06 · D-83)", () => {
  it("모든 화면 바닥 띠의 '콘텐츠 신고' 링크 = mailto:policy@ (화면 글자는 그대로)", () => {
    const src = readFileSync(path.join(ROOT, "components/policy/FooterPolicyRow.tsx"), "utf8");
    expect(src).not.toContain("report@");
    expect(src).toMatch(new RegExp(`<a href="mailto:${POLICY}">\\{t\\("footer\\.report"\\)\\}</a>`));
  });

  it("메일 주소 운용 정책 — report@ 는 'D-83 이후 문서에서 뺐다'는 줄에만 남는다", () => {
    const md = readFileSync(path.join(ROOT, "marketing/files/EMAIL_POLICY.md"), "utf8");
    expect(md).toContain("`policy@`");
    const stray = md.split("\n").filter((l) => l.includes("report@") && !l.includes("D-83"));
    expect(stray).toEqual([]);
  });
});
