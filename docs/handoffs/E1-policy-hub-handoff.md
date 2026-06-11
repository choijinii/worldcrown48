# Handoff Brief — E-1 Policy Hub (Domain 5)

> **From**: Cowork (기획·시안 분석·정책 본문 작성) · **To**: Claude Code (실코드)
> **Date**: 2026-06-11 · **Author**: 대표 · **Version**: v1.0
> **목표 산출물**: `components/policy/` + `app/policies/[type]/` + `lib/cookieConsent.ts` + `app/layout.tsx` (Provider wrap)

---

## Pre-flight Checklist — 반드시 모두 확인 후 시작

```
☐ CLAUDE.md v2.1 읽음 (불변 원칙 8가지, 특히 #1 듀얼 테마·#4 AI-Report·#5 FIFA 금지)
☐ LANGUAGE.md v1.5 읽음 (Contestant·Tournament·Voter·Match 등 공식 용어)
☐ docs/lite-specs/E1-policy-hub.md 읽음 (#3 쿠키 배너 + #4 Policy Hub)
☐ docs/handoffs/E1-policy-hub-handoff.md(이 문서) 처음부터 끝까지 읽음
☐ Claude Design 시안 확인 (Domain 5 · Policy Hub · 3 surface: CookieBanner / ConsentModal / PolicyPages)
☐ content/ko/ + content/en/ 4 × 2 = 8개 md 파일 존재 확인
   · cookies.md / community.md / terms.md / privacy.md (양쪽 언어)
☐ docs/design/WC48_DESIGN_SYSTEM_v2.4.md 읽음 (라이트 테마 토큰)
```

위 7개가 모두 확인되기 전까지 코딩을 시작하지 마세요.

---

## 1. Goal — 한 줄 결과 정의

> **첫 방문 Voter에게 쿠키 동의 배너를 표시하고, 동의 기록을 Firestore에 12개월 유효 저장하며, 사용자가 ko/en 4종 정책 페이지를 좌측 네비·언어 토글로 탐색할 수 있다.**

GDPR·한국 개인정보보호법·정보통신망법의 **법적 의무**가 직결된 모듈입니다.

---

## 2. Files to Read FIRST (절대 건너뛰지 말 것)

| 파일 | 왜 읽나 |
|---|---|
| `CLAUDE.md` | 불변 원칙 8가지 (Domain 5는 ☀️ **라이트 테마**) |
| `LANGUAGE.md` | 공식 용어 — Voter, Tournament, Contestant, Match (Battle·Candidate 금지) |
| `docs/lite-specs/E1-policy-hub.md` | 기능 스펙 (단, 프레임워크 표기는 구버전 → Next.js 14 App Router 기준으로 재해석) |
| `docs/design/WC48_DESIGN_SYSTEM_v2.4.md` | 라이트 테마 디자인 토큰 |
| Claude Design 시안 (Send to Claude Code로 전달) | CookieBanner·ConsentModal·PolicyPages 3 surface 구조 + CSS 토큰 + 반응형 |
| `content/ko/*.md`, `content/en/*.md` | 정책 본문 8개 (Cowork이 작성 완료) |
| `app/layout.tsx`, `app/page.tsx` (A-0) | 기존 레이아웃 패턴 — Provider wrap 위치 결정 |
| `lib/firebase.ts` | Firestore 초기화 — 재사용 |

---

## 3. Files to CREATE / MODIFY

### 컴포넌트 (CookieBanner + ConsentModal · E1·M1)

| 경로 | 동작 | 비고 |
|---|---|---|
| `components/policy/CookieConsentProvider.tsx` | **NEW** | Context + Firestore 저장 + 12개월 만료 체크 |
| `components/policy/CookieBanner.tsx` | **NEW** | 하단 고정 배너 (3 버튼: Accept all · Reject · Customize) |
| `components/policy/ConsentModal.tsx` | **NEW** | 4 카테고리 토글 모달 + KO/EN 언어 토글 + 키보드 트랩 |
| `components/policy/ConsentToggle.tsx` | **NEW** | 카테고리별 토글 부품 (재사용) |
| `lib/cookieConsent.ts` | **NEW** | 저장/조회/만료 로직 + IP 해시(서버사이드) |
| `lib/i18n.ts` | **NEW** | 간단한 lang state 관리 (전역 ko/en) — Zustand 또는 Context |

