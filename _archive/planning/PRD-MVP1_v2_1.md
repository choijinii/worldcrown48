# WorldCrown48 MVP 1 — Product Requirements Document
# PRD-MVP1 v2.1 | 디자인 토큰 WC48_DESIGN_SYSTEM_v2.1 기준 전면 교정

**작성일:** 2026-05-16  
**이전 버전:** PRD-MVP1 v2.0 (2026-05-16)  
**런칭 목표:** 2026년 6월 11일 전 (FIFA 북중미 월드컵 개막 전)  
**상태:** ready-for-agent  
**용어 기준:** LANGUAGE.md v1.2 (단일 진실 공급원)  
**설계서 기준:** WorldCrown48_v4_9.md + CLAUDE.md v2.0 + CONTEXT_v0_6.md  
**디자인 기준:** ★ WC48_DESIGN_SYSTEM_v2.2.md (Twilight Stadium Cinematic Edition)

> ⚠️ **v2.1 변경사항 (v2.0 대비)**
> - ★ §6-4 디자인 시스템 토큰 전면 교정 — WC48_DESIGN_SYSTEM_v2.1 기준
>   - 구버전(CLAUDE.md 잔존 값) 완전 폐기
>   - 다크 배경: 순수 블랙 계열 → Twilight Stadium 네이비-인디고 계열
>   - 전체 컬러 팔레트: 7개 → 28개 토큰으로 확장
>   - 그림자·모서리·폰트 토큰 신규 추가
>   - v2.1 신규 항목 추가: 노이즈 텍스처·자석 버튼·GNB Island·GSAP 스태거
> - §10 참조 문서에 "디자인 토큰 단일 진실 공급원" 경고 추가
> - v2.0의 나머지 모든 내용(용어·스키마·기술스택·User Stories) 100% 유지

---

## 1. Problem Statement

전 세계 축구 팬들은 월드컵 시즌마다 "최고의 선수는 누구인가"를 두고 열띤 토론을 벌이지만,
이를 구조적으로 경험할 수 있는 플랫폼이 없다. 기존 SNS 여론조사는 단순 찬반 투표에 그치며,
48명의 Contestant을 1:1 Tournament 방식으로 가려내는 팬덤 경험은 존재하지 않는다.
팬들은 자신의 투표 결과를 시각적으로 공유하고 싶지만 그럴 수 있는 도구도 없다.

---

## 2. Solution

WorldCrown48(월크48)은 48명의 Contestant을 1:1 Match 방식으로 투표해
최후의 1인(Champion)을 가리는 글로벌 팬덤 Tournament 플랫폼이다.

투표 결과는 **Crown Card**라는 시각적 카드로 자동 생성되어 SNS에 공유되며 바이럴 루프를 형성한다.

**MVP 1**은 2026 FIFA 북중미 월드컵 개막(6월 11일) 전에 월드컵 선수 Tournament로만 운영되며,
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

## 3. 7개 도메인 구조 (MVP 1 범위 표시)

```
Domain 0: Launch Pad       [MVP 1] — 사전 랜딩·웨이트리스트     [📱+🖥️] 🌑 다크
Domain 1: The Pitch        [MVP 1] — 메인 홈·트렌딩 Tournament  [📱+🖥️] 🌑 다크
Domain 2: The Lab          [MVP 2] — Tournament 생성 공간       [🖥️]    🌑 다크
Domain 3: The Arena        [MVP 1] — 투표·Crown Card·뉴스룸     [📱+🖥️] 🌑 다크
Domain 4: The Locker Room  [MVP 2] — Voter 프로필·기록          [📱+🖥️] ☀️ 라이트
Domain 5: Policy Hub       [MVP 1] — 정책·쿠키                 [📱+🖥️] ☀️ 라이트
Domain 6: Admin Dashboard  [MVP 1] — System Admin 관리 콘트롤   [🖥️]    ☀️ 라이트
```

> 반응형 기준: 모바일(375px) / 태블릿(768px) / 데스크탑(1440px) — 3화면 모두 확인 필수
> 단, Domain 2(The Lab), Domain 6(Admin Dashboard)는 데스크탑 전용

---

## 4. User Stories

### 4-1. Domain 0: Launch Pad (사전 랜딩 — MVP 1)

