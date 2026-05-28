# 🎨 WorldCrown48 (월크48) — UI 디자인 시스템 v2.1
# WC48_DESIGN_SYSTEM_v2.1.md
# Twilight Stadium Edition — Cinematic Update | 2026-05-15 작성 | 작성자: 48티오
# 기반: WC48_DESIGN_SYSTEM_v2.0 100% 계승 + Cinematic Builder 채택 항목 통합

> **이 파일의 목적**: UI 디자이너 / Figma 작업자 / Claude Design / Claude Code 작업 시 참조하는 월크48 공식 디자인 시스템입니다.
> v2.0의 모든 규격을 100% 계승하면서, Cinematic Landing Page Builder에서 선별 채택한 4가지 기술을 추가합니다.

> **⚠️ v2.1 작업 범위 명시**:
> - v2.0의 기존 토큰·명세는 **일절 변경하지 않습니다.** 신규 섹션만 추가합니다.
> - v4.8 설계서의 도메인·모듈·데이터 구조·Cloud Functions·Firestore 스키마는 변경하지 않습니다.
> - 추가 항목: ① AI 패턴 박멸 원칙  ② 노이즈 텍스처  ③ 자석 버튼  ④ Floating Island GNB  ⑤ 스태거 진입 + GSAP 라이프사이클

---

## 📌 v2.0 → v2.1 변경 요약

```
[v2.1 추가 항목 — 5가지, 기존 항목 변경 없음]

★ 핵심 원칙 신설
  "평범한 AI 생성물 같지 않게" — 모든 화면은 디지털 악기처럼 느껴져야 한다

① 노이즈 텍스처 레이어 (§4-A 신설)
   feTurbulence SVG 필터 0.05 opacity — 평평한 디지털 그라디언트 제거

② 자석 버튼 시스템 (§4-B 신설)
   scale(1.03) + cubic-bezier + 슬라이딩 배경 레이어

③ Floating Island GNB (§7 Domain 1 GNB 명세 업그레이드)
   투명 pill 형태 → 스크롤 시 backdrop-blur 모핑

④ 스태거 진입 애니메이션 토큰 (§9 애니메이션 가이드 확장)
   텍스트 stagger 0.08 / 카드 0.15 / VS Battle 진입 전용 시퀀스

⑤ GSAP 라이프사이클 패턴 (§9 확장)
   gsap.context() + ctx.revert() — 메모리 누수 방지 표준

[유지 항목] — v2.0 100% 계승
- 선결 조건 (SVG 자산 8종 등록 필수)
- 컬러 토큰 전체
- 타이포그래피 시스템
- 간격·모서리·그림자 토큰
- 반응형 그리드 시스템
- Crown 로고 사용 가이드
- 도메인별 컬러 적용 명세
- 핵심 컴포넌트 명세
- 배지 + 태그 컴포넌트
- Tailwind 설정
- 디자인 체크리스트 (v2.1 항목 추가)
- 마이그레이션 가이드
```

---

## 🚦 선결 조건 (v2.0과 동일)

```
[브랜드 자산 등록 — v2.1 적용 전 필수]

① Crown 로고 SVG (4종)
   - wc48-crown-filled.svg
   - wc48-crown-outline.svg
   - wc48-crown-circle-filled.svg
   - wc48-crown-circle-outline.svg

② WorldCrown48 워드마크 SVG (2종)
   - wc48-wordmark-dark.svg
   - wc48-wordmark-light.svg

③ Crown + 워드마크 결합 SVG (2종)
   - wc48-branding-horizontal.svg
   - wc48-branding-vertical.svg

저장 위치: /public/brand/
상세 제작 가이드: WC48_SVG_GUIDE.md
```

---

## ⛔ 디자인 절대 원칙 (v2.1 — 1개 신규 추가)

```
0. ★★★ 평범한 AI 생성물 같지 않게 ★★★  ← v2.1 신설 (최우선)
   "모든 화면은 디지털 악기처럼 느껴져야 한다.
   모든 스크롤은 의도적이어야 하고, 모든 애니메이션은 무게감이 있어야 한다.
   평범한 AI 패턴을 박멸한다."
   — 출처: Cinematic Landing Page Builder Execution Directive, 2026

   실행 금지 패턴:
   ❌ 평평한 단색 그라디언트 (노이즈 레이어로 해결)
   ❌ 기본 border-radius 4px / 8px (v2 radius 시스템 준수)
   ❌ 기본 hover: opacity 0.7 (자석 버튼 시스템으로 해결)
   ❌ 일률적 32px 간격 그리드 (시각 위계 토큰 사용)
   ❌ 정적 마케팅 카드 (마이크로 인터랙션 필수)
   ❌ 첫 번째 생각에서 나온 디자인 그대로 사용

1. Crown Gold(#FFD700)가 메인 포인트, 3종 액센트는 보조로만 사용
2. 형광 노랑·그린·핑크 금지 (Aura Yellow #FFE87C는 허용)
3. "AI GENERATED" 배지 의무 표시 (AI 생성 콘텐츠 전체)
4. "FIFA", "Official" 문자 사용 금지 (상표권)
5. Vote Count(절대 수치) UI 노출 금지 — Vote Rate(%)만 표시
6. 듀얼 테마: 다크(Domain 0~3) + 라이트(Domain 4~6)
7. 반응형: 3가지 화면 모두 디자인 — 375px / 768px / 1440px
8. 다크 톤은 절대 순수 블랙(#000000) 사용 금지 — 반드시 네이비-인디고 톤 사용
9. Crown 로고는 등록된 SVG 자산만 사용 — 임의로 그리거나 변형 금지
```

