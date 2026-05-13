# WorldCrown48 (월크48) — CLAUDE.md
# v1.1 — 2026-05-13

> **이 파일은 Claude Code 에이전트가 가장 먼저 읽는 프로젝트 진입점입니다.**
> 코딩 행동 규칙 + 도메인 컨텍스트 라우터 + 불변 원칙을 하나로 통합합니다.

---

## 0. 문서 체계 — 어디에 무엇이 있는가

```
CLAUDE.md      ← 지금 이 파일. 에이전트 진입점 + 코딩 규칙 + 불변 원칙 요약
CONTEXT.md     ← "프로젝트가 지금 어디까지 왔는가" (현황·정책·기술 요약)
LANGUAGE.md    ← "용어를 어떻게 쓰는가" (공식 용어 정의 — 단일 진실 공급원)
ProjectSkill   ← "Claude가 어떻게 일하는가" (에이전트 임무·협업 가이드)
docs/adr/      ← 아키텍처 결정 기록 (Architecture Decision Records)
```

> ⚠️ **용어 충돌 시 우선순위**: LANGUAGE.md > CONTEXT.md > ProjectSkill
> (ProjectSkill v1.4에 일부 구용어 잔존 — LANGUAGE.md v1.2가 최종 기준)

---

## 1. 코딩 행동 규칙 (Karpathy Guidelines)

**트레이드오프:** 이 규칙은 속도보다 신중함에 비중을 둡니다. 사소한 작업은 판단에 맡기세요.

### 1-1. Think Before Coding — 가정을 드러내라

- 구현 전에 가정(assumptions)을 명시적으로 진술하세요. 불확실하면 물어보세요.
- 여러 해석이 가능하면 전부 제시하세요 — 조용히 하나만 골라 진행하지 마세요.
- 더 단순한 방법이 있으면 말하세요. 필요하면 반론을 제기하세요.
- 무엇이 헷갈리는지 모르겠으면 멈추고, 헷갈리는 부분을 이름 붙이고, 질문하세요.

### 1-2. Simplicity First — 요청한 것만 구현하라

- 요청받지 않은 기능, 추상화, 유연성, 설정 옵션 금지.
- 불가능한 시나리오에 대한 에러 핸들링 금지.
- 200줄로 쓸 걸 50줄로 줄일 수 있다면 다시 써라.
- 자문: "시니어 엔지니어가 이걸 보고 '과하다'고 할까?" → 그렇다면 간소화.

### 1-3. Surgical Changes — 건드릴 것만 건드려라

기존 코드를 수정할 때:
- 인접 코드, 주석, 포매팅을 "개선"하지 마세요.
- 기존 스타일에 맞추세요, 당신이 다르게 쓴다 해도.
- 관련 없는 데드코드를 발견하면 삭제하지 말고 언급만 하세요.
- **내 변경으로 인해** 생긴 미사용 import/변수/함수만 제거하세요.

테스트: 변경된 모든 줄이 사용자 요청에 직접 연결되는가?

### 1-4. Goal-Driven Execution — 검증 가능한 성공 기준으로 루프

작업을 검증 가능한 목표로 변환:
```
"밸리데이션 추가" → "잘못된 입력 테스트 작성 → 통과시키기"
"버그 수정"       → "버그 재현 테스트 작성 → 통과시키기"
"리팩터"         → "리팩터 전후 테스트 통과 확인"
```

다단계 작업은 간결한 계획을 먼저:
```
1. [단계] → 검증: [확인 방법]
2. [단계] → 검증: [확인 방법]
3. [단계] → 검증: [확인 방법]
```

---

## 2. 월크48 서비스 정체성 (절대 불변)

```
월크48 = 팬이 좋아하는 Contestant를 투표하는 서비스 (이상형 월드컵 방식)

절대 금지:
  ✗ 우승자 예측 게임 / 스포츠 베팅·내기 연동
  ✗ 실제 경기 결과와 연동 / 외부 일정에 자동 종속
  ✗ Vote Count(절대 수치) UI 노출
```

