# WorldCrown48 — I18N_POLICY.md
# v1.0 — 2026-05-23
# 다국어(i18n) 정책 — 도메인별 상세 가이드

> ⚠️ **[2026-08-08 STALE 경고] 이 문서를 작업 기준으로 삼지 말 것.**
> 이 문서는 v1.0(2026-05-23) 기준으로 작성되어 현행과 불일치합니다:
> ① **es는 MVP 2 대기가 아니라 이미 라이브**입니다 (2026-07-01 결정 — 언어 토글·UI 사전·뉴스 3언어).
> ② **구현은 next-intl이 아니라 수제 React Context**(`lib/i18n/`) + `?lang=` 쿼리 방식입니다.
> ③ AI-Report 표기는 본문 예시의 "● AI-Report" 카드 배지가 아니라 **v2.5**(✦ AI-Report · 기사 푸터 1곳 전용 · 8px·50%)입니다.
>
> **현행 기준** = `lib/locale.ts` · `lib/i18n/` + `docs/handoffs/i18n-content-translation-handoff.md`, 표기는 `LANGUAGE.md`.

> 이 문서는 WorldCrown48의 다국어 지원 전략, MVP별 언어 출시 계획,
> 도메인별 번역 범위, 기술 구현 방법을 정의합니다.

---

## 1. MVP별 언어 출시 계획

```
MVP 1 (2026년 5월 31일):
  🇰🇷 ko (한국어)   — 한국 팬덤 공략
  🇺🇸 en (영어)     — 글로벌 영어권

MVP 2 (2026년 7월):
  🇲🇽 es (스페인어) — 남미 팬덤 공략
                      (아르헨티나·멕시코·콜롬비아·칠레 등)
                      2026 FIFA 월드컵 열기 최고조 시점 맞춤

MVP 3 (2026년 하반기):
  후보: 🇧🇷 pt-BR (브라질 포르투갈어)
        🇯🇵 ja (일본어)
        🇸🇦 ar (아랍어)
  결정 기준: MVP 2 트래픽 데이터 (국가별 접속 분포)
```

**불변 원칙**: 3개 언어 모두 글로벌 MZ Sporty 럭셔리 톤앤매너 유지. 한국적 요소 금지.

---

## 2. URL 구조 (Next.js i18n 라우팅)

> ⚠️ 현행 구현은 React Context(`lib/i18n.tsx`) + `?lang=` 쿼리 방식이며, 아래 next-intl / `/ko/`·`/en/`·`/es/` URL 라우팅 안은 **미채택**입니다(2026-07-01, A1-i18n). 확장은 `lib/i18n/messages.ts` + `useT`로 합니다.

```
worldcrown48.com/ko/       — 한국어 기본
worldcrown48.com/en/       — 영어 기본
worldcrown48.com/es/       — 스페인어 (MVP 2)

기본 리디렉션:
  worldcrown48.com/  → Accept-Language 헤더 기반 자동 감지
  감지 실패 → /en/ (기본값)

URL 예시:
  /ko/pitch              — The Pitch 한국어
  /en/arena/[tid]        — The Arena 영어
  /es/crown/[tid]        — Crown Card 스페인어 (MVP 2)
```

---

## 3. 기술 구현 — next-intl

> ⚠️ 현행 구현은 React Context(`lib/i18n.tsx`) + `?lang=` 쿼리 방식이며, 아래 next-intl / `/ko/`·`/en/`·`/es/` URL 라우팅 안은 **미채택**입니다(2026-07-01, A1-i18n). 확장은 `lib/i18n/messages.ts` + `useT`로 합니다.

```typescript
// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

// 지원 언어
export const locales = ['ko', 'en', 'es'] as const;  // MVP 2에서 es 추가
export type Locale = typeof locales[number];
export const defaultLocale: Locale = 'en';
```

### 번역 파일 구조

```
src/
  messages/
    ko.json   — 한국어
    en.json   — 영어
    es.json   — 스페인어 (MVP 2)
```

### 번역 키 명명 규칙

```
{domain}.{component}.{key}

예시:
  pitch.tournamentCard.contestants     → "48 Contestants" / "48개 참가자"
  arena.vsBattle.voteButton            → "VOTE LEFT" / "왼쪽 투표"
  arena.newsCard.aiReportBadge         → "● AI-Report"
  crown.crownCard.shareButton          → "Share Crown" / "크라운 공유"
  common.gnb.launchpad                 → "Launch Pad"
  common.gnb.pitch                     → "The Pitch"
  common.footer.activeTournaments      → "{count} Active Tournaments"
```

