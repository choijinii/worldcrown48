# ADR-0008 — HF-3: Guest Run (게스트 1회 완주) 정책

- **Status**: Accepted (대표 확정 3건 2026-07-08)
- **Context module**: HF-3 Guest Run (Domain 3 · The Arena / Domain 4 · The Locker Room)
- **Amends**: the "비로그인 1회" 정책이 `docs/lite-specs/D1-locker-room.md` · `docs/planning/WorldCrown48_v4_9.md` 원칙 ③ 에 "매치 1클릭"으로 잘못 옮겨진 것을 정정
- **Relates**: `lib/voteGate.ts`, `functions/src/onVote.ts`, `functions/src/linkSessionVote.ts`, `functions/src/core/{guestVoteGuard,linkRoundProgress}.ts`, `components/auth/{AuthProvider,LoginModal}.tsx`, `lib/authStore.ts`, `firestore.rules`

## Context

A안(맛보기 모델)의 올바른 정의는 **"비로그인 Voter가 토너먼트 1개를 1회 완주할 수
있다"** 이다. 그러나 상위 문서에 "세션 1회 투표"·"2번째 Match부터 로그인"으로 옮겨졌고
코드도 그대로 구현되어, UX-8("로그인하면 대진이 초기화됨")의 근본 원인이 되었다.

실제 코드의 실상(2026-07-08 재확인):

1. 사이트가 방문자에게 `signInAnonymously`로 익명 계정을 부여한다(`lib/firebase.ts`).
2. `decideVoteGate`의 게스트 분기는 `!user` 기준이었는데, 익명 user는 non-null이라
   그 분기가 **절대 발동하지 않았다** → 익명 uid가 회원 분기(참가 대회 내 무제한)를 탔다.
3. 연쇄로 `sessionVoteUsed`가 안 찍혀 `PENDING_ANON_UID_KEY` 미설정 →
   `linkSessionVote` 미호출 → 로그인 후 빈 대진.
4. `linkSessionVote`는 votes + bracket_seeds만 이전(roundProgress·Crown Card 이전 없음).
5. `onVote`(서버)에 익명 uid 제한이 없어 게스트 제한이 클라이언트에만 존재했다.

## Decision

### 1. 게이트 기준을 `isAnonymous`로 전환 (스펙 오염 정정)

`decideVoteGate`는 `!user`가 아니라 **`isAnonymous`(또는 null user)** 로 게스트를 판별한다.
게스트 분기: (a) 완주 이력 → `login_required`, (b) 진입 대회와 다른 대회 → `login_required`,
(c) 첫 대회 또는 진행 중 같은 대회 → `allowed`. 비익명은 HF-1 Daily Participation Limit 유지.

### 2. 게스트 참가 대회 진실 — 클라이언트 prefix LIST 불가 (에뮬레이터 검증)

§확인 필요 1을 **추정 없이 rules 에뮬레이터로 검증**한 결과: `bracket_seeds` /
`roundProgress`의 doc-id-prefix 읽기 규칙(`seedId.split('_')[0] == request.auth.uid`)은
`get`(단일 문서)만 허가하고 **`list`(쿼리)는 거부**한다. `list` 연산에서는 doc-id
wildcard가 null이라 `split('_')`가 throw한다("Null value error for 'list' @ L230/L189").
→ 클라이언트는 prefix list로 게스트의 참가 대회 집합을 자가 발견할 수 없다.

**대안(이 ADR로 확정, 이중화):**
- 클라이언트(W2): `guestCompleted`는 **현재 대회** `roundProgress/{uid}_{tid}` 직접 get(허용),
  `guestTournamentId`는 **sessionStorage 마커**(`wc48_guest_run_tid`, 첫 투표 시 set-once).
  마커는 UX용(선제 LoginModal); localStorage 아님(D-1 §5 DON'T).
- 서버(W3, 권위): `onVote`가 익명 요청에 대해 admin SDK로 사실을 수집(admin은 list 거부를
  우회) → 정책 위반 시 `permission-denied`. 마커 부재/구식은 왕복 1회 비용일 뿐, 정확성은
  서버가 보장한다. 회귀 가드: `tests/rules/guest-run-rules.test.ts`.

### 3. Crown Card 이전 = Option A (재생성)

완주한 게스트 런을 로그인 시 새 uid로 이전할 때, `roundProgress/{googleUid}_{tid}`에
**2단계 쓰기**(create `complete=false` → update `complete=true` + `championId`)를 수행한다.
`onChampionConfirmed`(onDocumentUpdated)가 false→true edge를 보고 Crown Card를 새 uid
명의로 자동 재생성한다. 두 쓰기는 **반드시 별도 커밋**이어야 한다 — 단일 create가
`complete=true`를 담으면 onDocumentCreated만 발화하고 onDocumentUpdated는 발화하지 않는다.
Option B(문서 복사)는 §확인 필요 2가 불가로 판명될 때만 대체안이었으나, 2는 가능으로
검증되어 Option A로 확정(순수 코어 테스트 `onChampionConfirmedCore.test.ts`).

### 4. Daily Participation 병합 (한도 세탁 방지)

로그인 시 게스트 uid의 오늘(KST) `daily_participation` tournamentIds를 구글 uid 오늘 doc에
`arrayUnion` 한다. 이미 참가한 대회는 무제한 원칙이라 병합으로 6개째가 되어도 투표는 계속된다.

## Consequences

- **정상 사용자의 여정을 스펙대로**: 비로그인 1개 완주 → 로그인 → Crown Card 착지·공유.
- **완전 차단은 구조적으로 불가(수용)**: 시크릿 창·새 브라우저 = 새 익명 uid. rate limit
  (20/min, HF-1.5) + C-3 이상탐지가 보조 방어. 이 모듈의 목표는 어뷰저 봉쇄가 아니다.
- **새 탭 우회(마커 부재)**: sessionStorage 마커는 탭 단위 → 새 탭은 선제 게이트가 늦지만
  서버 가드가 여전히 차단한다.
- 이전 대상 증가로 `linkSessionVote` 클라이언트 타임아웃을 5s→10s로 상향. Crown Card 렌더는
  트리거로 비동기 유지(착지 페이지의 "카드 준비 중"이 지연을 흡수).

## Alternatives considered

- **Option B (Crown Card 문서 복사)**: §확인 필요 2가 가능으로 판명되어 불채택.
- **클라이언트 prefix LIST로 게스트 대회 자가 발견**: rules가 `list`를 거부하여 불가(위 2).
- **마커를 localStorage에 저장**: D-1 §5 DON'T(인증/세션 마커에 localStorage 금지) 위반.
