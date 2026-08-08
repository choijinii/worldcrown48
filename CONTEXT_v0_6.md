> ⚠️ **2026-07-11 대개편 정합성 공지** — 이 문서의 일부 내용이 대개편 결정으로 대체되었습니다.
> 충돌 시 최신 진실 우선순위: `CLAUDE.md v2.3 「🔄 2026-07 대개편」` > `LANGUAGE.md v2.0` > 이 문서.
> 상세 결정: `outputs/handoffs-staging/WC48_개편결정_v1_2026-07-10.md` (v1.2)
> 대체된 것: 카테고리 체계·런칭 전략·현황 전반이 대개편 이전 기준. 최신 카테고리(3단계 런칭·FOOTBALL hidden)·Bracket Size·Crown Score는 CLAUDE.md v2.3 참조
>
> ⚠️ **2026-08-08 결정 동기화** — 아래 3건은 이 문서 본문에 인라인 정정 주석으로 반영했습니다:
> **① AI-Report = v2.5 Footer-Only Lock**(✦·기사 푸터 1곳·8px·50%. 구 "● AI-Report" 11px 카드 배지 폐기)
> **② es는 이미 라이브**(2026-07-01 결정 — "MVP 2 대기" 아님) · URL은 `?lang=` 쿼리 방식(next-intl 미채택)
> **③ 표시 용어(Display) 층 v2.0**(2026-08-06) — 독자 노출 텍스트의 Voter = **팬 / Fan**. 단, **이 문서 본문의 "Voter"는 공식 용어 표기(시스템 층)이므로 불변** (LANGUAGE.md §1 비적용 대상)

# WorldCrown48 (월크48) — Domain Context
# v0.6 — 2026년 5월 | Fan Intelligence + AI-Report 전략 박제

> **변경 이력**
> - **v0.5 → v0.6** (2026-05-17): **★ Fan Intelligence + AI-Report 전략 박제**
>   - 불변 원칙 #6: "AI GENERATED" → "AI-Report" 표기 확정 (폐기)
>   - 뉴스 전략 섹션 Fan Intelligence 콘텐츠 브랜드로 전면 교체
>   - MVP 1.5 마일스톤 추가 (관리자 수동 Fan Intelligence 생성, 런치 뉴스 전용)
>   - WC48_FAN_INTELLIGENCE_v1_0.md 신규 문서 체계 등록  

> **이 파일(v0.5)이 CONTEXT.md의 유일한 공식 버전입니다.**

---

## ⛔ IMMUTABLE TERMINOLOGY RULE — 절대 불변 용어 규칙

> **RULE 1: NEVER change or overwrite an established term definition.**
> **RULE 2: When a new concept arises, CREATE A NEW TERM. Do NOT redefine existing terms.**
>
> 이 규칙은 모든 에이전트, 모든 세션, 모든 기여자에게 예외 없이 적용된다.
> 기존 용어를 임의로 변경하면 전체 모듈과 AI 뉴스 생성 전반에 연쇄 오류가 발생한다.
> 용어 정의의 단일 진실 공급원: `LANGUAGE.md`

---

## 🚨 작업 원칙 (Working Principles) — 절대 위반 금지

### ★ 최우선 원칙: 추측·임의 처리 절대 금지

**대표님께서 명시한 규칙: "추측이나 임의 판단으로 일을 절대 처리하지 말 것."**

이 원칙은 **다른 모든 작업 규칙보다 우선합니다.** 의문이 들면 멈추고 묻습니다. 진행하지 않습니다.

