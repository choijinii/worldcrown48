# 🛑 STOP — 모든 작업 전 필독

> **`docs/mental-model/MENTAL_MODEL.svg`** 를 먼저 본다.
> 어떤 코드·디자인·문서 작업도 이 한 장을 보지 않고는 시작하지 않는다.
>
> **인프라 작업(배포 · 환경변수 · DNS · Functions) 전**
> **`docs/principles/VERIFICATION_DISCIPLINE.md`** 4대 원칙(P1~P4)을 함께 확인한다.
>
> **확정 결정은 `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md`(결정 원장)에 있다.** 이 파일과 원장이 다르면 **원장이 이긴다** — 이 파일을 원장에 맞춰 고친다.
>
> 충돌 시 우선순위: **결정 원장 > MENTAL_MODEL.svg ≥ VERIFICATION_DISCIPLINE.md > LANGUAGE.md > 기타**

---

# WorldCrown48 — CLAUDE.md v2.8 (핵심 압축판)
# 에이전트 진입점 — 가장 먼저 읽는 파일
# v2.8 (2026-10-04): 결정 원장 우선 · 테마 지도(D-40) · 디자인 정본(D-20) · 익명 계정(D-41) · 런칭 순서(D-36) · 사이트맵(D-42) 외 12곳
# v2.7 (2026-09-24): Crown Score v1.0 · 차트 상시 공개(D-30) · Pick Now(D-23) · 대관 연출 폐기(D-24)
# v2.6 (2026-09-07): 참가 규칙 v2.1(게스트 3판·공유 개방·랭킹 제외) 전파 + "표" 낱말 금지
# v2.5 (2026-08-16): AI 스택 실측 정정 (모델 ID 2개 + 단일 소스 models.ts)
# v2.4 (2026-08-13): 기술 스택 표 실측 동기화 + 색 토큰 규칙(불변 원칙 #2-1)
# v2.3 (2026-08-08): 확정 결정 동기화 — AI-Report v2.5 · 3언어 라이브 · 표시 용어 층 · Stale-Doc Guard
# v2.2 (2026-07-11): 대개편 반영 — Taxonomy·Bracket Size·Crown Score·Ranking Scope Lock

## ⛔ IMMUTABLE TERMINOLOGY RULE
RULE 1: 기존 용어 정의 절대 변경 금지.  RULE 2: 새 개념 → 새 용어 생성. 재정의 금지.
단일 진실 공급원: `LANGUAGE.md` | 용어 충돌 시 우선순위: LANGUAGE.md > CONTEXT_v0_6.md > 기타

---

## 📁 문서 체계

| 파일 | 내용 |
|------|------|
| **🛑 docs/mental-model/MENTAL_MODEL.svg** | **멘탈 모델 한 장 — 최상위 진입점 (반드시 가장 먼저 본다)** |
| docs/mental-model/MENTAL_MODEL.md | 멘탈 모델 캡션·자가진단 |
| docs/mental-model/CLEANUP_PLAN.md | 문서 중복 정리 계획 (실행 기준) |
| **outputs/DECISIONS_결정원장_v1.0_2026-09-11.md** | **결정 원장 — 대표 확정 결정(D-01~) 네 줄 형식(무엇·정의·왜·아니라고 한 것). 모든 문서보다 우선** |
| CLAUDE.md | 이 파일 — 에이전트 진입점 + 핵심 원칙 요약 |
| DESIGN_BRIEF.md | 디자인 진입점 — 금지 패턴 + 컬러 토큰 |
| LANGUAGE.md | 공식 용어 정의 (단일 진실) |
| CONTEXT_v0_6.md | 프로젝트 현황 요약 (파일명 정정 — `CONTEXT.md`는 존재하지 않음) |
| docs/CODING_GUIDELINES.md | Karpathy 코딩 행동 규칙 4가지 (코드 작업 시 필독) |
| 클로드 디자인 "WorldCrown48 Design System" | **디자인 정본(D-20)** — 색·크기·부품 값은 여기서만 바뀐다 |
| docs/design/colors_and_type.css · kit.css | 클로드 디자인이 **내보낸 사본** — 손으로 고치지 않는다 |
| docs/design/WC48_DESIGN_SYSTEM_v4.md / .html | 해설서(뜻·규칙·원장 인용). v2.3·v2.4 문서는 **옛 기록** |
| marketing/00_strategy/D-42_런칭로드맵_v1.1_2026-08-27.html | 런칭 로드맵 v1.1 — 런칭 목표일 **2026-10-08** |
| docs/lite-specs/ | 도메인별 기능 스펙 |

