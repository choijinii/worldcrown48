# 🛑 STOP — 모든 작업 전 필독

> **`docs/mental-model/MENTAL_MODEL.svg`** 를 먼저 본다.
> 어떤 코드·디자인·문서 작업도 이 한 장을 보지 않고는 시작하지 않는다.
>
> **인프라 작업(배포 · 환경변수 · DNS · Functions) 전**
> **`docs/principles/VERIFICATION_DISCIPLINE.md`** 4대 원칙(P1~P4)을 함께 확인한다.
>
> 충돌 시 우선순위: **MENTAL_MODEL.svg ≥ VERIFICATION_DISCIPLINE.md > LANGUAGE.md > 기타**

---

# WorldCrown48 — CLAUDE.md v2.4 (핵심 압축판)
# 에이전트 진입점 — 가장 먼저 읽는 파일
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
| CLAUDE.md | 이 파일 — 에이전트 진입점 + 핵심 원칙 요약 |
| DESIGN_BRIEF.md | 디자인 진입점 — 금지 패턴 + 컬러 토큰 |
| LANGUAGE.md | 공식 용어 정의 (단일 진실) |
| CONTEXT_v0_6.md | 프로젝트 현황 요약 (파일명 정정 — `CONTEXT.md`는 존재하지 않음) |
| docs/CODING_GUIDELINES.md | Karpathy 코딩 행동 규칙 4가지 (코드 작업 시 필독) |
| docs/design/WC48_DESIGN_SYSTEM_v2.3.md | 디자인 토큰 단일 진실 |
| docs/lite-specs/ | 도메인별 기능 스펙 |

---

## 🎯 서비스 정체성 (절대 불변)

월크48 = 팬이 좋아하는 Contestant를 투표하는 서비스 (이상형 월드컵 방식)
절대 금지: 우승자 예측·베팅, 실제 경기 결과 연동, Vote Count(절대 수치) UI 노출
— Vote Count 절대 수치는 **랭킹 포함 어디에도** 표시하지 않음(트래픽 종속 값이라 무의미).
   랭킹 도메인은 % 지표만 허용 → 대진 흐름 #8 (Crown Score, 2026-07-11)

---

## 🔒 불변 원칙 8가지

| # | 원칙 | 규칙 |
|---|------|------|
| 1 | 듀얼 테마 | Domain 0~3 = 다크, Domain 4~6 = 라이트. 팔레트 상세 → docs/design/colors_and_type.css |
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
8. Vote Count(절대 수치)는 어디에도 표시 금지. **랭킹 도메인**은 % 지표 3종만 허용: **우승비율 → 점유율(Vote Rate) → 승률** 순서 표시 + 각 지표 **? 마크 툴팁으로 산식 공개**. 순위 기준 = **Crown Score(우승비율×50% + 점유율×50%)** (2026-07-11 대표 확정)
9. **Ranking Scope Lock (2026-07-11)**: Crown Score·랭킹 지표는 **랭킹 도메인 + AI 뉴스 소재**로만 사용. 매치(배틀)·Crown Card 사용 금지
10. **Bracket Size (2026-07-11)**: 후보 풀은 항상 48개, **Voter가 시작 시 12/24/48강 선택**(무작위 추출) — 기존 라운드 경로의 중간 진입. 라운드명 체계·규칙 불변

**Voter 전체 흐름 (48강 선택 시 — 24강은 ROUND OF 24부터, 12강은 ROUND OF 12부터 시작):**
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
백엔드:     Firebase (Firestore + Realtime DB + Auth + Cloud Functions)
AI:         Claude API (claude-sonnet-4-20250514)
호스팅:     Vercel (프론트) + Firebase (백엔드) + Cloudflare
도메인:     worldcrown48.com
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
| Domain 0 | Launch Pad | 🌑 다크 | MVP 1 |
| Domain 1 | The Pitch | 🌑 다크 | MVP 1 |
| Domain 2 | The Lab | 🌑 다크 | MVP 1 |
| Domain 3 | The Arena | 🌑 다크 | MVP 1 |
| Domain 4 | The Locker Room | ☀️ 라이트 | MVP 2 |
| Domain 5 | Policy Hub | ☀️ 라이트 | MVP 1 |
| Domain 6 | Admin Dashboard | ☀️ 라이트 | MVP 1 |

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
| Vote Rate (%) | Vote Count (절대 수치) |
| Crown Score | 점수, 스코어, 랭킹 점수 (임의 명칭) |
| Voter Count | Vote Count와 혼용 (완전 별개 개념) |
| `active` | `In Progress` |

