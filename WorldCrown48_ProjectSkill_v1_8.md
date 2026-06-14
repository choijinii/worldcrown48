---
name: worldcrown48-project-skill
description: >
  WorldCrown48(월크48) 프로젝트의 핵심 지식 파일입니다.
  Claude가 월크48 관련 모든 작업을 수행할 때 이 파일을 우선 참조하세요.
  기술 결정, 서비스 정체성, 투표 정책, 아키텍처 원칙, 디자인 토큰이 모두 담겨 있습니다.
  이 스킬은 다음 상황에서 반드시 사용합니다:
  - 월크48 코드 작성 또는 수정 요청
  - UI·디자인 작업 (컴포넌트, 화면, 색상 적용)
  - 투표 정책 관련 질문
  - 대진/라운드/경기 구조 설계
  - 기술 스택 선택 관련 질문
  - Tournament Host / Voter 권한 관련 작업
  - MVP 기능 범위 확인
  - 로컬 파일 관리 및 터미널 작업 안내
  - Claude 협업 방식 관련 질문
  - 다국어(i18n) 정책 관련 질문
  - 에이전트 팀(Frontend/Backend/Test) 역할 관련 질문
---

# WorldCrown48 (월크48) — 프로젝트 마스터 스킬 v1.8

> ⚠️ **v1.8 핵심 변경** (2026-05-23)
> - PART 5 디자인 토큰: v2.1 → v2.2 Twilight Stadium 팔레트 업데이트
> - PART 3 용어: "48명" → "48개" (Contestant = 사람 한정 아님)
> - PART 12 신규: 에이전트 팀(Frontend/Backend/Test) 구조
> - PART 13 신규: 다국어(i18n) 정책 요약
> - PART 10-7 문서 우선순위: DESIGN_BRIEF.md 추가
> - 구버전 참조: v2.1 → v2.2, ProjectSkill v1.6 → v1.7 업데이트

---

## ⛔ IMMUTABLE TERMINOLOGY RULE — 절대 불변 용어 규칙

> **RULE 1: NEVER change or overwrite an established term definition.**
> **RULE 2: When a new concept arises, CREATE A NEW TERM. Do NOT redefine existing terms.**
>
> 이 규칙은 모든 에이전트, 모든 세션, 모든 기여자에게 예외 없이 적용된다.
> 기존 용어를 임의로 변경하면 전체 모듈과 AI 뉴스 생성 전반에 연쇄 오류가 발생한다.
> 용어 정의의 단일 진실 공급원: `LANGUAGE.md`

---

## PART 1 — 서비스 정체성 (가장 중요)

### 월크48이란?

```
서비스명: WorldCrown48 (월크48)
도메인:   worldcrown48.com
성격:     글로벌 팬 투표 플랫폼 (이상형 월드컵 방식)
목표:     2026년 FIFA 북중미 월드컵 시즌에 글로벌 런칭
```

### ✅ 서비스의 본질 — 반드시 기억할 것

```
월크48 = 팬이 좋아하는 Contestant를 투표하는 서비스

투표의 의미:
  "나는 이 후보가 더 좋다" (팬의 선호 표현)
  → 현실 경기 결과 예측 아님
  → 내기/베팅 아님
  → 객관적 순위 평가 아님
```

### ❌ 이런 이해는 완전히 틀렸습니다

| 틀린 이해 | 올바른 이해 |
|-----------|-------------|
| "라운드별 기간이 정해져 있다" | Round에는 Deadline 없음, Tournament Deadline만 있음 |
| "시스템이 자동으로 라운드를 종료한다" | Voter가 해당 Round 마지막 Match 완료 → advanceRound() 자동 전환 |
| "Host가 수동으로 다음 라운드를 시작한다" | Host는 라운드에 관여하지 않음 |
| "투표 결과로 우승 예측 정확도를 평가" | 예측 게임이 아님 |
| "다크 배경은 #05070A 고정이다" | Twilight Stadium 네이비-인디고 팔레트 범위 내 유연 적용 |

---

## PART 2 — 핵심 역할 3가지

> ⚠️ 세 역할을 절대 혼용하지 말 것. 코드 함수명도 반드시 분리.