---

## 🎯 서비스 정체성 (절대 불변)

월크48 = 팬이 좋아하는 Contestant를 투표하는 서비스 (이상형 월드컵 방식)
절대 금지: 우승자 예측·베팅, 실제 경기 결과 연동, Vote Count(절대 수치) UI 노출
— Vote Count 절대 수치는 **차트 포함 어디에도** 표시하지 않음(트래픽 종속 값이라 무의미).
   차트 화면의 수치는 **Crown Score 하나** → 대진 흐름 #8 (Crown Score v1.0, 2026-09-23)

---

## 🔒 불변 원칙 8가지

| # | 원칙 | 규칙 |
|---|------|------|
| 1 | 듀얼 테마 | **다크 = 매치 무대 · The Lab · 차트 · Launch Pad. 그 밖은 전부 화이트**(The Pitch · 아레나 홈 · 크라운 카드 · 뉴스룸 · Policy Hub · Locker Room · Admin) — 원장 D-38 → **D-40**(2026-10-03). ~~Domain 0~3 다크 / 4~6 라이트~~는 폐기. 값 → 클로드 디자인 정본(D-20) |
| 2 | Crown Gold | 포인트 컬러 #FCD006만 (로고 v3.0 기준). 형광 노랑·그린 금지 |
| 2-1 | 색은 토큰만 | **컴포넌트에 raw hex 금지, `var(--color-…)` 토큰만 사용.** 값의 단일 진실 = `app/globals.css`. 외부 브랜드 색 등 예외는 `scripts/hex-allowlist.json`에 사유와 함께 등록 (가드: `npm run check:hex` · CI: hex-guard.yml) |
| 3 | 글로벌 | 한국적 요소 금지. 글로벌 MZ Sporty 럭셔리 |
| 4 | AI-Report | 표기: "✦ AI-Report" — 기사 푸터 1곳 전용(Footer-Only Lock), 8px·50%. "AI GENERATED"·카드 배지 완전 폐기 (v2.5, 2026-07-22) |
| 5 | FIFA 금지 | "FIFA"·"Official" 표기 금지 |
| 6 | 이미지 소싱 | Level 1 자동허용(CC) / Level 2 수동승인(SNS) / Level 3 절대금지(딥페이크·미성년자) |
| 7 | 웹 전용 | 모바일 앱 없음. Flutter 전환 계획 없음 |
| 8 | 스택 고정 | Next.js 14 + Firebase. 변경 시 ADR 필수 |

---

## 🏆 대진 흐름 핵심 원칙 (v0.3)