---

## 4. 도메인별 번역 범위

### Domain 0: Launch Pad (MVP 1)

```json
// 필수 번역 키
{
  "launchpad": {
    "hero": {
      "title": "Who Takes the Crown?",
      "subtitle": "The global fan tournament for football, K-Pop & more",
      "ctaJoin": "Join the Arena",
      "ctaLearnMore": "Learn More"
    },
    "waitlist": {
      "placeholder": "Enter your email",
      "submit": "Get Early Access",
      "success": "You're on the list!"
    },
    "stats": {
      "activeTournaments": "{count} Active Tournaments",
      "voters": "{count} Voters",
      "countries": "{count} Countries"
    }
  }
}
```

### Domain 1: The Pitch (MVP 1)

```json
{
  "pitch": {
    "filter": {
      "all": "All",
      "football": "Football",
      "kpop": "K-Pop",
      "other": "Other"
    },
    "tournamentCard": {
      "contestants": "{count} Contestants",
      "deadline": "Ends {date}",
      "live": "LIVE",
      "joinVote": "Join & Vote",
      "viewResults": "View Results"
    },
    "trending": "Trending Now",
    "newTournaments": "New Tournaments"
  }
}
```

### Domain 3: The Arena (MVP 1)

```json
{
  "arena": {
    "backLink": "Back to The Pitch",
    "liveNow": "LIVE NOW",
    "vsBattle": {
      "roundLabel": "{roundName} · MATCH {current}/{total}",
      "voteLeft": "VOTE LEFT",
      "voteRight": "VOTE RIGHT",
      "voted": "✓ VOTED",
      "votingClosed": "VOTING CLOSED",
      "voteRate": "VOTE RATE"
    },
    "newsroom": {
      "sectionLabel": "Newsroom · auto-generated coverage",
      "aiReportBadge": "● AI-Report"
    },
    "crown": {
      "congratulations": "You've Made Your Pick!",
      "champion": "Your Champion",
      "crownCard": "Crown Card",
      "share": "Share Your Crown",
      "playAgain": "Vote in Another Tournament"
    }
  }
}
```

### Domain 5: Policy Hub (MVP 1)

```json
{
  "policy": {
    "terms": "Terms of Service",
    "privacy": "Privacy Policy",
    "cookie": "Cookie Policy",
    "dmca": "DMCA Notice",
    "contact": "Contact"
  }
}
```

### Domain 6: Admin Dashboard (MVP 1 일부)

```
⚠️ Admin Dashboard는 MVP 1에서 한국어(ko) + 영어(en) 모두 구현하되,
   실제 사용자는 관리자(대표)이므로 한국어 우선 적용.
```

---

## 5. 번역 불가 요소 (고유명사·브랜드)

아래 항목은 번역하지 않고 원문 그대로 사용합니다:

```
WorldCrown48      — 서비스 브랜드명
Crown             — 핵심 브랜드 용어 (크라운 X)
Crown Card        — 고유명 (크라운 카드 X)
The Pitch         — 도메인명
The Arena         — 도메인명
The Lab           — 도메인명
Launch Pad        — 도메인명
The Locker Room   — 도메인명
Policy Hub        — 도메인명
AI-Report         — AI 콘텐츠 배지 (AI 리포트 X)
Tournament        — 서비스 핵심 용어 (대회 X)
Contestant        — 서비스 핵심 용어 (참가자 X)
Match             — 서비스 핵심 용어 (경기 X)
Voter             — 서비스 핵심 용어 (유저 X)
Champion          — 서비스 핵심 용어 (우승자 X)
```

### 5-1. 엔트리 이름·소속 표기 (NAME-I18N-1 · 2026-10-24 추가)

> 정본 = 결정 원장 **D-61**(이름 3언어) · **D-62**(크라운 카드 = 영어 이름). 이 절은 원장을 **가리키기만** 한다 — 규칙이 다르면 원장이 이긴다.