```
System Admin (시스템 관리자)       →  role: 'admin'
  플랫폼 전체 운영·관리. DB 접근, 전체 유저 관리, 최상위 권한.
  MVP에서는 대표님 본인.

Tournament Host (대진을 만든자)    →  role: 'host'
  Tournament를 생성하고 Tournament Deadline을 설정하는 사람.
  본인이 만든 Tournament에 대한 관리 권한만 보유.
  MVP에서는 System Admin만 Host 가능.

Voter (투표 참여자)                →  role: 'voter'
  Tournament에 참여하여 Vote하는 일반 사용자.
  계정당 동일 Tournament에서 1일 5 Match 투표 가능.
```

```typescript
// 권한 확인 함수 — 반드시 분리 사용
const isSystemAdmin = (user: User) => user.role === 'admin';
const isTournamentHost = (user: User, tournament: Tournament) =>
  user.role === 'admin' || tournament.hostUid === user.uid;
```

---

## PART 3 — 대진(Tournament) 구조 완전 이해

### 핵심 용어 정의 (LANGUAGE.md v1.2 기준)

```
Tournament (대진):
  **48개**의 Contestant이 참여하는 하나의 완전한 이상형 월드컵 이벤트.
  Contestant는 사람뿐 아니라 팀·캐릭터·음식 등 모든 개체가 될 수 있음 → "48명" 아닌 "48개".
  Tournament Host가 생성하고 Tournament Deadline을 설정.

Round (라운드):
  Tournament의 진행 단계: 48강 → 24강 → 12강 → 6강 → Final.
  Round에는 Deadline이 없음.
  Voter가 해당 Round 마지막 Match 완료 → advanceRound() 자동 실행.

Match (매치):
  두 Contestant의 1:1 투표.
  Voter에게 순서대로 하나씩 제시됨 (동시 진행 아님).
  48강 = 24 Matches, 24강 = 12 Matches, 12강 = 6, 6강 = 3, 결승 = 1.
```

### Tournament Deadline 원칙

```
✅ Tournament Deadline = Tournament Host가 설정하는 Tournament 전체의 마감일시
✅ Round에는 Deadline이 없음 — Voter 투표 흐름에 따라 시스템 자동 전환
✅ advanceRound()는 Voter 행동(마지막 Match 완료) 트리거, 시간 기반 아님

❌ "48강은 24시간" 같은 자동 기간 로직 금지
❌ rounds[].deadline 필드 Firestore 스키마에서 절대 금지
❌ Host가 라운드를 수동 전환하는 기능 없음
```

### Tournament 생명주기

```
1. Tournament Host가 Tournament 생성 + Contestant **48개** 설정 + Tournament Deadline 설정
2. 48강 시작 → 24 Match 순서대로 진행 → 24번째 완료 → advanceRound() 자동
   → Round Transition: "맨 어브 더 월드컵 24강"
3. 24강 → 12강 → 6강 → 결승 동일 방식 자동 진행
4. 결승 → Champion 확정 → Crown Card 자동 생성 → SNS 공유
```

---

## PART 4 — 투표 정책 (CONTEXT.md v0.3 확정 — ★ v1.7 교정)

### 핵심 규칙

```
계정당 동일 Tournament에서 1일 5 Match 투표 가능  ← ★ v1.7 교정 (구버전 오기: "1일 1회")
자정 리셋: KST 00:00 기준 카운트 초기화
복수 Tournament: 각 Tournament별 독립 5회 카운트
계정 신뢰성: Google / Apple 소셜 로그인 필수 (익명 계정 없음)
랭킹 노출: Vote Rate(%) + 1시간 캐시만 표시. Vote Count 절대 노출 금지.
```

### 부정투표 방어 (MVP 단계별)

```
MVP 1: Rate Limiting (1분 10회+ → 15분 쿨다운) + 소셜 로그인 필수
MVP 2: fingerprintjs 디바이스 핑거프린트 + IP 중복 방지
MVP 3: 3단계 차단 시스템 (소프트/하드/영구) + 관리자 UI
```

### Firestore votes 스키마

```typescript
{
  voterId:      string;   // Firebase Auth uid
  tournamentId: string;
  matchId:      string;
  winnerId:     string;   // 선택된 Contestant ID (★ v1.7: candidateId → winnerId)
  timestamp:    Timestamp;
  voteDate:     string;   // 'YYYY-MM-DD KST' — 1일 5회 카운트용
  ipHash:       string;
}
// 일일 투표 확인: voterId == ? AND tournamentId == ? AND voteDate == TODAY → count < 5
```

