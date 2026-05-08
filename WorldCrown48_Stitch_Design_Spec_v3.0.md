# 👑 WorldCrown48 (월크48)
# Stitch UI/UX Design Spec v3.0

**작성:** 48티오 | **날짜:** 2026년 5월 | **상태:** 디자인 작업 시작 준비 완료

---

> **Stitch 작업자에게**
> 이 문서는 기획(grill-me) → PRD → 라이트스팩까지 모든 설계가 확정된 후 작성된 최종 디자인 스팩입니다.
> 아래 내용을 Stitch 프롬프트에 그대로 붙여넣어 컴포넌트를 생성하세요.
> **절대 금지 사항을 위반하면 작업이 반려됩니다.**

---

## 0. 플랫폼 개요

WorldCrown48(월크48)은 48명의 후보를 1:1 녹아웃 투표로 최후의 1인을 가리는 **글로벌 팬덤 토너먼트 플랫폼**입니다.

- **타겟:** 전 세계 MZ세대 축구팬 (2026 FIFA 북중미 월드컵 시즌)
- **컨셉:** Global MZ Sporty Luxury — 다크, 골드, 절제된 럭셔리
- **MVP 1 카테고리:** WORLD CUP 전용 (K-POP은 7월 추가)
- **모드:** 다크모드 **전용** (라이트모드 없음)

---

## 1. 글로벌 디자인 토큰

> **Stitch 프롬프트:** "아래 디자인 토큰을 Stitch 변수로 먼저 등록해주세요. 모든 컴포넌트는 이 토큰만 사용합니다."

### 색상 토큰

| 토큰명 | HEX | 용도 |
|---|---|---|
| `--wc-bg` | `#05070A` | 전체 배경 (Pure Deep Midnight) |
| `--wc-surface` | `#0E1217` | 카드·모듈·패널 배경 |
| `--wc-surface-hover` | `#161B22` | 호버 상태 Surface |
| `--wc-primary` | `#FFD700` | 포인트·강조 (Pure Gold, 형광기 없음) |
| `--wc-primary-hover` | `#FFC400` | Gold 호버 |
| `--wc-text` | `#F8FAFC` | 기본 텍스트 (Slate 50) |
| `--wc-muted` | `#64748B` | 보조 텍스트·설명 (Slate 500) |
| `--wc-border` | `#1E293B` | 카드 테두리 (Slate 800) |
| `--wc-error` | `#EF4444` | 오류·위험 상태 |
| `--wc-success` | `#22C55E` | 성공·완료 상태 |
| `--wc-overlay` | `rgba(0,0,0,0.6)` | 모달 배경·호버 오버레이 |

### 타이포그래피 토큰

| 토큰명 | 값 | 사용처 |
|---|---|---|
| `--font-display` | Playfair Display, Italic | 메인 타이틀, 대진 제목, "Ultimate Crown" |
| `--font-body` | Inter | 모든 본문, UI 텍스트, 숫자 |

### 형태 토큰

| 토큰명 | 값 | 사용처 |
|---|---|---|
| `--radius-card` | `24px` | 대진 카드, 모달 |
| `--radius-card-lg` | `40px` | 대형 카드, Locker Room |
| `--radius-btn` | `12px` | 일반 버튼 |
| `--radius-pill` | `9999px` | 뱃지, 태그, 둥근 버튼 |

---

## 2. 절대 금지 사항 ⚠️

> 아래를 위반하면 작업이 반려됩니다.

1. **형광 계열 색상 금지** — `#FFD700`만 허용. 형광 노랑(`#FFFF00`), 형광 그린 절대 금지
2. **라이트 배경 금지** — 흰색, 밝은 회색 배경 사용 금지. 항상 다크모드 유지
3. **한국적 요소 금지** — 태극 문양, 한옥, 붓 글씨체 금지
4. **빈 화면 납품 금지** — Empty State 없이 빈 화면 납품 금지
5. **쿠키 배너 없이 납품 금지** — Policy Hub와 함께 제출
6. **AI 배지 없이 AI 뉴스 컴포넌트 납품 금지** — "AI GENERATED" 배지 필수
7. **FIFA/Official 표기 금지** — 팬 기반 서비스임을 명시

