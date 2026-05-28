# 🏆 WorldCrown48 (월크48) — 코딩 컨텍스트 마스터
# WC48_CODING_CONTEXT_v1.md
# 다이어그램 5개 100% 반영 | 2026-05-14 작성 | 작성자: 48티오

> **이 파일의 목적**: Claude Code / Cursor / Windsurf 등 AI 코딩 에이전트가
> 코드 작성 전 반드시 로드해야 하는 정밀 기술 컨텍스트 문서입니다.
> 5개 아키텍처 다이어그램(①~⑤)을 코드로 번역한 단일 진실 공급원(Single Source of Truth).

---

## 🛑 MENTAL_MODEL 우선

> 라운드·매치·득표 규칙의 시각 진실: **`docs/mental-model/MENTAL_MODEL.svg`**
> 이 문서의 텍스트 규칙과 충돌 시 → SVG 우선. 코드 작성 전 반드시 한 번 본다.

---

## ⛔ IMMUTABLE TERMINOLOGY RULE — 절대 불변 용어 규칙

> **RULE 1: NEVER change or overwrite an established term definition.**
> **RULE 2: When a new concept arises, CREATE A NEW TERM. Do NOT redefine existing terms.**
>
> 이 규칙은 모든 에이전트, 모든 세션, 모든 기여자에게 예외 없이 적용된다.
> 기존 용어를 임의로 변경하면 전체 모듈과 AI 뉴스 생성 전반에 연쇄 오류가 발생한다.
> 용어 정의의 단일 진실 공급원: `LANGUAGE.md`

---

## ⛔ 절대 규칙 — 코드에서도 예외 없음

```
✅ Contestant        (❌ Candidate, 선수) ← 개인 참가자 전용
✅ Match             (❌ Battle, 배틀, 경기)
✅ Tournament Deadline  (❌ Round Deadline — 코드에도 존재 금지)
✅ advanceRound()    (❌ Host가 수동으로 라운드 전환)
✅ Voter             (❌ user, 참여자, 유저)
✅ Champion          (❌ winner, 우승자)
✅ Crown Card        (❌ result_image, resultCard)
✅ Nation            (❌ Contestant로 국가팀 표현 금지) ← 국가대표팀 전용 신규 용어
✅ TournamentType    (❌ category, type만 단독 사용 금지) ← 토너먼트 유형 분류 키

⛔ rounds[].deadline 필드 Firestore에 절대 생성 금지
⛔ Vote Count(절대 수치) UI 절대 노출 금지 → rate(%) 전용
⛔ 실제 FIFA 경기 결과와 로직 연동 금지
⛔ Contestant를 국가대표팀 의미로 사용 금지 → Nation 사용
```

---

## 1️⃣ 시스템 아키텍처 — 6개 레이어 (다이어그램 ①)

```
Layer 0: Voter Browser
  └─ Next.js 14 SSR + React + TypeScript
     → HTTPS 요청

Layer 1: Cloudflare
  └─ CDN + DDoS 방어 + WAF(웹 방화벽) + SSL 암호화
     worldcrown48.com DNS 관리

Layer 2: Vercel
  └─ Next.js 14 (App Router) 자동 배포
     git push → CI/CD → 전 세계 Edge 배포

Layer 3: Firebase Services (4개 서비스 + Cloud Functions)
  ├─ Auth       소셜 로그인 (Google/Apple)
  ├─ Firestore  문서 DB (Tournament/User 데이터)
  ├─ Realtime DB  투표 실시간 동기화
  ├─ Storage    Crown Card + Contestant 이미지
  └─ Cloud Functions  11개 비즈니스 로직 함수

Layer 4a: Claude API
  └─ claude-sonnet-4-20250514
     AI 뉴스 생성 (MVP 2) + 콘텐츠 모더레이션

Layer 4b: GNews API
  └─ Basic 플랜 $9/월
     키워드 뉴스 100 req/day → Firestore 1h 캐시

Layer 5: PR Distribution (MVP 3)
  └─ RedPress / EIN / PR Newswire
```

---

## 2️⃣ 기술 스택 확정 (v4.1)

