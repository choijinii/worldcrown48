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

// 추가분(원장 D-90) — 대표 승인 2026-11-13 16:13 ("모두 승인!") · 추가 지시서 §4 그대로.
const KIND_TABLE: [string, MessageKey, string, string, string][] = [
  ["1", "lab.kind.note", "처음 누른 버튼으로 대회 종류(영상 · 이미지)가 정해집니다. 바꾸려면 초안을 지우고 새로 시작하세요.", "The first button you press sets the tournament type (video or image). To change it, delete the draft and start over.", "El primer botón que pulses define el tipo de torneo (video o imagen). Para cambiarlo, borra el borrador y empieza de nuevo."],
  ["2a", "lab.kind.lockedVideo", "이 대회는 영상 대회입니다.", "This is a video tournament.", "Este es un torneo de video."],
  ["2b", "lab.kind.lockedImage", "이 대회는 이미지 대회입니다.", "This is an image tournament.", "Este es un torneo de imágenes."],
];

describe("대회 종류 문구 3줄 = 승인표(추가분 §4)", () => {
  for (const [n, key, ko, en, es] of KIND_TABLE) {
    it(`${n}번 ${key}`, () => {
      expect(resolveMessage("ko", key)).toBe(ko);
      expect(resolveMessage("en", key)).toBe(en);
      expect(resolveMessage("es", key)).toBe(es);
    });
  }
});

// LAB-FIX-3b — 대표 승인 2026-11-14 02:08 · 지시서 §3 그대로.
describe("이미지 대회 빈칸 버튼 이름 = 승인표(LAB-FIX-3b §3)", () => {
  it("lab.fill.blanksImage", () => {
    expect(resolveMessage("ko", "lab.fill.blanksImage")).toBe("빈칸 채우기");
    expect(resolveMessage("en", "lab.fill.blanksImage")).toBe("Fill blanks");
    expect(resolveMessage("es", "lab.fill.blanksImage")).toBe("Rellenar vacíos");
  });
  it("영상 대회 이름은 그대로", () => {
    expect(resolveMessage("ko", "lab.fill.blanks")).toBe("빈칸 채우고 영상까지");
  });
});

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
