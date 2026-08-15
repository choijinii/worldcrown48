/**
 * LAB-EV-1 Phase B — 검수 코어 (W1 validateYouTubeLinks · W2 recommendKillingPart).
 *
 * YouTube Data API는 게이트웨이로 주입한다 — 네트워크 없이 fixture로 전 경로를
 * 돌린다(§5 Phase B). 여기서 지키는 계약 셋:
 *   ① 48개를 1콜로 (쿼터 절약 — §6 AC "48개당 1콜")
 *   ② 요청 순서 보존 (슬롯 번호가 어긋나면 판정이 거짓말이 된다)
 *   ③ 댓글 비활성은 에러가 아니라 폴백 (§8 — 정상 경로다)
 */
import { describe, expect, it, vi } from "vitest";
import {
  InspectError,
  inspectLinks,
  suggestKillingPart,
  type YouTubeGateway,
} from "../core/inspectCore";
import type { YouTubeApiItem } from "../_embed/verdict";

const ID_A = "9bZkp7q19f0";
const ID_B = "dQw4w9WgXcQ";

function video(id: string, overrides: Partial<YouTubeApiItem> = {}): YouTubeApiItem {
  return {
    id,
    status: { embeddable: true, privacyStatus: "public" },
    contentDetails: { duration: "PT3M52S" },
    snippet: {
      title: `title ${id}`,
      channelTitle: "channel",
      liveBroadcastContent: "none",
    },
    ...overrides,
  };
}

function gatewayOf(partial: Partial<YouTubeGateway>): YouTubeGateway {
  return {
    listVideos: async () => [],
    listComments: async () => [],
    ...partial,
  };
}

describe("inspectLinks — W1 일괄 검증", () => {
  it("48개를 videos.list 1콜로 처리한다 (§6 쿼터 절약)", async () => {
    const ids = Array.from({ length: 48 }, (_, i) => `id${String(i).padStart(9, "0")}`);
    const listVideos = vi.fn(async (batch: string[]) => batch.map((id) => video(id)));
    const res = await inspectLinks({ videoIds: ids }, { gateway: gatewayOf({ listVideos }) });

    expect(listVideos).toHaveBeenCalledTimes(1);
    expect(res.apiCalls).toBe(1);
    expect(res.verdicts).toHaveLength(48);
  });

  it("응답에 빠진 ID도 자리를 지킨다 (순서 = 슬롯 번호)", async () => {
    const res = await inspectLinks(
      { videoIds: [ID_A, ID_B] },
      { gateway: gatewayOf({ listVideos: async () => [video(ID_B)] }) },
    );
    expect(res.verdicts.map((v) => v.videoId)).toEqual([ID_A, ID_B]);
    expect(res.verdicts[0]).toMatchObject({ status: "blocked", reasons: ["not-found"] });
    expect(res.verdicts[1].status).toBe("pass");
  });

  it("중복 ID는 API에 한 번만 묻고, 판정은 요청한 만큼 돌려준다", async () => {
    const listVideos = vi.fn(async (batch: string[]) => batch.map((id) => video(id)));
    const res = await inspectLinks(
      { videoIds: [ID_A, ID_B, ID_A] },
      { gateway: gatewayOf({ listVideos }) },
    );
    expect(listVideos.mock.calls[0][0]).toEqual([ID_A, ID_B]);
    expect(res.verdicts).toHaveLength(3);
  });

  it("빈 배열·비배열은 invalid-argument", async () => {
    const gateway = gatewayOf({});
    await expect(inspectLinks({ videoIds: [] }, { gateway })).rejects.toMatchObject({
      reason: "invalid-argument",
    });
    await expect(inspectLinks({ videoIds: "nope" }, { gateway })).rejects.toBeInstanceOf(
      InspectError,
    );
  });

  it("id 모양이 아니면 거절한다 (클라이언트가 이미 파싱했어야 한다)", async () => {
    await expect(
      inspectLinks({ videoIds: [ID_A, "not-an-id"] }, { gateway: gatewayOf({}) }),
    ).rejects.toMatchObject({ reason: "invalid-argument" });
  });

  it("한 번에 50개를 넘으면 거절한다 (배치 상한)", async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `id${String(i).padStart(9, "0")}`);
    await expect(inspectLinks({ videoIds: ids }, { gateway: gatewayOf({}) })).rejects.toMatchObject(
      { reason: "invalid-argument" },
    );
  });

  it("쿼터 소진은 quota-exceeded로 올려 보낸다 (재시도 안내용 — §8)", async () => {
    const gateway = gatewayOf({
      listVideos: async () => {
        throw new InspectError("quota-exceeded", "quotaExceeded");
      },
    });
    await expect(inspectLinks({ videoIds: [ID_A] }, { gateway })).rejects.toMatchObject({
      reason: "quota-exceeded",
    });
  });
});