1. Tournament에만 Deadline 존재. **Round Deadline = 없음**
2. 라운드 전환: Voter가 해당 Round 마지막 Match 완료 → `advanceRound()` 자동 실행
3. Match는 Voter에게 순서대로 1개씩 제시 (동시 진행·건너뛰기·직접 선택 불가)
4. **THE FINAL(결승)** = 3명 동시 표시 → Voter가 1명 직접 선택. 1v1 매치 2개로 쪼개지 않음
5. **Round 정보는 라운드 전환 ANNOUNCEMENT에서만 표시**. 매치 화면에는 Round 배지·HUD 없음. (Voter는 관중이 아닌 선수 — "N강 · X/Y" 같은 진행 HUD는 관중 환상)
6. 라운드명: `ROUND OF 48` → `ROUND OF 24` → `ROUND OF 12` → `ROUND OF 6` → `THE FINAL`
7. 금지 라운드명: `ROUND OF 16`, `QUARTERFINAL`, `SEMIFINAL` (FIFA 표준 — WC48에 없음)
8. Vote Count(절대 수치)는 어디에도 표시 금지. **차트(구 랭킹) 화면에 나가는 수치는 Crown Score 정수 하나뿐**이다. 순위 기준 = **Crown Score = (순위점수율×0.4 + 우승율×0.3 + 점유율×0.3) × 1000** → 0~1000 (**v1.0, 2026-09-23 대표 확정** · 정본 `marketing/00_strategy/CROWN_SCORE_v1.0.md`). 세 비율은 캐시에 저장만 하고 화면에 나열하지 않는다. 점수 옆 **? 설명창 = 계산식 안내 공통 문구 하나**. 완주 판수 **10판** 미만이면 점수 없이 기다림 안내(차트로 가는 길은 숨기지 않는다). ~~우승비율×50% + 점유율×50%~~(2026-07-11)·~~우승비율→점유율→승률 3종 나열~~·~~Vote Rate/득표율~~은 **폐기**
9. **Ranking Scope Lock (2026-07-11)**: Crown Score·차트 지표는 **차트 도메인 + AI 뉴스 소재**로만 사용. 매치(배틀)·Crown Card 사용 금지
10. **Bracket Size — 런칭 후 (D-09, 2026-09-11)**: 런칭 때는 **48강 하나뿐**이다. 크기 고르기(12/24/48강 등)는 선택 엔진 전체를 건드려야 해서 **런칭 후** 작업. ~~Voter가 시작 시 12/24/48강 선택~~(2026-07-11 구상)은 지금 규칙이 아니다
11. **차트 상시 공개 (D-30, 2026-09-23)**: 차트는 **대회 마감 전에도, 로그인하지 않아도** 열린다. 마감 전 잠금(W-7)은 폐기 — `firestore.rules` 의 마감 게이트와 화면의 `locked` 상태를 함께 제거했다
12. **대관 연출 폐기 (D-24)**: 우승의 감정은 Crown Card가 맡는다. 대관 연출(Crown Ceremony)은 만들지 않으며 `ceremony_viewed`·`ceremony_skipped` 계측도 만들지 않는다
13. **익명 계정 생성 자리 (D-41, 2026-10-04)**: 익명 계정은 ① 쿠키 동의 버튼을 눌러 저장할 때 ② 아레나 입장 ③ 크라운 카드 입장, **이 세 곳에서만** 만든다. 페이지를 열기만 해서는 만들지 않는다. 허용 파일 = `lib/firebase.ts`(정의) · `lib/auth/useGuestUidOnEntry.ts` · `components/policy/CookieConsentProvider.tsx` — 그 밖에서 부르면 `lib/__tests__/auth/anonCreationSites.test.ts`가 막는다

**Voter 전체 흐름 (런칭 시 48강 고정):**
```
ROUND OF 48 (24 Match) → ROUND OF 24 (12 Match) → ROUND OF 12 (6 Match)
→ ROUND OF 6 (3 Match) → THE FINAL (3명 중 1명 선택)
→ Champion 확정 → Crown Card 생성 → SNS 공유
```

---

## 🛠️ 기술 스택

```
프론트엔드:  Next.js 14 (App Router) + TypeScript 5.5
스타일:     CSS 변수(app/globals.css = 토큰 원장) + CSS Modules + inline style
애니메이션:  CSS transition / keyframes
상태:       Zustand 5
차트:       Recharts 2
백엔드:     Firebase (Firestore + Auth + Cloud Functions · 실행 환경 Node.js 22 — D-33)
            ※ Realtime DB는 쓰지 않는다 (코드·firebase.json 검색 0건, 2026-10-04)
AI:         Claude API (@anthropic-ai/sdk) — 단일 소스: functions/src/core/models.ts
            · SONNET = claude-sonnet-5   (48명 채우기 · thinking 비활성 명시)
            · HAIKU  = claude-haiku-4-5  (키워드 · 번역 · 뉴스 초안)
호스팅:     Vercel (프론트) + Firebase (백엔드) + Cloudflare
도메인:     worldcrown48.com
SEO:        app/sitemap.ts + app/robots.ts — 넣고 빼는 규칙 = lib/seo/sitemapEntries.ts
            · 언어별 주소(?lang=ko|en|es)와 기본 주소를 서로 가리키게 함 (D-42)
```

> ⚠ **없는 것 — 있다고 착각하기 쉬운 순서대로**
> `Tailwind CSS` · `Shadcn/UI` · `framer-motion` — **미설치.** v2.3까지 이 표에
> 적혀 있었으나 package.json에 없었다. 클래스 유틸리티나 `motion.div`를 쓰면
> 빌드가 깨진다. 스타일은 CSS 변수 + CSS Modules, 움직임은 CSS로 만든다.
> 패키지 매니저는 **npm**(`package-lock.json`) — pnpm 아님.

