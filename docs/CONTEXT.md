# WorldCrown48 (월크48) — CONTEXT.md v1.3

> **합병 이력:** 기존 로컬 파일(v0, 2026-05-08) + 신규 결정사항(v1.3, 2026-05-11) 정밀 통합
> 기존 파일의 모든 내용을 보존하고, 신규 결정사항을 추가했습니다.
> 수정된 항목은 `[v1.3 수정]`, 추가된 항목은 `[v1.3 추가]`로 표시했습니다.

---

## 핵심 비전
<!-- 기존 파일 전체 유지 -->

48명의 후보를 1:1 녹아웃 방식으로 투표해 최후의 1인을 가리는 글로벌 팬덤 토너먼트 플랫폼. 2026 FIFA 북중미 월드컵을 기점으로 전 세계 팬덤 데이터를 수집하고, Crown Card 바이럴로 성장한다.

---

## 서비스 정체성 원칙 <!-- [v1.3 추가] -->

> 이 섹션은 AI 에이전트와 모든 개발자가 반드시 내면화해야 하는 원칙이다.

```
월크48은 "팬 투표 서비스"다.

✅ 맞는 이해
   - 팬이 좋아하는 Candidate에게 투표하는 이상형 월드컵 플랫폼
   - Tournament Host가 Tournament를 만들고, Voter가 투표한다

❌ 절대 아닌 것
   - 우승자 예측 게임 / 스포츠 베팅 / 내기
   - 실제 경기 결과와 연동되는 서비스
   - 외부 일정(FIFA 경기 일정 등)에 자동 종속되는 서비스
   - 투표 결과로 "예측 정확도"를 평가하는 서비스
```

---

## 핵심 역할 3가지 <!-- [v1.3 추가] -->

> ⚠️ 이 세 역할은 명확히 구분한다. 코드에서도 혼용 금지.

```
System Admin (시스템 관리자)       →  role: 'admin'
  플랫폼 전체 운영·관리.
  DB 접근, 전체 유저 관리, 플랫폼 설정 등 최상위 권한 보유.
  MVP에서는 대표님 본인.

Tournament Host (대진을 만든자)    →  role: 'host'
  Tournament를 생성하고 Round Deadline(투표 마감일)을 설정하는 사람.
  본인이 만든 Tournament에 대한 관리 권한만 보유.
  ⚠️ System Admin과 다른 역할이다. System Admin ≠ Tournament Host.
  MVP에서는 System Admin만 Host 가능.
  MVP 이후: 일반 유저도 Host가 될 수 있도록 확장 예정.

Voter (투표 참여자)                →  role: 'voter'
  Tournament에 참여하여 Vote하는 일반 사용자.
  계정당 동일 Tournament에서 1일 5 Match 참여 가능.
```

**코드 작성 시 필수 구분:**

```typescript
isSystemAdmin(user)                    // 플랫폼 전체 권한 확인
isTournamentHost(user, tournament)     // 특정 Tournament의 Host 권한 확인
// 두 함수는 다른 로직이다. 절대 혼용 금지.
```

---

## Tournament 구조 & Round Deadline <!-- [v1.3 추가] -->

```
Tournament (대진)
  ├── Candidate × 48명
  ├── Round of 48  → 24 Matches 동시 진행
  ├── Round of 24  → 12 Matches 동시 진행
  ├── Round of 12  →  6 Matches 동시 진행
  ├── Round of 6   →  3 Matches 동시 진행
  └── Final        →  Champion 결정
```

**Round Deadline 원칙 (핵심):**

```
✅ Round Deadline(투표 마감일) 설정 권한 = Tournament Host (대진을 만든자)
✅ 각 Round의 기간은 Tournament Host가 자유롭게 설정
✅ 시스템에 하드코딩된 라운드 기간 없음 (24h, 1주일 등 고정값 코딩 금지)
✅ Round Deadline 도달 → 투표 자동 마감
✅ 다음 Round 시작 = Tournament Host가 직접 Advance Round 실행

❌ "48강은 24시간" 같은 자동 기간 로직 코딩 금지
❌ 외부 일정(FIFA 등)에 맞춰 Round를 자동 전환하는 로직 금지
```

