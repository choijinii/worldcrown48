# 🎨 WorldCrown48 (월크48) — UI 디자인 시스템
# WC48_DESIGN_SYSTEM_v1.md
# 다이어그램 5개 + 설계서 v4.8 100% 반영 | 2026-05-14 작성 | 작성자: 48티오

> **이 파일의 목적**: UI 디자이너 / Figma 작업자 / Claude Artifacts 제작 시
> 반드시 참조해야 하는 월크48 공식 디자인 시스템입니다.
> 모든 컴포넌트, 색상, 타이포그래피, 반응형 규격이 이 파일에 정의됩니다.

---

## ⛔ 디자인 절대 원칙

```
1. Pure Gold(#FFD700)만 포인트 컬러 — 형광 노랑·그린 금지
2. 한국적 요소 금지 — 글로벌 MZ Sporty 럭셔리 디자인
3. "AI GENERATED" 배지 의무 표시 (AI 생성 콘텐츠 전체)
4. "FIFA", "Official" 문자 사용 금지 (상표권)
5. Vote Count(절대 수치) UI 노출 금지
6. 듀얼 테마: 다크(Domain 0~3) + 라이트(Domain 4~6)
7. 반응형: 3가지 화면 모두 디자인 — 375px / 768px / 1440px
```

---

## 1️⃣ 듀얼 테마 디자인 토큰 (CSS Variables)

### 다크 테마 — Domain 0, 1, 2, 3

```css
/* ── 배경 팔레트 ── */
--color-bg-deep:      #05070A;   /* 가장 깊은 배경 (전체 페이지 배경) */
--color-bg-default:   #0A0D12;   /* 기본 다크 배경 (컨테이너) */
--color-bg-soft:      #0E1217;   /* 카드·패널 배경 */
--color-bg-elevated:  #131820;   /* 모달·드롭다운 배경 */

/* ── 브랜드 컬러 ── */
--color-gold:         #FFD700;   /* Pure Gold — 버튼·강조·테두리 (공통) */
--color-gold-hover:   #FFC000;   /* Gold Hover 상태 */
--color-gold-subtle:  rgba(255, 215, 0, 0.12);  /* Gold 은은한 배경 */
--color-gold-glow:    rgba(255, 215, 0, 0.25);  /* Gold 블러 글로우 */

/* ── 텍스트 ── */
--color-text:         #F8FAFC;   /* 기본 텍스트 (Slate 50) */
--color-text-sub:     #CBD5E1;   /* 보조 텍스트 (Slate 300) */
--color-text-muted:   #8B949E;   /* 뮤트 텍스트 */
--color-text-disabled:#4B5563;   /* 비활성 텍스트 */

/* ── 테두리 ── */
--color-border:       #30363D;   /* 기본 테두리 */
--color-border-light: #21262D;   /* 미세 테두리 */

/* ── 상태 컬러 ── */
--color-error:        #EF4444;   /* 오류 (Red 500) */
--color-success:      #22C55E;   /* 성공 (Green 500) */
--color-warning:      #F59E0B;   /* 경고 (Amber 500) */
--color-info:         #3B82F6;   /* 정보 (Blue 500) */
```

### 라이트 테마 — Domain 4, 5, 6

```css
/* ── 배경 팔레트 ── */
--color-bg-light:         #FAFBFC;   /* 라이트 전체 배경 */
--color-surface-light:    #FFFFFF;   /* 카드·컨테이너 배경 */
--color-surface-elevated: #F1F5F9;   /* 섹션 배경 */

/* ── 브랜드 컬러 (공통) ── */
--color-gold:             #FFD700;   /* 동일 Gold */
--color-gold-hover:       #FFC000;
--color-gold-subtle:      rgba(255, 215, 0, 0.10);

/* ── 텍스트 ── */
--color-text-light:       #1A1A2E;   /* 다크 블루 (기본 텍스트) */
--color-text-sub-light:   #374151;   /* 보조 텍스트 */
--color-text-muted-light: #64748B;   /* 뮤트 텍스트 (Slate 500) */

/* ── 테두리 ── */
--color-border-light:     #E2E8F0;   /* 라이트 테두리 (Slate 200) */
--color-border-subtle:    #F1F5F9;   /* 미세 테두리 */
```