※ **표시 용어(Display) 층 v2.0 (2026-08-06)**: 독자 노출 텍스트의 Voter = **"팬"(ko) / "Fan"(en·es)**.
   위 표는 **시스템 층**(공식 용어·코드·DB)이며 불변. 상세·예외(기본 닉네임 "Voter" 유지 등) → **LANGUAGE.md §1**

---

## 🚀 MVP 마일스톤

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
| **3단계 순차 런칭** | 1차 K-POP·CREATOR(2026-07말~08말) → 2차 K-DRAMA·E-SPORTS(09~10) → 3차 ANIME & WEBTOON·GLOBAL POP·HOLLYWOOD(11~). **FOOTBALL = hidden 대기**(폐기 아님) |
| **The Pitch = 발견** | 카테고리 섹션형(가로 스크롤 row) + 상단 동적 히어로(인기순, 매치 화면에 Round 배지·수치 없음) |
| **Arena 홈 = 활동** | 신설 — 이어하기·내 기록·카테고리 nav (Pitch와 역할 분리) |
| **우측 상설 프레임** | 뉴스뷰+배너: Pitch·Lab·Arena·Locker Room 적용, **매치·Crown Card 제외**. 모바일 = 피드 인라인. Arena 뉴스룸 계획 대체 |
| **Crown Card** | 팝업화 보류 — **기존 페이지 방식 유지** (SNS 공유 URL이 핵심) |
| **Bracket Size** | Voter가 시작 시 12/24/48 선택 (풀 48 고정, 무작위 추출) — 대진 흐름 #10 |
| **Crown Score** | 랭킹 순위 = 우승비율×50% + 점유율×50% — 대진 흐름 #8·#9 |
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

**충돌 우선순위**: 문서와 결정이 충돌하면 **결정 문서(`outputs/handoffs-staging/` 확정본)가 우선**한다.

**원칙: 하위 문서는 규칙을 '복사'하지 말고 부모를 '가리킨다'.**

---

## 📌 개정 이력

| 버전 | 날짜 | 주요 변경 |
|------|------|-----------|
| **v2.4** | **2026-08-13** | **★ 기술 스택 표 실측 동기화 (TOK-1).** Tailwind·Shadcn/UI·framer-motion 제거 — package.json에 없는데 v2.3까지 적혀 있었다(Stale-Doc Guard 사고 재발). 실제 스타일 층(CSS 변수 + CSS Modules + inline style)·애니메이션(CSS)·npm 명시 + "없는 것" 경고 블록 신설 · 불변 원칙 **#2-1 색은 토큰만**(raw hex 금지 · 가드 check-hex) 추가 |
| **v2.3** | **2026-08-08** | **★ 확정 결정 ↔ 문서 동기화 (stale 일소).** 불변 원칙 #4 = AI-Report **v2.5**(✦·푸터 전용·8px·50%)로 교체 · MVP 표 각주로 **3언어 라이브**(2026-07-01) 명시 · 필수 용어 표에 **표시 용어 층**(팬/Fan) 각주 · Voters 이벤트 카피 "1,000 팬 모으기" · 문서 체계 `CONTEXT.md`→`CONTEXT_v0_6.md` 정정 · **Stale-Doc Guard 절 신설** |
| v2.2 | 2026-07-11 | 대개편 반영 — Category Taxonomy · Bracket Size · Crown Score · Ranking Scope Lock |

---

*© 2026 WorldCrown48 | CLAUDE.md v2.4 (2026-08-13) | CONFIDENTIAL*