| # | 역할 | 스토리 | 가치 |
|---|------|--------|------|
| L-1 | 방문자 | 월드컵 개막 카운트다운 타이머와 서비스 소개를 볼 수 있어야 한다 | 방문 목적과 런칭 시점을 파악할 수 있다 |
| L-2 | 방문자 | 이메일을 입력해 웨이트리스트에 등록할 수 있어야 한다 | 런칭 시점에 알림을 받을 수 있다 |
| L-3 | 방문자 | 등록 시 즉시 확인 메시지를 받아야 한다 | 등록이 성공했음을 확인할 수 있다 |

### 4-2. 일반 방문자 (비로그인)

| # | 역할 | 스토리 | 가치 |
|---|------|--------|------|
| V-1 | 방문자 | 로그인 없이 The Pitch(홈)에서 현재 진행 중인 Tournament 목록을 볼 수 있어야 한다 | 어떤 Tournament가 있는지 파악하고 참여 여부를 결정할 수 있다 |
| V-2 | 방문자 | Tournament 카드를 클릭하면 The Arena로 이동해 1:1 투표 화면(VS Battle View)을 볼 수 있어야 한다 | 즉시 참여 여부를 판단할 수 있다 |
| V-3 | 방문자 | 사이트 첫 방문 시 쿠키 동의 배너를 하단에서 볼 수 있어야 한다 | 개인정보 처리 방식을 선택할 수 있다 |
| V-4 | 방문자 | 쿠키 배너에서 "모두 허용", "필수만 허용", "설정하기" 중 하나를 선택할 수 있어야 한다 | 원하는 수준의 개인정보를 제공할 수 있다 |
| V-5 | 방문자 | 이용약관과 커뮤니티 가이드라인 페이지를 볼 수 있어야 한다 | 서비스 이용 조건을 확인할 수 있다 |
| V-6 | 방문자 | 정책 페이지를 한국어와 영어 탭으로 전환해서 볼 수 있어야 한다 | 모국어로 정책 내용을 이해할 수 있다 |

### 4-3. 로그인 Voter

> ⚠️ 소셜 로그인 필수. 비로그인 투표는 지원하지 않는다.

| # | 역할 | 스토리 | 가치 |
|---|------|--------|------|
| U-1 | Voter | Google / Apple 계정으로 로그인할 수 있어야 한다 | 간편하게 인증하고 투표에 참여할 수 있다 |
| U-2 | Voter | The Arena에서 48강부터 순서대로 Match에 투표할 수 있어야 한다 | 체계적인 Tournament 경험을 즐길 수 있다 |
| U-3 | Voter | 각 Match에서 한쪽 Contestant을 선택하면 다음 Match가 자동으로 나타나야 한다 | 끊임없는 플로우 상태로 투표할 수 있다 |
| U-4 | Voter | Round의 마지막 Match 완료 후 라운드 전환 효과("맨 어브 더 월드컵 N강")를 보고 다음 Round가 자동 시작되어야 한다 | 라운드 진행 상황을 시각적으로 체감할 수 있다 |
| U-5 | Voter | 결승(Final Match)에서 최후의 1인을 선택하면 Champion이 확정되고 Crown Card가 자동 생성되어야 한다 | 투표의 결말을 시각적으로 확인할 수 있다 |
| U-6 | Voter | Crown Card를 이미지 파일로 다운로드할 수 있어야 한다 | 나의 선택 결과를 소장할 수 있다 |
| U-7 | Voter | Crown Card를 트위터/X, 인스타그램 스토리용으로 공유할 수 있어야 한다 | 내 취향을 팬들과 공유하고 바이럴에 기여할 수 있다 |
| U-8 | Voter | 내가 참여한 Tournament 목록을 볼 수 있어야 한다 (Locker Room — MVP 2) | 투표 이력을 추적할 수 있다 |
| U-9 | Voter | 투표 기록이 저장되어 다시 방문해도 내 결과를 볼 수 있어야 한다 | 재방문 시 이전 경험을 이어갈 수 있다 |
| U-10 | Voter | 계정 설정에서 내 데이터 삭제를 요청할 수 있어야 한다 (GDPR Right to Erasure) | EU 개인정보 보호권을 행사할 수 있다 |
| U-11 | Voter | 같은 Tournament에 하루 5회를 초과해 투표를 시도하면 차단 메시지를 받아야 한다 | 중복 투표 방지 정책을 이해할 수 있다 |

