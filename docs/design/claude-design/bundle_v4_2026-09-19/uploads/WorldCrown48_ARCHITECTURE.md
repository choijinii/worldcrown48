# 👑 WorldCrown48 (월크48) — 아키텍처 마스터 컨텍스트

> **이 파일의 목적**: Claude Code 에이전트가 코드 작성 전 반드시 읽어야 하는 시스템 아키텍처 설계 문서입니다.
> v4.8 완결판 기반 | 2026-05-13 작성 | 작성자: 48티오

---

## 🛑 MENTAL_MODEL 우선

> 라운드·매치·득표 규칙의 시각 진실: **`docs/mental-model/MENTAL_MODEL.svg`**
> 아키텍처 작성·수정 시 이 SVG와 충돌하지 않는지 우선 확인.

---

## ⚠️ 필수 규칙 (모든 에이전트 공통)

```
✅ Contestant (❌ Candidate)
✅ Match (❌ Battle, 배틀, 경기)
✅ Tournament Deadline (❌ Round Deadline — 존재하지 않는 개념)
✅ advanceRound() 시스템 자동 (❌ Host가 라운드를 전환한다)
✅ Voter (❌ 참여자, 유저, 사용자)
✅ Champion (❌ 우승자, 1등)
✅ Crown Card (❌ 결과 이미지, 결과 카드)

Round에는 Deadline·시작·종료·기간·마감 — 어떤 시간 개념도 없다.
Firestore rounds[].deadline 필드 절대 금지.
Tournament Deadline만 존재한다.
```

---

## 1️⃣ 시스템 전체 아키텍처 (System Architecture)

### 개요
월크48은 6개 기술 레이어로 구성된 서버리스 아키텍처입니다.
Voter의 브라우저에서 시작하여 CDN → 프론트엔드 → 백엔드 → 외부 API → PR 배포까지 흐릅니다.

### 아키텍처 레이어 다이어그램

```
┌─────────────────────────────────────────────────────┐
│  LAYER 0: Voter Browser                             │
│  Next.js SSR + React + Tailwind + Shadcn/UI         │
│  → HTTPS 요청                                       │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  LAYER 1: Cloudflare                                │
│  CDN + DDoS 방어 + WAF 방화벽 + SSL 암호화          │
│  worldcrown48.com DNS 관리                          │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  LAYER 2: Vercel                                    │
│  Next.js 14 (App Router) + SSR/SSG 배포             │
│  git push → 자동 빌드 + 전 세계 배포               │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  LAYER 3: Firebase Services                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  Auth    │ │ Firestore│ │ Realtime │ │Storage │ │
│  │ (인증)   │ │ (문서DB) │ │    DB    │ │(이미지)│ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│  ┌──────────────────────────────────────────────┐   │
│  │  Cloud Functions (서버리스 비즈니스 로직)      │   │
│  │  onVote / advanceRound / scheduleRankingCache │   │
│  │  getNewsCache / onCrownCardCreate / ...       │   │
│  └──────────────────────────────────────────────┘   │
└──────────┬──────────────────────────────┬───────────┘
           ↓                              ↓
┌─────────────────────┐   ┌──────────────────────────┐
│  LAYER 4a:          │   │  LAYER 4b:               │
│  Claude API         │   │  GNews API               │
│  (Sonnet 4)         │   │  Basic $9/월             │
│  AI 뉴스 생성       │   │  키워드 뉴스 25개        │
│  콘텐츠 모더레이션  │   │  1시간 Firestore 캐시    │
└─────────┬───────────┘   └──────────────────────────┘
          ↓
┌─────────────────────┐
│  LAYER 5: (MVP 3)   │
│  PR Distribution    │
│  RedPress / EIN     │
│  PR Newswire        │
└─────────────────────┘
```

### 기술 스택 상세 (v4.1 확정)

