# ADR-0002 — C-1: votes / roundProgress are write:false (server-only writes)

- **Status**: Accepted (대표 2026-06-22)
- **Context module**: C-1 Vote Engine (Domain 3 · The Arena)
- **Relates**: [ADR-0001](0001-c1-vote-engine-architecture.md), `firestore.rules`, `functions/src/{onVote,advanceRound}.ts`

## Decision

The `votes` and `roundProgress` collections are **`write: if false`** in Firestore
rules — clients may NEVER write them directly. The **only** write path is the
server: `onVote` (a Firestore transaction that enforces dedupe = one vote per
match, the daily-5 limit, and a per-uid rate limit) and `advanceRound` (an
idempotent `set({merge})` trigger), both running with the admin SDK which bypasses
rules. A direct client write would sidestep that validation and enable forged or
double votes, or a forged round-advance / Champion. Rules therefore allow Voters
to **read** only: tournaments (active-public), contestants (public), their own
`votes`, and their own `roundProgress` doc — never write. This **supersedes an
earlier imprecise instruction** that suggested permitting Voter self-writes to
`votes`/`roundProgress`; permitting them would defeat the purpose of `onVote` and
is a security downgrade with no upside (admin writes bypass rules regardless).

## Consequence

Negative tests in `tests/rules/arena-rules.test.ts` assert a Voter is denied
writing `tournaments`, `contestants`, `votes`, and `roundProgress`. The vote engine's
integrity rests entirely on the server functions, not on client-side rules.
