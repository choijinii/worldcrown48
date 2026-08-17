/**
 * 자동 소싱 콜러블 입력 검증 테스트 (LAB-EV-2 §5 B).
 *
 * 콜러블 URL은 devtools에서 직접 부를 수 있다 — requireAdmin을 통과한 뒤에도
 * 모양이 어긋난 페이로드가 배치 상한(R5)과 쿼터 가드(R4)를 우회하면 안 된다.
 */
import { describe, expect, it } from "vitest";
import { InspectError } from "../core/inspectCore";
import { TOTAL_CONTESTANTS } from "../core/parseContestants";
import { MAX_BATCH_TARGETS } from "../_embed/sourcing/pipeline";
import { maxTargetsFor, parseSourcingRequest } from "../core/sourcingRequest";
import {
  AI_DAILY_LIMIT_BY_KIND,
  AI_DAILY_LIMIT_DEFAULT,
  resolveAiDailyLimitFor,
} from "../core/aiDailyLimit";

function targets(n: number) {
  return Array.from({ length: n }, (_, i) => ({ index: i, name: `Contestant ${i}` }));
}

describe("parseSourcingRequest", () => {
  it("정상 페이로드를 정규화한다", () => {
    const req = parseSourcingRequest({
      targets: [{ index: 2, name: "  Jisoo  ", searchHint: " BLACKPINK Jisoo stage " }],
      categoryKeywords: [" kpop ", ""],
      excludeVideoIds: ["dQw4w9WgXcQ", "bad"],
    });
    expect(req.targets).toEqual([
      { index: 2, name: "Jisoo", searchHint: "BLACKPINK Jisoo stage" },
    ]);
    expect(req.categoryKeywords).toEqual(["kpop"]);
    expect(req.excludeVideoIds).toEqual(["dQw4w9WgXcQ"]);
    expect(req.dryRun).toBe(false);
  });

  it("배치 상한은 R5의 8명 — 드라이런만 풀 전체를 받는다", () => {
    expect(maxTargetsFor(false)).toBe(MAX_BATCH_TARGETS);
    expect(maxTargetsFor(true)).toBe(TOTAL_CONTESTANTS);

    expect(() => parseSourcingRequest({ targets: targets(MAX_BATCH_TARGETS + 1) })).toThrow(
      InspectError,
    );
    expect(
      parseSourcingRequest({ targets: targets(TOTAL_CONTESTANTS), dryRun: true }).targets,
    ).toHaveLength(TOTAL_CONTESTANTS);
  });

  it("빈 targets·비배열을 거부한다", () => {
    expect(() => parseSourcingRequest({ targets: [] })).toThrow(InspectError);
    expect(() => parseSourcingRequest({ targets: "48" })).toThrow(InspectError);
    expect(() => parseSourcingRequest(undefined)).toThrow(InspectError);
  });

  it("슬롯 번호가 풀 범위 밖이면 거부한다", () => {
    expect(() =>
      parseSourcingRequest({ targets: [{ index: TOTAL_CONTESTANTS, name: "x" }] }),
    ).toThrow(InspectError);
    expect(() => parseSourcingRequest({ targets: [{ index: -1, name: "x" }] })).toThrow(
      InspectError,
    );
    expect(() => parseSourcingRequest({ targets: [{ index: 1.5, name: "x" }] })).toThrow(
      InspectError,
    );
  });

  it("같은 슬롯을 두 번 보내면 거부한다 (같은 배치에서 두 번 검색하는 낭비)", () => {
    expect(() =>
      parseSourcingRequest({
        targets: [
          { index: 0, name: "a" },
          { index: 0, name: "b" },
        ],
      }),
    ).toThrow(InspectError);
  });

  it("이름 없는 슬롯은 거부한다 (검색어를 만들 수 없다)", () => {
    expect(() => parseSourcingRequest({ targets: [{ index: 0, name: "   " }] })).toThrow(
      InspectError,
    );
  });

  it("과도한 힌트·키워드·제외 목록을 잘라낸다", () => {
    const req = parseSourcingRequest({
      targets: [{ index: 0, name: "x", searchHint: "y".repeat(500) }],
      categoryKeywords: Array.from({ length: 30 }, () => "k".repeat(80)),
      excludeVideoIds: Array.from({ length: 200 }, () => "dQw4w9WgXcQ"),
    });
    expect(req.targets[0].searchHint?.length).toBe(200);
    expect(req.categoryKeywords).toHaveLength(12);
    expect(req.categoryKeywords[0].length).toBe(30);
    expect(req.excludeVideoIds.length).toBeLessThanOrEqual(TOTAL_CONTESTANTS);
  });
});

describe("aiDailyLimit — 종류별 상한 (LAB-EV-2 §5 B)", () => {
  it("소싱 종류는 종류별 기본값이 환경변수보다 우선한다", () => {
    expect(resolveAiDailyLimitFor("autoSourceVideos", "999")).toBe(
      AI_DAILY_LIMIT_BY_KIND.autoSourceVideos,
    );
    expect(resolveAiDailyLimitFor("refreshSlotVideo", undefined)).toBe(
      AI_DAILY_LIMIT_BY_KIND.refreshSlotVideo,
    );
  });

  it("기존 두 종류는 무영향 — 환경변수·공통 기본을 그대로 쓴다", () => {
    expect(resolveAiDailyLimitFor("aiFillContestants", "30")).toBe(30);
    expect(resolveAiDailyLimitFor("aiSuggestKeywords", undefined)).toBe(
      AI_DAILY_LIMIT_DEFAULT,
    );
  });
});