---

## 3. 공통 컴포넌트 라이브러리

> **Stitch 프롬프트:** "아래 공통 컴포넌트를 먼저 만들어주세요. 모든 도메인이 이것을 재사용합니다."

### 3.1 버튼 5종

```
[Primary Button]
배경: --wc-primary (#FFD700)
텍스트: 검정 (#000000), font-black, tracking-widest
호버: scale(1.05), transition 0.2s
radius: --radius-btn (12px)
패딩: px-10 py-4

[Secondary Button]
배경: --wc-surface
텍스트: --wc-text
테두리: 1px --wc-border
호버: --wc-surface-hover

[Ghost Button]
배경: 투명
텍스트: --wc-muted
테두리: 없음
호버: text-wc-text

[Outline Button]
배경: 투명
테두리: 1px --wc-primary
텍스트: --wc-primary
호버: 배경 wc-primary/10

[Danger Button]
배경: --wc-error/10
테두리: 1px --wc-error/30
텍스트: --wc-error
호버: --wc-error/20
```

### 3.2 뱃지·태그 6종

```
[Live Badge]        배경: wc-primary/10, 텍스트: wc-primary, "LIVE 48"
[Category Badge]    배경: wc-surface, 테두리: wc-border
[Round Badge]       테두리: 1px wc-primary, 텍스트: wc-primary, pill형
[Status: Public]    아이콘: Eye, 텍스트: wc-primary/80
[Status: Private]   아이콘: Lock, 텍스트: wc-muted
[AI Generated]      배경: wc-surface, 텍스트: wc-muted, "AI GENERATED" 소형
```

### 3.3 인풋 시스템

```
[Text Input]
하단 언더라인 스타일 (border-b-2)
기본: --wc-border 컬러
포커스: --wc-primary 컬러로 애니메이션 채움
placeholder: --wc-border (매우 어두움)
텍스트: --wc-text, font-black, uppercase

[Search Input]
radius: pill
배경: --wc-surface
아이콘: 돋보기 (wc-muted)
```

### 3.4 상태 컴포넌트 4종 (모든 도메인 필수)

```
[Loading Skeleton]
Shimmer 효과: wc-surface → wc-surface-hover → wc-surface
골드 shimmer 하이라이트

[Error State]
아이콘: 경고 삼각형 (wc-error)
텍스트: "문제가 발생했습니다" + 재시도 버튼

[Empty State]
아이콘: 해당 도메인별 (Trophy, PlusCircle 등)
텍스트: wc-muted
CTA 버튼: Ghost 스타일

[Toast Notification]
위치: 우측 하단 fixed
배경: wc-surface
테두리: 1px wc-border
slide-in-from-right 애니메이션 (0.3s)
성공: 왼쪽 4px 골드 보더
오류: 왼쪽 4px 빨간 보더
```

---

## 4. Navbar (전체 공통)

> **Stitch 프롬프트:** "Navbar를 먼저 만들어주세요. 모든 페이지 상단에 고정됩니다."

```
위치: fixed top-0, z-50, 전체 너비
배경: --wc-surface + backdrop-blur-md + 80% 불투명
테두리: 하단 1px --wc-border
패딩: px-8 py-4

[로고 (좌측)]
Trophy 아이콘: amber-500 배경, 검정 아이콘, 호버 시 rotate-12
텍스트: "WORLD CROWN 48" — font-black, italic, tracking-tighter
"48" 부분: wc-primary 색상 + underline

[메뉴 (중앙, md 이상)]
PITCH | LAB | LOCKER ROOM
기본: wc-muted, 활성: wc-primary
폰트: text-xs font-black tracking-widest

[우측]
비로그인: [SIGN IN] — 흰 배경, 검정 텍스트, 구글 파비콘, pill형
로그인: 아바타 이미지 (골드 2px 테두리 원형 36px) + 이름(10px)
```