---

## PART 5 — 기술 스택 (v4.1 확정 — ★ v1.7 디자인 토큰 전면 교정)

### 확정 스택

```yaml
프론트엔드:  Next.js 14 (App Router) + TypeScript
UI/UX:      Tailwind CSS 3.4 + Shadcn/UI + Framer Motion + GSAP
상태 관리:   Zustand
백엔드:     Firebase (Firestore + Realtime DB + Auth + Cloud Functions)
AI:         Claude API (claude-sonnet-4-20250514)
뉴스:       GNews API Basic $9/월 (MVP 1) → Claude API (MVP 2)
호스팅:     Vercel (프론트) + Firebase (백엔드)
CDN/보안:   Cloudflare
미사용:     Flutter Web (MVP 전 기간 사용 금지)
```

### ★ 디자인 토큰 — WC48_DESIGN_SYSTEM_v2.3.md 기준 (Twilight Stadium v2.3)

> ⛔ **경고**: CLAUDE.md·CONTEXT.md의 색상 토큰은 구버전(v1 시절)입니다.
> UI·코드 작업 시 절대 사용 금지. 반드시 아래 값 또는 WC48_DESIGN_SYSTEM_v2.3.md를 참조.
> DESIGN_BRIEF.md의 "금지 패턴" 목록도 함께 확인하세요.

```css
/* ━━━ 다크 테마 (Domain 0, 1, 2, 3) ━━━ */

/* 배경 팔레트 — Twilight Stadium */
--color-bg-deep:      #00003A;   /* Deep Osidian (구: #05070A) */
--color-bg-default:   #0E0944;   /* Deep Twilight (구: #0A0D12) */
--color-bg-soft:      #241754;   /* Twilight Soft (구: #0E1217) */
--color-bg-elevated:  #362261;   /* Twilight Indigo */
--color-bg-charcoal:  #1E1E24;   /* GNB Island 배경 */

/* Gold — 양쪽 테마 공통 필수 */
--color-gold:         #FCD006;   /* Crown Gold (변경 없음) */
--color-gold-bright:  #FBB03B;
--color-gold-hover:   #E3BB05;
--color-gold-subtle:  rgba(252, 208, 6, 0.12);
--color-gold-glow:    rgba(252, 208, 6, 0.25);
--color-aura:         #EEDA7D;   /* Aura Yellow — 부드러운 강조 */

/* 액센트 */
--color-crimson:      #D7063A;   /* VS 우측, Live, 에러 */
--color-turquoise:    #00A3B7;   /* 투표 완료, 성공 */
--color-powder:       #B1B5C4;   /* 보조 텍스트 */

/* 텍스트 */
--color-text:         #F2F2F5;   /* Off-White (구: #F8FAFC) */
--color-text-sub:     #B1B5C4;
--color-text-muted:   #484B67;   /* (구: #8B949E) */

/* 테두리 */
--color-border:       #2D1C5A;   /* (구: #30363D) */
--color-border-gold:  rgba(252, 208, 6, 0.30);

/* ━━━ 라이트 테마 (Domain 4, 5, 6) ━━━ */
--color-bg-light:         #F2F2F5;   /* (구: #FAFBFC) */
--color-surface-light:    #FFFFFF;
--color-text-light:       #241754;   /* (구: #1A1A2E) */
--color-text-muted-light: #6B7A99;
--color-border-light:     #D4DCE3;   /* (구: #E2E8F0) */

/* ━━━ 그림자 ━━━ */
--shadow-card:     0 4px 24px rgba(0, 0, 58, 0.50);
--shadow-gold:     0 0 32px rgba(252, 208, 6, 0.25);
--shadow-crimson:  0 0 24px rgba(215, 6, 58, 0.25);
--shadow-turquoise:0 0 24px rgba(0, 163, 183, 0.20);
--shadow-gnb:      0 8px 32px rgba(0, 0, 58, 0.40);

/* ━━━ 모서리 반경 ━━━ */
--radius-card:      24px;
--radius-card-hero: 32px;
--radius-modal:     20px;
--radius-panel:     16px;
--radius-btn:       12px;
--radius-badge:     8px;
--radius-chip:      999px;
```

