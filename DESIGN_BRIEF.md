# WorldCrown48 — DESIGN_BRIEF.md
# v1.5 — 2026-08-08 (AI-Report v2.5 Footer-Only Lock 동기화)
# v1.4 — 2026-07-11 (대개편 반영: Bracket Size · Crown Score 랭킹 지표 · Ranking Scope Lock)
# Claude Design 전용 진입점 (Single Entry Point)

> **이 파일을 가장 먼저 읽으세요.**
> Claude Design이 디자인 작업을 시작하기 전 반드시 읽어야 할 문서 읽기 순서와 금지 패턴을 정의합니다.

---

## 🚨 CRITICAL RECURRING ERRORS — 반복 발생 오류 (즉시 수정 필수)

> 아래 오류는 **여러 세션에 걸쳐 반복적으로 발생**했습니다.
> UI 생성 전 이 목록을 반드시 확인하고, 해당 패턴이 없는지 검토하세요.

### ❌ 오류 1: 라운드 카운트다운 타이머 (가장 빈번한 오류)

```
❌ 절대 금지 (두 가지 오류가 동시에 있는 최악의 패턴):
   "ROUND OF 16 · 8 matches · ends in 03:14:22"
     오류 1: "ROUND OF 16" → WC48에 존재하지 않는 라운드명 (FIFA 용어)
     오류 2: "ends in 03:14:22" → Round Deadline은 존재하지 않음

❌ 잘못된 라운드명 (FIFA 표준 → WC48에 사용 금지):
   "ROUND OF 16"  /  "ROUND OF 32"  /  "QUARTERFINAL"  /  "SEMIFINAL"

✅ WC48 올바른 라운드명 (48개 Contestant 기준):
   ROUND OF 48  — 1라운드 (Match 24개)
   ROUND OF 24  — 2라운드 (Match 12개)
   ROUND OF 12  — 3라운드 (Match 6개)
   ROUND OF 6   — 4라운드 (Match 3개)
   THE FINAL    — 결승 (Match 1개)

✅ Bracket Size (2026-07-11 신규): Voter가 시작 시 12/24/48강 선택 가능.
   시작 라운드만 달라지며(24강 → ROUND OF 24부터) 라운드명·규칙은 위와 동일.
   시작 화면에 "총 라운드 선택" UI 필요 — Round HUD 금지 규칙은 그대로 적용.

❌ Round 카드(Round Card) UI 자체 금지 (v2.3 신규):
   Round는 Voter 개인 진행값이며 DB 독립 문서가 없습니다.
   카드로 렌더링할 수 있는 독립 엔티티(실체)가 아닙니다.
   <RoundCard />, Round 목록, Round 그리드 — 모든 형태 금지.

   Round 정보가 표시될 수 있는 유일한 위치 (2026-05-28 정정):
   → **`<RoundTransition>` 이벤트 화면 (라운드 사이 1~2초 자동 전환)**
   예: "🎉 24강 시작!" / "🎉 THE FINAL!"
   ❌ Arena VS Battle 헤더에도 표시 금지 — Voter는 매치 안의 선수, 관중 아님.

✅ Tournament Deadline만 허용:
   "Tournament ends · May 31, 2026"         ← Tournament 전체 마감만 표시
```

**근거**: Round에는 Deadline이 없습니다 (CLAUDE.md §5, 불변 원칙).
라운드는 Voter가 해당 Round의 마지막 Match를 완료하면 시스템이 자동으로 `advanceRound()`를 실행해 전환합니다.
Voter마다 라운드 진행 속도가 다르기 때문에 전역 라운드 타이머는 개념 자체가 존재하지 않습니다.

### ❌ 오류 2: AI GENERATED 배지

```
❌ 절대 금지: "AI GENERATED"  /  "AI"  /  "AI Generated"
❌ 절대 금지(v2.5 폐기): "● AI-Report" 11px 카드 배지 — 카드·목록·Crown Card 어디에도 배지 없음
✅ 반드시 사용: "✦ AI-Report"  — 기사 푸터 1곳 전용 (Footer-Only Lock, 8px·50%, 골드 모노)
```

### ❌ 오류 3 (NEW · 2026-05-27): Arena 화면에 시간·날짜·투표 횟수 표시 ← 반복 발생 중

> ⛔ **이 오류는 2026-05-27 실제 생성된 UI에서 발견되었습니다. 다시는 생성하지 마세요.**

```
❌ 실제 발생한 금지 패턴 (그대로 복사된 오류):

   "MATCH 7/24  ·  VOTE 3/5 TODAY"
   "2026-05-26 · 14:32 KST"
   "54% VOTE RATE · RANKING ONLY"

   — 위 세 줄이 Arena VS Battle 화면에 동시에 표시됨. 모두 금지.
```