---

## 5. Domain 1: The Pitch (홈·랜딩)

> **Stitch 프롬프트:** "The Pitch 도메인을 만들어주세요. 월드컵 선수 토너먼트 랜딩 페이지입니다."

### 5.1 Hero Section

```
상단 여백: pt-32 (Navbar 고정 여백)
배경 효과: 골드 글로우 — absolute, -top-20 -left-20, w-96 h-96,
           bg-[#FFD700]/10, blur-[120px], rounded-full

[상단 태그]
Flame 아이콘 + "The World is Watching"
wc-primary 색상, text-sm font-black tracking-[0.3em], animate-bounce

[메인 타이틀]
"Who wears the" — Inter Bold, White, text-6xl~8xl, italic, uppercase
"Ultimate Crown?" — Playfair Display Italic, #FFD700, 같은 크기

[서브텍스트]
"48 Contenders. 1:1 Knockouts. Only one survivor."
wc-muted, text-lg, max-w-xl

[CTA 버튼 2개]
[CREATE YOUR 48] — Primary 버튼, PlusCircle 아이콘
[EXPLORE PITCH] — Secondary 버튼
```

### 5.2 Tournament Card

```
배경: --wc-surface
테두리: 1px --wc-border (좌측은 4px, 기본 투명)
호버: 좌측 4px 골드 보더 활성화 (border-l-wc-primary)
radius: --radius-card (24px)
패딩: p-5
cursor: pointer

[상단]
"LIVE 48" 배지 (좌측) + "#1024" 번호 (우측, font-mono wc-muted)

[제목]
text-lg font-black uppercase
호버 시: wc-primary 색상 전환 (transition)

[하단 통계]
Users 아이콘 + "12.4k Fans"
Star 아이콘 + "98% Hype"
text-[10px] font-bold wc-muted
```

### 5.3 Top Creators Sidebar (PC 전용)

```
배경: --wc-surface
테두리: 1px --wc-border
radius: 40px
패딩: p-8
sticky top-32

[헤더]
Trophy 아이콘 (wc-primary) + "TOP CREATORS"
text-xl font-black italic

[크리에이터 행]
순위 번호 (text-lg italic wc-border/30) + 아바타 + 이름 + 점수
1위: Crown 아이콘 (wc-primary, filled)

[하단]
[VIEW FULL RANKINGS] — Secondary 버튼, 전체 너비
```

---

## 6. Domain 3: The Arena (1:1 투표)

> **Stitch 프롬프트:** "The Arena 도메인을 만들어주세요. 1:1 투표 화면입니다. 가장 임팩트 있는 화면입니다."

### 6.1 Round Badge

```
테두리: 1px --wc-primary, pill형
텍스트: wc-primary, text-[10px] font-black tracking-[0.4em] uppercase
내용: "Round of 48: Heat 01"
중앙 정렬, 인라인 블록
```

### 6.2 VS Battle View

```
레이아웃: 2열 그리드 (PC) / 1열 (모바일)

[Candidate Card (각 후보)]
배경: --wc-surface
테두리: 2px 투명 (기본) → 2px wc-primary (선택 후)
radius: 40px
overflow: hidden
cursor: pointer

이미지 영역:
  비율: 4:5 (aspect-[4/5])
  배경: slate-800 (이미지 없을 때)
  오버레이: gradient-to-t from-black via-transparent

이름 영역 (이미지 하단 절대 위치):
  국적: text-xs font-bold wc-primary uppercase tracking-widest
  이름: text-2xl font-black uppercase italic
  호버: scale(1.1) transition

선택 효과:
  골드 테두리 2px 활성화
  배경에 wc-primary/5 오버레이
  선택된 후보 확대 scale(1.02)

[VS 심볼 (중앙)]
원형 컨테이너: w-12 h-12 rounded-full
배경: 검정(#000)
테두리: 2px wc-primary
텍스트: "VS" — font-black italic wc-primary
글로우: box-shadow 0 0 20px rgba(255,215,0,0.3)
z-index: 위로
```

