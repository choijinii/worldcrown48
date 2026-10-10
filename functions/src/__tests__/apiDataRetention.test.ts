/**
 * POLICY-YT-1 Phase E — YouTube API 자료 30일 (개발자 정책 III.E.4 · 지시서 R4 · 대표 결정 2026-10-10).
 *
 * 정책 문서(부록 A)가 약속한 것: "YouTube에서 받은 영상 정보는 30일을 넘겨 보관하지 않으며,
 * 그 전에 YouTube에서 새로 받거나 지웁니다." 이 층이 그 약속을 지키는 판정이다.
 *
 *   ① video_search_cache — 25일 넘으면 videos.list 로 새로 받는다(검색 횟수를 아끼는 캐시는 지키고),
 *      30일 넘었거나 새로 받기에 실패하면 지운다. 기준 = apiRefreshedAt, 없으면 처음 저장 시각 cachedAt.
 *      7일 신선도 판정(cachedAt)은 건드리지 않는다.
 *   ② 끝난 대회(status "ended")의 재생 판정 — contestants.media.embed.status · tournaments.videoAlert
 *      를 지운다(할당량 0). 다시 진행 중이 되면 월요일 재검사(scheduleEmbedRecheck)가 다시 채운다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  API_DATA_MAX_AGE_MS,
  API_DATA_REFRESH_AFTER_MS,
  planCacheRetention,
  planEndedEmbedCleanup,
  refreshCandidates,
} from "../core/apiDataRetention";
import { planRecheckUpdates, summarizeAlerts } from "../core/embedRecheckCore";
import type { LinkStatus, LinkVerdict, YouTubeApiItem } from "../_embed/verdict";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_760_000_000_000;

describe("기준 수치", () => {
  it("25일에 새로 받고, 30일을 넘기지 않는다", () => {
    expect(API_DATA_REFRESH_AFTER_MS).toBe(25 * DAY);
    expect(API_DATA_MAX_AGE_MS).toBe(30 * DAY);
  });
});

describe("planCacheRetention — 검색 캐시 문서 하나", () => {
  it("25일 이하 = 그대로", () => {
    expect(planCacheRetention({ cachedAt: NOW - 3 * DAY }, NOW)).toBe("keep");
    expect(planCacheRetention({ cachedAt: NOW - 25 * DAY }, NOW)).toBe("keep");
  });

  it("25일 넘음 ~ 30일 = 새로 받기", () => {
    expect(planCacheRetention({ cachedAt: NOW - 25 * DAY - 1 }, NOW)).toBe("refresh");
    expect(planCacheRetention({ cachedAt: NOW - 30 * DAY }, NOW)).toBe("refresh");
  });

  it("30일 넘음 = 지우기", () => {
    expect(planCacheRetention({ cachedAt: NOW - 30 * DAY - 1 }, NOW)).toBe("delete");
  });

  it("기준은 apiRefreshedAt — 처음 저장이 오래됐어도 최근에 새로 받았으면 그대로", () => {
    expect(planCacheRetention({ cachedAt: NOW - 60 * DAY, apiRefreshedAt: NOW - 2 * DAY }, NOW)).toBe("keep");
    expect(planCacheRetention({ cachedAt: NOW - 1 * DAY, apiRefreshedAt: NOW - 31 * DAY }, NOW)).toBe("delete");
  });

  it("시각이 하나도 없으면(나이를 모름) 지운다 — 모르면 30일 넘은 것으로", () => {
    expect(planCacheRetention({}, NOW)).toBe("delete");
    expect(planCacheRetention({ cachedAt: "어제" as unknown as number }, NOW)).toBe("delete");
  });
});

function item(id: string, title: string, channelTitle: string): YouTubeApiItem {
  return { id, snippet: { title, channelTitle } };
}

describe("refreshCandidates — videos.list 응답으로 후보 목록 새로 쓰기", () => {
  const cached = [
    { videoId: "aaaaaaaaaaa", title: "옛 제목 A", channelTitle: "옛 채널 A" },
    { videoId: "bbbbbbbbbbb", title: "옛 제목 B", channelTitle: "옛 채널 B" },
    { videoId: "ccccccccccc", title: "옛 제목 C", channelTitle: "옛 채널 C" },
  ];

  it("제목·채널 이름을 새 값으로, 순서(= 재시도 순서)는 그대로", () => {
    const out = refreshCandidates(cached, [
      item("ccccccccccc", "새 C", "채널 C"),
      item("aaaaaaaaaaa", "새 A", "채널 A"),
      item("bbbbbbbbbbb", "새 B", "채널 B"),
    ]);
    expect(out).toEqual([
      { videoId: "aaaaaaaaaaa", title: "새 A", channelTitle: "채널 A" },
      { videoId: "bbbbbbbbbbb", title: "새 B", channelTitle: "채널 B" },
      { videoId: "ccccccccccc", title: "새 C", channelTitle: "채널 C" },
    ]);
  });

  it("영상이 없어졌으면(응답에 없음) 그 후보만 뺀다", () => {
    const out = refreshCandidates(cached, [item("aaaaaaaaaaa", "새 A", "채널 A"), item("ccccccccccc", "새 C", "채널 C")]);
    expect(out.map((c) => c.videoId)).toEqual(["aaaaaaaaaaa", "ccccccccccc"]);
  });

  it("전부 없어졌으면 빈 목록 — 호출자가 문서를 지운다", () => {
    expect(refreshCandidates(cached, [])).toEqual([]);
  });
});

describe("planEndedEmbedCleanup — 끝난 대회의 재생 판정 지우기", () => {
  const tournaments = [
    { id: "t-ended", status: "ended", hasVideoAlert: true },
    { id: "t-ended-clean", status: "ended", hasVideoAlert: false },
    { id: "t-active", status: "active", hasVideoAlert: true },
    { id: "t-draft", status: "draft", hasVideoAlert: true },
  ];
  const contestants = [
    { id: "c1", tournamentId: "t-ended", hasEmbedStatus: true },
    { id: "c2", tournamentId: "t-ended", hasEmbedStatus: false },
    { id: "c3", tournamentId: "t-ended-clean", hasEmbedStatus: true },
    { id: "c4", tournamentId: "t-active", hasEmbedStatus: true },
    { id: "c5", tournamentId: "t-draft", hasEmbedStatus: true },
  ];

  it("ended 대회의, 판정이 남은 것만", () => {
    expect(planEndedEmbedCleanup(tournaments, contestants)).toEqual({
      tournamentIds: ["t-ended"],
      contestantIds: ["c1", "c3"],
    });
  });

  it("진행 중·준비 중 대회는 건드리지 않는다", () => {
    const plan = planEndedEmbedCleanup(tournaments, contestants);
    expect(plan.tournamentIds).not.toContain("t-active");
    expect(plan.tournamentIds).not.toContain("t-draft");
    expect(plan.contestantIds).not.toContain("c4");
    expect(plan.contestantIds).not.toContain("c5");
  });
});

describe("다시 진행 중이 되면 월요일 재검사가 다시 채운다 (대표 지시 — 동작 고정)", () => {
  function verdict(videoId: string, status: LinkStatus): LinkVerdict {
    return {
      videoId,
      exists: status !== "blocked",
      embeddable: status !== "blocked",
      regionBlockedIn: [],
      regionAllowedOnly: [],
      ageRestricted: status === "warn",
      isLive: false,
      durationSec: 200,
      title: "",
      channelTitle: "",
      thumbnailUrl: "",
      status,
      reasons: status === "blocked" ? ["not-embeddable"] : status === "warn" ? ["age-restricted"] : [],
    };
  }

  // 지운 뒤의 모습: media.embed.status 가 없다 → storedEmbeddable undefined.
  const afterCleanup = [
    { id: "c1", tournamentId: "t-back", videoId: "aaaaaaaaaaa" },
    { id: "c2", tournamentId: "t-back", videoId: "bbbbbbbbbbb" },
    { id: "c3", tournamentId: "t-back", videoId: "ccccccccccc" },
  ];
  const verdicts = [
    verdict("aaaaaaaaaaa", "blocked"),
    verdict("bbbbbbbbbbb", "warn"),
    verdict("ccccccccccc", "pass"),
  ];

  it("막힌·경고 영상의 판정이 다시 써진다 — Lab ⚠️ 가 다시 뜬다", () => {
    const updates = planRecheckUpdates(afterCleanup, verdicts, NOW);
    expect(updates.map((u) => [u.contestantId, u.status.status])).toEqual([
      ["c1", "blocked"],
      ["c2", "warn"],
    ]);
  });

  it("통과 영상은 판정 없이 둔다 — 새로 발행한 대회와 같은 모습(지금 재검사의 쓰기 절약 규칙)", () => {
    expect(planRecheckUpdates(afterCleanup, verdicts, NOW).map((u) => u.contestantId)).not.toContain("c3");
  });

  it("대회의 videoAlert 는 다시 써진다", () => {
    expect(summarizeAlerts(afterCleanup, verdicts, NOW)).toEqual([
      { tournamentId: "t-back", failed: 1, warned: 1, checkedAt: NOW },
    ]);
  });

  it("재검사 크론은 status==active 대회를 본다 — ended → active 로 돌아오면 대상이 된다", () => {
    const src = readFileSync(join(__dirname, "..", "scheduleEmbedRecheck.ts"), "utf8");
    expect(src).toContain('.where("status", "==", "active")');
  });
});

describe("예약 함수 scheduleYouTubeDataRefresh (소스 가드)", () => {
  const src = readFileSync(join(__dirname, "..", "scheduleYouTubeDataRefresh.ts"), "utf8");

  it("매일 한 번 · KST · 서울 리전 · 기존 YOUTUBE_API_KEY 시크릿만", () => {
    expect(src).toMatch(/schedule: "\d+ \d+ \* \* \*"/);
    expect(src).toContain('timeZone: "Asia/Seoul"');
    expect(src).toContain('region: "asia-northeast3"');
    expect(src).toContain('secrets: ["YOUTUBE_API_KEY"]');
  });

  it("7일 신선도 필드 cachedAt 은 쓰지 않는다 — 새로 받은 시각은 apiRefreshedAt", () => {
    expect(src).toContain("apiRefreshedAt");
    expect(src).not.toMatch(/cachedAt\s*:/);
  });

  it("할당량은 기존 youtubeQuota 경로로 기록한다", () => {
    expect(src).toContain("reserveYouTubeQuota");
  });

  it("index.ts 가 내보낸다(배포 대상)", () => {
    const index = readFileSync(join(__dirname, "..", "index.ts"), "utf8");
    expect(index).toContain('export { scheduleYouTubeDataRefresh } from "./scheduleYouTubeDataRefresh"');
  });
});