### 구버전 → v2.1 마이그레이션 빠른 참조

| 용도 | 구버전 (❌ 사용 금지) | v2.1 정확한 값 |
|------|---------------------|---------------|
| 가장 깊은 배경 | `#05070A` | `#00003A` |
| 기본 배경 | `#0A0D12` | `#0E0944` |
| 카드 배경 | `#0E1217` | `#241754` |
| 기본 텍스트 | `#F8FAFC` | `#F2F2F5` |
| 테두리 | `#30363D` | `#2D1C5A` |
| 보조 텍스트 | `#8B949E` | `#484B67` |
| 라이트 배경 | `#FAFBFC` | `#F2F2F5` |
| 라이트 텍스트 | `#1A1A2E` | `#241754` |
| 라이트 테두리 | `#E2E8F0` | `#D4DCE3` |

---

## PART 6 — 도메인 및 권한 구조

### 7개 도메인

```
Domain 0: Launch Pad      (/)            🌑 다크  [📱+🖥️]  MVP 1
Domain 1: The Pitch       (/)            🌑 다크  [📱+🖥️]  MVP 1
Domain 2: The Lab         (/admin/lab)   🌑 다크  [🖥️]     MVP 2
Domain 3: The Arena       (/arena/[id])  🌑 다크  [📱+🖥️]  MVP 1
Domain 4: The Locker Room (/profile)     ☀️ 라이트 [📱+🖥️]  MVP 2
Domain 5: Policy Hub      (/policies)    ☀️ 라이트 [📱+🖥️]  MVP 1
Domain 6: Admin Dashboard (/admin)       ☀️ 라이트 [🖥️]     MVP 1
```

반응형 확인 기준: 모바일(375px) / 태블릿(768px) / 데스크탑(1440px)

---

## PART 7 — 48 Nodes 슬라이드 구조

```
구조: 8페이지 × 6개 Node = 48개 Contestant  ← ★ v1.7 교정 (구: Candidate)

UI 동작:
  - Framer Motion AnimatePresence 페이지 전환
  - 좌우 스와이프 (useSwipeable)
  - 상단 Progress Bar: "페이지 N/8 (완료 M/48)"

Node 상태:
  - 비어있음: 카메라 아이콘 + 번호
  - 채워짐: Contestant 이미지 미리보기 + 이름

완료 조건: 48개 Node 모두 채워야 "저장하기" 활성화
```

---

## PART 8 — 에이전트 임무 템플릿 (★ v1.7 디자인 토큰 교정)

모든 Claude Code 대화 시작 시 이 템플릿 사용:

```
당신은 '월크48 [모듈명] 전담 개발자'입니다.

[필수 참조 원칙]
- 월크48은 팬 투표 서비스입니다. 예측 게임/내기가 아닙니다.
- Round에는 Deadline이 없습니다. Tournament Deadline만 존재합니다.
  Voter가 해당 Round 마지막 Match 완료 → advanceRound() 시스템 자동 실행.
- Flutter를 사용하지 마세요. Next.js 14 + TypeScript입니다.
- Vote Count(절대 수치)를 UI에 노출하지 마세요. Vote Rate(%)만 표시합니다.
- 용어: Contestant (Candidate 금지), Match (Battle 금지), Voter, Champion, Crown Card.
- 다크 배경에 순수 블랙(#000000) 사용 금지 — 반드시 네이비-인디고 팔레트 사용.

역할 및 권한:
  - 담당 모듈: [모듈명]
  - 금지: 다른 도메인/모듈 코드 수정
  - 허용: 담당 모듈 폴더 내 모든 파일 생성/수정

기술 스택:
  - 프론트엔드: Next.js 14 (App Router) + TypeScript
  - UI: Tailwind CSS + Shadcn/UI + Framer Motion + GSAP
  - 백엔드: Firebase (Firestore / Realtime DB / Cloud Functions)

★ 디자인 토큰 (WC48_DESIGN_SYSTEM_v2.3.md 기준 — 구버전 사용 금지):
  다크 테마:
    배경 deep:    #00003A  (Deep Osidian)
    배경 default: #0E0944  (Deep Twilight)
    배경 soft:    #241754  (Twilight Soft)
    배경 charcoal:#1E1E24  (GNB Island)
    Gold:         #FCD006  (Crown Gold)
    Aura:         #EEDA7D  (부드러운 강조)
    Crimson:      #D7063A  (VS 우측, 에러)
    Turquoise:    #00A3B7  (성공, VS 좌측)
    텍스트:       #F2F2F5  (Off-White)
    보조 텍스트:  #B1B5C4  (Powder Blue)
    테두리:       #2D1C5A
  라이트 테마:
    배경:         #F2F2F5
    텍스트:       #241754
    테두리:       #D4DCE3
    Gold:         #FCD006  (공통)
  Shadow:
    card:   0 4px 24px rgba(0,0,58,0.50)
    gold:   0 0 32px rgba(252,208,6,0.25)
  Border radius:
    card: 24px / card-hero: 32px / btn: 12px / badge: 8px

지금 구현할 기능:
  1. [구체적 기능 1]
  2. [구체적 기능 2]
  3. [구체적 기능 3]

완료 기준:
  - [테스트 가능한 완료 조건]

시작해주세요.
```