### 4-4. Tournament Host (System Admin — MVP 1)

> ⚠️ MVP 1에서는 System Admin만 Tournament Host 권한을 가진다.
> The Lab(Domain 2)은 MVP 2에서 분리 개발. MVP 1에서는 `/admin` 페이지에서 처리.

| # | 역할 | 스토리 | 가치 |
|---|------|--------|------|
| A-1 | Admin | `/admin` 페이지에서 Tournament 제목을 입력하면 Claude API가 48명 Contestant을 자동 추천해야 한다 | 빠르게 고품질 Tournament를 만들 수 있다 |
| A-2 | Admin | AI 추천 Contestant 목록을 검토하고 수정·삭제·순서 변경을 할 수 있어야 한다 | 큐레이션의 최종 품질을 보장할 수 있다 |
| A-3 | Admin | 각 Contestant의 이미지를 3단계 소싱 정책(L1 자동/L2 수동/L3 금지)에 따라 등록할 수 있어야 한다 | 초상권과 저작권을 준수하며 이미지를 관리할 수 있다 |
| A-4 | Admin | Tournament에 Tournament Deadline을 설정할 수 있어야 한다 | Tournament 전체 마감일을 관리할 수 있다 |
| A-5 | Admin | Tournament를 공개(Published)/비공개(Draft) 상태로 설정해 The Pitch 노출 여부를 제어할 수 있어야 한다 | 준비된 Tournament만 공개할 수 있다 |
| A-6 | Admin | 진행 중인 Tournament의 실시간 투표 현황(Vote Rate %)을 볼 수 있어야 한다 | Tournament의 인기 추이를 모니터링할 수 있다 |
| A-7 | Admin | 비정상 투표 패턴이 감지되면 알림을 받아야 한다 | 어뷰징을 조기에 발견하고 대응할 수 있다 |

### 4-5. 시스템 (자동화 요구사항)

| # | 주체 | 요구사항 |
|---|------|---------|
| S-1 | 시스템 | Rate Limiting: 동일 Voter가 1분에 10회 이상 투표 시 15분 쿨다운을 적용해야 한다 |
| S-2 | 시스템 | 1일 5회 제한: 동일 Voter는 같은 Tournament에서 하루 최대 5개 Match 투표 가능 (KST 00:00 자정 리셋) |
| S-3 | 시스템 | 투표 집계를 Firebase Realtime Database 트랜잭션으로 처리해 정확도를 보장해야 한다 |
| S-4 | 시스템 | advanceRound(): Voter가 해당 Round의 마지막 Match를 완료하면 자동으로 다음 Round로 전환해야 한다. Round에는 Deadline이 없다 |
| S-5 | 시스템 | 라운드 전환 흐름: 48강(24 Match) → 24강(12) → 12강(6) → 6강(3) → 결승(1) → Champion → Crown Card |
| S-6 | 시스템 | 모든 AI 생성 콘텐츠에 "● AI-Report" 배지를 자동으로 표시해야 한다 |
| S-7 | 시스템 | 쿠키 동의 선택을 Firestore에 저장해 GDPR 감사 추적 요건을 충족해야 한다 |
| S-8 | 시스템 | 랭킹 화면에는 Vote Rate(%)만 표시하며 Vote Count(절대 수치)는 절대 노출하지 않는다 |
| S-9 | 시스템 | Tournament Deadline 경과 시 Tournament 상태를 자동으로 Closed로 변경해야 한다 |
| S-10 | 시스템 | DMCA 이미지 신고 접수 시 즉시 비공개 처리 후 24시간 내 검토해야 한다 |

---

## 5. 대진 흐름 핵심 원칙 (절대 불변)