describe("suggestKillingPart — W2 추천", () => {
  const withChapters = video(ID_A, {
    contentDetails: { duration: "PT3M52S" },
    snippet: {
      title: "t",
      channelTitle: "c",
      description: "0:00 Intro\n2:00 Chorus",
      liveBroadcastContent: "none",
    },
  });

  it("①댓글 타임스탬프가 있으면 comments 층", async () => {
    const res = await suggestKillingPart(
      { videoId: ID_A },
      {
        gateway: gatewayOf({
          listVideos: async () => [withChapters],
          listComments: async () => [
            { text: "1:30 킬링파트", likeCount: 100 },
            { text: "1:31 최고", likeCount: 20 },
          ],
        }),
      },
    );
    expect(res.source).toBe("comments");
    expect(res.commentsAvailable).toBe(true);
    expect(res.durationSec).toBe(232);
    expect(res.candidates[0].startSec).toBe(90);
  });

  it("②댓글 비활성(게이트웨이가 comments-disabled)은 에러가 아니라 폴백이다 (§8)", async () => {
    const res = await suggestKillingPart(
      { videoId: ID_A },
      {
        gateway: gatewayOf({
          listVideos: async () => [withChapters],
          listComments: async () => {
            throw new InspectError("comments-disabled", "commentsDisabled");
          },
        }),
      },
    );
    expect(res.source).toBe("chapters");
    expect(res.commentsAvailable).toBe(false);
    expect(res.candidates[0].startSec).toBe(120);
  });

  it("③댓글·챕터 둘 다 없으면 60s 기본값", async () => {
    const res = await suggestKillingPart(
      { videoId: ID_A },
      { gateway: gatewayOf({ listVideos: async () => [video(ID_A)] }) },
    );
    expect(res.source).toBe("heuristic");
    expect(res.candidates[0].startSec).toBe(60);
  });

  it("없는 영상 → not-found", async () => {
    await expect(
      suggestKillingPart({ videoId: ID_A }, { gateway: gatewayOf({ listVideos: async () => [] }) }),
    ).rejects.toMatchObject({ reason: "not-found" });
  });

  it("id 모양이 아니면 invalid-argument (댓글 콜을 쏘기 전에)", async () => {
    const listComments = vi.fn();
    await expect(
      suggestKillingPart({ videoId: "bad" }, { gateway: gatewayOf({ listComments }) }),
    ).rejects.toMatchObject({ reason: "invalid-argument" });
    expect(listComments).not.toHaveBeenCalled();
  });

  it("쿼터 소진은 폴백이 아니라 그대로 올려 보낸다 (조용히 60s로 눙치지 않는다)", async () => {
    await expect(
      suggestKillingPart(
        { videoId: ID_A },
        {
          gateway: gatewayOf({
            listVideos: async () => [withChapters],
            listComments: async () => {
              throw new InspectError("quota-exceeded", "quotaExceeded");
            },
          }),
        },
      ),
    ).rejects.toMatchObject({ reason: "quota-exceeded" });
  });
});
