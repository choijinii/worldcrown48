> ⚠️ **2026-07-11 대개편 정합성 공지** — 이 문서의 일부 내용이 대개편 결정으로 대체되었습니다.
> 충돌 시 최신 진실 우선순위: `CLAUDE.md v2.2 「🔄 2026-07 대개편」` > `LANGUAGE.md v1.7 §13` > 이 문서.
> 상세 결정: `outputs/handoffs-staging/WC48_개편결정_v1_2026-07-10.md` (v1.2)
> 이 문서는 MVP1 시점의 역사적 기준 문서입니다. 대개편 이후 계획(카테고리 3단계 런칭·Pitch/Arena 홈 개편·Bracket Size·Crown Score)과 충돌하는 부분은 결정 문서 v1.2가 우선

# WorldCrown48 MVP 1 — Product Requirements Document
# PRD-MVP1 v2.2 | 뉴스룸 2칼럼 + Fan Intelligence 반영 · 문서 정합성 정정

**작성일:** 2026-05-25
**이전 버전:** PRD-MVP1 v2.1 (2026-05-16)
**런칭 목표:** MVP 1 — 2026년 5월 31일 / MVP 1.5 — 2026년 6월 10일 (FIFA 북중미 월드컵 개막 6/11 전)
**상태:** ready-for-agent
**용어 기준:** LANGUAGE.md v1.4 (단일 진실 공급원)
**설계서 기준:** WorldCrown48_v4_9.md + CLAUDE.md v2.0 + CONTEXT_v0_6.md
**디자인 기준:** WC48_DESIGN_SYSTEM_v2.3.md (Twilight Stadium Cinematic Edition)