### Policy Pages (E1·M2)

| 경로 | 동작 | 비고 |
|---|---|---|
| `app/policies/[type]/page.tsx` | **NEW** | 동적 라우트 (terms/community/privacy/cookies 4종) |
| `components/policy/PolicyShell.tsx` | **NEW** | 좌측 네비 + 우측 본문 레이아웃 |
| `components/policy/PolicyNav.tsx` | **NEW** | 좌측 사이드 네비 (4 문서 + 이의신청 메일) |
| `components/policy/PolicyHeader.tsx` | **NEW** | 페이지 헤더 (제목·메타·KO/EN 토글) |
| `components/policy/PolicyContent.tsx` | **NEW** | 마크다운 렌더링 + 섹션 ID + 스크롤스파이 |
| `components/policy/LanguageTabs.tsx` | **NEW** | KO/EN 토글 부품 (재사용) |

### 기존 파일 수정

| 경로 | 동작 | 비고 |
|---|---|---|
| `app/layout.tsx` | **EDIT** | `<CookieConsentProvider>`로 전역 wrap + footer에 "Report content" + "쿠키 설정 다시 열기" 추가 |
| `app/globals.css` | **EDIT** | 라이트 테마 토큰 추가 (다크 토큰과 분리, Domain 5 전용 wrapper) |
| `firestore.rules` | **EDIT** | `cookie_consents/{uid}` 컬렉션 규칙 추가 (소유자만 read/write) |
| `public/` | **CONFIRM** | wc48-crown-filled.svg, wc48-crown-circle-filled.svg 존재 확인 |

---

## 4. Acceptance Criteria — 완료 조건

### CookieBanner (E1·M1)

```
☐ 첫 방문 시 하단 고정 배너 자동 표시 (slide-up 320ms, reduced motion 시 비활성)
☐ 3 버튼 동작: Accept all → 모든 카테고리 true 저장 + 배너 숨김
                Reject → essential만 true, 나머지 false 저장 + 배너 숨김
                Customize → ConsentModal 열기
☐ 배너 상단 2px 골드(#FCD006) 테두리
☐ 배너 내 텍스트는 ko + en 동시 표기 (시안 패턴 유지)
☐ "쿠키 정책" · "개인정보처리방침" 링크 → /policies/cookies · /policies/privacy 라우팅
☐ Footer "쿠키 설정 다시 열기" 클릭 → 배너 재표시
```

### ConsentModal (E1·M1)

```
☐ 4 카테고리 표시: ESSENTIAL(잠금·항상 ON) · FUNCTIONAL · ANALYTICS · MARKETING
☐ MARKETING 기본값 false (lite-spec과 충돌하지만 시안 따름 — 사용자가 켤 수 있음)
☐ ESSENTIAL 토글 disabled 처리 + "ALWAYS ON" 라벨
☐ KO/EN 헤더 토글 동작: data-ml 속성으로 .ml-ko / .ml-en 스왑
☐ "선택 저장" 클릭 → Firestore cookie_consents/{uid} 저장 (12개월 유효)
☐ 저장 중 "Saving to Firestore…" 스피너 표시 (reduced motion 시 즉시 saved)
☐ 저장 완료 후 "✓ Saved · valid 12 months" 표시 (Turquoise #00A3B7)
☐ 키보드 트랩: Tab 순환, Escape로 닫기, focus 초기는 첫 토글
☐ aria-modal="true", aria-labelledby="modal-title", role="dialog"
☐ 모바일(< 480px) bottom sheet 스타일 (시안 @container 쿼리 참조)
```

### Policy Pages (E1·M2)

```
☐ /policies/terms · /policies/community · /policies/privacy · /policies/cookies 4 라우트 동작
☐ 잘못된 type 접근 시 notFound() (Next.js 404)
☐ 좌측 사이드 네비(데스크탑) / 상단 드롭다운(모바일) — 4 문서 전환
☐ KO/EN 토글: content/ko/{type}.md → content/en/{type}.md 스왑
☐ 마크다운 렌더링: 헤더(h1·h2)·표·링크·인용·강조 모두 정상 렌더
☐ 섹션별 스크롤스파이: 화면에 보이는 섹션의 네비 항목 강조
☐ 좌측 네비 하단 "이의신청 · APPEALS" 카드 + policy@worldcrown48.com 메일 링크
☐ 모바일에서 상단 anchor select로 섹션 점프
☐ 로딩 상태 skeleton 표시 (시안 .skel 패턴)
```