```
★ 핵심 원칙:
  1. Tournament에만 Deadline이 존재한다 (Tournament Deadline)
  2. Round에는 Deadline이 없다 — Voter 투표 흐름에 따라 시스템이 자동 전환
  3. 라운드 전환: Voter가 해당 Round 마지막 Match 완료 → advanceRound() 시스템 자동 실행
  4. Match는 Voter에게 순서대로 하나씩 제시됨 (동시 진행 아님)
  5. Tournament Host는 Tournament Deadline만 설정. 라운드 수동 전환 기능 없음
  6. 이 전체 흐름에서 Host가 개입하는 부분은 없다

Voter 1명의 완전한 흐름:
  입장 → 48강(24 Match) → [Round Transition: "맨 어브 더 월드컵 24강"]
      → 24강(12 Match) → [Round Transition: "맨 어브 더 월드컵 12강"]
      → 12강(6 Match)  → [Round Transition: "맨 어브 더 월드컵 6강"]
      → 6강(3 Match)   → [Round Transition: "맨 어브 더 월드컵 결승"]
      → 결승(1 Final Match) → Champion 확정
      → Crown Card 자동 생성 → 뉴스 선택 → SNS 공유
```

> ❌ 절대 금지: "Round Deadline", "라운드 마감일", "Host가 라운드를 전환한다",
> "rounds[].deadline" (Firestore 스키마 포함)

---

## 6. Implementation Decisions

### 6-1. 모듈 구성 (8개 모듈)

#### Module 0: LaunchPad
- 경로: `/` (서비스 오픈 전 운영, 오픈 후 The Pitch로 전환)
- 월드컵 개막 카운트다운 타이머
- 이메일 웨이트리스트 수집: Firestore `waitlist` 컬렉션
- 테마: 다크 (Deep Osidian `#060C3B`)

#### Module 1: TournamentFeed (The Pitch)
- 경로: `/` (서비스 오픈 후)
- Firestore 쿼리: `status == 'published' AND status == 'active'`, `trendScore` 내림차순
- 실시간 업데이트: Firestore `onSnapshot` 리스너
- 카드 레이아웃: 반응형 그리드 (모바일 1열 / 태블릿 2열 / 데스크탑 3열)
- hover 시 Gold(`#FFD700`) 좌측 보더 활성화

#### Module 2: VoteEngine (The Arena 핵심)
- Firebase Realtime Database 트랜잭션 기반 1:1 투표 처리
- 투표 정책: 소셜 로그인 필수 (Google / Apple), 1일 5회 (Tournament별 독립), KST 00:00 자정 리셋
- Rate Limiting: Cloud Functions — 1분 10회+ → 15분 쿨다운
- advanceRound() 자동 전환: Voter의 해당 Round 마지막 Match 완료 시 트리거
- Round Transition 효과: "맨 어브 더 월드컵 N강" 화면 자동 표시 후 다음 Round 시작
- ⚠️ Round에는 Deadline 없음. `advanceRound()`는 Voter 행동 트리거

#### Module 3: CrownCardGenerator
- 클라이언트 사이드 HTML Canvas 기반 이미지 생성 (로그인 후 활성화)
- 출력: PNG 이미지 (1080×1080 정사각형, SNS 최적화)
- 디자인: Deep Osidian(`#060C3B`) 배경, Crown Gold(`#FFD700`) 테두리,
  Champion 이미지 + 이름(Playfair Display) + Tournament 명 + 월크48 워터마크
- generateCrownCard(): Champion 확정 시 시스템 자동 트리거

#### Module 4: AuthGate
- Firebase Auth (Google Provider + Apple Provider)
- 흐름: 비로그인 → The Pitch 열람 가능 → 투표 클릭 → 로그인 모달 → 로그인 → 투표 시작
- 비로그인 투표 없음. 로그인 후 투표 가능.

#### Module 5: CookieConsent
- 3-티어: 필수(항상 활성) / 기능(선택) / 분석(선택)
- 마케팅 쿠키: MVP 3까지 비활성
- 동의 저장: Firestore `cookieConsents` 컬렉션
- 재동의 주기: 12개월 / 위치: 화면 하단 고정

#### Module 6: AdminTournamentCreator (MVP 1: /admin 통합, MVP 2: The Lab 분리)
- Claude API: `claude-sonnet-4-20250514` 모델로 48명 Contestant 추천
- 이미지 소싱: L1(CC 라이선스 자동) / L2(관리자 수동 승인) / L3(절대 금지)
- 저장: Firestore `tournaments` + `contestants` 일괄 저장

#### Module 7: NewsRoom
- MVP 1: GNews API 키워드 기반 뉴스 소비 ($9/월 Basic)
- 뉴스 캐시: Firestore `newsCache`, 1시간 갱신

#### Module 8: PolicyHub (Domain 5)
- 경로: `/policies/terms`, `/policies/community`, `/policies/privacy`, `/policies/cookies`
- 한국어 기본, 영어 탭 전환 / 테마: 라이트