---

## PART 9 — FAQ

**Q: Round별 기간을 설정하는 로직이 필요하지 않나요?**
A: 불필요합니다. Round에는 Deadline이 없습니다. Voter의 투표 흐름에 따라 시스템이 자동으로 advanceRound()를 실행합니다.

**Q: 하루 투표 제한은 전체 합산인가요, Tournament별인가요?**
A: Tournament별 5회 (각 Tournament마다 독립 카운트, 1일 5 Match 가능). 자정 KST 리셋.

**Q: 비로그인 상태에서 투표할 수 있나요?**
A: 불가합니다. 투표 시 Google/Apple 로그인이 필수입니다.

**Q: 다크 배경 색상이 #05070A가 아닌가요?**
A: 구버전입니다. v2.0부터 Twilight Stadium Edition으로 전환되어 `#00003A`(Deep Osidian)이 기본입니다. CLAUDE.md·CONTEXT.md의 색상 토큰은 갱신이 안 된 구버전이므로 UI 작업 시 `WC48_DESIGN_SYSTEM_v2.3.md`를 반드시 참조하세요.

---

## PART 10 — Claude 협업 운영 가이드

### 10-1. Claude가 볼 수 있는 것 vs 없는 것

```
✅ Claude가 볼 수 있는 것:
  - 이 대화창에서 주고받은 내용
  - 대표님이 이 Claude 프로젝트에 직접 업로드한 파일 (Project Knowledge)
  - 대표님이 대화창에 첨부한 파일

❌ Claude가 볼 수 없는 것:
  - 대표님 Mac 로컬 폴더
  - 이전 대화 내용 (새 대화 시작 시 초기화)
```

### 10-2. 로컬 파일 작업 표준 절차

```
Step 1. 로컬 기존 파일 확인:   find ~/Projects/worldcrown48/ -name "파일명"
Step 2. 기존 파일 백업:        cp 원본 원본_backup_날짜.md
Step 3. Claude 파일 다운로드:  대화창 파일 옆 ↓ 버튼 클릭
Step 4. 다운로드 확인:         find ~/Downloads -name "파일명"
Step 5. 로컬 프로젝트 복사:    cp ~/Downloads/파일명 ~/Projects/worldcrown48/파일명
Step 6. 정상 반영 확인:        head -3 ~/Projects/worldcrown48/파일명
```

### 10-3. Mac 로컬 프로젝트 구조

```
~/Projects/worldcrown48/
├── CLAUDE.md                           ← Claude 에이전트 진입점 (v1.1)
├── CONTEXT.md                          ← 프로젝트 컨텍스트 (v0.3)
├── LANGUAGE.md                         ← 공식 한/영 용어 정의서 (v1.2)
├── WorldCrown48_ProjectSkill.md        ← 마스터 스킬 (이 파일)
└── docs/
```

### 10-4. Claude 프로젝트 지식 관리

```
업로드 필요 파일:
  CONTEXT.md / LANGUAGE.md / WorldCrown48_ProjectSkill.md
  WC48_DESIGN_SYSTEM_v2.3.md / PRD-MVP1_v2.1.md / CLAUDE.md

업로드 방법:
  Claude.ai → 프로젝트 선택 → 설정(⚙️) → 프로젝트 지식 → 파일 추가

⚠️ 로컬 수정 후 반드시 수동 재업로드. 자동 동기화 없음.
```