- **그릇**: `Contestant.nameI18n{ko,en,es}`. 한글 `name` 이 정본(중복 판정·검색 기준) — 바꾸지 않는다.
- **en** = 본인·소속사가 쓰는 공식 로마자 활동명(발음 옮겨 적기 아님). **es = en 복사**. ko = `name`.
- **채우는 때**: 발행 때 AI 1번(`translateContestantNames`). 실패해도 발행은 진행 — 그 칸은 빈칸.
- **발음 대조**(대표 2026-10-24 A안): AI 가 낸 영어 이름이 한글 발음과 맞지 않으면(다른 엔트리의 이름) **쓰지 않고 빈칸**으로 둔다. 판정 = `functions/src/core/nameSoundsAlike.ts`.
- **화면**: `localizedName(c, lang)` — 화면 언어 → en → 한글. 빈칸은 나오지 않는다.
- **크라운 카드 안 이름**: `crownCardName(c)` — 언어와 상관없이 en, 없으면 한글. 카드 **바깥** 문구("Your Crown is …"·공유 문구)는 화면 언어의 이름.
- **고치기**: The Lab "내 Tournament" → **이름 언어**. 영어 칸이 빈 이름이 "먼저 볼 이름"으로 맨 위에 온다. 차트에는 다음 발표 때 반영된다(차트 캐시가 이름을 복사해 둔다).
- **소속(affiliation)**: 다국어화하지 않는다(이번 범위 아님). 표기 규칙은 편집기 추출 규칙 그대로 — "영문 공식 표기 우선 · 없으면 원문 · 없으면 빈칸"(`functions/src/core/extractContestantsCore.ts`, PR #85).

---

## 6. 톤앤매너 가이드라인 (언어별)

### 공통 원칙
- 글로벌 MZ Sporty 럭셔리 톤
- 흥분·긴박감·팬 참여 강조
- 예측·베팅 연상 언어 금지 ("odds", "projected winner" 등)

### 🇰🇷 한국어 (ko)
```
어조: 친근하지만 세련된 MZ 세대 언어
존댓말: ~요, ~세요 (격식체 아님)
특징: 영문 브랜드용어 한국어 병기 금지
     예: "투표하세요" O / "보트(Vote)하세요" X
금지: 아이돌 팬덤 특유 표현, 사투리, 외래어 과다 사용
```

### 🇺🇸 영어 (en)
```
어조: Energetic, inclusive, global sports tone
스타일: Short punchy copy (CTA 5단어 이하)
특징: 축구 용어는 국제 표준 영어 사용
     "football" not "soccer" (글로벌 기준)
금지: overly Korean cultural references, 직역 번체
```

### 🇲🇽 스페인어 es (MVP 2)
```
방언: 중립 스페인어 (Español neutro)
     — 특정 국가 방언 지양 (아르헨티나식 vos 금지)
     — 멕시코·콜롬비아·아르헨티나 모두 이해 가능
어조: Apasionado pero elegante (열정적이되 세련되게)
축구 용어: "fútbol" (soccer X), "gol", "torneo"
금지: 지역 속어, 성별 고정 표현
```

---

## 7. 다국어 콘텐츠 관리 원칙

### AI-Report 기사 다국어화

```
MVP 1:
  GNews API → 영어/한국어 기사 검색
  Claude API → ko/en 양 언어 생성
  Newsroom → 사용자 언어에 맞는 기사 표시

MVP 2:
  GNews API → 스페인어 기사 추가
  Claude API → es 추가
  
기사 번역 전략:
  원본 생성 언어: en (기준)
  ko/es: Claude API로 번역 + 현지화 (직역 금지)
```

### 이미지 Alt Text

```typescript
// 다국어 alt text 필수
<img
  src={contestantImage}
  alt={t('contestant.imageAlt', { name: contestant.name })}
/>

// ko: "{name} 선수 프로필 이미지"
// en: "Profile photo of {name}"
// es: "Foto de perfil de {name}"
```

---

## 8. MVP 1 출시 전 i18n 체크리스트

- [ ] ko.json / en.json 모든 필수 키 완성
- [ ] 번역 불가 고유명사 목록 준수
- [ ] URL: /ko/, /en/ 라우팅 동작 확인
- [ ] 기본 언어(en) 폴백 동작 확인
- [ ] 날짜 포맷: ko = YYYY년 MM월 DD일, en = MMM DD, YYYY
- [ ] 숫자 포맷: ko = 1,234명, en = 1,234 voters
- [ ] RTL 대응 불필요 (MVP 1 — ar 없음)
- [ ] AI-Report 배지: 모든 언어에서 "● AI-Report" (번역 금지)

---

## 9. 변경 이력

| 버전 | 날짜 | 주요 변경 |
|------|------|-----------|
| v1.0 | 2026-05-23 | 최초 작성. MVP1~3 언어 계획, 도메인별 번역 범위, 기술 구현 방법 |
| v1.1 | 2026-10-24 | §5-1 엔트리 이름·소속 표기 추가 (NAME-I18N-1 · 원장 D-61·D-62 · 발음 대조 A안) |

---

*© 2026 WorldCrown48 | I18N_POLICY.md v1.0 | CONFIDENTIAL*
