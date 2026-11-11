/**
 * LAB-EV-1 Phase C — 검수 결과 → 48칸 그리드 주입 (W4·W5).
 *
 * 컴포넌트 렌더 테스트가 금지된 스택이므로(§0.5) "어떤 슬롯이 무엇을 갖는가"는
 * 전부 이 순수 층에서 잠근다. 특히 차단 판정이 주입되지 않는다는 계약은
 * 재생 안 되는 카드를 48개 발행하는 사고를 막는 유일한 방어선이다.
 */
import { describe, expect, it } from "vitest";
import {
  applyVideoAssignments,
  buildVideoFields,
  clearVideo,
  reframeDraft,
  retimeDraft,
} from "@/lib/lab/videoDraft";
import type { LinkVerdict } from "@/lib/embed/verdict";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

const A = "9bZkp7q19f0";
const B = "dQw4w9WgXcQ";

function emptyDraft(): ContestantDraft {
  return { name: "", nationality: "", affiliation: "", imageSearchKeyword: "" };
}

function verdict(videoId: string, overrides: Partial<LinkVerdict> = {}): LinkVerdict {
  return {
    videoId,
    exists: true,
    embeddable: true,
    regionBlockedIn: [],
    regionAllowedOnly: [],
    ageRestricted: false,
    isLive: false,
    durationSec: 232,
    title: "t",
    channelTitle: "c",
    thumbnailUrl: "thumb",
    status: "pass",
    reasons: [],
    ...overrides,
  };
}

describe("buildVideoFields", () => {
  it("링크의 t=를 시작점으로 쓰고 15초 구간을 만든다 (D-12)", () => {
    expect(buildVideoFields(verdict(A), 90)).toEqual({
      videoId: A,
      videoStartSec: 90,
      videoEndSec: 105,
      videoSourceUrl: "https://www.youtube.com/watch?v=9bZkp7q19f0&t=90s",
      // IMAGE-1 — 판정의 제목·채널이 함께 실린다.
      videoTitle: "t",
      videoChannel: "c",
    });
  });

  it("t=가 없으면 휴리스틱 60s", () => {
    expect(buildVideoFields(verdict(A), null).videoStartSec).toBe(60);
  });

  it("짧은 영상은 구간이 접힌다 (§8)", () => {
    expect(buildVideoFields(verdict(A, { durationSec: 8 }), null)).toMatchObject({
      videoStartSec: 0,
      videoEndSec: 8,
    });
  });
});

describe("applyVideoAssignments — 이름 쓴 칸에 영상 얹기 (D-87)", () => {
  it("이름·소속·국가·검색어·그림을 그대로 두고 영상 필드만 얹는다", () => {
    const named = { name: "스트레이 키", nationality: "KR", affiliation: "JYP", imageSearchKeyword: "kw", imageUrl: "i.jpg", imageThumbUrl: "t.jpg" };
    const [next] = applyVideoAssignments([named], [{ slot: 1, index: 1, videoId: A, startSec: null }], [verdict(A)], 1, emptyDraft);
    expect(next).toMatchObject(named);
    expect(next.videoId).toBe(A);
  });
});

describe("applyVideoAssignments", () => {
  const drafts = [
    { ...emptyDraft(), name: "이미 입력한 이름", imageUrl: "still.jpg" },
    emptyDraft(),
  ];

  it("슬롯 번호대로 주입한다", () => {
    const next = applyVideoAssignments(
      drafts,
      [
        { slot: 1, index: 1, videoId: A, startSec: 30 },
        { slot: 2, index: 2, videoId: B, startSec: null },
      ],
      [verdict(A), verdict(B)],
      48,
      emptyDraft,
    );
    expect(next[0].videoId).toBe(A);
    expect(next[0].videoStartSec).toBe(30);
    expect(next[1].videoId).toBe(B);
  });

  it("기존 입력(이름·이미지)을 덮어쓰지 않는다 — 영상은 추가 필드다", () => {
    const next = applyVideoAssignments(
      drafts,
      [{ slot: 1, index: 1, videoId: A, startSec: null }],
      [verdict(A)],
      48,
      emptyDraft,
    );
    expect(next[0]).toMatchObject({ name: "이미 입력한 이름", imageUrl: "still.jpg" });
  });

  it("차단 판정은 주입하지 않는다 (재생 안 되는 카드 방지)", () => {
    const next = applyVideoAssignments(
      drafts,
      [{ slot: 1, index: 1, videoId: A, startSec: null }],
      [verdict(A, { status: "blocked", reasons: ["not-embeddable"], embeddable: false })],
      48,
      emptyDraft,
    );
    expect(next[0].videoId).toBeUndefined();
  });

  it("경고 판정은 주입한다 (쓸지 말지는 운영자 판단)", () => {
    const next = applyVideoAssignments(
      drafts,
      [{ slot: 1, index: 1, videoId: A, startSec: null }],
      [verdict(A, { status: "warn", reasons: ["region-blocked"], regionBlockedIn: ["KR"] })],
      48,
      emptyDraft,
    );
    expect(next[0].videoId).toBe(A);
  });

  it("항상 48칸을 돌려준다 (N=12여도 그리드는 48칸)", () => {
    const next = applyVideoAssignments(
      [],
      [{ slot: 1, index: 1, videoId: A, startSec: null }],
      [verdict(A)],
      48,
      emptyDraft,
    );
    expect(next).toHaveLength(48);
    expect(next[47]).toEqual(emptyDraft());
  });

  it("판정이 없는 배정은 건너뛴다", () => {
    const next = applyVideoAssignments(
      drafts,
      [{ slot: 1, index: 1, videoId: A, startSec: null }],
      [],
      48,
      emptyDraft,
    );
    expect(next[0].videoId).toBeUndefined();
  });
});