---

## 🗺️ 7개 도메인

| 도메인 | 이름 | 테마 | MVP |
|--------|------|------|-----|
| Domain 0 | Launch Pad (사전등록) | 🌑 다크 | MVP 1 |
| Domain 1 | The Pitch | ☀️ 화이트 (전환은 THUMB-1과 한 묶음 — D-39) | MVP 1 |
| Domain 2 | The Lab | 🌑 다크 | MVP 1 |
| Domain 3 | The Arena — 매치 무대(`/arena/{id}`, 라운드 전환·결승 포함) | 🌑 다크 | MVP 1 |
| Domain 3 | The Arena — 차트(`/arena/{id}/ranking`) | 🌑 다크 (D-40) | MVP 1 |
| Domain 3 | The Arena — 아레나 홈(대기실 · 마감 대회 게시판 D-37) | ☀️ 화이트 (ARENA-2) | MVP 1 |
| — | Crown Card | ☀️ 화이트 (크라운 카드 새 디자인 때) | MVP 1 |
| — | 뉴스룸 | ☀️ 화이트 (뉴스룸 승격 때) | MVP 1 |
| Domain 4 | The Locker Room | ☀️ 화이트 | MVP 2 |
| Domain 5 | Policy Hub | ☀️ 화이트 | MVP 1 |
| Domain 6 | Admin Dashboard | ☀️ 화이트 | MVP 1 |

> 정본 = 원장 **D-40**(D-38을 바꿈, 2026-10-03). ⚠ 지금 코드의 피치·크라운 카드는 아직 다크다 — 위 표는 **목표**이며, 전환 시점은 런칭 전 순서(아래 🚀)를 따른다. 새로 만드는 화면은 처음부터 이 표대로 만든다.

---

## 📝 필수 용어 (상세 → LANGUAGE.md)

| ✅ 공식 용어 | ❌ 금지 |
|-------------|---------|
| Tournament | 대회, 이벤트, 게임 |
| Contestant | Candidate, 참가자, 후보자 |
| Match | Battle, 배틀, 경기 |
| Voter | 참여자, 유저 |
| Champion | 우승자, 1등 |
| Crown Card | 결과 이미지, 결과 카드 |
| Tournament Deadline | Round Deadline (없는 개념) |
| **Crown Score** (차트의 유일한 표시 수치) | Vote Rate, 득표율 (**폐기** 2026-09-23) |
| **차트 (Chart)** — 대회별 순위표의 이름 | 랭킹 (화면 이름으로 금지 · 차트 속 등수를 뜻하는 일반 명사로만) |
| **엔트리** — Contestant의 한국어 표기 (D-31, 화면 적용은 The Pitch 개편 때) | 참가자, 후보자 |
| **참가하기 / Pick Now / Elige ahora** (D-23) | Vote Now |
| Crown Score | 점수, 스코어, 랭킹 점수 (임의 명칭) |
| **Run (판)** | 회, 게임, 라운드 — 참가를 세는 단위는 **판** |
| **Daily Run Limit (일일 판 한도)** | Daily Vote Limit, Daily Participation Limit, "하루 새 대회 5개", "1일 5표" (전부 폐기) |
| **선택** (Voter가 Match에서 한쪽을 고르는 행위의 표시 용어) | **"표"** — 낱말 자체 금지 (게스트 표·내 표·부정표). 코드 내부 `vote`는 예외 |
| Voter Count | Vote Count와 혼용 (완전 별개 개념) |
| `active` | `In Progress` |

### ⚖️ 참가 규칙 (정본 = LANGUAGE.md §2 판·일일 판 한도·게스트 일일 판 한도 · v2.0 2026-09-03 + v2.1 2026-09-06 대표 확정)

