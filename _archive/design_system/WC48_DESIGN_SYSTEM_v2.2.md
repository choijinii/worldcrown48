# 🎨 WorldCrown48 (월크48) — UI 디자인 시스템 v2.3
# WC48_DESIGN_SYSTEM_v2.3.md
# Twilight Stadium Edition — Round Scope Lock + Arena Rule Complete | 2026-05-27 수정 | 작성자: 48티오
# 기반: WC48_DESIGN_SYSTEM_v2.2 100% 계승 + Round 표시 범위 확정 + Round Card 금지 + LIVE 배지 금지 추가

> **이 파일의 목적**: UI 디자이너 / Claude Design / Claude Code 작업 시 참조하는 월크48 공식 디자인 시스템입니다.
> v2.2의 모든 규격을 100% 계승하면서, Round 표시 범위를 확정하고 Round Card 금지·LIVE 배지 금지 규칙을 명문화합니다.

> **⚠️ v2.3 작업 범위 명시**:
> - v2.2의 기존 토큰·명세는 **일절 변경하지 않습니다.** 수정/신규 섹션만 추가합니다.
> - 수정 항목: ① Round 표시 범위 → Tournament 안(Arena)에서만 표시  ② Round Card 생성 금지 명문화  ③ LIVE 배지 → TournamentCard 표시 금지 목록에 추가

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

★ 수정 ①: "AI GENERATED" / "AI" 배지 → "● AI-Report" 표기 통일
  - 근거: CLAUDE.md v1.2 불변 원칙 #4
  - 영향: VSBattle.jsx / TournamentCard.jsx / Arena.jsx (NewsCard) / v2.1 체크리스트
  - 카드 바이라인: "● AI-Report" (11px, 골드)
  - 기사 본문 하단: "✦ AI-Report" (12px, 골드)

★ 수정 ②: Round 표기 개념 오류 수정
  - 오류: "Round {n}/{total}" → 라운드를 글로벌 카운터처럼 표시
  - 근거: Round = Voter 개인 진행값. DB 문서 없음. 글로벌 숫자 없음.
  - 수정: Arena에서 "{라운드명} · MATCH {n}/{totalMatches}" 형식으로 표시
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
├── WC48_DESIGN_SYSTEM_v2.3.md     ← 단일 진실 공급원 (이 파일)
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
    ├── WC48_DESIGN_SYSTEM_v2.1.md
    └── WC48_DESIGN_SYSTEM_v2.2.md

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
3. ★ "AI GENERATED" 배지 완전 폐기 → "● AI-Report" (11px 골드) 로 통일  ← v2.2 수정
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

## ★ v2.2 수정: AI-Report 배지 표준 (§10 업데이트)

> **CLAUDE.md v1.2 불변 원칙 #4 기준** — "AI GENERATED" 표기 완전 폐기

### 카드 바이라인 (TournamentCard, NewsCard, Arena 뉴스룸)

```tsx
/* ✅ AI-Report 배지 — 카드 바이라인용 */
function AIReportBadge() {
  return (
    <span style={{
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      fontWeight: 600,
      color: "var(--color-gold)",
      letterSpacing: "0.08em",
    }}>
      ● AI-Report
    </span>
  );
}
```

```css
/* CSS 클래스 버전 */
.ai-report-badge {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-gold);
  letter-spacing: 0.08em;
}
```

### 기사 본문 하단 (Fan Intelligence 뉴스 본문)

```tsx
/* ✅ AI-Report 인라인 블록 — 기사 본문 최하단 */
function AIReportInline() {
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

### 사용 위치 정리

```
카드 바이라인 "● AI-Report" (11px 골드):
  - TournamentCard: 카테고리 배지 옆
  - NewsCard (Arena 뉴스룸): 상단 좌측
  - Fan Intelligence 뉴스 카드: 타임스탬프 옆

기사 본문 하단 "✦ AI-Report" (12px 골드):
  - Fan Intelligence 기사 전문 하단 (작성자 표시 위치)
  - Crown Card 설명 텍스트 하단

절대 사용 금지:
  ❌ "AI GENERATED" — 완전 폐기
  ❌ "AI" 단독 배지
  ❌ "AI-powered", "AI-generated" 텍스트
```

---

## ★ v2.2 수정: Round / Match / Tournament Deadline 표기 기준

> **v4.9 핵심 원칙 ② 기반** — Round 본질 한 문장

### Round 표기 — Arena (Domain 3)에서만 사용

```
✅ 올바른 표기: 토너먼트 안에서 만 표기
  "{라운드명} · MATCH {현재번호}/{총매치수}"
  예: "48강 · MATCH 7/24"
      "24강 · MATCH 3/12"
      "결승 · MATCH 1/1"

❌ 금지 표기:
  "Round {n}/{total}"          — 라운드를 카운터처럼 표시 금지
  "Round 2 of 5"               — 동일한 이유로 금지
  "ROUND · 29%"                — 라운드 진행률 표시 금지
  "In Progress (29%)"          — 동일
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
Arena VS Battle 카드:
  ✅ 상단 헤더: "{토너먼트명} · MATCH {n}/{total}"
  ✅ 하단 선택지: "VOTE LEFT" / "VOTE RIGHT" (MagneticButton)
  ❌ "ENDS IN XX:XX" 타이머 — 완전 제거 (이 패턴이 Figma UI Kit에 잔존함, 수동 삭제 필요)
```

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
  [ ] Arena VS Battle 헤더가 "{라운드명} · MATCH {n}/{total}" 형식임
  [ ] VS Battle에 "ENDS IN" 카운트다운이 없음
  [ ] Tournament 상태 배지가 draft/published/active/closed/completed 중 하나임
       ("In Progress" 사용 금지)
  [ ] 뉴스/피드 문구에 "odds", "예측", "베팅" 연상 표현이 없음

[ ★ v2.2 AI-Report 체크 — 신설 ]
  [ ] "AI GENERATED" 배지가 코드 어디에도 없음
  [ ] "AI" 단독 배지가 없음
  [ ] 카드 바이라인: "● AI-Report" (11px 골드) 적용됨
  [ ] Fan Intelligence 기사 하단: "✦ AI-Report" (12px 골드) 적용됨

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

---

*© 2026 WorldCrown48 | 작성: 48티오 | WC48_DESIGN_SYSTEM_v2.3.md*
*Twilight Stadium Cinematic Edition · Round Scope Lock Release | v2.2 100% 계승 | CONFIDENTIAL*