---

### 6-2. 기술 스택 확정

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | Next.js 14 (App Router) + TypeScript |
| UI/UX | Tailwind CSS 3.4 + Shadcn/UI + Framer Motion + GSAP |
| 상태 관리 | Zustand |
| 백엔드 DB | Firebase Firestore + Realtime Database |
| 인증 | Firebase Auth (Google + Apple Provider) |
| 서버리스 | Cloud Functions for Firebase (Node.js) |
| AI | Claude API (claude-sonnet-4-20250514) |
| 뉴스 | GNews API Basic $9/월 (MVP 1) → Claude API (MVP 2) |
| 호스팅 | Vercel (프론트) + Firebase (백엔드) |
| CDN/보안 | Cloudflare (worldcrown48.com) |

---

### 6-3. 데이터 스키마

```typescript
// ─── tournaments ────────────────────────────────────────────────────
tournaments: {
  id: string;
  title: string;
  category: 'football' | 'kpop' | 'custom';
  status: 'draft' | 'published' | 'active' | 'closed' | 'completed' | 'archived';
  isPublic: boolean;
  createdBy: string;
  createdAt: Timestamp;
  tournamentDeadline: Timestamp;  // ✅ Tournament 전체의 유일한 마감일
  currentRound: number;           // ✅ advanceRound()로 시스템 자동 증가
  trendScore: number;
  // ❌ rounds[].deadline 절대 금지
}

// ─── contestants (★ v2.0: candidates → contestants) ──────────────────
contestants: {
  id: string;
  tournamentId: string;
  name: string;
  imageUrl: string;
  imageSourceUrl: string;
  imageSourceLevel: 'L1' | 'L2';
  nationality: string;
  position?: string;
  order: number;
}

// ─── votes ────────────────────────────────────────────────────────────
votes: {
  id: string;
  tournamentId: string;
  voterId: string;
  matchId: string;
  roundNumber: number;
  winnerId: string;
  timestamp: Timestamp;
  voteDate: string; // 'YYYY-MM-DD KST'
}

// ─── rankingCache (★ v2.0: vote_stats → rankingCache) ─────────────────
rankingCache: {
  tournamentId: string;
  contestantId: string;
  voteRate: number;   // Vote Rate(%)만 — Vote Count 노출 금지
  cachedAt: Timestamp;
}

// ─── users ────────────────────────────────────────────────────────────
users: {
  uid: string;
  role: 'admin' | 'host' | 'voter';
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  dailyVoteCount: { [tournamentId: string]: { date: string; count: number } }
}

// ─── cookieConsents / waitlist / newsCache / adminAlerts / auditLog ───
// (v2.0과 동일 — 변경 없음)
```

---

### 6-4. 디자인 시스템 토큰 ★ v2.1 전면 교정 — WC48_DESIGN_SYSTEM_v2.1 기준

> ⛔ **단일 진실 공급원**: 디자인 토큰은 반드시 `WC48_DESIGN_SYSTEM_v2.2.md`를 기준으로 한다.
> CLAUDE.md·CONTEXT.md의 색상값은 구버전이므로 UI 작업 시 절대 참조 금지.

#### 다크 테마 — Domain 0, 1, 2, 3 (Twilight Stadium Edition)