- **판(Run)** = 한 Voter가 한 Tournament를 48강→결승까지 완주하는 한 번의 여정. **참가를 세는 유일한 단위.**
- **로그인 한도 = 계정당 · 대회당 · 하루(KST) 5판.** 대회마다 각각 5판. 판마다 **대진표 재섞기 + Crown Card 1장**, 5판 전부 랭킹 반영. (v2.0 — v2.1에서 변경 없음)
- **게스트(비로그인) = 하루 통틀어 3판** (v2.1). 대회 자유 선택, **대회 수가 늘어도 3판 고정.** 4판째부터 로그인.
- **게스트 Crown Card: 공유는 열림(UTM 동일 규격 + `is_guest` 이벤트 파라미터) · 저장·다운로드는 로그인 필요** (v2.1).
- **★ 게스트의 선택은 랭킹 집계에서 제외** (v2.1 · 앞으로만, 소급 없음 — 2026-09-07). 이유: 게스트 uid는 브라우저 창마다 새로 생겨 사람 단위 상한이 없다 → 랭킹에서 빼면 조작 동기가 사라지고 "내 선택이 랭킹에 반영되려면 로그인"이 가입 유인이 된다.
- 🚫 **"표"는 낱말 자체가 금지어다** (2026-09-07 대표 확정 — 단위 금지에서 승격). "게스트 표"·"내 표"·"1일 5표" 전부 금지, 대체어 = **선택**. `votes`·`Vote`는 DB·코드 내부 이름일 뿐.
- ⚠️ **코드 상태(2026-09-24)**: 게스트 판의 랭킹 제외는 **ARENA-1 PR 3에서 판 단위로 구현**됐다(한 판에 게스트 선택이 하나라도 있으면 그 판 전체 제외 · 2026-09-07 이전 기록은 소급 없이 집계 포함). 규칙 인용은 반드시 LANGUAGE.md에서.

---

※ **표시 용어(Display) 층 v2.0 (2026-08-06)**: 독자 노출 텍스트의 Voter = **"팬"(ko) / "Fan"(en·es)**.
   위 표는 **시스템 층**(공식 용어·코드·DB)이며 불변. 상세 → **LANGUAGE.md §1**
   이름 없는 사용자의 기본 표시 이름 = **팬(ko) / Fan(en·es)** (원장 D-32, 2026-09-24). ~~기본 닉네임 "Voter" 유지~~ 예외는 **폐기**

---

## 🚀 런칭 목표일과 런칭 전 순서

- **런칭 목표일 = 2026-10-08(목)** · 기준 문서 = `marketing/00_strategy/D-42_런칭로드맵_v1.1_2026-08-27.html`
- 일정은 **재기준하지 않는다**(원장 D-10). 목표일은 고정해 두고, 밀리면 "그만큼 밀렸다"로 적는다.
- **런칭 전 작업 순서 (원장 D-36 + D-39 + D-40)**: **E2E-1 → COOKIE-1 → NAV-1 → THUMB-1(+피치 화이트 전환) → FONT-1 → ARENA-2(아레나 홈, 화이트) → 크라운 카드 새 디자인(화이트)**. BANNER-1은 런칭 후. ~~THEME-1~~은 D-40으로 폐기.
- 첫 런칭 카테고리 = **K-POP · 크리에이터**. 그 뒤 카테고리의 날짜는 10/8 런칭 기준으로 다시 정한다(아래 대개편 표의 7~11월 날짜는 옛 계획).

## 🚀 MVP 마일스톤 (옛 계획 기록 — 현행 일정은 위 절)

| 단계 | 시기 | 핵심 | 언어 |
|------|------|------|------|
| MVP 1 | 2026-05-31 | Domain 0~3+5~6, 투표 엔진, Crown Card | ko + en |
| MVP 1.5 | 2026-06-10 | 관리자 수동 Fan Intelligence 생성 | ko + en |
| MVP 2 | 2026-07 | AI 뉴스 자동화, Locker Room, 다국어 | ko + en + es |
| MVP 3 | 2026 하반기 | PR 자동화, B2B SaaS | + 추가 미정 |

※ **2026-07-01 결정**으로 3언어(ko/en/es) 아키텍처는 **조기 적용되어 이미 라이브**다 (언어 토글·UI 사전·뉴스 3언어·Lab 제목).
   위 표의 "MVP 2 = es"는 **당초 계획 기록**이며 현행이 아니다. es 잔여 3곳(정책 문서 `content/es`·동의창 ConsentModal·`/account`)은 **Pitch 개편 es 커버리지 스윕**에서 처리 (2026-08-08 대표 결정).

---

## 🔄 2026-07 대개편 (v2.2 박제 — 상세: outputs/handoffs-staging/WC48_개편결정_v1_2026-07-10.md v1.2)

