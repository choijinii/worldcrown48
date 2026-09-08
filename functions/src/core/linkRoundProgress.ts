/**
 * linkRoundProgress — pure planner for the Guest Run roundProgress transfer
 * (HF-3 W4, Phase 3.3). Sibling of linkSeeds.ts: keeps the transfer decision
 * table pure so it is unit-tested without Firestore. The impure linkSessionVote
 * fetches the facts + field snapshots and executes the writes.
 *
 * HF-3.1 (2026-07-08): the decision now also carries `source` — `guest` for the
 * run just completed (refire/copy) vs `existing` for a doc that already lived
 * under the Google uid (a CONFLICT, case 2). The client uses it to land on the
 * fresh run first and to raise the "already finished" banner on the fallback.
 * `conflictTournamentIds` exposes the googleExists set so the caller can DELETE
 * (not re-parent) the guest votes on those conflicting tournaments.
 *
 * **v2.1 (2026-09-06)**: 게스트 한도가 하루 3판이 되면서 한 대회에 **여러 회차**가 생길 수
 * 있다. 판정 단위를 (대회) → (대회, 회차)로 넓혔다. 이 전제가 깨진 채로 두면 게스트가 같은
 * 대회를 2·3판째 돌고 로그인했을 때 그 판들의 진행·씨앗·카드가 이관되지 않고 사라진다.
 *
 * **충돌 판정만 대회 단위로 남는다.** Google 계정에 그 대회의 1회차 문서가 있으면 그 계정은
 * 이미 그 대회에 판이 있다는 뜻이다 — 회차는 단조 증가라 1회차 없이 2회차가 생기지 않는다.
 * 그러면 게스트 회차 전부를 버린다(케이스 2 무변경). 충돌이 아니면 게스트 r1..R이 Google
 * r1..R로 충돌 없이 1:1 착지한다.
 *
 * Per tournament the guest voted in:
 *   - Google already has a roundProgress → SKIP (Google data wins, §8 Edge #1),
 *     source=`existing`, votes DELETED (HF-3.1). The response `complete` reflects
 *     the GOOGLE doc (landing follows it, with a banner).
 *   - Guest has no roundProgress (mid round-1; re-parented votes carry the
 *     state, and advanceRound is onCreate so it won't re-fire) → SKIP.
 *   - Guest doc, incomplete → COPY (single create under the new uid).
 *   - Guest doc, complete   → REFIRE: a 2-stage create(complete=false) →
 *     update(complete=true + championId) so the onChampionConfirmed
 *     onDocumentUpdated trigger sees a false→true edge and regenerates the Crown
 *     Card under the new uid (Option A, §확인 필요 2). The two writes MUST be
 *     separate commits — a single create carrying complete=true fires only
 *     onDocumentCreated, never onDocumentUpdated.
 */
export interface RoundProgressFacts {
  tournamentId: string;
  /** 이 사실이 말하는 게스트 판의 회차 (v2.1 — 한 대회에 여럿일 수 있다). */
  runIndex: number;
  guestExists: boolean;
  guestComplete: boolean;
  googleExists: boolean;
  googleComplete: boolean;
}

export type RoundProgressAction = "skip" | "copy" | "refire";

/**
 * Provenance of the landing target (HF-3.1). `guest` = this very guest run
 * (refire/copy of the guest's own doc); `existing` = a doc that already lived
 * under the Google uid, i.e. a CONFLICT (case 2). The client lands on a `guest`
 * completion first and only falls back to an `existing` completion — with a
 * "you already finished this" banner — so a stale old card never masquerades as
 * the run the visitor just completed.
 */
export type RoundProgressSource = "guest" | "existing";

export interface RoundProgressDecision {
  tournamentId: string;
  /** 이 결정이 옮길 판의 회차 — 실행기가 문서 id를 만들 때 쓴다. */
  runIndex: number;
  action: RoundProgressAction;
  /** Resulting completion under the Google uid — drives the client landing (W6). */
  responseComplete: boolean;
  /** Where the landing card came from (HF-3.1 W2 priority + banner). */
  source: RoundProgressSource;
}

export function planRoundProgressTransfer(
  facts: RoundProgressFacts[],
): RoundProgressDecision[] {
  return facts.map((f) => {
    // Google already owns a doc for this tid → conflict (case 2). We keep the
    // existing doc (Google wins) and mark the landing `existing`.
    if (f.googleExists) {
      return { tournamentId: f.tournamentId, runIndex: f.runIndex, action: "skip", responseComplete: f.googleComplete, source: "existing" };
    }
    // Guest never wrote a roundProgress (mid round-1) → nothing to land on.
    if (!f.guestExists) {
      return { tournamentId: f.tournamentId, runIndex: f.runIndex, action: "skip", responseComplete: false, source: "existing" };
    }
    if (f.guestComplete) {
      return { tournamentId: f.tournamentId, runIndex: f.runIndex, action: "refire", responseComplete: true, source: "guest" };
    }
    return { tournamentId: f.tournamentId, runIndex: f.runIndex, action: "copy", responseComplete: false, source: "guest" };
  });
}

/**
 * HF-3.1 conflict judgement — the tids where the Google uid ALREADY has a
 * roundProgress (case 2). The guest's votes on these tournaments are DELETED,
 * not re-parented, so a single account can't double-vote and skew Vote Rate
 * (§8 Edge #1 design flaw). Pure so the impure caller reads facts ONCE (before
 * touching any votes) and branches the write phase on this list.
 */
export function conflictTournamentIds(facts: RoundProgressFacts[]): string[] {
  // v2.1: 한 대회에 회차가 여럿이라 같은 tid가 여러 번 나온다. 호출자는 이걸 Set으로 만들어
  // votes 삭제 판정에 쓰므로 중복을 여기서 없앤다 — 판정 단위는 여전히 **대회**다.
  return [...new Set(facts.filter((f) => f.googleExists).map((f) => f.tournamentId))];
}

/**
 * linkSessionVote 응답 — **대회당 한 줄.** 클라이언트는 "어느 대회의 카드로 착지할까"를
 * 고르지 회차를 고르지 않는다(W6). 완주한 회차가 하나라도 있으면 그 대회는 complete 이고,
 * `source: "guest"` 는 방금 옮겨온 판이 있다는 뜻이라 옛 카드(`existing`)를 이긴다(HF-3.1).
 */
export function transferredTournaments(
  plan: RoundProgressDecision[],
): Array<{ tournamentId: string; complete: boolean; source: RoundProgressSource }> {
  const byTid = new Map<
    string,
    { tournamentId: string; complete: boolean; source: RoundProgressSource }
  >();
  for (const d of plan) {
    const prev = byTid.get(d.tournamentId);
    if (!prev) {
      byTid.set(d.tournamentId, {
        tournamentId: d.tournamentId,
        complete: d.responseComplete,
        source: d.source,
      });
      continue;
    }
    prev.complete = prev.complete || d.responseComplete;
    if (d.source === "guest") prev.source = "guest";
  }
  return [...byTid.values()];
}
