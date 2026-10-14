/**
 * POLICY-YT-1 Phase E — YouTube API 자료 30일 (개발자 정책 III.E.4 · 지시서 R4 · 대표 결정 2026-10-10 두 건).
 *
 * 정책 문서(부록 A)가 약속한 것: "YouTube에서 받은 영상 정보는 30일을 넘겨 보관하지 않으며,
 * 그 전에 YouTube에서 새로 받거나 지웁니다." 이 층이 그 약속을 지키는 판정이다.
 *
 *   ① video_search_cache — 7일 신선도(isCacheFresh · cachedAt)를 넘긴 문서는 **지운다**(할당량 0).
 *      검색 쪽(readSearchCache)이 7일 지난 문서를 쓰지 않으므로 새로 받아도 다시 읽히지 않는다 —
 *      지시서 R4 의 "25일에 새로 받기"는 이 결정으로 바뀌었다. 7일 신선도 규칙은 그대로.
 *   ② 끝난 대회(status "ended")의 재생 판정 — contestants.media.embed.status · tournaments.videoAlert
 *      를 지운다(할당량 0). 다시 진행 중이 되면 월요일 재검사(scheduleEmbedRecheck)가 다시 채운다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  API_DATA_MAX_AGE_MS,
  planCacheRetention,
  planEndedEmbedCleanup,
} from "../core/apiDataRetention";
import { isDeadlinePassed } from "../_run/deadline";
import { CACHE_TTL_MS, isCacheFresh } from "../_embed/sourcing/searchQuery";
import { planRecheckUpdates, summarizeAlerts } from "../core/embedRecheckCore";
import type { LinkStatus, LinkVerdict } from "../_embed/verdict";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_760_000_000_000;

describe("기준 수치", () => {
  it("검색 캐시는 7일 신선도에서 끝난다 — 정책의 30일보다 짧다", () => {
    expect(CACHE_TTL_MS).toBe(7 * DAY);
    expect(API_DATA_MAX_AGE_MS).toBe(30 * DAY);
    expect(CACHE_TTL_MS).toBeLessThan(API_DATA_MAX_AGE_MS);
  });
});

describe("planCacheRetention — 검색 캐시 문서 하나 (대표 결정: 7일 지나면 지우기)", () => {
  it("7일 안 = 그대로", () => {
    expect(planCacheRetention({ cachedAt: NOW - 1 * DAY }, NOW)).toBe("keep");
    expect(planCacheRetention({ cachedAt: NOW - 7 * DAY + 1 }, NOW)).toBe("keep");
  });

  it("7일 = 지우기 — 새로 받지 않는다", () => {
    expect(planCacheRetention({ cachedAt: NOW - 7 * DAY }, NOW)).toBe("delete");
    expect(planCacheRetention({ cachedAt: NOW - 25 * DAY }, NOW)).toBe("delete");
  });

  it("검색 쪽 신선도 판정(isCacheFresh)과 경계가 똑같다 — 쓰는 문서는 남기고, 안 쓰는 문서만 지운다", () => {
    for (const age of [0, DAY, 7 * DAY - 1, 7 * DAY, 7 * DAY + 1, 40 * DAY]) {
      const fresh = isCacheFresh(NOW - age, NOW);
      expect(planCacheRetention({ cachedAt: NOW - age }, NOW)).toBe(fresh ? "keep" : "delete");
    }
  });

  it("시각이 없으면(나이를 모름) 지운다", () => {
    expect(planCacheRetention({}, NOW)).toBe("delete");
    expect(planCacheRetention({ cachedAt: "어제" as unknown as number }, NOW)).toBe("delete");
  });
});

describe("planEndedEmbedCleanup — 끝난 대회(마감 시간 지남)의 재생 판정 지우기 (원장 D-45·D-50)", () => {
  // 끝난 대회 = tournamentDeadline 이 지난 대회. status 는 보지 않는다 — 코드 어디에도 "ended" 를
  // 쓰는 곳이 없어, 마감이 지나도 status 는 "active" 로 남는다(원장 D-45 정의).
  const tournaments = [
    { id: "t-past", deadlineMs: NOW - DAY, hasVideoAlert: true },
    { id: "t-past-clean", deadlineMs: NOW - DAY, hasVideoAlert: false },
    { id: "t-future", deadlineMs: NOW + DAY, hasVideoAlert: true },
    { id: "t-no-deadline", deadlineMs: null, hasVideoAlert: true },
    { id: "t-future-2", deadlineMs: NOW + DAY, hasVideoAlert: true },
  ];
  const contestants = [
    { id: "c1", tournamentId: "t-past", hasEmbedStatus: true },
    { id: "c2", tournamentId: "t-past", hasEmbedStatus: false },
    { id: "c3", tournamentId: "t-past-clean", hasEmbedStatus: true },
    { id: "c4", tournamentId: "t-future", hasEmbedStatus: true },
    { id: "c5", tournamentId: "t-no-deadline", hasEmbedStatus: true },
    { id: "c6", tournamentId: "t-future-2", hasEmbedStatus: true },
  ];

  it("마감이 지난 대회의, 판정이 남은 것만 — status 가 active 여도", () => {
    expect(planEndedEmbedCleanup(tournaments, contestants, NOW)).toEqual({
      tournamentIds: ["t-past"],
      contestantIds: ["c1", "c3"],
    });
  });

  it("마감 전 · 마감 없음 대회는 건드리지 않는다 — 마감 전이면 그대로", () => {
    const plan = planEndedEmbedCleanup(tournaments, contestants, NOW);
    for (const id of ["t-future", "t-no-deadline", "t-future-2"]) expect(plan.tournamentIds).not.toContain(id);
    for (const id of ["c4", "c5", "c6"]) expect(plan.contestantIds).not.toContain(id);
  });

  it("경계는 onVote 와 같다 — 마감 시각 정각은 아직 끝나지 않았다", () => {
    const at = [{ id: "t", deadlineMs: NOW, hasVideoAlert: true }];
    const just = [{ id: "t", deadlineMs: NOW - 1, hasVideoAlert: true }];
    for (const deadlineMs of [NOW, NOW - 1, NOW + 1]) {
      expect(planEndedEmbedCleanup([{ ...at[0], deadlineMs }], [], NOW).tournamentIds.length === 1).toBe(
        isDeadlinePassed(deadlineMs, NOW),
      );
    }
    expect(planEndedEmbedCleanup(at, [], NOW).tournamentIds).toEqual([]);
    expect(planEndedEmbedCleanup(just, [], NOW).tournamentIds).toEqual(["t"]);
  });
});

describe("예약 함수가 status 가 아니라 마감 시간으로 고른다", () => {
  const src = readFileSync(join(__dirname, "..", "scheduleYouTubeDataRetention.ts"), "utf8");
  it('where("status", "==", "ended") 를 쓰지 않는다 — 아무도 ended 를 쓰지 않아 늘 0건이었다', () => {
    expect(src).not.toMatch(/where\(\s*"status"\s*,\s*"=="\s*,\s*"ended"\s*\)/);
  });
  it("tournamentDeadline 으로 고른다", () => {
    expect(src).toMatch(/tournamentDeadline/);
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

  it("재검사 크론은 status==active 대회를 본다 — 마감을 늘려 다시 진행되면 대상이 된다", () => {
    const src = readFileSync(join(__dirname, "..", "scheduleEmbedRecheck.ts"), "utf8");
    expect(src).toContain('.where("status", "==", "active")');
  });
});

describe("예약 함수 scheduleYouTubeDataRetention (소스 가드)", () => {
  const src = readFileSync(join(__dirname, "..", "scheduleYouTubeDataRetention.ts"), "utf8");

  it("매일 한 번 · KST · 서울 리전", () => {
    expect(src).toMatch(/schedule: "\d+ \d+ \* \* \*"/);
    expect(src).toContain('timeZone: "Asia/Seoul"');
    expect(src).toContain('region: "asia-northeast3"');
  });

  it("할당량 0 — YouTube API 를 부르지 않고, 키도 시크릿도 쓰지 않는다", () => {
    expect(src).not.toMatch(/youtubeGateway|listVideos|reserveYouTubeQuota|secrets:|YOUTUBE_API_KEY/);
  });

  it("검색 캐시를 새로 쓰지 않는다 — 지우기만(cachedAt · candidates 를 쓰지 않음)", () => {
    expect(src).not.toMatch(/cachedAt\s*:|candidates\s*:|apiRefreshedAt/);
  });

  it("index.ts 가 내보낸다(배포 대상) · 옛 이름은 없다", () => {
    const index = readFileSync(join(__dirname, "..", "index.ts"), "utf8");
    expect(index).toContain('export { scheduleYouTubeDataRetention } from "./scheduleYouTubeDataRetention"');
    expect(index).not.toContain("scheduleYouTubeDataRefresh");
  });
});