---

## 1️⃣ 신규 듀얼 테마 디자인 토큰 (v2.0과 동일 — 변경 없음)

### 다크 테마 — Domain 0, 1, 2, 3 (Twilight Stadium)

```css
/* ── 배경 팔레트 ── */
--color-bg-deep:      #060C3B;
--color-bg-default:   #141466;
--color-bg-soft:      #1E1E48;
--color-bg-elevated:  #334066;
--color-bg-charcoal:  #1E1E24;

/* ── 브랜드 컬러 ── */
--color-gold:         #FFD700;
--color-gold-bright:  #FBB03B;
--color-gold-hover:   #FFC000;
--color-gold-subtle:  rgba(255, 215, 0, 0.12);
--color-gold-glow:    rgba(255, 215, 0, 0.25);
--color-aura:         #FFE87C;
--color-aura-subtle:  rgba(255, 232, 124, 0.10);

/* ── 액센트 ── */
--color-crimson:      #CF2E45;
--color-crimson-glow: rgba(207, 46, 69, 0.30);
--color-turquoise:    #39CFB8;
--color-turquoise-glow:rgba(57, 207, 184, 0.25);
--color-powder:       #A6BDD6;

/* ── 텍스트 ── */
--color-text:         #F0F5F7;
--color-text-sub:     #A6BDD6;
--color-text-muted:   #6B7A99;
--color-text-disabled:#3B4566;

/* ── 테두리 ── */
--color-border:       #2A3A66;
--color-border-light: #1F2A52;
--color-border-gold:  rgba(255, 215, 0, 0.30);

/* ── 상태 컬러 ── */
--color-error:        #CF2E45;
--color-success:      #39CFB8;
--color-warning:      #FFE87C;
--color-info:         #A6BDD6;
```

### 라이트 테마 — Domain 4, 5, 6 (v2.0과 동일)

```css
--color-bg-light:         #F0F5F7;
--color-surface-light:    #FFFFFF;
--color-surface-elevated: #E8EEF2;
--color-gold:             #FFD700;
--color-gold-hover:       #FFC000;
--color-aura:             #FFE87C;
--color-crimson:          #B5223A;
--color-turquoise:        #1FA68F;
--color-text-light:       #141466;
--color-text-sub-light:   #334066;
--color-text-muted-light: #6B7A99;
--color-border-light:     #D4DCE3;
--color-border-subtle:    #E8EEF2;
```

---

## 2️⃣ 컬러 사용 가이드 (v2.0과 동일)

### 컬러 사용 비율 (다크 테마 기준)

```
배경 (Deep Osidian + Deep Twilight) ......... 70%
텍스트 (Off-White + Powder Blue) ............ 15%
Crown Gold (메인 포인트) ..................... 10%
액센트 (Crimson/Turquoise/Aura) .............. 5%
```

### 컬러별 사용 컨텍스트

```
🟡 Crown Gold (#FFD700)   — 주요 CTA, Crown 로고, Champion 강조, VS 배지, 활성 탭
🟡 Aura Yellow (#FFE87C)  — 부드러운 강조, 호버 글로우, 카운트다운, 새 알림
🔴 Royal Crimson (#CF2E45) — VS 우측 진영, Live 인디케이터, 마감 임박, 에러
🟢 Turquoise (#39CFB8)     — 투표 완료 피드백, 성공, VS 좌측 진영, 새 Tournament
🔵 Powder Blue (#A6BDD6)   — 보조 텍스트, 구분선, 인포 아이콘, 비활성 상태
```

---

## 3️⃣ 타이포그래피 시스템 (v2.0과 동일)

```css
--font-heading: 'Inter', 'Pretendard', sans-serif;   /* 히어로·섹션 타이틀 */
--font-display: 'Playfair Display', serif;            /* Champion·Crown Card 전용 */
--font-body:    'Inter', 'Pretendard', sans-serif;
--font-mono:    'JetBrains Mono', monospace;          /* 카운트다운·숫자·배지 */
```

### 타입 스케일 (v2.0과 동일)

```
text-[48px]/[56px] font-bold font-heading      — Hero 슬로건
text-[36px]/[44px] font-bold font-heading      — 섹션 제목
text-[28px]/[36px] font-semibold font-display  — Champion 이름 (전용)
text-[22px]/[32px] font-semibold               — Contestant 이름
text-[18px]/[28px] font-medium                 — 본문 강조
text-[16px]/[24px] font-normal                 — 기본 본문
text-[14px]/[20px] font-normal                 — 보조 텍스트
text-[12px]/[16px] font-normal                 — 캡션·라벨
text-[10px]/[14px] font-normal                 — AI GENERATED 배지
```

---

## 4️⃣ 간격·모서리·그림자 토큰 (v2.0과 동일)

```css
/* ── 모서리 반경 ── */
--radius-card:    24px;
--radius-modal:   20px;
--radius-panel:   16px;
--radius-btn:     12px;
--radius-badge:   8px;
--radius-chip:    999px;

/* ── 그림자 ── */
--shadow-card:    0 4px 24px rgba(6, 12, 59, 0.50);
--shadow-modal:   0 8px 48px rgba(6, 12, 59, 0.70);
--shadow-gold:    0 0 32px rgba(255, 215, 0, 0.25);
--shadow-aura:    0 0 24px rgba(255, 232, 124, 0.18);
--shadow-crimson: 0 0 24px rgba(207, 46, 69, 0.25);
--shadow-turquoise:0 0 24px rgba(57, 207, 184, 0.20);
--shadow-hover:   0 8px 32px rgba(255, 215, 0, 0.18);

/* ── 간격 ── */
--spacing-xs: 4px;  --spacing-sm: 8px;   --spacing-md: 16px;
--spacing-lg: 24px; --spacing-xl: 40px;  --spacing-2xl: 64px;
--spacing-3xl: 96px;
```

