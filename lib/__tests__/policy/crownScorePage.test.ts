/**
 * RATE-1 — 정책 문서 "Crown Score 산정 기준"(대표 결정 M · 페이지 이름 대표 승인 2026-11-28).
 *
 * 본문 = 차트 설명창 글(chart.score.help · §3 글자 그대로) + 그 아래 정본의 순위 점수표
 * (1등 10점 1개 · 2등 5점 2개 · 3등 2점 3개 · 그 밖 0점 42개 · 판 1회 합계 26점).
 * 다른 정책 문서와 같은 방식 — 경로 · 왼쪽 목록 · 메뉴(Policy Hub) · 사이트맵이 POLICY_TYPES 하나를 따른다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MESSAGES } from "@/lib/i18n/messages";
import { POLICY_NAV, POLICY_TYPES } from "@/lib/policyTypes";
import { loadPolicy } from "@/lib/policyContent";
import { NAV_ITEMS } from "@/lib/layout/navMap";

const ROOT = path.resolve(__dirname, "../../..");
const LANGS = ["ko", "en", "es"] as const;
const TITLE = { ko: "Crown Score 산정 기준", en: "How Crown Score works", es: "Cómo se calcula Crown Score" } as const;

describe("Crown Score 산정 기준 — 정책 목록", () => {
  it("POLICY_TYPES 에 crown-score · 왼쪽 목록 맨 끝(05) · 이름 3언어 = 대표 승인", () => {
    expect(POLICY_TYPES).toContain("crown-score");
    const entry = POLICY_NAV.find((e) => e.type === "crown-score");
    expect(entry).toEqual({ type: "crown-score", ord: "05", ...TITLE });
    expect(POLICY_NAV[POLICY_NAV.length - 1].type).toBe("crown-score");
  });

  it("Policy Hub 메뉴 하위에 같은 이름 · 같은 주소", () => {
    const policy = NAV_ITEMS.find((n) => n.key === "policy")!;
    const sub = policy.children!.find((c) => c.key === "crownScore")!;
    expect(sub.href).toBe("/policies/crown-score");
    expect(MESSAGES[sub.labelKey]).toEqual(TITLE);
  });
});

for (const lang of LANGS) {
  describe(`Crown Score 산정 기준 — 본문 (${lang})`, () => {
    const raw = readFileSync(path.join(ROOT, "content", lang, "crown-score.md"), "utf8");
    const { data, content } = matter(raw);

    it("프론트매터 title = 페이지 이름 · type · lang", () => {
      expect(data.title).toBe(TITLE[lang]);
      expect(data.type).toBe("crown-score");
      expect(data.lang).toBe(lang);
    });

    it("H1 = 페이지 이름", () => {
      expect(content.split("\n").find((l) => l.startsWith("# "))).toBe(`# ${TITLE[lang]}`);
    });

    it("설명창 글(chart.score.help)의 모든 줄이 같은 순서로 실린다", () => {
      const want = MESSAGES["chart.score.help"][lang].split("\n").map((l) => l.trim());
      const body = content.split("\n").map((l) => l.trim());
      let at = 0;
      for (const line of want) {
        const i = body.indexOf(line, at);
        expect(i, line).toBeGreaterThanOrEqual(0);
        at = i + 1;
      }
    });

    it("설명창 글 아래에 순위 점수표 — 4줄(10 · 5 · 2 · 0점 / 1 · 2 · 3 · 42개) + 합계 26", () => {
      const lastHelp = MESSAGES["chart.score.help"][lang].split("\n").pop()!.trim();
      const after = content.slice(content.indexOf(lastHelp));
      const rows = after.split("\n").filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l));
      expect(rows).toHaveLength(5); // 머리 1 + 4줄
      const cells = rows.slice(1).map((r) => r.split("|").slice(1, -1).map((c) => c.trim()));
      expect(cells.map((c) => c[1].match(/\d+/)![0])).toEqual(["1", "2", "3", "42"]);
      expect(cells.map((c) => c[2].match(/\d+/)![0])).toEqual(["10", "5", "2", "0"]);
      expect(after).toMatch(/26[^\d]*\(10 \+ 5×2 \+ 2×3\)/);
    });
  });
}

describe("Crown Score 산정 기준 — 읽기", () => {
  it("loadPolicy 가 3언어를 읽는다", async () => {
    const p = await loadPolicy("crown-score");
    for (const lang of LANGS) expect(p[lang].frontmatter.title).toBe(TITLE[lang]);
  });
});
