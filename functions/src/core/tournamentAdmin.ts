/**
 * 대회 삭제 · 조기 마감 · 숨김 판정 — ARENA-2 PR 3 (원장 D-86 · 2026-09-02 네 원칙).
 *
 *   ① 참여 0명일 때만 삭제 — *참여* = 게스트를 포함해 선택이 1건이라도 기록된 것
 *   ② 1명 이상이면 조기 마감 — `tournamentDeadline` 만 지금으로. `status` 는 active 그대로
 *      (상태를 바꾸면 규칙이 진행 중인 팬의 대회 읽기를 거절해 판이 끊긴다)
 *   ③ 문제 대회는 숨김 — `status` = hidden(다시 보이기 = active) · 대표 대회(featured) 표시도 끈다
 *   ④ 조기 마감 때 진행 중인 팬은 완주 — decideRun ①(진행 중인 판은 마감과 무관하게 이어간다)이 이미 지킨다
 *
 * 여기는 판정만 한다(순수). 읽기·쓰기는 tournamentAdminStore.ts, 부르는 곳은 manageTournament.ts.
 * 거절 코드는 화면(lib/lab/tournamentAdmin.ts)과 글자까지 같아야 한다 — 시험이 본다.
 */

export const TOURNAMENT_ADMIN_ERROR_CODES = {
  NOT_FOUND: "not_found",
  HAS_FANS: "has_fans",
  HAS_ARTICLE: "has_article",
  ALREADY_CLOSED: "already_closed",
  NOT_ACTIVE: "not_active",
  NOT_HIDDEN: "not_hidden",
} as const;

export type TournamentAdminErrorCode =
  (typeof TOURNAMENT_ADMIN_ERROR_CODES)[keyof typeof TOURNAMENT_ADMIN_ERROR_CODES];

const CODES = TOURNAMENT_ADMIN_ERROR_CODES;

/** 숨긴 대회의 상태 값 (D-86 · 새 값). 정리 스크립트의 시험 대회 숨김(`draft`)과는 다른 개념이다. */
export const HIDDEN_STATUS = "hidden";
export const ACTIVE_STATUS = "active";

export type RemovalDecision =
  | { ok: true }
  | { ok: false; code: typeof CODES.HAS_FANS | typeof CODES.HAS_ARTICLE };

/** 지워도 되는가. 참여가 먼저다 — 기사를 내려도 참여한 팬이 있으면 지울 수 없으니까. */
export function decideRemoval(input: {
  choiceCount: number;
  publishedArticleCount: number;
}): RemovalDecision {
  if (input.choiceCount > 0) return { ok: false, code: CODES.HAS_FANS };
  if (input.publishedArticleCount > 0) return { ok: false, code: CODES.HAS_ARTICLE };
  return { ok: true };
}

export type CloseEarlyPlan =
  | { ok: true; deadlineMs: number }
  | { ok: false; code: typeof CODES.ALREADY_CLOSED };

/**
 * 마감을 지금으로. 이미 지난 마감은 건드리지 않는다 — "지금"으로 바꾸면 마감이 늦춰진다.
 * 마감이 없는 옛 문서(null = 끝나지 않음)는 닫을 수 있다.
 */
export function planCloseEarly(input: { deadlineMs: number | null; nowMs: number }): CloseEarlyPlan {
  if (input.deadlineMs !== null && input.deadlineMs < input.nowMs) {
    return { ok: false, code: CODES.ALREADY_CLOSED };
  }
  return { ok: true, deadlineMs: input.nowMs };
}

export type VisibilityAction = "hide" | "unhide";

export type VisibilityPlan =
  | { ok: true; status: typeof HIDDEN_STATUS; featured: false }
  | { ok: true; status: typeof ACTIVE_STATUS }
  | { ok: false; code: typeof CODES.NOT_ACTIVE | typeof CODES.NOT_HIDDEN };

/** 공개(active) ↔ 숨김(hidden)만 오간다. 다시 보일 때 대표 대회 표시는 켜지 않는다(운영자가 다시 고른다). */
export function planVisibility(action: VisibilityAction, status: unknown): VisibilityPlan {
  if (action === "hide") {
    return status === ACTIVE_STATUS
      ? { ok: true, status: HIDDEN_STATUS, featured: false }
      : { ok: false, code: CODES.NOT_ACTIVE };
  }
  return status === HIDDEN_STATUS
    ? { ok: true, status: ACTIVE_STATUS }
    : { ok: false, code: CODES.NOT_HIDDEN };
}

/**
 * 선택을 받는 대회인가 (onVote). 없는 대회 · 숨긴 대회 · 지우는 중인 대회(`removingAt`)는 받지 않는다.
 * 지우는 중 표시는 "0건으로 세고 지우는 사이에 들어온 선택"이 주인 없이 남는 것을 막는다 — 삭제가
 * 표시를 먼저 남기면, 그 뒤 onVote 트랜잭션은 대회 문서를 다시 읽어 이 표시를 본다.
 * 마감은 여기서 보지 않는다(decideRun 이 진행 중인 판을 마감과 무관하게 이어가게 한다 — ④).
 */
export function isTournamentOpenForChoices(t: {
  exists: boolean;
  status?: unknown;
  removingAt?: unknown;
}): boolean {
  if (!t.exists) return false;
  if (t.status === HIDDEN_STATUS) return false;
  if (t.removingAt !== undefined && t.removingAt !== null) return false;
  return true;
}

/**
 * `bracket_seeds` · `tournament_runs` 문서 id(`{uid}_{tid}` · `{uid}_{tid}_r{n}`)가 이 대회의 것인가.
 * 이 두 모음에는 tournamentId 칸이 없어 id로 고른다. uid 에는 '_' 가 없으므로 첫 '_' 앞이 uid다
 * (runDocId.ts) — 그 뒤가 정확히 tid 이거나 tid + `_r{n}` 일 때만 이 대회다.
 */
export function isTournamentRunDocOf(docId: string, tournamentId: string): boolean {
  const cut = docId.indexOf("_");
  if (cut <= 0) return false;
  const rest = docId.slice(cut + 1);
  if (rest === tournamentId) return true;
  if (!rest.startsWith(`${tournamentId}_r`)) return false;
  return /^\d+$/.test(rest.slice(tournamentId.length + 2));
}