```
❌ 절대 하지 말 것
─────────────────────────────────────────────────────────
1. 등록되지 않은 자산을 임의로 그리거나 묘사하지 않는다
   - 브랜드 SVG·이미지 자산이 등록되지 않았는데 근사치로 시안을 만들지 않는다

2. 요청 범위를 벗어난 신규 기능을 자의적으로 추가하지 않는다
   - "컬러 시스템 갱신" 요청에 "이미지 처리 파이프라인 신설" 같은 비약 금지

3. 마스터 설계 문서의 변경을 유발하는 작업은 사전 협의 없이 진행하지 않는다
   - v4.9 설계서 / LANGUAGE.md / CONTEXT.md / ProjectSkill의 변경이 필요해진다면
   - 작업을 멈추고 대표님께 "이 작업은 마스터 문서 변경을 유발합니다"를 보고한다

4. "이게 도움이 될 것 같다"는 직감으로 추가 작업을 끼워 넣지 않는다

5. 검증되지 않은 외부 라이브러리·API·기술을 임의로 도입하지 않는다
   - 기술 스택은 §기술 스택(v4.1 확정)을 단일 진실 공급원으로 한다
```

### 의사결정 체크포인트 (작업 시작 전 자문)

```
□ 이 작업이 요청 범위 안의 일인가?
□ 등록된 자산만 사용하는가? 임의로 그리는 부분이 있는가?
□ 이 작업이 v4.9 설계서·LANGUAGE.md·CONTEXT.md 변경을 유발하는가?
□ 의문이 있는 부분을 대표님께 먼저 확인했는가?
□ "재미있을 것 같다"는 이유로 끼워 넣는 작업이 있는가?

위 5가지 중 하나라도 "예/모름"이면 작업을 멈추고 대표님께 확인한다.
```

### 올바른 작업 순서

자세한 워크플로우는 **WC48_WORKFLOW.md** 단일 진실 공급원을 참조합니다.

```
① 자산 등록 (SVG·이미지·폰트·데이터)
   ↓
② 디자인 시스템 / 명세서에 반영
   ↓
③ Figma · Stitch · Storybook 등에서 실시안 검증
   ↓
④ 코드로 화면 구현
```

---

## 이 파일의 역할

```
CONTEXT.md           = "지금 프로젝트가 어디까지 왔는가" (현황·정책·기술 요약)
LANGUAGE.md          = "용어를 어떻게 쓰는가" (공식 용어 정의 — 단일 진실 공급원)
ProjectSkill         = "Claude가 어떻게 일하는가" (에이전트 임무·협업 가이드)
WC48_WORKFLOW.md     = "어떤 순서로 일하는가" (작업 순서 단일 진실 공급원)
WC48_SVG_GUIDE.md    = "브랜드 SVG 자산을 어떻게 만드는가"
WC48_DESIGN_SYSTEM_v2.3.md = "색상·타이포·애니메이션을 어떻게 쓰는가" (토큰 값 단일 진실: colors_and_type.css)
WC48_FAN_INTELLIGENCE_v1_0.md = "Fan Intelligence AI-Report 전략" ★ 뉴스 콘텐츠 SST
v4.9 설계서          = "무엇을 만드는가" (도메인·모듈·데이터 구조 — 단일 진실 공급원)
```

> ⚠️ **용어 정의는 이 파일에 없습니다. LANGUAGE.md v1.2를 참조하세요.**
> ⚠️ **디자인 토큰(색·폰트 값)은 docs/design/colors_and_type.css가 단일 진실 공급원입니다.**
> ⚠️ **작업 순서는 WC48_WORKFLOW.md를 단일 진실 공급원으로 합니다.**

---

## 핵심 비전

48개의 Contestant을 1:1 Match 방식으로 투표해 최후의 1인(Champion)을 가리는 글로벌 팬덤 Tournament 플랫폼.
2026 FIFA 북중미 월드컵을 기점으로 전 세계 팬덤 데이터를 수집하고, Crown Card 바이럴로 성장한다.

---

## 서비스 정체성 (절대 불변)

```
월크48 = 팬이 좋아하는 Contestant를 투표하는 서비스 (이상형 월드컵 방식)

절대 금지:
  - 우승자 예측 게임 / 스포츠 베팅·내기 연동
  - 실제 경기 결과와 연동 / 외부 일정에 자동 종속
  - Vote Count(절대 수치) UI 노출
```

---

## ★ 대진 흐름 핵심 원칙

