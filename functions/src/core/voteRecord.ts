import { todayKST } from "../_run/kstReset";

/**
 * voteRecord — pure builder/validator for a Vote document (C-1).
 *
 * Server-side validation of an incoming vote before it's written. The matchId
 * MUST be the canonical `${tournamentId}:r${round}:m${index}` so it agrees with
 * the bracket (lib/arena/matches) and with advanceRound's per-round count.
 * `date` is the KST day (computed server-side, never trusted from the client).
 */
export interface VoteInput {
  userId: string;
  tournamentId: string;
  round: number;
  matchId: string;
  contestantId: string;
  date: string; // YYYY-MM-DD (KST)
  /**
   * 이 선택이 속한 판의 회차 (RUN-1). **회차의 정본은 이 필드다** — 문서 id의 `_r{n}` 은
   * 키 충돌 방지용일 뿐이고, 로직은 언제나 필드를 읽는다 (핸드오프 §5 DO 1).
   */
  runIndex: number;
}

export class VoteValidationError extends Error {
  constructor(
    public reason: string,
    message: string,
  ) {
    super(message);
    this.name = "VoteValidationError";
  }
}

export function buildVoteDoc(input: VoteInput): VoteInput {
  const { userId, tournamentId, round, matchId, contestantId, date, runIndex } = input;

  if (!userId) throw new VoteValidationError("userId", "userId가 필요합니다.");
  if (!tournamentId)
    throw new VoteValidationError("tournamentId", "tournamentId가 필요합니다.");
  if (!contestantId)
    throw new VoteValidationError("contestantId", "contestantId가 필요합니다.");
  if (!Number.isInteger(round) || round < 1 || round > 5)
    throw new VoteValidationError("round", `round는 1..5 (받음: ${round}).`);

  // 회차 상한은 일일 판 한도(5)와 같다 — 6회차 vote가 쓰이면 한도 판정이 뚫린 것이다.
  if (!Number.isInteger(runIndex) || runIndex < 1 || runIndex > 5)
    throw new VoteValidationError("runIndex", `runIndex는 1..5 (받음: ${runIndex}).`);

  // matchId must be the canonical id for THIS tournament + round.
  const expectedPrefix = `${tournamentId}:r${round}:m`;
  if (!matchId.startsWith(expectedPrefix) || !/m\d+$/.test(matchId))
    throw new VoteValidationError(
      "matchId",
      `matchId가 tournament/round와 일치하지 않습니다: ${matchId}`,
    );

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new VoteValidationError("date", `date 형식 오류 (YYYY-MM-DD): ${date}`);

  return { userId, tournamentId, round, matchId, contestantId, date, runIndex };
}

/**
 * KST day (YYYY-MM-DD) — computed server-side; never trust the client.
 *
 * RUN-1 (2026-09-05): 계산 자체는 `_run/kstReset` 의 `todayKST` 로 옮겼다. 이 값은 모든 판
 * 판정의 입력인데, 서버와 클라이언트가 각자 세면 자정 근처에 하루가 어긋난다 — §9 함정 5가
 * 경고한 P0다. 여기는 이제 이름을 유지하기 위한 얇은 위임일 뿐이고, 계산식은 한 곳에만 있다.
 * ❌ 이 함수 안에 Intl 설정을 다시 적지 말 것.
 */
export function kstDate(now: Date = new Date()): string {
  return todayKST(now);
}