| 결정 | 내용 |
|------|------|
| **Category Taxonomy** | 카테고리 = 코드 enum이 아닌 **Firestore `categories` 컬렉션 데이터** (status: hidden/scheduled/live · phase · order). 구현 모듈 = TX-0 |
| **3단계 순차 런칭** | 1차 K-POP·CREATOR → 2차 K-DRAMA·E-SPORTS → 3차 ANIME & WEBTOON·GLOBAL POP·HOLLYWOOD. **FOOTBALL = hidden 대기**(폐기 아님). 옛 날짜(1차 7월 말–8월 말, 2차 9–10월, 3차 11월부터)는 지남 — 1차는 **10/8 런칭**과 함께 |
| **The Pitch = 발견** | 카테고리 섹션형(가로 스크롤 row) + 상단 동적 히어로(인기순, 매치 화면에 Round 배지·수치 없음) |
| **Arena 홈 = 활동** | 신설 — 이어하기·내 기록·카테고리 nav (Pitch와 역할 분리) |
| **우측 상설 프레임** | 뉴스뷰+배너: Pitch·Lab·Arena·Locker Room 적용, **매치·Crown Card 제외**. 모바일 = 피드 인라인. Arena 뉴스룸 계획 대체 |
| **Crown Card** | 팝업화 보류 — **기존 페이지 방식 유지** (SNS 공유 URL이 핵심) |
| **Bracket Size** | **런칭 후로 미룸 (D-09)** — 런칭 때는 48강 하나. 대진 흐름 #10 |
| **Crown Score** | ~~랭킹 순위 = 우승비율×50% + 점유율×50%~~ → **v1.0(2026-09-23)으로 대체** — 대진 흐름 #8·#9 |
| **Voters 이벤트** | Voter Count(참여자 수)는 노출 가능 — "1,000 팬 모으기" 등 런칭 이벤트 소재 (독자 노출 카피이므로 표시 용어 적용 → LANGUAGE.md §1) |

---

## 🔁 Stale-Doc Guard — 결정 ↔ 문서 동기화 (2026-08-08 신설)

> **복사된 규칙은 반드시 낡는다.** 확정 결정이 문서에 안 실리면 다음 세션이 낡은 문서를 믿고 오답한다.
> (실제 사고: 2026-08-08 "es는 MVP 2 언어" 오답 — 결정은 2026-07-01에 났는데 문서가 그대로였다)

**결정을 낼 때 (생산자 규칙)**
- 대표 결정이 확정되면 **같은 킥/세션 안에서** `CLAUDE.md` · `LANGUAGE.md` · `CONTEXT_v0_6.md` · 관련 `docs/lite-specs/` · 코드 주석을 **grep 스윕해 갱신**한다.
- 그 세션에서 갱신이 불가능하면 → **명시 태스크를 즉시 생성**한다. "나중에"는 없다.

**문서를 인용할 때 (소비자 규칙)**
1. 하위 문서(lite-spec 등)의 규칙을 적용하기 전에 그 **부모(단일 진실)** 문서를 함께 연다. (용어 → LANGUAGE.md / 표기·시각 → 최신 디자인 시스템 / 구조 → CLAUDE.md)
2. 부모의 **최신 버전·날짜**를 확인한다. 하위 문서가 부모 개정보다 오래됐고 같은 주제를 다루면 → **부모가 이긴다.**
3. 충돌 발견 시 임의 적용 금지 → **보고 후 하위 문서를 동기화**한다.

**충돌 우선순위**: 문서와 결정이 충돌하면 **결정 원장(`outputs/DECISIONS_결정원장_v1.0_2026-09-11.md`)이 우선**한다. 2026-09-12부터 확정 결정은 원장에 **네 줄 형식(무엇 · 정의 · 왜 · 아니라고 한 것)**으로 적는다. 원장에 없는 옛 결정만 `outputs/handoffs-staging/` 확정본을 본다.

**원칙: 하위 문서는 규칙을 '복사'하지 말고 부모를 '가리킨다'.**

---

## 📌 개정 이력

