# ADR-0004 — C-1 mobile wireframe E2E flake was test-state pollution (Voter not reset)

- **Status**: Accepted (대표 결정 2026-06-23)
- **Context module**: C-1 Vote Engine (Domain 3 · The Arena) — CI E2E (`c1-e2e`)
- **Relates**: `docs/adr/0003-c1-ci-e2e-flakiness-was-test-bugs.md` (this is the
  "Known residual / separate follow-up" it logged)

## Context

After ADR-0003 fixed the two real C-1 E2E bugs, one residual flake remained:
`c1-arena-flow.spec.ts` `mobile {320|375|414}px renders the match` intermittently
failed the first attempt (`getByText("No Vote Rate %")` 5 s timeout) and passed on
retry. ADR-0003 deliberately left the mechanism **unconfirmed** (retries masked it;
trace artifacts only upload on full failure).

## Decision

**Confirmed by evidence, then fixed by test isolation** — `lib/firebase.ts` and app
code unchanged.

### Evidence (diagnostic run with `retries:0` + `trace:on`, run 28012382680)

- Same run, identical Firestore state: **mobile-320 failed, 375 & 414 passed.**
  → not data-content, not viewport, not transport.
- mobile-320 failure `error-context.md` DOM: `status: 👑 Champion 확정 · P1` — the
  page rendered the **champion screen** (completed bracket), which has no `MatchView`
  and therefore no `.vs-foot` "No Vote Rate %".
- Passing 375/414 traces rendered the match **P1 vs P2 = m0** (a *fresh* bracket →
  the vote read returned **0 votes**).

### Mechanism

The three mobile tests run **after** the FINAL test, against the **same Voter
(`C1_TEST_UID`) and tournament (`c1-e2e-tournament`)**. The FINAL test leaves that
Voter with a **completed** bracket (45 seeded + 1 final pick = 46 votes +
`roundProgress.championId`). The mobile tests called `seedRound1Votes(0)`, which
clears nothing. On a fresh load the page's completion check
(`selectIsComplete(votes) || progress?.complete`) races the cold Firestore read:

- read returns the full 46 (or `roundProgress` arrives) → **champion screen** → fail;
- cold read returns 0 from an empty local cache → bracket fresh → renders **m0** →
  "No Vote Rate %" visible → pass.

That race — not viewport, not slowness — is the flake. A **test-isolation** bug:
the wireframe tests depended on Voter state polluted by the prior FINAL test.

### Fix

Add `resetVoterProgress()` (delete the Voter's `votes` + `roundProgress` for the
tournament) and call it at the start of each mobile test instead of the no-op
`seedRound1Votes(0)`. The bracket is then deterministically fresh (m0) → `MatchView`
always renders → assertion is stable. Minimal diff; no production code touched. The
diagnostic `retries:0`/`trace:on` was reverted to baseline (`retries:2`,
`trace:on-first-retry`).

## Consequences

- The mobile wireframe tests are deterministic; `c1-e2e` passes with **no retry**.
- Reinforces the ADR-0003 checklist: **an E2E that depends on per-Voter bracket state
  must reset that Voter's `votes` + `roundProgress` first** — never assume a prior
  test in the same file left a fresh bracket. (Added to the ADR-0003 checklist.)
- Earlier speculative timeout bump (ADR-0003) correctly rejected: it could never have
  worked — the element was absent (champion screen), not late.