**왜 금지인가 — 3가지 이유:**

1. **시간·날짜(Timestamp) 금지**: Round와 Match에는 시간 개념 자체가 없습니다.
   `2026-05-26`, `14:32 KST`, `TODAY`, `DAILY`, `이번 주` — 모든 시간 표현 금지.
   Arena 화면에서 유일하게 허용되는 날짜는 Tournament Deadline뿐입니다.

2. **일일 투표 횟수(VOTE n/n TODAY) 금지**: `VOTE 3/5 TODAY` 같은 일일 한도 카운터는
   Arena VS Battle 화면에 표시하지 않습니다. 이 정보가 필요하다면 별도 설정 화면에서만 처리합니다.

3. **VS Battle 화면에서 투표율(Vote Rate %) 금지**: `54%`, `36% vs 64%` 등
   투표율은 투표가 끝난 후 **랭킹 화면에서만** 표시합니다. 투표 진행 중인 VS Battle 화면에는 절대 표시 금지.

```
❌ Arena VS Battle 화면 — 진행 표시 텍스트 HUD 자체가 금지 (2026-05-28 정정):
   "{라운드명} · MATCH {n}/{total}" 형식도 금지
   이유: Voter = 매치 안의 선수, 관중 아님. HUD는 관중 시점 환상.
   Round 정보가 필요하면 → 라운드 사이 `<RoundTransition>` 이벤트 화면으로만.

✅ Arena VS Battle 화면에 표시 가능한 것:
   - Contestant 이름·이미지
   - "VOTE LEFT" / "VOTE RIGHT" 버튼 (MagneticButton)
   - Tournament Deadline (예: "Tournament ends · May 31")
   - (뉴스 카드 AI 배지 없음 — AI-Report는 기사 푸터 1곳 전용, v2.5 Footer-Only Lock)
   - (선택) 시각적 미니 인디케이터 — 텍스트 없는 progress dot 정도

❌ Arena VS Battle 화면에서 절대 금지:
   - 날짜·시각·타임스탬프 (2026-05-26, 14:32, KST, TODAY 등 모든 형태)
   - 일일/주간 투표 횟수 카운터 (VOTE 3/5 TODAY, DAILY VOTES 등)
   - 투표율·득표율 (54%, 36% vs 64%, Vote Rate 바 등)
   - Round 진행률·퍼센트
   - "ENDS IN" 타이머
   - LIVE 배지
```

### ❌ 오류 4: Vote Count 절대 수치 노출

```
❌ 절대 금지: "64% vs 36%"  /  "1,234 votes"  /  숫자 표시 (Match VS 화면)
✅ Vote Rate 바(progress bar): 랭킹 화면에서만 허용
❌ Match VS 화면(투표 중)에는 Vote Rate 바도 완전 금지
❌ "1,234 votes" 같은 절대 수치는 랭킹 화면에도 금지 (2026-07-11 — 트래픽 종속 값)
```

**근거**: Match 투표 화면에서 실시간 득표율을 보여주면 다수 의견에 쏠리는 편향 효과가 발생합니다.
Vote Rate는 Voter가 투표를 완료하고 랭킹 화면에서 결과를 확인할 때만 표시합니다.

**✅ 랭킹 화면(Crown Rankings) 확정 지표 (2026-07-11, LANGUAGE.md §13):**

```
순위 기준 = Crown Score (우승비율×50% + 점유율×50%)
표시 순서 = 우승비율 → 점유율 → 승률  (% 3종, 절대 수치 없음)
각 지표에 ? 마크 → 탭하면 산식 설명 툴팁 (산식 공개 원칙)
사용 범위 = 랭킹 도메인 + AI 뉴스 소재만 (Ranking Scope Lock)
           배틀(Match VS)·Crown Card에는 절대 사용 금지
```

---

## 📖 문서 읽기 순서 (3-tier)

```
Tier 1 (필수 — 항상):
  1. DESIGN_BRIEF.md       ← 지금 이 파일 (진입점)
  2. CLAUDE.md             ← 불변 원칙 8가지 + 서비스 정체성
  3. LANGUAGE.md           ← 공식 용어 (단일 진실 공급원)

Tier 2 (디자인 작업 시):
  4. docs/design/WC48_DESIGN_SYSTEM_v2.3.md  ← 디자인 토큰 + 컴포넌트 (최신)
  5. WC48_FAN_INTELLIGENCE_v1_0.md           ← AI-Report 배지 상세 규격

Tier 3 (도메인 구현 시):
  6. docs/lite-specs/      ← 각 도메인 스펙 (Domain 0~6)
  7. docs/i18n/I18N_POLICY.md  ← 다국어 정책
```

