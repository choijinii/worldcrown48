/**
 * LAB-EV-1 Phase A — 킬링파트 추천 3층 (W2 · ADR-EV-2).
 *
 * Most Replayed는 공식 API가 주지 않는다(ADR-EV-2 — 스크래핑 영구 금지). 대신
 * ①댓글 타임스탬프(좋아요 가중) ②설명란 챕터 ③휴리스틱 60s 순으로 내려가며
 * 후보를 만든다. 댓글이 꺼져 있는 영상이 정상 경로이므로, 폴백이 곧 기능이다.
 */
import { describe, expect, it } from "vitest";
import {
  clusterTimestamps,
  parseChapters,
  recommendKillingPart,
} from "@/lib/embed/killingPart";

describe("clusterTimestamps — 좋아요 가중 클러스터 ①", () => {
  it("가까운 언급을 한 후보로 묶는다", () => {
    const clusters = clusterTimestamps([
      { sec: 60, weight: 1 },
      { sec: 62, weight: 1 },
      { sec: 64, weight: 1 },
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].mentions).toBe(3);
    expect(clusters[0].sec).toBeGreaterThanOrEqual(60);
    expect(clusters[0].sec).toBeLessThanOrEqual(64);
  });

  it("멀리 떨어진 언급은 별개 후보", () => {
    const clusters = clusterTimestamps([
      { sec: 10, weight: 1 },
      { sec: 200, weight: 1 },
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("좋아요가 많은 쪽이 앞선다 (언급 수가 적어도)", () => {
    const clusters = clusterTimestamps([
      { sec: 30, weight: 1 },
      { sec: 32, weight: 1 },
      { sec: 120, weight: 500 },
    ]);
    expect(clusters[0].sec).toBe(120);
  });

  it("빈 입력 → 빈 배열", () => {
    expect(clusterTimestamps([])).toEqual([]);
  });
});

describe("parseChapters — 설명란 챕터 ②", () => {
  it("표준 챕터 목록을 초로 환산한다", () => {
    const chapters = parseChapters("0:00 Intro\n1:23 Verse\n2:45 Chorus");
    expect(chapters).toEqual([
      { startSec: 0, title: "Intro" },
      { startSec: 83, title: "Verse" },
      { startSec: 165, title: "Chorus" },
    ]);
  });

  it("구분자(-, –, :)와 여분 공백을 흡수한다", () => {
    expect(parseChapters("0:00 - Intro\n1:00 — Dance Break")).toEqual([
      { startSec: 0, title: "Intro" },
      { startSec: 60, title: "Dance Break" },
    ]);
  });

  it("타임스탬프가 뒤에 오는 표기도 읽는다", () => {
    expect(parseChapters("Intro 0:00\nChorus 2:45")).toEqual([
      { startSec: 0, title: "Intro" },
      { startSec: 165, title: "Chorus" },
    ]);
  });

  it("챕터가 아닌 설명 줄은 무시한다", () => {
    expect(parseChapters("구독과 좋아요!\nhttps://example.com\n1:00 Hook")).toEqual([
      { startSec: 60, title: "Hook" },
    ]);
  });

  it("설명이 비면 빈 배열", () => {
    expect(parseChapters("")).toEqual([]);
  });
});

describe("recommendKillingPart — 3층 폴백", () => {
  const comments = [
    { text: "1:30 여기가 킬링파트", likeCount: 120 },
    { text: "1:31 미쳤다", likeCount: 40 },
    { text: "노래 좋다", likeCount: 5 },
  ];

  it("①댓글 타임스탬프가 있으면 comments 층", () => {
    const r = recommendKillingPart({
      comments,
      description: "0:00 Intro\n2:00 Chorus",
      durationSec: 232,
    });
    expect(r.source).toBe("comments");
    expect(r.candidates[0].source).toBe("comments");
    expect(r.candidates[0].startSec).toBeGreaterThanOrEqual(90);
    expect(r.candidates[0].startSec).toBeLessThanOrEqual(91);
  });

  it("②댓글이 비활성(0개)이면 챕터 층으로 폴백 — 킬링파트 키워드 챕터 우선", () => {
    const r = recommendKillingPart({
      comments: [],
      description: "0:00 Intro\n1:00 Verse\n2:00 Chorus",
      durationSec: 232,
    });
    expect(r.source).toBe("chapters");
    expect(r.candidates[0]).toMatchObject({ startSec: 120, source: "chapters" });
  });

  it("②-b 키워드 챕터가 없으면 첫 챕터(0:00)는 건너뛰고 다음 챕터", () => {
    const r = recommendKillingPart({
      comments: [],
      description: "0:00 Intro\n1:00 Part A\n2:00 Part B",
      durationSec: 232,
    });
    expect(r.source).toBe("chapters");
    expect(r.candidates[0].startSec).toBe(60);
  });

  it("③댓글도 챕터도 없으면 휴리스틱 60s", () => {
    const r = recommendKillingPart({
      comments: [],
      description: "구독 눌러주세요",
      durationSec: 232,
    });
    expect(r.source).toBe("heuristic");
    expect(r.candidates).toEqual([
      expect.objectContaining({ startSec: 60, source: "heuristic" }),
    ]);
  });

  it("휴리스틱은 짧은 영상에서 가운데로 당겨진다 (60s가 영상 밖일 때)", () => {
    const r = recommendKillingPart({
      comments: [],
      description: "",
      durationSec: 40,
    });
    expect(r.candidates[0].startSec).toBe(15);
  });

  it("영상 길이를 넘는 댓글 타임스탬프는 버린다 (오타·다른 영상 얘기)", () => {
    const r = recommendKillingPart({
      comments: [{ text: "9:99 아니고 5:00 최고", likeCount: 3 }],
      description: "",
      durationSec: 100,
    });
    expect(r.source).toBe("heuristic");
  });

  it("후보는 최대 3개 + 마지막에 항상 기본값 칩", () => {
    const many = [
      { text: "0:30 a", likeCount: 10 },
      { text: "1:30 b", likeCount: 9 },
      { text: "2:30 c", likeCount: 8 },
      { text: "3:30 d", likeCount: 7 },
    ];
    const r = recommendKillingPart({ comments: many, description: "", durationSec: 300 });
    expect(r.candidates.filter((c) => c.source === "comments")).toHaveLength(3);
    expect(r.candidates.at(-1)?.source).toBe("heuristic");
  });

  it("신뢰도는 0~1이고 가장 강한 후보가 가장 높다", () => {
    const r = recommendKillingPart({ comments, description: "", durationSec: 232 });
    for (const c of r.candidates) {
      expect(c.confidence).toBeGreaterThanOrEqual(0);
      expect(c.confidence).toBeLessThanOrEqual(1);
    }
    expect(r.candidates[0].confidence).toBeGreaterThanOrEqual(
      r.candidates[1]?.confidence ?? 0,
    );
  });

  it("길이를 모르는 영상(라이브 등)도 죽지 않는다", () => {
    const r = recommendKillingPart({ comments: [], description: "", durationSec: null });
    expect(r.candidates[0].startSec).toBe(60);
  });
});