---

## 투표 정책 v4.2 <!-- [v1.3 추가] -->

```
핵심 규칙 (단 하나):
  Voter 1계정 기준 동일 Tournament에서 1일 최대 5 Match 참여 가능
  같은 Match는 하루 1번만 (자정 KST 기준 리셋)

복수 Tournament:
  각 Tournament별 별도 5회 카운트 (Tournament마다 독립 적용)

계정 신뢰성:
  Google / Apple 소셜 로그인 필수 (익명 계정 없음)

랭킹 노출 원칙:
  Vote Count(절대 수치, 예: 12,345표) 노출 금지
  Vote Rate(득표율 %) + 1시간 캐시 데이터만 표시
```

---

## 도메인 용어 (Glossary)
<!-- 기존 파일 전체 유지 + v1.3 신규 항목 추가 -->

이 프로젝트의 모든 코드, 이슈, 문서에서는 아래 용어를 정확히 사용한다. 동의어로 대체하지 않는다.

### 핵심 개념

| 용어 | 정의 | 사용 금지 동의어 |
|---|---|---|
| **Tournament (대진)** | 48명의 후보가 참여하는 하나의 토너먼트 인스턴스 | 투표, 이벤트, 경쟁 |
| **Candidate (후보)** | 토너먼트에 참가하는 48명 중 1인 | 선수, 참가자, 항목 |
| **Match (매치)** | 라운드 내의 단일 1:1 대결 | 배틀, 경기, 대결 |
| **Round (라운드)** | 48강·24강·12강·6강·3강·결승의 각 단계 | 스테이지, 레벨 |
| **Round Deadline** | Tournament Host가 설정하는 각 Round의 투표 마감 시각 | 자동 종료, 라운드 기간, 관리자 마감일 | <!-- [v1.3 추가] -->
| **Crown Card** | 투표 결과를 담은 공유 가능한 시각적 카드 이미지 | 결과 카드, 공유 이미지 |
| **Vote (투표)** | 매치에서 한 후보를 선택하는 단일 행위 | 선택, 클릭, 픽 |
| **Vote Rate (득표율)** | 전체 투표 중 특정 Candidate가 받은 비율(%). 랭킹에 표시되는 유일한 수치 | 득표수, 표 수, Vote Count | <!-- [v1.3 추가] -->
| **Pitch (더 피치)** | 메인 홈·랜딩 페이지. 트렌딩 대진 목록 표시 | 홈, 메인, 랜딩 |
| **Lab (더 랩)** | Tournament Host가 새 대진을 생성하는 도메인. MVP에서 비공개 | 생성, 만들기 페이지 | <!-- [v1.3 수정] -->
| **Arena (더 아레나)** | 1:1 투표가 진행되는 도메인 | 투표 페이지, 경기장 |
| **Locker Room (더 라커룸)** | 유저 프로필·투표 기록 도메인 | 마이페이지, 프로필 |
| **Policy Hub (폴리시 허브)** | 이용약관·정책·쿠키 동의 도메인 | 약관 페이지 |
| **Crown (크라운)** | 최종 우승자 또는 우승 상태를 나타내는 개념 | 1등, 우승자 |
| **Node (노드)** | The Lab에서 후보 48개 슬롯 중 하나 | 칸, 슬롯, 셀 |
| **Trend Score** | 실시간 투표 활동 기반 대진 인기도 점수 | 인기도, 랭킹 점수 |
| **Tournament Host** | Tournament를 생성하고 Round Deadline을 설정하는 사람 | 관리자, 어드민, 운영자 | <!-- [v1.3 추가] -->
| **System Admin** | 플랫폼 전체를 운영·관리하는 사람 (Tournament Host보다 상위 권한) | 호스트, 대진관리자 | <!-- [v1.3 추가] -->