### 10-5. 자주 발생하는 문제와 해결책

| 문제 상황 | 원인 | 해결 방법 |
|-----------|------|-----------|
| Claude가 "파일이 없다"고 함 | 로컬 파일은 Claude가 볼 수 없음 | `find ~` 명령어로 직접 확인 |
| 용어가 혼용됨 | LANGUAGE.md 미참조 | LANGUAGE.md 먼저 확인 |
| 생성 파일이 v4.9 설계서와 불일치 | 첨부 파일만 분석, 설계서 미확인 | 10-6 절차 참조 |
| **UI 색상이 디자인 시스템과 다름** | **CLAUDE.md·CONTEXT.md 구버전 색상 참조** | **10-8 규칙 참조** |

---

### 10-6. ⛔ 오류 기록 — 설계서 미확인 파일 생성 (2026-05-14)

#### 재발 방지 규칙 — 파일 작업 시 필수 절차

```
파일 생성·수정·개명·통합 요청이 들어오면 반드시 이 순서를 따를 것:

Step 1: project_knowledge_search → "에이전트 배치 맵 v4.9" 확인
Step 2: project_knowledge_search → 해당 작업 관련 설계서 섹션 확인
Step 3: 첨부 파일과 설계서 내용 비교 → 불일치 목록화 후 보고
Step 4: 설계서 기준으로 파일 구조 결정 후 작성

❌ 절대 금지: 첨부 파일만 보고 설계서 미확인 상태에서 파일 생성·수정
```

#### 올바른 파일 네이밍 원칙 (v4.9 에이전트 ID 기준)

```
1개 에이전트 = 1개 lite-spec 파일
올바른 예: A0-launch-pad.md / C1-vote-engine.md / G1-admin-dashboard.md
틀린 예:   07-the-pitch.md (번호 기준 — 에이전트 ID와 무관)
```

---

### 10-7. 문서 우선순위 (충돌 시 적용 기준)

```
용어 충돌 시:     LANGUAGE.md v1.2 > CONTEXT_v0_6.md > ProjectSkill
디자인 토큰 충돌: WC48_DESIGN_SYSTEM_v2.3.md > 모든 다른 문서 (DESIGN_BRIEF.md의 금지 패턴도 반드시 확인)
설계 구조 충돌:   WorldCrown48_v4_9.md > CONTEXT_v0_6.md
코딩 규칙 충돌:   CLAUDE.md v2.0 > ProjectSkill
```

---

### 10-8. ⛔ 오류 기록 — 디자인 토큰 구버전 참조 오류 (2026-05-16) ★ v1.7 신규

> 같은 실수가 반복되지 않도록 발생 경위, 결과, 재발 방지 규칙을 영구 기록합니다.

#### 발생 경위

대표님이 PRD-MVP1 v2.0 업그레이드를 요청했을 때, Claude(48티오)가
`WC48_DESIGN_SYSTEM_v2.3.md`를 확인하지 않고 `CLAUDE.md`와 `CONTEXT.md`에
잔존하는 **구버전(v1 시절) 색상 토큰**을 그대로 PRD의 §6-4 디자인 토큰 섹션에 기입했습니다.

#### 오류 내용 — 구버전 vs 실제 v2.1

```
구버전 (CLAUDE.md 기준 — 잘못된 값)    v2.1 실제 값 (올바른 값)
────────────────────────────────────────────────────────
#05070A (배경 deep)              →  #00003A (Deep Osidian)
#0A0D12 (배경 default)           →  #0E0944 (Deep Twilight)
#0E1217 (배경 soft)              →  #241754 (Twilight Soft)
#F8FAFC (텍스트)                 →  #F2F2F5 (Off-White)
#30363D (테두리)                  →  #2D1C5A
#8B949E (보조 텍스트)            →  #484B67
#FAFBFC (라이트 배경)            →  #F2F2F5
#1A1A2E (라이트 텍스트)          →  #241754
#E2E8F0 (라이트 테두리)          →  #D4DCE3

누락된 토큰: Aura(#EEDA7D), Crimson(#D7063A), Turquoise(#00A3B7),
            Powder Blue(#B1B5C4), shadow-gold, shadow-crimson,
            shadow-gnb, --radius-card(24px), --radius-btn(12px) 등
```

