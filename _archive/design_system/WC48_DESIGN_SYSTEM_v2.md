# 🎨 WorldCrown48 (월크48) — UI 디자인 시스템 v2.0
# WC48_DESIGN_SYSTEM_v2.md
# Twilight Stadium Edition | 2026-05-14 작성 | 작성자: 48티오
# 기반: WC48_DESIGN_SYSTEM_v1.md 100% 계승 + 컬러·톤 전환

> **이 파일의 목적**: UI 디자이너 / Figma 작업자 / Claude Artifacts / Claude Design 작업 시 참조하는 월크48 공식 디자인 시스템입니다. v1의 모든 규격을 계승하면서, "황혼 경기장 톤"으로 컬러 시스템을 전면 개편하고 엔터테인먼트 액센트를 추가했습니다.

> **⚠️ 작업 범위 명시**:
> - v2는 **컬러·톤·시각 분위기 전환**에만 집중합니다.
> - v4.8 설계서의 도메인·모듈·데이터 구조·Cloud Functions·Firestore 스키마는 **일절 변경하지 않습니다**.
> - v2는 "어떻게 칠할 것인가"만 다루고, "무엇을 만들 것인가"는 v4.8 설계서가 단일 진실 공급원입니다.

---

## 🚦 선결 조건 (Prerequisites)

이 디자인 시스템이 실제 화면 제작으로 이어지려면, 아래 브랜드 자산이 먼저 등록되어 있어야 합니다.

```
[브랜드 자산 등록 — v2 적용 전 필수]

① Crown 로고 SVG (4종)
   - wc48-crown-filled.svg          (Filled — 메인)
   - wc48-crown-outline.svg         (Outline)
   - wc48-crown-circle-filled.svg   (Circle Filled — 앱 아이콘용)
   - wc48-crown-circle-outline.svg  (Circle Outline)

② WorldCrown48 워드마크 SVG (2종)
   - wc48-wordmark-dark.svg         (다크 배경용)
   - wc48-wordmark-light.svg        (라이트 배경용)

③ Crown + 워드마크 결합 브랜딩 SVG (2종)
   - wc48-branding-horizontal.svg
   - wc48-branding-vertical.svg

저장 위치 (제안): /public/brand/ 또는 Figma Library
```

> **본 v2 문서는 위 SVG 자산이 "곧 등록될 자산"임을 전제로 사용 컨텍스트·크기·여백·금지사항만 규정합니다. 자산의 실제 모양·획·곡률은 등록된 SVG 파일이 단일 진실 공급원입니다.**

### 권장 작업 순서

```
① 브랜드 SVG 자산 등록  →  ② 디자인 시스템 v2 적용  →
③ Figma/Stitch에서 실시안 검증  →  ④ 코드로 화면 구현
```

---

## 📌 v1 → v2 변경 요약

```
[배경 톤 전환] ★ v2의 핵심
v1: 순수 블랙 톤 (#05070A ~ #131820) — "럭셔리하지만 차갑고 정적"
v2: 네이비-인디고 톤 (#060C3B ~ #334066) — "황혼의 경기장, 어둠 속의 설렘"

[포인트 컬러 확장]
v1: Crown Gold 단일 (#FFD700)
v2: Crown Gold(#FFD700) + Aura Yellow(#FFE87C) + Royal Crimson(#CF2E45) + Turquoise(#39CFB8)
    → Gold는 메인 유지, 3종 액센트로 엔터테인먼트 활력 보강

[텍스트 컬러 조정]
v1: 순수 흰색 계열 (#F8FAFC)
v2: Off-White (#F0F5F7) + Powder Blue (#A6BDD6) 보조 텍스트

[Crown 로고 사용 가이드 신설]
v1: 로고 크기·위치만 정의 (별도 시스템 없음)
v2: 4가지 변형(Filled / Outline / Circle Filled / Circle Outline) 사용 컨텍스트·금지사항 규정
   ※ 실제 SVG 자산은 별도 등록, v2는 사용 규칙만 정의

[히어로 타이포 톤 조정]
v1: Playfair Display italic (럭셔리 세리프)
v2: Inter Bold (산세리프) — 브랜딩 워드마크 톤과 일치
   ※ Playfair Display는 Champion·Crown Card 전용으로 한정

[유지 항목] — v1 100% 계승, 변경 없음
- 듀얼 테마 (다크: Domain 0~3 / 라이트: Domain 4~6)
- 반응형 3화면 (375px / 768px / 1440px)
- Vote Count UI 노출 금지
- "FIFA", "Official" 문자 금지
- "AI GENERATED" 배지 의무 표시
- Tournament Deadline만 존재 (Round Deadline 없음)
- advanceRound() 시스템 자동 (Host가 라운드 전환하지 않음)
- 모든 컴포넌트 구조·Props 인터페이스
- Firestore 스키마·Cloud Functions
```

---

## ⛔ 디자인 절대 원칙 (v2 갱신)

```
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

## 1️⃣ 신규 듀얼 테마 디자인 토큰 (v2 핵심)

### 다크 테마 — Domain 0, 1, 2, 3 (Twilight Stadium)

```css
/* ── 배경 팔레트 (Navy-Indigo 톤) ── */
--color-bg-deep:      #060C3B;   /* Deep Osidian — 가장 깊은 배경 (전체 페이지) */
--color-bg-default:   #141466;   /* Deep Twilight — 기본 다크 배경 (히어로·CTA 영역) */
--color-bg-soft:      #1E1E48;   /* Twilight Soft — 카드·패널 배경 */
--color-bg-elevated:  #334066;   /* Twilight Indigo — 모달·드롭다운·hover */
--color-bg-charcoal:  #1E1E24;   /* Gray Indigo — 중간 회색 카드 (균형용) */