| 버전 | 날짜 | 주요 변경 |
|------|------|-----------|
| **v2.8** | **2026-10-04** | **★ 중간 점검 12곳 반영.** ① 결정 원장을 최상위 우선순위·문서 체계에 넣음 ② 불변 원칙 #1·도메인 표를 **테마 지도 D-40**으로 교체(다크 = 매치 무대·The Lab·차트·Launch Pad) ③ 디자인 정본 = **클로드 디자인(D-20)**, v2.3 문서는 옛 기록 ④ 대진 흐름 #10 Bracket Size = **런칭 후(D-09)** ⑤ 기본 표시 이름 **팬/Fan(D-32)** ⑥ 원칙 #13 **익명 계정 생성 자리 셋(D-41)** ⑦ 런칭 목표일 10/8 + 로드맵 v1.1 위치 ⑧ **런칭 전 순서(D-36)** ⑨ Realtime DB 표기 삭제 ⑩ Cloud Functions **Node.js 22(D-33)** ⑪ 대개편 표 카테고리 날짜 정리 ⑫ **사이트맵·hreflang(D-42)** 파일 위치 |
| **v2.7** | **2026-09-24** | **★ ARENA-1 PR 3 — Crown Score v1.0 전파.** 원칙 #8을 정본(`marketing/00_strategy/CROWN_SCORE_v1.0.md`) 산식으로 교체(40:30:30 × 1000 · 화면은 점수 하나 · 10판 기준) · 옛 50:50 산식과 "우승비율→점유율→승률 3종"·"Vote Rate/득표율"을 **폐기 표시** · 원칙 #11 **차트 상시 공개(D-30)** · #12 **대관 연출 폐기(D-24)** 신설 · 필수 용어 표에 차트·엔트리·참가하기/Pick Now 추가 |
| **v2.6** | **2026-09-07** | **★ 참가 규칙 v2.1 전파(게스트 정책 · 2026-09-06 대표 확정) + "표" 낱말 금지 승격(2026-09-07).** ⚖️ 절 재작성: 게스트 하루 통틀어 3판(대회 수 무관) · 공유 개방/저장 잠금 · **게스트의 선택 랭킹 제외(소급 없음)** · 금지어 "표"는 낱말 자체로 확대(대체어 "선택") · 코드 상태 줄을 "PR 1 배포, PR 2·3 진행 중"으로 갱신. 필수 용어 표 Run 행 각주 정정 |
| **v2.5** | **2026-08-16** | **★ AI 스택 실측 정정 (AI-1).** 기술 스택 표 AI 줄이 `claude-sonnet-4-20250514`로 적혀 있었으나 코드에 없는 모델이었다(Stale-Doc Guard 재발). 실측 모델 2개(`claude-sonnet-5` · `claude-haiku-4-5`) + **단일 소스 = `functions/src/core/models.ts`** 명시. Sonnet 4.6 → 5 업그레이드는 ID 교체 + thinking 명시 비활성(생략 시 adaptive 자동 ON) 동반 |
| **v2.4** | **2026-08-13** | **★ 기술 스택 표 실측 동기화 (TOK-1).** Tailwind·Shadcn/UI·framer-motion 제거 — package.json에 없는데 v2.3까지 적혀 있었다(Stale-Doc Guard 사고 재발). 실제 스타일 층(CSS 변수 + CSS Modules + inline style)·애니메이션(CSS)·npm 명시 + "없는 것" 경고 블록 신설 · 불변 원칙 **#2-1 색은 토큰만**(raw hex 금지 · 가드 check-hex) 추가 |
| **v2.3** | **2026-08-08** | **★ 확정 결정 ↔ 문서 동기화 (stale 일소).** 불변 원칙 #4 = AI-Report **v2.5**(✦·푸터 전용·8px·50%)로 교체 · MVP 표 각주로 **3언어 라이브**(2026-07-01) 명시 · 필수 용어 표에 **표시 용어 층**(팬/Fan) 각주 · Voters 이벤트 카피 "1,000 팬 모으기" · 문서 체계 `CONTEXT.md`→`CONTEXT_v0_6.md` 정정 · **Stale-Doc Guard 절 신설** |
| v2.2 | 2026-07-11 | 대개편 반영 — Category Taxonomy · Bracket Size · Crown Score · Ranking Scope Lock |

---

*© 2026 WorldCrown48 | CLAUDE.md v2.8 (2026-10-04) | CONFIDENTIAL*