---

## 3. 핵심 불변 원칙 (8가지)

| # | 원칙 | 상세 |
|---|------|------|
| 1 | **듀얼 테마** | 핵심 화면(Pitch, Arena, Lab, Launch Pad) = 다크, 유틸리티 화면(Locker Room, Policy Hub, Admin Dashboard) = 라이트 허용. 배경색 고정 아님 — 도메인별 팔레트 범위 내에서 유연 적용 |
| 2 | **Pure Gold만** | 포인트 컬러 `#FFD700`만. 다크·라이트 양쪽 테마 모두 적용. 형광 노랑/그린 금지 |
| 3 | **한국적 요소 금지** | 글로벌 MZ Sporty 럭셔리 |
| 4 | **AI 생성 표기 의무** | "AI GENERATED" 배지 필수 |
| 5 | **FIFA 상표권 준수** | "FIFA", "Official" 표기 금지 |
| 6 | **3단계 이미지 소싱 정책** | Level 1 자동 허용(CC 라이선스·공식 프로필) + Level 2 관리자 수동 승인(공개 SNS·보도자료) + Level 3 절대 금지(사생활·미성년자·딥페이크). 상세는 §3-A 참조 |
| 7 | **웹 전용** | 모바일 앱 없음. Flutter 전환 계획 없음 |
| 8 | **스택 고정** | Next.js 14 + Firebase. 변경 시 ADR 필수 |

### §3-A. 듀얼 테마 — 도메인별 적용 기준

```
🌑 다크 테마 (브랜드 핵심 화면):
  Domain 0: Launch Pad
  Domain 1: The Pitch
  Domain 2: The Lab
  Domain 3: The Arena

☀️ 라이트 테마 허용 (유틸리티 화면):
  Domain 4: The Locker Room
  Domain 5: Policy Hub
  Domain 6: Admin Dashboard
```

### §3-B. 3단계 이미지 소싱 정책 (Contestant 이미지)

```
Level 1: 자동 허용 (관리자 승인 불필요)
  • 위키피디아 / 위키미디어 커먼즈 (CC 라이선스 이미지)
  • 각국 축구협회·공식 리그 사이트의 선수 프로필 이미지
  • 출처 자동 표기: 이미지 하단 "Source: Wikipedia" 등
  → AI 채유기(AI Fill) 자동 조회 대상

Level 2: 관리자 수동 승인
  • 본인이 공개 설정한 SNS 프로필 사진
  • 공식 소속사/구단 보도자료(Press Kit) 이미지
  • 관리자가 URL 입력 → 출처 기록 자동 저장 (감사 로그)

Level 3: 절대 금지
  ✗ 파파라치/사생활 사진
  ✗ 비공개 SNS 캡처 이미지
  ✗ 미성년자(18세 미만) 이미지
  ✗ AI 생성 실존 인물 얼굴 (딥페이크)
  ✗ 유료 스톡 이미지 무단 사용
```

```
DMCA 대응 (MVP 1 필수):
  1. 모든 Contestant 이미지에 출처(source URL) 메타데이터 필수 저장
  2. 이미지 신고 버튼: "이 이미지의 권리자입니다" → 즉시 비공개 처리
  3. DMCA Takedown 요청 이메일 Policy Hub에 공개
  4. 신고 접수 → 24시간 내 이미지 제거 프로세스

MVP 2 확장:
  5. 초상권 문제 시 → AI 일러스트 아바타로 자동 교체 옵션
```

---

## 4. 기술 스택 (확정)

```yaml
프론트엔드:  Next.js 14 (App Router) + TypeScript
UI/UX:      Tailwind CSS 3.4 + Shadcn/UI + Framer Motion + Zustand
백엔드:     Firebase (Firestore + Realtime DB + Auth + Cloud Functions)
AI:         Claude API (claude-sonnet-4-20250514)
호스팅:     Vercel (프론트) + Firebase (백엔드)
CDN/보안:   Cloudflare
도메인:     worldcrown48.com
```

