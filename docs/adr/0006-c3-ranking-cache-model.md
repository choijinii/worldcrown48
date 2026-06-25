# ADR-0006 — C-3 Ranking Cache + Anomaly Detection model

- **Status**: Accepted (대표 결정 2026-06-25)
- **Context module**: C-3 Ranking + Anomaly Detection (Domain 3 · The Arena)
- **Supersedes / relates**: `docs/lite-specs/C3-ranking-anomaly.md` (2026-05-14, 구버전),
  `docs/handoffs/C3-ranking-handoff.md` v2.0; relates to [ADR-0001](0001-c1-vote-engine-architecture.md)

## Context

The lite-spec assumed an RTDB live `+1` vote counter and a 16-char `hashIp` util,
plus undefined T-3/T-4 anomaly formulas. C-1 (ADR-0001) actually records votes as
Firestore documents and provisions no RTDB. C-3 must surface a Vote **Rate (%)**
ranking (never a Vote Count — CLAUDE.md 원칙 #8) and flag suspicious patterns,
re-using the B-1/C-1/C-2 logic-extraction pattern.

## Decision

**1. `scheduleRankingCache` aggregates from the `votes` collection — no RTDB.**
A v2 scheduler (`every 60 minutes`, `region: asia-northeast3`, 540s/512MiB) finds
ACTIVE Tournaments (`tournamentDeadline > now` — the per-Voter model has no global
`status` to key off, §9 trap #4), loads each Tournament's `votes` ONCE, groups by
`contestantId` in memory (one read, not a per-contestant aggregation query — trap
#2), joins contestant name/imageUrl, and writes one denormalized cache doc.

**2. Storage shape.**
- `ranking_cache/{tournamentId}` — latest doc; the UI subscribes via `onSnapshot`
  (one client read). `rankings` sorted by rate desc; ties share a rank, the next is
  skipped (5/5/3 → 1·1·3); 0-vote Contestants excluded.
- `ranking_cache/{tournamentId}/history/{generationSequence}` — last 24 generations
  retained (the T-3 24h baseline; the cron rotates + prunes).
- `admin_alerts/{alertId}` — one doc per fired anomaly (auto-id).
- `voteCount` rides INSIDE the cache (rate math / T-3 / alert detail) but is NEVER
  rendered. Rules can't field-mask, so the no-Vote-Count guard is client + E2E
  (trap #7), not the security rules.

**3. `anomalyDetail` is denormalized onto the cache (extends handoff §6.1).**
The wireframe anomaly badge shows a detail subtitle (e.g. "#1 lead margin 33.3%p
over #2"). `admin_alerts` is admin-claim-only, so the UI cannot read it; instead the
cron — which alone holds the history needed for T-3/T-4 details — writes the primary
anomaly's `detail` string onto `ranking_cache.anomalyDetail` for the UI to render.

**4. Anomaly rules T-1..T-4 (formulas fixed here).**
T-1 `#1 rate ≥ 60%`; T-2 `#1−#2 gap ≥ 30%p`; T-3 `#1 voteCount ≥ ×3 vs 24
generations ago`; T-4 `a top-2 Contestant was rank ≥ 3 one generation ago`. Missing
history (young Tournament) → T-3/T-4 silently skip (intended, trap #5). Alert dedup
(trap #8): T-1/T-2 are STATE (refresh the open unresolved alert), T-3/T-4 are EVENTS
(always a fresh alert).

**5. Testing: pure cores + dependency injection — no functions-side emulator.**
All decisions (computeRankings, anomalyRules, rankingAggregator, buildRankingUpdate)
are import-free pure modules under `lib/ranking` / `functions/src/core`, node-env
vitest'd directly (aiFillCore precedent). The shared pure logic is mirrored into
`functions/src/_ranking` by `copy-ranking.mjs` at build time (copy-crown precedent —
no duplicate implementation). The thin `scheduleRankingCache` wrapper is the only
Firestore/Timestamp surface; rules are emulator-tested in CI.

## Consequences

- C-4 Newsroom + MVP2 Fan Intelligence can consume `ranking_cache` / `admin_alerts`.
- In-memory rate limit stays per-instance (onVote 10→5); a distributed limiter is
  MVP2. Aggregation cost scales with active-Tournament × votes; sharding is MVP2
  (trap #1/#3). voteCount client-masking (callable) is deferred (MVP2 cost analysis).
