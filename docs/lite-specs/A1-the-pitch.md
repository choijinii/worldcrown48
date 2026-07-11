> ⚠️ **2026-07-11 대개편 정합성 공지** — 이 문서의 일부 내용이 대개편 결정으로 대체되었습니다.
> 충돌 시 최신 진실 우선순위: `CLAUDE.md v2.2 「🔄 2026-07 대개편」` > `LANGUAGE.md v1.7 §13` > 이 문서.
> 상세 결정: `outputs/handoffs-staging/WC48_개편결정_v1_2026-07-10.md` (v1.2)
> 대체된 것: The Pitch는 **카테고리 섹션형 + 동적 히어로 + 우측 상설 프레임**으로 전면 개편 예정(Pitch 개편 모듈). 본문 레이아웃을 신규 작업 기준으로 사용하지 말 것

# Lite Spec — #7 The Pitch — 트렌딩 대진 피드

> ⚠️ **[2026-05-25 정합성 정정]** 이 문서의 프레임워크·환경변수·폴더 구조·라우팅 표기 중 일부는 구버전(Vite + React Router)입니다. **WorldCrown48의 공식 스택은 Next.js 14 (App Router)입니다** — CLAUDE.md 불변 원칙 #8(스택 고정). 프레임워크·폴더 구조·라우팅의 단일 진실은 `WorldCrown48_ARCHITECTURE.md` + `WC48_CODING_CONTEXT_v1.md`입니다. 이 문서의 화면 구성·컴포넌트·기능 명세 자체는 유효합니다.

# ✅ Step 1 업그레이드 — 2026-05-14
# 🔴 주요 수정: TournamentCard에서 voteCount 노출 금지

---

## ⛔ 절대 규칙
```
✅ TournamentCard에 voteCount(투표 절대 수치) 표시 금지
✅ "FIFA", "Official" 문자 사용 금지 (상표권)
✅ 에이전트 A-1 담당
✅ 반응형 3화면: 모바일(375px) / 태블릿(768px) / 데스크탑(1440px)
✅ 다크 테마 (Domain 1 = bg-wc-bg)
```

---

## 컴포넌트 트리

```
<PitchDomain>
  <HeroSection />                # 메인 타이틀 + CTA
  <CategoryFilter />             # FIFA WORLDCUP | K-POP (MVP1: WORLDCUP만)
  <TrendingFeed>
    <TournamentCard tournament={t} />
    <TournamentCard ... />
  </TrendingFeed>
  <TopCreatorsSidebar />         # 데스크탑 우측 고정
```

## 상태 (tournamentStore.ts — Zustand)

```ts
{
  tournaments: Tournament[],
  category: 'FIFA' | 'KPOP',
  loading: boolean,
  // actions
  setCategory: (cat: 'FIFA' | 'KPOP') => void,
  subscribeToTrending: () => () => void,  // Firestore onSnapshot 구독 해제
}
```

## Firestore 쿼리

```ts
query(
  collection(db, 'tournaments'),
  where('status', '==', 'active'),
  where('category', '==', category),
  orderBy('createdAt', 'desc'),
  limit(12)
)
// ⚠️ trend_score는 정렬에만 사용 — UI에 수치 직접 노출 금지
```

## TournamentCard Props

```ts
interface TournamentCardProps {
  tournament: Tournament
  onClick: (id: string) => void
}
// ✅ 표시 가능: 제목, 카테고리 배지, 썸네일, 남은 기간  (❌ "LIVE" 뱃지 금지 — DESIGN_BRIEF 금지 패턴. 2026-07-11 오염 정정)
// ❌ 표시 금지: total_votes, voteCount, 참여자 절대 수치
// hover: border-l-4 border-wc-primary (골드 좌측 보더)
// 카드 배경: bg-wc-surface, border border-wc-border
// hover: border-wc-primary, box-shadow: shadow-gold
```

## HeroSection

```
타이틀 라인 1: "Who wears the"     (Inter Bold, text-wc-text)
타이틀 라인 2: "Ultimate Crown?"   (Playfair Display Italic, text-wc-primary)
배경 글로우: radial-gradient(ellipse 80% 60% at 50% 40%,
             rgba(255,215,0,0.08), transparent 70%)
CTA 버튼:
  [START VOTING →]   bg-wc-primary text-black font-semibold rounded-btn
  [EXPLORE]          border border-wc-border text-wc-text rounded-btn
```

## 반응형 레이아웃

```
모바일(375px):   1열 카드, CTA 버튼 w-full 세로 배치
태블릿(768px):   2열 카드
데스크탑(1440px): 2열 카드 + 우측 TopCreatorsSidebar 고정
```