### 디자인 토큰 — 듀얼 테마 팔레트

```css
/* ── 다크 테마 (Domain 0, 1, 2, 3) ── */
--color-bg-deep:    #05070A;   /* 가장 깊은 배경 — Arena Hero 등 */
--color-bg-default: #0A0D12;   /* 기본 다크 배경 */
--color-bg-soft:    #0E1217;   /* 카드/패널 배경 */
--color-gold:       #FFD700;   /* 브랜드 골드 (양쪽 테마 공통) */
--color-text:       #F8FAFC;   /* 다크 테마 기본 텍스트 */
--color-border:     #30363D;   /* 다크 테두리 */
--color-muted:      #8B949E;   /* 다크 보조 텍스트 */

/* ── 라이트 테마 (Domain 4, 5, 6) ── */
--color-bg-light:      #FAFBFC;   /* 라이트 배경 */
--color-surface-light:  #FFFFFF;   /* 라이트 카드 배경 */
--color-text-light:     #1A1A2E;   /* 라이트 기본 텍스트 */
--color-border-light:   #E2E8F0;   /* 라이트 테두리 */
--color-muted-light:    #64748B;   /* 라이트 보조 텍스트 */
```

> 다크 배경은 `#05070A` 단일 고정이 아닙니다.
> 도메인 성격에 따라 `--color-bg-deep` ~ `--color-bg-soft` 범위 내에서 유연하게 적용합니다.
> `--color-gold: #FFD700`만 양쪽 테마에서 공통 필수입니다.

---

## 5. 대진 흐름 핵심 원칙 (v0.2 기준)

```
1. Tournament에만 Deadline이 존재한다 (Tournament Deadline)
2. Round에는 Deadline이 없다 — Voter 투표 흐름에 따라 시스템이 자동 전환
3. 라운드 전환: Voter가 해당 Round 마지막 Match 완료 → advanceRound() 자동 실행
4. Match는 Voter에게 순서대로 하나씩 제시됨 (동시 진행 아님)
5. Tournament Host는 Tournament Deadline만 설정. 라운드 수동 전환 기능 없음
```

Voter 1명의 흐름:
```
48강(24 Match) → 24강(12) → 12강(6) → 6강(3) → 결승(1)
→ Champion → Crown Card → 공유
```

> 상세는 `CONTEXT.md` §대진 흐름 핵심 원칙 참조

---

## 6. 용어 규칙 (필수 준수)

> **상세 정의**: `LANGUAGE.md v1.2` (단일 진실 공급원)

### 빠른 참조 — 필수 용어

| ✅ 공식 용어 | ❌ 사용 금지 |
|-------------|-------------|
| Tournament | 대회, 이벤트, 게임 |
| Contestant | Candidate, 참가자, 후보자 |
| Match | Battle, 배틀, 경기 |
| Voter | 참여자, 유저, 사용자 |
| Champion | 우승자, 1등 |
| Crown Card | 결과 이미지, 결과 카드 |
| Tournament Deadline | Round Deadline (존재하지 않는 개념) |
| advanceRound() (시스템 자동) | Host가 라운드를 전환한다 |

### 역할 3가지 (혼용 금지)

```
System Admin  → role: 'admin'   → 플랫폼 전체 권한 (MVP: 대표님)
Tournament Host → role: 'host'  → 본인 Tournament 관리 (MVP: Admin만 가능)
Voter         → role: 'voter'   → 투표 참여자
```

```typescript
// ✅ 권한 확인 — 반드시 분리
isSystemAdmin(user)                    // 플랫폼 전체
isTournamentHost(user, tournamentId)   // 특정 Tournament만
```

---

## 7. Agent Skills

### Issue tracker
Issues live in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels
기본 레이블 사용 (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).
See `docs/agents/triage-labels.md`.