---

## 2️⃣ 타이포그래피 시스템

### 폰트 패밀리

```css
/* 럭셔리 디스플레이 타이틀 */
--font-display: 'Playfair Display', serif;
/* 용도: 히어로 슬로건, 챔피언 확정 화면, Crown Card 텍스트 */

/* 기본 UI 폰트 */
--font-body: 'Inter', 'Pretendard', sans-serif;
/* 용도: 버튼, 본문, 폼, 테이블 등 모든 UI */

/* 숫자·코드 */
--font-mono: 'JetBrains Mono', monospace;
/* 용도: 카운트다운 숫자, 퍼센트 수치 */
```

### 타입 스케일 (Tailwind 기준)

```
text-[48px]/[56px] font-bold font-display   — Hero 메인 슬로건 (모바일 text-3xl)
text-[36px]/[44px] font-bold font-display   — 섹션 제목
text-[28px]/[36px] font-semibold            — 카드 제목 / Champion 이름
text-[22px]/[32px] font-semibold            — Contestant 이름 (VSBattle)
text-[18px]/[28px] font-medium              — 본문 강조
text-[16px]/[24px] font-normal              — 기본 본문
text-[14px]/[20px] font-normal              — 보조 텍스트 / 배지
text-[12px]/[16px] font-normal              — 캡션 / 라벨
text-[10px]/[14px] font-normal              — 최소 텍스트 (AI GENERATED 배지)
```

---

## 3️⃣ 간격·모서리·그림자 토큰

```css
/* ── 모서리 반경 ── */
--radius-card:    24px;    /* 대형 카드 (VS Battle, Crown Card) */
--radius-modal:   20px;    /* 모달·바텀시트 */
--radius-panel:   16px;    /* 패널·섹션 */
--radius-btn:     12px;    /* 버튼 */
--radius-badge:   8px;     /* 배지·태그 */
--radius-chip:    999px;   /* pill 형태 칩 */

/* ── 그림자 (다크 테마) ── */
--shadow-card:    0 4px 24px rgba(0, 0, 0, 0.40);
--shadow-modal:   0 8px 48px rgba(0, 0, 0, 0.60);
--shadow-gold:    0 0 32px rgba(255, 215, 0, 0.20);   /* Gold 글로우 */
--shadow-hover:   0 8px 32px rgba(255, 215, 0, 0.15); /* Hover 상태 */

/* ── 간격 시스템 ── */
--spacing-xs:   4px
--spacing-sm:   8px
--spacing-md:   16px
--spacing-lg:   24px
--spacing-xl:   40px
--spacing-2xl:  64px
--spacing-3xl:  96px
```

---

## 4️⃣ 반응형 그리드 시스템

### 브레이크포인트 (3화면 필수)

```
모바일:     375px  ~ 767px   (xs~sm)
태블릿:     768px  ~ 1023px  (md)
데스크탑:   1440px+          (xl, 2xl)

Tailwind 설정:
  sm:  640px
  md:  768px
  lg:  1024px
  xl:  1280px
  2xl: 1440px
```

### 컨테이너 최대 너비

```
모바일:    max-w-[375px]  px-4
태블릿:    max-w-[768px]  px-6
데스크탑:  max-w-[1440px] px-12 (콘텐츠 max-w-[1200px] mx-auto)
```

### Tournament 카드 그리드 (Domain 1 Trending)

```
모바일:    grid-cols-1    gap-4   (1열)
태블릿:    grid-cols-2    gap-6   (2열)
데스크탑:  grid-cols-3    gap-8   (3열)
```

### Contestant 48 Nodes 그리드 (Domain 2 Lab)

```
데스크탑 전용:
  grid-cols-8    gap-3   (6열 × 8개 = 48개)
  또는 grid-cols-6 gap-4 (6열 × 8행)
  각 노드 크기: 80×80px (이미지) + 아래 이름 텍스트
```

---

## 5️⃣ 도메인별 디자인 명세

### Domain 0 — LAUNCH PAD (다크 테마)

