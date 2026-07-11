> ⚠️ **2026-07-11 대개편 정합성 공지** — 이 문서의 일부 내용이 대개편 결정으로 대체되었습니다.
> 충돌 시 최신 진실 우선순위: `CLAUDE.md v2.2 「🔄 2026-07 대개편」` > `LANGUAGE.md v1.7 §13` > 이 문서.
> 상세 결정: `outputs/handoffs-staging/WC48_개편결정_v1_2026-07-10.md` (v1.2)
> 대체된 것: ① currentRound가 항상 1(48강)에서 시작한다는 가정 → **Bracket Size**(Voter가 12/24/48 선택, 라운드 경로 중간 진입) ② 카테고리 = 코드 값 → **categories 컬렉션 데이터**(TX-0)

# Lite Spec — #1 프로젝트 초기 세팅

> ⚠️ **[2026-05-25 정합성 정정]** 이 문서의 프레임워크·환경변수·폴더 구조·라우팅 표기 중 일부는 구버전(Vite + React Router)입니다. **WorldCrown48의 공식 스택은 Next.js 14 (App Router)입니다** — CLAUDE.md 불변 원칙 #8(스택 고정). 프레임워크·폴더 구조·라우팅의 단일 진실은 `WorldCrown48_ARCHITECTURE.md` + `WC48_CODING_CONTEXT_v1.md`입니다. 이 문서의 화면 구성·컴포넌트·기능 명세 자체는 유효합니다.

# ✅ Step 1 업그레이드 — 2026-05-14

---

## ⛔ 절대 규칙 (이 파일 전체에 적용)
```
✅ Contestant     (❌ Candidate — 코드·변수명·컬렉션명 전체)
✅ Match          (❌ Battle)
✅ Tournament Deadline  (❌ Round Deadline — 코드에도 존재 금지)
✅ advanceRound() 시스템 자동  (❌ Host 수동 전환)
✅ Voter          (❌ user, 참여자)
✅ Champion       (❌ winner)
✅ Crown Card     (❌ result_image)
⛔ voteCount(절대 수치) UI 노출 금지 → rate(%) 전용
⛔ rounds[].deadline 필드 Firestore 생성 금지
```

---

## 폴더 구조

```
src/
├── domains/
│   ├── pitch/          # Domain 1: The Pitch
│   ├── arena/          # Domain 3: The Arena
│   ├── policy/         # Domain 5: Policy Hub
│   └── admin/          # Domain 2: The Lab + Domain 6: Admin Dashboard
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── MobileTabBar.tsx   # ← 추가: 모바일 하단 탭 바
│   │   └── Footer.tsx
│   └── ui/             # 공통 원자 컴포넌트 (Button, Badge, Card...)
├── stores/             # Zustand 전역 상태
│   ├── authStore.ts
│   ├── tournamentStore.ts
│   ├── voteStore.ts        # ← 변경: arenaStore → voteStore
│   └── consentStore.ts
├── lib/
│   ├── firebase/
│   │   ├── client.ts   # Firebase 클라이언트 초기화 (단일 인스턴스)
│   │   └── admin.ts    # Firebase Admin (Cloud Functions 전용)
│   ├── claude.ts       # Claude API 호출 래퍼
│   └── utils/
│       ├── hash.ts     # sha256(ip) → ipHash
│       └── date.ts     # KST 자정 기준 날짜
├── hooks/              # 공통 커스텀 훅
│   ├── useVoteGate.ts
│   └── useRoundTransition.ts  # ← 추가: 라운드 전환 이벤트 구독
├── types/
│   └── index.ts        # TypeScript 인터페이스 전체
└── styles/
    └── globals.css
```

---

## 라우팅 구조 (React Router v6)

```
/                        → PitchDomain (Domain 1)
/arena/:tournamentId     → ArenaDomain (Domain 3)
/policies/:type          → PolicyHub (terms | community | privacy | cookies)
/notices                 → NoticeList
/admin/lab               → LabDomain (Domain 2 — 관리자 전용, 데스크탑 only)
/admin/dashboard         → AdminDashboard (Domain 6 — 관리자 전용, 데스크탑 only)
```

---

## Tailwind 디자인 토큰 (tailwind.config.js)

