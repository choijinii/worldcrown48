# ADR-0007 — HF-2: Seeded random bracket (per-Voter, per-Tournament)

- **Status**: Accepted (대표 지시 2026-07-05 "전 라운드 랜덤")
- **Context module**: HF-2 Random Bracket hotfix (Domain 3 · The Arena)
- **Amends**: ADR-0001 (C-1 Vote Engine) — the pure-function signature
- **Relates**: `lib/arena/matches.ts`, `bracket_seeds` collection, `functions/src/linkSessionVote.ts`

## Context

ADR-0001 made the per-Voter bracket a pure function of **(contestants, votes)**
with **order-based** pairing: ROUND OF 48 = Contestant `order` ascending
(1,2),(3,4),…,(47,48), and round N≥2 paired adjacent winners. That is
deterministic and refresh-safe, but it has a defect the 대표 flagged
(2026-07-05): **every Voter sees the identical bracket**, and the Lab
registration `order` alone decides who meets whom. WC48 is an ideal-type
worldcup — each Voter should traverse their **own** randomised tree.

Naively randomising with `Math.random()` breaks ADR-0001's core invariant
(refresh-safety): a re-render or reload would reshuffle the bracket mid-run,
duplicating winners and destroying round transitions.

## Decision

**1. Add a per-Voter, per-Tournament seed as a THIRD pure input.**
The bracket becomes a pure function of **(contestants, votes, bracketSeed)**.
Same seed → identical bracket (refresh-safe); different seed → different bracket
(Voter-specific). The bracket depends only on the seed **value**, never the uid.

- PRNG: **mulberry32** (public-domain, dependency-free, ~10 lines). `Math.random()`
  is forbidden (non-deterministic). Shuffle: Fisher–Yates driven by mulberry32.
- ROUND OF 48 = `order`-sorted (canonical) **then** `seededShuffle(seed⊕round1)`.
- Round N≥2 participants = the Voter's round-(N-1) winners, `seededShuffle`d with a
  per-round derived seed `roundSeed = seed ⊕ (round · 0x9E3779B9)` — so who-meets-
  whom is random each round yet deterministic for a given (seed, round).
- THE FINAL (round 5): the 3-up display order is seed-shuffled too.

**2. Store the seed in a new `bracket_seeds` collection.**
- doc id = `${uid}_${tournamentId}`, shape `{ seed: number, createdAt }`.
- The seed is minted once on first Arena entry (`crypto.getRandomValues`) and is
  then **immutable**.
- `firestore.rules`: owner **read via the DOC-ID prefix** (`seedId.split('_')[0]
  == request.auth.uid`), **create-once**, and `update`/`delete` denied. The
  doc-id-prefix read — never `resource.data` — is mandatory: the client
  get/listens the seed doc on Arena entry **before it exists**, and a
  `resource.data` owner check would permission-deny that read on the not-yet-
  existing doc and kill the listener (the HF-1.6 / PR #37 P0 trap). Same posture
  as `roundProgress`, `crown_cards`, `daily_participation`.

**3. Carry the seed across guest→login (`linkSessionVote`) — §8 Edge #1.**
When a guest signs in, their votes are re-parented from the anon uid to the new
uid; the seed doc must move too. Because the bracket depends only on the seed
value, copying `bracket_seeds/${anonUid}_${tid}` → `${newUid}_${tid}` (create-
once) reproduces the identical bracket. **Miss this** and the new uid mints a
fresh seed → the bracket reshuffles → a Contestant already recorded as a winner
reappears in a later match → duplicate winners → round transition breaks.

## Consequences

- **Pro**: Every Voter gets a distinct, fair, unpredictable bracket while every
  ADR-0001 guarantee holds — the bracket is still a pure function, still derived
  from `votes` (+ the immutable seed), still refresh-safe, still needs no match
  documents. No new datastore, no new dependency, no RTDB.
- **Pro**: The `advanceRound` count-based transition is untouched (it never cared
  about pairing), so there is no round-transition regression.
- **Migration**: A Voter mid-run when HF-2 ships has no seed doc → one is minted
  on next entry and the remaining rounds become random. Already-recorded votes
  are keyed by `matchId` and stay valid (a pre-HF-2 finisher simply had the
  order bracket — accepted tolerance).
- **Con**: One extra Firestore read (+ at most one create) per Arena entry; and
  `linkSessionVote` does up-to-one extra read/write per tournament the guest
  played. Negligible (a guest realistically played one tournament).

## Notes
- Determinism is unit-tested in `lib/__tests__/arena/matches.test.ts` (same seed →
  identical bracket, different seed → different, no duplicate participants, THE
  FINAL 3 preserved). The seed-transfer trap is unit-tested in
  `functions/src/__tests__/linkSeeds.test.ts` (§8 Edge #1). Rules — including
  the doc-absent owner read — in `tests/rules/arena-rules.test.ts`.