describe("retimeDraft — 슬라이더·추천 칩 (W5)", () => {
  const withVideo: ContestantDraft = {
    ...emptyDraft(),
    videoId: A,
    videoStartSec: 60,
    videoEndSec: 70,
    videoSourceUrl: "x",
  };

  it("시작점을 옮기면 끝점·출처 URL이 함께 따라온다", () => {
    const next = retimeDraft(withVideo, 120, 232);
    expect(next).toMatchObject({
      videoStartSec: 120,
      videoEndSec: 135,
      videoSourceUrl: "https://www.youtube.com/watch?v=9bZkp7q19f0&t=120s",
    });
  });

  it("영상이 없는 슬롯은 그대로 둔다", () => {
    const plain = emptyDraft();
    expect(retimeDraft(plain, 30, 232)).toBe(plain);
  });
});

describe("clearVideo", () => {
  it("영상 필드만 지우고 이름·검색어는 남긴다", () => {
    const draft: ContestantDraft = {
      ...emptyDraft(),
      name: "n",
      imageSearchKeyword: "k",
      videoId: A,
      videoStartSec: 60,
      videoEndSec: 70,
      videoSourceUrl: "u",
    };
    expect(clearVideo(draft)).toEqual({
      name: "n",
      nationality: "",
      affiliation: "",
      imageSearchKeyword: "k",
    });
  });
});

// ── ARENA-1 (원장 D-11 · D-14) — 세로 숏츠 칸: orientation · focusY ──
describe("reframeDraft — 영상 비율·세로 잘림 위치", () => {
  const withVideo: ContestantDraft = { ...emptyDraft(), videoId: A, videoStartSec: 30 };

  it("비율과 잘림 위치를 draft 에 적는다", () => {
    expect(reframeDraft(withVideo, { orientation: "portrait", focusY: 35 })).toMatchObject({
      videoOrientation: "portrait",
      videoFocusY: 35,
    });
  });

  it("focusY 는 0~100 정수로 자른다", () => {
    expect(reframeDraft(withVideo, { focusY: 140 }).videoFocusY).toBe(100);
    expect(reframeDraft(withVideo, { focusY: -3 }).videoFocusY).toBe(0);
    expect(reframeDraft(withVideo, { focusY: 41.6 }).videoFocusY).toBe(42);
  });

  it("영상이 없는 칸은 그대로", () => {
    const plain = emptyDraft();
    expect(reframeDraft(plain, { orientation: "portrait" })).toBe(plain);
  });

  it("clearVideo 는 비율·잘림 위치도 함께 지운다", () => {
    const framed = reframeDraft(withVideo, { orientation: "portrait", focusY: 30 });
    const cleared = clearVideo(framed);
    expect("videoOrientation" in cleared).toBe(false);
    expect("videoFocusY" in cleared).toBe(false);
  });

  it("다른 영상을 주입하면 이전 영상의 비율이 따라오지 않는다", () => {
    const framed = reframeDraft(withVideo, { orientation: "portrait", focusY: 30 });
    const next = applyVideoAssignments(
      [framed],
      [{ slot: 1, index: 1, videoId: B, startSec: null }],
      [verdict(B)],
      48,
      emptyDraft,
    );
    expect(next[0].videoId).toBe(B);
    expect(next[0].videoOrientation).toBeUndefined();
    expect(next[0].videoFocusY).toBeUndefined();
  });
});

// IMAGE-1 (마티오 메모 · D-77 보충) — 검수·자동 찾기가 받은 영상 제목·채널을 칸에 저장한다
// (이름↔영상 불일치 배지의 재료). 영상을 빼거나 갈면 함께 사라진다.
describe("영상 제목·채널 (IMAGE-1)", () => {
  it("buildVideoFields 가 제목·채널을 싣는다", () => {
    expect(buildVideoFields(verdict(A, { title: "Ditto MV", channelTitle: "HYBE LABELS" }), 90)).toMatchObject({
      videoTitle: "Ditto MV",
      videoChannel: "HYBE LABELS",
    });
  });
  it("clearVideo 가 제목·채널도 뗀다", () => {
    const d = clearVideo({ name: "n", nationality: "", affiliation: "", imageSearchKeyword: "", videoId: A, videoTitle: "x", videoChannel: "y" });
    expect("videoTitle" in d).toBe(false);
    expect("videoChannel" in d).toBe(false);
  });
});