### Domain docs
Single-context repo — `CONTEXT.md` at root + `docs/adr/`.
See `docs/agents/domain.md`.

### 에이전트 임무 템플릿
모든 Claude Code 작업 시작 시 `ProjectSkill.md` PART 8 템플릿 참조.

---

## 8. 7개 도메인 구조

```
Domain 0: Launch Pad       — 사전 랜딩·웨이트리스트 (MVP 1)        [📱+🖥️] 🌑 다크
Domain 1: The Pitch        — 메인 홈·트렌딩 (MVP 1)               [📱+🖥️] 🌑 다크
Domain 2: The Lab          — 대진 생성 (관리자 전용, 비공개)       [🖥️]    🌑 다크
Domain 3: The Arena        — 투표·Crown Card·뉴스룸 (MVP 1)       [📱+🖥️] 🌑 다크
Domain 4: The Locker Room  — 유저 프로필 (MVP 2)                   [📱+🖥️] ☀️ 라이트
Domain 5: Policy Hub       — 정책·쿠키 (MVP 1)                    [📱+🖥️] ☀️ 라이트
Domain 6: Admin Dashboard  — 관리자 대시보드 (MVP 1 일부)          [🖥️]    ☀️ 라이트
```

---

## 9. MVP 마일스톤

| 단계 | 시기 | 핵심 |
|------|------|------|
| MVP 1 | 2026년 6월 전 | Domain 0~3 + 5~6 일부, 투표 엔진, Crown Card, 뉴스룸 |
| MVP 2 | 2026년 7월 | AI 뉴스 생성, K-POP, Locker Room, 다국어 |
| MVP 3 | 2026년 하반기 | B2B SaaS, PR 배포, 수익 모델 |

---

## 10. 이 가이드라인이 잘 작동하고 있다면

- diff에 불필요한 변경이 줄어든다
- 과도한 복잡성으로 인한 재작성이 줄어든다
- 명확화 질문이 구현 **전에** 나온다 (실수 후가 아니라)
- 용어가 LANGUAGE.md와 일치한다

---

## 변경 이력

| 버전 | 날짜 | 주요 변경 |
|------|------|-----------|
| **v1.1** | **2026-05-13** | **불변 원칙 §3 개정** |
| | | ★ "다크모드 전용" → "듀얼 테마" 전환 (다크 4 도메인 + 라이트 3 도메인) |
| | | ★ 배경색 #05070A 단일 고정 폐지 → 다크 팔레트 범위(deep/default/soft) 유연 적용 |
| | | ★ 라이트 테마 팔레트 신규 정의 (Domain 4, 5, 6) |
| | | ★ "초상권 보호(수동만)" → "3단계 이미지 소싱 정책" 전환 |
| | | §3-A 듀얼 테마 도메인별 적용 기준 신규 |
| | | §3-B 이미지 소싱 Level 1(자동)/Level 2(수동 승인)/Level 3(금지) 신규 |
| | | DMCA 대응 프로세스 + MVP 2 AI 아바타 대체 옵션 추가 |
| | | 도메인 구조(§8)에 테마 표시 추가 |
| v1.0 | 2026-05-13 | 최초 병합 버전 작성 |
| | | 기존 CLAUDE.md (Agent skills) 유지 |
| | | Karpathy 코딩 가이드라인 4개 섹션 통합 |
| | | 월크48 서비스 정체성·불변 원칙·기술 스택 요약 추가 |
| | | 대진 흐름 핵심 원칙 (CONTEXT.md v0.2 기준) 반영 |
| | | 용어 빠른 참조 + 역할 분리 규칙 추가 |
| | | 7개 도메인·MVP 마일스톤 요약 추가 |
| | | 문서 체계 라우터 (섹션 0) 신규 |

---

*© 2026 WorldCrown48 | 작성: 48티오 | CLAUDE.md v1.1 | CONFIDENTIAL*
