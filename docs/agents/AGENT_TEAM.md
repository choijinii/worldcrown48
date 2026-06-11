# WorldCrown48 — AGENT_TEAM.md
# v1.0 — 2026-05-23
# 에이전트 팀 구성 + 역할 정의 + 디자인/개발 방법론

> 이 문서는 WorldCrown48 1인 개발 체계에서 Claude가 수행하는
> 3개 에이전트 팀의 임무, 워크플로, 방법론을 정의합니다.

---

## 0. 에이전트 팀 전체 구조

```
┌─────────────────────────────────────────────────────┐
│                   대표 (기획자·결정권자)                  │
└───────────────────────┬─────────────────────────────┘
                        │ 지시 / 검토 / 승인
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │  Frontend    │ │  Backend     │ │  Test        │
  │  Agent       │ │  Agent       │ │  Agent       │
  └──────────────┘ └──────────────┘ └──────────────┘
```

**협업 원칙**:
- 각 에이전트는 담당 범위만 수정합니다 (CLAUDE.md §1-3 Surgical Changes)
- 범위 경계 충돌 시 대표에게 에스컬레이션
- 에이전트 간 API 계약은 `docs/lite-specs/`에서 관리

---

## 1. Frontend Agent

### 임무
Domain 0~6의 UI 컴포넌트, 페이지, 애니메이션, 다국어 렌더링을 구현합니다.

### 담당 범위
```
src/
  app/           — Next.js App Router 페이지 (Domain별 라우트)
  components/    — 재사용 UI 컴포넌트
  styles/        — Tailwind CSS 확장, 글로벌 CSS
  lib/i18n/      — 다국어 메시지 파일 (ko.json, en.json, es.json)
  hooks/         — 클라이언트 전용 React Hooks
  stores/        — Zustand 클라이언트 상태

docs/design/     — UI Kit, 디자인 시스템 참조 (읽기 전용)
```

### 핵심 기술스택
```yaml
Framework:    Next.js 14 (App Router)
Language:     TypeScript
Styling:      Tailwind CSS 3.4 + Shadcn/UI
Animation:    Framer Motion + GSAP 3.12 (ScrollTrigger)
State:        Zustand (클라이언트), React Server Components (서버)
i18n:         next-intl (ko / en / es)
```

### 디자인 방법론 (Design-First Workflow)

```
Step 1. DESIGN_BRIEF.md 확인
  → 금지 패턴 목록 체크
  → 디자인 토큰 최신 버전(v2.2) 확인

Step 2. 도메인 스펙 읽기
  → docs/lite-specs/{domain}.md
  → 다크/라이트 테마 확인

Step 3. 컴포넌트 계획
  → 기존 Shadcn/UI 컴포넌트 재사용 우선
  → 신규 컴포넌트만 새로 작성 (Simplicity First)

Step 4. Token → 코드 변환
  → CSS Variables 사용 (하드코딩 금지)
  → var(--color-gold) not #FCD006 directly

Step 5. Cinematic 요소 (Domain 0 전용)
  → Noise Overlay, GNB Island, Magnetic Button
  → GSAP ScrollTrigger parallax
  → docs/design/WC48_DESIGN_SYSTEM_v2.3.md §4-C, §10-A, §10-B 참조

Step 6. i18n 적용
  → useTranslations() hook 사용
  → 하드코딩 문자열 금지
  → 번역 키: domain.component.key 형식
```

### 컴포넌트 명명 규칙

```typescript
// 도메인별 네임스페이스
// Domain 0: L* (Launch)
// Domain 1: P* (Pitch)
// Domain 2: Lab* (Lab)
// Domain 3: A* (Arena)
// Domain 4: LR* (LockerRoom)
// Domain 5: PH* (PolicyHub)
// Domain 6: AD* (AdminDashboard)
// 공통: WC* (WorldCrown)

// 예시
export function PTournamentCard() { ... }   // Pitch의 TournamentCard
export function AVSBattle() { ... }         // Arena의 VS Battle
export function WCGNBIsland() { ... }       // 공통 GNB
```