### 6.3 Vote Result Bar (투표 후 표시)

```
투표 완료 후 슬라이드업 애니메이션으로 등장
좌측 후보 득표율% 골드바 | 우측 후보 득표율% 회색바
높이: h-2 rounded-full
전환: transition-all duration-700 (집계 애니메이션)
```

### 6.4 Progress Dots

```
하단 중앙 배치
현재 매치: w-8 h-1 bg-wc-primary rounded-full
완료 매치: w-4 h-1 bg-wc-border rounded-full
미완료 매치: w-4 h-1 bg-wc-surface rounded-full
"Progress: 1/47 Matches" — text-[10px] font-black wc-muted tracking-widest
```

---

## 7. Domain 5: Policy Hub (법적·정책)

> **Stitch 프롬프트:** "Policy Hub를 만들어주세요. 런칭 전 법적 필수 페이지입니다. MVP 1 최우선입니다."

### 7.1 Cookie Consent Banner (★★★ 최우선)

```
위치: fixed bottom-0 left-0 right-0 z-50
배경: --wc-surface
테두리: 상단 1px --wc-border
패딩: px-8 py-6

[텍스트]
"이 사이트는 쿠키를 사용합니다."
wc-text font-bold + wc-muted 설명 텍스트
"자세히 알아보기" — wc-primary 링크

[버튼 3개 (우측 정렬)]
[모두 허용] — Primary 버튼
[필수만 허용] — Ghost 버튼
[설정하기] — Outline 버튼 (wc-primary 테두리)

[쿠키 상세 설정 모달]
Dialog 오버레이 (wc-overlay 배경)
카드: wc-surface, radius-card, p-8
각 카테고리: SwitchListTile
  필수 쿠키: 토글 비활성 (항상 ON, 변경 불가)
  기능 쿠키: 토글 활성/비활성
  분석 쿠키: 토글 활성/비활성
[저장] Primary 버튼
```

### 7.2 Policy Page 레이아웃

```
[좌측 사이드 네비 (lg 이상)]
배경: wc-surface
너비: 240px
항목: 이용약관 | 커뮤니티 가이드라인 | 개인정보처리방침 | 쿠키 정책
활성 항목: wc-primary 텍스트 + 좌측 3px 골드 보더

[언어 탭]
[한국어] [English] — TabBar, Surface 배경
활성 탭: wc-text + 하단 2px wc-primary 보더

[콘텐츠 영역]
h1: text-2xl font-black wc-text
h2: text-lg font-black wc-text, mt-8
본문: text-sm wc-muted line-height: 1.8
테이블: wc-surface 배경, wc-border 테두리
위험 수위 셀: wc-error/10 배경

이의 신청:
"policy@worldcrown48.com" — wc-primary 색상, hover underline
```

---

## 8. Domain 2: The Lab (런칭 직후 — 참고용)

> **Stitch 프롬프트:** "The Lab은 런칭 직후 개발 예정입니다. 지금은 참고용으로만 만들어주세요."

### 8.1 생성 Step 1 — 제목 입력

```
[Tournament Identity 레이블]
text-[10px] font-black wc-primary uppercase tracking-[0.2em]

[제목 인풋]
하단 언더라인 스타일
기본: 2px wc-border
입력 중: 2px wc-primary (골드로 왼→오 채움 애니메이션)
텍스트: text-3xl font-black uppercase
placeholder: wc-border (아주 어두움)

[선택 카드 2개]
[AI Quick-Collect 카드]
  배경: slate-900/50, 호버: wc-primary/30 테두리
  아이콘 박스: wc-primary 배경, Zap 아이콘(검정), 호버 rotate-6
  제목: "AI Quick-Collect" font-black uppercase
  설명: wc-muted text-xs

[Manual Curation 카드]
  동일 구조, 아이콘 박스: wc-surface, ImageIcon(흰색)
```

### 8.2 생성 Step 2 — 48 Nodes Grid