### 전역

```
☐ Domain 5 라이트 테마: bg #F2F2F5, surface #FFFFFF, royal #241754
☐ Crown Gold #FCD006 포인트 컬러 (불변 원칙 #2)
☐ 3 브레이크포인트 정상: 모바일(375) · 태블릿(768) · 데스크탑(1440)
☐ Footer 전 페이지에 "Report content" 메일 링크 + "Cookie 설정 다시 열기"
☐ Firestore Security Rules: cookie_consents/{uid}는 본인만 read/write
☐ TypeScript strict mode 통과
☐ console.error 0건
☐ Lighthouse 접근성 점수 90+
```

---

## 5. Hard Constraints — DO / DON'T (가장 중요)

### DO

- **라이트 테마 사용** — bg `#F2F2F5`, surface `#FFFFFF`, text `#0E0944`, royal `#241754`. CLAUDE.md 불변 원칙 #1
- **Crown Gold `#FCD006`** — 포인트 컬러. 불변 원칙 #2
- **CSS 변수 시스템** — Domain 0~3 다크 토큰과 충돌하지 않게 `[data-theme="light"]` 또는 `.domain-policy` wrapper로 스코프
- **Firestore** `cookie_consents/{uid}` 저장 + 12개월 만료 체크
- **IP 해시 SHA-256** — Cloud Function으로 서버사이드 처리 (클라이언트에서 평문 IP 노출 금지)
- **Container Query** 기반 반응형 (모달의 bottom sheet 변환 등)
- 쿠키 이름: **`wc48_consent`** (업계 표준)
- 정책 본문은 **`content/{lang}/{type}.md` 파일에서 동적 로드** (하드코딩 금지)
- 마크다운 파싱: `react-markdown` 또는 `unified` + `remark-gfm` (테이블 지원 필수)
- **접근성**: `aria-modal`, `aria-labelledby`, `aria-live="polite"` (저장 상태), `role="dialog"`, focus trap
- 모달·배너 폰트: Inter + Pretendard (라이트 테마에서도 폰트 스택 동일)

### DON'T