---

## 4️⃣-A 노이즈 텍스처 레이어 ★ v2.1 신설

> **출처**: Cinematic Landing Page Builder §Fixed Design System — Visual Texture
> **채택 이유**: 평평한 디지털 그라디언트를 제거하고 "물성(物性)"을 부여합니다.
> Deep Osidian 배경이 훨씬 풍부해지고, "AI가 그린 화면" 인상에서 벗어납니다.

### 구현 방법 (index.css 또는 globals.css)

```css
/* ── 전역 노이즈 오버레이 ── */
/* index.css / globals.css 최상단에 추가 */

/* 1. 노이즈 SVG 필터 정의 */
.noise-overlay {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-size: 128px 128px;
}
```

### React 컴포넌트로 적용 (layout.tsx 또는 _app.tsx)

```tsx
/* NoiseOverlay.tsx — 전역 레이아웃에 한 번만 삽입 */
export function NoiseOverlay() {
  return (
    <div
      aria-hidden="true"
      className="noise-overlay"
    />
  );
}

/* layout.tsx */
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <NoiseOverlay />   {/* ← 여기 한 번만 */}
        {children}
      </body>
    </html>
  );
}
```

### 사용 규칙

```
✅ opacity 0.05 고정 — 더 강하게 올리지 않는다 (텍스트 가독성 영향)
✅ pointer-events: none — 클릭 이벤트 차단 없어야 함
✅ z-index 9999 — 항상 최상단에 유지 (모달 제외)
✅ 다크·라이트 테마 모두 동일하게 적용
❌ 모달·바텀시트 내부에는 별도 추가 금지 (전역 레이어 하나로 충분)
❌ opacity 0.1 이상 올리지 않음 (텍스트 가독성 저하)
```

### 효과 시각 설명

```
Before (v2.0): 배경이 단색 그라디언트처럼 평평하고 디지털적
After  (v2.1): 미세한 필름 그레인이 올라오며 "정성스럽게 만든" 물성감 부여
               황혼 경기장의 공기 느낌과 정확히 일치
```

---

## 4️⃣-B 자석 버튼 시스템 ★ v2.1 신설

> **출처**: Cinematic Landing Page Builder §Fixed Design System — Micro-Interactions
> **채택 이유**: "스포츠는 재밌어야 한다"는 원칙과 정확히 맞습니다.
> VS Battle 투표 버튼, Crown Card 공유 버튼에 적용하면 응원·축제 느낌이 살아납니다.

### CSS 유틸리티 클래스 (index.css에 추가)

```css
/* ── 자석 버튼 기반 클래스 ── */
.btn-magnetic {
  position: relative;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              box-shadow 0.3s ease;
  transform: translateZ(0); /* GPU 가속 */
}

.btn-magnetic:hover {
  transform: scale(1.03) translateZ(0);
}

.btn-magnetic:active {
  transform: scale(0.97) translateZ(0);
  transition-duration: 0.1s;
}

/* 슬라이딩 배경 레이어 */
.btn-magnetic .btn-slide-bg {
  position: absolute;
  inset: 0;
  transform: translateX(-105%);
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  pointer-events: none;
}

.btn-magnetic:hover .btn-slide-bg {
  transform: translateX(0);
}

/* 링크·인터랙티브 요소 lift 효과 */
.link-lift {
  transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  display: inline-block;
}

.link-lift:hover {
  transform: translateY(-1px);
}
```

### React 구현 패턴

```tsx
/* MagneticButton.tsx */
interface MagneticButtonProps {
  children: React.ReactNode;
  slideColor?: string;  /* 슬라이딩 레이어 색상 — 기본: Gold */
  className?: string;
  onClick?: () => void;
  variant?: 'gold' | 'outline' | 'crimson' | 'turquoise';
}

export function MagneticButton({
  children,
  variant = 'gold',
  className,
  onClick,
}: MagneticButtonProps) {
  const baseStyles = {
    gold:      'bg-gold text-twilight',
    outline:   'bg-transparent border-2 border-gold text-gold',
    crimson:   'bg-crimson text-off-white',
    turquoise: 'bg-turquoise text-twilight',
  };

  const slideColors = {
    gold:      'bg-gold-hover',
    outline:   'bg-gold',
    crimson:   'bg-crimson/80',
    turquoise: 'bg-turquoise/80',
  };

  return (
    <button
      onClick={onClick}
      className={`btn-magnetic rounded-btn px-6 h-12 font-medium
                  ${baseStyles[variant]} ${className}`}
    >
      {/* 슬라이딩 배경 레이어 */}
      <span className={`btn-slide-bg ${slideColors[variant]}`} aria-hidden="true" />
      {/* 버튼 텍스트 (z-index 상위) */}
      <span className="relative z-10">{children}</span>
    </button>
  );
}
```

### 적용 위치

```
반드시 적용:
  - VS Battle 투표 버튼 (Vote 버튼)          → variant="outline"
  - Domain 0 Waitlist CTA 버튼              → variant="gold"
  - Crown Card "Share My Crown" 버튼         → variant="gold"
  - Domain 1 "START VOTING" 히어로 CTA        → variant="gold"
  - 쿠키 배너 "모두 수락" 버튼               → variant="gold"

선택 적용:
  - GNB CTA 버튼                            → variant="gold" (크기 small)
  - Admin Dashboard CTA                     → variant="gold"

적용 안 함:
  - 일반 텍스트 링크 (link-lift만 적용)
  - 배지·태그 (인터랙션 없음)
  - 비활성(disabled) 버튼
```

