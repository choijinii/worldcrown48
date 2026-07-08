# HF-3 — Guest Run (게스트 1회 완주) 정책 구현 핸드오프 **v1.1 (2026-07-08 대표 결정 3건 반영)**

> 템플릿: `docs/templates/handoff-v2.1.md` | 작성: Cowork 2026-07-08
> ⚠️ 이 파일은 staging(`outputs/handoffs-staging/`)에 있음 — kickoff 시 워크트리의 `docs/handoffs/`로 cp ([[feedback-stale-deploy-recurrence-guard]] 규칙 3)

| 항목 | 값 |
|---|---|
| 모듈 ID | `hf3-guest-run` |
| 브랜치 | `feat/hf3-guest-run` |
| 워크트리 | `~/Projects/wc48-hf3` |
| 기준 HEAD | `b3263c3` (chore(deploy-guard), PR #39) |
| Base 브랜치 | `main` |
| 핸드오프 버전 | **v2.1 템플릿 준수** |
| 우선순위 | **P0** — A안(맛보기 모델) 스펙 오염 정정. UX-8 근본 해결 |

---

## ⭐ 확정 결정 3건 (2026-07-08 대표)

| # | 결정 | 내용 |
|---|---|---|
| 1 | **게스트 대회 = 1개, "참가하면 완주가 룰"** | 대표 원문: "동시에 참가하는 개념은 없어 (1개의 토너먼트에 참가하면 완주하는 것이 룰)." 게스트의 여정 = 대회 1개 진입 → 완주. 다른 대회 진입 시도 → LoginModal |
| 2 | **Daily Participation 병합한다** | "게스트 완주 → 로그인" 한도 세탁 방지. 병합으로 6개째가 되어도 이미 참가한 대회는 무제한 원칙이라 투표 계속 가능 (§8 Edge 5) |
| 3 | **Crown Card 이전 = Option A (재생성)** | roundProgress 2단계 쓰기로 onChampionConfirmed 트리거를 새 uid에 재발화 → 카드 자동 재생성. Option B(문서 복사)는 §확인 필요 2가 불가로 판명될 때만 대체안 (Auto-STOP 특칙 9) |

---

## §0 자가 검증 (Self-Check Before Start)

```bash
pwd                       # → ~/Projects/wc48-hf3 (메인 repo 아님)
git branch --show-current # → feat/hf3-guest-run
git log --oneline -1      # → b3263c3 (핸드오프 commit이 위에 있으면 HEAD~1 확인)
```

**자가 검증 통과 ≠ 작업 권한.** "통과, 작업 시작합니다" 통보 후 진행.

---

## §0.5 Stack Truth (2026-07-08 repo에서 재확인 완료)

| 영역 | 진실 | 함정 |
|---|---|---|
| 패키지 매니저 | **npm** (`package-lock.json` 확인) | ❌ pnpm 아님 |
| 단위 테스트 | vitest `environment: "node"`, `include: ["lib/__tests__/**/*.test.ts"]` (확인) | ❌ jsdom·@testing-library 없음 → 컴포넌트 렌더 테스트 금지 |
| functions 테스트 | `functions/src/__tests__/` — 순수 로직 분리 패턴 (`core/linkSeeds.ts` 전례) | 트리거/callable 본체는 E2E·에뮬레이터로 |
| 테스트 관례 | 로직을 `lib/` 또는 `functions/src/core/`로 추출 → 순수 단위테스트 + UI는 Playwright E2E | ❌ `*.test.tsx` 금지 |
| 스타일 | CSS 변수 + CSS Modules + inline | ❌ Tailwind·shadcn 없음 |
| i18n | 수제 Context (`lib/i18n.tsx`), `?lang=` 쿼리 | ❌ next-intl 없음 |
| 시드 | E2E spec 내부 firebase-admin + `functions/scripts/seed-preview.mjs` | |

---

## §1 Pre-flight Checklist

- 필독 메모리: [[project-hf2-shipped-guest-policy-2026-07-06]] [[project-d1-locker-room-2026-06-14]] [[feedback-evidence-before-diagnosis]] [[feedback-firestore-composite-index]] [[feedback-test-isolation-per-voter]] [[feedback-i18n-test-determinism]]
- 필독 문서: `CLAUDE.md` · `LANGUAGE.md` · `docs/mental-model/MENTAL_MODEL.svg` · `outputs/dp1-findings/UX_DEFECTS_2026-07-06.md` §UX-8

---

## §2 Module Identity & Goals

### 배경 — 스펙 오염 정정 (대표 재정의 확정 2026-07-07)

**A안(맛보기 모델)의 올바른 정의 = "비로그인 토너먼트 1회 완주 허용".**
문서(v4_9 원칙 ③ "2번째 Match부터 로그인 모달", D1 lite-spec "세션 1회 투표")에 "매치 1클릭"으로 잘못 옮겨졌고 코드도 그 문서대로 구현됨. HF-1 "Tournament당 하루 5표"와 같은 부류의 스펙 오염이며, 원인은 "1표"라는 용어의 모호함.

### 현재 코드의 실상 (UX-8 근본 원인 — 코드로 확정, 재조사 불필요)

1. 사이트가 방문자에게 `signInAnonymously`로 익명 계정을 만들어 줌 (`lib/firebase.ts:173`)
2. `authStore.setUser`가 익명 user도 그대로 저장 → `voteGate`의 `!user` 게스트 분기 **절대 발동 안 함** → 익명 uid가 회원 분기(참가 대회 내 무제한)를 탐
3. 연쇄: `sessionVoteUsed` 플래그가 안 찍힘 → `PENDING_ANON_UID_KEY` 미설정 (`authStore.ts:78-84`의 `get().sessionVoteUsed` 조건) → 로그인 시 `linkSessionVote` **미호출** → "로그인 후 빈 대진 재시작"
4. `linkSessionVote`는 votes + bracket_seeds만 이전. **roundProgress 이전 없음** (2026-07-08 코드 재확인: `functions/src/linkSessionVote.ts` — votes 재부모화 L90-106, 시드 이전 L108-135가 전부). crown_cards 이전도 없음
5. `onVote`(서버)에 익명 uid 제한 없음 (grep 확인: isAnonymous/sign_in_provider 참조 0건) — 게스트 제한이 클라이언트에만 존재

### Goal

> **비로그인 Voter는 토너먼트 1개를 1회 완주할 수 있고, 완주 후(또는 두 번째 대회 진입 시) 로그인하면 완주 상태 전체(votes + bracket_seeds + roundProgress + Crown Card)가 새 uid로 이전되어 공유 가능한 Crown Card 페이지에 착지한다.**

### 알려진 한계 (수용 — 대표 보고 완료 사항)

시크릿 창·새 브라우저 = 새 익명 uid → **완전 차단은 구조적으로 불가.** rate limit(20/min, HF-1.5) + C-3 이상탐지가 보조 방어. 이 모듈은 "정상 사용자의 여정을 스펙대로"가 목표이지 어뷰저 봉쇄가 아님.

---

## §3 Scope (Work Items)

| # | 항목 | 파일 | 내용 |
|---|---|---|---|
| W1 | 게이트 로직 재작성 | `lib/voteGate.ts` `lib/__tests__/voteGate.test.ts` | `!user` → `user.isAnonymous` 기준 게스트 분기. 게스트 허용 조건: (a) 첫 대회이거나 진행 중인 그 대회 && (b) 완주 이력 없음. 위반 → `login_required` |
| W2 | 게스트 상태 조회 | `lib/voteGate.ts` (또는 신규 `lib/guestRun.ts`) | 익명 uid의 참가 대회·완주 여부 판정. 진실 후보: `bracket_seeds` docId prefix 쿼리 또는 `roundProgress` — **§확인 필요 1** 참조. rules가 해당 읽기를 허용하는지 검증 의무 |
| W3 | 서버 방어 (defense-in-depth) | `functions/src/onVote.ts` + core 분리 | `sign_in_provider === 'anonymous'`인 요청: 이미 완주한 roundProgress가 있거나, 참가 대회 ≠ 현재 대회면 `permission-denied`. 순수 판정 함수 분리 + 단위 테스트 |
| W4 | linkSessionVote 확장 | `functions/src/linkSessionVote.ts` `core/linkSeeds.ts` 패턴 | roundProgress 이전 + Crown Card 재생성(Option A) + daily_participation 병합(확인 포인트 2). 응답 확장: `{ ok, linked, tournaments: [{ tournamentId, complete }] }` |
| W5 | 클라이언트 트리거 교체 | `lib/authStore.ts` `components/auth/AuthProvider.tsx` | `PENDING_ANON_UID_KEY` 설정 조건을 `sessionVoteUsed`에서 **`currentUser.isAnonymous`만으로** 변경 (votes 0건이면 서버가 no-op, linked 0 — 안전). `sessionVoteUsed`/`markSessionVoteUsed`는 제거 또는 deprecated 주석 |
| W6 | 완주 착지 | `components/auth/AuthProvider.tsx` (또는 상위) | linkSessionVote 응답에 `complete: true` 대회가 있으면 `/arena/{tid}/champion`으로 이동. 미완주 이전이면 현재 화면 유지 |
| W7 | LoginModal 카피 감사 | `components/auth/LoginModal.tsx` `lib/i18n` 사전 | `reason: 'vote'` 카피가 "1표" 전제면 "완주 후 계속하려면 로그인" 취지로 ko/en 수정 (ux-copy 관례) |
| W8 | 문서 4곳 동기화 | `LANGUAGE.md` `docs/planning/WorldCrown48_v4_9.md` `docs/lite-specs/D1-locker-room.md` `docs/handoffs/D1-locker-room-handoff.md` | §부록 A 참조. LANGUAGE.md 신규 용어 등록이 선행 |

### §확인 필요 (착수 시 코드로 검증 — 추정 금지)

1. **게스트 참가 대회 목록의 진실:** 클라이언트에서 `bracket_seeds` docId prefix 쿼리(`documentId() >= '{uid}_' && < '{uid}_'`)가 현 rules에서 허용되는지. 불허 시 대안(참가 시 로컬 마커 + 서버 판정 이중화 등)을 ADR로 기록
2. **`shouldGenerateCrownCard`의 edge 판정:** Option A의 2단계 쓰기(complete=false로 create → complete=true+championId로 update)가 false→true edge로 인식되는지 `core/onChampionConfirmedCore.ts` 테스트로 먼저 증명 (RED→GREEN)
3. **roundProgress 스키마 전체 필드:** 이전 시 복사 누락 필드가 없는지 (`userId`·`tournamentId`·`complete`·`championId` 외 라운드 상태 필드) — C-1 코드 기준으로 확인
4. **linkSessionVote 5초 타임아웃**(`AuthProvider.tsx:33`): 이전 대상이 늘어나므로 46 votes + roundProgress + 카드 재생성 트리거 대기 없이도 응답이 5초 내인지. 초과 위험 시 타임아웃 상향 + 카드 생성은 비동기(착지 페이지의 기존 "준비 중" 상태가 흡수)

---

## §4 ADR

- **ADR-0008 (신규 작성):** Guest Run 정책 — "1표"→"1회 완주" 재정의 경위(스펙 오염), 게이트 기준을 `isAnonymous`로 전환한 이유, 시크릿 우회 한계 수용, 이전 메커니즘(Option A/B 중 확정안). `docs/adr/0008-hf3-guest-run.md`

---

## §5 Implementation Plan (§11 TDD와 1:1)

### Phase 1 — 게이트 로직 (W1·W2)
`decideVoteGate` 시그니처 확장: `{ user, isAnonymous, guestTournamentId: string|null, guestCompleted: boolean, participatedThisTournament, participationCount }`.
분기: 익명 && 완주 이력 → `login_required`. 익명 && 다른 대회 → `login_required`. 익명 && (첫 대회 || 같은 대회) → `allowed`. 비익명은 기존 HF-1 로직 유지.

### Phase 2 — 서버 방어 (W3)
`functions/src/core/guestVoteGuard.ts` (순수) + onVote 통합. 익명 판정: `req.auth.token.firebase.sign_in_provider === 'anonymous'`.

### Phase 3 — 이전 확장 (W4, Option A 기준)
1. votes 재부모화 (기존 유지)
2. bracket_seeds 이전 (기존 유지)
3. **roundProgress 이전:** 대상 tid마다 `roundProgress/{googleUid}_{tid}`가 **이미 존재하면 skip (기존 구글 데이터 우선 — §8 Edge 1)**. 부재 시: 미완주 진행분은 단순 copy(create, userId 갱신). 완주분은 2단계 쓰기로 트리거 재발화 → 새 uid Crown Card 자동 생성
4. daily_participation 병합 (대표 확정): 게스트 uid의 오늘(KST) doc의 tournamentIds를 구글 uid 오늘 doc에 arrayUnion
5. 익명 계정 삭제 (기존 유지 — 단, 이전 skip된 대회가 있어도 삭제. 게스트 데이터 폐기 확정)
6. 응답 확장 + 클라이언트 착지 (W5·W6)

### Phase 4 — 클라이언트 + 카피 (W5·W6·W7) + E2E
E2E 시나리오 (Playwright, spec 경로 명시 [[feedback-workflow-spec-scope]], `?lang=` 강제, Voter 격리 RESET [[feedback-test-isolation-per-voter]]):
- E2E-1: 게스트 완주 → 로그인 → `/arena/{tid}/champion` 착지 + 카드 표시
- E2E-2: 게스트 완주 후 재투표 시도 → LoginModal
- E2E-3: 게스트가 두 번째 대회 투표 시도 → LoginModal
- E2E-4: 미완주 중간 로그인 → 대진 유지·이어서 진행 (HF-2 검증 3 계승)

### Phase 5 — 문서 동기화 (W8, §부록 A)

### Phase D′ — Dev Visual Aid (§11.5, 강제)
시드 주입 → 시크릿 창에서 게스트 완주 → 로그인 → 착지 확인 → 한/영 토글로 LoginModal 카피 확인 → cleanup.

---

## §6 Acceptance Criteria

1. 비로그인 첫 방문: 대회 1개에서 완주까지 투표 전 과정 허용 (46 votes)
2. 완주 후 게스트가 아무 대회에서든 투표 시도 → LoginModal (`reason: 'vote'`)
3. 게스트가 진행 중 대회 외 두 번째 대회 투표 시도 → LoginModal
4. 완주 → 로그인: votes·bracket_seeds·roundProgress 새 uid 이전 + Crown Card 새 uid 명의 생성 + `/arena/{tid}/champion` 착지 + 공유 버튼 작동 (champion 페이지의 `canShare = user && !user.isAnonymous` 통과 — 이미 올바르게 구현돼 있음, 변경 불필요)
5. 미완주 → 로그인: 대진·진행 상태 유지, 착지 이동 없음
6. 새 uid가 같은 대회를 이미 진행/완주 중(충돌): 구글 데이터 우선, 에러 없이 완료, 착지는 구글 uid 상태 기준
7. 서버: 익명 uid의 정책 위반 votes create가 `permission-denied` (클라이언트 우회 불가)
8. HF-1(하루 신규 5개)·HF-1.5(20/min)·HF-2(시드 대진) 회귀 없음 — 기존 테스트 전체 green

## §7 Testing Strategy
§0.5 관례 준수: `decideVoteGate`·`guestVoteGuard`·이전 플래너(linkSeeds 패턴) 순수 단위테스트 + rules 테스트(익명 votes create 거부) + Playwright E2E 4건 + Phase D′.

## §8 Edge Cases

| # | 케이스 | 처리 |
|---|---|---|
| 1 | **이전 시 새 uid가 이미 그 대회 진행/완주 중 (uid 충돌)** | 기존(구글) 데이터 우선 — roundProgress·seeds create-once, votes는 이전하되 대진 판정은 구글 상태 기준. 게스트 진행분은 폐기. 응답의 `complete`는 구글 uid 문서 기준 |
| 2 | 완주 직후 Crown Card 트리거가 아직 안 돈 시점에 로그인 (경합) | Option A면 자연 해소 — 새 uid에서 트리거 재발화. 착지 페이지의 기존 "카드 준비 중" 상태가 지연 흡수 |
| 3 | votes 0건 익명 uid로 로그인 | linkSessionVote no-op (linked 0) — W5의 "항상 pending 설정"이 안전한 이유 |
| 4 | iOS Safari redirect 로그인 | `PENDING_ANON_UID_KEY`는 sessionStorage — 기존 메커니즘 그대로 생존 (변경 없음 확인만) |
| 5 | daily_participation 병합으로 오늘 참가 6개 초과 | 허용 — 한도는 "신규 참가" 게이트일 뿐, 이미 참가한 대회는 무제한 원칙 |
| 6 | linkSessionVote 실패(네트워크) | 기존 정책 유지: pending 키 제거 + 상위 토스트. 게스트 데이터는 서버에 잔존하나 익명 세션이 살아 있으면 다음 로그인 시도에서 재시도 가능성 — 현행 유지, 개선은 scope 밖 |
| 7 | 시크릿/새 브라우저 = 새 익명 uid | 수용 (§2 알려진 한계). rate limit + C-3 이상탐지 보조 |

## §9 Out of Scope
게스트 다중 대회 허용 · 시크릿 우회 완전 봉쇄 · 콘텐츠 i18n(MVP2) · UX-1/3/5 (B-2) · linkSessionVote 실패 재시도 UX 개선.

## §10 References
`outputs/dp1-findings/UX_DEFECTS_2026-07-06.md` §UX-8 · `docs/planning/WorldCrown48_v4_9.md` 원칙 ③ · `docs/lite-specs/D1-locker-room.md` · `docs/handoffs/D1-locker-room-handoff.md` · `docs/adr/0007-hf2-seeded-random-bracket.md` · `functions/src/core/linkSeeds.ts` (이전 플래너 전례)

---

## §11 Superpowers TDD — Phase 단위 RED→GREEN→REFACTOR→COMMIT
모든 Phase에 적용. 단축 금지. §확인 필요 2(트리거 edge)는 **RED 테스트로 먼저 증명** 후 Option A 확정.

## §12 Push 확인 의무 · §13 Branch Alias URL · §14 시각 검증 가이드 · §15 DoD · §16 Cleanup
템플릿 v2.1 그대로 적용. §13: `https://worldcrown48-git-feat-hf3-guest-run-choijiniis-projects.vercel.app`

## Auto-STOP Conditions (템플릿 8건 + 모듈 특칙)
- **특칙 9:** §확인 필요 1(rules의 prefix 쿼리)·2(트리거 edge)가 둘 다 불가로 판명 → STOP, 대안 설계는 대표 결정
- **특칙 10:** roundProgress에 문서화 안 된 필드 발견 → 임의 해석 금지, STOP 보고

---

## §부록 A — 문서 4곳 동기화 상세 (Phase 5)

**1. `LANGUAGE.md` — 신규 용어 등록 (선행):**

| 한국어 | English (공식) | 정의 |
|---|---|---|
| 게스트 런 (1회 완주) | **Guest Run** | 비로그인(익명 uid) Voter가 토너먼트 **1개를 1회 완주**하는 것. A안(맛보기 모델) = Guest Run 1회 허용. 완주 후 또는 두 번째 대회 진입 시 로그인 필요. 로그인 시 Guest Run 전체(votes·bracket_seeds·roundProgress·Crown Card)가 새 uid로 이전됨 |

금지 표현 등록: ~~게스트 1표~~ · ~~세션 1회 투표~~ · ~~비로그인 1표~~ (모호 — 스펙 오염의 원인)

**2. `WorldCrown48_v4_9.md` 원칙 ③ (L154-155):** "세션당 첫 투표 1건 … 2번째 Match부터 로그인 모달" → "비로그인은 Guest Run 1회(토너먼트 1개 완주) 허용. 완주 후·두 번째 대회부터 로그인 모달" + 철학 문단(L159) 동일 취지 정정 + 변경 이력에 "2026-07-07 대표 재정의" 기재

**3. `docs/lite-specs/D1-locker-room.md` (L15):** "세션 1회 투표 허용 → 2회째부터 로그인 요청" → Guest Run 정의로 교체 + 게이트 의사코드(L58-62) 갱신

**4. `docs/handoffs/D1-locker-room-handoff.md`:** "1회 투표" 표현(L19·41·161·242 등)에 정정 주석 블록 추가 (v2.0 본문 전면 개정 대신 상단에 "⚠️ 2026-07-07 Guest Run 재정의 — §해당 절은 HF-3 핸드오프가 대체" 고지)

---

*© 2026 WorldCrown48 | HF-3 Guest Run Handoff v1.0 DRAFT | CONFIDENTIAL*