### 패키지 목록 (package.json 참조)

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "typescript": "5.x",
    "tailwindcss": "3.x",
    "@shadcn/ui": "latest",
    "framer-motion": "11.x",
    "zustand": "4.x",
    "firebase": "10.x",
    "firebase-admin": "12.x",
    "firebase-functions": "4.x",
    "@anthropic-ai/sdk": "0.x",
    "next-auth": "4.x",
    "recharts": "2.x",
    "@fingerprintjs/fingerprintjs": "4.x"
  }
}
```

### 환경변수 목록 (.env.local)

```bash
# Firebase Client (Vercel 환경변수)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=worldcrown48.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=worldcrown48
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=worldcrown48.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://worldcrown48-default-rtdb.firebaseio.com

# Firebase Admin (Cloud Functions 서버 전용)
FIREBASE_ADMIN_CREDENTIAL=   # JSON 서비스 계정

# External APIs
CLAUDE_API_KEY=              # Anthropic Claude API
GNEWS_API_KEY=               # GNews Basic $9/월
NEXT_AUTH_SECRET=
NEXT_AUTH_URL=https://worldcrown48.com

# Cloudflare (선택)
CLOUDFLARE_API_TOKEN=
```

### 폴더 구조 (Next.js 14 App Router)

```
worldcrown48/
├── app/
│   ├── (auth)/
│   │   └── login/         ← Domain 4: Locker Room 로그인
│   ├── (main)/
│   │   ├── page.tsx       ← Domain 1: The Pitch (메인 홈)
│   │   ├── arena/
│   │   │   └── [tournamentId]/
│   │   │       └── page.tsx  ← Domain 3: The Arena
│   │   └── profile/       ← Domain 4: Locker Room 프로필
│   ├── admin/             ← Domain 2 (Lab) + Domain 6 (Dashboard)
│   │   ├── lab/           ← 대진 생성
│   │   └── dashboard/     ← 관리자 대시보드
│   ├── policy/            ← Domain 5: Policy Hub
│   └── layout.tsx
├── components/
│   ├── ui/                ← shadcn/ui 기본 컴포넌트
│   ├── arena/
│   │   ├── VSBattle.tsx   ← 핵심: 1:1 투표 카드
│   │   ├── RoundTransition.tsx  ← 라운드 전환 애니메이션
│   │   ├── CrownCard.tsx  ← Champion 결과 카드
│   │   └── Newsroom.tsx   ← GNews 25개 레이아웃
│   ├── pitch/
│   │   ├── TournamentCard.tsx   ← 대진 카드
│   │   └── TrendingGrid.tsx     ← 인기 대진 그리드
│   ├── lab/
│   │   ├── ContestantNode.tsx   ← 48 Nodes 그리드 아이템
│   │   └── AIFillButton.tsx     ← Claude API 자동 채우기
│   └── common/
│       ├── GNB.tsx              ← 상단 네비게이션
│       ├── MobileTabBar.tsx     ← 모바일 하단 탭 바
│       └── CookieBanner.tsx     ← GDPR 쿠키 배너
├── lib/
│   ├── firebase/
│   │   ├── client.ts      ← Firebase 클라이언트 초기화
│   │   ├── admin.ts       ← Firebase Admin 초기화
│   │   └── db.ts          ← Firestore 공통 헬퍼
│   ├── stores/
│   │   └── voteStore.ts   ← Zustand 전역 투표 상태
│   └── utils/
│       ├── hash.ts        ← sha256(ip) → ipHash
│       └── date.ts        ← KST 자정 기준 날짜
├── functions/             ← Cloud Functions (별도 폴더)
│   └── src/
│       ├── onVote.ts
│       ├── advanceRound.ts
│       ├── scheduleRankingCache.ts
│       ├── onCrownCardCreate.ts
│       ├── getNewsCache.ts
│       ├── generateAINews.ts
│       ├── onAbuseDetect.ts
│       ├── onRateLimitCheck.ts
│       ├── aiFillContestants.ts
│       ├── onUserDelete.ts
│       └── publishNews.ts
└── types/
    └── index.ts           ← TypeScript 인터페이스 전체
```

---

## 3️⃣ 투표 데이터 파이프라인 (다이어그램 ②) — 코드 명세

### 3-1. 전체 흐름 단계별 처리

```
Step 1  onRateLimitCheck   1분 내 10회 초과? → 429 에러 + 15분 쿨다운
Step 2  Daily limit check  Tournament 1일 5회 초과? → Reject (Firestore 쿼리)
Step 3  Realtime DB tx     votes/{matchId}/{contestantId} +1 (트랜잭션)
Step 4  Firestore write    votes 컬렉션: userId + matchId + date + ipHash
Step 5  advanceRound()     마지막 Match 완료? → 자동 라운드 전환
           ├─ NO  → 다음 Match 제시
           └─ YES → 라운드 전환 효과 → 다음 Round 또는 Champion 확정
