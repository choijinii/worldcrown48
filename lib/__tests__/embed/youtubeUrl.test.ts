/**
 * LAB-EV-1 Phase A — URL → videoId 정규화 (§5 Phase A).
 *
 * 운영자는 유튜브에서 "공유"로 복사한 링크를 그대로 붙여넣는다. 그 링크는
 * watch·youtu.be·shorts·embed·live 다섯 모양 중 하나이고, 대개 `t=`(공유 시점)
 * 파라미터를 달고 온다. 파서는 그 다섯 모양과 시작 초를 모두 흡수하고,
 * 유튜브가 아닌 줄은 "행 단위로" 거절해야 한다 (§8 — 전체 거부 아님).
 */
import { describe, expect, it } from "vitest";
import {
  extractVideoIdFromUrl,
  isValidVideoId,
  parseStartParam,
  parseYouTubeLink,
} from "@/lib/embed/youtubeUrl";

const ID = "9bZkp7q19f0";

describe("isValidVideoId — 11자 [A-Za-z0-9_-]", () => {
  it("정확히 11자만 통과", () => {
    expect(isValidVideoId(ID)).toBe(true);
    expect(isValidVideoId("dQw4w9WgXcQ")).toBe(true);
    expect(isValidVideoId("_-aB3cD4eF5")).toBe(true);
    expect(isValidVideoId("short")).toBe(false);
    expect(isValidVideoId("9bZkp7q19f0x")).toBe(false);
    expect(isValidVideoId("has space!!")).toBe(false);
    expect(isValidVideoId(undefined)).toBe(false);
  });
});

describe("extractVideoIdFromUrl — 다섯 모양 (mediaSlot 계약 유지)", () => {
  it.each([
    ["watch", `https://www.youtube.com/watch?v=${ID}`],
    ["watch + 뒤 파라미터", `https://www.youtube.com/watch?v=${ID}&list=PLabc&index=2`],
    ["watch + 앞 파라미터", `https://www.youtube.com/watch?app=desktop&v=${ID}`],
    ["youtu.be", `https://youtu.be/${ID}`],
    ["youtu.be + t", `https://youtu.be/${ID}?t=42`],
    ["shorts", `https://www.youtube.com/shorts/${ID}`],
    ["embed", `https://www.youtube.com/embed/${ID}`],
    ["live", `https://www.youtube.com/live/${ID}`],
    ["m.youtube", `https://m.youtube.com/watch?v=${ID}`],
    ["프로토콜 없음", `youtube.com/watch?v=${ID}`],
    ["music.youtube", `https://music.youtube.com/watch?v=${ID}`],
  ])("%s → id", (_label, url) => {
    expect(extractVideoIdFromUrl(url)).toBe(ID);
  });

  it("유튜브가 아니거나 id가 없으면 null", () => {
    expect(extractVideoIdFromUrl("nope")).toBeNull();
    expect(extractVideoIdFromUrl("https://vimeo.com/123456")).toBeNull();
    expect(extractVideoIdFromUrl("https://www.youtube.com/@channel")).toBeNull();
  });
});

describe("parseStartParam — t=/start= 변형", () => {
  it.each([
    ["42", 42],
    ["42s", 42],
    ["1m30s", 90],
    ["1h2m3s", 3723],
    ["90", 90],
  ])("t=%s → %i초", (raw, sec) => {
    expect(parseStartParam(raw)).toBe(sec);
  });

  it("해석 불가 → null", () => {
    expect(parseStartParam("")).toBeNull();
    expect(parseStartParam("abc")).toBeNull();
    expect(parseStartParam("-5")).toBeNull();
  });
});

describe("parseYouTubeLink — 한 줄 판정", () => {
  it("URL → id + 시작 초", () => {
    expect(parseYouTubeLink(`https://youtu.be/${ID}?t=1m30s`)).toEqual({
      ok: true,
      videoId: ID,
      startSec: 90,
    });
  });

  it("t 없으면 startSec = null (추천기가 채운다)", () => {
    expect(parseYouTubeLink(`https://youtu.be/${ID}`)).toEqual({
      ok: true,
      videoId: ID,
      startSec: null,
    });
  });

  it("watch의 &t=30s도 읽는다", () => {
    expect(parseYouTubeLink(`https://www.youtube.com/watch?v=${ID}&t=30s`)).toEqual({
      ok: true,
      videoId: ID,
      startSec: 30,
    });
  });

  it("앞뒤 공백·따옴표를 흡수한다 (스프레드시트 붙여넣기)", () => {
    expect(parseYouTubeLink(`  "https://youtu.be/${ID}"  `)).toEqual({
      ok: true,
      videoId: ID,
      startSec: null,
    });
  });

  it("맨 id만 붙여넣어도 통과", () => {
    expect(parseYouTubeLink(ID)).toEqual({ ok: true, videoId: ID, startSec: null });
  });

  it("빈 줄 → blank", () => {
    expect(parseYouTubeLink("   ")).toEqual({ ok: false, reason: "blank" });
  });

  it("유튜브가 아닌 URL → not-youtube", () => {
    expect(parseYouTubeLink("https://vimeo.com/123")).toEqual({
      ok: false,
      reason: "not-youtube",
    });
  });

  it("유튜브인데 id를 못 찾음 → no-video-id", () => {
    expect(parseYouTubeLink("https://www.youtube.com/@bts")).toEqual({
      ok: false,
      reason: "no-video-id",
    });
  });

  it("URL도 id도 아닌 문자열 → not-a-link", () => {
    expect(parseYouTubeLink("BTS - Dynamite")).toEqual({
      ok: false,
      reason: "not-a-link",
    });
  });
});