```
배경: --color-bg-deep (#05070A)
배경 효과: Gold 방사형 그라디언트 블러
  background: radial-gradient(
    ellipse 80% 60% at 50% 40%,
    rgba(255,215,0,0.08) 0%,
    transparent 70%
  );

M1 Hero:
  - 슬로건: "WHO RULES THE WORLD?" font-display italic
  - 텍스트 색상: --color-text (#F8FAFC)
  - Gold 언더라인 강조: border-bottom: 2px solid #FFD700
  - 로고 크기: 모바일 120px / 데스크탑 180px

M2 Countdown:
  - font-mono, text-[64px] (모바일 text-[48px])
  - 색상: --color-gold (#FFD700)
  - 레이블: text-[14px] --color-text-muted
  - 단위: DAYS / HOURS / MINS / SECS

M3 Waitlist 이메일 입력:
  - 배경: --color-bg-elevated
  - 테두리: 1px solid --color-border
  - Focus: border-color: --color-gold, box-shadow: --shadow-gold
  - 버튼: bg-gold text-black font-semibold rounded-[12px]

M4 SNS Links:
  - 아이콘 크기: 24×24px
  - 색상: --color-text-muted, hover: --color-gold
```

### Domain 1 — THE PITCH (다크 테마)

```
배경: --color-bg-default (#0A0D12)

M1 Hero:
  - 히어로 이미지 + Gold 블러 오버레이
  - CTA 버튼: "START VOTING" bg-gold text-black
  - 버튼 크기: 모바일 h-12 w-full / 데스크탑 h-14 px-10

M2 Trending 카드:
  - 카드 배경: --color-bg-soft (#0E1217)
  - 카드 테두리: 1px solid --color-border
  - Hover: border-color: --color-gold, box-shadow: --shadow-hover
  - 썸네일 비율: 16:9
  - 카테고리 배지: rounded-chip bg-gold text-black text-[12px] font-bold px-2 py-0.5
  - Tournament 제목: text-[18px] font-semibold --color-text
  - 참여자 수: text-[14px] --color-text-muted

M3 GNB (상단 네비게이션):
  - 높이: 64px (모바일 56px)
  - 배경: 초기 투명 → 스크롤 시 backdrop-blur-md + bg-black/80
  - 로고: 좌측, 높이 32px
  - 메뉴: 우측, text-[14px] font-medium, hover: --color-gold
  - 모바일: 로고만 상단 + 하단 탭 바

M3 모바일 하단 탭 바:
  - 높이: 64px + safe-area-inset-bottom
  - 배경: --color-bg-elevated / backdrop-blur-lg
  - 아이콘 + 레이블: 4개 탭 (Home / Arena / Profile / Lab)
  - 활성 탭: --color-gold

M4 Lab Entry:
  - 비관리자: opacity-40 + cursor-not-allowed
  - Tooltip: "관리자만 접근 가능"
```

### Domain 2 — THE LAB (다크 테마, 데스크탑 전용)

```
배경: --color-bg-default (#0A0D12)

M0 Wizard (4단계 마법사):
  - Step 인디케이터: 상단 수평 스텝퍼 (Gold = 완료, Gray = 미완료)
  - 각 스텝 너비 균등 분할

M2 48 Nodes 그리드:
  - 각 노드: 80×80px 이미지 + 이름
  - 비어있는 노드: 점선 테두리 + "+" 아이콘, --color-border-light
  - 채워진 노드: Contestant 이미지 (object-cover), 이름 텍스트 아래
  - 드래그 재배치 지원 (Framer Motion DnD)

M3 AI Fill 버튼:
  - "✨ AI로 채우기" 
  - 버튼 스타일: border-2 border-gold text-gold hover:bg-gold hover:text-black
  - 로딩 중: 스피너 + "Claude AI가 48명을 추천 중..."
```

### Domain 3 — THE ARENA (다크 테마) ★ 핵심