/* ── 브랜드 컬러 (Primary) ── */
--color-gold:         #FFD700;   /* Crown Gold — 메인 포인트 (버튼·강조·로고) */
--color-gold-bright:  #FBB03B;   /* Crown Gold Bright — 로고 보조 톤 */
--color-gold-hover:   #FFC000;   /* Gold Hover 상태 */
--color-gold-subtle:  rgba(255, 215, 0, 0.12);
--color-gold-glow:    rgba(255, 215, 0, 0.25);
--color-aura:         #FFE87C;   /* Aura Yellow — 부드러운 강조·호기심 자극 */
--color-aura-subtle:  rgba(255, 232, 124, 0.10);

/* ── 액센트 컬러 (Accent — 엔터테인먼트 활력) ── */
--color-crimson:      #CF2E45;   /* Royal Crimson — 승부·열기·VS 상황 */
--color-crimson-glow: rgba(207, 46, 69, 0.30);
--color-turquoise:    #39CFB8;   /* Turquoise — 상쾌함·성공·긍정 피드백 */
--color-turquoise-glow:rgba(57, 207, 184, 0.25);
--color-powder:       #A6BDD6;   /* Powder Blue — 보조 텍스트·구분선 */

/* ── 텍스트 (Off-White 기반) ── */
--color-text:         #F0F5F7;   /* Off-White — 기본 텍스트 (순수 백색 금지) */
--color-text-sub:     #A6BDD6;   /* Powder Blue — 보조 텍스트 */
--color-text-muted:   #6B7A99;   /* Indigo Gray — 뮤트 텍스트 */
--color-text-disabled:#3B4566;   /* 비활성 텍스트 */

/* ── 테두리 ── */
--color-border:       #2A3A66;   /* 기본 테두리 (Twilight Indigo 톤) */
--color-border-light: #1F2A52;   /* 미세 테두리 */
--color-border-gold:  rgba(255, 215, 0, 0.30);

/* ── 상태 컬러 (v2 갱신: 브랜드 톤에 맞춤) ── */
--color-error:        #CF2E45;   /* Royal Crimson 활용 */
--color-success:      #39CFB8;   /* Turquoise 활용 */
--color-warning:      #FFE87C;   /* Aura Yellow 활용 */
--color-info:         #A6BDD6;   /* Powder Blue 활용 */
```

### 라이트 테마 — Domain 4, 5, 6 (Off-White Surface)

```css
/* ── 배경 팔레트 ── */
--color-bg-light:         #F0F5F7;   /* Platinum — 라이트 전체 배경 */
--color-surface-light:    #FFFFFF;   /* 카드·컨테이너 배경 */
--color-surface-elevated: #E8EEF2;   /* 섹션 배경 */

/* ── 브랜드 컬러 (공통) ── */
--color-gold:             #FFD700;
--color-gold-hover:       #FFC000;
--color-gold-subtle:      rgba(255, 215, 0, 0.10);
--color-aura:             #FFE87C;

/* ── 액센트 (라이트 테마용 톤 조정) ── */
--color-crimson:          #B5223A;   /* 라이트에서 약간 채도 낮춤 */
--color-turquoise:        #1FA68F;   /* 라이트에서 약간 진하게 */

/* ── 텍스트 ── */
--color-text-light:       #141466;   /* Deep Twilight — 기본 텍스트 */
--color-text-sub-light:   #334066;
--color-text-muted-light: #6B7A99;

