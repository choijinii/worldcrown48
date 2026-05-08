# Lite Spec — #1 프로젝트 초기 세팅

## 폴더 구조

```
src/
├── domains/
│   ├── pitch/          # Domain 1: The Pitch
│   ├── arena/          # Domain 3: The Arena
│   ├── policy/         # Domain 5: Policy Hub
│   └── admin/          # Admin 페이지
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx
│   │   └── Footer.jsx
│   └── ui/             # 공통 원자 컴포넌트 (Button, Badge, Card...)
├── stores/             # Zustand 전역 상태
│   ├── authStore.js
│   ├── tournamentStore.js
│   └── consentStore.js
├── lib/
│   ├── firebase.js     # Firebase 초기화 (단일 인스턴스)
│   ├── claude.js       # Claude API 호출 래퍼
│   └── utils.js
├── hooks/              # 공통 커스텀 훅
└── styles/
    └── globals.css
```

## 라우팅 구조 (React Router v6)

```
/                        → PitchDomain
/arena/:tournamentId     → ArenaDomain
/policies/:type          → PolicyHub (terms | community | privacy | cookies)
/notices                 → NoticeList
/admin                   → AdminDomain (관리자 전용)
```

## Tailwind 디자인 토큰 (tailwind.config.js)

```js
colors: {
  wc: {
    bg:      '#05070A',  // Deep Midnight
    surface: '#0E1217',
    primary: '#FFD700',  // Pure Gold
    text:    '#F8FAFC',
    muted:   '#64748B',
    border:  '#1E293B',
    error:   '#EF4444',
    success: '#22C55E',
  }
},
fontFamily: {
  sans:  ['Inter', 'sans-serif'],
  serif: ['Playfair Display', 'serif'],
}
```

## Firebase 초기화 (src/lib/firebase.js)

```js
// 환경변수로 분리, 단일 앱 인스턴스
const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const rtdb = getDatabase(app)
export const auth = getAuth(app)
export const storage = getStorage(app)
```

## 환경변수 (.env.local)

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_ADMIN_UID=         # 관리자 uid (단일)
VITE_CLAUDE_FUNCTION_URL= # Cloud Function URL
```

## Acceptance Criteria (개발 검증)

- `npm run dev` → localhost:5173 Deep Midnight 배경 로드
- `wc-bg`, `wc-primary` 등 커스텀 Tailwind 클래스 동작
- Firebase 연결 오류 없음 (콘솔 확인)
- `/admin` → 관리자 uid 아니면 `/` 리다이렉트
- Vercel 자동 배포 트리거 확인