```
배경: --color-bg-deep (#05070A)
배경 효과: 매치별 Contestant 색상 기반 동적 그라디언트 (subtle)

─────────────────────────────────────
M2 VS Battle 카드 (핵심 컴포넌트)
─────────────────────────────────────

레이아웃:
  모바일:    세로 스택 (A 위 / VS 중간 / B 아래)
  태블릿:    가로 배치 (A 좌 / VS 중앙 / B 우)
  데스크탑:  가로 배치 + 더 넓은 이미지

Contestant 이미지 카드:
  - 크기: 모바일 160×200px / 태블릿 200×260px / 데스크탑 240×320px
  - 모서리: rounded-[24px]
  - 이미지: object-cover, 위 80%
  - 아래 오버레이 그라디언트:
    background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%);
  - Contestant 이름: 절대 위치, 카드 하단, font-semibold text-white
  - Hover 상태: scale(1.03) + border-2 border-gold + shadow-gold
  - 선택 후: border-4 border-gold + gold 체크 뱃지 (상단 우측)

VS 배지 (중앙):
  - 배경: --color-gold
  - 텍스트: "VS" text-black font-black text-[20px]
  - 모양: 원형 56×56px 또는 마름모 (다이아몬드)
  - 드롭섀도: --shadow-gold

투표 버튼 (각 Contestant 아래):
  - 크기: 모바일 w-full h-12 / 데스크탑 min-w-[160px] h-12
  - 기본: bg-transparent border-2 border-gold text-gold
  - 호버: bg-gold text-black
  - 선택 후: bg-gold text-black + 체크마크 아이콘

Rate Bar (투표 후 노출, 랭킹 캐시):
  - 배경: --color-bg-elevated
  - A 진행 바: bg-gold
  - B 진행 바: bg-gray-400
  - ⚠️ 퍼센트(%) 표시 가능, 절대 수치(count) 표시 불가

Match 진행 표시:
  - 상단: "48강 - 7/24" 텍스트
  - 프로그레스 바: --color-gold (현재/전체)
─────────────────────────────────────

M3 Crown Card (Champion 확정 화면)
─────────────────────────────────────

카드 크기: 1200×630px (OG 이미지 비율, SNS 공유용)
실제 UI 표시: max-w-[600px] w-full mx-auto

디자인:
  - 배경: --color-bg-deep + Gold 방사형 글로우
  - Champion 이미지: 중앙 상단, 크고 선명하게
  - Champion 이름: font-display italic text-[48px] --color-gold
  - "CHAMPION" 텍스트: font-display text-[24px] --color-text-muted
  - Tournament 제목: text-[18px] --color-text
  - 하단: "worldcrown48.com" 워터마크 + 날짜
  - Gold 테두리 프레임: border-2 border-gold
  - "AI GENERATED" 배지: 우측 하단, bg-black/60 text-[10px]

공유 버튼:
  - X/Twitter, Instagram, KakaoTalk, 링크 복사
  - 각 버튼: 플랫폼 컬러 + 아이콘

─────────────────────────────────────

M6 Newsroom (GNews 25개)
─────────────────────────────────────

레이아웃:
  모바일:    1열 리스트
  태블릿:    2열 그리드
  데스크탑:  피처드 1개 (상단 큰 카드) + 하단 2×4 그리드

뉴스 카드:
  - 배경: --color-bg-soft
  - 테두리: 1px solid --color-border
  - 출처 배지: text-[12px] --color-text-muted
  - 제목: text-[16px] font-semibold --color-text (2줄 말줄임)
  - 발행 시간: text-[12px] --color-text-muted
  - Hover: border-color: --color-gold

─────────────────────────────────────

라운드 전환 애니메이션 (Framer Motion)
─────────────────────────────────────

트리거: Voter의 해당 Round 마지막 Match 완료 후 자동

구성:
  1. 전체 화면 페이드 아웃 (0.3s)
  2. 라운드 전환 카드 팝업:
     - 배경: 전체 화면 어두운 오버레이 (bg-black/90)
     - 중앙 카드: Gold 테두리 + 방사형 Gold 글로우
     - 텍스트: "맨 어브 더 월드컵" + "24강" (font-display)
     - 서브: "축하합니다! 다음 라운드를 시작합니다"
     - 진입 애니메이션: scale(0) → scale(1) spring 효과
  3. "계속하기" 버튼 (Gold) → 다음 Round 시작
  4. 카드 페이드 아웃 → 새 Round 페이드 인

```