### 제재 시스템 용어
<!-- 기존 파일 전체 유지 -->

| 용어 | 정의 |
|---|---|
| **Content Warning (1단계)** | 경미한 위반 시 콘텐츠 삭제 + 경고 |
| **Activity Restriction (2단계)** | 7일 댓글·투표 생성 정지 |
| **Account Suspension (3단계)** | 30일 계정 전체 정지 |
| **Permanent Ban (4단계)** | 계정 영구 삭제 + IP 차단 |
| **Legal Action (5단계)** | 수사기관 신고 + 민·형사 소송 |

---

## 5대 도메인 구조
<!-- 기존 파일 기반, Lab 설명 수정 -->

```
Domain 1: The Pitch       — 랜딩·트렌딩 (MVP 1)
Domain 2: The Lab         — 대진 생성, Tournament Host 전용 (MVP 1 비공개) [v1.3 수정]
Domain 3: The Arena       — 1:1 투표·Crown Card (MVP 1)
Domain 4: The Locker Room — 유저 프로필 (MVP 2)
Domain 5: Policy Hub      — 정책·쿠키 동의 (MVP 1)
```

---

## 핵심 불변 원칙
<!-- 기존 파일 유지. #6 수정, #7 수정, #8 수정 -->

다음 원칙은 ADR 없이 변경 불가. 변경이 필요하면 반드시 ADR 작성 후 결정.

1. **다크모드 전용** — 라이트모드 없음. 배경은 항상 `#05070A`.
2. **Pure Gold만 허용** — 포인트 컬러는 `#FFD700`만 사용. 형광 노랑, 형광 그린 절대 금지.
3. **한국적 요소 금지** — 태극 문양, 한옥 디자인, 붓 글씨체 사용 금지. 글로벌 MZ Sporty 럭셔리.
4. **AI 생성 표기 의무** — AI가 생성한 모든 콘텐츠에 "AI GENERATED" 배지 필수.
5. **FIFA 상표권 준수** — "FIFA", "Official" 표기 금지. 팬 기반 서비스임을 명시.
6. **초상권 보호** — 얼굴 이미지는 Tournament Host가 수동으로 공개 출처 URL만 입력. 자동 수집 금지. `[v1.3: "관리자" → "Tournament Host"로 수정]`
7. **웹 전용, Flutter 미사용** — MVP 전 기간 Flutter 사용 안 함. 웹 전용으로 개발. MVP 이후 네이티브 앱 전환 필요 시 ADR 후 재검토. `[v1.3: "Flutter 전환 계획 없음" → "MVP 전 기간 미사용, 이후 재검토"로 수정]`
8. **Next.js(React) + Firebase 스택** — Next.js는 React 기반 프레임워크. React + Firebase 원칙 유지. 스택 변경 시 ADR 필수. `[v1.3: "React 18" → "Next.js 14 (React 기반)"으로 수정]`

---

## 기술 스택
<!-- 기존 파일 기반, v1.3 업데이트 반영 -->

| 레이어 | 기술 | 비고 |
|---|---|---|
| 프론트엔드 | **Next.js 14 (App Router)** + TypeScript | `[v1.3]` React 18 → Next.js 14 |
| UI 컴포넌트 | Tailwind CSS v4 + **Shadcn/UI** | `[v1.3]` Shadcn/UI 추가 |
| 애니메이션 | **Framer Motion** | `[v1.3]` 슬라이드·트랜지션용 추가 |
| 상태 관리 | Zustand | 기존 유지 |
| 백엔드 | Firebase (Firestore + Realtime DB + Auth + Cloud Functions) | 기존 유지 |
| AI | Claude API (claude-sonnet-4-6) | 기존 유지 |
| 호스팅 | Vercel (프론트) + Firebase (백엔드) | 기존 유지 |
| CDN/보안 | Cloudflare | 기존 유지 |
| 도메인 | worldcrown48.com | 기존 유지 |
| 부정투표 방지 | fingerprintjs + IP Rate Limiting (Cloud Functions) | `[v1.3]` 추가 |