### prefers-reduced-motion 대응

```css
/* 반드시 추가 — 접근성 필수 */
@media (prefers-reduced-motion: reduce) {
  .btn-magnetic,
  .btn-magnetic:hover,
  .btn-magnetic .btn-slide-bg {
    transition: none;
    transform: none;
  }
  .link-lift:hover {
    transform: none;
  }
}
```

---

## 5️⃣ 반응형 그리드 시스템 (v2.0과 동일)

### 브레이크포인트

```
모바일: 375px ~ 767px / 태블릿: 768px ~ 1023px / 데스크탑: 1440px+
Tailwind: sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1440
```

### 컨테이너 최대 너비

```
모바일:   max-w-[375px] px-4
태블릿:   max-w-[768px] px-6
데스크탑: max-w-[1440px] px-12 (콘텐츠 max-w-[1200px] mx-auto)
```

### Tournament 카드 그리드

```
모바일: grid-cols-1 gap-4 / 태블릿: grid-cols-2 gap-6 / 데스크탑: grid-cols-3 gap-8
```

### Contestant 48 Nodes 그리드

```
데스크탑 전용: grid-cols-8 gap-3 (8열 × 6행 = 48개) 또는 grid-cols-6 gap-4
각 노드: 80×80px + 아래 이름 텍스트
```

---

## 6️⃣ Crown 로고 사용 가이드 (v2.0과 동일)

> SVG 자산 모양·획·곡률은 등록된 파일이 단일 진실 공급원. 이 문서는 사용 규칙만 정의.

```
① wc48-crown-filled.svg         → Domain 0 메인·Crown Card (48px↑)
② wc48-crown-outline.svg        → 보조 위치 (24~32px)
③ wc48-crown-circle-filled.svg  → 앱 아이콘·Favicon·GNB 로고
④ wc48-crown-circle-outline.svg → 라이트 테마 보조 위치

안전 영역: 로고 높이의 30% 사방 여백
```

---

## 7️⃣ 도메인별 컬러 적용 명세

---

### Domain 0 — LAUNCH PAD (다크 테마, v2.0과 동일)

```
배경: --color-bg-deep (#060C3B)
배경 효과: Gold 방사형 그라디언트 + Crimson 하단 글로우
Crown 로고: wc48-crown-filled.svg / Gold 글로우 + 부유 애니메이션 (4초 주기 ±6px)
Hero 슬로건: "WHO RULES THE WORLD?" / font-heading bold / --color-text
Countdown: font-mono / text-[48px] / --color-gold / 셀 배경 rgba(20,20,102,0.6)
Waitlist 버튼: MagneticButton variant="gold" (★ v2.1 적용)
SNS Links: --color-text-sub, hover: --color-gold + link-lift (★ v2.1 적용)
```

---

### Domain 1 — THE PITCH (다크 테마)

```
배경: --color-bg-deep (#060C3B)
배경 효과: 상단 Aura Yellow subtle 그라디언트

Hero CTA: MagneticButton variant="gold" h-14 px-10 (★ v2.1 적용)

Tournament 카드:
  - 카드 배경: --color-bg-soft (#1E1E48)
  - 테두리: 1px solid --color-border (#2A3A66)
  - Hover: border-color:gold / --shadow-hover / scale(1.02)
  - 카테고리 배지: FIFA→turquoise / KPOP→crimson / OTHER→aura
```

#### ★ v2.1 업그레이드: Floating Island GNB

> **출처**: Cinematic Landing Page Builder §Component A — "The Floating Island"
> **채택 이유**: pill 형태 + 스크롤 모핑은 모던·엔터테인먼트 UI 감각. 팬덤 사용자에게 익숙한 느낌.

```css
/* ── Floating Island GNB — globals.css ── */

/* 기반 스타일 */
.gnb-island {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;

  /* Pill 형태 */
  border-radius: 999px;
  padding: 0 24px;
  height: 52px;

  /* 초기 상태: 투명 */
  background: transparent;
  border: 1px solid transparent;
  backdrop-filter: blur(0px);

  transition:
    background 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    border-color 0.4s ease,
    backdrop-filter 0.4s ease,
    box-shadow 0.4s ease;
}

/* 스크롤 후 상태: blur 배경 */
.gnb-island.scrolled {
  background: rgba(6, 12, 59, 0.75);           /* Deep Osidian 75% */
  border-color: rgba(255, 215, 0, 0.15);       /* Gold 미세 테두리 */
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  box-shadow: 0 8px 32px rgba(6, 12, 59, 0.40);
}

/* 모바일: full-width로 전환 */
@media (max-width: 767px) {
  .gnb-island {
    top: 0;
    left: 0;
    right: 0;
    transform: none;
    border-radius: 0 0 20px 20px;
    padding: 0 16px;
    height: 56px;
  }
}
```