Step 6  Crown Card         Champion 확정 → Canvas 이미지 → Storage → SNS 공유
Step 7  [병렬] scheduleRankingCache  매 1h: 득표율(%) 집계 + 특이점 4종 탐지
Step 8  [병렬] Anomaly detect        T-1~T-4 조건 충족 → generateAINews (MVP 2)
Step 9  Admin review       AI 뉴스 2단계 검수: 자동(6항목) → 관리자 승인
```

### 3-2. Rate Limiting 구현 스펙

```typescript
// onRateLimitCheck: 1분 10회 초과 → 15분 쿨다운
const RATE_LIMIT_WINDOW_MS = 60 * 1000;       // 1분
const RATE_LIMIT_MAX_REQUESTS = 10;            // 최대 10회
const COOLDOWN_MS = 15 * 60 * 1000;           // 15분 쿨다운

// Realtime DB 저장 경로
// rateLimits/{userId}/timestamps: number[]   (1분 내 요청 timestamps)
// rateLimits/{userId}/cooldownUntil: number  (쿨다운 만료 epoch ms)
```

### 3-3. Daily Limit 쿼리 패턴

```typescript
// 오늘 KST 날짜 기준 투표 수 조회
const todayKST = getTodayKST(); // "2026-06-14"

const snapshot = await firestore
  .collection('votes')
  .where('userId', '==', userId)
  .where('tournamentId', '==', tournamentId)
  .where('date', '==', todayKST)
  .get();

if (snapshot.size >= 5) {
  throw new HttpsError('resource-exhausted', '오늘 5회 한도 도달');
}
// 자정 리셋: KST 00:00 (UTC+9) 기준
```

### 3-4. Realtime DB 투표 트랜잭션

```typescript
// 경로: votes/{matchId}/{contestantId}
// 절대 수치이지만 UI에 노출 금지 → 내부 집계용만
await realtimeDb
  .ref(`votes/${matchId}/${contestantId}`)
  .transaction((current) => (current || 0) + 1);
```

### 3-5. advanceRound() 자동 전환 로직

```typescript
// ⚠️ Host가 호출하는 함수가 아님!
// Voter가 해당 Round의 마지막 Match 완료 시 시스템이 자동 실행

async function advanceRound(voterId: string, tournamentId: string): Promise<void> {
  const tournament = await getTournament(tournamentId);
  const currentRound = tournament.currentRound;

  // 이 Round의 모든 Match가 voterId 기준 완료됐는지 확인
  const allMatchesCompleted = await checkAllMatchesCompleted(voterId, tournamentId, currentRound);

  if (!allMatchesCompleted) return; // 아직 완료 안 됨

  const isFinalRound = currentRound === 5; // 결승

  if (isFinalRound) {
    // Champion 확정
    await confirmChampion(tournamentId, voterId);
    await triggerCrownCardCreate(tournamentId);
  } else {
    // 다음 Round로 전환
    await firestore.doc(`tournaments/${tournamentId}`).update({
      currentRound: currentRound + 1
    });
    // 라운드 전환 UI 효과 트리거 (Realtime DB 이벤트)
    await realtimeDb.ref(`roundTransitions/${voterId}/${tournamentId}`).set({
      fromRound: currentRound,
      toRound: currentRound + 1,
      timestamp: Date.now()
    });
  }
}

// ❌ 절대 금지 코드 예시:
// const ROUND_DEADLINE = tournament.rounds[currentRound].deadline; // 금지!
// if (new Date() > ROUND_DEADLINE) advanceRound(); // 금지!
```

### 3-6. 특이점 4종 탐지 조건 (scheduleRankingCache)

```typescript
// T-1: 1위 득표율 60% 이상
// T-2: 1위 vs 2위 격차 30%p 이상
// T-3: 24시간 이내 득표율 증가 200% 이상
// T-4: 3위 이상 순위 역전 발생

interface AnomalyTrigger {
  type: "T-1" | "T-2" | "T-3" | "T-4";
  contestantId: string;
  detail: string;  // 예: "1위 62.3%", "격차 34.1%p"
  detectedAt: Timestamp;
}

