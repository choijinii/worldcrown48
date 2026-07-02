# WorldCrown48 — I18N_POLICY.md
# v1.0 — 2026-05-23
# 다국어(i18n) 정책 — 도메인별 상세 가이드

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

---

*© 2026 WorldCrown48 | I18N_POLICY.md v1.0 | CONFIDENTIAL*