```tsx
/* GNBIsland.tsx */
'use client';
import { useState, useEffect, useRef } from 'react';

export function GNBIsland() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    /* IntersectionObserver로 Hero 섹션 감지 */
    const hero = document.getElementById('hero');
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <nav className={`gnb-island ${scrolled ? 'scrolled' : ''}`}>
      <div className="flex items-center justify-between gap-8 h-full">
        {/* 로고 — 등록된 SVG 자산 사용 */}
        <a href="/" aria-label="WorldCrown48 홈">
          <img
            src="/brand/wc48-crown-circle-filled.svg"
            width={32} height={32} alt=""
          />
        </a>

        {/* 메인 메뉴 (데스크탑) */}
        <div className="hidden md:flex items-center gap-6">
          {['Tournaments', 'How it works', 'News'].map(item => (
            <a
              key={item}
              href="#"
              className={`link-lift text-[14px] font-medium transition-colors
                         ${scrolled ? 'text-text-sub hover:text-gold'
                                    : 'text-off-white/80 hover:text-off-white'}`}
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTA 버튼 */}
        <MagneticButton variant="gold" className="text-[13px] px-4 h-9">
          Join Waitlist
        </MagneticButton>
      </div>
    </nav>
  );
}
```

```
GNB 상태 명세:
  초기 (Hero 위): 투명 배경 / Off-White 텍스트·아이콘 / 테두리 없음
  스크롤 후:      Deep Osidian 75% + backdrop-blur-xl / Gold 미세 테두리
                 텍스트 → Powder Blue, hover: Gold

모바일 GNB:
  - 기존 로고만 상단 + 하단 탭 바 방식 유지 (v2.0)
  - Island가 아닌 full-width rounded-b-[20px]

크기:
  데스크탑: height 52px, pill 형태
  모바일:   height 56px, full-width rounded bottom
```

---

### Domain 2 — THE LAB (v2.0과 동일)

```
배경: --color-bg-deep (#060C3B)
Wizard 스텝퍼: 완료 bg-gold / 현재 border-gold bg-gold-subtle / 미완료 border-twilight
48 Nodes 그리드: 빈 노드 dashed border / 채워진 노드 Contestant 이미지
AI Fill 버튼: border-2 border-gold text-gold hover:bg-gold
```

---

### Domain 3 — THE ARENA (다크 테마) ★ 핵심

```
배경: --color-bg-deep (#060C3B)
배경 효과: 좌측 Turquoise 글로우 / 우측 Crimson 글로우

Contestant 이미지 카드:
  크기: 모바일 160×200px / 태블릿 200×260px / 데스크탑 240×320px
  모서리: rounded-[24px]
  이름 오버레이: rgba(6,12,59,0.6) + backdrop-blur-md

VS 배지: bg-gold / "VS" text-twilight font-black / 원형 56×56px
투표 버튼: MagneticButton variant="outline" (★ v2.1 적용)
  선택 후: bg-gold text-twilight + Turquoise 펄스 0.6초

Rate Bar: bg-turquoise (좌) / bg-crimson (우) / Vote Rate(%)만 표시
Match 진행: "48강 · 7/24" powder / 프로그레스 bg-gold 4px

Crown Card:
  배경: bg-deep + Gold 방사형 글로우
  Crown 로고: Filled 64px + Gold 펄스
  Champion 이름: font-display italic / text-[48px] / gold
  "CHAMPION": font-heading / Powder Blue / uppercase tracking-widest
  공유 버튼: MagneticButton variant="gold" (★ v2.1 적용)

Round Transition:
  오버레이: rgba(6,12,59,0.92)
  카드: Deep Twilight 배경 + 2px Gold 테두리 + Aura 외곽선
  텍스트: "24강" font-heading text-[64px] bold gold
  트리거: advanceRound() 시스템 자동 (Host가 전환하지 않음)

Newsroom 뉴스 카드:
  배경: bg-soft / 테두리: border / hover: border-gold scale(1.01)
```

---

### Domain 4 — THE LOCKER ROOM (라이트 테마, v2.0과 동일)

```
배경: --color-bg-light (#F0F5F7)
로그인 카드: surface-light / rounded-[16px] / shadow-sm
아바타: 1px Gold 테두리
GDPR: bg-crimson/10 border-crimson — MagneticButton variant="crimson" (★ v2.1 적용)
```

---

### Domain 5 — POLICY HUB (라이트 테마, v2.0과 동일)

```
쿠키 배너: fixed bottom-0 / 상단 테두리 2px Gold
"모두 수락": MagneticButton variant="gold" (★ v2.1 적용)
법적 문서: max-w-[800px] / line-height 1.8 / Deep Twilight 텍스트
```

---

### Domain 6 — ADMIN DASHBOARD (라이트 테마, v2.0과 동일)

```
배경: --color-bg-light (#F0F5F7)
5지표 카드: surface-light / rounded-[16px] / 수치 text-[32px] gold-bright
트렌드: 상승→turquoise / 하락→crimson / 보합→twilight-indigo
Tournament 상태 배지: draft/published/active/closed/completed
```

---

## 8️⃣ 핵심 컴포넌트 명세 (v2.0 계승 + v2.1 자석버튼 반영)

```
VSBattle.tsx:
  좌측 글로우: Turquoise / 우측 글로우: Crimson
  VS 배지: Gold 배경 + Twilight 텍스트
  투표 버튼: MagneticButton variant="outline" ← v2.1

CrownCard.tsx:
  배경: Deep Osidian + Gold 글로우
  Champion 이름: font-display italic Gold
  공유 버튼: MagneticButton variant="gold" ← v2.1

RoundTransition.tsx:
  오버레이: rgba(6,12,59,0.92)
  카드: Deep Twilight + Gold 테두리 + Aura 외곽선
  트리거: advanceRound() 자동 ← LANGUAGE.md v1.2

TournamentCard.tsx:
  배경: Twilight Soft / hover: Gold 테두리 + 글로우
  카테고리 배지: FIFA→Turquoise / KPOP→Crimson / OTHER→Aura
```