// 조건 충족 시 → generateAINews() 호출 (MVP 2)
// 조건 미충족 → 1시간 후 재검사
```

---

## 4️⃣ Firestore 스키마 전체 (다이어그램 ④)

### 4-1. tournaments/{tournamentId}

```typescript
interface Tournament {
  id: string;                    // "tourn_abc123"
  title: string;                 // 최대 60자
  category: "FIFA" | "KPOP" | "OTHER";
  // ★ v1.1 신규 — TournamentType (LANGUAGE.md §9 참조)
  tournamentType: "nation_cup" | "player_mvp" | "artist" | "custom";
  entryUnit: "Nation" | "Contestant"; // nation_cup → "Nation" / 나머지 → "Contestant"
  desc?: string;                 // 선택, 최대 200자
  hostUid: string;               // FK → users.uid
  status: "draft" | "active" | "closed";
  createdAt: Timestamp;
  tournamentDeadline: Timestamp; // ★ Tournament 전체의 유일한 Deadline
  currentRound: number;          // 1=48강 2=24강 3=12강 4=6강 5=결승
  totalContestants: 48;          // 고정값
  thumbnailUrl: string;          // Firebase Storage URL
  settings: {
    aiNews: boolean;
    multiLang: boolean;
    showRanking: boolean;
    autoExtend: boolean;
  };
}

// ★ v1.1 신규 — Nation 타입 (tournamentType === "nation_cup" 전용)
interface Nation {
  id: string;                    // FIFA 3자리 코드 "BRA" "KOR" "FRA"
  tournamentId: string;          // FK → tournaments
  nameKo: string;                // "브라질"
  nameEn: string;                // "Brazil"
  flag: string;                  // 이모지 국기 "🇧🇷"
  confederation: "UEFA" | "CONMEBOL" | "AFC" | "CAF" | "CONCACAF" | "OFC";
  fifaRanking?: number;          // 참고용 FIFA 랭킹
  // ⛔ Contestant 인터페이스와 절대 혼용 금지
}

// ⛔ 절대 금지 — Firestore에 다음 필드 생성 금지:
// rounds[].deadline, rounds[].startDate, rounds[].endDate
// Nation을 contestants 컬렉션에 저장 금지 → nations 별도 컬렉션 사용
```

### 4-2. contestants/{contestantId}

```typescript
interface Contestant {
  id: string;
  tournamentId: string;          // FK → tournaments
  name: string;
  imageUrl: string;              // Firebase Storage URL
  order: number;                 // 1~48 배치 순서
  dataSource: string;            // 이미지 출처 (L1/L2/L3 구분)
}
```

### 4-3. votes/{voteId}

```typescript
interface Vote {
  id: string;
  userId: string;                // FK → users.uid
  tournamentId: string;          // FK → tournaments
  matchId: string;               // "{tournamentId}_{round}_{matchIndex}"
  contestantId: string;          // FK → contestants
  votedAt: Timestamp;
  date: string;                  // "2026-06-14" (KST 기준, 자정 리셋)
  ipHash: string;                // sha256(rawIP)
  deviceId: string | null;       // fingerprintjs (MVP 2)
}

// 복합 인덱스 필수 설정:
// [userId, tournamentId, date]  ← Daily Limit 쿼리용
// [matchId, contestantId]       ← advanceRound 집계용
```

### 4-4. ranking_cache/{tournamentId}

```typescript
interface RankingCache {
  tournamentId: string;          // FK → tournaments
  cachedAt: Timestamp;
  rankings: Array<{
    contestantId: string;
    rate: string;                // "34.5" (% 문자열 — 절대 수치 금지)
  }>;
}

