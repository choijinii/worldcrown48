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
  const { userId, tournamentId, round, matchId, contestantId, date } = input;

  if (!userId) throw new VoteValidationError("userId", "userId가 필요합니다.");
  if (!tournamentId)
    throw new VoteValidationError("tournamentId", "tournamentId가 필요합니다.");
  if (!contestantId)
    throw new VoteValidationError("contestantId", "contestantId가 필요합니다.");
  if (!Number.isInteger(round) || round < 1 || round > 5)
    throw new VoteValidationError("round", `round는 1..5 (받음: ${round}).`);

  // matchId must be the canonical id for THIS tournament + round.
  const expectedPrefix = `${tournamentId}:r${round}:m`;
  if (!matchId.startsWith(expectedPrefix) || !/m\d+$/.test(matchId))
    throw new VoteValidationError(
      "matchId",
      `matchId가 tournament/round와 일치하지 않습니다: ${matchId}`,
    );

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new VoteValidationError("date", `date 형식 오류 (YYYY-MM-DD): ${date}`);

  return { userId, tournamentId, round, matchId, contestantId, date };
}

/** KST day (YYYY-MM-DD) — computed server-side; never trust the client. */
export function kstDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
