# Lite Spec — #7 The Pitch — 트렌딩 대진 피드

## 컴포넌트 트리

```
<PitchDomain>
  <HeroSection />                # 메인 타이틀 + CTA
  <CategoryFilter />             # WORLD CUP | K-POP (MVP1: WORLD CUP만)
  <TrendingFeed>
    <TournamentCard tournament={t} />  # 대진 카드 (클릭 → Arena)
    <TournamentCard ... />
  </TrendingFeed>
  <TopCreatorsSidebar />         # PC 우측 고정
```

## 상태 (tournamentStore.js — Zustand)

```js
{
  tournaments: Tournament[],
  category: 'WORLD_CUP' | 'KPOP',
  loading: boolean,
  // actions
  setCategory: (cat) => void,
  subscribeToTrending: () => unsubscribe,  // Firestore onSnapshot
}
```

## Firestore 쿼리

```js
// 실시간 구독
query(
  collection(db, 'tournaments'),
  where('is_public', '==', true),
  where('status', '==', 'active'),
  where('category', '==', category),
  orderBy('trend_score', 'desc'),
  limit(12)
)
```

## TournamentCard Props

```ts
interface TournamentCardProps {
  tournament: Tournament
  onClick: (id: string) => void
}
// 표시: 제목, 참여자 수, "LIVE 48" 뱃지, trend_score 기반 hype%
// hover: 골드 좌측 보더 (border-l-4 border-wc-primary)
```

## HeroSection

```
타이틀: "Who wears the" (Inter Bold, White)
       "Ultimate Crown?" (Playfair Display Italic, #FFD700)
배경: 골드 글로우 absolute -top-20 -left-20 w-96 h-96
     bg-wc-primary/10 blur-[120px] rounded-full
CTA: [CREATE YOUR 48 →] [EXPLORE PITCH]
```

## 반응형

- 모바일(< 768px): 1열 카드
- 태블릿(768px~): 2열 카드
- PC(1024px~): 2열 카드 + 우측 사이드바