// ⚠️ count(득표 절대 수) 필드 저장 절대 금지
// ⚠️ UI에 직접 노출 금지 — Crown Card + AI 뉴스 내부용만
// 갱신 주기: 매 1시간 (scheduleRankingCache)
```

### 4-5. ai_news/{newsId}

```typescript
interface AINews {
  id: string;
  tournamentId: string;          // FK → tournaments
  trigger: {
    type: "T-1" | "T-2" | "T-3" | "T-4" | "champion";
    detail: string;
  };
  title: string;
  body: string;                  // 최소 300자
  crownCardUrl: string;          // Crown Card 이미지 재활용
  status: "pending_generation" | "pending_review" | "approved" | "rejected" | "published";
  autoCheckResult: {
    defamation: boolean;         // 명예훼손 없음
    noAbsoluteCount: boolean;    // 절대수치 미사용
    factCheck: boolean;          // 데이터 일치
    identity: boolean;           // 서비스 정체성 준수
    minLength: boolean;          // 최소 300자
    dataAccuracy: boolean;       // 수치 정확도 ±1%p
  };
  reviewedBy: string | null;
  reviewedAt: Timestamp | null;
  publishedAt: Timestamp | null;
  createdAt: Timestamp;
}
```

### 4-6. news_cache/{tournamentId}

```typescript
interface NewsCache {
  tournamentId: string;          // FK → tournaments (키워드 연동)
  articles: GNewsArticle[];      // 최대 25개
  keywords: string[];
  cachedAt: Timestamp;           // 1시간 TTL
}
```

### 4-7. crown_cards/{cardId}

```typescript
interface CrownCard {
  id: string;
  tournamentId: string;          // FK → tournaments
  contestantId: string;          // FK → contestants (Champion)
  imageUrl: string;              // Firebase Storage URL (.png)
  createdAt: Timestamp;
}
```

### 4-8. users/{uid}

```typescript
interface User {
  uid: string;                   // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL: string;
  role: "voter" | "admin";
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}
```

### 4-9. waitlist/{id}

```typescript
interface Waitlist {
  id: string;
  email: string;
  createdAt: Timestamp;
}
```

### 4-10. cookie_consents/{uid}

```typescript
interface CookieConsent {
  uid: string;
  essential: true;               // 항상 true
  functional: boolean;
  analytics: boolean;
  marketing: boolean;            // MVP 3
  timestamp: Timestamp;
  ipHash: string;
}
```

### 4-11. audit_log/{logId}

```typescript
interface AuditLog {
  id: string;
  uid: string;                   // 삭제 요청자 uid
  action: "GDPR_DELETE" | "ADMIN_ACTION";
  timestamp: Timestamp;
  // 3년 보관 의무 (GDPR Article 17)
}
```

### 4-12. admin_alerts/{alertId}

```typescript
interface AdminAlert {
  id: string;
  tournamentId: string;          // FK → tournaments
  type: "ABUSE" | "ANOMALY_T1" | "ANOMALY_T2" | "ANOMALY_T3" | "ANOMALY_T4";
  detail: string;
  createdAt: Timestamp;
}
```

### 컬렉션 관계도

```
tournaments ──┬──< contestants     (1:N FK tournamentId)
              ├──< votes           (1:N FK tournamentId)
              ├──1── ranking_cache (1:1 FK tournamentId)
              ├──< ai_news         (1:N FK tournamentId)
              ├──1── news_cache    (1:1 FK tournamentId)
              └──< crown_cards     (1:N FK tournamentId)

users ──┬──< votes                 (1:N FK userId)
        ├──1── cookie_consents     (1:1 FK uid)
        ├──< audit_log             (1:N FK uid)
        └──< admin_alerts          (수신자: admin role)

독립: waitlist / notices / news_filter_keywords
```

### Firestore Security Rules 핵심

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // votes: 로그인 유저만 write, 본인 데이터만 read
    match /votes/{voteId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if request.auth != null; // Cloud Functions에서 검증
    }

    // ranking_cache: 모든 로그인 유저 read 허용, write는 Cloud Functions만
    match /ranking_cache/{tournamentId} {
      allow read: if request.auth != null;
      allow write: if false; // Cloud Functions만
    }

    // admin_alerts: admin 역할만
    match /admin_alerts/{alertId} {
      allow read, write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## 5️⃣ Cloud Functions 전체 명세 (다이어그램 ⑤)

### 5-1. 함수 목록 및 트리거

| 함수명 | 트리거 | 메서드 | MVP | 에이전트 |
|--------|--------|--------|-----|----------|
| onVote | HTTPS Callable | POST | 1 | C-1 |
| onRateLimitCheck | 미들웨어 (onVote 내부) | — | 1 | C-1 |
| advanceRound | Firestore 트리거 (votes 쓰기) | — | 1 | C-1 |
| onCrownCardCreate | Firestore 트리거 (tournaments 업데이트) | — | 1 | C-2 |
| scheduleRankingCache | PubSub 스케줄러 every 1h | — | 1 | C-3 |
| onAbuseDetect | Firestore 트리거 (admin_alerts 쓰기) | — | 1 | C-3 |
| getNewsCache | HTTPS GET | GET | 1 | C-4 |
| onUserDelete | HTTPS Callable | DELETE | 1 | D-1 |
| aiFillContestants | HTTPS Callable | POST | 1 | B-1 |
| generateAINews | Firestore 트리거 (ai_news 생성) | — | 2 | F-1 |
| publishNews | HTTPS Callable | POST | 3 | G-2 |

### 5-2. 트리거 연쇄 흐름 (다이어그램 ⑤ 정밀 반영)

```
[Voter 투표 클릭]
    │
    ├──→ onVote (HTTPS POST)
    │     ├─ onRateLimitCheck (내장 미들웨어)
    │     │    └─ 1분 10회+ → Block (429)
    │     ├─ Daily limit check
    │     │    └─ 1일 5회+ → Reject
    │     ├─ Realtime DB tx (+1)
    │     └─ Firestore votes write
    │
    └──→ advanceRound (Firestore 트리거 — votes 쓰기 감지)
          ├─ 마지막 Match 아님 → 다음 Match UI 제시
          └─ 마지막 Match!
                ├─ 결승 미완료 → 다음 Round 전환 (currentRound +1)
                └─ 결승 완료 → Champion 확정
                      │
                      ├──→ onCrownCardCreate (Firestore 트리거)
                      │     └─ Canvas API → PNG 생성 → Storage 업로드
                      │
                      └──→ generateAINews (Firestore 트리거, MVP 2)
                            └─ Claude API → ai_news 컬렉션 생성