```
그리드: 8열 (PC) | 6열 (태블릿) | 4열 (모바일)
각 Node:
  비율: 1:1 (aspect-square)
  배경: slate-900
  테두리: 1px wc-border
  radius: rounded-xl
  빈 상태: Camera 아이콘(wc-border/50) + 번호(text-[8px] wc-border)
  호버: wc-primary 테두리 + Camera 아이콘 wc-primary
  이미지 있을 때: object-cover + 호버 시 "Replace" 버튼 오버레이
```

---

## 9. Crown Card (바이럴 핵심)

> **Stitch 프롬프트:** "Crown Card 미리보기 모달을 만들어주세요. 이것이 서비스의 바이럴 핵심입니다."

### 9.1 Crown Card 카드 디자인 (1080×1080 기준)

```
배경: #05070A (Deep Midnight)
외곽 테두리: 골드 (#FFD700) 8px, 24px 안쪽 여백
골드 글로우: box-shadow inset 0 0 60px rgba(255,215,0,0.15)

우승자 이미지: 중앙 상단, 800×700, object-cover
이름: Playfair Display Italic, 72px, #FFD700, 중앙, 대문자
토너먼트 제목: Inter Bold, 28px, #F8FAFC, 중앙
워터마크: "WORLD CROWN 48 · worldcrown48.com"
          Inter Bold, 20px, #64748B (Muted), 하단 중앙
```

### 9.2 Crown Card Modal

```
오버레이: wc-overlay (반투명 블랙)
카드: wc-surface, radius-card-lg (40px), p-8, max-w-lg

[미리보기 영역]
카드 이미지 (정사각형 비율)
골드 테두리 + 글로우 효과

[비로그인 상태 안내 배너]
배경: wc-primary/10, 테두리: 1px wc-primary/30
아이콘: Crown (wc-primary)
"공유하려면 로그인이 필요합니다"
[구글로 로그인] — Primary 버튼

[로그인 상태 버튼]
[PNG 다운로드] — Primary
[X(트위터) 공유] — Secondary, X 아이콘
[인스타 스토리] — Ghost, Instagram 아이콘 + "다운로드 후 업로드"
```

---

## 10. Admin 페이지

> **Stitch 프롬프트:** "관리자 전용 대진 생성 페이지를 만들어주세요. 일반 유저에게는 보이지 않습니다."

```
[헤더]
Shield 아이콘 (wc-primary) + "ADMIN — Tournament Creator"
text-sm wc-muted: "관리자 전용 페이지"

[제목 입력]
Text Input (언더라인 스타일)
[AI 48명 추천] — Primary 버튼, Zap 아이콘
로딩 중: 스피너 + "AI가 후보를 찾고 있습니다..." wc-muted

[후보 그리드 (Step 2)]
4열 그리드 (PC 기준)
각 후보 카드: wc-surface, radius-card, p-4
  번호 (1~48): wc-muted text-xs
  이름 입력: compact 인풋
  국적: compact 인풋
  이미지 URL: compact 인풋 + 외부 링크 아이콘
  이미지 미리보기: 썸네일 (URL 입력 시)

[발행 버튼]
[PUBLISH TO PITCH] — Primary 버튼, 전체 너비
```

---

## 11. 인터랙션 & UX 규칙

### 11.1 전역 인터랙션 규칙

```
버튼 호버: scale(1.05) + 밝기 110%, transition 0.2s ease
카드 호버: 좌측 골드 보더 활성화, transition 0.15s
모달 진입: fade-in 0.2s + slide-up 8px
페이지 전환: fade-in 0.4s
```

### 11.2 Navbar 스크롤 효과

```
스크롤 0: 배경 투명 (배경색 없음)
스크롤 > 10px: wc-surface + backdrop-blur-md 활성화
transition: background-color 0.3s
```

### 11.3 골드 글로우 효과 (핵심 모멘트)

```
적용 위치: VS 심볼, Crown Card, 우승 확정 순간, Hero Section 배경
CSS: box-shadow: 0 0 20px rgba(255,215,0,0.3), 0 0 40px rgba(255,215,0,0.1)
     text-shadow (텍스트): 0 0 20px rgba(255,215,0,0.5)
```