---

## 사용자 흐름 핵심 패턴
<!-- 기존 파일 전체 유지 — 바이럴 루프 핵심 메커니즘 -->

**투표 → Crown Card → 공유 흐름 (바이럴 루프):**

```
방문 → The Pitch 대진 선택 → The Arena 1:1 투표 (비로그인 1회)
→ Crown Card 자동 생성·미리보기 (비로그인 가능)
→ 공유 버튼 클릭 → 구글 로그인 요청
→ 로그인 완료 → SNS 공유
```

이 흐름은 서비스의 핵심 바이럴 메커니즘이다. 로그인 요청 시점을 Crown Card 미리보기 이후로 유지한다.

---

## MVP 단계
<!-- 기존 파일 기반, The Lab 설명 수정 + 완료 기준 추가 -->

| 단계 | 시기 | 핵심 |
|---|---|---|
| **MVP 1** | 2026년 6월 11일 전 | The Pitch + The Arena + Policy Hub + The Lab(Host 전용 비공개) |
| **MVP 2** | 2026년 7월 | The Lab 일반 개방 검토 + K-POP 카테고리 + AI 뉴스 + 유저 프로필 |
| **MVP 3** | 2026년 하반기 | B2B SaaS + PR 배포 + 완전 다국어 + 수익 모델 |

**MVP 1 완료 기준 체크리스트:** `[v1.3 추가]`

```
☐ 쿠키 배너: 3버튼(모두허용/필수만/설정) 정상 동작
☐ Google 로그인: 정상 동작 + role 저장 확인
☐ The Lab: Tournament Host 접근 시 role 검증 미들웨어 동작
☐ 투표 한도: 1일 5 Match 초과 시 안내 메시지 표시
☐ Vote Rate(%): 랭킹 화면에 Vote Count 절대 수치 미노출 확인
☐ Crown Card: 생성 + 다운로드 + SNS 공유 정상 동작
☐ 반응형: 375px / 768px / 1440px 3개 화면 확인
```

---

## 권한 체계 (TypeScript) <!-- [v1.3 추가] -->

```typescript
// Firestore users 컬렉션
interface User {
  uid: string;
  role: 'admin' | 'host' | 'voter';
  createdAt: Timestamp;
}

// Tournament 문서 핵심 구조
interface Tournament {
  id: string;
  hostUid: string;      // Tournament Host의 uid — 이 사람이 Round Deadline 설정
  status: 'draft' | 'published' | 'completed' | 'archived';
  currentRound: number;
}

interface Round {
  roundNumber: number;
  deadline: Timestamp;  // Tournament Host가 직접 설정 (시스템 자동값 없음)
  status: 'active' | 'closed';
}

// 권한 확인 함수 — 반드시 분리해서 사용
const isSystemAdmin = (user: User) =>
  user.role === 'admin';

const isTournamentHost = (user: User, tournament: Tournament) =>
  user.role === 'admin' || tournament.hostUid === user.uid;
// System Admin은 모든 Tournament에 대해 Host 권한 포함
// 일반 Host는 본인이 만든 Tournament만
```

---

## 디렉토리 구조 <!-- [v1.3 추가] -->

