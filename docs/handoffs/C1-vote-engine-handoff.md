# Handoff Brief — C-1 Vote Engine (Domain 3 · The Arena)

> **From**: Cowork (기획·시안 분석·B-1 통합·라운드 모델 확정) · **To**: Claude Code (실코드)
> **Date**: 2026-06-21 · **Author**: 대표 · **Version**: v2.0
> **작업 브랜치**: `feat/c1-vote-engine` (워크트리 `/Users/jinii/Projects/wc48-c1` 권장)
> **목표 산출물**: `app/arena/[tournamentId]/` + `components/arena/` + `lib/arena/*` (순수 로직) + `functions/src/{onVote,advanceRound}.ts` + Firestore Rules 완화(Voter read) + Realtime DB 규칙
> **선행 모듈**: **B-1 The Lab** (머지 `7eb2bad`, 배포 완료) — Firestore `tournaments`/`contestants` 데이터 공급원

---

## ⚠️ v2.0 변경 사유 (Claude Code 필독)

이 핸드오프는 **C-1 lite-spec(`docs/lite-specs/C1-vote-engine.md`, Vite + React Router 구버전 표기)** 를 **Next.js 14 App Router로 재해석**합니다. 화면 구성·컴포넌트·라운드/투표 규칙 명세는 유효하며, 프레임워크·라우팅 표기는 아래로 강제 매핑됩니다.

| lite-spec 표기 | 실제 사용 (Next.js 14) |
|---|---|
| `import.meta.env.VITE_*` | `process.env.NEXT_PUBLIC_*` |
| `useNavigate()` / `useParams()` | `useRouter()` / `useParams()` from `next/navigation` |
| `routes/arena/:id` | `app/arena/[tournamentId]/page.tsx` |
| Zustand `voteStore.ts` | `lib/arena/voteStore.ts` (그대로 Zustand) |

**B-1에서 검증된 패턴을 그대로 계승합니다 (필수):**
- **로직-추출 피라미드**: 모든 결정 로직은 `lib/arena/*` 순수 모듈로 추출하여 **node-env vitest로 즉시 TDD**. 컴포넌트는 얇은 글루 → Playwright E2E로 커버. Cloud Function은 `functions/src/core/*`로 코어 추출 후 vitest.
- **Firestore 규칙 batch/트랜잭션-안전**: rules `get()`은 같은 batch/트랜잭션의 미커밋 문서를 못 본다. 필요한 권한 필드는 문서에 비정규화한다.
- **`defineSecret`** (있을 경우) — `.env` 아님.

---

## §0. 자가 검증 (Self-verify) — 코드 작성 전 반드시 모두 ✓

```bash
# 0.1 위치
git branch --show-current            # 기대값: feat/c1-vote-engine

# 0.2 핵심 파일/선행 데이터
test -f CLAUDE.md && echo "✓ CLAUDE.md"
test -f docs/lite-specs/C1-vote-engine.md && echo "✓ C1 lite-spec"
test -f docs/handoffs/C1-vote-engine-handoff.md && echo "✓ C1 handoff"
test -f lib/types/tournament.ts && echo "✓ B-1 Tournament/Contestant 타입(공급원)"
test -f lib/voteGate.ts && echo "✓ 기존 VoteGate(D-1) 재사용 대상"
test -f docs/design/WC48_DESIGN_SYSTEM_v2.4.md && echo "✓ Design System v2.4"

# 0.3 의존성 — 클라이언트 firebase에 Realtime DB 포함 확인
grep -E '"firebase"' package.json | wc -l        # 기대값: 1
grep -nE "getDatabase|Realtime|rtdb|database\(" lib/firebase.ts || echo "ℹ RTDB 접근자 신규 추가 필요 (lib/firebase.ts)"

# 0.4 선행 데이터 존재 — 운영자(B-1)가 만든 active Tournament가 최소 1개 있어야 E2E 가능
# (대표가 /admin/lab 에서 1개 생성했는지 확인. 없으면 대표에게 요청.)

# 0.5 환경 — Realtime DB 인스턴스 URL
grep -E "^NEXT_PUBLIC_FIREBASE_DATABASE_URL=" .env.local 2>/dev/null && echo "✓ RTDB URL" || echo "✗ NEXT_PUBLIC_FIREBASE_DATABASE_URL 필요 — 대표/Console 확인"
```