> ⚠️ **v2.2 변경사항 (v2.1 대비)** — 대표님 지시 및 문서 정합성 정정
> - ★ **AI 뉴스 생성(Fan Intelligence) 범위 정정** — v2.1 §8은 "AI 뉴스 = MVP 2 Out of Scope"였으나,
>   `WC48_FAN_INTELLIGENCE_v1_0.md`(2026-05-17)와 `CONTEXT_v0_6.md`에서 **MVP 1.5로 신설**됨. v2.2에 정식 반영.
> - ★ **"AI GENERATED" 배지 → "AI-Report" 표기로 교체** (v2.1 S-6·§9의 구표기 폐기 — 불변 원칙 #4)
> - ★ **MVP 1.5 마일스톤 추가** (2026-06-10, 관리자 수동 Fan Intelligence 생성)
> - ★ **Module 7 NewsRoom 전면 개정** — Arena 2칼럼(키워드 7 + AI-Report 3), The Pitch 통합 뉴스룸 신규
> - ★ **Module 9 Fan Intelligence 신규** (AI 뉴스 생성 — 표시 + 생성)
> - ★ **§6-4 디자인 토큰 중복 제거** — 토큰 전문 나열을 폐기하고 `WC48_DESIGN_SYSTEM_v2.3.md` 단일 진실 포인터로 교체
> - ★ **DB 컬렉션명 정합** — `news_cache` · `ranking_cache` · `ai_news` (v4.9 §14 master 스키마 기준 snake_case)
> - v2.1의 용어·기술스택·대진 흐름·핵심 User Stories는 유지

---

## 1. Problem Statement

전 세계 축구 팬들은 월드컵 시즌마다 "최고의 선수는 누구인가"를 두고 열띤 토론을 벌이지만,
이를 구조적으로 경험할 수 있는 플랫폼이 없다. 기존 SNS 여론조사는 단순 찬반 투표에 그치며,
48개의 Contestant을 1:1 Tournament 방식으로 가려내는 팬덤 경험은 존재하지 않는다.
팬들은 자신의 투표 결과를 시각적으로 공유하고 싶지만 그럴 수 있는 도구도 없다.

---

## 2. Solution

WorldCrown48(월크48)은 48개의 Contestant을 1:1 Match 방식으로 투표해
최후의 1인(Champion)을 가리는 글로벌 팬덤 Tournament 플랫폼이다.

투표 결과는 **Crown Card**라는 시각적 카드로 자동 생성되어 SNS에 공유되며 바이럴 루프를 형성한다.
대진과 관련된 외부 뉴스와, 팬 투표 데이터 기반 **AI-Report**(Fan Intelligence)가 뉴스룸에서 함께 제공된다.

**MVP 1**은 2026 FIFA 북중미 월드컵 개막(6/11) 전에 월드컵 선수 Tournament로 운영되며,
Tournament Host(System Admin)가 큐레이션한 고품질 대진으로 서비스를 시작한다.

### 2-1. 바이럴 루프

```
방문 → The Pitch 대진 선택 → The Arena 입장
→ 48강~결승 자동 진행 (Round Transition 효과 포함)
→ Champion 확정 → Crown Card 자동 생성
→ 뉴스 선택 → SNS 공유 (뉴스 링크 첨부)
→ 공유 링크로 신규 Voter 유입 (바이럴)
```

### 2-2. 서비스 정체성 (절대 불변)

```
월크48 = 팬이 좋아하는 Contestant를 투표하는 서비스 (이상형 월드컵 방식)
절대 금지:
  ✗ 우승자 예측 게임 / 스포츠 베팅·내기 연동
  ✗ 실제 경기 결과와 연동 / 외부 일정에 자동 종속
  ✗ Vote Count(절대 수치) UI 노출
```

---

## 3. 7개 도메인 구조 (MVP 범위 표시)

```
Domain 0: Launch Pad       [MVP 1]   — 사전 랜딩·웨이트리스트     [📱+🖥️] 🌑 다크
Domain 1: The Pitch        [MVP 1]   — 메인 홈·트렌딩·뉴스룸      [📱+🖥️] 🌑 다크
Domain 2: The Lab          [MVP 1*]  — Tournament 생성 (관리자)   [🖥️]    🌑 다크
Domain 3: The Arena        [MVP 1]   — 투표·Crown Card·뉴스룸     [📱+🖥️] 🌑 다크
Domain 4: The Locker Room  [MVP 1*]  — 로그인·GDPR (M1·M3만)      [📱+🖥️] ☀️ 라이트
Domain 5: Policy Hub       [MVP 1]   — 정책·쿠키                 [📱+🖥️] ☀️ 라이트
Domain 6: Admin Dashboard  [MVP 1]   — 관리·Fan Intelligence 생성 [🖥️]    ☀️ 라이트
```

> 반응형 기준: 모바일(375px) / 태블릿(768px) / 데스크탑(1440px) — 3화면 모두 확인 필수
> Domain 2(The Lab), Domain 6(Admin Dashboard)는 데스크탑 전용

---

## 4. User Stories

### 4-1. Domain 0: Launch Pad (사전 랜딩 — MVP 1)

| # | 역할 | 스토리 |
|---|------|--------|
| L-1 | 방문자 | 월드컵 개막 카운트다운 타이머와 서비스 소개를 볼 수 있어야 한다 |
| L-2 | 방문자 | 이메일을 입력해 웨이트리스트에 등록할 수 있어야 한다 |
| L-3 | 방문자 | 등록 시 즉시 확인 메시지를 받아야 한다 |

### 4-2. 일반 방문자 (비로그인)

| # | 역할 | 스토리 |
|---|------|--------|
| V-1 | 방문자 | 로그인 없이 The Pitch(홈)에서 진행 중인 Tournament 목록을 볼 수 있어야 한다 |
| V-2 | 방문자 | Tournament 카드를 클릭하면 The Arena로 이동해 VS Battle View를 볼 수 있어야 한다 |
| V-3 | 방문자 | 첫 방문 시 쿠키 동의 배너를 하단에서 볼 수 있어야 한다 |
| V-4 | 방문자 | 쿠키 배너에서 "모두 허용", "필수만 허용", "설정하기" 중 하나를 선택할 수 있어야 한다 |
| V-5 | 방문자 | 이용약관과 커뮤니티 가이드라인 페이지를 볼 수 있어야 한다 |
| V-6 | 방문자 | 정책 페이지를 한국어와 영어 탭으로 전환해 볼 수 있어야 한다 |
| V-7 ★ | 방문자 | The Pitch 홈에서 Trending 섹션 바로 아래 뉴스룸을 보고, 키워드 뉴스와 AI-Report를 생성순으로 확인할 수 있어야 한다 |

### 4-3. 로그인 Voter

> ⚠️ 소셜 로그인 필수. 비로그인 투표는 지원하지 않는다.

| # | 역할 | 스토리 |
|---|------|--------|
| U-1 | Voter | Google / Apple 계정으로 로그인할 수 있어야 한다 |
| U-2 | Voter | The Arena에서 48강부터 순서대로 Match에 투표할 수 있어야 한다 |
| U-3 | Voter | 한쪽 Contestant을 선택하면 다음 Match가 자동으로 나타나야 한다 |
| U-4 | Voter | Round 마지막 Match 완료 후 Round Transition 효과를 보고 다음 Round가 자동 시작되어야 한다 |
| U-5 | Voter | 결승에서 최후의 1인을 선택하면 Champion 확정 + Crown Card가 자동 생성되어야 한다 |
| U-6 | Voter | Crown Card를 이미지 파일로 다운로드할 수 있어야 한다 |
| U-7 | Voter | Crown Card를 트위터/X, 인스타그램 스토리용으로 공유할 수 있어야 한다 |
| U-8 ★ | Voter | The Arena 뉴스룸에서 키워드 뉴스(좌)와 AI-Report 뉴스(우)를 2칼럼으로 볼 수 있어야 한다 |
| U-9 ★ | Voter | AI-Report 기사에는 "● AI-Report" 배지가 표시되어 AI 작성 콘텐츠임을 알 수 있어야 한다 |
| U-10 | Voter | 투표 기록이 저장되어 다시 방문해도 내 결과를 볼 수 있어야 한다 |
| U-11 | Voter | 계정 설정에서 내 데이터 삭제를 요청할 수 있어야 한다 (GDPR Right to Erasure) |
| U-12 | Voter | 하루에 신규 참가 Tournament 5개를 넘겨 6번째 Tournament에 참가하려 하면 차단 메시지를 받아야 한다 (Daily Participation Limit; 참가한 대회 안에서는 무제한) |

### 4-4. Tournament Host / System Admin

> ⚠️ MVP 1에서는 System Admin만 Tournament Host 권한을 가진다.

| # | 역할 | 스토리 |
|---|------|--------|
| A-1 | Admin | `/admin/lab`에서 Tournament 제목 입력 시 Claude API가 48개 Contestant을 자동 추천해야 한다 |
| A-2 | Admin | AI 추천 Contestant 목록을 검토·수정·삭제·순서 변경할 수 있어야 한다 |
| A-3 | Admin | 각 Contestant 이미지를 3단계 소싱 정책(L1/L2/L3)에 따라 등록할 수 있어야 한다 |
| A-4 | Admin | Tournament에 Tournament Deadline을 설정할 수 있어야 한다 |
| A-5 | Admin | Tournament를 공개(Published)/비공개(Draft) 상태로 설정할 수 있어야 한다 |
| A-6 | Admin | 진행 중인 Tournament의 투표 현황(Vote Rate %)을 볼 수 있어야 한다 |
| A-7 | Admin | 비정상 투표 패턴 감지 시 알림을 받아야 한다 |
| A-8 ★ | Admin | Admin Dashboard에서 [Fan Intelligence 생성] 버튼으로 AI-Report 초안을 생성할 수 있어야 한다 (MVP 1.5) |
| A-9 ★ | Admin | AI 자동 검수 6항목 결과를 확인하고 초안을 승인·수정·반려할 수 있어야 한다 (MVP 1.5) |

### 4-5. 시스템 (자동화 요구사항)

| # | 요구사항 |
|---|---------|
| S-1 | Rate Limiting: 동일 Voter가 1분 10회 이상 투표 시 15분 쿨다운 적용 |
| S-2 | Daily Participation Limit: 동일 Voter는 하루(KST 00:00 리셋) 신규 Tournament 5개까지 참가. 이미 참가한 Tournament 안에서는 투표 무제한 (HF-1, 2026-07-05) |
| S-3 | 투표 집계를 Firebase Realtime Database 트랜잭션으로 처리 |
| S-4 | advanceRound(): Voter가 Round 마지막 Match 완료 시 자동으로 다음 Round 전환. Round에 Deadline 없음 |
| S-5 | 라운드 흐름: 48강(24)→24강(12)→12강(6)→6강(3)→결승(1)→Champion→Crown Card |
| **S-6 ★** | **모든 AI 생성 콘텐츠에 "AI-Report" 표기를 자동 적용한다 — 카드 "● AI-Report"(11px 골드) + 본문 "✦ AI-Report" 블록(12px) + HTML 메타태그. ("AI GENERATED" 표기 폐기)** |
| S-7 | 쿠키 동의 선택을 Firestore에 저장해 GDPR 감사 추적 요건 충족 |
| S-8 | 랭킹·뉴스에 Vote Rate(%)만 표시. Vote Count(절대 수치) 절대 노출 금지 |
| S-9 | Tournament Deadline 경과 시 Tournament 상태를 자동 Closed로 변경 |
| S-10 | DMCA 이미지 신고 접수 시 즉시 비공개 + 24시간 내 검토 |
| S-11 | 키워드 뉴스는 GNews API → news_cache 1시간 캐시. 본문 미저장(제목+출처+URL+썸네일만) |

---

## 5. 대진 흐름 핵심 원칙 (절대 불변)

```
★ 핵심 원칙:
  1. Tournament에만 Deadline이 존재한다 (Tournament Deadline)
  2. Round에는 Deadline이 없다 — Voter 투표 흐름에 따라 시스템 자동 전환
  3. 라운드 전환: Voter가 Round 마지막 Match 완료 → advanceRound() 시스템 자동 실행
  4. Match는 Voter에게 순서대로 하나씩 제시 (동시 진행 아님)
  5. Tournament Host는 Tournament Deadline만 설정. 라운드 수동 전환 기능 없음

Voter 1명의 완전한 흐름:
  입장 → 48강(24) → [전환] → 24강(12) → [전환] → 12강(6) → [전환]
      → 6강(3) → [전환] → 결승(1) → Champion 확정 → Crown Card → SNS 공유
```

> ❌ 절대 금지: "Round Deadline", "라운드 마감일", "Host가 라운드를 전환한다", "rounds[].deadline"

---

## 6. Implementation Decisions

### 6-1. 모듈 구성 (10개 모듈)

#### Module 0: LaunchPad — `/` (오픈 전) — MVP 1
월드컵 카운트다운 + 이메일 웨이트리스트(`waitlist` 컬렉션). 다크 테마.

#### Module 1: TournamentFeed (The Pitch) — `/` (오픈 후) — MVP 1
Firestore 쿼리 `status=='active'`, `trendScore` 내림차순. `onSnapshot` 실시간. 반응형 그리드(1/2/3열).

#### Module 2: VoteEngine (The Arena 핵심) — MVP 1
Firestore 트랜잭션 1:1 투표. 소셜 로그인 필수, Daily Participation Limit(1일 신규 Tournament 5개, 참가 대회 내 무제한), KST 리셋.
Rate Limiting(per-uid 토큰 버킷 1분 5회). advanceRound() 자동 전환 + Round Transition 효과.

#### Module 3: CrownCardGenerator — MVP 1
클라이언트 HTML Canvas 이미지 생성. PNG 1080×1080. Champion 확정 시 자동 트리거.

#### Module 4: AuthGate — MVP 1
Firebase Auth (Google + Apple). 비로그인 열람 가능 → 투표 클릭 시 로그인 모달.

#### Module 5: CookieConsent — MVP 1
3-티어(필수/기능/분석). 동의 저장 `cookie_consents`. 화면 하단 고정.

#### Module 6: AdminTournamentCreator (`/admin/lab`) — MVP 1
Claude API 48개 Contestant 추천. 이미지 소싱 L1/L2/L3. `tournaments` + `contestants` 저장.

#### Module 7: NewsRoom ★ v2.2 전면 개정 — MVP 1
- **The Arena 뉴스룸 (2칼럼)**: 좌 Keyword News View(GNews 7건) / 우 AI-Report News View(3건)
- **The Pitch 뉴스룸 (통합 피드)**: 키워드+AI-Report 생성순 6건. 홈 Trending 섹션 바로 밑
- 키워드 뉴스: GNews API Basic $9/월 → `news_cache` 1시간 캐시
- 모바일은 Arena 2칼럼을 탭으로 전환. 상세: `docs/lite-specs/C4-newsroom.md`

#### Module 8: PolicyHub (Domain 5) — MVP 1
`/policies/terms`, `/community`, `/privacy`, `/cookies`. 한/영 탭. 라이트 테마.

#### Module 9: FanIntelligence ★ v2.2 신규 — MVP 1(UI) · MVP 1.5(생성)
- **표시**: Arena 뉴스룸 AI-Report 칼럼 + The Pitch 통합 피드. MVP 1은 "준비 중" 빈 상태
- **생성(MVP 1.5)**: Admin Dashboard [Fan Intelligence 생성] 버튼 → `ranking_cache` → Claude API
  → ko/en 초안 → AI 자동 검수 6항목 → 관리자 승인 → `ai_news` 발행
- 상세: `docs/lite-specs/C5-fan-intelligence.md` · 전략: `WC48_FAN_INTELLIGENCE_v1_0.md`

### 6-2. 기술 스택 확정

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | Next.js 14 (App Router) + TypeScript |
| UI/UX | Tailwind CSS 3.4 + Shadcn/UI + Framer Motion + GSAP |
| 상태 관리 | Zustand |
| 백엔드 DB | Firebase Firestore + Realtime Database |
| 인증 | Firebase Auth (Google + Apple) |
| 서버리스 | Cloud Functions for Firebase (Node.js) |
| AI | Claude API (claude-sonnet-4-20250514) |
| 뉴스 | GNews API Basic $9/월 (키워드 뉴스) |
| 호스팅 | Vercel (프론트) + Firebase (백엔드) |
| CDN/보안 | Cloudflare (worldcrown48.com) |

### 6-3. 데이터 스키마 (요약 — 전체 master: v4.9 §14)

```typescript
tournaments  { id, title, category, tournamentType, status, isPublic,
               hostUid, createdAt, tournamentDeadline, currentRound, totalContestants }
contestants  { id, tournamentId, name, imageUrl, imageSource, seed, createdAt }   // 48개 고정
votes        { userId, tournamentId, matchId, contestantId, votedAt, date, ipHash }
ranking_cache{ tournamentId, cachedAt, rankings:[{contestantId, rate}] }          // % 만
news_cache   { tournamentId, articles:NewsArticle[7], keywords, cachedAt }        // 본문 미저장
ai_news      { tournamentId, type, trigger, content:{titleKo,titleEn,bodyKo,bodyEn},
               crownCardUrl, aiDisclosure, voteData, status, autoCheckResult,
               reviewedBy, publishedAt, isLaunchNews, createdAt }                 // C5 §7
users        { uid, role, email, displayName, createdAt, dailyVoteCount }
cookie_consents / waitlist / admin_alerts / audit_log / crown_cards
```

> ⚠️ DB 컬렉션명은 v4.9 §14 master 스키마 기준(snake_case: `news_cache`·`ranking_cache`·`ai_news`).
> v2.1의 `newsCache`·`rankingCache` 표기는 폐기.

### 6-4. 디자인 시스템 토큰 ★ v2.2 — 단일 진실 포인터

> ⛔ **디자인 토큰 단일 진실 공급원: `docs/design/WC48_DESIGN_SYSTEM_v2.3.md`**
> 색상·그림자·모서리 반경·폰트·타입 스케일·Cinematic 기법(노이즈·자석버튼·GNB·GSAP)은
> 모두 위 문서를 기준으로 한다. v2.1까지 PRD 본문에 복제돼 있던 토큰 전문은 **중복 폐기**한다
> (단일 진실 공급원 원칙 위반 정정). UI 작업 시 PRD가 아닌 디자인 시스템 문서를 참조할 것.
>
> 핵심 요약(상세는 디자인 시스템 문서):
> - 다크 테마(D0~3): Deep Osidian `#00003A` / Deep Twilight `#0E0944` / 골드 `#FCD006`
> - 라이트 테마(D4~6): `#F2F2F5` 배경 / `#FFFFFF` 표면 / 골드 `#FCD006` 공통
> - 순수 블랙(`#000000`) 금지. 평면 그라디언트 금지(노이즈 텍스처 사용)

---

## 7. Testing Decisions

| 모듈 | 테스트 유형 | 핵심 케이스 |
|------|-----------|------------|
| VoteEngine | 통합 (Firebase Emulator) | 정상 투표, 신규 Tournament 6개째 참가 차단, 참가 대회 내 무제한, advanceRound() 전환 |
| CrownCardGenerator | 유닛 | 캔버스 출력 크기(1080×1080), 필수 요소 |
| CookieConsent | 통합 | 동의 저장, 재방문 시 미표시 |
| AdminTournamentCreator | 유닛 | Claude API 응답 파싱, Contestant 48개 |
| AuthGate | E2E | 비로그인 열람 → 투표 클릭 → 로그인 → 투표 |
| NewsRoom | 통합 | getNewsCache 호출, 1시간 캐시 hit, 2칼럼/탭 렌더링 |
| FanIntelligence | 통합 | generateFanIntelligence 생성, 6항목 검수, 승인→발행 (MVP 1.5) |

테스트 환경: Firebase Local Emulator Suite / Playwright E2E / Vitest 유닛.

---

## 8. Out of Scope (MVP 1)

| 기능 | 예정 단계 |
|------|----------|
| Domain 4 The Locker Room (M2·M4 프로필·기록) | MVP 2 |
| K-POP 카테고리 | MVP 2 (7월) |
| **AI 뉴스 자동화 (특이점 4종 + Champion 트리거)** | **MVP 2** |
| 다국어 스페인어(es) | MVP 2 |
| fingerprintjs 부정투표 방어 | MVP 2 |
| AI 뉴스 PR 자동 배포 | MVP 3 |
| B2B SaaS / API | MVP 3 |
| 마케팅 쿠키 | MVP 3 |
| 모바일 앱 | 계획 없음 |

> ★ v2.2 정정: **AI 뉴스 "생성" 자체는 더 이상 Out of Scope가 아니다.** 관리자 수동 생성은 MVP 1.5,
> 자동화만 MVP 2다. v2.1 §8의 "AI 뉴스 생성 → MVP 2" 항목은 폐기.

---

## 9. 불변 원칙

| 원칙 | 내용 |
|------|------|
| FIFA 상표권 | "FIFA", "Official" 표기 절대 금지 |
| 초상권 | 3단계 이미지 소싱 정책 준수. DMCA 신고 24시간 내 대응 |
| Vote Count 노출 금지 | Vote Rate(%)만 표시 |
| **AI-Report 표기** | **모든 AI 생성 콘텐츠에 "AI-Report" 자동 표기 (카드+본문+메타태그). "AI GENERATED" 폐기** |
| Round Deadline 없음 | Round에는 Deadline이 없다. Tournament Deadline만 존재 |
| 순수 블랙 금지 | 다크 테마에 `#000000` 금지 — 네이비-인디고 톤 |

---

## 10. 마일스톤

| 단계 | 시기 | 핵심 |
|------|------|------|
| MVP 1 | 2026-05-31 | Domain 0~3+5~6, 투표 엔진, Crown Card, 뉴스룸 2칼럼(키워드 작동/AI 준비중), The Pitch 뉴스룸 |
| MVP 1.5 | 2026-06-10 | 관리자 수동 Fan Intelligence 생성 (런치 뉴스) |
| MVP 2 | 2026-07 | AI 뉴스 자동화, K-POP, Locker Room, 다국어(es), fingerprintjs |
| MVP 3 | 2026 하반기 | PR 자동 배포, B2B SaaS, 부정투표 3단계 |

---

## 11. 참조 문서

| 문서 | 역할 |
|------|------|
| `WorldCrown48_v4_9.md` | 전체 설계 마스터 |
| `LANGUAGE.md v1.4` | 공식 용어 단일 진실 |
| `WC48_DESIGN_SYSTEM_v2.3.md` | 디자인 토큰 단일 진실 |
| `WC48_FAN_INTELLIGENCE_v1_0.md` | AI-Report 전략 |
| `docs/lite-specs/C4-newsroom.md` | 뉴스룸·키워드 뉴스 명세 |
| `docs/lite-specs/C5-fan-intelligence.md` | AI 뉴스 생성 명세 |
| `CLAUDE.md v2.0` / `CONTEXT_v0_6.md` | 행동 규칙·현황 |

---

## 변경 이력

| 버전 | 날짜 | 주요 변경 |
|------|------|---------|
| **v2.2** | **2026-05-25** | **AI 뉴스(Fan Intelligence) MVP 1.5 정식 반영 / "AI GENERATED"→"AI-Report" 교체 / MVP 1.5 마일스톤 추가 / Module 7 뉴스룸 2칼럼 개정 + Module 9 Fan Intelligence 신규 / The Pitch 뉴스룸 추가 / §6-4 디자인 토큰 중복 폐기→단일 진실 포인터 / DB 컬렉션명 snake_case 정합** |
| v2.1 | 2026-05-16 | §6-4 디자인 토큰 전면 교정 (WC48_DESIGN_SYSTEM_v2.1 기준) |
| v2.0 | 2026-05-16 | LANGUAGE.md v1.2 용어 정렬, Next.js 14 스택 |
| v1.0 | 2026-05-08 | 최초 작성 |

---

*© 2026 WorldCrown48 | 작성: Claude (Cowork) | PRD-MVP1 v2.2 | CONFIDENTIAL*
