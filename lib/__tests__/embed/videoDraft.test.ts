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
  releaseRenamedSlot,
  retimeDraft,
} from "@/lib/lab/videoDraft";
import type { LinkVerdict } from "@/lib/embed/verdict";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

const A = "9bZkp7q19f0";
const B = "dQw4w9WgXcQ";

function emptyDraft(): ContestantDraft {
  return { name: "", nationality: "", position: "", imageUrl: "", imageSearchKeyword: "" };
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
  it("링크의 t=를 시작점으로 쓰고 10초 구간을 만든다", () => {
    expect(buildVideoFields(verdict(A), 90)).toEqual({
      videoId: A,
      videoStartSec: 90,
      videoEndSec: 100,
      videoSourceUrl: "https://www.youtube.com/watch?v=9bZkp7q19f0&t=90s",
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
      videoEndSec: 130,
      videoSourceUrl: "https://www.youtube.com/watch?v=9bZkp7q19f0&t=120s",
    });
  });

  it("영상이 없는 슬롯은 그대로 둔다", () => {
    const plain = emptyDraft();
    expect(retimeDraft(plain, 30, 232)).toBe(plain);
  });
});

describe("clearVideo", () => {
  it("영상 필드만 지우고 이름·이미지는 남긴다", () => {
    const draft: ContestantDraft = {
      ...emptyDraft(),
      name: "n",
      imageUrl: "i",
      videoId: A,
      videoStartSec: 60,
      videoEndSec: 70,
      videoSourceUrl: "u",
    };
    expect(clearVideo(draft)).toEqual({
      name: "n",
      nationality: "",
      position: "",
      imageUrl: "i",
      imageSearchKeyword: "",
    });
  });
});

describe("releaseRenamedSlot — 이름이 다른 인물로 바뀐 칸 (LAB-UX-1)", () => {
  const harin: ContestantDraft = {
    ...emptyDraft(),
    name: "하린",
    nationality: "대한민국",
    imageSearchKeyword: "Harin stage",
    videoId: A,
    videoStartSec: 30,
    videoEndSec: 45,
    videoSourceUrl: "u",
  };

  it("영상과 검색 힌트를 함께 뗀다 — 힌트를 남기면 재검색이 또 이전 인물을 데려온다", () => {
    const next = releaseRenamedSlot(harin, "허윤진");
    expect(next.name).toBe("허윤진");
    expect(next.videoId).toBeUndefined();
    expect(next.videoSourceUrl).toBeUndefined();
    expect(next.imageSearchKeyword).toBe("");
    // 국적은 남긴다 — 이름과 함께 바뀌는 값이 아니다.
    expect(next.nationality).toBe("대한민국");
  });

  it("로마자 꼬리만 손질하면 영상·힌트를 유지한다", () => {
    const jisoo: ContestantDraft = { ...harin, name: "지수 (JISOO)" };
    const next = releaseRenamedSlot(jisoo, "지수 (Jisoo)");
    expect(next.videoId).toBe(A);
    expect(next.imageSearchKeyword).toBe("Harin stage");
  });

  it("빈칸으로 만드는 경로는 그대로 통과시킨다(카드 비우기가 따로 처리한다)", () => {
    const next = releaseRenamedSlot(harin, "");
    expect(next.name).toBe("");
    expect(next.videoId).toBe(A);
  });

  it("입력 draft를 바꾸지 않는다", () => {
    releaseRenamedSlot(harin, "허윤진");
    expect(harin.videoId).toBe(A);
    expect(harin.imageSearchKeyword).toBe("Harin stage");
  });
});