---

## 9️⃣ 애니메이션 가이드 (v2.0 계승 + GSAP 라이프사이클·스태거 신설)

### 기존 토큰 (v2.0과 동일)

```typescript
const pageVariants = {
  initial:  { opacity: 0, y: 20 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit:     { opacity: 0, y: -20 },
};

const cardHoverVariants = {
  rest:  { scale: 1, borderColor: '#2A3A66' },
  hover: { scale: 1.03, borderColor: '#FFD700',
           boxShadow: '0 0 32px rgba(255,215,0,0.25)',
           transition: { duration: 0.2 } },
};

const crownFloatVariants = {
  animate: { y: [0, -6, 0],
             transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } },
};

const goldGlowPulse = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(255,215,0,0.25)',
      '0 0 60px rgba(255,215,0,0.55)',
      '0 0 20px rgba(255,215,0,0.25)',
    ],
    transition: { duration: 2, repeat: Infinity },
  },
};

const voteButtonSelected = {
  animate: {
    backgroundColor: '#FFD700', color: '#141466',
    scale: [1, 1.08, 1],
    boxShadow: ['0 0 0 0 rgba(57,207,184,0.6)', '0 0 0 16px rgba(57,207,184,0)'],
    transition: { duration: 0.6 },
  },
};

const sideGlowLeft  = { hover: { boxShadow: '0 0 32px rgba(57,207,184,0.30)' } };
const sideGlowRight = { hover: { boxShadow: '0 0 32px rgba(207,46,69,0.30)' } };
```

---

### ★ v2.1 신설: GSAP 라이프사이클 패턴

> **출처**: Cinematic Landing Page Builder §Fixed Design System — Animation Lifecycle
> **채택 이유**: Next.js 라우팅 환경에서 컴포넌트 언마운트 시 애니메이션이 남아 있으면 메모리 누수가 발생합니다. `gsap.context()`로 모든 인스턴스를 묶고 `ctx.revert()`로 클린업하는 게 표준 패턴.

```typescript
/* ── GSAP 라이프사이클 표준 패턴 ── */
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

function MyAnimatedSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    /* 반드시 gsap.context()로 감싼다 */
    const ctx = gsap.context(() => {

      /* 이 안에서만 GSAP 애니메이션 작성 */
      gsap.from('.fade-target', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.08,                     /* 텍스트 스태거 */
      });

    }, sectionRef);                        /* sectionRef 범위 내에서만 동작 */

    /* 컴포넌트 언마운트 시 자동 클린업 */
    return () => ctx.revert();

  }, []);

  return <section ref={sectionRef}>...</section>;
}
```

```
GSAP 이징 표준:
  진입 애니메이션:     ease: 'power3.out'
  트랜지션·모핑:       ease: 'power2.inOut'
  스프링 바운스 (버튼): cubic-bezier(0.34, 1.56, 0.64, 1)

GSAP 스태거 표준:
  텍스트 (글자·단어·줄): stagger: 0.08
  카드·컨테이너:         stagger: 0.15
  아이콘·배지:           stagger: 0.05
```

---

### ★ v2.1 신설: 스태거 fade-up 진입 토큰

> **출처**: Cinematic Landing Page Builder §Component B — Hero Animation
> **채택 이유**: Domain 0 히어로, VS Battle 카드 등장, Crown Card 등 핵심 화면에서 요소가 순차적으로 나타나면 엔터테인먼트 활기가 살아납니다.

```typescript
/* ── 스태거 fade-up 사용 예시 ── */

/* 1. Domain 0 히어로 진입 — 텍스트 순차 등장 */
gsap.from(['.hero-crown', '.hero-title', '.hero-subtitle', '.hero-cta'], {
  y: 40,
  opacity: 0,
  duration: 0.8,
  ease: 'power3.out',
  stagger: 0.12,       /* 크라운 → 타이틀 → 서브타이틀 → CTA 순서 */
});

/* 2. VS Battle 카드 진입 — 좌/VS/우 시퀀스 */
gsap.from(['.contestant-left', '.vs-badge', '.contestant-right'], {
  y: 30,
  opacity: 0,
  duration: 0.6,
  ease: 'power3.out',
  stagger: 0.15,       /* 좌측 → VS 배지 → 우측 "격투 시작" 순서 */
  delay: 0.1,
});

/* 3. Tournament 카드 그리드 — 순차 등장 */
gsap.from('.tournament-card', {
  y: 24,
  opacity: 0,
  duration: 0.5,
  ease: 'power2.out',
  stagger: 0.08,       /* 0.08초 간격으로 카드가 왼쪽에서 오른쪽으로 */
  scrollTrigger: {
    trigger: '.tournament-grid',
    start: 'top 80%',
    once: true,         /* 한 번만 실행 */
  },
});

/* 4. Crown Card 확정 — 순차 팡파레 */
gsap.from(['.crown-logo', '.champion-image', '.champion-name', '.share-btn'], {
  scale: 0.8,
  opacity: 0,
  duration: 0.7,
  ease: 'back.out(1.7)',
  stagger: 0.18,       /* 왕관 → 이미지 → 이름 → 공유 버튼 순서 */
});
```

---

### ★ v2.1 신설: "System Operational" Footer 인디케이터

> **출처**: Cinematic Landing Page Builder §Component G — Footer
> **채택 이유**: "이 서비스는 살아있고 정밀하게 움직인다"는 인상. 월크48에서는 활성 Tournament 수를 실시간으로 보여주면 활기와 정보 전달을 동시에 합니다.

