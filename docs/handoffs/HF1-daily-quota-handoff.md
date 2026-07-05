# HF-1 — Daily Quota 규칙 정정 핫픽스 (Handoff v2.1)

| 항목 | 값 |
|---|---|
| 모듈 ID | `hf1-daily-quota` |
| 브랜치 | `feat/hf1-daily-quota` |
| 워크트리 | `~/Projects/wc48-hf1` |
| 기준 HEAD | `origin/main` 최신 (PR #34 머지 후 — `git fetch origin` 후 확인) |
| Base 브랜치 | `main` |
| 핸드오프 버전 | **v2.1** |
| 우선순위 | **P0 — 다른 모든 작업 차단 중** |

---

## §0 자가 검증

```bash
pwd                       # → ~/Projects/wc48-hf1 (메인 repo 아님)
git branch --show-current # → feat/hf1-daily-quota
git fetch origin && git log origin/main --oneline -1   # 기준 HEAD 확인
```

**자가 검증 통과 ≠ 작업 권한. "통과, 작업 시작합니다" 통보 후 진행.**

## §0.5 Stack Truth (grep 확인 완료 — 2026-07-05)

| 영역 | 진실 | 함정 |
|---|---|---|
| 패키지 매니저 | **npm** | ❌ pnpm 아님 |
| 단위 테스트 | vitest `environment: node` — functions는 `functions/src/__tests__/`, 클라이언트 로직은 `lib/__tests__/` | ❌ 컴포넌트 렌더 테스트 금지 |
| i18n | 수제 Context (`lib/i18n.tsx`), `?lang=` 쿼리, **ko/en/es 3언어** (PR #34) | ❌ next-intl 없음 |
| E2E | Playwright, spec 경로 명시 실행 ([[feedback-workflow-spec-scope]]) | ❌ 전체 실행 금지 |

## §1 Pre-flight
- 필독 메모리: [[project-dp1-ux-findings-2026-07-05]] [[feedback-firestore-composite-index]] [[feedback-i18n-test-determinism]] [[feedback-test-isolation-per-voter]]
- 필독 문서: `CLAUDE.md` · `LANGUAGE.md` · `docs/mental-model/MENTAL_MODEL.svg`

---

## §2 Module Identity & Goals

**문제 (2026-07-05 대표 실사용 중 발견):**
현재 규칙 = "Tournament당 하루 5표". 48강 브래킷 완주에는 46표(24+12+6+3+1)가 필요하므로 Voter가 결승까지 **10일** 걸림 → "Voter가 자기 트리를 통과해 Champion·Crown Card까지 간다"는 멘탈 모델과 정면충돌. **코드는 스펙대로 구현됐고 스펙(D1-locker-room.md 12행 등)이 잘못 기록된 사안** — 코드와 스펙을 함께 정정한다.

**확정된 올바른 규칙 (대표 결정 2026-07-05):**
> 하루(KST 기준)에 **새로 참가할 수 있는 Tournament는 5개**.
> 이미 참가한 Tournament 안에서는 **무제한** — 브래킷 구조상 대회당 최대 46표로 자연 상한.
> 비로그인 1회 무료 투표(D-1 linkSessionVote)는 **변경 없음**.

**새 용어 (LANGUAGE.md 추가 — RULE 2: 새 개념 = 새 용어):**
- ✅ **Daily Participation Limit** (일일 참가 한도, 5 Tournaments/KST day)
- ❌ 폐기: "Daily Vote Limit(일일 투표 한도)" 개념 — 투표 수 자체를 세는 규칙은 더 이상 없음

## §3 Scope (Work Items)

| # | 파일 | 작업 |
|---|---|---|
| 1 | `functions/src/onVote.ts` | 96~109행 per-Tournament daily count 트랜잭션 제거 → **participation 체크**로 교체 (§4 ADR) |
| 2 | `functions/src/core/voteRecord.ts` (필요 시) | 순수 로직 추출 — participation 판정 함수 단위테스트 가능하게 |
| 3 | `lib/voteGate.ts` | `getTodayVoteCount`(votes 쿼리) → `daily_participation` 단일 doc 읽기로 교체. `decideVoteGate` 시그니처: `todayCount` → `{ participatedThisTournament: boolean, participationCount: number }` |
| 4 | `firestore.rules` | `daily_participation/{docId}`: read = 본인(`docId`가 `uid_`로 시작), write = 금지(서버 전용) |
| 5 | `components/auth/LoginModal.tsx` + i18n 키 | `daily_limit` 카피 교체 (§6 문구, ko/en/es 3언어) |
| 6 | `docs/lite-specs/D1-locker-room.md` 12·66·95·116·122행, `C1-vote-engine.md` 126·130행, `C3-ranking-anomaly.md` 54~61행 | 규칙 서술 정정. **추가로 `grep -rn "5회\|DAILY" docs/`로 잔존 오염 전수 확인** ([[feedback-verify-conflicting-specs]]) |
| 7 | `LANGUAGE.md` | Daily Participation Limit 용어 등재 |
| 8 | `functions/src/__tests__/onVote.test.ts` · `lib/__tests__/voteGate.test.ts` | 새 규칙으로 재작성 |
| 9 | `e2e/c1-anon-gate.spec.ts` 122·142~143행 | 시나리오·문구 갱신 (비로그인 흐름은 불변이므로 daily_limit 시나리오는 **로그인 Voter + 참가 5개 시드**로 교체) |

## §4 ADR-HF1 — participation 저장 구조

```
컬렉션: daily_participation
문서 ID: `${uid}_${kstDate()}`            예: abc123_2026-07-05
필드:   { tournamentIds: string[], updatedAt: serverTimestamp }
```

**onVote 트랜잭션 (dedupe 체크는 기존 유지):**
1. `tx.get(daily_participation/${uid}_${date})`
2. `tournamentIds`에 이번 `tournamentId` 포함 → 통과 (한도 소비 없음)
3. 미포함 && `tournamentIds.length >= 5` → `resource-exhausted` + §6 문구
4. 미포함 && `< 5` → `tx.set(..., { tournamentIds: FieldValue.arrayUnion(tournamentId), updatedAt: ... }, { merge: true })` 후 투표 기록

**선정 이유:** ① 단일 doc 읽기 — votes 컬렉션 쿼리 제거로 **신규 composite index 불필요** ([[feedback-firestore-composite-index]] 사전 점검 완료: 기존 votes 인덱스 3개는 dedupe·랭킹용이라 유지). ② 클라이언트 게이트도 같은 doc 1회 읽기로 통일 — 기존 3-where 쿼리보다 저렴. ③ 트랜잭션 원자성으로 5개 초과 race 차단.
**마이그레이션:** 불필요 — 오늘 이미 투표한 Voter는 다음 투표 시 doc이 생성되며 해당 대회가 1개로 계산됨 (허용 오차).

## §5 Implementation Plan — §11 Superpowers TDD

- **Phase 1 (RED→GREEN):** `onVote.test.ts` — ① 6번째 신규 대회 거부 ② 참가한 대회 46표 전부 허용 ③ 같은 대회 재투표 시 한도 미소비 ④ KST 자정 경계 → 구현 → COMMIT
- **Phase 2:** `voteGate.test.ts` — decideVoteGate 새 시그니처 4분기(비로그인 허용/비로그인 소진/참가중 허용/신규 6번째 거부) → lib/voteGate.ts 구현 → COMMIT
- **Phase 3:** rules + LoginModal 카피(3언어) + E2E 갱신 → COMMIT
- **Phase 4:** 스펙 문서 6번·7번 항목 일괄 정정 → COMMIT
- **Phase D′ (강제):** 시드 주입 → Voter로 6개 대회 순회 시연 캡처 → 한/영 토글 확인 → cleanup

## §6 Acceptance Criteria

1. 로그인 Voter가 한 Tournament에서 48강→THE FINAL까지 **하루에 완주 가능** (46표 연속, rate limit 12초/표 준수)
2. 하루 6번째 **신규** Tournament 첫 투표 → 거부 + 문구: **ko** "오늘 참가할 수 있는 Tournament를 모두 사용했어요 (5/5)" / **en** "You've joined all 5 Tournaments for today (5/5)" / **es** "Ya has participado en los 5 Tournaments de hoy (5/5)"
3. 어제 참가했던 대회도 오늘 이어서 투표하면 오늘 참가 1개로 계산 (doc 기준 일관성)
4. 비로그인 1회 무료 투표 흐름 회귀 없음 (`c1-anon-gate` 통과)
5. Vote Count 노출 없음 · Round HUD 없음 (기존 불변 원칙 회귀 금지)
6. `firebase deploy --only functions:onVote` + Vercel 배포까지 완료 — **머지 ≠ 배포** ([[feedback-deployed-version-stale]])

## §7 Testing / §8 Edge Cases

- 단위: Phase 1·2 (vitest node). 에뮬레이터: Firestore rules 테스트(`daily_participation` 본인 read only).
- E2E: `npx playwright test e2e/c1-anon-gate.spec.ts` 등 **spec 경로 명시**. UI 텍스트 assertion은 `?lang=ko` 강제. 시드 전 votes+roundProgress+daily_participation RESET ([[feedback-test-isolation-per-voter]]).
- Edge: KST 자정 직전/직후 연속 투표(date가 서버 계산이므로 doc ID 분리로 자연 해소) · arrayUnion 중복 무해 · 트랜잭션 재시도 시 이중 카운트 없음(멱등).

## §9 Out of Scope

- Lab 5단계 플로우 개편 · 이미지 소싱 자동화 → **B-2 핸드오프**
- LoginModal의 "한국 시간 자정" 문구를 사용자 타임존 표기로 바꾸는 글로벌화 → DP-1/B-2에서 결정
- Navbar Locker Room 링크·Lab→Arena CTA → DP-1 UX 트랙

## §12 Push 확인 의무 · §13 Branch Alias URL · §14 시각 검증

템플릿 v2.1 §12·§13 그대로 적용. PR 시각 검증 URL은 `https://worldcrown48-git-feat-hf1-daily-quota-choijiniis-projects.vercel.app`.

---
*작성: Cowork DP-1 세션 2026-07-05 · 근거: onVote.ts:23,96-109 · voteGate.ts:17,32,55-80 · D1-locker-room.md:12 · 대표 결정 2건(규칙·즉시 핫픽스)*
