/**
 * Lab 대회 목록 — 삭제 · 조기 마감 · 숨김 버튼 고르기 (ARENA-2 PR 3 · 원장 D-86).
 *
 * 원칙 ②: 참여한 팬이 있으면 [삭제] 자리가 [조기 마감]으로 바뀐다. 참여는 서버(manageTournament
 * "states")가 센다 — 브라우저는 다른 팬의 선택 기록을 읽지 못한다. 참여를 아직 모르면 어느 쪽도
 * 내밀지 않는다. 마지막 판정도 서버가 다시 한다(그사이 참여가 생기면 삭제를 막는다).
 *
 * 거절 코드는 functions/src/core/tournamentAdmin.ts 와 글자까지 같다(시험이 본다).
 */
import type { MessageKey } from "@/lib/i18n/messages";

export const TOURNAMENT_ADMIN_ERROR_CODES = {
  NOT_FOUND: "not_found",
  HAS_FANS: "has_fans",
  HAS_ARTICLE: "has_article",
  ALREADY_CLOSED: "already_closed",
  NOT_ACTIVE: "not_active",
  NOT_HIDDEN: "not_hidden",
} as const;

export type TournamentAdminAction = "delete" | "closeEarly" | "hide" | "unhide";

export interface RowActionsInput {
  /** undefined = 아직 모름(불러오는 중 · 실패). */
  hasFans: boolean | undefined;
  status: string;
  deadlineMs: number | null;
  closedEarly: boolean;
  nowMs: number;
}

export interface RowActions {
  primary: "delete" | "closeEarly" | null;
  visibility: "hide" | "unhide" | null;
  /** 대표 대회(featured)로 고를 수 있나 — 숨긴 대회는 안 된다(숨김이 featured 를 끈다). */
  canFeature: boolean;
  badges: Array<"closedEarly" | "hidden">;
}

export function tournamentRowActions(r: RowActionsInput): RowActions {
  const deadlinePassed = r.deadlineMs !== null && r.deadlineMs < r.nowMs;
  const primary =
    r.hasFans === undefined ? null : r.hasFans === false ? "delete" : deadlinePassed ? null : "closeEarly";
  const visibility = r.status === "active" ? "hide" : r.status === "hidden" ? "unhide" : null;
  const badges: RowActions["badges"] = [];
  if (r.closedEarly) badges.push("closedEarly");
  if (r.status === "hidden") badges.push("hidden");
  return { primary, visibility, canFeature: r.status === "active", badges };
}

/** 서버 거절 → 승인 문구(⑦ · ⑧ · ⑮ · ⑰ · 기존 삭제 실패). */
export function adminFailureMessageKey(action: TournamentAdminAction, code: unknown): MessageKey {
  if (action === "delete") {
    if (code === TOURNAMENT_ADMIN_ERROR_CODES.HAS_FANS) return "lab.list.toast.deleteHasFans";
    if (code === TOURNAMENT_ADMIN_ERROR_CODES.HAS_ARTICLE) return "lab.list.toast.deleteHasArticle";
    return "lab.list.toast.deleteFail";
  }
  if (action === "closeEarly") return "lab.list.toast.closeEarlyFail";
  return "lab.list.toast.hideFail";
}
