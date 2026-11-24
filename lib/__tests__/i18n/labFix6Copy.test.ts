/**
 * LAB-FIX-6 — 화면 문구(지시서 §5 · 대표 승인 2026-11-22)가 글자까지 같다 · 금지 낱말 없음 · 세 언어 모두 있다.
 * 설명 빈칸 이유 글(lab.description.missing)과 엔트리 조건 설명(rulesHint)은 추가 지시 1(대표 승인 2026-11-24) 글자.
 */
import { describe, expect, it } from "vitest";
import { MESSAGES, resolveMessage, type MessageKey } from "@/lib/i18n/messages";

const TABLE: [string, MessageKey, string, string, string][] = [
  ["1", "lab.description.required", "필수", "Required", "Obligatorio"],
  ["2", "lab.brief.rulesLabel", "엔트리 조건", "Entry rules", "Criterios de entrada"],
  ["3", "lab.brief.optional", "선택", "Optional", "Opcional"],
  [
    "4",
    "lab.brief.rulesHint",
    // 추가 지시 1(대표 승인 2026-11-24)
    "조건을 넣으면 조건에 맞는지 AI가 한 번 더 확인합니다.",
    "If you add conditions, AI checks once more that entries match them.",
    "Si añades condiciones, la IA comprueba una vez más que las entradas las cumplen.",
  ],
  ["M", "lab.description.missing", "설명을 적어 주세요.", "Please write a description.", "Escribe una descripción."],
  ["L1", "lab.brief.extra.team", "소속 (팀)", "Affiliation (team)", "Afiliación (equipo)"],
  ["L2", "lab.brief.extra.artist", "가수", "Artist", "Artista"],
  ["L3", "lab.brief.extra.actor", "배우", "Actor", "Actor/Actriz"],
  ["L4", "lab.brief.extra.work", "작품 제목", "Title of the work", "Título de la obra"],
  ["L5", "lab.brief.extra.maker", "회사", "Maker", "Fabricante"],
  ["L6", "lab.brief.extra.channel", "채널", "Channel", "Canal"],
  ["L7", "lab.brief.extra.blank", "비워 두기", "Leave blank", "Dejar vacío"],
];

const FORBIDDEN_KO = ["표", "투표", "참가자", "후보자", "48명", "전투", "배틀", "FIFA", "월드컵"];

describe("LAB-FIX-6 문구 = 승인표(§5)", () => {
  for (const [n, key, ko, en, es] of TABLE) {
    it(`${n}번 ${key}`, () => {
      expect(resolveMessage("ko", key)).toBe(ko);
      expect(resolveMessage("en", key)).toBe(en);
      expect(resolveMessage("es", key)).toBe(es);
    });
  }
  it("금지 낱말이 없다", () => {
    for (const [, key] of [...TABLE, ["", "lab.description.missing"] as const]) {
      const ko = resolveMessage("ko", key as MessageKey);
      for (const word of FORBIDDEN_KO) expect(ko, `${key}: ${word}`).not.toContain(word);
    }
  });
  it("세 언어 키 누락 없음(이유 글 포함)", () => {
    for (const key of [...TABLE.map((r) => r[1]), "lab.description.missing" as MessageKey]) {
      const m = MESSAGES[key] as { ko: string; en: string; es?: string };
      expect(m.ko && m.en && m.es, key).toBeTruthy();
    }
  });
  it("옛 자유 글 칸의 예시 글 키는 지웠다", () => {
    expect("lab.brief.extraPlaceholder" in MESSAGES).toBe(false);
    expect("lab.description.optional" in MESSAGES).toBe(false);
  });
});