```
1. Tournament에만 Deadline이 존재한다 (Tournament Deadline)
2. Round에는 Deadline이 없다 — Voter 투표 흐름에 따라 시스템이 자동 전환
3. 라운드 전환: Voter가 해당 Round 마지막 Match 완료 → advanceRound() 자동 실행
4. 라운드 전환 효과: "맨 어브 더 월드컵 N강" 화면 자동 표시 후 다음 Round 시작
5. Match는 Voter에게 순서대로 하나씩 제시됨 (동시 진행 아님)
6. Tournament Host는 Tournament Deadline만 설정. 라운드 수동 전환 기능 없음
```

Voter 1명의 흐름: 48강(24 Match) → 24강(12) → 12강(6) → 6강(3) → 결승(1) → Champion → Crown Card → 공유

---

## 7개 도메인 구조

```
Domain 0: Launch Pad       — 사전 랜딩·웨이트리스트 (MVP 1)        [📱+🖥️] 🌑 다크
Domain 1: The Pitch        — 메인 홈·트렌딩 (MVP 1)               [📱+🖥️] 🌑 다크
Domain 2: The Lab          — 대진 생성 (관리자 전용, 비공개)       [🖥️]    🌑 다크
Domain 3: The Arena        — 투표·Crown Card·뉴스룸 (MVP 1)       [📱+🖥️] 🌑 다크
Domain 4: The Locker Room  — 유저 프로필 (MVP 2)                   [📱+🖥️] ☀️ 라이트
Domain 5: Policy Hub       — 정책·쿠키 (MVP 1)                    [📱+🖥️] ☀️ 라이트
Domain 6: Admin Dashboard  — 관리자 대시보드 (MVP 1 일부)          [🖥️]    ☀️ 라이트
```

---

## 투표 정책 (v4.5 확정)

```
✅ 확정 규칙:
  - 대진별 1일 5회: 동일 Tournament에서 하루 최대 5개 Match 투표 가능
  - 자정 리셋: KST 00:00 기준 카운트 초기화
  - 복수 Tournament: 각 Tournament별 독립 5회 카운트
  - 소셜 로그인 필수: Google / Apple (익명 투표 없음)

랭킹 노출:
  - Vote Count 노출 금지 → Vote Rate(%) + 1시간 캐시만 표시
```

---

## 부정투표 방어 (MVP 단계별)

```
MVP 1: Rate Limiting (1분 10회+ → 15분 쿨다운) + 소셜 로그인 필수
MVP 2: fingerprintjs 디바이스 핑거프린트 + IP 중복 방지
MVP 3: 3단계 차단 시스템 (소프트/하드/영구) + 관리자 UI
```

---

## 기술 스택 (v4.1 확정)

| 레이어 | 기술 |
|---|---|
| 프론트엔드 | Next.js 14 (App Router) + TypeScript |
| UI/UX | Tailwind CSS + Shadcn/UI + Framer Motion + GSAP + Zustand |
| 백엔드 | Firebase (Firestore + Realtime DB + Auth + Cloud Functions) |
| AI | Claude API (claude-sonnet-4-20250514) |
| 뉴스 | GNews API Basic $9/월 (MVP 1) → Claude API (MVP 2) |
| 호스팅 | Vercel (프론트) + Firebase (백엔드) |
| CDN/보안 | Cloudflare |
| 도메인 | worldcrown48.com |

> ⚠️ 이 스택은 v4.1 확정. 변경 시 ADR 필수. 임의 기술 도입 금지.

---

## 핵심 불변 원칙