| 레이어 | 기술 | 역할 | 월 비용 |
|--------|------|------|---------|
| 프론트엔드 | Next.js 14 (App Router) + TypeScript | SSR + SEO + 반응형 UI | 무료 |
| UI 라이브러리 | Tailwind CSS + Shadcn/UI + Framer Motion | 다크모드 UI + 애니메이션 | 무료 |
| 상태 관리 | Zustand | 클라이언트 전역 상태 | 무료 |
| 인증 | Firebase Auth + next-auth | Google/Apple 소셜 로그인 | 무료 |
| 문서 DB | Firestore | Tournament·User·정책 데이터 | 사용량 기반 |
| 실시간 DB | Firebase Realtime DB | 투표 실시간 동기화 | 사용량 기반 |
| 파일 저장 | Firebase Storage | Crown Card·Contestant 이미지 | 사용량 기반 |
| 서버리스 | Cloud Functions for Firebase | 비즈니스 로직 11개 함수 | ~$5~20/월 |
| AI | Claude API (claude-sonnet-4-20250514) | AI 뉴스 + 모더레이션 | ~$50~200/월 |
| 뉴스 | GNews API (Basic) | 키워드 뉴스 100req/day | $9/월 |
| CDN + 보안 | Cloudflare | CDN + DDoS + WAF + SSL | Free/Pro $25 |
| 배포 | Vercel | Next.js 자동 배포 | 무료 (Hobby) |
| 테스트 | Claude Code + Playwright | E2E 자동화 테스트 | 무료 |

### 디자인 토큰

> ⚠️ 디자인 토큰(색상·타이포)의 단일 진실은 docs/design/WC48_DESIGN_SYSTEM_v2.3.md 입니다. 구버전 v1 색상값은 삭제됨 — 2026-05-25 정합성 정정.

---

## 2️⃣ 데이터 흐름도 — 투표 파이프라인 (Vote Data Pipeline)

### 개요
Voter가 투표 버튼을 클릭하는 순간부터 Crown Card 생성, AI 뉴스 생성까지의 전체 데이터 흐름입니다.
모든 에이전트가 자기 담당 구간을 정확히 이해해야 합니다.

### 투표 데이터 흐름 다이어그램

```
[Voter clicks Contestant]
          │
          ▼
┌─────────────────────────────────────┐
│  ① onRateLimitCheck                 │
│  1분 내 10회 초과? → 15분 쿨다운    │ ──→ [Block: 429 Error]
│  Cloud Functions 미들웨어           │
└─────────────────┬───────────────────┘
                  │ Pass
                  ▼
┌─────────────────────────────────────┐
│  ② Daily Limit Check               │
│  대진별 1일 5회 초과?               │ ──→ [Reject: 한도 도달 안내]
│  Firestore votes 쿼리               │
│  WHERE userId=? AND tournamentId=?  │
│  AND date=TODAY → COUNT < 5         │
└─────────────────┬───────────────────┘
                  │ Pass
                  ▼
┌─────────────────────────────────────┐
│  ③ Realtime DB Transaction          │
│  votes/{matchId}/{contestantId} +1  │
│  runTransaction → 동시 충돌 방지    │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  ④ Firestore votes Write            │
│  {userId, tournamentId, matchId,    │
│   contestantId, votedAt, date,      │
│   ipHash, deviceId}                 │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  ⑤ advanceRound() Check            │
│  해당 Round 마지막 Match인가?       │
│  Firestore 트리거 (자동)            │
└──────┬──────────────────┬───────────┘
       │ 마지막 아님       │ 마지막 Match!
       ▼                  ▼
 [다음 Match 제시]  ┌─────────────────────┐
                   │ 라운드 전환 효과     │
                   │ "맨 어브 더 월드컵   │
                   │  N강"               │
                   └──────┬──────────────┘
                          │
                   ┌──────┴──────┐
                   │             │
              결승 아님      결승 완료!
                   │             │
                   ▼             ▼
            [다음 Round]  ┌─────────────────┐
                         │ Champion 확정    │
                         └──────┬──────────┘
                                │
                                ▼
                   ┌──────────────────────┐
                   │ ⑥ Crown Card 생성    │
                   │ Canvas API 이미지    │
                   │ → Storage 저장       │
                   │ → SNS 공유           │
                   └──────────────────────┘
```

### 병렬 파이프라인: 랭킹 캐시 + 특이점 탐지 + AI 뉴스

