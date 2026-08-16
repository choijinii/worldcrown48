/**
 * LAB-EV-1 Phase A — 링크 판정 매핑 (W1 · §6 AC#3).
 *
 * videos.list 응답을 "운영자가 조치할 수 있는 판정"으로 바꾼다. 4가지 실패가
 * 각각 구분돼야 한다: 없는 ID · embeddable=false · 지역차단 · 연령제한.
 * 통과/경고/차단 3색은 여기서 결정되고 UI는 색만 칠한다.
 */
import { describe, expect, it } from "vitest";
import { buildVerdicts, type YouTubeApiItem } from "@/lib/embed/verdict";

const ID = "9bZkp7q19f0";

function item(overrides: Partial<YouTubeApiItem> = {}): YouTubeApiItem {
  return {
    id: ID,
    status: { embeddable: true, privacyStatus: "public" },
    contentDetails: { duration: "PT3M52S" },
    snippet: {
      title: "GANGNAM STYLE",
      channelTitle: "officialpsy",
      liveBroadcastContent: "none",
      thumbnails: { high: { url: "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg" } },
    },
    ...overrides,
  };
}

describe("buildVerdicts — 통과", () => {
  it("임베드 가능한 공개 영상 → pass + 메타데이터", () => {
    const [v] = buildVerdicts([ID], [item()]);
    expect(v).toMatchObject({
      videoId: ID,
      exists: true,
      embeddable: true,
      status: "pass",
      durationSec: 232,
      title: "GANGNAM STYLE",
      channelTitle: "officialpsy",
      ageRestricted: false,
      regionBlockedIn: [],
      reasons: [],
    });
    expect(v.thumbnailUrl).toContain(ID);
  });

  it("요청 순서를 그대로 지킨다 (슬롯 번호가 어긋나면 안 된다)", () => {
    const ids = ["aaaaaaaaaaa", ID, "bbbbbbbbbbb"];
    const verdicts = buildVerdicts(ids, [item({ id: "bbbbbbbbbbb" }), item()]);
    expect(verdicts.map((v) => v.videoId)).toEqual(ids);
  });
});

describe("buildVerdicts — 차단 (빨강)", () => {
  it("응답에 없는 ID → 존재하지 않음", () => {
    const [v] = buildVerdicts([ID], []);
    expect(v).toMatchObject({ exists: false, status: "blocked", reasons: ["not-found"] });
  });

  it("embeddable=false → 외부 재생 불가", () => {
    const [v] = buildVerdicts([ID], [item({ status: { embeddable: false, privacyStatus: "public" } })]);
    expect(v).toMatchObject({ status: "blocked", embeddable: false });
    expect(v.reasons).toContain("not-embeddable");
  });

  it("비공개 영상 → 차단", () => {
    const [v] = buildVerdicts([ID], [item({ status: { embeddable: true, privacyStatus: "private" } })]);
    expect(v.status).toBe("blocked");
    expect(v.reasons).toContain("private");
  });

  it("썸네일이 없어도 폴백 URL을 만든다 (판정 화면이 비지 않게)", () => {
    const [v] = buildVerdicts([ID], [item({ snippet: { title: "t", channelTitle: "c" } })]);
    expect(v.thumbnailUrl).toBe("https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg");
  });
});

describe("buildVerdicts — 경고 (노랑)", () => {
  it("지역차단 → 차단 국가 목록을 그대로 실어 보낸다", () => {
    const [v] = buildVerdicts(
      [ID],
      [item({ contentDetails: { duration: "PT3M52S", regionRestriction: { blocked: ["KR", "JP"] } } })],
    );
    expect(v).toMatchObject({ status: "warn", regionBlockedIn: ["KR", "JP"] });
    expect(v.reasons).toContain("region-blocked");
  });

  it("allowed 목록만 있는 영상 → 허용국 목록으로 경고", () => {
    const [v] = buildVerdicts(
      [ID],
      [item({ contentDetails: { duration: "PT3M52S", regionRestriction: { allowed: ["US"] } } })],
    );
    expect(v).toMatchObject({ status: "warn", regionAllowedOnly: ["US"] });
    expect(v.reasons).toContain("region-limited");
  });

  it("연령제한 → 경고 (임베드에서 재생이 막힐 수 있음)", () => {
    const [v] = buildVerdicts(
      [ID],
      [item({ contentDetails: { duration: "PT3M52S", contentRating: { ytRating: "ytAgeRestricted" } } })],
    );
    expect(v).toMatchObject({ status: "warn", ageRestricted: true });
    expect(v.reasons).toContain("age-restricted");
  });

  it("라이브 스트림 → 경고 + 길이 null", () => {
    const [v] = buildVerdicts(
      [ID],
      [
        item({
          contentDetails: { duration: "P0D" },
          snippet: { title: "t", channelTitle: "c", liveBroadcastContent: "live" },
        }),
      ],
    );
    expect(v.status).toBe("warn");
    expect(v.isLive).toBe(true);
    expect(v.reasons).toContain("live");
  });

  it("10초보다 짧은 영상 → 경고 (루프가 성립하지 않는다)", () => {
    const [v] = buildVerdicts([ID], [item({ contentDetails: { duration: "PT8S" } })]);
    expect(v.status).toBe("warn");
    expect(v.reasons).toContain("too-short");
  });

  it("차단 사유가 있으면 경고보다 차단이 이긴다", () => {
    const [v] = buildVerdicts(
      [ID],
      [
        item({
          status: { embeddable: false, privacyStatus: "public" },
          contentDetails: { duration: "PT3M52S", regionRestriction: { blocked: ["KR"] } },
        }),
      ],
    );
    expect(v.status).toBe("blocked");
  });
});
