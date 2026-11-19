/**
 * PITCH-2 6절 — 대표 승인 문구는 글자 그대로(낱말 · 문장부호 바꾸지 않는다).
 */
import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/lib/i18n/messages";

const TABLE: Record<string, [string, string, string]> = {
  "pitch.home.promo.title": [
    "48개의 엔트리, 하나의 Crown — 당신의 선택이 무대를 정합니다",
    "48 Contestants, one Crown — your picks set the stage",
    "48 Contestants, una Crown — tus elecciones marcan el escenario",
  ],
  "pitch.home.charts.empty": [
    "첫 대회가 열리면 차트가 시작됩니다",
    "Charts begin when the first Tournament opens",
    "Los charts empiezan cuando se abra el primer Tournament",
  ],
  "pitch.home.news.empty.title": ["아직 올라온 기사가 없어요", "No articles yet", "Aún no hay artículos"],
  "pitch.home.news.empty.body": [
    "첫 기사가 올라오면 여기에서 바로 보여 드릴게요",
    "The first story will show up right here",
    "El primer artículo aparecerá aquí mismo",
  ],
  "pitch.home.trending.empty.title": ["곧 첫 대회가 열립니다", "The first Tournament opens soon", "El primer Tournament se abre pronto"],
  "pitch.home.trending.empty.body": [
    "새 대회가 올라오면 이 자리에 가장 먼저 보여 드릴게요. 뉴스룸과 차트를 먼저 둘러보세요.",
    "New Tournaments will appear here first. Explore the Newsroom and Charts in the meantime.",
    "Los nuevos Tournaments aparecerán aquí primero. Mientras tanto, explora el Newsroom y los Charts.",
  ],
  "pitch.home.create.line": [
    "당신의 48개 엔트리로 무대를 꾸밀 날이 옵니다",
    "The day you set the stage with your own 48 Contestants is coming",
    "Se acerca el día en que montarás el escenario con tus propios 48 Contestants",
  ],
};

describe("6절 승인 문구", () => {
  it.each(Object.entries(TABLE))("%s", (key, [ko, en, es]) => {
    expect(MESSAGES[key as keyof typeof MESSAGES]).toEqual({ ko, en, es });
  });
});
