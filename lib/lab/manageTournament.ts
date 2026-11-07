/**
 * manageTournament 콜러블 배선 — Lab 대회 목록의 삭제 · 조기 마감 · 숨김 (ARENA-2 PR 3 · 원장 D-86).
 * 판정과 쓰기는 전부 서버가 한다. 여기서는 부르고, 거절 코드(details.code)만 꺼낸다.
 */
import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "@/lib/firebase";
import type { TournamentAdminAction } from "@/lib/lab/tournamentAdmin";

const FN = "manageTournament";

/** 대회마다 참여(게스트 포함 선택 1건 이상)가 있는지. 숫자는 받지 않는다. */
export async function fetchTournamentFanStates(
  tournamentIds: string[],
): Promise<Record<string, { hasFans: boolean }>> {
  if (tournamentIds.length === 0) return {};
  const call = httpsCallable<
    { action: "states"; tournamentIds: string[] },
    { states: Record<string, { hasFans: boolean }> }
  >(getFunctionsInstance(), FN);
  const res = await call({ action: "states", tournamentIds });
  return res.data.states ?? {};
}

export async function runTournamentAdminAction(
  action: TournamentAdminAction,
  tournamentId: string,
): Promise<void> {
  const call = httpsCallable<{ action: TournamentAdminAction; tournamentId: string }, unknown>(
    getFunctionsInstance(),
    FN,
  );
  await call({ action, tournamentId });
}

/** 서버 거절의 코드(tournamentAdmin 코드 표) — 없으면 undefined. */
export function adminErrorCode(err: unknown): unknown {
  const details = (err as { details?: { code?: unknown } } | null)?.details;
  return details?.code;
}
