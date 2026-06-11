# 🎨 WorldCrown48 (월크48) — UI 디자인 시스템 v2.4
# WC48_DESIGN_SYSTEM_v2.4.md
# Twilight Stadium Edition — AI-Report Footer-Only Lock | 2026-05-31 수정 | 작성자: 48티오
# 기반: WC48_DESIGN_SYSTEM_v2.3 100% 계승 + AI-Report 카드 바이라인(● AI-Report) 폐기 + ✦ AI-Report 푸터 전용 재정립

> **이 파일의 목적**: UI 디자이너 / Claude Design / Claude Code 작업 시 참조하는 월크48 공식 디자인 시스템입니다.
> v2.3의 모든 규격을 100% 계승하면서, AI-Report 배지 정책을 새 디자인 시스템(2026-05-31 Claude Design 통합) 결정에 맞게 재정립합니다.

> **⚠️ v2.4 작업 범위 명시**:
> - v2.3의 기존 토큰·명세·Round 정책·LIVE 배지 금지·Round Card 금지 등 **일절 변경하지 않습니다.**
> - 수정 항목: **AI-Report 배지 표준 재정립** — 카드 바이라인 `● AI-Report` 영구 폐기, `✦ AI-Report`만 사용(뉴스 article 푸터 전용). 12px JetBrains Mono 골드.
> - 참조: 2026-05-31 Claude Design 디자인 시스템 통합 시 CLAUDE.md 불변 원칙 #4와 새 SKILL.md/README.md의 충돌을 해결한 결과. 자세한 충돌 해결 기록은 `docs/design/CHANGELOG.md`의 2026-05-31 엔트리 참조.

---

## 🛑 MENTAL_MODEL 우선

> 라운드·매치·득표·LIVE 배지 등 시각 규칙의 단일 진실: **`docs/mental-model/MENTAL_MODEL.svg`**
> UI 컴포넌트 디자인 시 이 SVG의 WRONG/RIGHT 대조부터 확인. 충돌 시 SVG 우선.

---

## 📌 v2.2 → v2.3 변경 요약

```
[v2.3 수정 항목 — 3가지]

★ 수정 ①: Round 표시 범위 확정 — Tournament(Arena) 안에서만 표시
  - Round는 Voter 개인 진행값이며 전역 카운터가 아님 (기존 원칙 강화)
  - Arena(Domain 3) VS Battle 헤더에서만 라운드명 표시 허용
  - The Pitch(TournamentCard), Launch Pad, GNB, 기타 전 영역에서 Round 표시 금지

★ 수정 ②: Round Card 생성 금지 명문화
  - "Round 카드" 형태의 UI 컴포넌트 생성 자체를 금지
  - 근거: Round는 DB 문서 없음. 카드로 렌더링할 독립적 엔티티(실체)가 아님.
  - 금지 패턴: <RoundCard />, Round 목록, Round 그리드 등 모든 형태

★ 수정 ③: LIVE 배지 → TournamentCard 표시 금지 목록 추가
  - 근거: Tournament는 Voter 혼자 진행. 동시 참여 개념 없음.
  - LIVE 배지는 실시간 다중 참여를 암시 → 서비스 정체성 오해 유발
  - 금지: TournamentCard 내 "LIVE" 배지, "LIVE NOW" 표시, Pulse 인디케이터

[유지 항목] — v2.2 100% 계승
- 모든 v2.2 수정·추가 항목
- 모든 디자인 토큰 (컬러·타이포·간격·모서리·그림자)
```

---

## 📌 v2.1 → v2.2 변경 요약

```
[v2.2 수정 항목 — 3가지]

★ 수정 ①: "AI GENERATED" / "AI" 배지 → "● AI-Report" 표기 통일 [v2.2 기록]
  - 근거: CLAUDE.md v1.2 불변 원칙 #4
  - 영향: VSBattle.jsx / TournamentCard.jsx / Arena.jsx (NewsCard) / v2.1 체크리스트
  - 카드 바이라인: "● AI-Report" (11px, 골드)
  - 기사 본문 하단: "✦ AI-Report" (12px, 골드)
  ⚠️ 2026-05-31 v2.4 갱신: 카드 바이라인 "● AI-Report"는 영구 폐기되었습니다.
     "✦ AI-Report"만 뉴스 article 푸터 전용으로 사용. §AI-Report 배지 표준(v2.4 재정립) 참조.

★ 수정 ②: Round 표기 개념 오류 수정
  - 오류: "Round {n}/{total}" → 라운드를 글로벌 카운터처럼 표시
  - 근거: Round = Voter 개인 진행값. DB 문서 없음. 글로벌 숫자 없음.
  - 수정(2026-05-28 재수정): Match 화면에는 Round/Match HUD 텍스트를 절대 표시하지 않는다.
    Round 정보는 `<RoundTransition>` 이벤트 화면(라운드 사이 1~2초 자동 전환)에서만.
    이유: Voter = 매치 안의 선수, 관중 아님. "{라운드명} · MATCH {n}/{total}" HUD는 관중 환상.
  - 수정: Tournament 목록 카드(TournamentCard)에서 Round 진행 표시 완전 제거

★ 수정 ③: "ENDS IN" 카운트다운 개념 오류 수정
  - 오류: VS Battle 배지 옆 "ENDS IN 14:48:32" 타이머
  - 근거: Match·Round에는 Deadline 없음. Tournament Deadline만 존재.
  - 수정: 해당 타이머 완전 제거

[v2.2 추가 항목 — 3가지]

④ Interactive Feature Cards (§4-C 신설)
   WC48 Features 섹션 3카드: Tournament Shuffler + Vote Feed Typewriter + Match Scheduler

⑤ Philosophy / Manifesto 섹션 (§10-A 신설)
   "Most apps predict winners. WorldCrown48 lets fans decide." — parallax + GSAP SplitText reveal

⑥ Sticky Stacking Archive (§10-B 신설)
   3단계 흐름(Launch → Vote → Crown) pin-on-scroll 카드

[유지 항목] — v2.1 100% 계승
- 모든 디자인 토큰 (컬러·타이포·간격·모서리·그림자)
- 노이즈 텍스처 레이어 (§4-A)
- 자석 버튼 시스템 (§4-B)
- Floating Island GNB (§7)
- GSAP 라이프사이클 패턴 (§9)
- 스태거 fade-up 토큰 (§9)
- Footer System Operational 인디케이터 (§9)
- 모든 도메인별 컬러 명세
- Tailwind 설정
```