```tsx
/* FooterStatus.tsx */
export function FooterStatus({ activeTournaments = 0 }: { activeTournaments: number }) {
  return (
    <div className="flex items-center gap-2">
      {/* 펄스 닷 */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full
                         rounded-full bg-turquoise opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-turquoise" />
      </span>
      {/* 상태 텍스트 */}
      <span className="font-mono text-[11px] text-text-muted tracking-wider uppercase">
        {activeTournaments > 0
          ? `Live Tournaments: ${activeTournaments}`
          : 'All Systems Operational'}
      </span>
    </div>
  );
}
```

```
표시 로직:
  - activeTournaments > 0 → "Live Tournaments: N" (Turquoise 펄스)
  - activeTournaments = 0 → "All Systems Operational" (Turquoise 펄스)
  - 시스템 점검 중       → "Scheduled Maintenance" (Aura Yellow 펄스)
  - 장애 발생            → "Service Disruption" (Crimson 펄스)

위치: Footer 좌측 하단, 브랜드명·태그라인 아래
폰트: font-mono text-[11px] — JetBrains Mono
```

---

## 1️⃣0️⃣ 배지 + 태그 컴포넌트 (v2.0과 동일)

```
AI GENERATED: bg-twilight/60 text-off-white text-[10px] font-mono uppercase
카테고리:      FIFA→turquoise / KPOP→crimson / OTHER→aura
상태 배지:     draft/published/active/closed/completed
Live:          빨간 점(Crimson) + 펄스 / "LIVE" text-[10px] font-bold text-crimson
```

---