```
[매 1시간 스케줄러]
          │
          ▼
┌─────────────────────────────────────┐
│  scheduleRankingCache               │
│  활성 Tournament 전체 순회          │
│  득표율(%) 계산 → ranking_cache 저장│
│  ⚠️ 절대 수치(count) 저장 금지      │
│  ⚠️ 유저에게 랭킹 미노출            │
└──────┬──────────────────┬───────────┘
       │                  │
       ▼                  ▼
 ┌─────────────┐   ┌─────────────────────┐
 │ 어뷰징 감지 │   │ 특이점 4종 탐지      │
 │ 비정상 패턴 │   │ T-1: 1위 ≥ 60%      │
 │ → 관리자    │   │ T-2: 격차 ≥ 30%p    │
 │   이메일    │   │ T-3: 24h 증가 ≥200% │
 │   알림      │   │ T-4: 순위 역전(3위↑)│
 └─────────────┘   └──────────┬──────────┘
                              │ 조건 충족
                              ▼
                   ┌──────────────────────┐
                   │ generateAINews       │
                   │ Claude API 뉴스 생성 │
                   │ (MVP 2)              │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │ 1단계: AI 자동 검수   │
                   │ 체크리스트 6항목      │
                   │ • 명예훼손 없음       │
                   │ • 절대수치 미사용     │
                   │ • 데이터 일치         │
                   │ • 서비스 정체성 준수  │
                   │ • 최소 300자          │
                   │ • 수치 정확도 ±1%p   │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │ 2단계: 관리자 승인    │
                   │ Domain 6 M5 UI       │
                   │ 승인/반려/수동편집    │
                   └──────────┬───────────┘
                              │ 승인 완료
                              ▼
                   ┌──────────────────────┐
                   │ publishNews (MVP 3)  │
                   │ PR 배포 실행         │
                   │ 뉴스 이미지 =        │
                   │   Crown Card 재활용  │
                   └──────────────────────┘
```

### Voter 1명의 투표 여정 요약

```
48강(24 Match) → 24강(12) → 12강(6) → 6강(3) → 결승(1) → Champion → Crown Card → SNS 공유
```

핵심: 이 전체 흐름에서 Voter가 하는 일은 "Match에서 한쪽을 선택하는 것" 뿐이다.
Round 전환, 다음 Match 제시, 라운드 전환 효과, Champion 확정은 모두 시스템이 자동으로 처리한다.
Tournament Deadline만 존재한다. Round에는 어떤 Deadline도 없다.

---

## 3️⃣ 도메인 구조 + 에이전트 배치 맵 (Domain & Agent Map)

### 개요
월크48은 7개 도메인(Domain 0~6)으로 구성되며, 총 14개 에이전트가 각 도메인에 배치됩니다.
"1개 Claude Code 대화 = 1개 에이전트 = 1개 모듈 임무" — 이것이 핵심 원칙입니다.

### Domain 0 — LAUNCH PAD (사전 공개 랜딩)

```
반응형: 모바일(375px) / 태블릿(768px) / 데스크탑(1440px)
에이전트: A-0 (MVP 1)

모듈:
├─ M1 Hero Section: 골드 블러 배경 + 슬로건
├─ M2 Countdown: FIFA 2026 개막일 카운트다운
├─ M3 Waitlist: 이메일 수집 → Firestore waitlist
└─ M4 SNS Links: 인스타/X/카카오 외부 링크

전환 시점: 2026년 6월 개막 직전 → Domain 1로 전환
```

### Domain 1 — THE PITCH (메인 홈)

```
반응형: 모바일(375px) / 태블릿(768px) / 데스크탑(1440px)
에이전트: A-1 (MVP 1)

모듈:
├─ M1 Hero: 카운트다운 + CTA 버튼 + 골드 블러
├─ M2 Trending: 인기 Tournament 카드 Grid
│   └─ 반응형: 모바일 1열 / 태블릿 2열 / 데스크탑 3열
├─ M3 Navigation: 상단 GNB + 모바일 하단 탭 바
│   └─ 스크롤 시 배경 투명→불투명 전환
└─ M4 Lab Entry: 비관리자 disabled + Tooltip
```

### Domain 2 — THE LAB (대진 생성 — 관리자 전용)

```
데스크탑 전용 | /admin/lab 경로 | role === "admin" 필수
에이전트: B-1 (MVP 1), B-2 (MVP 2)

모듈:
├─ M0 대진 생성 마법사 (v4.6 신설)
│   ├─ Step 1: 기본 정보 (제목·카테고리·설명)
│   ├─ Step 2: 생성 조건 (AI뉴스·다국어·랭킹공개 토글)
│   └─ Step 3: Tournament Deadline 설정
├─ M1 대진 초기화: 주제 입력 + AI/수동 선택
├─ M2 48 Nodes Grid: 8페이지 × 6개 슬라이드 모달
│   └─ Framer Motion AnimatePresence + 좌우 스와이프
├─ M3 AI 채우기: Claude API 48명 Contestant 추천
└─ M4 저장/공개: Firestore 저장 + status 변경
```

### Domain 3 — THE ARENA (투표 엔진 — ★ 심장부)