---

## 🗂️ 디자인 파일 저장 위치 (Claude Design ↔ 프로젝트)

```
docs/design/
├── WC48_DESIGN_SYSTEM_v2.4.md     ← 단일 진실 공급원 (이 파일)
├── SKILL.md                        ← worldcrown48-design 에이전트 스킬
├── colors_and_type.css             ← CSS 변수 + 폰트 정의
├── assets/                         ← 브랜드 SVG 자산 (Claude Design 관리)
│   ├── wc48-crown-filled.svg
│   ├── wc48-crown-outline.svg
│   ├── wc48-crown-circle-filled.svg
│   ├── wc48-crown-circle-outline.svg
│   ├── wc48-wordmark-dark.svg
│   ├── wc48-wordmark-light.svg
│   ├── wc48-branding-horizontal-dark.svg
│   └── wc48-branding-horizontal-light.svg
├── fonts/                          ← 폰트 파일 (Claude Design 관리)
│   ├── Pretendard-*.otf
│   └── PlayfairDisplay-*.ttf
├── preview/                        ← HTML 미리보기 파일 (Claude Design 생성)
│   ├── 01~06: 컬러 시스템
│   ├── 10~14: 타이포그래피
│   ├── 20~23: 간격·모서리·그림자·노이즈
│   ├── 30~36: 버튼·배지·카드·VS·Crown·GNB·폼
│   └── 40~43: 로고·워드마크·브랜딩·아이콘
├── ui_kits/worldcrown48/           ← React 컴포넌트 키트 (Claude Design 생성)
│   ├── App.jsx          (4스크린 프로토타입)
│   ├── LaunchPad.jsx    (Domain 0)
│   ├── Pitch.jsx        (Domain 1)
│   ├── Arena.jsx        (Domain 3 컨테이너)
│   ├── VSBattle.jsx     (Domain 3 핵심 컴포넌트)
│   ├── CrownCard.jsx    (Crown Card)
│   ├── CrownReveal.jsx  (Crown 확정 연출)
│   ├── GNBIsland.jsx    (Floating Island GNB)
│   ├── MagneticButton.jsx
│   ├── TournamentCard.jsx
│   ├── kit.css
│   └── index.html
└── reference/                      ← 이전 버전 보관
    └── WC48_DESIGN_SYSTEM_v2.1.md
    (v2.2 등 구버전은 _archive/design_system/ 참조 — 2026-05-28)

public/brand/                       ← Next.js 프로덕션 브랜드 자산 (배포용)
  ← docs/design/assets/ 에서 복사
```

> **Claude Design 파일 동기화 규칙:**
> Claude Design에서 파일이 수정되면 → `docs/design/assets/`, `docs/design/preview/`, `docs/design/ui_kits/` 에 덮어쓰기
> 브랜드 자산(SVG) 변경 시 → `public/brand/` 에도 동일하게 복사

---

## ⛔ 디자인 절대 원칙 (v2.2 수정판)

```
0. ★★★ 평범한 AI 생성물 같지 않게 ★★★  (v2.1 계승)
   "모든 화면은 디지털 악기처럼 느껴져야 한다."

1. Crown Gold(#FCD006)가 메인 포인트, 3종 액센트는 보조로만 사용
2. 형광 노랑·그린·핑크 금지 (Aura Yellow #EEDA7D는 허용)
3. ★ "AI GENERATED" + 구버전 "● AI-Report" 카드 바이라인 모두 영구 폐기 → **"✦ AI-Report"** (12px JetBrains Mono 골드)만 사용, **뉴스 article 푸터에만** 등장. 카드·배너·박스 어디에도 표시 금지.  ← v2.4 수정 (2026-05-31)
4. "FIFA", "Official" 문자 사용 금지 (상표권)
5. Vote Count(절대 수치) UI 노출 금지 — Vote Rate(%)만 표시
6. 듀얼 테마: 다크(Domain 0~3) + 라이트(Domain 4~6)
7. 반응형: 375px / 768px / 1440px
8. 다크 톤은 절대 순수 블랙(#000000) 사용 금지
9. Crown 로고는 등록된 SVG 자산만 사용

★ v2.2 신규 절대 원칙:
10. Round 진행률을 Tournament 목록(The Pitch)에 노출 금지
    Round = Voter 개인값. TournamentCard에 라운드 프로그레스바 금지.
11. Match·Round에 Deadline 카운트다운 금지
    Tournament Deadline(마감일)만 표시 허용.
12. "odds", "예측", "베팅" 연상 문구 사용 금지 (서비스 정체성 원칙①)
```

---

## ★ v2.4 재정립: AI-Report 배지 표준 (§10 재작성)

> **CLAUDE.md 불변 원칙 #4 (2026-05-31 갱신) 기준** — "AI GENERATED" + 구버전 "● AI-Report" 카드 바이라인 모두 영구 폐기.
> 새 디자인 시스템(2026-05-31 Claude Design 통합) 결정과 일치. 자세한 결정 맥락은 `CHANGELOG.md`의 2026-05-31 엔트리 참조.

### 단일 표준 — "✦ AI-Report" 푸터 전용

WC48에서 AI가 생성한 콘텐츠를 표시하는 **유일한 시각 표기**는 다음과 같습니다:

```tsx
/* ✅ AI-Report 인라인 블록 — 뉴스 article 본문 최하단 전용 */
function AIReportFooter() {
  return (
    <div style={{
      display: "inline-block",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--color-gold)",
      borderTop: "1px solid rgba(252,208,6,0.2)",
      paddingTop: 8,
      marginTop: 16,
    }}>
      ✦ AI-Report
    </div>
  );
}
```

```css
/* CSS 클래스 버전 — 뉴스 article 푸터 전용 */
.ai-report-footer {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-gold);
  border-top: 1px solid rgba(252, 208, 6, 0.2);
  padding-top: 8px;
  margin-top: 16px;
}
```

### 사용 위치 정리 (v2.4)

```
허용 — "✦ AI-Report" (12px JetBrains Mono 골드):
  ✅ Fan Intelligence (C5) 뉴스 article 본문 푸터 — 작성자 표시 위치
  ✅ AI-Report 카테고리에 속한 뉴스 article 상세 뷰의 본문 푸터

절대 사용 금지 — AI 관련 모든 형태:
  ❌ 카드 바이라인 "● AI-Report" — v2.4에서 영구 폐기
     (구 v2.2~v2.3 정책: TournamentCard·NewsCard·Fan Intelligence 카드의
      바이라인용으로 권장했음 — 2026-05-31자로 폐기)
  ❌ "AI GENERATED" — v2.2부터 폐기 유지
  ❌ "AI" 단독 배지
  ❌ "AI-powered", "AI-generated" 텍스트
  ❌ 카드·배너·박스·리스트 아이템·뉴스룸 칼럼 헤더 등 article 본문 푸터
     이외의 어떤 표면에도 ✦ AI-Report 배지 사용 금지

AIReportCard (Newsroom AI-Report 칼럼의 카드) 시각 처리 가이드:
  - 카드 자체에 "✦ AI-Report" 텍스트 배지를 붙이지 않습니다.
  - 대신 미묘한 골드 좌측 보더, 코너의 작은 모노 "REPORT" 태그, 또는
    카드 배경 톤 미세 조정 등 비텍스트 시각 처리로 "AI 콘텐츠"임을 암시합니다.
  - 사용자가 카드를 클릭해 article 상세로 들어가면 본문 푸터에서 "✦ AI-Report"
    배지가 처음으로 등장합니다.
```

---

## ★ v2.2 수정: Round / Match / Tournament Deadline 표기 기준

> **v4.9 핵심 원칙 ② 기반** — Round 본질 한 문장

### Round 표기 — RoundTransition 이벤트 화면에서만 (2026-05-28 정정)

```
✅ 올바른 표기: 라운드 사이 RoundTransition 이벤트에서만
  "🎉 {라운드명} 시작!"
  예: "🎉 24강 시작!"
      "🎉 12강 시작!"
      "🎉 THE FINAL!"

❌ 절대 금지 표기 (HUD 자체가 금지):
  "{라운드명} · MATCH {n}/{total}"  — Match 화면 HUD 금지 (관중 환상)
  "ROUND OF 48 · MATCH 7/24"        — 동일한 이유
  "Round {n}/{total}"               — 라운드를 카운터처럼 표시 금지
  "Round 2 of 5"                    — 동일
  "ROUND · 29%"                     — 라운드 진행률 표시 금지
  "In Progress (29%)"               — 동일

근거: Voter는 매치 안의 선수, 관중 아님. 외부 관찰자용 HUD는 환상.
```

### Tournament 카드 (The Pitch) — Round 정보 완전 제거

```
✅ TournamentCard에 표시 가능한 정보:
  - 카테고리 배지 (FOOTBALL / K-POP / OTHER)
  - Tournament 제목
  - Contestant 수 (예: "48 Contestants")
  - Tournament Deadline (예: "Jun 30")
  - Tournament 상태 배지: draft / published / active / closed / completed

❌ TournamentCard에 표시 금지:
  - Round 번호 또는 진행률
  - Match 수 또는 완료율
  - "In Progress" (유효 상태값 아님 → "active" 사용)
  - 투표 수 절대값
  - LIVE 배지 (Tournament는 투표자 혼자 진행)
```

### Tournament Deadline vs Match/Round Deadline

> 🚨 **반복 발생 오류**: 아래 패턴은 여러 세션에 걸쳐 반복적으로 잘못 생성됩니다.
> UI를 만들 때 반드시 이 섹션을 확인하세요.
>
> 🛑 **시각 진실:** `docs/mental-model/MENTAL_MODEL.svg` — 좌측 WRONG 9개 불릿 / 우측 RIGHT 6개 원칙 참조.

```
Tournament Deadline  ✅ 표시 가능 — "마감: Jun 30" / "ENDS · 8 DAYS"
Round Deadline       ❌ 존재하지 않음 — 표시 금지
Match Deadline       ❌ 존재하지 않음 — 표시 금지
```

**가장 흔한 오류 패턴 (절대 생성 금지):**
```
❌ "ROUND OF 16 · 8 matches · ends in 03:14:22"
     → 오류 1: "ROUND OF 16" 자체가 WC48에 존재하지 않는 라운드명
     → 오류 2: 라운드 타이머 금지
❌ "QUARTERFINAL · MATCH 3" — FIFA 용어 금지
❌ "SEMIFINAL", "ROUND OF 32" — 모두 FIFA 용어 금지

✅ 라운드는 토너먼트 안에만 존재

✅ WC48 올바른 라운드명 (48개 Contestant 기준):
   ROUND OF 48 (48강, 24 matches)
   ROUND OF 24 (24강, 12 matches)
   ROUND OF 12 (12강, 6 matches)
   ROUND OF 6  (6강, 3 matches)
   THE FINAL   (결승, 1 match)

❌ Round 카드 금지 
❌ "ROUND OF 48 · 24 matches remaining"
❌ "ROUND OF 48 · 3 of 24 completed"
```

