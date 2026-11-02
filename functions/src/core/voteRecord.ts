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
  /**
   * 이 선택이 익명(게스트) 계정에서 나왔는가 (v2.1 · 2026-09-06 대표 확정).
   *
   * **서버가 `sign_in_provider === "anonymous"` 로 판정해 넣는다 — 클라이언트 플래그가 아니다.**
   * 클라이언트가 보낸 값을 믿으면 "내 선택은 게스트가 아니다"라고 주장해 랭킹에 넣을 수 있다.
   *
   * PR 3의 랭킹 집계가 이 필드로 게스트의 선택을 건너뛴다. **소급 없음**(2026-09-07 확정):
   * 필드가 없는 옛 기록은 그대로 집계된다. PR 3이 아니라 PR 2에 넣는 이유는, 없으면
   * PR 2 이후 기록도 게스트인지 구분할 수 없기 때문이다(§16 실측 1).
   */
  isGuest: boolean;
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
  const { userId, tournamentId, round, matchId, contestantId, date, runIndex, isGuest } =
    input;

  if (!userId) throw new VoteValidationError("userId", "userId가 필요합니다.");
  if (!tournamentId)
    throw new VoteValidationError("tournamentId", "tournamentId가 필요합니다.");
  if (!contestantId)
    throw new VoteValidationError("contestantId", "contestantId가 필요합니다.");
  if (!Number.isInteger(round) || round < 1 || round > 5)
    throw new VoteValidationError("round", `round는 1..5 (받음: ${round}).`);

  // 회차는 평생 누적 번호라 위쪽 상한이 없다 — 참가 규칙 v2.0 은 "계정·대회·하루 5판"이고
  // 평생 상한이 아니다. 하루 한도는 decideRun 이 오늘 판 수(runsToday)로 막는다.
  // (2026-11-02 사고: 여기 `> 5` 가 있어 여러 날에 걸친 6번째 판의 첫 선택이 거절됐다.)
  if (!Number.isInteger(runIndex) || runIndex < 1)
    throw new VoteValidationError("runIndex", `runIndex는 1 이상의 정수 (받음: ${runIndex}).`);

  // 랭킹 집계(PR 3)가 읽는 필드라 값이 흐릿하면 필터가 조용히 빗나간다. 특히 문자열
  // "false" 는 truthy라 게스트가 아닌 기록을 게스트로 만든다 — 타입을 여기서 못박는다.
  if (typeof isGuest !== "boolean")
    throw new VoteValidationError(
      "isGuest",
      `isGuest는 불리언이어야 합니다 (받음: ${typeof isGuest}).`,
    );

  // matchId must be the canonical id for THIS tournament + round.
  const expectedPrefix = `${tournamentId}:r${round}:m`;
  if (!matchId.startsWith(expectedPrefix) || !/m\d+$/.test(matchId))
    throw new VoteValidationError(
      "matchId",
      `matchId가 tournament/round와 일치하지 않습니다: ${matchId}`,
    );

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new VoteValidationError("date", `date 형식 오류 (YYYY-MM-DD): ${date}`);

  return { userId, tournamentId, round, matchId, contestantId, date, runIndex, isGuest };
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