> ⚠️ `_archive/` 폴더의 파일은 절대 읽지 마세요. 구버전입니다.
> ⚠️ `docs/design/` 에 WC48_DESIGN_SYSTEM_v2.3.md 하나만 존재합니다. 다른 버전 없음.

---

## 🎨 디자인 토큰 — 현행 팔레트 (Twilight Stadium v2.3)

> 디자인 토큰(색상 값)의 단일 진실은 `docs/design/colors_and_type.css`입니다. 색 값은 그 파일을 참조하세요 — 이 문서에는 중복 기재하지 않습니다 (2026-05-25 로고 v3.0 정합). 듀얼 테마: Domain 0~3 다크 / Domain 4~6 라이트.

> ❌ 절대 금지: `#05070A`, `#0A0D12`, `#F8FAFC`, `#30363D`, `#8B949E` (v1 구버전 컬러)

---

## ⛔ 디자인 금지 패턴 (반드시 확인)

| 금지 패턴 | 이유 | 올바른 대안 |
|-----------|------|-------------|
| `Round n/total` 진행바 (Tournament 카드) | Round = Voter 개인 진행값, 글로벌 데이터 아님 | `{n} Contestants + Tournament Deadline` |
| Round Card UI 컴포넌트 (`<RoundCard />` 등) | Round는 DB 독립 문서 없음. 카드로 렌더링할 실체 없음 | 금지. Round 정보는 Arena VS Battle 헤더에서만 표시 |
| `ENDS IN hh:mm:ss` 타이머 (Arena) | Match·Round에 Deadline 없음 | 제거. Tournament Deadline만 허용 |
| `ROUND OF 16` / `QUARTERFINAL` / `SEMIFINAL` | WC48에 존재하지 않는 라운드명 (FIFA 표준) | `ROUND OF 48/24/12/6` / `THE FINAL` 만 사용 |
| LIVE 배지 (TournamentCard) | Tournament는 Voter 혼자 진행. LIVE = 다중 동시 참여 오해 유발 | 배지 완전 제거 |
| 브래킷 목록에서 Match 직접 선택 UI | Voter는 Match를 선택할 수 없음, 순서대로만 진행 | 현재 Match 1개만 표시. 브래킷 조회는 별도 뷰 |
| 결승(THE FINAL)을 1v1 Match 2개로 분리 | THE FINAL = 3명 동시 표시, 1명 직접 선택 | `FinalPickView` — 3개 카드 동시 표시 |
| `AI GENERATED` / `AI` 배지 | CLAUDE.md 불변 원칙 #4 위반 | `✦ AI-Report` — 기사 푸터 1곳 전용 (v2.5, 8px·50%) |
| `● AI-Report` 11px 카드 배지 | v2.5 Footer-Only Lock으로 폐기 (2026-07-22) | 카드에 배지 없음. 기사 푸터 `✦ AI-Report` 1곳만 |
| `Crown odds` / `projected winner` | 예측·베팅 연상 → 서비스 정체성 위반 | 팬 선택 중심 언어 ("Fans are making their voice heard") |
| `In Progress` 토너먼트 상태 | 유효 상태 아님 | `active` 사용 |
| `#05070A` 등 v1 구버전 컬러 | v2.3 팔레트로 교체됨 | 위 토큰 참조 |
| `FIFA` / `Official` 표기 | 상표권 위반 | `Football`, `International` 등 중립 표현 |
| 한국적 디자인 요소 | 글로벌 MZ Sporty 럭셔리 서비스 | 중립 글로벌 스타일 유지 |
| `48명의 Contestant` | Contestant = 사람만이 아닌 모든 개체 | `48개의 Contestant` |
| Vote Count 숫자 노출 | 서비스 정체성 원칙 — 절대 수치는 랭킹 포함 어디에도 금지 | 랭킹 도메인에서 % 지표 3종(우승비율·점유율·승률)만 (2026-07-11) |
| Crown Score를 배틀·Crown Card에 표시 | Ranking Scope Lock 위반 | 랭킹 도메인 + AI 뉴스 소재만 |

---

## 📐 AI-Report 표기 규격 v2.5 (불변 원칙 #4)

**Footer-Only Lock** — AI-Report 표기는 **기사 본문 블록 최하단 1곳에만** 등장한다.
카드·목록·Crown Card·Lab·Policy·Locker Room 어디에도 AI 배지를 넣지 않는다.

```css
/* 기사 본문 블록 최하단 — 유일한 AI-Report 표기 위치 */
font-family: var(--font-mono);
font-size: 8px;
color: var(--color-gold);   /* #FCD006 */
opacity: 0.5;
/* 내용: "✦ AI-Report · 발행인이 검토·승인했습니다 · DATA {기준시각}" */
```