**Arena VS Battle 카드 올바른 구성:**
```
Arena VS Battle 카드 (2026-06-04 v2.4 패치 — Tournament Deadline 필수화):
  ✅ Contestant 좌·우 이미지·이름
  ✅ 하단 선택지: "VOTE LEFT" / "VOTE RIGHT" (MagneticButton)
  ✅ Tournament Deadline 칩 — Arena 헤더 우측 항상 노출 (필수, 모든 서피스 일관)
       상세 명세: ↓ §TournamentDeadlineChip 컴포넌트
  ✅ (선택) 시각적 미니 인디케이터 — 텍스트 없는 progress dot 정도

  ❌ 상단 헤더에 "{라운드명} · MATCH {n}/{total}" 같은 텍스트 HUD 금지
       이유: Voter는 매치 안의 선수, 관중 아님. Round 정보는 RoundTransition 이벤트에서만.
  ❌ "ENDS IN XX:XX" 타이머
  ❌ 날짜·시각·타임스탬프 ("2026-05-26", "14:32 KST", "TODAY" 등 모든 형태)
  ❌ 일일 투표 횟수 ("VOTE 3/5 TODAY", "DAILY VOTES", "이번 주 5회" 등)
  ❌ 투표율·득표율 ("54%", "36% vs 64%", Vote Rate 바)
  ❌ LIVE 배지
  ❌ Round 진행률·퍼센트
```

> 🚨 **2026-05-27 실제 발생 오류 기록** — 아래 패턴이 생성된 UI에서 직접 발견되었습니다.
> 이 패턴이 코드에 존재하면 즉시 삭제하세요.
```
❌ "MATCH 7/24  ·  VOTE 3/5 TODAY"     ← 일일 투표 카운터 금지
❌ "2026-05-26 · 14:32 KST"            ← 타임스탬프 금지
❌ "54% VOTE RATE · RANKING ONLY"      ← VS Battle에서 투표율 금지
```

---

## §TournamentDeadlineChip 컴포넌트 ★ v2.4 패치 (2026-06-04 신설)

> **결정 근거**: The Lab(B1)에서 Host가 `tournamentDeadline`을 설정하지만 Arena UI 표시 명세가 누락되어 있었음. 2026-06-04 3대 의제 결정 §1(전략 A — 항상 노출)로 본 컴포넌트 신설.
> **단일 진실 스펙**: `docs/lite-specs/C1-vote-engine.md` §UI · TournamentDeadlineChip

### 사용 위치 — 필수 노출 (모든 Arena 서피스)

| 서피스 | 노출 | 비고 |
|--------|------|------|
| VS Battle | ✅ 필수 | Arena 헤더 우측 |
| Round Transition | ✅ 필수 | 전환 화면 상단 작은 칩 |
| THE FINAL | ✅ 필수 | 결승 헤더 우측 |
| Crown Card (canvas) | ✅ 필수 | 메타 영역 영구 기록 |
| Ranking | ✅ 필수 | 헤더 우측 |
| Newsroom | ✅ 필수 | 헤더 우측 |

### 디자인 토큰

```css
.tournament-deadline-chip {
  font-family: var(--font-mono);          /* JetBrains Mono */
  font-size: 12px;
  color: var(--color-gold);                /* #FCD006 Crown Gold */
  letter-spacing: 0.04em;
  padding: 4px 10px;
  border: 0.5px solid rgba(252, 208, 6, 0.32);
  border-radius: var(--border-radius-md);
  background: rgba(252, 208, 6, 0.04);
  white-space: nowrap;
}

/* 임박 상태 (D-7 이내) — 좌측 점·테두리 강조 */
.tournament-deadline-chip[data-urgency="urgent"] {
  border-color: rgba(252, 208, 6, 0.64);
  background: rgba(252, 208, 6, 0.08);
}
.tournament-deadline-chip[data-urgency="urgent"]::before {
  content: "● ";
}

/* 마감 후 (closed) — 골드 → muted */
.tournament-deadline-chip[data-urgency="closed"] {
  color: var(--color-text-muted);
  border-color: rgba(255, 255, 255, 0.12);
  background: transparent;
}
```

### 4단계 상태 (data-urgency)

| 상태 | 조건 | 카피 (en) | 시각 |
|------|------|-----------|------|
| `normal` | D-day ≥ 8 | `Tournament ends · May 31` | 평상시 골드 |
| `urgent` | 1 ≤ D-day ≤ 7 | `● Ends in 3 days · May 31` | 점 + 강조 |
| `today` | D-day === 0 | `● Closes today` | 강조 |
| `closed` | status 마감 이후 | `Tournament closed` | muted |

### 반응형 위치

```
데스크탑(1440px·768px): ArenaHeader 우측 인라인 (TournamentTitle 옆)
모바일(375px):          TournamentTitle 아래 단독 줄
```

### Crown Card 통합 카피

캔버스 내부 `crown-card-info` 메타 라인:
```
{championName} · {tournamentTitle} · {tournamentDeadlineFormatted}
예: "M. Adeyemi · Strikers of the Century · May 31, 2026"
```
→ Champion 확정 후에도 마감일을 역사 기록으로 영구 보존.

### 금지 (재강조)

- ❌ 카운트다운 타이머(`hh:mm:ss`) 형식 — 압박감 금지
- ❌ "ENDS IN" 단독 강조 — 정중한 안내 톤 유지
- ❌ Round 진행률과 결합 표시 — Round Scope Lock 위반

---

## 4️⃣-C Interactive Feature Cards ★ v2.2 신설

> **출처**: Cinematic Landing Page Builder §Component C — "Interactive Functional Artifacts"
> **적용 위치**: Domain 0 (Launch Pad) 또는 Domain 1 (The Pitch) Features 섹션
> **채택 이유**: "정적 마케팅 카드 금지" 원칙. WC48의 3대 가치를 인터랙티브 마이크로 UI로 표현.

### 카드 1 — Tournament Shuffler (대진 카드 순환)

> WC48의 다양한 Tournament 타입을 5초마다 순환하며 보여줌.