```js
// ⚠️ v2.2 Twilight Stadium 팔레트 (2026-05-23 업데이트)
// ❌ 구버전 금지: #05070A, #0A0D12, #F8FAFC, #8B949E, #30363D, #FAFBFC
colors: {
  wc: {
    // ── 다크 테마 (Domain 0, 1, 2, 3) ──
    'bg-deep':    '#00003A',  // Arena Hero, 최심층 배경 (v2.2)
    'bg':         '#0E0944',  // 기본 다크 배경 (v2.2)
    surface:      '#241754',  // 카드·패널 배경 (v2.2)
    elevated:     '#362261',  // 모달·드롭다운 (v2.2)
    primary:      '#FCD006',  // Pure Gold ← 유일한 포인트 컬러 (불변)
    'primary-hover': '#E3BB05',
    turquoise:    '#00A3B7',  // Left side accent (v2.2)
    crimson:      '#D7063A',  // Right side accent (v2.2)
    text:         '#F2F2F5',  // 다크 기본 텍스트 (v2.2)
    sub:          '#B1B5C4',  // 보조 텍스트·파우더 (v2.2)
    muted:        '#484B67',  // 뮤트 텍스트 (v2.2)
    border:       '#2D1C5A',  // 다크 테두리 (v2.2)
    'border-light-dark': '#281957',  // 연한 다크 테두리 (v2.2)
    // ── 라이트 테마 (Domain 4, 5, 6) ──
    'bg-light':      '#F2F2F5',  // 라이트 배경 (v2.2)
    'surface-light': '#FFFFFF',  // 라이트 카드 배경
    'text-light':    '#241754',  // 라이트 기본 텍스트
    'border-light':  '#D9DBE1',  // 라이트 테두리
    'muted-light':   '#6B7A99',  // 라이트 보조 텍스트
    // ── 상태 컬러 ──
    error:        '#D7063A',
    success:      '#00A3B7',
    warning:      '#EEDA7D',
    info:         '#B1B5C4',
  }
},
fontFamily: {
  sans:    ['Inter', 'Pretendard', 'sans-serif'],
  serif:   ['Playfair Display', 'serif'],   // 디스플레이 타이틀 전용
  mono:    ['JetBrains Mono', 'monospace'], // 숫자·카운트다운
},
borderRadius: {
  card:   '24px',
  modal:  '20px',
  panel:  '16px',
  btn:    '12px',
  badge:  '8px',
},
boxShadow: {
  gold:       '0 0 32px rgba(255, 215, 0, 0.20)',
  'gold-hover':'0 8px 32px rgba(255, 215, 0, 0.15)',
  card:       '0 4px 24px rgba(0, 0, 0, 0.40)',
},
```

---

## Firebase 초기화 (src/lib/firebase/client.ts)

```ts
// 환경변수로 분리, 단일 앱 인스턴스
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const db      = getFirestore(app)   // Firestore (문서 DB)
export const rtdb    = getDatabase(app)    // Realtime DB (투표 실시간)
export const auth    = getAuth(app)
export const storage = getStorage(app)
```

---

## 환경변수 (.env.local)

```bash
# Firebase Client
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=worldcrown48.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=worldcrown48
VITE_FIREBASE_STORAGE_BUCKET=worldcrown48.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=https://worldcrown48-default-rtdb.firebaseio.com

# 관리자
VITE_ADMIN_UID=         # 관리자 uid (MVP 1: 단일)

# External APIs
VITE_CLAUDE_FUNCTION_URL=  # Cloud Function URL (aiFillContestants)
VITE_GNEWS_API_KEY=         # GNews Basic $9/월
```

---

## Acceptance Criteria (개발 검증)