```
/worldcrown48
├── CLAUDE.md               ← Claude Code 설정 (수정 금지)
├── CONTEXT.md              ← 이 파일 (v1.3)
├── LANGUAGE.md             ← 공식 한/영 용어 정의서
├── app/
│   ├── (public)/
│   │   ├── page.tsx        # The Pitch
│   │   ├── arena/[id]/     # The Arena
│   │   └── policy/         # Policy Hub
│   ├── (auth)/
│   │   └── profile/        # The Locker Room
│   └── (host)/             # Tournament Host 전용
│       └── lab/            # The Lab (MVP: System Admin만 접근)
├── components/
│   ├── ui/                 # Shadcn/UI 기본
│   ├── pitch/
│   ├── arena/
│   ├── lab/
│   └── common/
├── lib/
│   ├── firebase/
│   ├── api/                # Claude API 유틸
│   └── voting/             # 투표 정책 로직
└── hooks/
    ├── useAuth.ts
    ├── useVoting.ts
    └── useTournament.ts
```

---

## 에이전트 공통 규칙 <!-- [v1.3 추가] -->

```
모든 Claude Code 에이전트가 반드시 따라야 하는 규칙:

1. 담당 모듈 외 코드 절대 수정 금지
2. 용어는 이 파일 Glossary 기준 사용
   (Candidate O, Match O / Battle X, Contestant X)
3. Round Deadline 설정 권한 = Tournament Host (System Admin 아님)
4. 반응형 3단계: 375px(모바일) / 768px(태블릿) / 1440px(데스크탑)
5. 모든 role 확인은 서버사이드에서 수행 (클라이언트 단독 처리 금지)
6. Vote Count 절대 수치 UI 노출 금지 — Vote Rate(%)만 표시
7. Flutter 코드 작성 금지 (MVP 전 기간)
8. The Lab 접근: 미들웨어에서 Tournament Host 권한 검증 필수
```

---

## 절대 하지 말 것 (Never Do) <!-- [v1.3 추가] -->

```
❌ Round 기간을 자동 계산·하드코딩하는 로직
   → Round Deadline은 Tournament Host가 직접 설정한다

❌ "관리자가 마감일을 설정한다"는 표현
   → "Tournament Host가 Round Deadline을 설정한다"가 정확하다

❌ 외부 스포츠 API / 실제 경기 결과 API 연동
   → 팬 투표 서비스. 현실 경기 결과와 무관하다

❌ 투표 결과를 예측 정확도로 평가하는 기능
   → 예측 게임이 아니다

❌ Flutter 코드 작성 (MVP 전 기간)
   → Next.js 14 + TypeScript 사용

❌ Vote Count(절대 수치) 랭킹 화면 노출
   → Vote Rate(%)만 표시한다

❌ isSystemAdmin()으로 Tournament Deadline 권한 확인
   → isTournamentHost(user, tournament)를 사용한다
```

---

## 변경 이력 <!-- [v1.3 추가] -->

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| **v0** | 2026-05-08 | 최초 작성 (기존 로컬 파일) |
| **v1.3** | 2026-05-11 | 서비스 정체성 명문화 (팬 투표, 예측 아님) [추가] |
| | | 핵심 역할 3가지 정의 (System Admin / Tournament Host / Voter) [추가] |
| | | Round Deadline = Tournament Host 설정 권한 확립 [추가] |
| | | 투표 정책 v4.2 수립 (1일 5 Match, Vote Rate만 노출) [추가] |
| | | 기술 스택: React 18 → Next.js 14, Shadcn/UI·Framer Motion 추가 [수정] |
| | | 불변 원칙 #6: "관리자" → "Tournament Host" [수정] |
| | | 불변 원칙 #7: Flutter MVP 전 기간 미사용 확정 [수정] |
| | | 불변 원칙 #8: Next.js 14(React 기반) 명시 [수정] |
| | | Glossary: Round Deadline, Vote Rate, Tournament Host, System Admin 추가 [추가] |
| | | 권한 체계·디렉토리 구조·에이전트 규칙·Never Do·변경 이력 추가 [추가] |

---

*© 2026 WorldCrown48 | 작성: 48티오 | CONTEXT.md v1.3 | CONFIDENTIAL*