```tsx
/* TournamentShuffler.tsx — Features Card 1 */
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SAMPLE_TOURNAMENTS = [
  { label: "FOOTBALL",  title: "World's Greatest Striker",    count: "48 Players" },
  { label: "K-POP",     title: "Idol of the Decade",          count: "48 Artists" },
  { label: "ANIME",     title: "Most Iconic Hero",            count: "48 Heroes"  },
];

export function TournamentShuffler() {
  const [items, setItems] = useState(SAMPLE_TOURNAMENTS);

  useEffect(() => {
    const interval = setInterval(() => {
      setItems(prev => {
        const next = [...prev];
        next.unshift(next.pop()!);  /* 마지막 항목을 맨 앞으로 */
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: "relative", height: 200 }}>
      {items.map((item, i) => (
        <motion.div
          key={item.title}
          layout
          animate={{
            y: i * 16,
            scale: 1 - i * 0.04,
            opacity: 1 - i * 0.25,
            zIndex: 3 - i,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            position: "absolute", width: "100%",
            background: "var(--color-bg-soft)",
            border: "1px solid var(--color-border)",
            borderRadius: 16, padding: "16px 20px",
          }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-muted)", letterSpacing: "0.2em" }}>{item.label}</div>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, marginTop: 6, color: "var(--color-text)" }}>{item.title}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-gold)", marginTop: 4 }}>{item.count}</div>
        </motion.div>
      ))}
    </div>
  );
}
```

```
사용 규칙:
  - 카드 배경: --color-bg-soft
  - 애니메이션: spring stiffness 300 / damping 30
  - 순환 간격: 5초
  - 최대 표시 카드: 3장 (depth 0~2)
  - 각 카드 scale: 0, 0.96, 0.92 (depth에 따라)
```

---

### 카드 2 — Vote Feed Typewriter (실시간 투표 텍스트 피드)

> Voter들이 지금 이 순간 어떤 선택을 하는지 실시간으로 흐르는 느낌.

```tsx
/* VoteFeedTypewriter.tsx — Features Card 2 */
'use client';
import { useState, useEffect, useRef } from 'react';

const VOTE_MESSAGES = [
  "Fan #4,812 just voted for Son Heung-min",
  "New Crown candidate: Kylian Mbappé",
  "Upset: Underdog Choi takes 56% lead",
  "48강 Round begins · 24 matches to go",
  "Fan #7,301 crowned their Champion",
  "AI-Report: sentiment surge detected",
];

export function VoteFeedTypewriter() {
  const [displayText, setDisplayText] = useState("");
  const [msgIndex, setMsgIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const current = VOTE_MESSAGES[msgIndex];

    if (charIndex < current.length) {
      timeoutRef.current = setTimeout(() => {
        setDisplayText(current.slice(0, charIndex + 1));
        setCharIndex(c => c + 1);
      }, 38);
    } else {
      timeoutRef.current = setTimeout(() => {
        setMsgIndex(i => (i + 1) % VOTE_MESSAGES.length);
        setCharIndex(0);
        setDisplayText("");
      }, 2200);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [charIndex, msgIndex]);

  return (
    <div style={{ padding: "20px 24px", background: "var(--color-bg-soft)", borderRadius: 16, border: "1px solid var(--color-border)", minHeight: 120 }}>
      {/* Live 인디케이터 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--color-turquoise)", animation: "ping 1.5s ease infinite", opacity: 0.75 }} />
          <span style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: "var(--color-turquoise)" }} />
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-muted)", letterSpacing: "0.2em" }}>LIVE FEED</span>
      </div>
      {/* 타이프라이터 텍스트 */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--color-text)", lineHeight: 1.5 }}>
        {displayText}
        <span style={{ display: "inline-block", width: 2, height: "1em", background: "var(--color-gold)", marginLeft: 2, animation: "blink 1s step-end infinite", verticalAlign: "text-bottom" }} />
      </div>
    </div>
  );
}
```

```css
/* globals.css 추가 */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
```

```
사용 규칙:
  - 타이핑 속도: 38ms/글자
  - 메시지 표시 후 대기: 2200ms
  - 커서: Crown Gold 2px 세로 막대 + blink 애니메이션
  - Live 인디케이터: Turquoise ping
  - 메시지에 "odds", "예측", "베팅" 관련 표현 금지
```

---

### 카드 3 — Match Scheduler (Match 진행 애니메이션)

> "48강에서 Champion까지" 흐름을 애니메이션 커서로 시각화.

```tsx
/* MatchScheduler.tsx — Features Card 3 */
'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const ROUNDS = [
  { name: "48강",  matches: 24 },
  { name: "24강",  matches: 12 },
  { name: "12강",  matches: 6  },
  { name: "6강",   matches: 3  },
  { name: "결승",  matches: 1  },
];

export function MatchScheduler() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5 });

      ROUNDS.forEach((round, i) => {
        tl.to(`.round-row-${i}`, {
          backgroundColor: "rgba(252,208,6,0.15)",
          borderColor: "rgba(252,208,6,0.5)",
          duration: 0.3,
        })
        .to(`.round-dot-${i}`, { scale: 1.4, backgroundColor: "var(--color-gold)", duration: 0.2 }, "<")
        .to(`.round-row-${i}`, {
          backgroundColor: "rgba(252,208,6,0.05)",
          borderColor: "rgba(252,208,6,0.15)",
          duration: 0.4,
          delay: 0.5,
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} style={{ padding: "20px 24px", background: "var(--color-bg-soft)", borderRadius: 16, border: "1px solid var(--color-border)" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-muted)", letterSpacing: "0.2em", marginBottom: 16 }}>YOUR JOURNEY</div>
      {ROUNDS.map((round, i) => (
        <div
          key={round.name}
          className={`round-row-${i}`}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", borderRadius: 8, marginBottom: 6,
            border: "1px solid rgba(252,208,6,0.15)",
            transition: "all 0.3s ease",
          }}
        >
          <span className={`round-dot-${i}`} style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-text-muted)", flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 14, color: "var(--color-text)", flex: 1 }}>{round.name}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-muted)" }}>{round.matches} Matches</span>
        </div>
      ))}
    </div>
  );
}
```