[매 1시간 PubSub 스케줄러]
    │
    └──→ scheduleRankingCache
          ├─ 활성 Tournament 전체 순회
          ├─ Realtime DB 득표 수 → 득표율(%) 계산
          ├─ ranking_cache 갱신 (rate만, count 금지)
          ├─ 특이점 4종 탐지 (T-1~T-4)
          │    └─ 조건 충족 → generateAINews (MVP 2)
          └─ 어뷰징 감지
               └──→ onAbuseDetect → 관리자 이메일 알림


[관리자 액션]
    ├──→ aiFillContestants (POST) → Claude API 48명 추천 → contestants 저장
    ├──→ onUserDelete (DELETE) → Auth + Firestore + Storage 전체 삭제 → audit_log
    └──→ publishNews (POST, MVP 3) → PR 배포 API 호출


[클라이언트 → GNews 뉴스 요청]
    └──→ getNewsCache (GET)
          ├─ Firestore news_cache 유효(1h 이내)?
          │    └─ YES → 캐시 반환
          └─ NO → GNews API 호출 → Firestore 캐시 저장 → 반환
```

### 5-3. onVote 전체 코드 패턴

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';

export const onVote = onCall(async (request) => {
  const { tournamentId, matchId, contestantId, deviceId } = request.data;
  const userId = request.auth?.uid;

  // Step 1: 인증 확인
  if (!userId) throw new HttpsError('unauthenticated', '로그인 필요');

  // Step 2: Rate Limiting (1분 10회 초과)
  const rateCheck = await checkRateLimit(userId);
  if (rateCheck.blocked) {
    throw new HttpsError('resource-exhausted',
      `Rate limit 초과. ${Math.ceil(rateCheck.cooldownRemaining / 60)}분 후 재시도`);
  }

  // Step 3: 1일 5회 한도 (Tournament 기준)
  const dailyCount = await getTodayVoteCount(userId, tournamentId);
  if (dailyCount >= 5) {
    throw new HttpsError('resource-exhausted', '오늘 투표 한도(5회) 도달');
  }

  // Step 4: Realtime DB 트랜잭션 (동시 충돌 방지)
  const db = getDatabase();
  await db.ref(`votes/${matchId}/${contestantId}`)
    .transaction((current) => (current || 0) + 1);

  // Step 5: Firestore 기록
  const firestore = getFirestore();
  await firestore.collection('votes').add({
    userId,
    tournamentId,
    matchId,
    contestantId,
    votedAt: FieldValue.serverTimestamp(),
    date: getTodayKST(),
    ipHash: hashIP(request.rawRequest.ip ?? ''),
    deviceId: deviceId ?? null,
  });

  // Step 6: advanceRound 체크 (Firestore 트리거가 자동 실행)
  // → advanceRound.ts 참조

  return { success: true };
});
```

### 5-4. scheduleRankingCache 핵심 패턴