#### 근본 원인 분석

```
✅ 올바른 우선순위 (디자인 토큰):
   WC48_DESIGN_SYSTEM_v2.3.md > CLAUDE.md > CONTEXT.md

❌ 실제로 한 것:
   CLAUDE.md / CONTEXT.md의 색상 토큰을 그대로 복사
   → WC48_DESIGN_SYSTEM_v2.3.md 확인 안 함
   → 디자인 시스템이 v2.0(2026-05-14) 전면 개편된 사실 미반영
```

#### ⛔ 재발 방지 규칙 — UI/디자인 작업 시 필수 절차 (절대 준수)

```
UI·디자인 관련 작업 (색상, 컴포넌트, 스타일, 토큰) 요청이 들어오면
반드시 이 순서를 따를 것:

Step 1: project_knowledge_search → "WC48_DESIGN_SYSTEM_v2" 확인
         → 최신 버전 번호 확인 (현재: v2.1)
         → 컬러 토큰·그림자·반경·폰트 전체 확인

Step 2: project_knowledge_search → "마이그레이션 가이드" 확인
         → 구버전 → 신버전 색상 변경 이력 파악

Step 3: CLAUDE.md·CONTEXT.md의 색상값은 참조 금지
         → 이 두 파일의 색상 토큰은 갱신 안 된 구버전

Step 4: 색상값 기입 전 반드시 WC48_DESIGN_SYSTEM 파일의 값과 대조 확인

❌ 절대 금지: CLAUDE.md 또는 CONTEXT.md의 hex 색상값을 UI 코드에 직접 사용
❌ 절대 금지: "이 정도 색상은 외워서 알 것 같다"는 판단으로 기억에 의존
❌ 절대 금지: 순수 블랙 (#000000) 다크 배경 사용
❌ 절대 금지: 구버전 배경 (#05070A / #0A0D12 / #0E1217) 신규 코드에 사용
```

#### 디자인 토큰 단일 진실 공급원 (Single Source of Truth)

```
┌─────────────────────────────────────────────────────────────┐
│  디자인 토큰 SST: WC48_DESIGN_SYSTEM_v2_3.md               │
│  (Twilight Stadium Cinematic Edition)                       │
│                                                             │
│  색상·그림자·반경·폰트·간격·애니메이션 토큰 — 이 파일 단독  │
│                                                             │
│  ❌ CLAUDE.md 색상 → 구버전, 참조 금지                      │
│  ❌ CONTEXT.md 색상 → 구버전, 참조 금지                     │
│  ❌ ProjectSkill v1.6 이하 색상 → 구버전, 참조 금지         │
└─────────────────────────────────────────────────────────────┘
```

#### 핵심 색상 빠른 참조 카드 (매 작업 전 확인)

```
다크 배경:  #00003A / #0E0944 / #241754 / #362261 / #1E1E24
Gold:       #FCD006 (Crown Gold) — 변경 없음
Aura:       #EEDA7D (부드러운 강조)
Crimson:    #D7063A (VS 우측, 에러)
Turquoise:  #00A3B7 (성공, VS 좌측)
텍스트:     #F2F2F5 / #B1B5C4 / #484B67
테두리:     #2D1C5A
라이트 배경:#F2F2F5 / #FFFFFF
라이트 텍스트:#241754
```

---

## PART 12 — 에이전트 팀 구조 (v1.8 신규)

> 상세 정의: `docs/agents/AGENT_TEAM.md`

### 3개 에이전트 팀

```
Frontend Agent  — UI 컴포넌트, 페이지, 애니메이션, 다국어 렌더링
  담당: src/app/, src/components/, src/styles/, src/lib/i18n/
  스택: Next.js 14 + Tailwind + Shadcn/UI + Framer Motion + GSAP + Zustand

Backend Agent   — 데이터 모델, Cloud Functions, API, Claude API 연동
  담당: src/lib/firebase/, src/lib/claude/, functions/, firestore.rules
  스택: Firebase + Claude API (claude-sonnet-4-20250514) + GNews API

Test Agent      — 단위·통합·E2E 테스트, CI/CD 파이프라인
  담당: __tests__/, .github/workflows/
  스택: Vitest + Firebase Emulator + Playwright + GitHub Actions
```

### 에이전트 임무 시작 전 필수 확인 파일