> ⛔ **폐기(v2.5, 2026-07-22)**: 아래 구버전 규격은 더 이상 유효하지 않다 — 참조 금지.
> `.ai-report-badge` 카드 바이라인 `● AI-Report` (11px·letter-spacing 0.14em·uppercase) ·
> 기사 본문 인라인 블록 `✦ AI-Report` (12px) · "2중 표기 의무".
> 단일 진실 = `LANGUAGE.md §14` · `docs/design/WC48_DESIGN_SYSTEM_v2.4.md`(Footer-Only Lock)

---

## 🗺️ 7개 도메인 — 테마 & 목적

| 도메인 | 이름 | 테마 | MVP | 목적 |
|--------|------|------|-----|------|
| Domain 0 | Launch Pad | 🌑 다크 | MVP 1 | 사전 랜딩·웨이트리스트 |
| Domain 1 | The Pitch | 🌑 다크 | MVP 1 | 메인 홈·Tournament 탐색 |
| Domain 2 | The Lab | 🌑 다크 | MVP 1 | 대진 생성 (관리자 전용) |
| Domain 3 | The Arena | 🌑 다크 | MVP 1 | 투표·Crown Card·뉴스룸 |
| Domain 4 | The Locker Room | ☀️ 라이트 | MVP 2 | 유저 프로필 |
| Domain 5 | Policy Hub | ☀️ 라이트 | MVP 1 | 정책·쿠키 |
| Domain 6 | Admin Dashboard | ☀️ 라이트 | MVP 1 | 관리자 대시보드 |

---

## 🎬 Cinematic Landing Page Builder — 통합 가이드

Domain 0(Launch Pad) UI 작업 시 반드시 아래 패턴을 적용하세요.

### 필수 Cinematic 요소

```
1. Noise Overlay        — 전면 grain texture (opacity 0.035, pointer-events: none)
2. GNB Island          — 플로팅 Floating Island 네비게이션 (backdrop-blur + magnetic)
3. Magnetic Button     — 마우스 추적 호버 효과 (GSAP + mousemove listener)
4. Hero GSAP Entrance  — 페이지 진입 시 stagger 페이드업 애니메이션
5. Interactive Feature Cards — TournamentShuffler · VoteFeedTypewriter · MatchScheduler
6. Philosophy Section  — GSAP ScrollTrigger parallax (heading + 6-item grid)
7. Sticky Stacking Archive — 3카드 pin-on-scroll (Launch→Vote→Crown 스토리텔링)
```

### 코드 스니펫 위치
`docs/design/WC48_DESIGN_SYSTEM_v2.3.md` → §4-C, §10-A, §10-B

### 기술 의존성
```json
{
  "gsap": "^3.12",
  "gsap/ScrollTrigger": "GSAP 플러그인",
  "framer-motion": "^11 (React 레이어)",
  "tailwindcss": "^3.4"
}
```

---

## 🔤 핵심 용어 빠른 참조 (상세는 LANGUAGE.md)

| ✅ 사용 | ❌ 금지 |
|---------|---------|
| Tournament | 대회, 이벤트, 게임 |
| Contestant | Candidate, 참가자, 후보자 |
| Match | Battle, 배틀, 경기 |
| Voter | 참여자, 유저 |
| Champion | 우승자, 1등 |
| Crown Card | 결과 이미지, 결과 카드 |
| Tournament Deadline | Round Deadline (존재 안 함) |
| Vote Rate (%) | Vote Count (절대 수치) |
| Crown Score | 점수, 스코어 (임의 명칭) |
| Voter Count (참여자 수) | Vote Count와 혼용 |
| Bracket Size (12/24/48) | 라운드 수, 강 수 (임의 명칭) |
| `active` | `In Progress` |

---

## ✅ 디자인 시작 전 체크리스트

- [ ] 이 파일(DESIGN_BRIEF.md) 읽었음
- [ ] CLAUDE.md 불변 원칙 8가지 확인
- [ ] LANGUAGE.md 필수 용어 확인
- [ ] 구현 도메인 테마(다크/라이트) 확인
- [ ] 금지 패턴 목록 확인
- [ ] WC48_DESIGN_SYSTEM_v2.3.md (최신) 참조 — `_archive/` 버전 아님
- [ ] AI-Report 표기 규격 v2.5 확인 (✦ · 기사 푸터 1곳 전용 · 8px·50%. 카드 배지 없음)

---

*© 2026 WorldCrown48 | DESIGN_BRIEF.md v1.5 (2026-08-08) | CONFIDENTIAL*
*v1.5 (2026-08-08): AI-Report 규격을 v2.5 Footer-Only Lock으로 교체 — 구버전 11px 카드 배지 규격 폐기 표시*