```typescript
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const scheduleRankingCache = onSchedule('every 1 hours', async () => {
  const firestore = getFirestore();
  const db = getDatabase();

  // 활성 Tournament 전체 조회
  const tournaments = await firestore
    .collection('tournaments')
    .where('status', '==', 'active')
    .get();

  for (const doc of tournaments.docs) {
    const tournamentId = doc.id;

    // Realtime DB에서 득표 수 집계
    const votesSnapshot = await db.ref(`votes`).get();
    // ⚠️ 절대 수치는 내부 계산에만 사용
    const rankings = calculateRateOnly(votesSnapshot, tournamentId);
    // ⚠️ count 필드 절대 저장 금지

    // ranking_cache 갱신 (rate만)
    await firestore.doc(`ranking_cache/${tournamentId}`).set({
      tournamentId,
      cachedAt: FieldValue.serverTimestamp(),
      rankings, // [{ contestantId, rate: "34.5" }]
    });

    // 특이점 4종 탐지
    const anomaly = detectAnomalies(rankings);
    if (anomaly) {
      await createAdminAlert(tournamentId, anomaly);
      // MVP 2: generateAINews 트리거
    }
  }
});
```

### 5-5. getNewsCache 패턴

```typescript
export const getNewsCache = onRequest(async (req, res) => {
  const tournamentId = req.query.tournamentId as string;

  const cached = await firestore.doc(`news_cache/${tournamentId}`).get();
  const ONE_HOUR = 60 * 60 * 1000;

  if (cached.exists) {
    const data = cached.data()!;
    const age = Date.now() - data.cachedAt.toMillis();
    if (age < ONE_HOUR) {
      res.json({ articles: data.articles, fromCache: true });
      return;
    }
  }

  // 캐시 만료 → GNews API 호출
  const keywords = await getKeywords(tournamentId);
  const articles = await fetchGNews(keywords); // 최대 25개

  await firestore.doc(`news_cache/${tournamentId}`).set({
    tournamentId,
    articles,
    keywords,
    cachedAt: FieldValue.serverTimestamp(),
  });

  res.json({ articles, fromCache: false });
});
```

---

## 6️⃣ 도메인 + 에이전트 배치 (다이어그램 ③)

### 에이전트 전체 배치표

| 에이전트 | 도메인 | 반응형 | MVP | 핵심 모듈 |
|----------|--------|--------|-----|-----------|
| A-0 | Domain 0 LAUNCH PAD | 3화면 (375/768/1440) | 1 | Hero + Countdown + Waitlist + SNS |
| A-1 | Domain 1 THE PITCH | 3화면 | 1 | Hero + Trending + GNB + Lab Entry |
| B-1 | Domain 2 THE LAB | 데스크탑 전용 (1440) | 1 | M0 Wizard + M1 Init + M2 48Nodes + M3 AIFill + M4 Save |
| B-2 | Domain 2 THE LAB | — | 2 | AI 채우기 유저 확장 |
| C-1 | Domain 3 THE ARENA | 3화면 | 1 | M1 Detail + M2 VSBattle + M4 Anti-fraud + M5 i18n |
| C-2 | Domain 3 THE ARENA | 3화면 | 1 | M3 Crown Card 생성 + SNS 공유 |
| C-3 | Domain 3 THE ARENA | 백엔드 전용 | 1 | M6 Newsroom (없음) → Ranking/Anomaly |
| C-4 | Domain 3 THE ARENA | 3화면 | 1 | M6 Newsroom GNews 25개 |
| D-1 | Domain 4 LOCKER ROOM | 3화면 | 1 | M1 Login + M3 GDPR |
| D-2 | Domain 4 LOCKER ROOM | 3화면 | 2 | M2 Profile + M4 History |
| E-1 | Domain 5 POLICY HUB | 3화면 | 1 | M1 Cookie + M2 Policies + M3 Notices + M4 Reports |
| G-1 | Domain 6 ADMIN DASH | 데스크탑 전용 | 1 | M1 Dashboard + M2 Tournament List |
| F-1 | AI 뉴스 팩토리 | 백엔드 전용 | 2 | M7 AI News (Domain 3) + M5 AI News (Domain 6) |
| G-2 | Domain 6 ADMIN DASH | 데스크탑 전용 | 2 | M4 Operation + M5 AI News Review |

### Domain별 라우팅 + 권한

```typescript
// app/layout.tsx 라우팅 정의
const ROUTES = {
  // Domain 0: Launch Pad (사전 공개)
  '/': { domain: 0, auth: 'none', theme: 'dark' },

  // Domain 1: The Pitch (메인 홈)
  '/home': { domain: 1, auth: 'none', theme: 'dark' },

  // Domain 2: The Lab (관리자 전용)
  '/admin/lab': { domain: 2, auth: 'admin', theme: 'dark', responsive: 'desktop-only' },

  // Domain 3: The Arena
  '/arena/[tournamentId]': { domain: 3, auth: 'voter', theme: 'dark' },

  // Domain 4: Locker Room
  '/profile': { domain: 4, auth: 'voter', theme: 'light' },

  // Domain 5: Policy Hub
  '/policy/*': { domain: 5, auth: 'none', theme: 'light' },

  // Domain 6: Admin Dashboard
  '/admin/dashboard': { domain: 6, auth: 'admin', theme: 'light', responsive: 'desktop-only' },
};
```