```css
/* ── 배경 팔레트 ── */
--color-bg-deep:      #060C3B;   /* Deep Osidian — 가장 깊은 배경, Arena Hero */
--color-bg-default:   #141466;   /* Deep Twilight — 기본 다크 배경 */
--color-bg-soft:      #1E1E48;   /* Twilight Soft — 카드·패널 배경 */
--color-bg-elevated:  #334066;   /* Twilight Indigo — 플로팅 요소 */
--color-bg-charcoal:  #1E1E24;   /* Deep Charcoal — GNB Island 배경 */

/* ── 브랜드 컬러 (Gold 계열) ── */
--color-gold:         #FFD700;   /* Crown Gold — 메인 CTA, 로고, VS 배지 (양쪽 테마 공통) */
--color-gold-bright:  #FBB03B;   /* 밝은 골드 — 특수 강조 */
--color-gold-hover:   #FFC000;   /* 호버 골드 */
--color-gold-subtle:  rgba(255, 215, 0, 0.12);   /* 골드 배경 틴트 */
--color-gold-glow:    rgba(255, 215, 0, 0.25);   /* 골드 글로우 */
--color-aura:         #FFE87C;   /* Aura Yellow — 부드러운 강조, 카운트다운, 알림 */
--color-aura-subtle:  rgba(255, 232, 124, 0.10);

/* ── 액센트 컬러 ── */
--color-crimson:      #CF2E45;   /* Royal Crimson — VS 우측, Live, 마감 임박, 에러 */
--color-crimson-glow: rgba(207, 46, 69, 0.30);
--color-turquoise:    #39CFB8;   /* Turquoise — 투표 완료, 성공, VS 좌측 */
--color-turquoise-glow: rgba(57, 207, 184, 0.25);
--color-powder:       #A6BDD6;   /* Powder Blue — 보조 텍스트, 구분선, 인포 아이콘 */

/* ── 텍스트 ── */
--color-text:         #F0F5F7;   /* Off-White — 기본 텍스트 */
--color-text-sub:     #A6BDD6;   /* Powder Blue — 보조 텍스트 */
--color-text-muted:   #6B7A99;   /* Muted — 비활성 보조 */
--color-text-disabled:#3B4566;   /* Disabled */

/* ── 테두리 ── */
--color-border:       #2A3A66;   /* 기본 다크 테두리 */
--color-border-soft:  #1F2A52;   /* 더 부드러운 테두리 */
--color-border-gold:  rgba(255, 215, 0, 0.30);   /* 골드 테두리 — 강조 카드 */

/* ── 상태 컬러 ── */
--color-error:        #CF2E45;
--color-success:      #39CFB8;
--color-warning:      #FFE87C;
--color-info:         #A6BDD6;
```

#### 라이트 테마 — Domain 4, 5, 6

```css
--color-bg-light:         #F0F5F7;   /* 라이트 배경 */
--color-surface-light:    #FFFFFF;   /* 카드 배경 */
--color-surface-elevated: #E8EEF2;   /* 플로팅 요소 */
--color-gold:             #FFD700;   /* 브랜드 골드 (공통) */
--color-gold-hover:       #FFC000;
--color-aura:             #FFE87C;
--color-crimson:          #B5223A;   /* 라이트 테마용 Crimson (약간 어둡게) */
--color-turquoise:        #1FA68F;   /* 라이트 테마용 Turquoise */
--color-text-light:       #141466;   /* 기본 텍스트 */
--color-text-sub-light:   #334066;   /* 보조 텍스트 */
--color-text-muted-light: #6B7A99;
--color-border-light:     #D4DCE3;
--color-border-subtle:    #E8EEF2;
```

#### 그림자 토큰

```css
--shadow-card:      0 4px 24px rgba(6, 12, 59, 0.50);
--shadow-modal:     0 8px 48px rgba(6, 12, 59, 0.70);
--shadow-gold:      0 0 32px rgba(255, 215, 0, 0.25);
--shadow-gold-hover:0 8px 32px rgba(255, 215, 0, 0.18);
--shadow-aura:      0 0 24px rgba(255, 232, 124, 0.18);
--shadow-crimson:   0 0 24px rgba(207, 46, 69, 0.25);
--shadow-turquoise: 0 0 24px rgba(57, 207, 184, 0.20);
--shadow-gnb:       0 8px 32px rgba(6, 12, 59, 0.40);
```

#### 모서리 반경 토큰

```css
--radius-card:      24px;   /* 일반 카드 */
--radius-card-hero: 32px;   /* VS Battle·히어로 카드 */
--radius-modal:     20px;
--radius-panel:     16px;
--radius-btn:       12px;
--radius-badge:     8px;
--radius-chip:      999px;  /* pill 형태 */
```

#### 폰트 시스템

```css
--font-heading: 'Inter', 'Pretendard', sans-serif;   /* 히어로·섹션 타이틀 */
--font-display: 'Playfair Display', serif;            /* Champion·Crown Card 전용 */
--font-body:    'Inter', 'Pretendard', sans-serif;
--font-mono:    'JetBrains Mono', monospace;          /* 카운트다운·숫자·배지 */
```

#### 타입 스케일