```
반응형: 모바일(375px) / 태블릿(768px) / 데스크탑(1440px)
에이전트: C-1 (투표엔진), C-2 (Crown Card), C-3 (랭킹/특이점), C-4 (뉴스룸) — 모두 MVP 1

모듈:
├─ M1 대진 상세 View: Tournament 정보 + 라운드 현황 인디케이터
├─ M2 VS Battle View: ★ 핵심 투표 화면
│   ├─ CSS Flexbox 좌우 분할 (w-1/2)
│   ├─ 순서대로 1:1 Match 제시 (동시 진행 아님)
│   ├─ 선택 효과: ring-2 ring-yellow-400 + Framer Motion scale 1.05
│   ├─ 투표 처리: Realtime DB runTransaction
│   ├─ 한도 검증: Cloud Functions 서버사이드
│   └─ advanceRound(): 마지막 Match → 자동 전환 → 전환 효과
├─ M3 Crown Card: Champion → Canvas API 이미지 생성
│   ├─ Contestant 이미지 + 이름 + 크라운 + 득표율% + 로고
│   ├─ 뉴스 링크 첨부 (v4.4)
│   ├─ SNS: 인스타(링크복사) / X(Web Intent) / 카카오(SDK)
│   └─ AI 뉴스 대표 이미지로 재활용 (저작권 제로)
├─ M4 부정투표 방어
│   ├─ MVP 1: Rate Limiting (1분 10회) + 소셜 로그인 필수
│   ├─ MVP 2: fingerprintjs 디바이스 핑거프린트
│   └─ MVP 3: 3단계 차단 (소프트→하드→영구)
├─ M5 다국어: next-intl (한/영/스페인) — MVP 2
├─ M6 아레나 뉴스룸: GNews 25개 레이아웃
│   ├─ 키워드 뉴스 15개 + 확장 뉴스 10개
│   ├─ Firestore news_cache 1시간 캐시
│   └─ 반응형: 데스크탑 우측1/3 / 태블릿 하단2열 / 모바일 가로스크롤
└─ M7 AI 뉴스 팩토리: (MVP 2)
    ├─ 특이점 4종 트리거 + Champion 결정 트리거
    ├─ Claude API 뉴스 자동 생성
    └─ 2단계 검수 (AI 자동 + 관리자 승인)
```

### Domain 4 — THE LOCKER ROOM (유저 프로필)

```
반응형: 모바일(375px) / 태블릿(768px) / 데스크탑(1440px)
에이전트: D-1 (MVP 1), D-2 (MVP 2)

모듈:
├─ M1 소셜 로그인: Firebase Auth + Google/Apple OAuth
│   └─ next-auth + firebase-adapter + Firestore users.role 저장
├─ M2 프로필 카드: 투표 통계 + 골드 테두리 — MVP 2
├─ M3 개인정보 설정: ★ GDPR Right to Erasure (MVP 1 필수!)
│   └─ Auth + Firestore + Storage 전체 삭제 + audit_log 기록
└─ M4 내 투표 기록: 익명화 투표 조회 — MVP 2
```

### Domain 5 — POLICY HUB (법적 문서)

```
반응형: 모바일(375px) / 태블릿(768px) / 데스크탑(1440px)
에이전트: E-1 (MVP 1 — 1순위)

모듈:
├─ M1 쿠키 동의 배너: ★ MVP 1 최우선
│   ├─ 하단 고정 3버튼: 모두허용 / 필수만 / 설정하기
│   ├─ "설정하기" → Shadcn Sheet (카테고리별 Toggle)
│   └─ Firestore cookie_consents 서버 저장 (GDPR 감사 추적)
├─ M2 법적 문서: PolicyHub_v1_0.html → react-markdown
│   └─ Shadcn Tabs (한국어/English/Español)
├─ M3 공지사항: Firestore notices CRUD
└─ M4 신고 센터: 위반 신고 — MVP 2

쿠키 3-티어:
├─ 필수: 세션·인증·CSRF (동의 불필요)
├─ 기능: 언어·다크모드·투표임시 (선택, 1년)
├─ 분석: GA·Firebase Analytics (선택, 2년)
└─ 마케팅: 광고 리타게팅 (명시적 동의, MVP 3)

URL 구조:
├─ /policies/terms    이용약관 (MVP 1)
├─ /policies/privacy  개인정보처리방침 (MVP 1)
├─ /policies/cookies  쿠키 정책 (MVP 1)
├─ /notices           공지사항 (MVP 1)
├─ /policies/ai-content  AI 콘텐츠 정책 (MVP 2)
└─ /report            신고 센터 (MVP 2)
```

### Domain 6 — ADMIN DASHBOARD (관리 콘트롤 센터)