### Domain 4 — THE LOCKER ROOM (라이트 테마)

```
배경: --color-bg-light (#FAFBFC)

M1 로그인:
  - 소셜 버튼 높이: h-12
  - Google 버튼: bg-white border text-gray-700 + Google 로고
  - Apple 버튼: bg-black text-white + Apple 로고
  - 버튼 너비: 모바일 w-full / 데스크탑 min-w-[320px]

M2 프로필 (MVP 2):
  - 아바타: 48px 원형
  - 카드: --color-surface-light, shadow-sm

M3 GDPR 삭제:
  - 경고 배너: bg-red-50 border-red-200 text-red-700
  - 확인 버튼: bg-red-600 text-white
```

### Domain 5 — POLICY HUB (라이트 테마)

```
배경: --color-bg-light (#FAFBFC)

M1 쿠키 배너:
  - 위치: 화면 하단 고정 (fixed bottom-0)
  - 배경: --color-surface-light
  - 상단 테두리: 2px solid --color-gold
  - 버튼 "모두 수락": bg-gold text-black
  - 버튼 "필수만": bg-transparent border text-gray-600
  - 버튼 "설정": text-link 스타일

M2 법적 문서:
  - 본문: max-w-[800px] mx-auto
  - 타이포: 가독성 위주, line-height 1.8
```

### Domain 6 — ADMIN DASHBOARD (라이트 테마, 데스크탑 전용)

```
배경: --color-bg-light

M1 5지표 카드:
  - 카드 배경: --color-surface-light
  - 테두리: 1px solid --color-border-light
  - 지표 숫자: text-[32px] font-bold --color-gold
  - 지표명: text-[14px] --color-text-muted-light

M2 Tournament 목록:
  - DataTable: Shadcn/UI Table 컴포넌트
  - 상태 배지:
    draft:  bg-gray-100 text-gray-600
    active: bg-green-100 text-green-700
    closed: bg-red-100 text-red-600
```

---

## 6️⃣ 핵심 컴포넌트 명세

### VSBattle.tsx

```typescript
interface VSBattleProps {
  match: {
    matchId: string;
    contestantA: Contestant;
    contestantB: Contestant;
  };
  roundInfo: {
    roundName: string;  // "48강"
    currentMatch: number;  // 7
    totalMatches: number;  // 24
  };
  onVote: (contestantId: string) => Promise<void>;
  isVoting: boolean;
}

// 컴포넌트 내부 상태
// - selectedId: string | null (선택한 Contestant)
// - showRate: boolean (투표 후 true)
// - rateA / rateB: string (ranking_cache에서)
```

### CrownCard.tsx

```typescript
interface CrownCardProps {
  champion: Contestant;
  tournament: Tournament;
  createdAt: Date;
}

// Canvas API로 1200×630px PNG 생성
// 생성 후 Firebase Storage 업로드
// SNS 공유 URL 반환
```

### RoundTransition.tsx

```typescript
interface RoundTransitionProps {
  fromRound: number;  // 1
  toRound: number;    // 2
  onComplete: () => void;  // 다음 Round 시작
}
// Framer Motion AnimatePresence 활용
```

### TournamentCard.tsx

```typescript
interface TournamentCardProps {
  tournament: Tournament;
  participantCount?: number;  // 선택적 (노출 여부는 showRanking 설정)
}
// ⚠️ Vote Count 절대 노출 금지
```

---

## 7️⃣ 애니메이션 가이드 (Framer Motion)

