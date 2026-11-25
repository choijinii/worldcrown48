/**
 * LAB-FIX-6 3-4 — "덧붙이는 정보"를 자유 글 대신 목록 7개에서 고른다(결정 H · 대표 2026-11-22).
 * 초안의 aiBrief.extra 에는 목록 항목의 키를 적는다. 빈 글 = 엔트리 단위의 기본값
 * (개인 = 소속 (팀) · 팀 · 그 외 = 비워 두기) — 기본값은 저장하지 않아 옛 지시문(잠금)이 그대로 쓰인다.
 */
import { describe, expect, it } from "vitest";
import {
  EXTRA_OPTIONS,
  defaultExtraFor,
  effectiveExtra,
  extraForUnit,
  extraLabelKey,
  isExtraOption,
  matchLegacyExtra,
} from "@/lib/lab/extraInfo";
import { readAiBrief } from "@/lib/lab/aiBrief";
import { MESSAGES } from "@/lib/i18n/messages";

describe("목록 7개 — 3언어 이름", () => {
  it("순서대로 L1 ~ L7", () => {
    expect(EXTRA_OPTIONS).toEqual(["team", "artist", "actor", "work", "maker", "channel", "blank"]);
  });
  it("§5 표 문구 그대로", () => {
    const rows = EXTRA_OPTIONS.map((o) => MESSAGES[extraLabelKey(o)]);
    expect(rows).toEqual([
      { ko: "소속 (팀)", en: "Affiliation (team)", es: "Afiliación (equipo)" },
      { ko: "가수", en: "Artist", es: "Artista" },
      { ko: "배우", en: "Actor", es: "Actor/Actriz" },
      { ko: "작품 제목", en: "Title of the work", es: "Título de la obra" },
      { ko: "회사", en: "Maker", es: "Fabricante" },
      { ko: "채널", en: "Channel", es: "Canal" },
      { ko: "비워 두기", en: "Leave blank", es: "Dejar vacío" },
    ]);
  });
});

describe("엔트리 단위별 기본값", () => {
  it("개인 = 소속 (팀) · 팀 = 비워 두기 · 그 외 = 비워 두기", () => {
    expect(defaultExtraFor("individual")).toBe("team");
    expect(defaultExtraFor("group")).toBe("blank");
    expect(defaultExtraFor("other")).toBe("blank");
  });
  it("빈 글이면 지금 단위의 기본값으로 보인다 — 단위를 바꾸면 따라 바뀐다", () => {
    expect(effectiveExtra("", "individual")).toBe("team");
    expect(effectiveExtra("", "group")).toBe("blank");
    expect(effectiveExtra("artist", "group")).toBe("artist");
  });
  it("고른 값이 그 단위의 기본값이면 저장은 빈 글(옛 지시문 · 빈 초안 판정 보호)", () => {
    expect(extraForUnit("team", "individual")).toBe("");
    expect(extraForUnit("blank", "group")).toBe("");
    expect(extraForUnit("blank", "individual")).toBe("blank");
    expect(extraForUnit("artist", "other")).toBe("artist");
  });
  it("옛 자유 글은 그대로 남는다(백필 없음)", () => {
    expect(effectiveExtra("배우와 드라마 제목", "other")).toBe("배우와 드라마 제목");
    expect(extraForUnit("배우와 드라마 제목", "other")).toBe("배우와 드라마 제목");
  });
  it("isExtraOption", () => {
    expect(isExtraOption("maker")).toBe(true);
    expect(isExtraOption("가수")).toBe(false);
  });
});

describe("옛 자유 글 읽기 — 목록 이름과 같으면 그 항목으로", () => {
  it("세 언어 어느 이름이든 · 앞뒤 공백 · 대소문자 무시", () => {
    expect(matchLegacyExtra("가수")).toBe("artist");
    expect(matchLegacyExtra("  artist ")).toBe("artist");
    expect(matchLegacyExtra("Título de la obra")).toBe("work");
    expect(matchLegacyExtra("소속 (팀)")).toBe("team");
  });
  it("다르면 null", () => {
    expect(matchLegacyExtra("가수 이름")).toBeNull();
    expect(matchLegacyExtra("")).toBeNull();
  });
  it("readAiBrief 가 옛 초안의 같은 글을 키로 바꾸고, 다른 글은 그대로 둔다", () => {
    expect(readAiBrief({ entry: "노래 제목", extra: "가수", rules: "" }).extra).toBe("artist");
    expect(readAiBrief({ entry: "", extra: "배우와 드라마 제목", rules: "" }).extra).toBe("배우와 드라마 제목");
    expect(readAiBrief({ entry: "", extra: "channel", rules: "" }).extra).toBe("channel");
  });
});