```
데스크탑 전용 | /admin/* 경로 | role === "admin" 필수
에이전트: G-1 (MVP 1), G-2 (MVP 2), F-1 (MVP 2 AI 뉴스)

모듈:
├─ M1 메인 대시보드: Tournament 5지표 카드 + Recharts 차트
│   ├─ 지표 1: 총 투표 수 (24h / 전체)
│   ├─ 지표 2: 활성 Tournament 수
│   ├─ 지표 3: 오늘의 투표 속도 (시간당)
│   ├─ 지표 4: Rate Limiting 발동 횟수
│   └─ 지표 5: 어뷰징 경고 알림 수
├─ M2 대진 목록: DataTable + 카테고리 필터 + 상태 배지
├─ M3 부정투표 처리: 3단계 차단 UI — MVP 3 이연
├─ M4 대진 운영 현황: 대진별 투표 현황 — MVP 2
├─ M5 AI 뉴스 대시보드: 검수/승인/반려/수동편집 — MVP 2
└─ M6 신고 센터: 처리 이력 — MVP 2
```

### 전체 에이전트 배치 맵 요약

| 에이전트 | 도메인 | 핵심 작업 | MVP | 반응형 |
|----------|--------|-----------|-----|--------|
| A-0 | Domain 0 LAUNCH PAD | Hero + 카운트다운 + 웨이트리스트 | 1 | ✅ 3화면 |
| A-1 | Domain 1 THE PITCH | Hero + Trending + Navigation | 1 | ✅ 3화면 |
| B-1 | Domain 2 THE LAB | M0 마법사 + 48 Nodes + AI채우기 | 1 | 🖥 데스크탑 |
| C-1 | Domain 3 THE ARENA | VS Battle + 투표엔진 + 라운드 자동 전환 | 1 | ✅ 3화면 |
| C-2 | Domain 3 THE ARENA | Crown Card 생성 + SNS 공유 | 1 | ✅ 3화면 |
| C-3 | Domain 3 THE ARENA | 랭킹 캐시 + 특이점 탐지 + 어뷰징 | 1 | — (백엔드) |
| C-4 | Domain 3 THE ARENA | 아레나 뉴스룸 GNews 25개 | 1 | ✅ 3화면 |
| D-1 | Domain 4 LOCKER ROOM | 소셜 로그인 + GDPR 삭제 | 1 | ✅ 3화면 |
| E-1 | Domain 5 POLICY HUB | 쿠키 배너 + 법적 문서 | 1 | ✅ 3화면 |
| G-1 | Domain 6 ADMIN DASH | 대시보드 M1~M2 | 1 | 🖥 데스크탑 |
| B-2 | Domain 2 THE LAB | AI 채우기 유저 확장 | 2 | — |
| D-2 | Domain 4 LOCKER ROOM | 프로필 + 투표 기록 | 2 | — |
| F-1 | AI 뉴스 팩토리 | 특이점→AI뉴스 생성+검수 | 2 | — |
| G-2 | Domain 6 ADMIN DASH | AI뉴스 M5 + 운영 M4 | 2 | — |

---

## 4️⃣ Firestore 스키마 (Entity Relationship)

### 개요
월크48은 14개 Firestore 컬렉션으로 구성됩니다.
tournaments를 중심으로 투표·랭킹·뉴스 데이터가 연결되고,
users를 중심으로 인증·동의·감사 데이터가 연결됩니다.

### 컬렉션 전체 목록

| 컬렉션 | 역할 | 주요 에이전트 | MVP |
|--------|------|---------------|-----|
| tournaments | 대진 전체 정보 | B-1, A-1, C-1 | 1 |
| contestants | 48명 Contestant 정보 | B-1, C-1 | 1 |
| votes | 개별 투표 기록 | C-1 | 1 |
| ranking_cache | 1시간 캐시 득표율(%) | C-3 | 1 |
| news_cache | GNews 1시간 캐시 25개 | C-4 | 1 |
| users | 유저 프로필 (uid·role) | D-1 | 1 |
| cookie_consents | GDPR 쿠키 동의 기록 | E-1 | 1 |
| notices | 공지사항 | E-1, G-1 | 1 |
| waitlist | 이메일 웨이트리스트 | A-0 | 1 |
| admin_alerts | 어뷰징 경고 알림 | C-3, G-1 | 1 |
| audit_log | GDPR 삭제 감사 로그 (3년) | D-1 | 1 |
| crown_cards | Crown Card 메타데이터 | C-2 | 1 |
| news_filter_keywords | 뉴스 필터 키워드 | C-4 | 1 |
| ai_news ★ | AI 생성 뉴스 (v4.8) | F-1, G-2 | 2 |