```
1. DESIGN_BRIEF.md     ← 디자인 금지 패턴 + 토큰 최신값
2. CLAUDE.md           ← 불변 원칙 8가지
3. LANGUAGE.md v1.4    ← 공식 용어 (단일 진실 공급원)
4. 담당 도메인 lite-spec ← docs/lite-specs/
```

---

## PART 13 — 다국어(i18n) 정책 요약 (v1.8 신규)

> 상세 정책: `docs/i18n/I18N_POLICY.md`

### MVP별 언어 지원

```
MVP 1 (2026-05-31): ko (한국어) + en (영어)
MVP 2 (2026-07):    + es (스페인어 — 남미 팬덤 공략)
MVP 3 (2026 하반기): TBD (pt-BR / ja 후보)
```

### URL 구조

```
worldcrown48.com/ko/   worldcrown48.com/en/   worldcrown48.com/es/
기본 폴백: /en/ (Accept-Language 감지 실패 시)
```

### 번역 불가 고유명사 (모든 언어에서 영문 유지)

```
Tournament · Contestant · Match · Voter · Champion
Crown · Crown Card · AI-Report
The Pitch · The Arena · The Lab · Launch Pad
LIVE · VOTE RATE · VS · WorldCrown48
```

### 구현 기술

```typescript
// next-intl 사용
export const locales = ['ko', 'en', 'es'] as const;
export const defaultLocale = 'en';

// 번역 키 형식: {domain}.{component}.{key}
// 예: arena.vsBattle.voteLeft
```

---

## PART 11 — 변경 이력

| 버전 | 날짜 | 주요 내용 |
|------|------|-----------|
| **v1.8** | **2026-05-23** | **문서 대구조화 반영** |
| | | ★ PART 3: "48명" → "48개" (Contestant = 모든 개체) |
| | | ★ PART 5: 디자인 시스템 참조 v2.1 → v2.2 |
| | | ★ PART 10-7: DESIGN_BRIEF.md 문서 우선순위 추가 |
| | | ★ PART 12 신규: 에이전트 팀 구조 (Frontend/Backend/Test) |
| | | ★ PART 13 신규: 다국어(i18n) 정책 요약 |
| **v1.7** | **2026-05-16** | **⛔ 디자인 토큰 구버전 오류 교정 + 재발 방지 규칙** |
| | | ★ PART 5 디자인 토큰 전면 교정: CLAUDE.md 구버전 → WC48_DESIGN_SYSTEM_v2.1 기준 |
| | | ★ PART 4 투표 정책 교정: "1일 1회" → "1일 5회" (CONTEXT.md v0.3 기준) |
| | | ★ PART 7 용어 교정: "Candidate" → "Contestant" |
| | | ★ PART 8 에이전트 템플릿 색상 전면 교정: 구버전 → v2.1 정확한 값 |
| | | ★ PART 10-8 신규: 디자인 토큰 구버전 참조 오류 영구 기록 |
| | | ★ 디자인 토큰 SST 규칙 명문화: WC48_DESIGN_SYSTEM_v2.3.md 최우선 |
| | | ★ 구버전→신버전 색상 마이그레이션 빠른 참조 표 추가 |
| | | ★ 핵심 색상 빠른 참조 카드 추가 (매 작업 전 확인용) |
| | | PART 10-7 신규: 문서 우선순위 명시 |
| **v1.6** | **2026-05-14** | 설계서 미확인 파일 생성 오류 영구 기록 + 재발 방지 4단계 절차 |
| v1.5 | 2026-05-13 | CLAUDE.md v1.1 반영, Contestant·Tournament Deadline 용어 정렬 |
| v1.4 | 2026-05 | PART 10 신규: Claude 협업 운영 가이드 |
| v1.3 | 2026-05 | 서비스 정체성 명문화, Tournament Host 역할 신규 정의 |
| v1.2 | 2026-05 | 투표 정책 v4.2 |
| v1.1 | 2026-05 | Flutter → Next.js 전환 기록 |
| v1.0 | 2026-05 | 최초 작성 |

---

*© 2026 WorldCrown48 | 작성: 48티오 | ProjectSkill v1.8 | CONFIDENTIAL*
*디자인 토큰 SST: WC48_DESIGN_SYSTEM_v2.3.md (Twilight Stadium v2.3)*