```typescript
// 기본 페이지 전환
const pageVariants = {
  initial:  { opacity: 0, y: 20 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit:     { opacity: 0, y: -20 },
};

// 카드 호버 (VS Battle)
const cardHoverVariants = {
  rest:     { scale: 1, borderColor: '#30363D' },
  hover:    { scale: 1.03, borderColor: '#FFD700',
              boxShadow: '0 0 32px rgba(255,215,0,0.20)',
              transition: { duration: 0.2 } },
};

// Gold 글로우 펄스 (Champion 확정)
const goldGlowPulse = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(255,215,0,0.20)',
      '0 0 60px rgba(255,215,0,0.45)',
      '0 0 20px rgba(255,215,0,0.20)',
    ],
    transition: { duration: 2, repeat: Infinity },
  },
};

// 라운드 전환 카드 팝업
const transitionCardVariants = {
  initial:  { scale: 0, opacity: 0 },
  animate:  { scale: 1, opacity: 1,
              transition: { type: 'spring', stiffness: 200, damping: 20 } },
  exit:     { scale: 0.8, opacity: 0 },
};

// 투표 버튼 선택 효과
const voteButtonSelected = {
  animate: {
    backgroundColor: '#FFD700',
    color: '#000000',
    scale: [1, 1.08, 1],
    transition: { duration: 0.3 },
  },
};
```

---

## 8️⃣ 배지 + 태그 컴포넌트

```
AI GENERATED 배지:
  - 필수 표시: AI 생성 콘텐츠(뉴스·Crown Card) 모두
  - 스타일: bg-black/60 text-white text-[10px] font-mono uppercase
  - 테두리: 1px solid rgba(255,255,255,0.2)
  - 위치: 콘텐츠 우측 하단

카테고리 배지 (FIFA / KPOP / OTHER):
  - bg-gold text-black text-[11px] font-bold uppercase
  - padding: px-2 py-0.5, border-radius: --radius-chip

Tournament 상태 배지:
  - ACTIVE: bg-green-500/20 text-green-400 border border-green-500/30
  - DRAFT:  bg-gray-500/20 text-gray-400 border border-gray-500/30
  - CLOSED: bg-red-500/20  text-red-400  border border-red-500/30

MVP 배지 (개발 내부용):
  - MVP 1: bg-green-500/20 text-green-400
  - MVP 2: bg-blue-500/20  text-blue-400
```

---

## 9️⃣ Tailwind 설정 추가 (tailwind.config.ts)

```typescript
export default {
  theme: {
    extend: {
      colors: {
        // 다크 테마
        'bg-deep':    '#05070A',
        'bg-default': '#0A0D12',
        'bg-soft':    '#0E1217',
        'bg-elevated':'#131820',
        'gold':       '#FFD700',
        'gold-hover': '#FFC000',
        // 라이트 테마
        'bg-light':   '#FAFBFC',
        'surface-light': '#FFFFFF',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body:    ['Inter', 'Pretendard', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card':   '24px',
        'modal':  '20px',
        'panel':  '16px',
        'btn':    '12px',
        'badge':  '8px',
      },
      boxShadow: {
        'gold':      '0 0 32px rgba(255, 215, 0, 0.20)',
        'gold-hover':'0 8px 32px rgba(255, 215, 0, 0.15)',
        'card':      '0 4px 24px rgba(0, 0, 0, 0.40)',
        'modal':     '0 8px 48px rgba(0, 0, 0, 0.60)',
      },
    },
  },
};
```

---

## 🔟 디자인 체크리스트 (작업 전 필수 확인)

```
반응형:
  [ ] 모바일(375px) 디자인 완성
  [ ] 태블릿(768px) 디자인 완성
  [ ] 데스크탑(1440px) 디자인 완성

컬러:
  [ ] 다크/라이트 테마 올바른 도메인에 적용
  [ ] Gold(#FFD700)만 포인트로 사용 (형광 노랑 금지)
  [ ] Vote Count 수치 UI에 미노출

배지:
  [ ] AI 생성 콘텐츠에 "AI GENERATED" 배지 표시
  [ ] "FIFA", "Official" 문자 미사용

접근성:
  [ ] 다크 텍스트(#F8FAFC) 대비 4.5:1 이상
  [ ] 라이트 텍스트(#1A1A2E) 대비 4.5:1 이상
  [ ] 버튼 최소 터치 영역 44×44px

브랜드:
  [ ] 한국적 요소 없음 (글로벌 MZ 스포티 럭셔리)
  [ ] Crown Card 1200×630px 비율 유지
```

---

*© 2026 WorldCrown48 | 작성: 48티오 | WC48_DESIGN_SYSTEM_v1.md*
*설계서 v4.8 + 다이어그램 ①②③④⑤ 100% 반영 | CONFIDENTIAL*