```
사용 규칙:
  - 라운드 순서: 48강 → 24강 → 12강 → 6강 → 결승 (5단계)
  - 각 라운드 하이라이트: Gold subtle 배경 + Gold 테두리 + dot scale(1.4)
  - GSAP: gsap.context() + ctx.revert() 클린업 필수
  - 반복: repeat: -1 (무한 반복)
  - "Round Deadline" 표시 절대 금지 — 라운드에는 마감 없음
```

---

## 1️⃣0️⃣-A Philosophy / Manifesto 섹션 ★ v2.2 신설

> **출처**: Cinematic Landing Page Builder §Component D — "The Philosophy"
> **적용 위치**: Domain 0 (Launch Pad) 또는 Domain 1 (The Pitch) 히어로 직후 섹션
> **채택 이유**: WC48의 핵심 차별점 — "예측이 아닌 팬의 선택" 을 강렬하게 선언.

### 레이아웃 명세

```
섹션 배경: --color-bg-deep (#00003A) — 전폭 full-width
배경 레이어: 저명도 parallax 텍스처 이미지 (경기장·군중·야간 조명) + 무거운 그라디언트 오버레이
텍스트 배치: 중앙 정렬 / max-w-[800px] mx-auto
상하 패딩: py-[120px] md:py-[160px]
```

### 타이포그래피 패턴

```
라인 1 (중립·작게):
  "Most platforms focus on:"
  font-heading / text-[18px] / color-text-muted / font-normal

라인 2 (중립 내용):
  "Predicting the winner."
  font-heading / text-[22px] / color-text / font-normal / opacity-60

라인 3 (구분선): Gold 1px / width-[60px] / mx-auto / my-[32px]

라인 4 (WC48 선언·크게):
  "We let fans"
  font-display italic / text-[48px] md:text-[72px] / color-text

라인 5 (핵심 키워드):
  "DECIDE."
  font-heading bold / text-[64px] md:text-[96px] / color-gold / uppercase
```

### React + GSAP 구현

```tsx
/* PhilosophySection.tsx */
'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export function PhilosophySection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* 단어 단위 fade-up reveal */
      gsap.from('.manifesto-line', {
        y: 50,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.2,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          once: true,
        },
      });

      /* parallax 배경 */
      gsap.to('.manifesto-bg', {
        yPercent: -20,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--color-bg-deep)',
        padding: '120px 24px',
      }}
    >
      {/* parallax 배경 레이어 */}
      <div
        className="manifesto-bg"
        style={{
          position: 'absolute', inset: '-20%',
          backgroundImage: 'url("https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600")',
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.08,
        }}
      />
      {/* 그라디언트 오버레이 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, var(--color-bg-deep) 0%, transparent 30%, transparent 70%, var(--color-bg-deep) 100%)',
      }} />

      {/* 콘텐츠 */}
      <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <p className="manifesto-line" style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: 'var(--color-text-muted)', fontWeight: 400, margin: 0 }}>
          Most platforms focus on:
        </p>
        <p className="manifesto-line" style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--color-text)', fontWeight: 400, opacity: 0.6, marginTop: 8 }}>
          Predicting the winner.
        </p>

        {/* 구분선 */}
        <div className="manifesto-line" style={{ width: 60, height: 1, background: 'var(--color-gold)', margin: '32px auto' }} />

        <p className="manifesto-line" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(36px, 6vw, 72px)', color: 'var(--color-text)', margin: 0, lineHeight: 1.1 }}>
          We let fans
        </p>
        <p className="manifesto-line" style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(52px, 8vw, 96px)', color: 'var(--color-gold)', margin: '8px 0 0', letterSpacing: '-0.02em', lineHeight: 1 }}>
          DECIDE.
        </p>
      </div>
    </section>
  );
}
```

### 접근성 규칙

```
✅ 배경 이미지: aria-hidden="true"
✅ 텍스트 대비: Gold (#FCD006) on Deep (#00003A) — 대비비 9.2:1 통과
✅ prefers-reduced-motion: parallax + stagger 모두 비활성화
```

---

## 1️⃣0️⃣-B Sticky Stacking Archive ★ v2.2 신설

> **출처**: Cinematic Landing Page Builder §Component E — "Sticky Stacking Archive"
> **적용 위치**: Domain 0 (Launch Pad) How It Works 섹션
> **채택 이유**: Launch → Vote → Crown 3단계 흐름을 몰입감 있게 전달. 스크롤하며 다음 카드가 이전 카드 위에 쌓이는 방식.

### 3단계 카드 콘텐츠

```
카드 1 — LAUNCH:  "48개의 Contestant, 하나의 무대"
  배경: --color-bg-elevated (#362261)
  애니메이션: 천천히 회전하는 동심원 SVG (4초 주기)
  단계 번호: "01" / font-mono / Gold
  타이틀: "Enter the Arena" / font-heading / 32px
  설명: "48 Contestants. Your tournament. Your rules."

카드 2 — VOTE:   "Match by Match, 진짜 챔피언을 향해"
  배경: --color-bg-deep (#00003A) + Turquoise/Crimson 양측 글로우
  애니메이션: 수평 레이저 라인이 도트 그리드를 가로지름 (2초 주기)
  단계 번호: "02" / font-mono / Gold
  타이틀: "Vote Your Champion" / font-heading / 32px
  설명: "One Match at a time. No predictions. Pure fan choice."

카드 3 — CROWN:  "당신의 Champion, 당신의 Crown Card"
  배경: --color-bg-deep + Gold 방사형 글로우
  애니메이션: Crown 로고 SVG 펄스 (goldPulse keyframe)
  단계 번호: "03" / font-mono / Gold
  타이틀: "Claim Your Crown" / font-heading / 32px
  설명: "Your Champion is crowned. Share your Crown Card with the world."
```

