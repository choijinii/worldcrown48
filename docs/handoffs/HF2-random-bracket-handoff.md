# HF-2 — 랜덤 대진(Random Bracket) 핫픽스 (Handoff v2.1)

| 항목 | 값 |
|---|---|
| 모듈 ID | `hf2-random-bracket` |
| 브랜치 | `feat/hf2-random-bracket` |
| 워크트리 | `~/Projects/wc48-hf2` (또는 HF-1 세션 이어서 — 단 **별도 브랜치·별도 PR**) |
| 기준 HEAD | `origin/main` 최신 (**HF-1 머지 이후 권장** — 같은 투표 흐름을 건드림) |
| 핸드오프 버전 | **v2.1** |
| 우선순위 | **P0 — HF-1과 같은 타이밍에 처리 (대표 지시 2026-07-05)** |

---

## §0 자가 검증 / §0.5 Stack Truth

HF-1 핸드오프와 동일 (npm · vitest node · 컴포넌트 렌더 테스트 금지 · E2E spec 경로 명시).

## §1 Pre-flight
- 필독: `docs/adr/0001-c1-vote-engine-architecture.md` · `lib/arena/matches.ts` · `lib/arena/roundProgress.ts` · `functions/src/linkSessionVote.ts`
- 메모리: [[feedback-test-isolation-per-voter]] [[project-hf1-daily-quota-2026-07-05]]

## §2 Module Identity & Goals

**문제 (대표 2026-07-05):** 매치가 Lab 등록 순서(`order` 오름차순)대로 페어링됨 — `matches.ts` 57~59행 `round1OrderedIds` + 89~116행 인접 페어. 라운드 N은 "인접 매치 승자끼리" 고정. → **모든 Voter가 같은 대진을 보고**, 등록 순서가 대진을 결정.

**목표:** 48강·24강·12강·6강·THE FINAL(3명 표시 순서 포함) **전 라운드 랜덤 페어링**, 단 다음 3가지 불변:
1. **새로고침 안전** — 같은 Voter가 다시 열어도 같은 대진 (ADR-0001 순수 함수 원칙 유지: 시드를 입력에 추가)
2. **Voter별 상이** — Voter마다 다른 대진 (개인 트리 모델과 부합)
3. **로그인 연결 생존** — 비로그인 1표 후 로그인(linkSessionVote) 시 대진이 재셔플되지 않을 것

## §3 Scope (Work Items)

| # | 파일 | 작업 |
|---|---|---|
| 1 | `lib/arena/matches.ts` | `seededShuffle(ids, seed)` (mulberry32 등 결정적 PRNG) 추가. `round1OrderedIds` → order 정렬 후 `seed`로 셔플. `contestantIdsForRound` 라운드 N 승자 목록을 `seed ^ round`로 셔플. THE FINAL 3명 표시 순서도 셔플. 모든 함수 시그니처에 `seed: number` 추가 — **여전히 순수 함수** |
| 2 | `bracket_seeds` 컬렉션 (신규) | doc ID `${uid}_${tournamentId}`, `{ seed: number, createdAt }`. Arena 진입 시 없으면 1회 생성. `firestore.rules`: 본인 read + **create-once**(update·delete 금지 — 시드 불변) |
| 3 | `functions/src/linkSessionVote.ts` | votes 재부모화에 **시드 doc 이전 추가** (anon uid → 새 uid로 복사). ⚠️ 이거 빠지면 로그인 순간 대진 재셔플 → 이미 m0에서 이긴 Contestant가 뒤 매치에 중복 등장 → 승자 중복으로 라운드 전환 파괴. **§8 Edge #1** |
| 4 | Arena 진입 컴포넌트 | 시드 로드→없으면 생성→matches 함수에 전달 |
| 5 | `docs/adr/0007-hf2-seeded-random-bracket.md` (신규) | ADR-0001 개정: "순수 함수 of (contestants, votes)" → "(contestants, votes, **bracketSeed**)" |
| 6 | `docs/lite-specs/C1-vote-engine.md` + ADR-0001 각주 | order 페어링 서술 정정 |
| 7 | 테스트 | `lib/__tests__/arena/matches.test.ts` 재작성: 같은 시드=같은 대진(결정성)·다른 시드=다른 대진·라운드 참가자 중복 0·THE FINAL 3명 보존. E2E: 대진 순서를 가정한 spec은 시드 doc을 읽어 기대값 계산하거나 테스트가 시드를 선주입 |

## §4 ADR-0007 요점

- PRNG: mulberry32(공개 구현, 의존성 0, ~10줄) — `Math.random()` 금지(비결정적)
- 시드 값: 생성 시 `crypto.getRandomValues` 1회 → 이후 불변
- 라운드별 파생: `roundSeed = seed ^ (round * 0x9E3779B9)` 같은 단순 파생 — 라운드마다 다른 셔플, 여전히 결정적
- 마이그레이션: 기존 진행 중 Voter는 시드 doc 없음 → 첫 진입 시 생성되며 남은 라운드부터 랜덤 적용. 이미 기록된 votes는 matchId 기준이라 불변 (허용 오차 — 시드 도입 전 완주자는 order 대진이었을 뿐)

## §6 Acceptance Criteria

1. 두 Voter가 같은 Tournament에서 서로 다른 48강 대진을 본다
2. 새로고침·재로그인 후에도 같은 Voter는 같은 대진 (E2E로 검증)
3. 비로그인 1표 → 로그인 연결 후에도 대진 유지 + 라운드 참가자 중복 0
4. 모든 라운드(1~4) 페어링과 THE FINAL 표시 순서가 시드 기반 셔플
5. 278+84 기존 테스트 green 유지 · 라운드 전환(advanceRound) 회귀 없음
6. 배포 완료 (rules + linkSessionVote 함수 + Vercel — 머지 ≠ 배포)

## §8 Edge Cases

1. **linkSessionVote 시드 미이전** (§3-#3) — 최우선 함정. 시드 이전 단위테스트 필수
2. 시드 doc 생성 race (두 탭 동시 진입) — create-once rules로 한쪽 실패 → 재읽기 fallback
3. 기존 E2E가 "1번 vs 2번 Contestant" 같은 order 가정 시 전부 시드 기반 기대값으로 교체 ([[feedback-test-isolation-per-voter]] RESET에 bracket_seeds 추가)

## §9 Out of Scope
- 운영자가 대진을 수동 지정하는 기능 (요청 없음)
- HF-1 쿼터 로직 (별도 PR)

## §12 Push 확인 · §13 Branch Alias URL
템플릿 v2.1 그대로. `https://worldcrown48-git-feat-hf2-random-bracket-choijiniis-projects.vercel.app`

---
*작성: Cowork DP-1 세션 2026-07-05 · 근거: lib/arena/matches.ts:9-11,57-59,107-115 · ADR-0001 순수 함수 원칙 · 대표 지시 "전 라운드 랜덤"*