### 11.4 모바일 퍼스트 규칙

```
최소 터치 영역: 44×44px (모든 인터랙티브 요소)
폰트 최소: 12px (가독성 보장)
Candidate Card: 모바일에서 상하 배치 (VS 중간 배치)
Navbar 메뉴: 모바일에서 숨김 (햄버거 또는 하단 탭바)
```

---

## 12. 벤치마킹 레퍼런스 (우선 적용)

| 우선순위 | 적용 요소 | 참고 사이트 | 적용 위치 |
|---|---|---|---|
| 1위 | 골드 Glow(빛 번짐) | Valorant, Athlos.gg | VS 심볼, Crown Card, 우승 모멘트 |
| 2위 | Grain Texture 오버레이 | Athlos.gg, Misfits Gaming | Hero 배경 미세 노이즈 (CSS 1줄) |
| 3위 | Playfair Display Italic 타이포 | Thibaut Courtois 사이트 | 대진 제목, 메인 카피 |
| 4위 | 카드 진입 Fade+Slide 애니메이션 | Spotify, Netflix | Trending 카드, Node Grid 로딩 |
| 5위 | SVG 브라켓 커넥터 라인 | ESPN Bracketology | 48강→결승 진행 흐름 시각화 |

---

## 13. Stitch 작업 순서 (이 순서를 반드시 지키세요)

```
Step 1: 디자인 토큰 등록 (§1)                    ← 예상 2시간
Step 2: 공통 컴포넌트 (버튼·뱃지·인풋·상태) (§3)  ← 예상 1일
Step 3: Navbar (§4)                              ← 예상 2시간
Step 4: Domain 5 — 쿠키 배너 + 정책 페이지 (§7)  ← 예상 1일 ★법적 필수★
Step 5: Domain 1 — The Pitch (§5)               ← 예상 1일
Step 6: Domain 3 — The Arena + Crown Card (§6, §9) ← 예상 2일
Step 7: Admin 페이지 (§10)                       ← 예상 1일
Step 8: Domain 2 — The Lab (§8) [런칭 직후]     ← 예상 1일
```

---

## 14. 컴포넌트 완료 체크리스트

### 공통
- [ ] 디자인 토큰 Stitch 변수 등록 완료
- [ ] 버튼 5종 완료
- [ ] 뱃지 6종 완료
- [ ] 인풋 시스템 완료
- [ ] Loading Skeleton 완료
- [ ] Error State 완료
- [ ] Empty State 완료
- [ ] Toast Notification 완료
- [ ] Navbar 완료 (비로그인/로그인 2가지)

### Domain 1: The Pitch
- [ ] Hero Section 완료
- [ ] Tournament Card 완료 (hover 골드 보더 포함)
- [ ] Trending Feed 그리드 완료 (반응형)
- [ ] Top Creators Sidebar 완료

### Domain 3: The Arena
- [ ] Round Badge 완료
- [ ] Candidate Card 완료 (선택 전/후 2가지)
- [ ] VS 심볼 완료 (골드 글로우 포함)
- [ ] Vote Result Bar 완료
- [ ] Progress Dots 완료

### Domain 5: Policy Hub ★MVP 1 필수★
- [ ] Cookie Consent Banner 완료
- [ ] Cookie Settings Modal 완료
- [ ] Policy Page 레이아웃 완료 (한/영 탭)
- [ ] 정책 콘텐츠 페이지 4종 완료

### Crown Card
- [ ] Crown Card 카드 디자인 완료 (1080×1080)
- [ ] Crown Card Modal 완료 (비로그인/로그인 2가지)

### Admin
- [ ] 대진 생성 Step 1 완료
- [ ] 48 Nodes 편집 그리드 완료

---

*© 2026 WorldCrown48 (월크48) | 작성: 48티오 + Claude Sonnet 4.6 | 내부 기밀 문서 | v3.0*
