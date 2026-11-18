/**
 * LAB-FIX-4 — 화면 문구 15줄이 대표 승인표(지시서 §5 · 2026-11-19 00:09)와 글자까지 같다 · 금지 낱말 없음.
 * 14번(확인 창 버튼 "비우기 / 취소")은 두 키로 나눈다.
 */
import { describe, expect, it } from "vitest";
import { resolveMessage, type MessageKey } from "@/lib/i18n/messages";

const TABLE: [string, MessageKey, string, string, string][] = [
  ["1", "lab.brief.title", "AI에게 알려 줄 내용", "What to tell the AI", "Qué decirle a la IA"],
  ["2", "lab.brief.lead", "AI로 엔트리를 생성할 때 이 내용을 규칙으로 씁니다.", "The AI uses this as rules when generating entries.", "La IA usa esto como reglas al generar las entradas."],
  ["3", "lab.entryUnit.other", "그 외 (작품 · 사물 · 배역)", "Other (work · item · character)", "Otro (obra · objeto · personaje)"],
  ["4", "lab.brief.entryLabel", "엔트리는 어떤 것인가?", "What kind of thing is an entry?", "¿Qué tipo de cosa es una entrada?"],
  ["5", "lab.brief.entryPlaceholder", "예: 춤춘 댄스 크루 · 노래 제목 · 드라마 배역", "e.g. the dance crew performing · song title · drama character", "p. ej.: el crew que baila · título de la canción · personaje del drama"],
  ["6", "lab.brief.extraLabel", "덧붙이는 정보", "Extra info", "Dato adicional"],
  ["7", "lab.brief.extraPlaceholder", "예: 가수 · 드라마 제목 (비워도 됩니다)", "e.g. artist · drama title (optional)", "p. ej.: artista · título del drama (opcional)"],
  ["8", "lab.brief.rulesLabel", "고르는 조건", "Selection rules", "Criterios de selección"],
  ["9", "lab.brief.rulesPlaceholder", "예: 2026년에 영상을 올린 팀만 · 어린이 팀 제외", "e.g. only teams that posted videos in 2026 · no kids' teams", "p. ej.: solo equipos que publicaron videos en 2026 · sin equipos infantiles"],
  ["10", "lab.brief.suggest", "AI에게 제안 받기", "Get AI suggestions", "Pedir sugerencias a la IA"],
  ["11", "lab.slot.clearHint", "이 칸 비우기 (영상 · 이미지 포함)", "Clear this slot (including video · image)", "Vaciar esta casilla (incluye video · imagen)"],
  ["12", "lab.clearAll.button", "모두 비우기", "Clear all", "Vaciar todo"],
  ["13", "lab.clearAll.body", "엔트리 칸을 모두 비웁니다. 이름 · 영상 · 이미지가 지워지고 되돌릴 수 없습니다.", "This clears every entry slot. Names, videos and images are removed and can't be restored.", "Se vaciarán todas las casillas. Los nombres, videos e imágenes se eliminan y no se pueden recuperar."],
  ["14a", "lab.clearAll.confirm", "비우기", "Clear", "Vaciar"],
  ["14b", "lab.clearAll.cancel", "취소", "Cancel", "Cancelar"],
  ["15", "lab.embed.subtitle", "줄당 링크 1개. 빈칸에만 순서대로 들어가고, \"AI에게 알려 줄 내용\"에 맞춰 제목에서 엔트리를 읽어 함께 채웁니다.", "One link per line. Links go into empty slots in order, and entries are read from the titles following \"What to tell the AI\".", "Un enlace por línea. Se colocan en orden solo en las casillas vacías, y las entradas se leen de los títulos según \"Qué decirle a la IA\"."],
];

const FORBIDDEN_KO = ["표", "투표", "참가자", "후보자", "48명", "전투", "배틀", "FIFA"];

describe("LAB-FIX-4 문구 15줄 = 승인표(§5)", () => {
  for (const [n, key, ko, en, es] of TABLE) {
    it(`${n}번 ${key}`, () => {
      expect(resolveMessage("ko", key)).toBe(ko);
      expect(resolveMessage("en", key)).toBe(en);
      expect(resolveMessage("es", key)).toBe(es);
    });
  }
  it("금지 낱말이 없다", () => {
    for (const [, key] of TABLE) {
      const ko = resolveMessage("ko", key);
      for (const word of FORBIDDEN_KO) expect(ko, `${key}: ${word}`).not.toContain(word);
    }
  });
});
