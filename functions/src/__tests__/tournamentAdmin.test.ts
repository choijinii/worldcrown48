/**
 * ARENA-2 PR 3 (원장 D-86) — 대회 삭제 · 조기 마감 · 숨김 판정.
 *
 * 잡으려는 사고: Lab [삭제]가 참여 여부를 보지 않고 대회와 엔트리만 지워, 참여한 팬의 크라운 카드와
 * 공유 링크가 깨지고 선택·진행 기록이 주인 없이 남았다(2026-09-02 실측).
 */
import { describe, expect, it } from "vitest";
import {
  TOURNAMENT_ADMIN_ERROR_CODES as CODES,
  decideRemoval,
  isTournamentOpenForChoices,
  isTournamentRunDocOf,
  planCloseEarly,
  planVisibility,
} from "../core/tournamentAdmin";

describe("decideRemoval — 참여 0명일 때만 삭제 (① · ③)", () => {
  it("선택 0건 · 발행 기사 0건이면 지운다", () => {
    expect(decideRemoval({ choiceCount: 0, publishedArticleCount: 0 })).toEqual({ ok: true });
  });

  it("선택이 1건이라도 있으면(게스트 포함) 막고 조기 마감을 쓰게 한다", () => {
    expect(decideRemoval({ choiceCount: 1, publishedArticleCount: 0 })).toEqual({
      ok: false,
      code: CODES.HAS_FANS,
    });
  });

  it("발행 기사가 있으면 막는다", () => {
    expect(decideRemoval({ choiceCount: 0, publishedArticleCount: 1 })).toEqual({
      ok: false,
      code: CODES.HAS_ARTICLE,
    });
  });

  it("둘 다 있으면 참여가 먼저다 — 기사를 내려도 지울 수 없으니까", () => {
    expect(decideRemoval({ choiceCount: 3, publishedArticleCount: 2 })).toMatchObject({ code: CODES.HAS_FANS });
  });
});

describe("planCloseEarly — 마감 시각을 지금으로 (②)", () => {
  const NOW = Date.UTC(2026, 10, 7, 3, 0, 0);

  it("마감 전이면 마감을 지금으로 당긴다", () => {
    expect(planCloseEarly({ deadlineMs: NOW + 86_400_000, nowMs: NOW })).toEqual({ ok: true, deadlineMs: NOW });
  });

  it("마감이 없는 옛 문서도 지금으로 닫을 수 있다", () => {
    expect(planCloseEarly({ deadlineMs: null, nowMs: NOW })).toEqual({ ok: true, deadlineMs: NOW });
  });

  it("이미 마감이 지났으면 거절한다 — 마감을 늦추는 일이 없게", () => {
    expect(planCloseEarly({ deadlineMs: NOW - 1, nowMs: NOW })).toEqual({ ok: false, code: CODES.ALREADY_CLOSED });
  });
});

describe("planVisibility — 숨기기 · 다시 보이기 (③)", () => {
  it("공개 대회를 숨기면 상태 = hidden, 대표 대회 표시도 끈다", () => {
    expect(planVisibility("hide", "active")).toEqual({ ok: true, status: "hidden", featured: false });
  });

  it("숨긴 대회를 다시 보이면 상태 = active (대표 대회 표시는 켜지 않는다)", () => {
    expect(planVisibility("unhide", "hidden")).toEqual({ ok: true, status: "active" });
  });

  it("공개 대회가 아니면 숨길 수 없다(draft 등)", () => {
    expect(planVisibility("hide", "draft")).toEqual({ ok: false, code: CODES.NOT_ACTIVE });
    expect(planVisibility("hide", "hidden")).toEqual({ ok: false, code: CODES.NOT_ACTIVE });
  });

  it("숨긴 대회가 아니면 다시 보일 수 없다", () => {
    expect(planVisibility("unhide", "active")).toEqual({ ok: false, code: CODES.NOT_HIDDEN });
    expect(planVisibility("unhide", "draft")).toEqual({ ok: false, code: CODES.NOT_HIDDEN });
  });
});

describe("isTournamentOpenForChoices — 선택을 받는 대회인가 (onVote)", () => {
  it("있는 공개 대회는 받는다(마감은 decideRun 이 따로 본다)", () => {
    expect(isTournamentOpenForChoices({ exists: true, status: "active" })).toBe(true);
  });

  it("없는 대회 · 숨긴 대회 · 지우는 중인 대회는 받지 않는다", () => {
    expect(isTournamentOpenForChoices({ exists: false })).toBe(false);
    expect(isTournamentOpenForChoices({ exists: true, status: "hidden" })).toBe(false);
    expect(isTournamentOpenForChoices({ exists: true, status: "active", removingAt: 123 })).toBe(false);
  });
});

describe("isTournamentRunDocOf — `{uid}_{tid}` · `{uid}_{tid}_r{n}` 문서 고르기", () => {
  it("그 대회의 1회차 · n회차 문서를 고른다", () => {
    expect(isTournamentRunDocOf("UID1_t1", "t1")).toBe(true);
    expect(isTournamentRunDocOf("UID1_t1_r3", "t1")).toBe(true);
  });

  it("'_' 가 든 슬러그도 맞게 고른다", () => {
    expect(isTournamentRunDocOf("UID1_gen4_idol_48", "gen4_idol_48")).toBe(true);
    expect(isTournamentRunDocOf("UID1_gen4_idol_48_r2", "gen4_idol_48")).toBe(true);
  });

  it("다른 대회 · 이름이 앞부분만 같은 대회는 고르지 않는다", () => {
    expect(isTournamentRunDocOf("UID1_t10", "t1")).toBe(false);
    expect(isTournamentRunDocOf("UID1_t1x", "t1")).toBe(false);
    expect(isTournamentRunDocOf("UID1_t1_rx", "t1")).toBe(false);
    expect(isTournamentRunDocOf("t1", "t1")).toBe(false);
  });
});