- `npm run dev` → localhost:5173, `wc-bg-deep` (#00003A) 배경 로드
- `wc-primary`, `wc-surface` 등 커스텀 Tailwind 클래스 동작
- Firebase 연결 오류 없음 (콘솔 확인)
- `/admin/lab`, `/admin/dashboard` → 관리자 uid 아니면 `/` 리다이렉트
- Vercel 자동 배포 트리거 확인
- TypeScript 컴파일 오류 없음
# Lite Spec — #2 Firebase 스키마 & Security Rules
# ✅ Step 1 업그레이드 — 2026-05-14
# 🔴 주요 수정: Candidate→Contestant, 라운드 번호 체계, tournamentDeadline

---

## ⛔ 절대 규칙
```
✅ contestants 컬렉션  (❌ candidates — 컬렉션명·필드명·변수명 전부)
✅ contestantId        (❌ candidateId, winner_id)
✅ tournamentDeadline  (❌ roundDeadline, rounds[].deadline)
✅ currentRound: 1~5  (❌ currentRound: 48/24/12/6/3/1)
⛔ total_votes, voteCount 필드 Firestore 저장 금지 (노출 위험)
⛔ trend_score를 UI에 직접 노출 금지 (내부 정렬용만)
```

---

## TypeScript 타입 정의 (src/types/index.ts)

```ts
// ── tournaments ──
interface Tournament {
  id: string
  title: string
  category: 'FIFA' | 'KPOP' | 'OTHER'
  desc?: string                    // 선택, 최대 200자
  hostUid: string                  // FK → users.uid
  status: 'draft' | 'active' | 'closed'
  createdAt: Timestamp
  tournamentDeadline: Timestamp    // ★ Tournament 전체의 유일한 Deadline
  currentRound: number             // 1=48강 2=24강 3=12강 4=6강 5=결승
  totalContestants: 48             // 고정값
  thumbnailUrl: string
  settings: {
    aiNews: boolean
    multiLang: boolean
    showRanking: boolean
  }
  // ❌ 절대 금지 필드:
  // total_votes, rounds[].deadline, roundDeadline, voteCount
}

// ── contestants (❌ candidates 아님) ──
interface Contestant {
  id: string
  tournamentId: string             // FK → tournaments
  name: string
  imageUrl: string                 // Firebase Storage URL
  order: number                    // 1~48 배치 순서
  nationality?: string
  position?: string
  dataSource?: string              // 이미지 출처 레벨 (L1/L2/L3)
}

// ── votes ──
interface Vote {
  id: string
  userId: string                   // FK → users.uid
  tournamentId: string             // FK → tournaments
  matchId: string                  // "{tournamentId}_r{round}_m{matchIndex}"
  contestantId: string             // ✅ (❌ winner_id)
  votedAt: Timestamp
  date: string                     // "2026-06-14" (KST 기준, 자정 리셋)
  ipHash: string                   // sha256(rawIP + salt), 16자리
  deviceId: string | null          // fingerprintjs (MVP 2)
  round: number                    // 1~5 (❌ 48/24/12/6/3/1 아님)
}

// ── ranking_cache ──
interface RankingCache {
  tournamentId: string
  cachedAt: Timestamp
  rankings: Array<{
    contestantId: string
    rate: string                   // "34.5" (% 문자열)
    // ❌ count 필드 절대 금지
  }>
  // 갱신 주기: 매 1시간 (scheduleRankingCache Cloud Function)
}

// ── ai_news ──
interface AINews {
  id: string
  tournamentId: string
  trigger: {
    type: 'T-1' | 'T-2' | 'T-3' | 'T-4' | 'champion'
    detail: string
  }
  title: string
  body: string                     // 최소 300자
  crownCardUrl: string
  status: 'pending_generation' | 'pending_review' | 'approved' | 'rejected' | 'published'
  autoCheckResult: {
    defamation: boolean
    noAbsoluteCount: boolean       // 절대수치 미사용 확인
    factCheck: boolean
    identity: boolean
    minLength: boolean             // 최소 300자
    dataAccuracy: boolean          // 수치 정확도 ±1%p
  }
  reviewedBy: string | null
  publishedAt: Timestamp | null
  createdAt: Timestamp
}

// ── crown_cards ──
interface CrownCard {
  id: string
  tournamentId: string             // FK → tournaments
  contestantId: string             // FK → contestants (Champion)
  imageUrl: string                 // Firebase Storage URL (.png)
  createdAt: Timestamp
}

// ── users ──
interface User {
  uid: string                      // Firebase Auth UID
  email: string
  displayName: string
  photoURL: string
  role: 'voter' | 'admin'
  createdAt: Timestamp
  lastLoginAt: Timestamp
}

// ── cookie_consents ──
interface CookieConsent {
  uid: string
  essential: true                  // 항상 true
  functional: boolean
  analytics: boolean
  marketing: false                 // MVP 3까지 항상 false
  timestamp: Timestamp
  ipHash: string
}

// ── audit_log ── (GDPR 3년 보관 의무)
interface AuditLog {
  id: string
  uid: string
  action: 'GDPR_DELETE' | 'ADMIN_ACTION'
  timestamp: Timestamp
}

// ── admin_alerts ──
interface AdminAlert {
  id: string
  tournamentId: string
  type: 'ABUSE' | 'ANOMALY_T1' | 'ANOMALY_T2' | 'ANOMALY_T3' | 'ANOMALY_T4'
  detail: string
  createdAt: Timestamp
}

// ── waitlist ──
interface Waitlist {
  id: string
  email: string
  createdAt: Timestamp
}
```

---

## Realtime Database 구조

```
/votes
  /{matchId}
    /{contestantId}           # ✅ (❌ candidateId 아님)
      count: number           # 내부 집계용 — UI 노출 금지

/roundTransitions             # 라운드 전환 이벤트 (Voter별)
  /{voterId}
    /{tournamentId}
      fromRound: number       # 1~5
      toRound: number         # 1~5
      timestamp: number       # epoch ms
```

---

## MatchId 생성 규칙

```ts
// 형식: "{tournamentId}_r{roundNumber}_m{matchIndex}"
// 예시: "tourn_abc_r1_m001" ~ "tourn_abc_r1_m024"  (48강 24매치)
//       "tourn_abc_r2_m001" ~ "tourn_abc_r2_m012"  (24강 12매치)

const ROUND_CONFIG = {
  1: { name: '48강', matchCount: 24, contestants: 48 },
  2: { name: '24강', matchCount: 12, contestants: 24 },
  3: { name: '12강', matchCount: 6,  contestants: 12 },
  4: { name: '6강',  matchCount: 3,  contestants: 6  },
  5: { name: '결승', matchCount: 1,  contestants: 3  },
} as const
```

---

## Firestore Security Rules 핵심 패턴

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // tournaments: 공개 읽기, 관리자만 쓰기
    match /tournaments/{id} {
      allow read: if resource.data.status == 'active';
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // contestants: 공개 읽기, Cloud Functions만 쓰기
    // ✅ contestants (❌ candidates)
    match /contestants/{id} {
      allow read: if true;
      allow write: if false;  // Cloud Functions만
    }

    // votes: 로그인 유저 쓰기, 본인만 읽기
    match /votes/{id} {
      allow read: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }

    // ranking_cache: 로그인 유저 읽기, Cloud Functions만 쓰기
    match /ranking_cache/{id} {
      allow read: if request.auth != null;
      allow write: if false;  // scheduleRankingCache Cloud Function만
    }

    // admin_alerts: admin 역할만
    match /admin_alerts/{id} {
      allow read, write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // audit_log: admin 읽기, Cloud Functions 쓰기
    match /audit_log/{id} {
      allow read: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow write: if false;  // Cloud Functions만
    }

    // cookie_consents: 본인만
    match /cookie_consents/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

---

## Firestore 복합 인덱스 (firestore.indexes.json)

```json
[
  {
    "collection": "tournaments",
    "fields": [
      {"field": "status"},
      {"field": "category"},
      {"field": "createdAt", "order": "DESCENDING"}
    ]
  },
  {
    "collection": "contestants",
    "fields": [
      {"field": "tournamentId"},
      {"field": "order"}
    ]
  },
  {
    "collection": "votes",
    "fields": [
      {"field": "userId"},
      {"field": "tournamentId"},
      {"field": "date"}
    ]
  },
  {
    "collection": "votes",
    "fields": [
      {"field": "matchId"},
      {"field": "contestantId"}
    ]
  }
]
```
# Lite Spec — #5 Vercel + Cloudflare 배포 파이프라인
# ✅ Step 1 업그레이드 — 2026-05-14

---

## vercel.json

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

## Vercel 환경변수 설정

| 변수명 | Scope |
|---|---|
| VITE_FIREBASE_API_KEY | Production + Preview |
| VITE_FIREBASE_AUTH_DOMAIN | Production + Preview |
| VITE_FIREBASE_PROJECT_ID | Production + Preview |
| VITE_FIREBASE_STORAGE_BUCKET | Production + Preview |
| VITE_FIREBASE_MESSAGING_SENDER_ID | Production + Preview |
| VITE_FIREBASE_APP_ID | Production + Preview |
| VITE_FIREBASE_DATABASE_URL | Production + Preview |
| VITE_ADMIN_UID | Production only |
| VITE_CLAUDE_FUNCTION_URL | Production + Preview |
| VITE_GNEWS_API_KEY | Production + Preview |

## Cloudflare DNS 설정

```
Type   Name              Content              Proxy
A      worldcrown48.com  76.76.21.21          ✅ (Proxied)
CNAME  www               cname.vercel-dns.com ✅ (Proxied)
```

## 배포 흐름

```
git push origin main
  → Vercel 자동 감지 → npm run build → 배포
  → worldcrown48.com 반영 (평균 45초)

PR 오픈
  → preview-{branch}.vercel.app 자동 생성
```

## Cloud Functions 배포 (별도)

```bash
# functions/ 폴더에서
npm run build
firebase deploy --only functions

# 함수별 배포 (특정 함수만)
firebase deploy --only functions:onVote
firebase deploy --only functions:scheduleRankingCache
```

## Acceptance Criteria

- `https://worldcrown48.com` HTTPS 강제 리다이렉트
- SPA 라우팅 `/arena/123` 직접 접근 가능 (rewrites 설정)
- Cloudflare Analytics 활성화
- 배포 후 Firebase 연결 정상 확인
- Cloud Functions 11개 배포 확인
