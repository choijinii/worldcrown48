/**
 * LAB-FIX-3 — 화면 문구 7줄이 대표 승인표 v3(2026-11-13)와 글자까지 같다.
 * 표는 지시서 §3-8 을 그대로 옮긴 것이다. 없어진 문구(그림 지우기 · 영상 찾기 · 검색어 힌트 툴팁)는 사전에서 빠졌다.
 */
import { describe, expect, it } from "vitest";
import { MESSAGES, resolveMessage, type MessageKey } from "@/lib/i18n/messages";

const TABLE: [number, MessageKey, string, string, string][] = [
  [1, "lab.slot.video", "영상", "Video", "Video"],
  [2, "lab.slot.videoPlaceholder", "영상 주소 붙여 넣기", "Paste a video link", "Pega un enlace de video"],
  [3, "lab.slot.onlyYouTube", "지금은 유튜브 영상만 넣을 수 있어요.", "Only YouTube videos can be added for now.", "Por ahora solo se pueden añadir videos de YouTube."],
  [4, "lab.image.chipUrl", "이미지", "Image", "Imagen"],
  [5, "lab.slot.imagePlaceholder", "이미지 주소 붙여 넣기", "Paste an image link", "Pega un enlace de imagen"],
  [6, "lab.image.chipFile", "이미지 파일", "Image file", "Archivo de imagen"],
  [7, "lab.slot.submit", "넣기 (Enter)", "Add (Enter)", "Añadir (Enter)"],
];

describe("LAB-FIX-3 문구 7줄 = 승인표 v3", () => {
  for (const [n, key, ko, en, es] of TABLE) {
    it(`${n}번 ${key}`, () => {
      expect(resolveMessage("ko", key)).toBe(ko);
      expect(resolveMessage("en", key)).toBe(en);
      expect(resolveMessage("es", key)).toBe(es);
    });
  }
  it("없어진 문구는 사전에 없다", () => {
    for (const gone of ["lab.image.remove", "lab.source.find", "lab.review.hintTip"]) {
      expect(Object.keys(MESSAGES)).not.toContain(gone);
    }
  });
});