1. **추측·임의 처리 절대 금지** — §작업 원칙 §최우선 원칙 참조 ★ v0.4 신설
2. **평범한 AI 생성물 같지 않게** ★ v0.5 신설 (아래 상세 설명)
3. **듀얼 테마** — 핵심 화면(D0~3) = 다크, 유틸리티 화면(D4~6) = 라이트. 배경색 고정 아님.
4. **Crown Gold 중심 + 3종 액센트** — `#FCD006` 메인. Aura / Crimson / Turquoise 보조.
5. **한국적 요소 금지** — 글로벌 MZ Sporty 엔터테인먼트.
6. **AI-Report 표기 의무 (v2.5, 2026-07-22 갱신)** — **Footer-Only Lock**: "✦ AI-Report · 발행인이 검토·승인했습니다 · DATA {기준시각}"를 **기사 본문 블록 최하단 1곳에만** (8px·50%·골드 모노). HTML 메타태그 병행. "AI GENERATED" 완전 폐기. ⛔ 구 "● AI-Report" 11px 카드 배지·2중 표기 의무 = **폐기**. 단일 진실: `LANGUAGE.md §14` · `docs/design/WC48_DESIGN_SYSTEM_v2.4.md`
7. **FIFA 상표권 준수** — "FIFA", "Official" 표기 금지.
8. **3단계 이미지 소싱 정책** — L1 자동/L2 수동 승인/L3 금지.
9. **웹 전용** — 모바일 앱 없음. Flutter 전환 계획 없음.
10. **스택 고정** — Next.js + Firebase. 변경 시 ADR 필수.

### ★ 원칙 2 상세: 평범한 AI 생성물 같지 않게 (v0.5 신설)

> 출처: Cinematic Landing Page Builder Execution Directive

```
"모든 화면은 디지털 악기처럼 느껴져야 한다.
모든 스크롤은 의도적이어야 하고,
모든 애니메이션은 무게감이 있어야 한다."
```

**실행 금지 패턴:**

```
❌ 평평한 단색 그라디언트 배경    → 노이즈 텍스처 레이어로 해결
❌ 기본 hover: opacity 0.7       → 자석 버튼(MagneticButton) 시스템으로 해결
❌ 단순 fixed top-0 내비게이션   → Floating Island GNB로 해결
❌ 단순 CSS fade-in 애니메이션   → GSAP 스태거 fade-up으로 해결
❌ 정적인 마케팅 카드             → 마이크로 인터랙션 필수
```

**구현 상세:** `WC48_DESIGN_SYSTEM_v2.3.md §4-A, §4-B, §7(GNB), §9(GSAP)` 참조.

### 듀얼 테마 디자인 토큰 (요약)

> 디자인 토큰의 단일 진실은 `docs/design/colors_and_type.css`입니다. 색 값은 그 파일을 참조하세요 (2026-05-25 로고 v3.0 정합).

---

## 뉴스 전략 — Fan Intelligence

> 상세 전략: `WC48_FAN_INTELLIGENCE_v1_0.md` (단일 진실 공급원)

### 콘텐츠 브랜드

```
Fan Intelligence = WorldCrown48 고유의 AI-Report 포맷
실제 팬 투표 데이터 기반 → AI(Claude) 작성 → 관리자 검토·승인 → 배포
핵심 철학: "AI가 주인공"이 아닌 "팬 데이터가 주인공"
```

### AI-Report 표기 위치 — v2.5 Footer-Only Lock (2026-07-22 갱신)

```
① 기사 본문 블록 최하단 (유일한 표기 위치):
     "✦ AI-Report · 발행인이 검토·승인했습니다 · DATA {기준시각}"
     (8px, 50% 투명도, 골드 모노)
② HTML 메타태그: <meta name="content-type" content="ai-report" /> (EU AI Act 기계 판독)
```

> ⛔ **폐기(v2.5)** — 아래 구버전 "2곳 이중 표기"는 더 이상 유효하지 않다. 참조 금지:
> 카드 바이라인 "● AI-Report" (11px 골드 배지) · 기사 본문 하단 12px 인라인 영문 문단.
> 카드·목록·Crown Card 어디에도 AI 배지를 넣지 않는다.

### MVP별 뉴스 생성 방식

```
MVP 1:   GNews API 외부 뉴스 소비 (AI 생성 없음, $9/월)
MVP 1.5: 관리자 수동 Fan Intelligence 생성 (런치 뉴스 전용 — 6월 10일 목표)
          Admin Dashboard → [Fan Intelligence 생성] 버튼
          → ranking_cache 읽기 → Claude API 호출 → 검토 → 승인 → 게시
MVP 2:   M7 AI 뉴스 팩토리 자동화
          트리거 1 (우선): Champion 확정 → onChampionConfirmed()
          트리거 2: 특이점 탐지 4종 (T-1~T-4)
MVP 3:   PR 자동 배포 (RedPress / EIN / PR Newswire)
```