### 핵심 스키마 상세

#### tournaments/{tournamentId}

```typescript
{
  id: string,                    // "tournament_abc123"
  title: string,                 // "2026 FIFA 월드컵 선수 이상형 월드컵"
  category: "FIFA" | "KPOP" | "OTHER",
  desc?: string,                 // 선택, 최대 200자
  hostUid: string,               // Tournament Host의 uid
  status: "draft" | "active" | "closed",
  createdAt: Timestamp,
  tournamentDeadline: Timestamp, // ★ 유일한 Deadline
  settings: {
    aiNews: boolean,             // AI 뉴스 자동 생성 허용
    multiLang: boolean,          // 다국어 뉴스 생성 허용
    showRanking: boolean,        // 실시간 랭킹 공개 여부
    autoExtend: boolean          // 투표수 미달 시 +24h 자동 연장
  },
  currentRound: number,          // 시스템이 advanceRound()로 자동 증가
  totalContestants: 48,
  thumbnailUrl: string
}

// ⚠️ rounds[].deadline 필드 완전 금지!
// Round에는 Deadline이 없다.
```

#### contestants/{contestantId}

```typescript
{
  id: string,
  tournamentId: string,          // FK → tournaments
  name: string,
  imageUrl: string,              // Firebase Storage URL
  order: number,                 // 1~48 배치 순서
  dataSource: string             // 데이터 출처 (퍼포먼스 기반 공개 데이터만)
}
```

#### votes/{voteId}

```typescript
{
  userId: string,                // FK → users
  tournamentId: string,          // FK → tournaments
  matchId: string,               // 매칭 고유 ID
  contestantId: string,          // 선택한 Contestant
  votedAt: Timestamp,
  date: string,                  // "2026-06-14" (KST 기준 날짜)
  ipHash: string,                // sha256(ip)
  deviceId: string | null        // fingerprintjs (MVP 2)
}

// 한도 검증 쿼리:
// WHERE userId==? AND tournamentId==? AND date==TODAY → COUNT < 5
```

#### ranking_cache/{tournamentId}

```typescript
{
  tournamentId: string,
  cachedAt: Timestamp,
  rankings: [
    { contestantId: string, rate: string }  // "34.5" (% 문자열)
  ]
}

// ⚠️ count(절대 투표 수) 저장 절대 금지. rate(득표율 %)만 저장.
// ⚠️ 이 데이터를 유저에게 직접 노출하지 않음 (랭킹 페이지 없음)
// Crown Card + AI 뉴스에서만 활용
```

#### ai_news/{newsId} (v4.8 신규)

```typescript
{
  tournamentId: string,
  trigger: {
    type: "T-1" | "T-2" | "T-3" | "T-4" | "champion",
    detail: string               // "1위 62.3%"
  },
  title: string,
  body: string,                  // 300자 이상
  crownCardUrl: string,          // 대표 이미지 = Crown Card (저작권 제로)
  status: "pending_generation" | "pending_review" | "approved" | "rejected" | "published",
  autoCheckResult: {
    defamation: boolean,         // 명예훼손 검수
    noAbsoluteCount: boolean,    // 절대수치 미사용
    factCheck: boolean,          // 데이터 일치
    identity: boolean,           // 서비스 정체성
    minLength: boolean,          // 최소 글자 수
    dataAccuracy: boolean        // 수치 정확도
  },
  reviewedBy: string | null,
  reviewedAt: Timestamp | null,
  publishedAt: Timestamp | null,
  createdAt: Timestamp
}
```

#### users/{uid}

```typescript
{
  uid: string,
  email: string,
  displayName: string,
  photoURL: string,
  role: "voter" | "admin",
  createdAt: Timestamp,
  lastLoginAt: Timestamp
}
```

#### cookie_consents/{uid}

```typescript
{
  uid: string,
  essential: true,               // 항상 true (필수)
  functional: boolean,
  analytics: boolean,
  marketing: boolean,            // MVP 3
  timestamp: Timestamp,
  ipHash: string
}
```

### 컬렉션 관계도

```
tournaments ──┬──< contestants    (1:N, tournamentId)
              ├──< votes          (1:N, tournamentId)
              ├──── ranking_cache (1:1, tournamentId)
              ├──< ai_news        (1:N, tournamentId)
              ├──── news_cache    (1:1, tournamentId)
              └──< crown_cards    (1:N, tournamentId)

users ──┬──< votes               (1:N, userId)
        ├──── cookie_consents    (1:1, uid)
        ├──< audit_log           (1:N, uid)
        └──< admin_alerts        (1:N, 관리자 수신)

독립: waitlist, notices, news_filter_keywords
```

