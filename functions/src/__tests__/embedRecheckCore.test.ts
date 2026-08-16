/**
 * LAB-EV-1 Phase D — 주간 임베드 재검증 판정 (W7).
 *
 * 링크는 썩는다. 이 층이 지키는 두 가지: ①API가 답을 안 준 칸은 건드리지 않는다
 * (한 번의 흔들림으로 멀쩡한 카드를 차단 낙인찍지 않기) ②쓰기는 의미 있는 칸만.
 */
import { describe, expect, it } from "vitest";
import {
  collectVideoIds,
  planRecheckUpdates,
  summarizeAlerts,
  type ContestantEmbedLike,
} from "../core/embedRecheckCore";
import type { LinkVerdict, LinkStatus } from "../_embed/verdict";

const NOW = 1_760_000_000_000;
const A = "9bZkp7q19f0";
const B = "dQw4w9WgXcQ";

function verdict(videoId: string, status: LinkStatus): LinkVerdict {
  return {
    videoId,
    exists: status !== "blocked",
    embeddable: status !== "blocked",
    regionBlockedIn: [],
    regionAllowedOnly: [],
    ageRestricted: false,
    isLive: false,
    durationSec: 232,
    title: "",
    channelTitle: "",
    thumbnailUrl: "",
    status,
    reasons: status === "blocked" ? ["not-embeddable"] : status === "warn" ? ["live"] : [],
  };
}

const contestant = (
  id: string,
  videoId: string,
  over: Partial<ContestantEmbedLike> = {},
): ContestantEmbedLike => ({ id, tournamentId: "t1", videoId, ...over });

describe("collectVideoIds", () => {
  it("중복은 한 번만 묻는다", () => {
    expect(collectVideoIds([contestant("c1", A), contestant("c2", A), contestant("c3", B)])).toEqual(
      [A, B],
    );
  });

  it("영상이 없는 칸은 세지 않는다", () => {
    expect(collectVideoIds([contestant("c1", "")])).toEqual([]);
  });
});

describe("planRecheckUpdates", () => {
  it("차단으로 바뀐 칸을 마킹한다", () => {
    const updates = planRecheckUpdates([contestant("c1", A)], [verdict(A, "blocked")], NOW);
    expect(updates).toEqual([
      {
        contestantId: "c1",
        tournamentId: "t1",
        status: {
          embeddable: false,
          status: "blocked",
          reasons: ["not-embeddable"],
          checkedAt: NOW,
        },
      },
    ]);
  });

  it("경고도 기록한다 (지역·연령이 붙은 사실은 남아야 한다)", () => {
    const updates = planRecheckUpdates([contestant("c1", A)], [verdict(A, "warn")], NOW);
    expect(updates[0].status).toMatchObject({ embeddable: true, status: "warn" });
  });

  it("계속 멀쩡한 칸은 쓰지 않는다 (의미 없는 주간 쓰기 방지)", () => {
    expect(planRecheckUpdates([contestant("c1", A)], [verdict(A, "pass")], NOW)).toEqual([]);
  });

  it("문제였다가 나은 칸은 기록한다 (배지가 영원히 남지 않게)", () => {
    const updates = planRecheckUpdates(
      [contestant("c1", A, { storedEmbeddable: false })],
      [verdict(A, "pass")],
      NOW,
    );
    expect(updates[0].status).toMatchObject({ embeddable: true, status: "pass" });
  });

  it("판정이 없는 칸은 건드리지 않는다 (API 흔들림 ≠ 차단)", () => {
    expect(planRecheckUpdates([contestant("c1", A)], [], NOW)).toEqual([]);
  });
});

describe("summarizeAlerts", () => {
  it("Tournament별 실패·경고 수를 센다", () => {
    const alerts = summarizeAlerts(
      [
        contestant("c1", A),
        contestant("c2", B),
        contestant("c3", A, { tournamentId: "t2" }),
      ],
      [verdict(A, "blocked"), verdict(B, "warn")],
      NOW,
    );
    expect(alerts).toEqual([
      { tournamentId: "t1", failed: 1, warned: 1, checkedAt: NOW },
      { tournamentId: "t2", failed: 1, warned: 0, checkedAt: NOW },
    ]);
  });

  it("전부 통과면 0으로 남긴다 (배지가 사라지려면 0이 기록돼야 한다)", () => {
    expect(summarizeAlerts([contestant("c1", A)], [verdict(A, "pass")], NOW)).toEqual([
      { tournamentId: "t1", failed: 0, warned: 0, checkedAt: NOW },
    ]);
  });
});