> 하나라도 ✗ 이면 즉시 멈추고 대표에게 보고. (B-1 §0 선례 — 누락 입력은 진행 불가)

---

## §1. Pre-flight Checklist — 읽기 (§0 통과 후)

```
☐ 🛑 docs/mental-model/MENTAL_MODEL.svg — 라운드·매치·득표 규칙 시각 진실 (충돌 시 SVG 우선)
☐ CLAUDE.md "대진 흐름 핵심 원칙 (v0.3)" 8개 항목 (특히: Round Deadline 없음 / advanceRound 자동 / Match 1개씩 / THE FINAL 3택 / 매치 화면 Round HUD 금지 / Vote Count 금지)
☐ docs/lite-specs/C1-vote-engine.md (화면·컴포넌트·ROUND_CONFIG — 프레임워크 표기는 §위 매핑)
☐ lib/voteGate.ts (decideVoteGate·useVoteGate·getTodayVoteCount — 그대로 재사용)
☐ lib/types/tournament.ts (Tournament·Contestant·CATEGORIES — B-1 공급)
☐ firestore.rules (기존 /votes, /tournaments, /contestants 규칙 — C-1이 완화/확장)
☐ docs/design/WC48_DESIGN_SYSTEM_v2.4.md (Domain 3 = 다크 테마 토큰)
```

---

## §2. Goal — 한 줄 결과 정의

> **Voter가 `/arena/{tournamentId}`에 진입하면, B-1이 생성한 48 Contestant를 1:1 Match로 한 개씩(순서대로, 건너뛰기 불가) 투표하고, 본인의 ROUND OF 48→24→12→6 마지막 매치 완료 시 `advanceRound()`가 자동으로 다음 라운드를 개인 단위로 열어 RoundTransition 이벤트를 띄우며, THE FINAL에서 3명 중 1명을 직접 선택해 Champion을 확정한다.**

이 PR이 끝나면 **C-2 Crown Card가 사용할 Champion 확정 이벤트**와 **C-3 랭킹이 집계할 votes 데이터**가 존재합니다.

---

## §3. Files to CREATE / MODIFY

### 페이지·라우팅 (Next.js 14 App Router · Domain 3 다크)
| 경로 | 동작 | 비고 |
|---|---|---|
| `app/arena/[tournamentId]/page.tsx` | **NEW** | ArenaDomain 진입 — voteStore.loadTournament |
| `app/arena/[tournamentId]/layout.tsx` | **NEW** | 다크 테마 강제 (Domain 3) |