### GSAP ScrollTrigger 구현

```tsx
/* StickyStackingArchive.tsx */
'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    num: "01", title: "Enter the Arena",
    desc: "48 Contestants. Your tournament. Your rules.",
    bg: "#362261",
    animation: "circles",
  },
  {
    num: "02", title: "Vote Your Champion",
    desc: "One Match at a time. No predictions. Pure fan choice.",
    bg: "#00003A",
    animation: "laser",
  },
  {
    num: "03", title: "Claim Your Crown",
    desc: "Your Champion is crowned. Share your Crown Card with the world.",
    bg: "#00003A",
    animation: "crown",
  },
];

export function StickyStackingArchive() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.stack-card') as HTMLElement[];

      cards.forEach((card, i) => {
        if (i === cards.length - 1) return; /* 마지막 카드는 pin 없음 */

        ScrollTrigger.create({
          trigger: card,
          start: 'top top',
          pin: true,
          pinSpacing: false,
        });

        /* 다음 카드가 올라오면 이 카드를 scale down + blur */
        gsap.to(card, {
          scale: 0.9,
          filter: 'blur(4px)',
          opacity: 0.5,
          ease: 'none',
          scrollTrigger: {
            trigger: cards[i + 1],
            start: 'top bottom',
            end: 'top top',
            scrub: true,
          },
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef}>
      {STEPS.map((step, i) => (
        <div
          key={step.num}
          className="stack-card"
          style={{
            height: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: step.bg,
            transformOrigin: 'top center',
          }}
        >
          <div style={{ maxWidth: 640, padding: '0 32px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-gold)', letterSpacing: '0.3em', marginBottom: 24 }}>
              {step.num}
            </div>

            {/* 각 카드별 캔버스 애니메이션 영역 */}
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
              {step.animation === 'circles' && <AnimCircles />}
              {step.animation === 'laser'   && <AnimLaser />}
              {step.animation === 'crown'   && <AnimCrown />}
            </div>

            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', color: 'var(--color-text)', margin: '0 0 16px' }}>
              {step.title}
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 18, color: 'var(--color-text-sub)', lineHeight: 1.6, margin: 0 }}>
              {step.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── 카드별 인라인 애니메이션 ── */

function AnimCircles() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ animation: 'spin 8s linear infinite' }}>
      {[20, 35, 50].map(r => (
        <circle key={r} cx="60" cy="60" r={r} fill="none" stroke="rgba(252,208,6,0.3)" strokeWidth="1" />
      ))}
      <circle cx="60" cy="60" r="6" fill="var(--color-gold)" />
    </svg>
  );
}

function AnimLaser() {
  return (
    <svg width="200" height="80" viewBox="0 0 200 80">
      {Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 10 }, (_, col) => (
          <circle key={`${row}-${col}`} cx={col * 20 + 10} cy={row * 16 + 8} r="2" fill="rgba(0,163,183,0.3)" />
        ))
      )}
      <rect x="0" y="0" width="200" height="80" fill="none" />
      <line x1="0" y1="40" x2="200" y2="40" stroke="var(--color-turquoise)" strokeWidth="1.5" opacity="0.8"
        style={{ animation: 'laser-scan 2s ease-in-out infinite' }} />
    </svg>
  );
}

function AnimCrown() {
  return (
    <img
      src="/brand/wc48-crown-filled.svg"
      width={80} height={80}
      alt=""
      style={{ animation: 'gold-pulse 3s ease-in-out infinite' }}
    />
  );
}
```

```css
/* globals.css 추가 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes laser-scan {
  0%, 100% { transform: translateY(-30px); opacity: 0; }
  20%       { opacity: 1; }
  80%       { opacity: 1; }
  50%       { transform: translateY(30px); }
}
```

```
Sticky Stacking 사용 규칙:
  - 카드 수: 정확히 3장 (WC48 3단계 흐름)
  - 각 카드 높이: 100dvh
  - 이전 카드 퇴장: scale(0.9) + blur(4px) + opacity(0.5)
  - GSAP: gsap.context() + ctx.revert() 필수
  - prefers-reduced-motion: pin 유지, 애니메이션만 비활성화
  - "Round Deadline", "ENDS IN" 등 금지 표현 절대 삽입 금지
```

---

## 1️⃣2️⃣ 디자인 체크리스트 (v2.2 업데이트)