```
48px/56px  bold  font-heading  — Hero 슬로건
36px/44px  bold  font-heading  — 섹션 제목
28px/36px  semibold  font-display  — Champion 이름 (Crown Card 전용)
22px/32px  semibold              — Contestant 이름 (VS Battle)
18px/28px  medium                — 본문 강조
16px/24px  normal                — 기본 본문
14px/20px  normal                — 보조 텍스트
12px/16px  normal                — 캡션·라벨
10px/14px  normal  font-mono     — "● AI-Report" 배지
```

#### 컬러 사용 비율 (다크 테마)

```
배경 (Deep Osidian + Deep Twilight) ......... 70%
텍스트 (Off-White + Powder Blue) ............ 15%
Crown Gold (메인 포인트) ..................... 10%
액센트 (Crimson / Turquoise / Aura) .......... 5%
```

#### 컬러별 사용 컨텍스트

```
🟡 Crown Gold (#FFD700)    — 주요 CTA, Crown 로고, Champion 강조, VS 배지, 활성 탭
🟡 Aura Yellow (#FFE87C)   — 부드러운 강조, 호버 글로우, 카운트다운, 새 알림
🔴 Royal Crimson (#CF2E45) — VS 우측 진영, Live 인디케이터, 마감 임박, 에러
🟢 Turquoise (#39CFB8)     — 투표 완료 피드백, 성공, VS 좌측 진영
🔵 Powder Blue (#A6BDD6)   — 보조 텍스트, 구분선, 인포 아이콘, 비활성 상태
```

#### v2.1 Cinematic 기법 (필수 적용)

```
① 노이즈 텍스처 레이어 — feTurbulence SVG 필터 0.05 opacity
   평평한 디지털 그라디언트 제거 → "물성(物性)" 부여
   구현: NoiseOverlay 컴포넌트를 전역 레이아웃에 삽입

② 자석 버튼 (MagneticButton) — scale(1.03) + cubic-bezier
   기본 hover:opacity-70 패턴 완전 금지
   주요 CTA·투표 버튼에 MagneticButton 컴포넌트 적용

③ Floating Island GNB — 투명 pill → 스크롤 시 backdrop-blur 모핑
   scrollY > 50 → bg-charcoal/80 + blur(20px) + shadow-gnb

④ GSAP 스태거 진입 애니메이션 — 텍스트 stagger 0.08 / 카드 0.15
   모든 GSAP 애니메이션: gsap.context() + ctx.revert() 필수

금지 패턴:
  ❌ 평평한 단색 그라디언트 배경
  ❌ border-radius 4px / 8px (radius 토큰 사용)
  ❌ hover: opacity 0.7 (자석 버튼으로 교체)
  ❌ 순수 블랙(#000000) 배경
```

#### 마이그레이션 가이드 (구버전 → v2.1)

```diff
/* 다크 배경 */
- #05070A  →  #060C3B  (Deep Osidian)
- #0A0D12  →  #141466  (Deep Twilight)
- #0E1217  →  #1E1E48  (Twilight Soft)

/* 텍스트 */
- #F8FAFC  →  #F0F5F7  (Off-White)
- #CBD5E1  →  #A6BDD6  (Powder Blue)

/* 테두리 */
- #30363D  →  #2A3A66  (Border Twilight)

/* 라이트 배경 */
- #FAFBFC  →  #F0F5F7
- #1A1A2E  →  #141466  (라이트 텍스트)
- #E2E8F0  →  #D4DCE3  (라이트 테두리)
```

---

## 7. Testing Decisions

### 7-1. 테스트 대상 모듈

| 모듈 | 테스트 유형 | 핵심 케이스 |
|------|-----------|------------|
| VoteEngine | 통합 테스트 (Firebase Emulator) | 정상 투표, 1일 5회 초과 차단, advanceRound() 자동 전환 |
| CrownCardGenerator | 유닛 테스트 | 캔버스 출력 크기(1080×1080), 필수 요소 존재 여부 |
| CookieConsent | 통합 테스트 | 동의 선택 후 Firestore 저장, 재방문 시 배너 미표시 |
| AdminTournamentCreator | 유닛 테스트 | Claude API 응답 파싱, Contestant 48명 정확히 반환 |
| AuthGate | E2E 테스트 | 비로그인 → The Pitch 열람 → 투표 클릭 → 로그인 모달 → 투표 진행 |
| advanceRound() | 통합 테스트 | 마지막 Match 완료 → Round Transition 효과 → 다음 Round 자동 시작 |
| Rate Limiting | 통합 테스트 | 1분 10회+ → 15분 쿨다운, 1일 5회 초과 → 차단 메시지 |