### 순수 로직 (lib/arena — node-env vitest로 TDD)
| 경로 | 동작 | 비고 |
|---|---|---|
| `lib/arena/roundConfig.ts` | **NEW** | ROUND_CONFIG(1~5), roundName, isFinalRound, matchCountForRound |
| `lib/arena/matches.ts` | **NEW** | **핵심**: 라운드 진출자 배열 → 1v1 Match 페어 + 결정적 matchId 생성 (§9 trap #1) |
| `lib/arena/roundProgress.ts` | **NEW** | votedMatchIds + roundMatchCount → isRoundComplete / nextMatchIndex |
| `lib/arena/rate.ts` | **NEW** | rate(%) 포맷·표시 헬퍼 (절대 수치 입력 금지 — 문자열 % 전용) |
| `lib/arena/voteStore.ts` | **NEW** | Zustand: tournament, contestants, currentRound, currentMatchIndex, votedMatchIds, rateCache + actions |

### 컴포넌트 (components/arena — 얇은 글루, E2E 커버)
| 경로 | 동작 | 비고 |
|---|---|---|
| `components/arena/MatchView.tsx` | **NEW** | round 1~4 1v1. **Round 배지·HUD 금지** |
| `components/arena/ContestantCard.tsx` | **NEW** | `voteCount` props 금지. 이미지 4:5 |
| `components/arena/VsSymbol.tsx` | **NEW** | 골드 테두리 VS |
| `components/arena/FinalPickView.tsx` | **NEW** | round 5 — 3명 동시, 1명 선택 |
| `components/arena/RoundTransition.tsx` | **NEW** | Framer Motion 전환 이벤트("🎉 N강 시작!") — 라운드 사이에만 |
| `components/arena/VoteRateBar.tsx` | **NEW** | 투표 후 rate(%)만. `count` props 금지 |
| `components/arena/DesktopFriendly.tsx` | **NEW** | 반응형 (모바일 상하 / 데스크탑 좌우) — B-1 DesktopOnly와 달리 모바일 허용 |

### Cloud Functions (functions/src — 코어 추출 후 vitest)
| 경로 | 동작 | 비고 |
|---|---|---|
| `functions/src/core/voteRecord.ts` | **NEW** | 순수: vote 문서 빌더 + 검증 (round/matchId/contestantId/date) |
| `functions/src/core/advanceRoundCore.ts` | **NEW** | 순수: (round, voterRoundVoteCount) → 'transition'|'champion'|'noop' |
| `functions/src/onVote.ts` | **NEW** | onCall: VoteGate 서버재검증 + rate limit(1분 10회) + 일일 5회 + RTDB +1 트랜잭션 + Firestore votes write |
| `functions/src/advanceRound.ts` | **NEW** | onDocumentCreated('votes/{id}'): Voter별 라운드 완료 판정 → RTDB roundTransitions 또는 confirmChampion |
| `functions/src/index.ts` | **EDIT** | onVote, advanceRound export |

### 훅
| 경로 | 동작 | 비고 |
|---|---|---|
| `lib/arena/useRoundTransition.ts` | **NEW** | RTDB `roundTransitions/{uid}/{tid}` 구독 |

### 규칙 (Firestore + RTDB)
| 경로 | 동작 | 비고 |
|---|---|---|
| `firestore.rules` | **EDIT** | **§9 trap #2 — Voter read 완화**: tournaments(active 공개 read), contestants(공개 read). votes는 기존 유지(read owner / write false). |
| `database.rules.json` | **NEW/EDIT** | RTDB: `roundTransitions/{uid}` 본인만 read, 클라 write 금지(함수만). vote count 노드는 절대 수치 — Voter 직접 read 금지(rate는 ranking_cache 경유) |

### 재사용 (수정 없음)
| 경로 | 비고 |
|---|---|
| `lib/voteGate.ts` | `useVoteGate().checkCanVote` / `onVoteSuccess` 그대로 |
| `components/auth/LoginModal.tsx` | reason `vote` / `daily_limit` 그대로 |
| `lib/kst.ts`, `lib/authStore.ts`, `lib/types/tournament.ts` | 그대로 |

---

## §4. Acceptance Criteria — 완료 조건

### 진입·데이터 로드 (6)
```
☐ /arena/{id} 진입 시 active Tournament + 48 Contestant 로드 (B-1 데이터)
☐ 존재하지 않거나 status!='active' Tournament → 친절한 안내 + 홈 링크
☐ 첫 매치는 ROUND OF 48의 1번 Match (순서대로 1개씩 제시)
☐ Voter는 Match를 동시 진행·건너뛰기·직접 선택 불가 (round 1~4)
☐ 매치 화면 어디에도 Round 배지·"N강 · X/Y" HUD 없음
☐ console.error 0건
```
### 투표 (8)
```
☐ 비로그인 1회 게스트 투표 허용 → 2회째 LoginModal(reason=vote)
☐ 로그인 후 일일 5회 초과 → LoginModal(reason=daily_limit)
☐ 투표 = onVote 호출 (서버 검증). 1분 10회 초과 → resource-exhausted → 쿨다운 토스트
☐ contestantId 전달 (❌ winnerId). votes 문서에 round·matchId·date 기록
☐ 투표 후 VoteRateBar rate(%) 슬라이드 인 (ranking_cache/rateCache 경유) — 절대 수치 0
☐ 같은 Match 중복 투표 불가 (votedMatchIds)
☐ 투표 직후 다음 Match로 진행 (라운드 미완료 시 HUD 없이)
☐ 낙관적 UI 실패 시 롤백 + 토스트
```
### 라운드 전환 (advanceRound 자동) (6)
```
☐ 해당 Round 마지막 Match 완료 시 advanceRound가 Voter 개인 단위 자동 실행
☐ 다른 Voter 진행에 영향 없음 (전역 currentRound 갱신 금지)
☐ RoundTransition 전체화면 이벤트 "🎉 24강 시작!"(ko)/"ROUND OF 24 BEGINS"(en) 1~2초
☐ 라운드명 48→24→12→6→THE FINAL만 사용 (❌ R16/QF/SF, ❌ 48/24 currentRound 값)
☐ 다음 라운드 매치는 본인 직전 라운드 승자들로 구성 (개인 트리)
☐ Round Deadline·카운트다운 UI 절대 없음
```
### THE FINAL + Champion (5)
```
☐ round 5 진입 시 MatchView 대신 FinalPickView (3명 동시)
☐ 3명 중 1명 직접 선택 (1v1 2매치로 쪼개지 않음)
☐ 선택 즉시 Champion 확정 → advanceRound가 confirmChampion 트리거
☐ Champion 확정 이벤트가 C-2 Crown Card가 읽을 형태로 기록
☐ 결승에서 Round 추가(3강→2강) 생성 금지
```
### 반응형 (3)
```
☐ 데스크탑 1440: 좌우 50% (VS 중앙) / 태블릿 768: 좌우 / 모바일 375: 상하
☐ 3개 데스크탑 + 3개 모바일 사이즈 정상
☐ 터치 타깃 ≥ 44px
```

---

## §5. Hard Constraints — DO / DON'T

### DO
- **Domain 3 = 다크 테마**, Crown Gold `#FCD006` 포인트 (VS·선택 뱃지)
- **currentRound 1~5** 체계만. ROUND_CONFIG 단일 진실 = `lib/arena/roundConfig.ts`
- **advanceRound = Voter 개인 단위 자동** (votes onCreate 트리거, 본인 라운드 투표수 == matchCount)
- **공식 용어**: Contestant / Match / Voter / Champion / Tournament (LANGUAGE.md)
- **로직-추출 피라미드 + Superpowers TDD** (B-1 선례) — §11 준수
- **rate(%)는 ranking_cache(C-3) 경유**, 투표 후에만, 랭킹/결과 맥락에서만

### DON'T
- **Vote Count(절대 수치) UI/props 금지** — ContestantCard·VoteRateBar에 count 전달 금지
- **매치 화면 Round 배지·HUD("N강 · X/Y") 금지** — Round 정보는 RoundTransition 이벤트에서만
- **Round Deadline / 카운트다운 / "모두 같은 시간" 가정 금지**
- **FIFA 라운드명(ROUND OF 16·QF·SF) 금지**, "FIFA"·"Official" 표기 금지
- **결승을 1v1 매치로 쪼개기 금지** (3명 동시 1택)
- **전역 tournament.currentRound을 advanceRound에서 갱신 금지** (개인 진행만)
- **lite-spec Vite 표기 그대로 코딩 금지** (`import.meta.env` → `process.env.NEXT_PUBLIC_*`)
- **localStorage/sessionStorage 금지** (voteStore=메모리, votes=Firestore, 진행=votedMatchIds 파생)

---

## §6. Design Reference

- 컴포넌트 트리 / ROUND_CONFIG / castVote / advanceRound / ContestantCard·VoteRateBar props: **lite-spec §컴포넌트트리·§라운드구조·§castVote·§advanceRound 그대로** (Vite→Next 매핑만 적용).
- Domain 3 다크 토큰: `docs/design/WC48_DESIGN_SYSTEM_v2.4.md`. Crown Gold `#FCD006`.
- 반응형: 데스크탑 좌우 50%(VS 중앙) / 모바일 상하(VS 중간).
- RoundTransition: Framer Motion 전체화면 오버레이 → spring 팝업 → "계속하기".

---

## §7. Test Plan (수동 14)

```
1. 비로그인 진입 → 1회 게스트 투표 → 2회째 LoginModal(vote)
2. 로그인 → 정상 투표 → VoteRateBar rate(%) 표시 (수치 0)
3. 일일 5회 → 6회째 LoginModal(daily_limit)
4. 1분 10회 초과 → 쿨다운 토스트(resource-exhausted)
5. ROUND OF 48 마지막(24번) 매치 완료 → RoundTransition "🎉 24강 시작!"
6. 매치 화면에 Round HUD 없음 육안 확인
7. 24→12→6 동일하게 개인 전환
8. ROUND OF 6 완료 → THE FINAL FinalPickView (3명)
9. 3명 중 1명 선택 → Champion 확정 이벤트
10. 두 번째 Voter 동시 진행 → 서로 라운드 영향 없음 (개인 트리)
11. 같은 매치 중복 투표 시도 → 차단
12. 존재하지 않는 tournamentId → 안내 화면
13. 모바일 375 상하 배치 / 데스크탑 1440 좌우
14. 전 과정 console.error 0
```

---

## §8. Analytics Events
```
arena_view              { tournament_id }
arena_vote              { tournament_id, round, match_id }           # ❌ contestant 수치 금지
arena_vote_blocked      { reason: 'login'|'daily'|'cooldown' }
arena_round_transition  { tournament_id, from_round, to_round }
arena_final_view        { tournament_id }
arena_champion          { tournament_id }
```

---

## §9. 알려진 함정 (Cowork이 미리 파악한 위험)

1. **per-Voter Match 생성 + matchId 스킴 (가장 중요·설계 결정)** — 각 Voter는 본인 선택으로 갈리는 **개인 이진 트리**. round 2 페어는 *이 Voter*의 round 1 승자들로 구성된다. `lib/arena/matches.ts`가 (라운드 진출자 배열, round) → 결정적 페어 + **안정적 matchId** 를 생성해야 한다. 권장: `matchId = \`${tournamentId}:r${round}:m${index}\`` + 진출자 순서는 본인 승자 누적 순. **advanceRound의 라운드 완료 판정(votes where userId+tournamentId+round count == matchCount)과 정확히 일치**해야 한다. → 구현 전 대표 확인.
2. **Voter read 규칙 완화 (B-1이 남긴 선행 작업)** — B-1은 tournaments/contestants read를 owner-scoped로 뒀다. C-1은 Voter가 active Tournament + Contestants를 읽도록 완화: `tournaments allow read: if resource.data.status=='active' || featured || (owner)`, `contestants allow read: if true`(PII 없음). votes는 기존 유지.
3. **Realtime DB 미설정 가능성** — `lib/firebase.ts`에 RTDB 접근자가 없을 수 있음(§0.3). getDatabase 추가 + `NEXT_PUBLIC_FIREBASE_DATABASE_URL` + `database.rules.json` 필요. roundTransitions는 본인만 read, 함수만 write.
4. **rate(%) 공급원 = C-3 (ranking_cache) 크로스 의존** — VoteRateBar의 rate는 `ranking_cache`에서 온다. C-3가 아직 없으면 rateCache가 비어 rate 표시가 안 됨. C-1은 **rate 없음에도 동작**(투표 후 막대 숨김/플레이스홀더)하도록 graceful. ranking_cache 쓰기는 C-3 범위. → 대표 확인.
5. **advanceRound 멱등성** — votes onCreate가 중복/재시도될 수 있음. confirmChampion·roundTransition을 **멱등**하게(이미 전환했으면 noop). `advanceRoundCore`로 순수 판정 + 함수는 set(덮어쓰기 안전)로.
6. **절대 수치 누수 금지** — RTDB count 노드를 Voter가 직접 구독/표시하면 불변 원칙 위반. count는 함수만 접근, Voter엔 rate(%)만. ContestantCard/VoteRateBar 타입에서 count 필드 자체를 제거.
7. **전역 currentRound 갱신 금지** — advanceRound는 본인 RTDB roundTransitions만 발행. tournament 문서의 currentRound는 건드리지 않는다(개인 진행 ≠ 전역).
8. **게스트 1표 + 로그인 연결** — D-1 linkSessionVote가 익명→구글 연결을 처리. C-1은 onVote가 익명 uid도 받도록(게스트 1표) + onVoteSuccess로 sessionVoteUsed 마킹(기존 useVoteGate 재사용).
9. **onVote 비용/어뷰징** — B-1 trap #10 선례: 인증·rate limit을 모델/DB 비용 전에. 1분 10회 초과 시 throw `resource-exhausted`.
10. **THE FINAL 분기** — round 5는 matchCount 1, contestants 3, isFinal. FinalPickView로 분기(MatchView 재사용 금지). 선택=Champion 확정 1액션.

---

## §10. 핸드오프 종료 조건

```
☐ Acceptance Criteria 전 항목 통과 (진입6/투표8/전환6/결승5/반응형3)
☐ Hard Constraints DO/DON'T 위반 0
☐ CLAUDE.md 불변 원칙·대진 흐름 v0.3 위반 0 (Round HUD·Vote Count·Round Deadline·FIFA명)
☐ LANGUAGE.md 금지 용어 0
☐ TypeScript strict 통과 / next build 통과 / Vercel Preview 동작
☐ Firestore Rules + RTDB rules 배포 + Voter read 허용·count 직접 read 차단 확인
☐ onVote / advanceRound 배포 + 호출·트리거 동작 (Seoul asia-northeast3)
☐ console.error 0 자동 검증

★ v2.1 필수 ★
☐ §11 Playwright E2E 핵심 시나리오 GitHub Actions PASS (login→vote→round transition→final→champion)
☐ E2E HTML 리포트 PR 첨부 + Console 에러 0 가드
☐ 워크플로우는 c1 스펙만 타깃(playwright test e2e/c1-*.spec.ts) — B-1 선례(스펙 격리)
```

---

## §11. Superpowers 워크플로우 지시 (필독)

### 11.1 적용 단계 (순서 엄수)
```
Phase 1 Brainstorming — §2 Goal + §9 trap #1(per-Voter match)·#2(rules)·#4(rate 의존) 정리
Phase 2 Plan — 우선순위: roundConfig → matches → roundProgress(순수 TDD) → onVote/advanceRound core(vitest) → voteStore → 컴포넌트 → rules → E2E
Phase 3 TDD RED-GREEN-REFACTOR — 테스트 없이 구현 금지
Phase 4 /review — Hard Constraints·불변 원칙·LANGUAGE·strict·console 0
Phase 5 PR — §10 체크리스트 포함, 드래프트 가능
```
### 11.2 TDD 대상 매핑 (node-env vitest = 즉시 / functions vitest / E2E)
| 테스트 | 대상 | 계층 |
|---|---|---|
| `lib/__tests__/arena/roundConfig.test.ts` | ROUND_CONFIG·roundName·isFinal | unit |
| `lib/__tests__/arena/matches.test.ts` | 진출자→페어+matchId 결정성 (trap #1) | unit |
| `lib/__tests__/arena/roundProgress.test.ts` | 라운드 완료/다음 매치 | unit |
| `lib/__tests__/arena/rate.test.ts` | rate(%) 포맷, count 미입력 | unit |
| `functions/src/__tests__/voteRecord.test.ts` | vote 문서 빌더·검증 | functions |
| `functions/src/__tests__/advanceRoundCore.test.ts` | transition/champion/noop + 멱등 | functions |
| `tests/rules/arena-rules.test.ts` | Voter read 허용 / count 차단 (emulator) | rules |
| `e2e/c1-arena-flow.spec.ts` | login→vote→transition→final→champion, console 0 | E2E |

### 11.3 TDD 면제: 순수 CSS, Framer 애니메이션 스타일, 정적 안내 텍스트.
### 11.4 3계층: 유닛(vitest 100%) / 통합(emulator: rules + onVote core) / E2E(Playwright + console 0).
### 11.5 CI `.github/workflows/c1-e2e.yml`: unit + functions + rules(emulator, Java 21 + firebase-tools) + Playwright. **B-1 선례 — 스펙 격리(`playwright test e2e/c1-*.spec.ts`), `test.skip(!PREVIEW_URL)` 가드.**
### 11.6 Console 에러 0 가드: beforeEach 수집 / afterEach toHaveLength(0).

---

## §12. Cowork 셀프체크리스트
```
☑ §11 별도 섹션 존재 (Superpowers TDD)
☑ "권장" 최소화 — 핵심은 "필수"
☑ 핵심 흐름 E2E 명시 (login→vote→transition→final→champion)
☑ §10 종료조건에 E2E 증거 + 배포(rules·RTDB·functions) 의무
☑ B-1 선행 의존(Voter read 완화) §3·§9 반영
☑ lite-spec Vite→Next 매핑 명시
☑ per-Voter match 생성 = 최우선 설계 결정으로 §9 #1에 명시
☑ Vote Count 금지·Round HUD 금지·advanceRound 개인단위 = 불변 원칙 반영
```

---

## 부록 A — votes 스키마 (C-1 확정 / C-3 집계)
```ts
interface Vote {
  id: string;
  userId: string;            // 익명 uid 허용 (게스트 1표)
  tournamentId: string;
  round: 1 | 2 | 3 | 4 | 5;
  matchId: string;           // lib/arena/matches.ts 결정적 ID
  contestantId: string;      // ✅ 선택한 Contestant (❌ winnerId)
  date: string;              // getTodayKST() — 일일 5회 한도용
  createdAt: Timestamp;      // serverTimestamp
}
```
> 기존 `lib/voteGate.ts`는 votes를 `userId + tournamentId + date`로 조회한다 — 위 필드 필수.

## 부록 B — Firestore Rules diff (요지)
```
match /tournaments/{id} {
  allow read: if resource.data.status == 'active'
              || resource.data.featured == true
              || (request.auth != null && resource.data.hostUid == request.auth.uid);
  // create/update/delete: B-1 owner-scoped 유지
}
match /contestants/{id} { allow read: if true; /* PII 없음, Voter 투표용 */ }
match /votes/{id} { allow read: if request.auth!=null && resource.data.userId==request.auth.uid;
                    allow write: if false; /* onVote(admin SDK)만 */ }
```

## 부록 C — Cloud Function 골격
```ts
// functions/src/onVote.ts (onCall, asia-northeast3, cors: ALLOWED_ORIGINS)
//  1) auth(익명 허용) 2) per-uid rate limit(1분 10회→resource-exhausted)
//  3) 일일 5회(KST) 4) RTDB count +1 트랜잭션 5) Firestore votes set(admin)
//  → 로직은 functions/src/core/voteRecord.ts(순수)로 추출 + vitest

// functions/src/advanceRound.ts (onDocumentCreated 'votes/{id}')
//  votes where userId+tournamentId+round count == ROUND_CONFIG[round].matchCount?
//   → round 5: confirmChampion (멱등)  / else: RTDB roundTransitions/{uid}/{tid} set
//  → 판정은 functions/src/core/advanceRoundCore.ts(순수) + vitest
//  ❌ 전역 currentRound 갱신 금지 / ❌ deadline 참조 금지
```

---

*Handoff Brief v2.0 · C-1 Vote Engine (Domain 3 The Arena) · WorldCrown48 · 2026-06-21*
*© 2026 WorldCrown48 · CONFIDENTIAL*