- **다크 테마 사용 금지** — Domain 5는 라이트 (불변 원칙 #1)
- **localStorage / sessionStorage 사용 금지** — 동의 기록은 Firestore + 쿠키만
- **`Battle`, `Candidate`, `Round Deadline` 등 금지 용어** 사용 금지 — LANGUAGE.md
- **"FIFA", "Official" 문자 절대 사용 금지** — 불변 원칙 #5
- **MARKETING 카테고리 기본값 true 금지** — 시안·법적 의무 모두 OFF (사용자가 명시적으로 켜야 함)
- **하드코딩 hex 금지** — 모든 색상은 CSS 변수
- **형광 노랑·형광 그린 사용 금지** — 불변 원칙 #2
- **Cloudflare 이메일 난독화 사용 금지** (시안에는 있으나 React에서 불필요) — 그냥 `mailto:` 사용
- **AI-Report 표기 금지** (Policy 페이지에는 등장 불가) — Footer-Only Lock v2.4 (CLAUDE.md 불변 원칙 #4)
- **Vote Count·Vote Rate 표시 금지** (Policy 페이지에는 등장 불가)
- **lite-spec의 Vite + React Router 표기 무시** — Next.js 14 App Router로 재해석

---

## 6. Design Reference

### 핵심 컴포넌트 구조 (시안 기준)

```
<CookieConsentProvider>                       — Context + Firestore 저장
  <App>
    <CookieBanner />                           — 첫 방문 시 하단 고정
      .cookie-banner.cb-inner
        .cb-copy (eyebrow + title + body + 정책 링크 2개)
        .cb-actions (Reject · Customize · Accept all)
    <ConsentModal />                           — Customize 클릭 시
      .modal-scrim (backdrop blur 4px)
        .modal
          .modal-head (icon · eyebrow · title · KO/EN switch · close)
          .modal-body
            .cat-list
              .cat[data-locked="essential"]    — 잠금
              .cat (FUNCTIONAL · ANALYTICS · MARKETING)
                .toggle
          .modal-foot
            .modal-foot-status (default · saving · saved)
            .modal-foot-actions (Essentials only · Save preferences)

<PolicyShell> (.policy-shell)                  — /policies/[type]
  <PolicyNav> (.policy-nav)                    — 좌측, 데스크탑
    4 문서 링크 + "이의신청" 카드
  <PolicyMain>
    <PolicyDocSwitch> (.policy-doc-switch)     — 모바일 chip
    <PolicyHeader> (.policy-header)
      eyebrow + title + sub + meta + KO/EN
    <PolicySkel> (skeleton, loading 상태)
    <PolicyContent> (마크다운 렌더링)
  <PolicyAnchorBar> (.policy-anchor-bar)       — 모바일 하단 anchor select
```

### 핵심 디자인 토큰 (시안에서 추출 · 라이트 테마)

```css
/* 배경 */
--color-bg-light:        #F2F2F5
--color-surface-light:   #FFFFFF
--color-surface-soft:    #F8F8FB

/* 텍스트 */
--color-text-light:      #0E0944
--color-text-sub-light:  #3A4570
--color-text-muted-light:#8C99B3

/* 보더 */
--color-border-light:    #D4DCE3
--color-border-soft:     #E6EAF0

/* 텍스트 앵커 (Twilight Indigo) */
--color-royal:           #241754
--color-deep-twil:       #0E0944

/* 골드 (테마 공통) */
--color-gold:            #FCD006
--color-gold-hover:      #E3BB05
--color-gold-bright:     #FBB03B
--color-gold-subtle:     rgba(252,208,6,0.12)
--color-gold-glow:       rgba(252,208,6,0.25)
--color-aura:            #EEDA7D

/* 시맨틱 */
--color-crimson:         #D7063A   /* 에러·MARKETING 잠금 OFF 표시 */
--color-turquoise:       #00A3B7   /* 성공·Saved 체크 */

/* 그림자 */
--shadow-light:    0 1px 2px rgba(36,23,84,0.06), 0 8px 24px rgba(36,23,84,0.06)
--shadow-gold:     0 0 28px rgba(252,208,6,0.30)
--shadow-gnb:      0 10px 30px rgba(36,23,84,0.10)
--shadow-modal:    0 24px 60px rgba(14,9,68,0.22)
--shadow-banner:   0 -8px 30px rgba(14,9,68,0.10)

/* 반경 — 세 가지만 */
--radius-rect:   0
--radius-border: 5px
--radius-chip:   999px
```

### 반응형 브레이크포인트 (Container Query)

| 구간 | 조건 | 주요 변화 |
|---|---|---|
| 데스크탑 | 기본 (≥ 901px) | PolicyShell 2열(280px + 1fr), 모달 560px 중앙 |
| 태블릿 | `@container (max-width: 900px)` | PolicyShell 1열, 사이드 네비 가로 wrap, 모달 약간 좁아짐 |
| 모바일 | `@container (max-width: 480px)` | PolicyNav 숨김 → docSwitch chip + anchor select, 모달 bottom sheet, 배너 버튼 세로 스택 |

---

## 7. Test Plan

### 수동 테스트 (10개 시나리오)

1. **첫 방문 (시크릿 모드)** → 배너 자동 표시 + 슬라이드 업 애니메이션 확인
2. **Accept all 클릭** → Firestore Console에서 `cookie_consents/{uid}` 문서 생성 확인 (essential·functional·analytics·marketing 모두 true)
3. **Reject 클릭** → 새 시크릿 모드, essential만 true 저장 확인
4. **Customize 클릭** → 모달 열림, ESSENTIAL 토글 disabled 확인, MARKETING 기본 OFF 확인
5. **모달 KO/EN 토글** → 텍스트 스왑 동작 확인
6. **모달 키보드 트랩** → Tab으로 순환, Shift+Tab 역순환, Escape로 닫기 확인
7. **저장 시 spinner → ✓ Saved** → reduced motion 시 즉시 saved 확인
8. **/policies/cookies → terms → community → privacy** 4 라우트 모두 정상 렌더
9. **KO/EN 토글** → content/ko/* ↔ content/en/* 스왑 확인
10. **푸터 "쿠키 설정 다시 열기"** → 배너 재표시 확인

### 반응형 테스트 (3 브레이크포인트 × 3 surface = 9개)

- 375 / 768 / 1440 × Banner / Modal / Policy 각각

### 자동 테스트 (Superpowers TDD 권장)

- Unit: `cookieConsent.ts` — 12개월 만료 체크, 빈 동의 기록 처리
- Unit: `ConsentModal` — MARKETING 기본 false, ESSENTIAL 잠금
- Integration: 동의 저장 → Firestore 문서 확인
- E2E: 첫 방문 → Customize → 저장 → 재방문 시 배너 비표시

---

## 8. Analytics Events

```
이벤트명                  파라미터                              발생 시점
cookie_banner_view       { variant: 'first' | 'reopened' }    배너 노출 시
cookie_accept_all        { categories: 'all' }                 Accept all 클릭
cookie_reject            { categories: 'essential_only' }      Reject 클릭
cookie_customize_open    { }                                    Customize 클릭(모달 오픈)
cookie_save              { functional, analytics, marketing }  선택 저장 클릭
cookie_lang_switch       { from, to, surface: 'modal'|'policy'} KO/EN 토글 시
policy_view              { type: 'terms'|... , lang: 'ko'|'en'} 정책 페이지 진입
policy_section_view      { section_id }                        스크롤 진입(50% 노출 시)
policy_report_link_click { source: 'footer'|'nav' }            "Report content" 클릭
```

⚠️ **주의**: `cookie_save`의 marketing이 true일 때만 analytics 이벤트가 실제로 발송되는 흐름이 맞아야 합니다 (analytics가 false이면 이 이벤트조차 보내면 안 됨 — circular consent 주의).

---

## 9. 알려진 함정 (Cowork이 미리 파악한 위험)

1. **Domain 5만 라이트 테마** — A-0 Launch Pad는 다크. 글로벌 CSS 변수를 그대로 덮으면 다른 페이지가 깨짐. **wrapper 클래스(`<div data-theme="light">`) 또는 `[data-domain="5"]` 스코프 필수**.

2. **MARKETING 토글 lite-spec과 시안 충돌** — lite-spec은 `marketing: false 고정`, 시안은 사용자가 켤 수 있음. **시안 우선** — 단, 실제 광고 네트워크는 아직 미도입이라 marketing=true여도 동작은 동일.

3. **Cloudflare 이메일 난독화 코드** — 시안 HTML의 `cdn-cgi/l/email-protection` 스크립트는 정적 HTML 보호용. **React에선 그냥 `<a href="mailto:policy@worldcrown48.com">`** 사용. 시안 코드 복사하면 깨짐.

4. **`renderPolicy()` 자바스크립트 패턴** — 시안의 vanilla JS 패턴(`innerHTML` 직접 조작)은 React에서 위험. **react-markdown으로 변환**해서 React 컴포넌트로 정합하게 렌더.

5. **모달 키보드 트랩** — `focus-trap-react` 라이브러리 사용 권장. 직접 구현 시 `Tab`/`Shift+Tab` 순환 + 최초 focus 위치 + Escape 처리 모두 필요.

6. **Container Query 부모 설정** — `@container` 쿼리가 동작하려면 부모에 `container-type: inline-size` 명시. PolicyShell wrapper에 반드시 적용.

7. **마크다운 frontmatter 파싱** — content/*.md 파일 상단에 YAML frontmatter(title, type, lang, lastUpdated, version) 있음. `gray-matter`로 파싱해서 메타 데이터 추출 + 본문은 react-markdown에 전달.

8. **IP 해시 처리 위치** — 클라이언트에서 IP 평문 노출은 GDPR 위반 소지. **Cloud Function `hashIp`** 만들어서 서버사이드 SHA-256. cookie_consents 저장 시 ipHash만 기록.

9. **첫 방문 판별 로직** — `cookie_consents/{uid}` 문서가 있고 `timestamp + 12개월 > now` 이면 배너 미표시. 둘 다 만족하지 않으면 표시. **로그인 전(uid 없을 때)는 익명 uid(Firebase Anonymous Auth) 사용**.

10. **라이트 테마 글래스모피즘** — 시안의 `backdrop-filter: blur(14px)` GNB·배너에 적용. Safari 구버전에서 동작 안 함 → `@supports` 폴백 필요.

11. **MARKETING 카테고리 충돌 시 안전망** — 사용자가 MARKETING 켰지만 아직 광고 네트워크 미도입 → analytics 이벤트만 발송. **실제 광고 쿠키는 향후 도입 시 사전 공지 + 재동의** (cookies.md §2 명시됨).

12. **Footer "Report content" 링크** — 전 페이지 푸터에 노출되어야 함. `app/layout.tsx`의 footer 영역에 추가. `mailto:report@worldcrown48.com`.

---

## 10. 핸드오프 종료 조건

Claude Code가 PR을 제출하면 대표님이 다음을 확인:

```
☐ Acceptance Criteria 전 항목 통과 (Banner 5 + Modal 8 + Policy 9 + 전역 7 = 29개)
☐ Hard Constraints 위반 0건
☐ CLAUDE.md 불변 원칙 위반 0건 (특히 #1 라이트 테마, #4 AI-Report 금지, #5 FIFA 금지)
☐ LANGUAGE.md 금지 용어 사용 0건
☐ 정책 본문 8개 md 파일이 그대로 렌더 (편집 없음 — Cowork 작성본 사용)
☐ Test Plan 수동 10개 시나리오 통과
☐ 3 브레이크포인트 × 3 surface = 9개 반응형 통과
☐ Vercel Preview 배포 동작 확인
☐ Firestore Security Rules 배포 (cookie_consents 컬렉션)
☐ Firestore Console에서 실제 저장 동작 확인
☐ Cloud Function hashIp 배포 + 동작 확인
☐ public/ 에셋 포함 (브랜드 SVG)
```

그 후 → main 머지 → Vercel 프로덕션 자동 배포 → A-0과 같은 패턴으로 검증.

---

## 부록 A — 정책 본문 파일 매핑

| URL | 파일 (ko) | 파일 (en) |
|---|---|---|
| `/policies/cookies` | `content/ko/cookies.md` | `content/en/cookies.md` |
| `/policies/community` | `content/ko/community.md` | `content/en/community.md` |
| `/policies/terms` | `content/ko/terms.md` | `content/en/terms.md` |
| `/policies/privacy` | `content/ko/privacy.md` | `content/en/privacy.md` |

모든 파일 상단에 YAML frontmatter (`title`, `type`, `lang`, `lastUpdated`, `version`) 있음.

## 부록 B — Firestore 스키마

### Collection: `cookie_consents/{uid}`

```ts
interface CookieConsent {
  uid: string                    // Firebase Auth UID (anonymous OK)
  essential: true                // 항상 true (강제)
  functional: boolean
  analytics: boolean
  marketing: boolean             // 기본 false
  timestamp: Timestamp           // serverTimestamp()
  expiresAt: Timestamp           // timestamp + 12개월
  ipHash: string                 // SHA-256 by Cloud Function
  lang: 'ko' | 'en'              // 동의 시 언어 (증빙)
  version: string                // policy 버전 (예: "1.0")
}
```

### Security Rules 추가

```
match /cookie_consents/{uid} {
  allow read, write: if request.auth.uid == uid;
}
```

## 부록 C — i18n 전역 상태

cookies·community·terms·privacy 4개 페이지가 공유하는 lang state는 다음 우선순위로 결정:

1. URL 쿼리 `?lang=ko|en` (있으면 즉시 적용)
2. localStorage(불가) → Firestore에 저장된 사용자 preference (로그인 시)
3. 브라우저 `navigator.language` (`ko-KR` → ko, 그 외 → en)
4. 기본값: en (글로벌 우선)

Zustand store 또는 React Context로 구현. 페이지 진입 시 결정, KO/EN 토글 클릭 시 즉시 갱신.

---

*Handoff Brief v1.0 · E-1 Policy Hub · WorldCrown48 · 2026-06-11*
*© 2026 WorldCrown48 · CONFIDENTIAL*