/* ── 테두리 ── */
--color-border-light:     #D4DCE3;
--color-border-subtle:    #E8EEF2;
```

---

## 2️⃣ 컬러 사용 가이드 (NEW — v2 핵심)

### 컬러 사용 비율 (다크 테마 기준)

```
배경 (Deep Osidian + Deep Twilight) ......... 70% 차지
텍스트 (Off-White + Powder Blue) ............ 15% 차지
Crown Gold (메인 포인트) ..................... 10% 차지 — 버튼·강조·로고만
액센트 (Crimson/Turquoise/Aura) .............. 5% 차지 — 핵심 순간만
```

### 컬러별 사용 컨텍스트

```
🟡 Crown Gold (#FFD700)
   - 주요 CTA 버튼 (Vote, Join, Create)
   - Crown 로고 (등록된 SVG 자산)
   - Champion 확정 화면의 강조 텍스트
   - VS 배지 배경
   - 활성 탭 인디케이터

🟡 Aura Yellow (#FFE87C)
   - Gold가 너무 강할 때의 부드러운 강조
   - 호버 상태의 발광 효과
   - 카운트다운 숫자 (소프트 톤)
   - 새 알림·뱃지의 부드러운 배경

🔴 Royal Crimson (#CF2E45)
   - VS Battle 양 진영 구분 시 한쪽 (예: 우측)
   - "Live" 상태 인디케이터
   - 마감 임박 카운트다운
   - 응원 열기·인기 상승 표시
   - 에러 메시지

🟢 Turquoise (#39CFB8)
   - 투표 완료 직후 피드백 펄스
   - 성공 알림
   - VS Battle 양 진영 구분 시 반대쪽 (예: 좌측)
   - 새 Tournament 등장 뱃지

🔵 Powder Blue (#A6BDD6)
   - 보조 텍스트
   - 구분선·디바이더
   - 인포 아이콘
   - 비활성 상태의 부드러운 표시
```

### 텍스트 색상 위계 (대비 확보)

```
다크 테마:
  Off-White(#F0F5F7) on Deep Osidian(#060C3B) — 대비 15.2:1 ✅
  Powder Blue(#A6BDD6) on Deep Osidian(#060C3B) — 대비 8.4:1 ✅
  Crown Gold(#FFD700) on Deep Osidian(#060C3B) — 대비 11.8:1 ✅

라이트 테마:
  Deep Twilight(#141466) on Platinum(#F0F5F7) — 대비 14.8:1 ✅
  Twilight Indigo(#334066) on Platinum(#F0F5F7) — 대비 8.9:1 ✅
```

---

## 3️⃣ 타이포그래피 시스템 (v1 계승 + 일부 갱신)

### 폰트 패밀리

```css
/* 메인 헤딩 (v2 변경: 럭셔리 → 엔터테인먼트 톤) */
--font-heading: 'Inter', 'Pretendard', sans-serif;
/* 용도: 히어로 슬로건, 섹션 타이틀, Tournament 이름 — 브랜딩 워드마크 톤 일치 */

/* 디스플레이 타이틀 — 특수 용도로 한정 */
--font-display: 'Playfair Display', serif;
/* 용도: Champion 확정 화면, Crown Card 텍스트 (히어로에는 더 이상 사용 안 함) */

/* 기본 UI 폰트 */
--font-body: 'Inter', 'Pretendard', sans-serif;

/* 숫자·코드 */
--font-mono: 'JetBrains Mono', monospace;
/* 용도: 카운트다운, 퍼센트 수치, 시간 표시 */
```

### 타입 스케일 (Tailwind 기준)

```
text-[48px]/[56px] font-bold font-heading      — Hero 메인 슬로건 (모바일 text-3xl)
text-[36px]/[44px] font-bold font-heading      — 섹션 제목
text-[28px]/[36px] font-semibold font-display  — Champion 이름 (Final/Crown Card 전용)
text-[22px]/[32px] font-semibold               — Contestant 이름 (VS Battle)
text-[18px]/[28px] font-medium                 — 본문 강조
text-[16px]/[24px] font-normal                 — 기본 본문
text-[14px]/[20px] font-normal                 — 보조 텍스트 / 배지
text-[12px]/[16px] font-normal                 — 캡션 / 라벨
text-[10px]/[14px] font-normal                 — 최소 텍스트 (AI GENERATED 배지)
```

---

## 4️⃣ 간격·모서리·그림자 토큰

```css
/* ── 모서리 반경 (v1 100% 계승) ── */
--radius-card:    24px;
--radius-modal:   20px;
--radius-panel:   16px;
--radius-btn:     12px;
--radius-badge:   8px;
--radius-chip:    999px;

/* ── 그림자 (v2 갱신: 네이비 톤 기반) ── */
--shadow-card:    0 4px 24px rgba(6, 12, 59, 0.50);
--shadow-modal:   0 8px 48px rgba(6, 12, 59, 0.70);
--shadow-gold:    0 0 32px rgba(255, 215, 0, 0.25);
--shadow-aura:    0 0 24px rgba(255, 232, 124, 0.18);
--shadow-crimson: 0 0 24px rgba(207, 46, 69, 0.25);
--shadow-turquoise:0 0 24px rgba(57, 207, 184, 0.20);
--shadow-hover:   0 8px 32px rgba(255, 215, 0, 0.18);

/* ── 간격 시스템 (v1 100% 계승) ── */
--spacing-xs:   4px;
--spacing-sm:   8px;
--spacing-md:   16px;
--spacing-lg:   24px;
--spacing-xl:   40px;
--spacing-2xl:  64px;
--spacing-3xl:  96px;
```

---

## 5️⃣ 반응형 그리드 시스템 (v1 100% 계승)

### 브레이크포인트

```
모바일:     375px  ~ 767px
태블릿:     768px  ~ 1023px
데스크탑:   1440px+

Tailwind: sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1440
```

### 컨테이너 최대 너비

```
모바일:    max-w-[375px]  px-4
태블릿:    max-w-[768px]  px-6
데스크탑:  max-w-[1440px] px-12 (콘텐츠 max-w-[1200px] mx-auto)
```

### Tournament 카드 그리드 (Domain 1 Trending)

```
모바일:    grid-cols-1 gap-4
태블릿:    grid-cols-2 gap-6
데스크탑:  grid-cols-3 gap-8
```

### Contestant 48 Nodes 그리드 (Domain 2 Lab)

```
데스크탑 전용: grid-cols-8 gap-3 (8열 × 6행 = 48개)
또는: grid-cols-6 gap-4 (6열 × 8행)
각 노드: 80×80px 이미지 + 아래 이름 텍스트
```

---

## 6️⃣ Crown 로고 사용 가이드 (NEW — 사용 규칙만 정의)

> **⚠️ 본 섹션은 등록된 SVG 자산의 사용 규칙만 다룹니다.**
> 실제 자산의 모양·획·곡률은 등록된 SVG 파일(`/public/brand/wc48-crown-*.svg`)이 단일 진실 공급원입니다. 이 문서에서 모양을 임의로 시각화하지 않습니다.

### 로고 변형 4종 — 사용 컨텍스트

```
① wc48-crown-filled.svg          (Filled — 메인 로고)
   - 사용처: Domain 0 Launch Pad 메인, 큰 사이즈(48px↑)
   - 색상: Crown Gold (#FFD700)

② wc48-crown-outline.svg         (Outline)
   - 사용처: 작은 사이즈(24~32px), 보조 위치
   - 색상: Crown Gold 외곽선만

③ wc48-crown-circle-filled.svg   (Circle Filled — 앱 아이콘용)
   - 사용처: 앱 아이콘, Favicon, GNB 좌측 작은 로고
   - 구성: Deep Twilight 원형 배경 + 내부 Gold 크라운

④ wc48-crown-circle-outline.svg  (Circle Outline)
   - 사용처: 라이트 테마의 작은 로고 위치
   - 색상: Gold 외곽선
```

### 로고 사용 규격 (어디에 / 얼마 크기로 / 어떤 변형으로)

```
Domain 0 Launch Pad (메인 시각):
  변형: ① Filled
  크기: 데스크탑 width 180px / 태블릿 140px / 모바일 100px
  위치: 화면 중앙 상단 1/3 지점
  효과: Gold 방사형 글로우 + 부드러운 부유 애니메이션(4초 주기, ±6px)

GNB (글로벌 네비게이션):
  변형: ③ Circle Filled
  크기: height 32px (모바일 28px)
  위치: 좌측 상단
  클릭: Domain 1 The Pitch(/)로 이동

Crown Card (Champion 확정):
  변형: ① Filled
  크기: width 64px (1200×630 OG 이미지 기준)
  위치: Champion 이미지 상단 또는 우측 상단
  효과: Gold 펄스 글로우 (2초 주기)

Favicon / PWA 아이콘:
  변형: ③ Circle Filled
  사이즈: 16/32/64/128/192/512
```

### 로고 안전 영역 (Clear Space)

```
로고 주변 최소 여백: 로고 높이의 30%
예) 100px 로고 → 사방 30px 여백 필수
예) 48px 로고 → 사방 14px 여백 필수
```

### 로고 사용 금지 사항

```
❌ 로고 회전 (왕관은 항상 정방향)
❌ 색상 변경 (Crown Gold 외 사용 금지)
❌ 비율 왜곡 (stretch 금지)
❌ 그라디언트·필터·드롭 섀도 추가 (Gold 글로우만 허용)
❌ 검정 배경 위에 단독 배치 (반드시 네이비-인디고 톤 배경)
❌ 등록된 SVG 자산 외 임의로 그린 로고 사용
```

---

## 7️⃣ 도메인별 컬러 적용 명세

> **참고**: 도메인별 모듈 구조·기능은 v4.8 설계서가 단일 진실 공급원입니다.
> 이 섹션은 v2의 새 컬러 토큰을 각 도메인에 어떻게 적용하는지만 다룹니다.

### Domain 0 — LAUNCH PAD (다크 테마)

```
배경: --color-bg-deep (#060C3B)
배경 효과:
  - 상단 1/3: Gold 방사형 그라디언트 블러
    background: radial-gradient(ellipse 80% 60% at 50% 30%,
                rgba(255,215,0,0.18) 0%, transparent 60%);
  - 하단 1/3: Crimson 부드러운 글로우 (선택적)
  - 전체: Deep Twilight → Deep Osidian 세로 그라디언트 가능

Crown 로고 영역:
  - 등록된 wc48-crown-filled.svg 사용
  - 효과: Gold 글로우 + 부유 애니메이션 (위 §6 규격 참조)

Hero 슬로건:
  - "WHO RULES THE WORLD?"
  - 폰트: font-heading bold (v1의 italic 제거)
  - 색상: --color-text (#F0F5F7)

Countdown:
  - font-mono, text-[48px] (모바일 text-[36px])
  - 색상: --color-gold (#FFD700)
  - 셀 배경: rgba(20, 20, 102, 0.6) + 1px Gold 테두리
  - 셀 모서리: rounded-[8px]

Waitlist 이메일 입력:
  - 배경: --color-bg-elevated (Twilight Indigo)
  - Focus: border-color: --color-gold, box-shadow: --shadow-gold
  - 버튼: bg-gold text-twilight font-semibold rounded-full

SNS Links:
  - 아이콘 색상: --color-text-sub (Powder Blue)
  - Hover: --color-gold
```

### Domain 1 — THE PITCH (다크 테마)

```
배경: --color-bg-deep (#060C3B)
배경 효과: 상단 부드러운 Aura Yellow 그라디언트 (subtle)

Hero CTA 버튼:
  - "START VOTING"
  - 스타일: bg-gold text-twilight rounded-full
  - 크기: 모바일 h-12 w-full / 데스크탑 h-14 px-10

Trending Tournament 카드:
  - 카드 배경: --color-bg-soft (#1E1E48)
  - 카드 테두리: 1px solid --color-border (#2A3A66)
  - Hover: border-color: --color-gold, box-shadow: --shadow-hover, scale(1.02)
  - 카테고리 배지:
    * FIFA:  bg-turquoise text-twilight
    * KPOP:  bg-crimson text-off-white
    * OTHER: bg-aura text-twilight
  - Tournament 제목: text-[18px] font-semibold --color-text
  - 참여자 수 (선택적): text-[14px] --color-text-sub

GNB:
  - 높이: 64px (모바일 56px)
  - 배경: 초기 투명 → 스크롤 시 backdrop-blur-md + rgba(6, 12, 59, 0.85)
  - 로고: 좌측, ③ Circle Filled 변형, height 32px
  - 메뉴: text-[14px] font-medium --color-text-sub, hover: --color-gold

모바일 하단 탭 바:
  - 높이: 64px + safe-area-inset-bottom
  - 배경: --color-bg-elevated / backdrop-blur-lg
  - 상단 보더: 1px solid --color-border-light
  - 활성 탭: --color-gold + 상단 2px Gold 인디케이터
  - 비활성: --color-text-sub
```

### Domain 2 — THE LAB (다크 테마, 데스크탑 전용)

```
배경: --color-bg-deep (#060C3B)

Wizard 4단계 스텝퍼:
  - 완료 스텝: bg-gold + 체크 아이콘
  - 현재 스텝: border-2 border-gold + bg-gold-subtle
  - 미완료 스텝: border border-twilight-indigo + text-muted

48 Nodes 그리드:
  - 비어있는 노드: 점선 테두리 (1.5px dashed --color-border) + "+" 아이콘
    * "+" 색상: --color-text-muted, hover: --color-gold
  - 채워진 노드: Contestant 이미지 (v4.8 설계서 규격 그대로)
  - 이름 텍스트: 노드 아래 text-[12px] truncate

AI Fill 버튼:
  - "✨ AI로 48명 채우기"
  - 스타일: border-2 border-gold text-gold hover:bg-gold hover:text-twilight
  - 로딩 중 스피너: Turquoise 톤
```

### Domain 3 — THE ARENA (다크 테마) ★ 핵심

```
배경: --color-bg-deep (#060C3B)
배경 효과:
  - 좌측 30%: Turquoise 부드러운 글로우 (rgba(57,207,184,0.10))
  - 우측 30%: Crimson 부드러운 글로우 (rgba(207,46,69,0.10))
  - 중앙: 투명 (VS 배지에 집중)

─────────────────────────────────────
VS Battle 카드 컬러 적용
─────────────────────────────────────

Contestant 이미지 카드:
  - 크기: 모바일 160×200px / 태블릿 200×260px / 데스크탑 240×320px
  - 모서리: rounded-[24px]
  - 좌측 카드 Hover: Turquoise 외곽 글로우 (--shadow-turquoise)
  - 우측 카드 Hover: Crimson 외곽 글로우 (--shadow-crimson)
  - 이름 오버레이:
    * 위치: 카드 하단, absolute bottom-3 left-3 right-3
    * 배경: rgba(6, 12, 59, 0.6) + backdrop-blur-md
    * 텍스트: font-semibold text-[14px] text-white
    * 모서리: rounded-[8px], padding 4px 10px
  - Hover 공통: scale(1.03) + border-2 border-gold
  - 선택 후: border-4 border-gold + Gold 체크 뱃지 (상단 우측)

VS 배지 (중앙):
  - 배경: --color-gold (#FFD700)
  - 텍스트: "VS" text-twilight font-black text-[20px]
  - 모양: 원형 56×56px
  - 드롭섀도: --shadow-gold

투표 버튼:
  - 크기: 모바일 w-full h-12 / 데스크탑 min-w-[160px] h-12
  - 기본: bg-transparent border-2 border-gold text-gold rounded-full
  - 호버: bg-gold text-twilight
  - 선택 후: bg-gold text-twilight + 체크 아이콘 + Turquoise 펄스(0.6초)
  - 한 번 클릭으로 즉시 다음 Match 자동 전환 (v4.8 설계서 nextMatch() 호출)

Rate Bar (투표 후 노출, rankingCache):
  - 배경: --color-bg-elevated (#334066)
  - 좌측 진행 바: bg-turquoise
  - 우측 진행 바: bg-crimson
  - Vote Rate (%)만 표시 — 절대 수치(count) 금지

Match 진행 표시:
  - 상단: "48강 · 7/24" 텍스트 (Powder Blue)
  - 프로그레스 바: bg-gold, 높이 4px

─────────────────────────────────────
Crown Card (Champion 확정 화면) 컬러 적용
─────────────────────────────────────

배경: --color-bg-deep + Gold 방사형 글로우 (강함)
상단: Crown 로고 ① Filled 64×64px (Gold 펄스 글로우)
Champion 이름: font-display italic text-[48px] --color-gold
"CHAMPION" 텍스트: font-heading text-[24px] --color-text-sub uppercase tracking-widest
Tournament 제목: text-[18px] --color-text
Gold 테두리 프레임: border-2 border-gold rounded-[24px]
"AI GENERATED" 배지: 우측 하단, bg-twilight/60 text-[10px]

(Crown Card 1200×630px OG 이미지 규격은 v4.8 설계서 그대로 유지)

─────────────────────────────────────
Newsroom (GNews 25개) 컬러 적용
─────────────────────────────────────

뉴스 카드:
  - 배경: --color-bg-soft (#1E1E48)
  - 테두리: 1px solid --color-border
  - 출처 배지: text-[12px] --color-text-muted
  - 제목: text-[16px] font-semibold --color-text (2줄 말줄임)
  - 발행 시간: text-[12px] --color-text-sub (Powder Blue)
  - "AI GENERATED" 배지: AI 요약 뉴스에만, 썸네일 우측 하단
  - Hover: border-color: --color-gold, scale(1.01)

─────────────────────────────────────
Round Transition (라운드 전환 효과) 컬러 적용
─────────────────────────────────────

⚠️ 트리거: Voter의 해당 Round 마지막 Match 완료 시 advanceRound() 시스템 자동 실행
(Host가 라운드 전환하지 않음 — v4.8 설계서 + LANGUAGE.md v1.2 확정)

배경: 전체 화면 Deep Osidian 오버레이 (rgba(6,12,59,0.92))
중앙 카드:
  - 배경: Deep Twilight (#141466)
  - 테두리: 2px solid Gold + 부드러운 Aura Yellow 외곽선
텍스트:
  - "Man of the World Cup" — font-display text-[24px] text-aura
  - "24강" — font-heading text-[64px] font-bold text-gold
  - 서브: text-sub (Powder Blue)
애니메이션: scale(0) → scale(1) spring + Gold 펄스
```

### Domain 4 — THE LOCKER ROOM (라이트 테마)

```
배경: --color-bg-light (#F0F5F7)

로그인 카드:
  - 배경: --color-surface-light (#FFFFFF)
  - 모서리: rounded-[16px], shadow-sm
  - 소셜 버튼: h-12 rounded-full
    * Google: bg-white border text-twilight
    * Apple:  bg-twilight text-white

프로필:
  - 아바타: 48px 원형, 1px Gold 테두리
  - 카드: --color-surface-light, shadow-sm
  - 텍스트: --color-text-light (Deep Twilight)

GDPR 삭제:
  - 경고 배너: bg-crimson/10 border-crimson/30 text-crimson
  - 확인 버튼: bg-crimson text-white rounded-full
```

### Domain 5 — POLICY HUB (라이트 테마)

```
배경: --color-bg-light (#F0F5F7)

쿠키 배너:
  - 위치: fixed bottom-0
  - 배경: --color-surface-light
  - 상단 테두리: 2px solid --color-gold
  - "모두 수락": bg-gold text-twilight rounded-full
  - "필수만": bg-transparent border text-twilight-indigo
  - "설정": text-link 스타일

법적 문서:
  - 본문: max-w-[800px] mx-auto, line-height 1.8
  - h1: text-[32px] font-bold text-twilight
  - h2: text-[24px] font-semibold text-twilight
  - 본문: text-[16px] text-twilight-indigo
```

### Domain 6 — ADMIN DASHBOARD (라이트 테마, 데스크탑 전용)

```
배경: --color-bg-light (#F0F5F7)

5지표 카드:
  - 배경: --color-surface-light (#FFFFFF)
  - 테두리: 1px solid --color-border-light (#D4DCE3)
  - 모서리: rounded-[16px]
  - 지표 숫자: text-[32px] font-bold --color-gold-bright (#FBB03B)
    * (라이트에서 가독성 위해 Bright 버전)
  - 지표명: text-[14px] --color-text-muted-light
  - 트렌드 아이콘:
    * 상승: Turquoise
    * 하락: Crimson
    * 보합: Twilight Indigo

Tournament 목록 상태 배지:
  - draft:     bg-twilight-indigo/10 text-twilight-indigo
  - published: bg-aura/30 text-twilight
  - active:    bg-turquoise/15 text-turquoise
  - closed:    bg-crimson/15 text-crimson
  - completed: bg-gold-subtle text-twilight + Crown 아이콘
```

---

## 8️⃣ 핵심 컴포넌트 — 컬러 적용만 갱신

> **컴포넌트 구조·Props·로직은 v4.8 설계서 그대로 유지. v2는 색상 적용 가이드만 추가합니다.**

### VSBattle.tsx (컬러 적용)

```
좌측 진영 글로우: Turquoise
우측 진영 글로우: Crimson
VS 배지: Gold 배경 + Twilight 텍스트
투표 완료 펄스: Turquoise
```

### CrownCard.tsx (컬러 적용)

```
배경: Deep Osidian + Gold 방사형 글로우
프레임: 2px solid Gold
Champion 이름: font-display italic, Gold
"CHAMPION" 레이블: font-heading, Powder Blue uppercase tracking
```

### RoundTransition.tsx (컬러 적용)

```
오버레이: rgba(6, 12, 59, 0.92)
카드 배경: Deep Twilight
카드 테두리: 2px Gold + Aura Yellow 외곽선
"Round of N" 텍스트: Gold
서브 텍스트: Powder Blue
```

### TournamentCard.tsx (컬러 적용)

```
카드 배경: Twilight Soft
카드 테두리: Border Twilight Indigo
Hover: Gold 테두리 + Gold 글로우
카테고리 배지: FIFA→Turquoise / KPOP→Crimson / OTHER→Aura
```

---

## 9️⃣ 애니메이션 가이드 (Framer Motion)

```typescript
// 기본 페이지 전환 (v1 그대로)
const pageVariants = {
  initial:  { opacity: 0, y: 20 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit:     { opacity: 0, y: -20 },
};

// 카드 호버 (테두리 색상만 v2 갱신)
const cardHoverVariants = {
  rest:     { scale: 1, borderColor: '#2A3A66' },
  hover:    { scale: 1.03, borderColor: '#FFD700',
              boxShadow: '0 0 32px rgba(255,215,0,0.25)',
              transition: { duration: 0.2 } },
};

// Crown 로고 부유 (v2 신설 — Domain 0)
const crownFloatVariants = {
  animate: {
    y: [0, -6, 0],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
};

// Gold 글로우 펄스 (Champion 확정)
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

// 라운드 전환 카드 팝업 (v1 그대로)
const transitionCardVariants = {
  initial:  { scale: 0, opacity: 0 },
  animate:  { scale: 1, opacity: 1,
              transition: { type: 'spring', stiffness: 200, damping: 20 } },
  exit:     { scale: 0.8, opacity: 0 },
};

// 투표 버튼 선택 (v2 갱신 — Turquoise 펄스 추가)
const voteButtonSelected = {
  animate: {
    backgroundColor: '#FFD700',
    color: '#141466',
    scale: [1, 1.08, 1],
    boxShadow: [
      '0 0 0 0 rgba(57, 207, 184, 0.6)',
      '0 0 0 16px rgba(57, 207, 184, 0)',
    ],
    transition: { duration: 0.6 },
  },
};

// VS 진영 글로우 (v2 신설)
const sideGlowLeft  = { hover: { boxShadow: '0 0 32px rgba(57, 207, 184, 0.30)' } };
const sideGlowRight = { hover: { boxShadow: '0 0 32px rgba(207, 46, 69, 0.30)' } };
```

> 모든 애니메이션은 `prefers-reduced-motion: reduce` 사용자 설정 존중 (Framer Motion 자동 처리)

---

## 1️⃣0️⃣ 배지 + 태그 컴포넌트

```
AI GENERATED 배지:
  - 필수 표시: AI 생성 콘텐츠(뉴스·Crown Card) 모두
  - 스타일: bg-twilight/60 text-off-white text-[10px] font-mono uppercase
  - 테두리: 1px solid rgba(255,255,255,0.20)
  - 위치: 콘텐츠 우측 하단
  - 모서리: rounded-[6px]

카테고리 배지 (v2 갱신 — 컬러 다양화):
  - FIFA:  bg-turquoise text-twilight text-[11px] font-bold uppercase rounded-full
  - KPOP:  bg-crimson text-off-white text-[11px] font-bold uppercase rounded-full
  - OTHER: bg-aura text-twilight text-[11px] font-bold uppercase rounded-full
  - padding: px-2.5 py-0.5

Tournament 상태 배지:
  - DRAFT:     bg-twilight-indigo/20 text-powder border border-twilight-indigo/40
  - PUBLISHED: bg-aura/20 text-aura border border-aura/40
  - ACTIVE:    bg-turquoise/15 text-turquoise border border-turquoise/30
  - CLOSED:    bg-crimson/15 text-crimson border border-crimson/30
  - COMPLETED: bg-gold-subtle text-gold border border-gold/40 + Crown 아이콘

MVP 배지 (개발 내부용):
  - MVP 1: bg-turquoise/20 text-turquoise
  - MVP 2: bg-aura/20 text-aura

Live 인디케이터 (v2 신설):
  - 빨간 점 (Crimson) + 펄스 애니메이션
  - "LIVE" 텍스트 text-[10px] font-bold text-crimson
```

---

## 1️⃣1️⃣ Tailwind 설정 (v2 갱신)

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // 다크 테마 (Twilight Stadium)
        'bg-deep':       '#060C3B',  // Deep Osidian
        'bg-default':    '#141466',  // Deep Twilight
        'bg-soft':       '#1E1E48',  // Twilight Soft
        'bg-elevated':   '#334066',  // Twilight Indigo
        'bg-charcoal':   '#1E1E24',  // Gray Indigo

        // Brand alias
        'twilight':      '#141466',
        'osidian':       '#060C3B',
        'indigo-mid':    '#334066',

        // Primary
        'gold':          '#FFD700',
        'gold-bright':   '#FBB03B',
        'gold-hover':    '#FFC000',
        'aura':          '#FFE87C',

        // Accent
        'crimson':       '#CF2E45',
        'turquoise':     '#39CFB8',
        'powder':        '#A6BDD6',

        // Text
        'off-white':     '#F0F5F7',
        'text-sub':      '#A6BDD6',
        'text-muted':    '#6B7A99',

        // 라이트 테마
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
        'card':   '24px',
        'modal':  '20px',
        'panel':  '16px',
        'btn':    '12px',
        'badge':  '8px',
      },
      boxShadow: {
        'gold':       '0 0 32px rgba(255, 215, 0, 0.25)',
        'gold-hover': '0 8px 32px rgba(255, 215, 0, 0.18)',
        'aura':       '0 0 24px rgba(255, 232, 124, 0.18)',
        'crimson':    '0 0 24px rgba(207, 46, 69, 0.25)',
        'turquoise':  '0 0 24px rgba(57, 207, 184, 0.20)',
        'card':       '0 4px 24px rgba(6, 12, 59, 0.50)',
        'modal':      '0 8px 48px rgba(6, 12, 59, 0.70)',
      },
      keyframes: {
        'crown-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        'gold-pulse': {
          '0%, 100%': { filter: 'drop-shadow(0 0 24px rgba(255,215,0,0.45))' },
          '50%':      { filter: 'drop-shadow(0 0 48px rgba(255,215,0,0.75))' },
        },
      },
      animation: {
        'crown-float': 'crown-float 4s ease-in-out infinite',
        'gold-pulse':  'gold-pulse 3s ease-in-out infinite',
      },
    },
  },
};
```

---

## 1️⃣2️⃣ 디자인 체크리스트 (작업 전 필수 확인)

```
[ 선결 조건 ]
  [ ] Crown 로고 4종 SVG 자산이 /public/brand/에 등록되었음
  [ ] WorldCrown48 워드마크 SVG 자산이 등록되었음
  [ ] 디자인 작업은 등록된 SVG 자산만 사용

[ 컬러 시스템 — v2 핵심 ]
  [ ] 다크 테마에 순수 블랙(#000000) 사용 없음 — Deep Osidian/Twilight만
  [ ] Crown Gold가 메인 포인트로만 사용 (남발 금지)
  [ ] Royal Crimson은 VS·Live·에러·열기 표현에만 사용
  [ ] Turquoise는 성공·완료·긍정 피드백에만 사용
  [ ] Aura Yellow는 부드러운 강조용 (Gold가 강할 때)
  [ ] 라이트 테마에 순수 화이트(#FFFFFF) 대신 Platinum(#F0F5F7) 사용

[ Crown 로고 ]
  [ ] Domain 0 Launch Pad 메인 시각으로 Crown 로고 배치
  [ ] 등록된 SVG 자산 사용 (임의로 그린 로고 금지)
  [ ] 4가지 변형 중 컨텍스트에 맞는 것 선택
  [ ] 로고 안전 영역(높이의 30%) 확보

[ 반응형 ]
  [ ] 모바일(375px) 디자인 완성
  [ ] 태블릿(768px) 디자인 완성
  [ ] 데스크탑(1440px) 디자인 완성

[ 콘텐츠 규칙 (v4.8 설계서 + LANGUAGE.md v1.2 준수) ]
  [ ] Vote Count 절대 수치 UI 노출 없음 — Vote Rate(%)만 표시
  [ ] "FIFA", "Official" 문자 사용 없음
  [ ] AI 생성 콘텐츠에 "AI GENERATED" 배지 표시
  [ ] Round Deadline 개념 사용 없음 — Tournament Deadline만 존재
  [ ] Host가 라운드 전환하는 UI 없음 — advanceRound() 시스템 자동
  [ ] 용어 준수: Contestant / Match / Voter / Champion / Crown Card

[ 접근성 ]
  [ ] Off-White(#F0F5F7) on Deep Osidian(#060C3B) 대비 4.5:1 이상 ✅
  [ ] Crown Gold(#FFD700) on Deep Osidian 대비 4.5:1 이상 ✅
  [ ] 버튼 최소 터치 영역 44×44px
  [ ] prefers-reduced-motion 존중

[ 브랜드 톤 ]
  [ ] "황혼의 경기장(Twilight Stadium)" 분위기 유지
  [ ] 엔터테인먼트답게 활력 있는 액센트 적절히 사용
  [ ] 순수 블랙의 무거운 럭셔리 톤 회피
```

---

## 1️⃣3️⃣ v1 → v2 마이그레이션 가이드

### 컬러 토큰 교체

```diff
- background: #05070A;            (v1 BG Deep)
+ background: #060C3B;            (v2 Deep Osidian)

- background: #0A0D12;            (v1 BG Default)
+ background: #141466;            (v2 Deep Twilight)

- background: #0E1217;            (v1 BG Soft)
+ background: #1E1E48;            (v2 Twilight Soft)

- background: #131820;            (v1 BG Elevated)
+ background: #334066;            (v2 Twilight Indigo)

- color: #F8FAFC;                 (v1 Text)
+ color: #F0F5F7;                 (v2 Off-White)

- color: #CBD5E1;                 (v1 Text Sub)
+ color: #A6BDD6;                 (v2 Powder Blue)

- border-color: #30363D;          (v1 Border)
+ border-color: #2A3A66;          (v2 Border Twilight)
```

### 강조 컬러 분산 (Gold 단독 → 다중 액센트)

```
v1 시나리오                          → v2 권장 컬러
─────────────────────────────────────────────────
모든 강조에 Gold                    → 메인 CTA만 Gold 유지
"새 알림" 점 (Gold)                  → Aura Yellow 또는 Turquoise
"마감 임박" 표시 (Gold)              → Crimson
"투표 완료" 피드백 (Gold)            → Turquoise 펄스
"호버 글로우" (Gold만)               → 좌측 Turquoise / 우측 Crimson
```

### 폰트 톤 교체

```diff
- font-family: 'Playfair Display' italic  (히어로 슬로건)
+ font-family: 'Inter' bold                (워드마크 톤 일치)

* Playfair Display는 Champion·Crown Card 전용으로 한정
```

---

## 변경 이력

| 버전 | 날짜 | 주요 변경 |
| --- | --- | --- |
| v1.0 | 2026-05 | 최초 작성 (다이어그램 5개 + 설계서 v4.8 100% 반영) |
| **v2.0** | **2026-05** | **★ 컬러·톤 전면 개편 — Twilight Stadium Edition** |
| | | 순수 블랙 → 네이비-인디고 톤 (Deep Osidian / Deep Twilight) |
| | | 단일 Gold → Gold + Aura + Crimson + Turquoise 4종 컬러 시스템 |
| | | Off-White / Powder Blue 텍스트 위계 도입 |
| | | Crown 로고 4종 사용 가이드 신설 (등록된 SVG 자산 전제) |
| | | 히어로 타이포 톤 조정 (Playfair italic → Inter bold) |
| | | v4.8 설계서 도메인·모듈·데이터 구조 변경 없음 |

---

*© 2026 WorldCrown48 | 작성: 48티오 | WC48_DESIGN_SYSTEM_v2.md*
*Twilight Stadium Edition | v1 100% 계승 + 컬러·톤 전환만 | CONFIDENTIAL*