---

## 5️⃣ Cloud Functions 트리거 흐름도 (Function Dependency Map)

### 개요
월크48은 총 11개 Cloud Functions로 구성됩니다.
각 함수가 어떤 트리거에 의해 호출되고, 어떤 순서로 연쇄 실행되는지를 정의합니다.

### Cloud Functions 전체 목록

| 함수명 | 트리거 유형 | 역할 | MVP | 에이전트 |
|--------|------------|------|-----|----------|
| onVote | HTTPS POST | 투표 처리 + 한도 검증 + Rate Limiting | 1 | C-1 |
| onRateLimitCheck | HTTPS 미들웨어 | 1분 10회 초과 → 15분 쿨다운 | 1 | C-1 |
| advanceRound | Firestore 트리거 | 마지막 Match 완료 → 다음 Round 자동 전환 | 1 | C-1 |
| scheduleRankingCache | PubSub 스케줄러 (1h) | 득표율 집계 + 특이점 4종 탐지 | 1 | C-3 |
| onAbuseDetect | Firestore 트리거 | 비정상 패턴 → 관리자 이메일 알림 | 1 | C-3 |
| getNewsCache | HTTPS GET | GNews API → Firestore 1h 캐시 반환 | 1 | C-4 |
| onCrownCardCreate | Firestore 트리거 | Champion 확정 → Crown Card 이미지 → Storage | 1 | C-2 |
| onUserDelete | HTTPS DELETE | GDPR 삭제 → Auth+Firestore+Storage+audit_log | 1 | D-1 |
| aiFillContestants | HTTPS POST | Claude API 48명 Contestant 추천 | 1 | B-1 |
| generateAINews | Firestore 트리거 | 특이점/Champion → AI 뉴스 생성 + 자동 검수 | 2 | F-1 |
| publishNews | HTTPS POST | 관리자 승인 → PR 배포 실행 | 3 | G-2 |

### 트리거 연쇄 흐름도

```
[Voter 투표 액션]
    │
    ├───→ onVote (POST)
    │       ├── onRateLimitCheck (미들웨어)
    │       ├── Firestore votes 쓰기
    │       └── Realtime DB 트랜잭션
    │
    └───→ advanceRound (Firestore 트리거)
            │
            ├── 결승 아님 → 다음 Round (UI 전환 효과)
            │
            └── 결승 완료 → Champion 확정
                    │
                    ├──→ onCrownCardCreate (Firestore 트리거)
                    │     └── Crown Card → Storage
                    │
                    └──→ generateAINews (Firestore 트리거, MVP 2)
                          └── Claude API → ai_news 컬렉션


[매 1시간 스케줄러]
    │
    └───→ scheduleRankingCache (PubSub)
            ├── ranking_cache 갱신
            ├── 특이점 4종 탐지 (T-1~T-4)
            │     └──→ generateAINews (조건 충족 시)
            └── 어뷰징 감지
                  └──→ onAbuseDetect → 관리자 이메일


[관리자 액션]
    ├───→ aiFillContestants (POST) → Claude API 48명
    ├───→ onUserDelete (DELETE) → GDPR 전체 삭제
    └───→ publishNews (POST) → PR 배포 (MVP 3)


[외부 API 호출]
    └───→ getNewsCache (GET) → GNews API → Firestore 캐시
```

### 핵심 함수 코드 패턴

#### onVote 패턴

```typescript
export const onVote = functions.https.onCall(async (data, context) => {
  const { tournamentId, matchId, contestantId } = data;
  const userId = context.auth?.uid;

  // 1. 로그인 확인
  if (!userId) throw new HttpsError('unauthenticated');

  // 2. Rate Limiting: 1분 10회 초과 체크
  if (await checkRateLimit(userId) >= 10)
    throw new HttpsError('resource-exhausted', '15분 대기');

  // 3. 대진별 1일 5회 한도 체크
  if (await getTodayVoteCount(userId, tournamentId) >= 5)
    throw new HttpsError('resource-exhausted', '한도 5회 도달');

  // 4. Realtime DB 트랜잭션 (동시 충돌 방지)
  await realtimeDb.ref(`votes/${matchId}/${contestantId}`)
    .transaction(current => (current || 0) + 1);

  // 5. Firestore votes 기록
  await firestore.collection('votes').add({
    userId, tournamentId, matchId, contestantId,
    votedAt: FieldValue.serverTimestamp(),
    date: getTodayKST(),
    ipHash: hashIP(context.rawRequest.ip),
    deviceId: data.deviceId || null
  });

  return { success: true };
});
```

