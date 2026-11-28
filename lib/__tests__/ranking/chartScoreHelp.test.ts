/**
 * RATE-1 — 차트 "?" 설명창 글(대표 승인 2026-11-28 17:55 · 18:01 · 결정 M).
 *
 * 지시서 `outputs/prompts/PROMPT_ClaudeCode_RATE-1_…_v1.0_2026-11-28.md` §3 글을 **글자 그대로** 둔다 — 한 글자라도
 * 다르면 이 시험이 실패한다. 같은 글이 정책 문서 "Crown Score 산정 기준"(content/{ko,en,es}/crown-score.md)에도
 * 실린다(policy/crownScorePage.test.ts 가 설명창 글과 대조).
 */
import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/lib/i18n/messages";
import { resolveHelpText } from "@/lib/ranking/rankState";
import { crownScoreOf } from "@/lib/ranking/crownScore";

const APPROVED_HELP = {
  ko: [
    "Crown Score는 팬들의 선택으로 매겨지는 1000점 만점 점수예요.",
    "계산: (순위점수율 × 0.4 + 우승율 × 0.3 + 선택율 × 0.3) × 1000",
    "· 순위점수율 — 판마다 얼마나 높이 올랐는지",
    "   한 판에서 1등 10점 · 2등 엔트리 2개에게 5점씩 · 3등 엔트리 3개에게 2점씩 → 판마다 받은 점수의 평균 ÷ 10 × 100(%)",
    "· 우승율 — 결승에서 선택받아 1등이 된 판의 비율",
    "· 선택율 — Match에 나왔을 때 선택받은 비율",
    "예: 순위점수율 50% · 우승율 30% · 선택율 80%이면 (0.5×0.4 + 0.3×0.3 + 0.8×0.3) × 1000 = 530점",
    "· 로그인한 팬이 끝까지 마친 판만 셉니다(게스트의 판은 세지 않아요).",
    "· 마친 판이 10판을 넘으면 다음 발표 때 점수가 열립니다, 매일 09:00 · 21:00(KST)",
    "· 1000점은 모든 판에서 1등, 모든 Match에서 선택받아야 나오는 점수예요.",
  ].join("\n"),
  en: [
    "Crown Score is rated out of 1,000 — shaped entirely by fans' picks.",
    "Formula: (Placement score rate × 0.4 + Champion rate × 0.3 + Pick rate × 0.3) × 1,000",
    "· Placement score rate — how high they climb in each run",
    "   In each run: No. 1 = 10 points · No. 2 (2 Contestants) = 5 each · No. 3 (3 Contestants) = 2 each → average points per run ÷ 10 × 100 (%)",
    "· Champion rate — share of runs where they're picked No. 1 in the final",
    "· Pick rate — how often they're chosen when they appear in a Match",
    "Example: Placement 50% · Champion 30% · Pick 80% → (0.5×0.4 + 0.3×0.3 + 0.8×0.3) × 1,000 = 530",
    "· Only completed runs by signed-in fans count (guest runs don't).",
    "· The score opens at the next update after 10 completed runs, daily at 09:00 · 21:00 (KST)",
    "· 1,000 means No. 1 in every run and picked in every Match.",
  ].join("\n"),
  es: [
    "Crown Score va de 0 a 1000 y lo deciden las elecciones de los fans.",
    "Fórmula: (Tasa de puntuación por posición × 0,4 + Tasa de campeón × 0,3 + Tasa de elección × 0,3) × 1000",
    "· Tasa de puntuación por posición — qué tan alto llega en cada participación",
    "   En cada participación: n.º 1 = 10 puntos · n.º 2 (2 Contestants) = 5 cada uno · n.º 3 (3 Contestants) = 2 cada uno → promedio de puntos por participación ÷ 10 × 100 (%)",
    "· Tasa de campeón — porcentaje de participaciones en que lo eligen n.º 1 en la final",
    "· Tasa de elección — cuántas veces lo eligen cuando aparece en un Match",
    "Ejemplo: posición 50 % · campeón 30 % · elección 80 % → (0,5×0,4 + 0,3×0,3 + 0,8×0,3) × 1000 = 530",
    "· Solo cuentan las participaciones completas de fans con sesión iniciada (las de invitados no).",
    "· La puntuación se abre en la siguiente actualización tras 10 participaciones completas, cada día a las 09:00 · 21:00 (KST)",
    "· 1000 significa n.º 1 en todas las participaciones y elegido en todos los Match.",
  ].join("\n"),
} as const;

describe("차트 설명창 글 = 대표 승인 §3 글자 그대로", () => {
  for (const lang of ["ko", "en", "es"] as const) {
    it(`${lang}`, () => {
      expect(MESSAGES["chart.score.help"][lang]).toBe(APPROVED_HELP[lang]);
    });
  }

  it("비정본 이름(Reach · Wins · Picks · Share / Alcance · Victorias · Elecciones · Cuota)이 이름으로 쓰이지 않는다", () => {
    // "fans' picks" · "las elecciones de los fans" 는 보통 낱말(대문자 이름이 아님).
    for (const lang of ["en", "es"] as const) {
      expect(MESSAGES["chart.score.help"][lang]).not.toMatch(/\b(Reach|Wins|Picks|Share|Alcance|Victorias|Elecciones|Cuota)\b/);
    }
  });

  it("줄 나눔 그대로 — 들여 쓴 점수표 줄은 앞 공백을 남긴다(화면이 들여 쓴다)", () => {
    const lines = resolveHelpText(MESSAGES["chart.score.help"].ko)!;
    expect(lines).toHaveLength(10);
    expect(lines[0]).toBe("Crown Score는 팬들의 선택으로 매겨지는 1000점 만점 점수예요.");
    expect(lines[3].startsWith("   한 판에서")).toBe(true);
    expect(lines.filter((l) => /^\s/.test(l))).toHaveLength(1);
  });
});

describe("예시 계산 1줄 = 코드의 Crown Score 함수", () => {
  it("순위점수율 50% · 우승율 30% · 선택율 80% → 530", () => {
    // 10판 · 순위 점수 합계 50(평균 5점 → 50%) · 1등 3판(30%) · 10번 나와 8번 선택(80%)
    expect(crownScoreOf({ runsTotal: 10, placementPoints: 50, wins: 3, picks: 8, appearances: 10 })).toBe(530);
  });
});
