# ADR-0003 — C-1 CI "Firestore flakiness" was two deterministic test bugs, not transport

- **Status**: Accepted (대표 결정 2026-06-23)
- **Context module**: C-1 Vote Engine (Domain 3 · The Arena) — CI E2E (`c1-e2e`)
- **Supersedes / relates**: `docs/handoffs/C1-followup-ci-flakiness-handoff.md`
- **Numbering note**: the handoff named this "ADR 0002", but `0002-c1-client-write-deny.md`
  already exists. This is ADR-**0003**.

## Context

The C-1 PR's `c1-e2e` workflow failed two scenarios consistently
(`c1-anon-gate` daily-limit modal; `c1-arena-flow` FINAL `championId`), alongside
recurring console noise:

```
WebChannelConnection RPC 'Listen' stream transport errored
Could not reach Cloud Firestore backend [code=unavailable]
```

The working hypothesis (memory + handoff §3) was a **headless-Chromium WebChannel
transport** problem, to be fixed in `lib/firebase.ts` (already carrying
`experimentalForceLongPolling: true`). The handoff explicitly required confirming
the cause from CI evidence **before** editing code, and warned the memory
hypothesis was already partly wrong.

## Decision

**`lib/firebase.ts` is left unchanged.** The transport hypothesis was **refuted by
evidence**; both failures were deterministic test bugs and were fixed in the two
E2E specs:

1. `e2e/c1-anon-gate.spec.ts` — navigate to `/arena/${TID}?lang=ko` so the modal
   renders the Korean copy the test asserts.
2. `e2e/c1-arena-flow.spec.ts` — seed bracket-setup votes with a **confirmed past
   date** (`SEED_PAST_DATE = "2020-01-01"`) instead of the hardcoded authoring day.

### 1. Decisive evidence (the reason this overturned the hypothesis)

- **DOM snapshot — the gate actually worked.** The `c1-anon-gate` failure
  `error-context.md` captured the page at the moment of the "missing modal"
  timeout. The modal **was present**:

  ```yaml
  - dialog "You've used today's votes (5/5)":
    - heading "You've used today's votes (5/5)" [level=2]
    - paragraph: Your daily 5 reset at Seoul midnight.
  ```

  Votes counted to 5, the gate fired, `getTodayVoteCount` read the server
  correctly → `experimentalForceLongPolling` **is working**. The test asserted the
  **Korean** string `/오늘의 투표를 모두 사용했어요/`; the app default lang is **EN**
  (`lib/i18n.tsx` step 4 "global-first") and CI Chromium reports
  `navigator.language=en-US`, so it rendered the **English** copy → assertion never
  matched → 5 s timeout.

- **Timestamp ↔ seed-date match — the FINAL collision.** `c1-arena-flow` FINAL
  seeds 45 votes hardcoded `date: "2026-06-22"`. Every failing run executed on
  **`2026-06-22…Z`** (e.g. run `27960557964` at `2026-06-22T14:34Z` = `2026-06-22`
  in KST). The daily limit is 5 / Tournament / KST-day, and the gate query matches
  `date == getTodayKST()`; so on that day the 45 seeded votes counted as **today**
  → the UI final pick was gated (`daily_limit`) → `onVote` never fired →
  `championId` never written → 30 s poll timeout. Independent confirmation: on any
  other day the seeded date is in the past and the test passes with no code change.

- **The console errors are benign.** `Could not reach Cloud Firestore backend` is a
  transient retry that recovers (the subsequent server read succeeded — see the
  5/5 modal). Both specs already filter exactly this string; it is **not** a
  failure cause.

### 2. Two test-authoring traps (mandatory for future E2E)

- **(a) i18n-dependent assertions must force the language.** Never assert
  localized copy without pinning the locale. The app resolves language as
  `?lang=ko|en` → `navigator.language` → **default `en`**. CI Chromium is `en-US`,
  so any Korean-copy assertion fails unless the URL carries `?lang=ko` (or the test
  asserts a locale-agnostic anchor — e.g. the `5/5` count or `role="dialog"`).

- **(b) Seeded "setup" votes must use a confirmed PAST date — never "today".**
  Bracket progress is votes-derived, so seeding votes is how we set up progress.
  But the daily-5 limit counts votes where `date == getTodayKST()`. A hardcoded
  authoring-day date silently passes until CI happens to run on that date, then
  gates the UI vote under test. Use a fixed past constant (`"2020-01-01"`), not
  `new Date()`-relative (which can itself collide near KST midnight).

### 3. Checklist for future-module E2E authors (C-2, C-3, D-1, …)

When a `*-e2e` spec exercises The Arena / vote flow, verify before merge:

```
☐ Localized-copy assertion? → navigate with ?lang=ko (or assert locale-agnostically).
☐ Seeded setup votes? → date = SEED_PAST_DATE ("2020-01-01"), never today / authoring day.
☐ The vote under test must be allowed: the seeded daily count for today must be < 5.
☐ Console-error gate keeps filtering "Could not reach Cloud Firestore backend"
   (transient, recovers — not a failure). Do NOT widen the filter to hide real errors.
☐ Read the failure's error-context.md DOM snapshot BEFORE blaming transport —
   the modal/element is often present and the assertion (locale/text) is what's wrong.
☐ Cross-check the run timestamp (KST) against any hardcoded date in the spec.
☐ advanceRound is an async Eventarc trigger — poll championId with a generous
   timeout (we use 30 s); a timeout means the upstream vote never fired, not slowness.
☐ The FIRST assertion after a cold page load (auth → Firestore reads → render)
   can edge past the default 5s expect timeout on a cold serverless preview. Gate
   on a render anchor (e.g. getByTestId("vote-left")) with a generous timeout —
   condition-based, never an arbitrary sleep. (Surfaced as a mobile-320px retry
   flake on this very PR.)
```

## Consequences

- No production code change; `lib/firebase.ts` `experimentalForceLongPolling`
  stays (confirmed effective). Minimal-diff, E2E-only fix.
- Future modules stop chasing a phantom WebChannel transport bug.
- Latent product note (out of scope here): a real Voter cannot finish a 46-vote
  Tournament in one KST day under the 5/day limit. That is a product question,
  intentionally **not** addressed by this PR.