#### advanceRound 패턴

```typescript
// ★ 핵심: Host가 아닌 시스템이 자동 실행
// Voter가 해당 Round 마지막 Match 완료 시 호출
async function advanceRound(voterId: string, tournamentId: string) {
  // 현재 Round의 모든 Match 완료 확인
  // 완료 → currentRound + 1 업데이트
  // 라운드 전환 효과 트리거
  // 결승 완료 → Champion 확정
}

// ❌ 절대 금지:
// const ROUND_DURATION_MS = 24 * 60 * 60 * 1000;  // 이런 코드 작성 금지
```

---

## 6️⃣ 보안 아키텍처 (Security Layers)

| 보안 레이어 | 기술 | 목적 |
|------------|------|------|
| 네트워크 | Cloudflare WAF + DDoS | 외부 공격 1차 차단 |
| 인증 | Firebase Auth + JWT | 세션 위조 방지 |
| DB 접근 | Firestore Security Rules | 유저별 데이터 권한 제한 |
| 암호화 | TLS 1.3 전송 + AES-256 저장 | 데이터 유출 방지 |
| 부정투표 | Rate Limiting + Device FP | 봇·중복 방지 |
| 콘텐츠 | Claude API 필터 | 금지 콘텐츠 탐지 |
| GDPR | 최소 수집 + 삭제 API | EU 규제 대응 |
| 감사 | audit_log (3년 보관) | 법적 증거 보전 |

---

## 7️⃣ MVP 1 에이전트 실행 순서

```
1st  A-0  LAUNCH PAD      — 랜딩·카운트다운·웨이트리스트
2nd  E-1  POLICY HUB      — 쿠키 배너 + 법적 문서 (A-0 완료 후)
3rd  D-1  LOCKER ROOM     — 소셜 로그인 + GDPR 삭제
4th  B-1  THE LAB         — M0 마법사 + 48 Nodes Grid (D-1 완료 후)
5th  C-1  THE ARENA       — VS Battle + 투표 + Rate Limiting (B-1에서 대진 1개+ 생성)
6th  C-3  THE ARENA       — 랭킹 캐시 + 특이점 탐지 + 어뷰징 (C-1 완료 후)
7th  C-4  THE ARENA       — 아레나 뉴스룸 GNews 25개 (GNews API 키 확보)
8th  C-2  THE ARENA       — Crown Card 생성 (C-4 완료 후)
9th  A-1  THE PITCH       — 메인 홈 화면 반응형
10th G-1  ADMIN DASHBOARD  — M1~M2 (전체 MVP 1 완료 후)
```

---

## 에이전트 임무 부여 표준 템플릿

에이전트에게 임무를 줄 때 아래 템플릿을 사용하세요:

```
당신은 '월크48 [모듈명] 전담 개발자'입니다.

역할 및 권한:
  - 담당 모듈: [모듈명]
  - 금지: 다른 도메인/모듈 코드 수정 금지
  - 허용: 담당 모듈 폴더 내 모든 파일 생성/수정

기술 스택:
  - Next.js 14 (App Router) + TypeScript
  - Tailwind CSS + Shadcn/UI + Framer Motion
  - Firebase (Firestore / Realtime DB / Cloud Functions)
  - 디자인 토큰: docs/design/WC48_DESIGN_SYSTEM_v2.3.md 참조 (구버전 색상값 삭제)

월크48 핵심 원칙 (반드시 준수):
  - 서비스 정체성: 팬 투표 서비스 (예측·베팅 절대 금지)
  - 대진 흐름: Round는 Voter 투표 흐름 기반 자동 전환
  - Tournament Deadline만 존재. Round Deadline 금지
  - 투표 정책: 대진별 1일 5회, 자정 KST 리셋
  - 실시간 득표 수 절대 미노출 → ranking_cache %(%) 만

지금 구현할 기능:
  1. [구체적 기능 1]
  2. [구체적 기능 2]

완료 기준:
  - [테스트 가능한 완료 조건]

시작해주세요.
```

---

*© 2026 WorldCrown48 | 작성: 48티오 | ARCHITECTURE.md v1.0 | CONFIDENTIAL*
*v4.8 완결판 기반 | 모든 에이전트는 이 문서를 숙지한 후 코딩을 시작하세요.*