## 1️⃣1️⃣ Tailwind 설정 (v2.0 계승 + v2.1 추가)

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        /* ── 다크 테마 (v2.0 그대로) ── */
        'bg-deep':       '#060C3B',
        'bg-default':    '#141466',
        'bg-soft':       '#1E1E48',
        'bg-elevated':   '#334066',
        'bg-charcoal':   '#1E1E24',
        'twilight':      '#141466',
        'osidian':       '#060C3B',
        'indigo-mid':    '#334066',
        'gold':          '#FFD700',
        'gold-bright':   '#FBB03B',
        'gold-hover':    '#FFC000',
        'aura':          '#FFE87C',
        'crimson':       '#CF2E45',
        'turquoise':     '#39CFB8',
        'powder':        '#A6BDD6',
        'off-white':     '#F0F5F7',
        'text-sub':      '#A6BDD6',
        'text-muted':    '#6B7A99',
        /* ── 라이트 테마 (v2.0 그대로) ── */
        'bg-light':      '#F0F5F7',
        'surface-light': '#FFFFFF',
        'surface-elev':  '#E8EEF2',
      },
      fontFamily: {
        heading: ['Inter', 'Pretendard', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
        body:    ['Inter', 'Pretendard', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card':      '24px',
        'card-hero': '32px',   /* ← v2.1 추가: VS Battle·히어로 카드용 */
        'modal':     '20px',
        'panel':     '16px',
        'btn':       '12px',
        'badge':     '8px',
      },
      boxShadow: {
        /* v2.0 그대로 */
        'gold':         '0 0 32px rgba(255, 215, 0, 0.25)',
        'gold-hover':   '0 8px 32px rgba(255, 215, 0, 0.18)',
        'aura':         '0 0 24px rgba(255, 232, 124, 0.18)',
        'crimson':      '0 0 24px rgba(207, 46, 69, 0.25)',
        'turquoise':    '0 0 24px rgba(57, 207, 184, 0.20)',
        'card':         '0 4px 24px rgba(6, 12, 59, 0.50)',
        'modal':        '0 8px 48px rgba(6, 12, 59, 0.70)',
        /* v2.1 추가 */
        'gnb':          '0 8px 32px rgba(6, 12, 59, 0.40)',  /* Floating Island */
      },
      keyframes: {
        /* v2.0 그대로 */
        'crown-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        'gold-pulse': {
          '0%, 100%': { filter: 'drop-shadow(0 0 24px rgba(255,215,0,0.45))' },
          '50%':      { filter: 'drop-shadow(0 0 48px rgba(255,215,0,0.75))' },
        },
        /* v2.1 추가 */
        'gnb-morph': {            /* GNB 스크롤 트랜지션 보조 */
          '0%':   { backdropFilter: 'blur(0px)' },
          '100%': { backdropFilter: 'blur(20px)' },
        },
        'status-ping': {          /* System Operational 펄스 */
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        'slide-in-left': {        /* 자석 버튼 슬라이드 */
          'from': { transform: 'translateX(-105%)' },
          'to':   { transform: 'translateX(0)' },
        },
      },
      animation: {
        /* v2.0 그대로 */
        'crown-float': 'crown-float 4s ease-in-out infinite',
        'gold-pulse':  'gold-pulse 3s ease-in-out infinite',
        /* v2.1 추가 */
        'status-ping': 'status-ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
      },
      transitionTimingFunction: {
        /* v2.1 추가: 자석 버튼 + 스프링 이징 박제 */
        'magnetic': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'spring':   'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
```

---

## 1️⃣2️⃣ 디자인 체크리스트 (v2.0 계승 + v2.1 항목 추가)

```
[ 선결 조건 ]
  [ ] Crown 로고 4종 SVG 자산이 /public/brand/에 등록됨
  [ ] WorldCrown48 워드마크 SVG 자산이 등록됨
  [ ] 등록된 SVG 자산만 사용

[ ★ v2.1 AI 패턴 박멸 체크 — 신설 ]
  [ ] 노이즈 오버레이(NoiseOverlay.tsx)가 전역 레이아웃에 삽입됨
  [ ] 주요 CTA·투표 버튼에 MagneticButton 컴포넌트가 적용됨
  [ ] GNB가 Floating Island 형태로 구현됨 (pill + 스크롤 morph)
  [ ] 히어로·VS Battle·Crown Card에 GSAP 스태거 fade-up 진입이 적용됨
  [ ] GSAP 애니메이션이 모두 gsap.context() + ctx.revert()로 감싸져 있음
  [ ] Footer에 FooterStatus 인디케이터가 있음
  [ ] "평범한 hover: opacity" 패턴이 코드에 없음
  [ ] 평평한 단색 그라디언트 배경이 없음 (노이즈로 해결)

[ 컬러 시스템 (v2.0 그대로) ]
  [ ] 다크 테마에 순수 블랙(#000000) 없음
  [ ] Crown Gold가 메인 포인트로만 사용 (남발 금지)
  [ ] Royal Crimson은 VS·Live·에러에만 사용
  [ ] Turquoise는 성공·완료·긍정 피드백에만 사용
  [ ] Aura Yellow는 부드러운 강조용

[ Crown 로고 (v2.0 그대로) ]
  [ ] Domain 0 Launch Pad 메인 시각으로 Crown 로고 배치
  [ ] 등록된 SVG만 사용 (임의로 그린 로고 금지)
  [ ] 안전 영역(높이 30%) 확보

[ 반응형 ]
  [ ] 모바일(375px) 완성 — GNB Island가 full-width 모드
  [ ] 태블릿(768px) 완성
  [ ] 데스크탑(1440px) 완성

[ 콘텐츠 규칙 ]
  [ ] Vote Count 절대 수치 없음 — Vote Rate(%)만
  [ ] "FIFA", "Official" 없음
  [ ] AI 생성 콘텐츠에 "AI GENERATED" 배지
  [ ] Round Deadline 개념 없음 — Tournament Deadline만
  [ ] Host가 라운드 전환하는 UI 없음 — advanceRound() 자동
  [ ] 용어: Contestant / Match / Voter / Champion / Crown Card

[ 접근성 ]
  [ ] 텍스트 대비비 4.5:1 이상
  [ ] 버튼 터치 영역 44×44px
  [ ] prefers-reduced-motion 존중 (버튼·GSAP 모두)
```

---

## 1️⃣3️⃣ v1 → v2 마이그레이션 가이드 (v2.0과 동일)

```diff
- background: #05070A;   + background: #060C3B;   (Deep Osidian)
- background: #0A0D12;   + background: #141466;   (Deep Twilight)
- background: #0E1217;   + background: #1E1E48;   (Twilight Soft)
- background: #131820;   + background: #334066;   (Twilight Indigo)
- color: #F8FAFC;        + color: #F0F5F7;         (Off-White)
- color: #CBD5E1;        + color: #A6BDD6;         (Powder Blue)
- border-color: #30363D; + border-color: #2A3A66;  (Border Twilight)
```

```
v1 시나리오                   → v2 권장
모든 강조에 Gold             → 메인 CTA만 Gold 유지
"새 알림" 점 (Gold)           → Aura Yellow / Turquoise
"마감 임박" (Gold)            → Crimson
"투표 완료" (Gold)            → Turquoise 펄스
"호버" (Gold만)               → 좌측 Turquoise / 우측 Crimson
```

```diff
/* v2.1 마이그레이션 추가 */
- <button className="hover:opacity-70">       /* 기본 opacity hover */
+ <MagneticButton variant="gold">             /* 자석 버튼으로 교체 */

- <nav className="fixed top-0 w-full">        /* 일반 고정 바 */
+ <nav className="gnb-island scrolled:...">   /* Floating Island */

- <div style={{ animation: 'fade 0.3s' }}>   /* 단순 CSS 애니메이션 */
+ {/* GSAP context + stagger fade-up */}      /* GSAP 스태거 */
```

---

## 변경 이력

| 버전 | 날짜 | 주요 변경 |
|---|---|---|
| v1.0 | 2026-05 | 최초 작성 |
| v2.0 | 2026-05-14 | ★ 컬러·톤 전면 개편 — Twilight Stadium Edition |
| | | 순수 블랙 → 네이비-인디고 / Gold → 4종 컬러 시스템 |
| | | Crown 로고 사용 가이드 신설 / 타이포 톤 조정 |
| **v2.1** | **2026-05-15** | **★ Cinematic Update — "평범한 AI 패턴 박멸"** |
| | | 원칙 0 신설: "모든 화면은 디지털 악기처럼" |
| | | §4-A 노이즈 텍스처 레이어 (feTurbulence 0.05) |
| | | §4-B 자석 버튼 시스템 (MagneticButton 컴포넌트) |
| | | §7 GNB → Floating Island (pill + 스크롤 morph) |
| | | §9 GSAP 라이프사이클 패턴 + 스태거 fade-up 토큰 |
| | | §9 Footer System Operational 인디케이터 |
| | | Tailwind: radius 'card-hero' / shadow 'gnb' / timing 추가 |
| | | 디자인 체크리스트: AI 패턴 박멸 항목 신설 |
| | | v2.0 기존 토큰·명세 변경 없음 |
| | | v4.8 설계서 영향 없음 |

---

*© 2026 WorldCrown48 | 작성: 48티오 | WC48_DESIGN_SYSTEM_v2.1.md*
*Twilight Stadium Cinematic Edition | v2.0 100% 계승 + Cinematic Builder 채택 통합 | CONFIDENTIAL*