### 체크리스트 (PR 전)
- [ ] 구버전 컬러 코드 없음 (#05070A, #0A0D12 등)
- [ ] "AI GENERATED" 배지 없음 → "● AI-Report"만
- [ ] Round 진행 표시 없음 (Tournament 목록 카드)
- [ ] "ENDS IN" 타이머 없음
- [ ] 모든 문자열 i18n 키 처리
- [ ] TypeScript 타입 에러 없음

---

## 2. Backend Agent

### 임무
Firebase 데이터 모델, Cloud Functions, API 엔드포인트, AI 연동(Claude API)을 구현합니다.

### 담당 범위
```
src/
  lib/firebase/     — Firebase 초기화, 공통 유틸
  lib/claude/       — Claude API 클라이언트 (Fan Intelligence)
  lib/news/         — GNews 연동, AI-Report 생성
  app/api/          — Next.js API Routes (서버 액션)
  functions/        — Firebase Cloud Functions

firestore.rules     — 보안 규칙
firestore.indexes.json — 인덱스 설정
```

### 핵심 기술스택
```yaml
Database:     Firebase Firestore + Realtime DB
Auth:         Firebase Auth (Anonymous + Google OAuth)
Functions:    Firebase Cloud Functions v2 (Node.js 18)
AI:           Claude API (claude-sonnet-4-20250514)
News:         GNews API (외부)
Queue:        Firebase Extensions (또는 Cloud Tasks)
```

### 데이터 모델 핵심 원칙

```
⚠️ Round는 DB 문서로 존재하지 않는다.
   Round = Voter의 현재 진행 상태 (메모리 내 계산값)

Firestore 컬렉션 구조:
  /tournaments/{tid}           — Tournament 메타데이터
  /tournaments/{tid}/contestants/{cid}  — Contestant 목록
  /tournaments/{tid}/matches/{mid}      — Match 결과 (집계)
  /voters/{uid}/progress/{tid}          — Voter 개인 진행 상태
    └── currentRound: number             ← Round 상태는 여기만
    └── completedMatches: string[]
    └── votes: { [matchId]: "left"|"right" }
  /news/{nid}                  — AI-Report 기사
```

### Tournament 상태 머신

```
draft → published → active → closed → completed

유효한 상태: draft | published | active | closed | completed
❌ 무효: "In Progress", "ongoing", "running"
```

### advanceRound() 패턴

```typescript
// Voter가 현재 Round의 마지막 Match 완료 시 자동 호출
async function advanceRound(voterId: string, tournamentId: string): Promise<void> {
  // Round는 DB에 없음 — Voter progress에서 계산
  const progress = await getVoterProgress(voterId, tournamentId);
  const currentRoundMatches = getRoundMatches(progress.currentRound, 48);
  
  const allCompleted = currentRoundMatches.every(
    mid => progress.completedMatches.includes(mid)
  );
  
  if (allCompleted) {
    await updateVoterProgress(voterId, tournamentId, {
      currentRound: progress.currentRound + 1
    });
  }
}
```

### AI-Report 생성 워크플로 (Fan Intelligence)

```
Trigger: Match 결과 집계 후 (Cloud Function)
  ↓
GNews API 검색 (Contestant 이름 키워드)
  ↓
Claude API 호출 (claude-sonnet-4-20250514)
  → 프롬프트: Fan perspective + WC48 서비스 정체성 준수
  → 금지: odds/prediction/betting 언어
  ↓
AI-Report 저장 (/news/{nid})
  → badge: "● AI-Report"
  → source: "Fan Intelligence"
  ↓
Frontend 표시 (Arena 뉴스룸)
```

### 보안 원칙

```typescript
// 역할 확인 — 반드시 분리
isSystemAdmin(user)                    // 플랫폼 전체
isTournamentHost(user, tournamentId)   // 특정 Tournament만

// Firestore Rules: Voter는 자신의 progress만 쓸 수 있음
match /voters/{uid}/progress/{tid} {
  allow write: if request.auth.uid == uid;
}
```

### 체크리스트 (PR 전)
- [ ] Round 관련 Firestore 컬렉션 없음
- [ ] Tournament 상태값이 유효한 enum 값
- [ ] AI-Report 생성 시 betting/odds 언어 없음
- [ ] isSystemAdmin / isTournamentHost 역할 분리
- [ ] 이미지 소싱 Level 확인 (Level 3 절대 금지)

---

## 3. Test Agent

### 임무
단위 테스트, 통합 테스트, E2E 테스트를 작성하고 CI/CD 파이프라인을 관리합니다.

### 담당 범위
```
__tests__/
  unit/         — 컴포넌트 단위 테스트 (Vitest + React Testing Library)
  integration/  — API + Firebase 통합 테스트
  e2e/          — Playwright E2E 테스트 (사용자 플로우)

.github/workflows/
  ci.yml        — GitHub Actions CI 파이프라인
```

### 핵심 기술스택
```yaml
Unit:         Vitest + React Testing Library
Integration:  Firebase Emulator Suite
E2E:          Playwright
Coverage:     c8 / Istanbul
CI:           GitHub Actions
```

### 테스트 방법론

#### Goal-Driven Testing (CLAUDE.md §1-4)

```
"밸리데이션 추가" → 잘못된 입력 테스트 작성 → 통과시키기
"버그 수정"       → 버그 재현 테스트 작성 → 통과시키기
"리팩터"         → 리팩터 전후 테스트 통과 확인
```

#### 핵심 테스트 케이스 (비즈니스 로직 중심)

```typescript
// ✅ Round는 Voter 개인값 — DB에 없음
describe("advanceRound()", () => {
  it("마지막 Match 완료 시 currentRound +1", async () => { ... });
  it("중간 Match 완료 시 Round 전환 없음", async () => { ... });
  it("Tournament에 Round 문서 생성 안 됨", async () => { ... });
});

// ✅ Tournament 상태 유효성
describe("Tournament status", () => {
  it("허용: draft|published|active|closed|completed", async () => { ... });
  it("거부: 'In Progress', 'ongoing'", async () => { ... });
});

// ✅ Contestant = 48개 (사람 한정 아님)
describe("Tournament creation", () => {
  it("48개 Contestant로 생성 성공", async () => { ... });
  it("47개 또는 49개 → 에러", async () => { ... });
});

// ✅ Vote Rate만 노출 (Count 금지)
describe("Vote display", () => {
  it("Vote Rate(%)만 반환", async () => { ... });
  it("Vote Count 절대 수치 노출 안 됨", async () => { ... });
});
```

#### E2E 핵심 플로우

```
Voter 투표 플로우 (Happy Path):
  1. Launch Pad 랜딩 → Join 버튼
  2. The Pitch → Tournament 선택
  3. The Arena → 48강 Match 1 투표
  4. Match 연속 투표 (24 Match)
  5. advanceRound() → 24강 전환
  6. ... → Champion → Crown Card 생성
  7. Crown Card 공유

Admin 플로우:
  1. 로그인 (isSystemAdmin)
  2. The Lab → Tournament 생성 (48개 Contestant)
  3. Tournament 상태 draft → published → active
  4. Admin Dashboard 모니터링
```

### CI 파이프라인

```yaml
# .github/workflows/ci.yml 핵심 스텝
steps:
  - unit-tests:        Vitest (< 30초 목표)
  - integration-tests: Firebase Emulator (< 2분 목표)
  - e2e-tests:         Playwright (< 5분 목표, MVP 1 핵심 플로우만)
  - build-check:       Next.js build 에러 없음
  - type-check:        TypeScript 에러 없음
```

### 체크리스트 (PR 전)
- [ ] 새 비즈니스 로직에 테스트 추가됨
- [ ] advanceRound() 테스트 통과
- [ ] Tournament 상태 유효성 테스트 통과
- [ ] Firebase Emulator로 통합 테스트 실행 (실제 DB 아님)
- [ ] E2E: 핵심 Voter 플로우 통과

---

## 4. 에이전트 공통 원칙

### 코딩 기준 (CLAUDE.md §1 전체 준수)

```
1. 구현 전 가정 명시 — 불확실하면 대표에게 질문
2. 요청한 것만 구현 — 추가 기능·추상화 금지
3. 건드릴 것만 건드림 — 인접 코드 개선 금지
4. 검증 가능한 목표로 작업 분리
```

### 에스컬레이션 기준

대표에게 반드시 확인을 받아야 하는 경우:
- Firestore 스키마 변경 (새 컬렉션/필드 추가)
- 외부 API 추가 (비용 발생)
- 불변 원칙 예외 요청 (테마 변경, 용어 변경 등)
- MVP 마일스톤 범위 외 작업

---

## 5. 변경 이력

| 버전 | 날짜 | 주요 변경 |
|------|------|-----------|
| v1.0 | 2026-05-23 | 최초 작성. Frontend / Backend / Test Agent 정의 |

---

*© 2026 WorldCrown48 | AGENT_TEAM.md v1.0 | CONFIDENTIAL*