### 7-2. 테스트 환경

- Firebase Local Emulator Suite (Firestore + Auth + Functions)
- Playwright E2E / Vitest 유닛

---

## 8. Out of Scope (MVP 1)

| 기능 | 예정 단계 |
|------|----------|
| Domain 2: The Lab (공개용) | MVP 2 |
| Domain 4: The Locker Room | MVP 2 |
| K-POP 카테고리 | MVP 2 (7월) |
| AI 뉴스 생성 | MVP 2 |
| 다국어 지원 | MVP 2 |
| fingerprintjs | MVP 2 |
| B2B SaaS / API | MVP 3 |
| 마케팅 쿠키 | MVP 3 |
| 모바일 앱 | 계획 없음 |

---

## 9. 불변 원칙

| 원칙 | 내용 |
|------|------|
| FIFA 상표권 | "FIFA", "Official" 표기 절대 금지 |
| 초상권 | 3단계 이미지 소싱 정책 준수. DMCA 신고 24시간 내 대응 |
| Vote Count 노출 금지 | Vote Rate(%)만 표시. 절대 수치 노출 금지 |
| ● AI-Report 배지 | 모든 AI 생성 콘텐츠에 자동 표기 필수 |
| Round Deadline 없음 | Round에는 Deadline이 없다. Tournament Deadline만 존재 |
| 순수 블랙 금지 | 다크 테마에 #000000 사용 금지 — 반드시 네이비-인디고 톤 |

---

## 10. 참조 문서

| 문서 | 역할 | 우선순위 |
|------|------|---------|
| `WC48_DESIGN_SYSTEM_v2.2.md` | ★ **디자인 토큰 단일 진실 공급원** — 색상·그림자·폰트·반경 모두 이 파일 기준 | 디자인 최우선 |
| `LANGUAGE.md v1.2` | 공식 용어 정의 — 단일 진실 공급원 | 용어 최우선 |
| `CLAUDE.md v2.0` | 코딩 행동 규칙 + 불변 원칙 | |
| `CONTEXT_v0_6.md` | 프로젝트 현황·정책·기술 요약 | |
| `WorldCrown48_v4_9.md` | 전체 설계 마스터 문서 | |
| `DesignDocSkill_v1.0` | 설계서 작성 불변 규칙 | |
| `WC48_CODING_CONTEXT_v1.md` | 코딩 컨텍스트 | |

> ⚠️ CLAUDE.md와 CONTEXT.md의 색상 토큰 값은 구버전(v1 시절)입니다.
> 이 두 파일의 색상값은 UI 작업 시 절대 사용하지 마세요.
> 반드시 `WC48_DESIGN_SYSTEM_v2.2.md`를 기준으로 하세요.

---

## 변경 이력

| 버전 | 날짜 | 주요 변경 |
|------|------|---------|
| **v2.1** | **2026-05-16** | **★ §6-4 디자인 토큰 전면 교정** |
| | | 기준 변경: CLAUDE.md 구버전 → WC48_DESIGN_SYSTEM_v2.1.md |
| | | 다크 배경 순수 블랙 계열 → Twilight Stadium 네이비-인디고 |
| | | 컬러 토큰 7개 → 28개 (Gold 계열·액센트·텍스트·테두리·상태) |
| | | 그림자·모서리 반경·폰트 토큰 신규 추가 |
| | | v2.1 Cinematic 기법 4가지 추가 (노이즈·자석버튼·GNB Island·GSAP) |
| | | §10에 디자인 토큰 단일 진실 공급원 경고 추가 |
| | | 마이그레이션 가이드 추가 |
| v2.0 | 2026-05-16 | LANGUAGE.md v1.2 용어 전면 정렬, Next.js 14 스택, 투표정책 개정 등 |
| v1.0 | 2026-05-08 | 최초 작성 |

---

*© 2026 WorldCrown48 | 작성: 48티오 | PRD-MVP1 v2.1 | CONFIDENTIAL*
*디자인 기준: WC48_DESIGN_SYSTEM_v2.2 Twilight Stadium Cinematic Edition*