### 런치 뉴스 (Operation Launch News)

```
목표 기사: "팬들이 투표한 2026 북중미 월드컵 최종 우승 후보는?"
배포 시기: 2026년 6월 5~10일 (월드컵 개막 6월 11일 전)
최소 투표: 1,000표 이상 확보 후 생성
```

---

## 사용자 흐름 (바이럴 루프)

```
방문 → The Pitch 대진 선택 → The Arena 입장
→ 48강~결승 자동 진행 (라운드 전환 효과 포함)
→ Champion 확정 → Crown Card 자동 생성
→ 뉴스 선택 → SNS 공유 (뉴스 링크 첨부)
→ 공유 링크로 신규 Voter 유입 (바이럴)
```

---

## MVP 단계

| 단계 | 시기 | 핵심 | 지원 언어 |
|---|---|---|---|
| MVP 1 | 2026년 5월 31일 | Domain 0~3 + 5~6 일부, 투표 엔진, Crown Card, GNews 뉴스룸, Rate Limiting | 🇰🇷 `ko` + 🇺🇸 `en` |
| MVP 1.5 | 2026년 6월 10일 | 🆕 관리자 수동 Fan Intelligence 생성 버튼 (런치 뉴스 전용) | 🇰🇷 `ko` + 🇺🇸 `en` |
| MVP 2 | 2026년 7월 | M7 자동화, K-POP, Locker Room, 다국어, fingerprintjs | 🇰🇷 `ko` + 🇺🇸 `en` + 🌎 `es` ← 스페인어 추가 |
| MVP 3 | 2026년 하반기 | PR 자동 배포, B2B SaaS, 부정투표 3단계, 수익 모델 | + 추가 언어 미정 |

### i18n 전략 — 단일 진실 공급원

```
MVP 1: ko + en (2개)   한국 팬 + 글로벌 영어권 베이스라인
MVP 2: + es (3개)      남미 팬덤 공략 — 아르헨티나·멕시코·콜롬비아 등 스페인어권 5억명
                       2026 FIFA 월드컵 남미 열기 최고조 시점에 맞춰 출시
MVP 3: 추가 미정        MVP 2 트래픽 기반 결정 | 후보: pt-BR · ja · ar

URL 구조 (Next.js i18n): /ko/... · /en/... · /es/...
기본 언어(default): en (글로벌 접속 시 브라우저 언어 자동 감지)
```

> ⚠️ **[2026-08-08 현행 정정]** 위 단계별 계획은 **당초 계획 기록**이며 현행이 아니다.
> ① **es는 이미 라이브** — 2026-07-01 결정으로 3언어(ko/en/es) 아키텍처를 조기 적용했다
>    (언어 토글·UI 사전 es 113건·뉴스 3언어·Lab 제목 3언어). "MVP 2 대기" 아님.
>    잔여 3곳(정책 문서 `content/es`·동의창 ConsentModal·`/account`)은 Pitch 개편 es 스윕에서 처리.
> ② **URL 구조는 `/ko/`·`/en/`·`/es/` 라우팅이 아니다** — 현행은 React Context(`lib/i18n/`) + `?lang=` 쿼리 (A1-i18n, next-intl 미채택).
> 현행 기준 = `lib/locale.ts` · `lib/i18n/`.

```
톤앤매너: 3개 언어 모두 글로벌 MZ Sporty 럭셔리 — 한국적 요소 금지 원칙 동일 적용
```

---

*© 2026 WorldCrown48 | 작성: 48티오 | CONTEXT.md v0.6 | CONFIDENTIAL*
*v1.3(2026-05-11 구버전) 완전 폐기 — 이 파일이 유일한 공식 CONTEXT.md*