```
[ 선결 조건 ]
  [ ] Crown 로고 4종 SVG 자산이 /public/brand/에 등록됨
  [ ] WorldCrown48 워드마크 SVG 자산이 등록됨
  [ ] 등록된 SVG 자산만 사용

[ ★ v2.2 개념 오류 수정 체크 — 신설 ]
  [ ] TournamentCard에 Round 진행 표시(프로그레스바, Round n/total)가 없음
  [ ] Arena VS Battle 화면에 Round/Match 텍스트 HUD가 없음 (2026-05-28 정정)
  [ ] Round 정보는 RoundTransition 이벤트 화면에서만 표시됨
  [ ] VS Battle에 "ENDS IN" 카운트다운이 없음
  [ ] Tournament 상태 배지가 draft/published/active/closed/completed 중 하나임
       ("In Progress" 사용 금지)
  [ ] 뉴스/피드 문구에 "odds", "예측", "베팅" 연상 표현이 없음

[ ★ v2.4 AI-Report 체크 — 재정립 ]
  [ ] "AI GENERATED" 배지가 코드 어디에도 없음
  [ ] "AI" 단독 배지가 없음
  [ ] 구버전 "● AI-Report" 카드 바이라인이 코드 어디에도 없음 (v2.4에서 영구 폐기)
  [ ] Fan Intelligence 뉴스 article 본문 푸터: "✦ AI-Report" (12px JetBrains Mono 골드) 적용됨
  [ ] AIReportCard 등 카드/배너/박스/리스트 아이템 어디에도 "✦ AI-Report" 텍스트 배지가 붙지 않음
  [ ] AIReportCard에는 비텍스트 시각 처리(미묘한 골드 좌측 보더, 코너 "REPORT" 모노 태그 등)만 사용됨

[ ★ v2.1 AI 패턴 박멸 체크 — 계승 ]
  [ ] 노이즈 오버레이(NoiseOverlay.tsx)가 전역 레이아웃에 삽입됨
  [ ] 주요 CTA·투표 버튼에 MagneticButton 컴포넌트가 적용됨
  [ ] GNB가 Floating Island 형태로 구현됨 (pill + 스크롤 morph)
  [ ] 히어로·VS Battle·Crown Card에 GSAP 스태거 fade-up 진입이 적용됨
  [ ] GSAP 애니메이션이 모두 gsap.context() + ctx.revert()로 감싸져 있음
  [ ] Footer에 FooterStatus 인디케이터가 있음

[ ★ v2.2 Cinematic 완성 체크 — 신설 ]
  [ ] Features 섹션에 3개 인터랙티브 카드 적용됨
       (TournamentShuffler / VoteFeedTypewriter / MatchScheduler)
  [ ] Philosophy/Manifesto 섹션이 구현됨
       ("Most platforms predict. We let fans DECIDE.")
  [ ] Sticky Stacking Archive 3단계 카드가 구현됨
       (Launch → Vote → Crown)

[ 컬러 시스템 — 계승 ]
  [ ] 다크 테마에 순수 블랙(#000000) 없음
  [ ] Crown Gold가 메인 포인트로만 사용
  [ ] Royal Crimson은 VS·Live·에러에만 사용
  [ ] Turquoise는 성공·완료·긍정 피드백에만 사용

[ 반응형 ]
  [ ] 모바일(375px) / 태블릿(768px) / 데스크탑(1440px) 완성

[ 접근성 ]
  [ ] 텍스트 대비비 4.5:1 이상
  [ ] 버튼 터치 영역 44×44px
  [ ] prefers-reduced-motion 존중 (GSAP + CSS 모두)
  [ ] aria-hidden on 순수 장식 요소
```

---

## 변경 이력

| 버전 | 날짜 | 주요 변경 |
|---|---|---|
| v1.0 | 2026-05 | 최초 작성 |
| v2.0 | 2026-05-14 | ★ 컬러·톤 전면 개편 — Twilight Stadium Edition |
| v2.1 | 2026-05-15 | ★ Cinematic Update — 노이즈·자석버튼·GNB·GSAP |
| **v2.2** | **2026-05-22** | **★ Concept Fix + Cinematic Complete** |
| | | ★ 수정 ①: "AI GENERATED" → "● AI-Report" 표기 통일 (CLAUDE.md v1.2 #4) |
| | | ★ 수정 ②: Round 표기 오류 수정 — TournamentCard Round 진행 제거 |
| | | ★ 수정 ③: "ENDS IN" Match 타이머 제거 (Match·Round에 Deadline 없음) |
| | | § 디자인 파일 저장 위치 맵 신설 |
| | | §4-C Interactive Feature Cards 3종 (Shuffler/Typewriter/Scheduler) 신설 |
| | | §10-A Philosophy/Manifesto 섹션 신설 |
| | | §10-B Sticky Stacking Archive 3단계 신설 |
| | | 절대 원칙 10~12번 신설 |
| | | 디자인 체크리스트 v2.2 항목 추가 |
| | | ui_kits JSX 파일 오류 수정 (TournamentCard / VSBattle / Arena / App) |
| **v2.3** | **2026-05-27** | **★ Round Scope Lock + Arena Rule Complete** |
| | | ★ 수정 ①: Round 표시 범위 확정 — Arena(Tournament 내부)에서만 허용 |
| | | ★ 수정 ②: Round Card 생성 금지 명문화 (`<RoundCard />` 등 모든 형태) |
| | | ★ 수정 ③: LIVE 배지 → TournamentCard 표시 금지 목록에 추가 |
| **v2.4** | **2026-05-31** | **★ AI-Report Footer-Only Lock** |
| | | ★ 재정립 ①: 카드 바이라인 "● AI-Report" 영구 폐기 (v2.2~v2.3 정책에서 권장되었으나 폐기) |
| | | ★ 재정립 ②: "✦ AI-Report" (12px JetBrains Mono 골드) **뉴스 article 본문 푸터에만** 등장 |
| | | ★ 재정립 ③: AIReportCard 등 카드·배너·박스에는 비텍스트 시각 처리만 (골드 좌측 보더 / "REPORT" 모노 태그 등) |
| | | ★ §AI-Report 배지 표준 섹션 전체 재작성 (구 카드 바이라인 코드 예제 제거) |
| | | ★ 절대 원칙 #3, 디자인 체크리스트, v2.2 변경 요약 박스에 폐기 사실 명시 |
| | | 근거: 2026-05-31 Claude Design 디자인 시스템 통합 시 CLAUDE.md 불변 원칙 #4 + 새 SKILL.md/README.md의 충돌을 해결한 결과 |
| **v2.4.1 패치** | **2026-06-04** | **★ TournamentDeadlineChip 컴포넌트 신설 + Arena 헤더 필수화** |
| | | ★ §TournamentDeadlineChip 신규 섹션 — 4단계 상태(normal/urgent/today/closed), 토큰, i18n 카피, Crown Card 통합 |
| | | ★ "Arena VS Battle 카드 올바른 구성" — Tournament Deadline을 "(선택)"에서 "필수"로 격상 |
| | | 근거: 2026-06-04 3대 의제 결정 §1(전략 A — 항상 노출). 단일 진실: `docs/planning/discussions/2026-06-04_three_topics.md` |

---

*© 2026 WorldCrown48 | 작성: 48티오 | WC48_DESIGN_SYSTEM_v2.4.md*
*Twilight Stadium Cinematic Edition · Round Scope Lock Release | v2.2 100% 계승 | CONFIDENTIAL*