### MVP 1 에이전트 실행 순서

```
1st  A-0  랜딩·카운트다운·웨이트리스트 → Domain 0 완성
2nd  E-1  쿠키 배너 + 법적 문서 → Domain 5 완성
3rd  D-1  소셜 로그인 + GDPR 삭제 → Domain 4 일부 완성
4th  B-1  대진 생성(Lab) → Domain 2 완성 (D-1 완료 후)
5th  C-1  투표엔진 + VSBattle + 라운드 자동 전환 → Domain 3 핵심
6th  C-3  랭킹 캐시 + 어뷰징 탐지 (C-1 완료 후)
7th  C-4  뉴스룸 GNews 25개 (GNews API 키 확보 후)
8th  C-2  Crown Card 생성 (C-1 완료 후)
9th  A-1  메인 홈 화면 → Domain 1 완성
10th G-1  관리자 대시보드 → Domain 6 일부 (전체 MVP 1 완료 후)
```

---

## 7️⃣ 투표 라운드 구조

### Round 정의

```typescript
const TOURNAMENT_STRUCTURE = {
  round1: { name: '48강', matchCount: 24, contestants: 48 },
  round2: { name: '24강', matchCount: 12, contestants: 24 },
  round3: { name: '12강', matchCount: 6,  contestants: 12 },
  round4: { name: '6강',  matchCount: 3,  contestants: 6  },
  round5: { name: '결승', matchCount: 1,  contestants: 3  },
} as const;

// MatchId 생성 규칙
// "{tournamentId}_r{roundNumber}_m{matchIndex}"
// 예: "tourn_abc_r1_m001" ~ "tourn_abc_r1_m024"
```

### 라운드 전환 UI 이벤트 (Realtime DB)

```typescript
// Realtime DB 경로: roundTransitions/{voterId}/{tournamentId}
interface RoundTransitionEvent {
  fromRound: number;
  toRound: number;
  transitionName: string;   // "맨 어브 더 월드컵 24강"
  timestamp: number;
}

// 프론트엔드 구독 패턴
const unsubscribe = db
  .ref(`roundTransitions/${currentUser.uid}/${tournamentId}`)
  .on('value', (snapshot) => {
    const event = snapshot.val();
    if (event) showRoundTransitionEffect(event); // Framer Motion 애니메이션
  });
```

---

## 8️⃣ 에이전트 임무 부여 템플릿

```
당신은 '월크48 [에이전트ID] [모듈명] 전담 개발자'입니다.

≡ 핵심 규칙 (항상 준수):
  ✅ LANGUAGE.md v1.2 용어만 사용
  ✅ Round에는 Deadline 없음 — Voter 투표 흐름 기반 자동 전환
  ✅ 투표 절대 수치(count) UI 노출 금지
  ✅ 반응형: 모바일(375px)/태블릿(768px)/데스크탑(1440px) 3화면 확인
  ✅ 디자인 토큰 준수 (DESIGN_SYSTEM.md 참조)

≡ 담당 모듈:
  - 에이전트: [에이전트ID]
  - 도메인: [Domain 번호 + 이름]
  - 모듈: [모듈명]
  - MVP: [1/2/3]

≡ 기술 스택:
  - Next.js 14 (App Router) + TypeScript
  - Tailwind CSS + Shadcn/UI + Framer Motion + Zustand
  - Firebase (Firestore + Realtime DB + Cloud Functions)

≡ 구현할 기능:
  1. [구체적 기능]
  2. [구체적 기능]

≡ 완료 기준:
  - [ ] 모바일(375px) 렌더링 확인
  - [ ] 태블릿(768px) 렌더링 확인
  - [ ] 데스크탑(1440px) 렌더링 확인
  - [ ] [기능별 테스트 조건]

시작하세요.
```

---

*© 2026 WorldCrown48 | 작성: 48티오 | WC48_CODING_CONTEXT_v1.md → v1.1 (2026-05-17)*
*다이어그램 ①②③④⑤ 100% 반영 | Nation·TournamentType 신규 용어 추가 | CONFIDENTIAL*
