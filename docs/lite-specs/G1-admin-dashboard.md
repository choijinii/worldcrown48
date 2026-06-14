# Lite Spec — G1 Admin Dashboard
# Domain 6 ADMIN DASHBOARD — M1~M2 | 에이전트 G-1 | MVP 1
# 🆕 신규 생성 — 2026-05-14

---

## ⛔ 절대 규칙
```
✅ 데스크탑 전용 (min-width: 1440px, 모바일 최적화 불필요)
✅ 라이트 테마 (Domain 6 = bg-wc-bg-light: #F2F2F5)
✅ role === "admin" 필수 — 비관리자 /admin/* 접근 → 403
✅ 5지표에서 "활성 Voter 수" (❌ "활성 유저 수" — 용어 통일)
✅ 투표 절대 수치(count)는 관리자 대시보드에서만 노출 허용
    (Voter 화면에는 절대 노출 금지 — 이 구분을 명확히 할 것)
```

---

## 도메인 개요

시스템 관리자(대표님)가 전체 플랫폼을 모니터링하는 통합 콘트롤 센터입니다.
실시간 투표 현황 5지표 + 대진 목록 관리가 MVP 1 핵심입니다.
/admin/* 경로는 Next.js middleware에서 role !== "admin" → 403 처리.

---

## 컴포넌트 트리

```
<AdminDashboard>               # /admin/dashboard
  <AdminSidebar />             # 좌측 사이드바 네비
  <DashboardMain>
    <KPICards />               # 5지표 카드 (M1)
    <VoteSpeedChart />         # 실시간 투표 속도 차트 (M1)
    <AlertCards />             # Rate Limiting + 어뷰징 경고 (M1)
    <TournamentTable />        # 대진 목록 + 필터 (M2)
  </DashboardMain>
```

---

## M1 메인 대시보드 — 5지표 카드

```ts
// Tournament 관제탑 5지표
const KPI_METRICS = [
  {
    id: 'total_votes',
    label: '총 투표 수',
    source: 'Realtime DB',
    // ✅ 관리자 전용 노출 — Voter 화면 금지
  },
  {
    id: 'active_voters',
    label: '활성 Voter 수',      // ✅ Voter (❌ 유저)
    desc: '최근 1시간 내 투표 참여 유니크 Voter',
    source: 'Firestore',
  },
  {
    id: 'vote_speed',
    label: '투표 속도',
    desc: '분당 투표 수',
    source: 'Realtime DB',      // Recharts LineChart
  },
  {
    id: 'abuse_warnings',
    label: '어뷰징 경고',
    desc: 'Rate Limiting 발동 횟수 + 의심 계정',
    source: 'admin_alerts 컬렉션',
  },
  {
    id: 'round_status',
    label: '라운드 현황',
    desc: '현재 라운드 · Tournament Deadline까지 남은 시간 · 완료 Match 수',
    source: 'Firestore tournaments',
  },
]
```

### 5지표 카드 UI

```
카드: bg-white rounded-panel border border-wc-border-light shadow-sm
지표 숫자: text-[32px] font-bold text-wc-primary (Gold)  
지표명: text-[14px] text-wc-muted-light
변화량: 전일 대비 ▲/▼ text-[12px]

레이아웃: grid grid-cols-5 gap-4 (데스크탑 전용)
```

### 투표 속도 실시간 차트

```tsx
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'

// Realtime DB onValue 리스너로 실시간 업데이트
// 데이터: 최근 24시간 시간당 투표 수
// x축: 시간 (00:00 ~ 현재)
// y축: 투표 수
// 라인 색상: stroke="#FCD006" (Gold)
```

### 어뷰징 경고 카드

```tsx
// admin_alerts 컬렉션 실시간 구독
// 미처리 알림: 빨간 뱃지 + 상단 고정
// 알림 유형별 아이콘:
//   ABUSE:       ⚠️ bg-red-50 border-red-200
//   ANOMALY_T*:  📊 bg-amber-50 border-amber-200
```

---

## M2 대진 목록 관리

```tsx
// Shadcn DataTable
interface TournamentRow {
  id: string
  title: string
  category: 'FIFA' | 'KPOP'
  status: 'draft' | 'active' | 'closed'
  contestantCount: number    // 관리자 전용 — 항상 48
  tournamentDeadline: string // "2026-07-14"
  createdAt: string
}

// 상태 배지 (Status Badge)
const STATUS_STYLES = {
  active: 'bg-green-100 text-green-700 border border-green-200',
  draft:  'bg-gray-100  text-gray-600  border border-gray-200',
  closed: 'bg-red-100   text-red-600   border border-red-200',
}

// 필터: 카테고리(전체/FIFA/KPOP) + 상태(전체/활성/임시/마감)
// 정렬: createdAt 내림차순 기본
// 페이지당: 20개
```

---

## AdminSidebar

```tsx
const SIDEBAR_ITEMS = [
  { label: '대시보드',    path: '/admin/dashboard', icon: 'LayoutDashboard', mvp: 1 },
  { label: '대진 목록',   path: '/admin/dashboard', icon: 'List',            mvp: 1 },
  { label: '대진 생성',   path: '/admin/lab',        icon: 'Flask',           mvp: 1 },
  { label: '운영 현황',   path: '/admin/operation',  icon: 'Activity',        mvp: 2, disabled: true },
  { label: 'AI 뉴스',     path: '/admin/news',       icon: 'Newspaper',       mvp: 2, disabled: true },
]
// MVP 2 항목: opacity-40 + cursor-not-allowed + Tooltip "MVP 2 예정"
```

---

## 라우트 보호 (Next.js Middleware)

```ts
// middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('auth-token')
    // Firebase Auth 세션 쿠키 검증
    if (!token || !isAdmin(token)) {
      return NextResponse.rewrite(new URL('/403', request.url))
    }
  }
}
```

---

## Acceptance Criteria

- [ ] 데스크탑(1440px) 렌더링 정상
- [ ] 비관리자 /admin/* 접근 → 403 리다이렉트 확인
- [ ] 5지표 카드 실시간 업데이트 (Realtime DB 리스너)
- [ ] 투표 속도 차트 렌더링 (Recharts)
- [ ] admin_alerts 경고 실시간 표시
- [ ] Tournament 목록 필터 동작 확인
- [ ] 상태 배지 3종 색상 확인
- [ ] AdminSidebar MVP 2 항목 disabled 처리 확인
