# ADR-0001 — C-1 Vote Engine: per-Voter bracket + Firestore-only round transitions

- **Status**: Accepted (대표 결정 2026-06-21)
- **Context module**: C-1 Vote Engine (Domain 3 · The Arena)
- **Supersedes / relates**: `docs/lite-specs/C1-vote-engine.md`, `docs/handoffs/C1-vote-engine-handoff.md`

## Context

C-1 runs the per-Voter binary tree (48→24→12→6→THE FINAL) over the Tournament +
48 Contestants that B-1 writes to Firestore. Two design points were undefined or
in tension with the codebase, surfaced during §0 self-verify:

1. **matchId / match generation.** The lite-spec uses `matchId` only as an opaque
   string — it defines no pairing rule, no `matchId` scheme, and no mechanism for
   carrying a Voter's round-N winners into round N+1. MENTAL_MODEL confirms each
   Voter traverses their **own** path ("Voter는 본인 경로만 통과"), but the
   mechanics were unspecified.
2. **Round-transition transport.** The lite-spec prescribes Firebase Realtime
   Database for `roundTransitions` and a live `+1` vote counter. §0 found RTDB is
   **entirely unprovisioned** (no `databaseURL`, no `database` block in
   firebase.json, no accessor) — provisioning it is a Console/ops action.

## Decision

**1. Per-Voter bracket is derived from the `votes` collection; pairing is order-based; matchId is deterministic.**
- ROUND OF 48 pairing = Contestant `order` ascending: (1,2),(3,4),…,(47,48).
- A Voter's round-N winners = the `contestantId`s on their own `votes` for round N.
  Round N+1 pairs those winners in advancement order. **The `votes` collection is
  the source of truth** — survives refresh, no in-memory bracket state.
- `matchId = ${tournamentId}:r${round}:m${index}` (0-based index within the round).
  This makes `advanceRound`'s "votes where userId+tournamentId+round == matchCount"
  count exact, and dedupes via `votedMatchIds`.

**2. Round transitions and Champion confirmation use Firestore only — no RTDB.**
- `advanceRound` (Firestore `onDocumentCreated('votes/{id}')`) writes a per-Voter
  doc, e.g. `roundProgress/{uid}_{tournamentId}`, that the client subscribes to via
  `onSnapshot`. THE FINAL writes the Champion onto the same doc (idempotent set).
- `onVote` **does not maintain a live counter.** It validates + writes the vote.
  Vote-rate (%) aggregation is C-3's `ranking_cache`; C-1 hides the rate bar when
  it's absent (graceful degrade). This keeps Vote Count entirely server-side and
  out of the client, satisfying 불변 원칙 (no absolute counts in UI).

## Consequences

- **Pro**: No RTDB ops dependency → C-1 is buildable, testable (emulator), and
  deployable now. One fewer datastore. `votes`-derived bracket is refresh-safe and
  needs no separate match documents.
- **Pro**: `onVote` is simpler (no counter transaction).
- **Con / deviation**: Departs from the lite-spec's RTDB prescription and the
  "Firestore + Realtime DB" stack note in CLAUDE.md §8. Firestore `onSnapshot`
  latency (~hundreds of ms) is acceptable for a turn-based personal flow (not a
  live shared scoreboard). If a future module needs true realtime fan-out, RTDB
  can be introduced then under a new ADR.
- **Con**: Reconstructing the bracket from `votes` requires a deterministic,
  well-tested `lib/arena/matches.ts` (the highest-risk unit — covered first by TDD).

## Notes
- Voter-read rules relaxation (tournaments active-public, contestants public) and
  rate(%) graceful-degrade were also approved (handoff §9 #2, #4) — straightforward,
  not architecturally contentious, so recorded here only for traceability.
