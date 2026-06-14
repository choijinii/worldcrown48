# 👑 WorldCrown48 (월크48) 플랫폼 구축 전략 설계서 v4.9

> **작성:** 48티오 | **버전:** v4.9 | **날짜:** 2026년 5월 | **등급:** CONFIDENTIAL  
> _전 세계 팬덤의 열정을 데이터로, 데이터를 뉴스로, 뉴스를 자산으로 — 👑 WorldCrown48_

---

## 📌 v4.9 변경사항 요약

| # | 항목 | 변경 내용 |
|---|------|-----------|
| ① | **포맷 변경** | DOCX 2부 분권 → **단일 MD 파일** 통합 (Claude 직독 최적화) |
| ② | **Round 개념 확정** | "본질 한 문장" 추가: Round = Voter 개인의 투표 진행 단계. DB 문서 없음. Voter마다 독립 진행 |
| ③ | **Contestant 개념 확정** | "48명" → **"48개"** 수정. 사람·팀·곡·음식·물건 무엇이든 가능. nation_cup 예외(Nation) 명시 |
| ④ | **i18n 전략 확정** | MVP1: `ko`+`en` / MVP2: +`es`(스페인어, 남미 팬덤 공략) / MVP3: 추가 미정 |
| ⑤ | **v4.8 전체 승계** | Part1·Part2 내용 100% 통합 |

> v4.0→v4.8 변경이력은 하단 부록 참조
>
> ★ **2026-05-25 패치**: 뉴스룸 2칼럼(키워드 7 + AI-Report 3) · The Pitch 뉴스룸(Domain 1 M5) 신규 · Fan Intelligence 수동 생성 MVP 1.5 · ai_news ko/en 스키마 — PRD v2.2 / C4 v1.1 / C5 v1.0 동기화
>
> 🛑 **2026-05-28 패치**: 라운드·매치·득표 규칙의 시각 진실은 `docs/mental-model/MENTAL_MODEL.svg` (충돌 시 SVG 우선)

---

## 목차

1. [월크48 핵심 3대 원칙](#1-월크48-핵심-3대-원칙)
2. [전략 개요 및 핵심 원칙](#2-전략-개요-및-핵심-원칙)
3. [기술 스택 확정](#3-기술-스택-확정)
4. [Domain 0 — LAUNCH PAD](#4-domain-0--launch-pad)
5. [Domain 1 — THE PITCH](#5-domain-1--the-pitch)
6. [Domain 2 — THE LAB](#6-domain-2--the-lab)
7. [Domain 3 — THE ARENA](#7-domain-3--the-arena)
8. [Domain 4 — THE LOCKER ROOM](#8-domain-4--the-locker-room)
9. [Domain 5 — POLICY HUB](#9-domain-5--policy-hub)
10. [Domain 6 — ADMIN DASHBOARD](#10-domain-6--admin-dashboard)
11. [전체 에이전트 배치 맵](#11-전체-에이전트-배치-맵)
12. [Claude Code 바이브코딩 실행 가이드](#12-claude-code-바이브코딩-실행-가이드)
13. [Cloud Functions 모듈 설계](#13-cloud-functions-모듈-설계)
14. [Firestore 전체 컬렉션 스키마](#14-firestore-전체-컬렉션-스키마)
15. [즉시 실행 체크리스트](#15-즉시-실행-체크리스트)
16. [용어 해설 (Glossary)](#16-용어-해설-glossary)
17. [부록 — v4.0→v4.8 변경이력](#17-부록--v40v48-변경이력)

---

## 1. 월크48 핵심 3대 원칙

> ⚠️ **Claude Code 에이전트 임무 부여 시 매번 필수 참조!**  
> 이 원칙에 위배되는 기능 설계·코드 작성·정책 수립은 즉시 중단하고 수정하세요.

---

### 원칙 ① 서비스 정체성 — 월크48은 "팬 투표 서비스"다

| ✅ 올바른 이해 | ❌ 절대 아닌 것 (설계 금지) |
|---|---|
| 팬이 좋아하는 Contestant에게 투표하는 이상형 월드컵 | 우승자 예측 게임 |
| "나는 이 Contestant가 더 좋다" — 순수한 선호 표현 | 스포츠 베팅 / 내기 서비스 |
| 현실 경기 결과와 무관한 독립 서비스 | 실제 경기 결과와 연동되는 서비스 |
| | 외부 일정에 자동 종속되는 서비스 |
| | 투표 결과로 "예측 정확도"를 평가하는 서비스 |

---

### 원칙 ② 대진 흐름 원칙 — Voter 투표 흐름 기반 자동 전환 ★★★★★ v4.8 전면 개정

#### 📌 Round 본질 한 문장 (v4.9 신규 — 가장 먼저 읽을 것)

> **Round = Voter 개인의 투표 진행 단계.**  
> 시스템이 Match 완료 수를 세어 자동으로 계산·전환하는 값이다.  
> DB에 문서로 존재하지 않는다. Deadline이 없다. Host가 제어하지 않는다. Voter마다 독립적으로 존재한다.

**핵심 규칙:**

- Tournament에만 Deadline이 존재 (Tournament Deadline)
- Round에는 Deadline·시작·종료·기간·마감 — **어떤 시간 개념도 없다**
- Round는 Voter의 투표 흐름에 따라 시스템이 자동 전환
- Tournament Host는 Tournament Deadline만 설정. 라운드에 관여하지 않음

#### Voter 1명의 Tournament 전체 흐름

```
Tournament (대진) — Tournament Deadline만 존재
─────────────────────────────────────────────────────
┌─ 48강 Round (24 Match) ─────────────────────────┐
│  Match 1 → Match 2 → ... → Match 24             │
│  Voter가 각 Match에서 1개 선택 → 다음 자동 표시  │
└───────────────────────────────────────────┬──────┘
                    ↓ advanceRound() 자동
           ╔═══════════════════════╗
           ║ 라운드 전환 효과      ║
           ║ "맨 어브 더 월드컵 24강" ║
           ╚═══════════╤═══════════╝
┌─ 24강 Round (12 Match) ─────────────────────────┐
│  Match 1 → ... → Match 12                       │
└───────────────────────────────────────────┬──────┘
                    ↓ advanceRound() 자동
           ╔═══════════════════════╗
           ║ "맨 어브 더 월드컵 12강" ║
           ╚═══════════╤═══════════╝
┌─ 12강 Round (6 Match) ──────────────────────────┐
└───────────────────────────────────────────┬──────┘
                    ↓
           ╔═══════════════════════╗
           ║ "맨 어브 더 월드컵 6강"  ║
           ╚═══════════╤═══════════╝
┌─ 6강 Round (3 Match) ───────────────────────────┐
└───────────────────────────────────────────┬──────┘
                    ↓
           ╔═══════════════════════╗
           ║ "맨 어브 더 월드컵 결승" ║
           ╚═══════════╤═══════════╝
┌─ 결승 (1 Final Match) ──────────────────────────┐
│  최종 선택 → Champion 확정                       │
└───────────────────────────────────────────┬──────┘
                    ↓
         Crown Card 생성 → SNS 공유 → 완료
```

> ⚠️ 이 전체 흐름에서 Voter가 하는 일은 **"Match에서 한쪽을 선택하는 것"** 뿐이다.  
> Round 전환, 다음 Match 제시, 라운드 전환 효과, Champion 확정은 모두 **시스템이 자동으로** 처리한다.

| 항목 | 내용 |
|------|------|
| Tournament Deadline | Tournament Host가 설정하는 Tournament 전체 마감 시각. **유일한 Deadline** |
| Round 전환 | Voter가 해당 Round 마지막 Match 완료 → `advanceRound()` 시스템 자동 실행 |
| Round DB 저장 | ❌ **없음** — 시스템이 Voter의 completedMatches 수를 세어 현재 Round 계산 |
| Round Voter 독립성 | Voter A가 24강일 때 Voter B는 48강일 수 있음. 글로벌 라운드 상태 없음 |
| Tournament Host 권한 | Tournament Deadline만 설정. 라운드 수동 전환 기능 없음 |

```typescript
// ✅ 올바른 방식 — advanceRound() 자동 실행
async function advanceRound(voterId: string, tournamentId: string) {
  // Voter의 completedMatches 수를 세어 현재 Round 계산
  // 마지막 Match 완료 감지 → 라운드 전환 효과 표시 → 다음 Round 자동 시작
}

// ❌ 절대 금지 — 라운드 기간 하드코딩
// const ROUND_DURATION_MS = 24 * 60 * 60 * 1000; // 작성 금지
```

---

### 원칙 ③ 투표 정책 — 대진별 1일 5회 · 자정 리셋

| 규칙 | 내용 |
|------|------|
| 대진별 1일 5회 | Voter 1계정 기준 동일 Tournament에서 하루 최대 5개 Match 투표 가능 |
| 자정 리셋 | 매일 자정 (KST 00:00) 카운트 초기화 |
| 랜덤 Match | VS Battle View는 매 새로고침마다 임의 1:1 Match 무작위 제공. 같은 Match 재출현 정상 |
| 복수 Tournament | 동시 진행 시 각각 별도 5회 카운트 적용 |
| **비로그인 1회 허용** | **세션당 첫 투표 1건은 비로그인(익명 uid)으로 허용. 2번째 Match부터 로그인 모달.** |
| **본인 연결 의무** | **로그인 성공 시 1회 투표의 userId를 새 uid로 즉시 이전(`linkSessionVote` callable). 익명 uid는 정리.** |
| 로그인 후 한도 | 로그인 유저 1계정 기준 동일 Tournament 1일 5회 (위 "대진별 1일 5회" 적용) |

> 💡 **투표 정책 설계 철학 v2 — 2026-06-14 대표 확정**
> 부정투표 문제의 본질은 "투표 횟수"가 아니라 "가짜 계정"이다. Google 소셜 로그인이 계정 신뢰성을 보장하되, **"체험 후 가입" 흐름**을 위해 비로그인 1회 투표는 허용한다(맛보기 모델). 2번째 Match부터 로그인 모달 + 1회 투표는 본인 uid로 자동 흡수된다. 단일 진실: `docs/lite-specs/D1-locker-room.md` + `docs/handoffs/D1-locker-room-handoff.md` v2.0.
>
> **v4.8 → v4.9 변경 이력**: v4.8까지 "익명 투표 없음 — 처음부터 로그인 필수"로 표기했으나 2026-06-14 대표 결정으로 lite-spec(맛보기)으로 통일. 본 표 5·6행 신설, 7행 명시화.

---

## 2. 전략 개요 및 핵심 원칙

월크48은 2026년 FIFA 북중미 월드컵을 기점으로 글로벌 팬덤 데이터를 독점하고 AI 뉴스 팩토리를 통해 미디어 시장의 업스트림을 선점하는 **글로벌 엔터테인먼트 데이터 자산화 플랫폼**이다.

### 2.1 전략 3대 원칙

| 원칙 | 내용 |
|------|------|
| 🚀 속도 우선 | 월드컵 개막(2026년 6월) 전 MVP 1 반드시 런칭. 완벽보다 빠름이 우선 |
| 🎯 현실 목표 | 1인 바이브코딩 개발 범위 명확히 인식. 단계별 기능 확장 |
| ⚖️ 윤리 기반 | 모든 콘텐츠·데이터 처리는 글로벌 플랫폼 정책 및 법적 기준 준수 |

### 2.2 MVP 3단계 로드맵 + i18n 전략 ★ v4.9 업데이트

| 단계 | 시기 | 핵심 기능 | 지원 언어 | 목표 MAU |
|------|------|-----------|-----------|---------|
| **MVP 1** | 2026년 5월 31일 | Domain 0~3 투표 엔진, Crown Card, GNews 뉴스룸, Rate Limiting | 🇰🇷 `ko` + 🇺🇸 `en` | 50만 |
| **MVP 1.5** | 2026년 6월 10일 | 🆕 관리자 수동 Fan Intelligence 생성 버튼 (런치 뉴스 전용) | 🇰🇷 `ko` + 🇺🇸 `en` | — |
| **MVP 2** | 2026년 7월 | AI 뉴스 팩토리 자동화, K-POP, Locker Room, 다국어 | 🇰🇷 `ko` + 🇺🇸 `en` + 🌎 `es` ← 스페인어 추가 | 300만 |
| **MVP 3** | 2026년 하반기 | PR 자동 배포, B2B SaaS, 부정투표 3단계, 수익 모델 | + 추가 미정 (`pt-BR`·`ja` 후보) | 1,000만 |

#### i18n (다국어) 전략 원칙 ★ v4.9 신규

```
MVP 1: ko(한국어) + en(영어) — 한국 팬 + 글로벌 영어권 베이스라인
MVP 2: + es(스페인어) — 남미 팬덤 공략 (아르헨티나·멕시코·콜롬비아 등 스페인어권 5억명)
                        2026 FIFA 월드컵 남미 열기 최고조 시점에 맞춰 출시
MVP 3: 추가 언어 미정 — MVP 2 트래픽 기반 결정 | 후보: pt-BR · ja · ar

URL 구조 (Next.js i18n): worldcrown48.com/ko/ · /en/ · /es/
기본 언어(default): en (글로벌 접속 시 브라우저 언어 자동 감지)
⚠️ 브라질은 pt-BR(포르투갈어) — es(스페인어)와 별개. MVP 3 후보
불변: 3개 언어 모두 글로벌 MZ Sporty 럭셔리 톤앤매너. 한국적 요소 금지
```

### 2.3 Contestant 정의 ★ v4.9 확정

#### 📌 Contestant 본질 한 문장

> **Contestant = Tournament 안에서 Voter가 1:1 Match에서 선택하는 투표 대상 엔터티.**  
> 사람·팀·그룹·곡·음식·물건 — **무엇이든 될 수 있다.**  
> 하나의 Tournament에 반드시 정확히 **48개** 존재. 생성 시 확정, 이후 불변.

| TournamentType | 진입 단위 | 예시 |
|---|---|---|
| `nation_cup` | **Nation** (예외) | 브라질, 한국, 독일 등 국가대표팀 |
| `player_mvp` | **Contestant** | 음바페, 손흥민 등 개인 선수 |
| `artist` | **Contestant** | BTS, 아이브 등 K-POP 아티스트·그룹 |
| `custom` | **Contestant** | 노래, 라면, 영화, 캐릭터, 브랜드 등 **모든 것** |

> ⚠️ **nation_cup 전용 예외**: TournamentType = "nation_cup" 일 때만 "Nation"이라 부른다.  
> 그 외 모든 TournamentType에서는 항상 "Contestant". 두 용어 혼용 절대 금지.

### 2.4 서비스 도메인 구조 — 총 7개 도메인

| 도메인 | 명칭 | 핵심 기능 | MVP | 반응형 | 테마 |
|--------|------|-----------|-----|--------|------|
| Domain 0 | **LAUNCH PAD** | 사전 랜딩 · 이메일 웨이트리스트 · 카운트다운 | MVP 1 ★★★ | ✅ 3화면 | 🌑 다크 |
| Domain 1 | **THE PITCH** | 메인 홈 · 트렌딩 대진 · 내비게이션 | MVP 1 ★★★ | ✅ 3화면 | 🌑 다크 |
| Domain 2 | **THE LAB** | 48강 대진 생성 · AI 채우기 (관리자 전용) | MVP 1 관리자 | 🖥 데스크탑 | 🌑 다크 |
| Domain 3 | **THE ARENA** | 1:1 투표 · Crown Card · 뉴스룸 · AI 뉴스 팩토리 | MVP 1 ★★★ | ✅ 3화면 | 🌑 다크 |
| Domain 4 | **THE LOCKER ROOM** | 유저 프로필 · 투표 기록 · GDPR 설정 | M1·M3: MVP 1 | ✅ 3화면 | ☀️ 라이트 |
| Domain 5 | **POLICY HUB** | 쿠키 동의 · 법적 문서 · 공지사항 | MVP 1 필수 | ✅ 3화면 | ☀️ 라이트 |
| Domain 6 | **ADMIN DASHBOARD** | 통합 관리 콘트롤 센터 | MVP 1 일부 | 🖥 데스크탑 | ☀️ 라이트 |

---

## 3. 기술 스택 확정

> ✅ **최종 결정**: MVP 전 기간 Flutter 미사용, **Next.js 14**로 개발 진행.

### 3.1 확정 기술 스택

| 레이어 | 기술 | 역할 | 월 예상 비용 |
|--------|------|------|-------------|
| 프론트엔드 | Next.js 14 (App Router) + TypeScript | 반응형 웹 UI, SSR/CSR 혼합, SEO | 무료 |
| UI/UX | Tailwind CSS + Shadcn/UI + Framer Motion | 듀얼 테마 · 컴포넌트 · 애니메이션 | 무료 |
| 상태 관리 | Zustand | 전역 상태 (유저·투표·카테고리) | 무료 |
| 배포 | Vercel | 1클릭 배포, 글로벌 엣지 CDN | 무료~$20/월 |
| 실시간 DB | Firebase Realtime Database | 초저지연 실시간 투표 동기화 | 사용량 기반 |
| 문서 DB | Firestore | Tournament·유저·정책·캐시 데이터 | 사용량 기반 |
| 인증 | Firebase Auth + next-auth | Google/Apple 소셜 로그인, role 관리 | 무료 |
| 서버리스 | Cloud Functions + Next.js API Route | 비즈니스 로직·AI 트리거·캐시 | ~$5~20/월 |
| 스토리지 | Firebase Storage | 대진 이미지 · Crown Card 이미지 | 사용량 기반 |
| CDN/보안 | Cloudflare | 글로벌 CDN, DDoS 방어, WAF, SSL | Free / Pro $25/월 |
| 뉴스 API | **GNews API — Basic $9/월** ★ v4.6 확정 | 키워드 뉴스 소비 · 아레나 뉴스룸 25개 | $9/월 고정 |
| AI API | Anthropic Claude API (claude-sonnet-4-20250514) | AI 채우기(MVP1) · AI 뉴스 생성(MVP2) | ~$50~200/월 |
| 부정투표 방지 | fingerprintjs + ip-api.com | 디바이스 핑거프린트 · IP 검증 (MVP2) | 무료~$5/월 |
| 다국어 | next-intl | i18n 라우팅 · ko/en/es 전환 | 무료 |

### 3.2 디자인 토큰 — 듀얼 테마

> ⚠️ 디자인 토큰의 단일 진실은 docs/design/WC48_DESIGN_SYSTEM_v2.3.md 입니다. 구버전 v1 색상값은 삭제됨 — 2026-05-25 정합성 정정.

### 3.3 Claude Code 프로젝트 컨텍스트 표준 템플릿

```markdown
## 프로젝트: WorldCrown48 (월크48) — v4.9
## 서비스 정체성: 팬 투표 서비스 (예측·베팅·실제경기 연동 절대 금지)

## 기술 스택
- FRONTEND : Next.js 14 (App Router) + TypeScript
- UI       : Tailwind CSS 3.4 + Shadcn/UI + Framer Motion
- STATE    : Zustand
- BACKEND  : Firebase (Firestore + Realtime DB + Auth + Cloud Functions)
- DEPLOY   : Vercel (프론트) + Firebase (백엔드)
- NEWS API : GNews API Basic $9/월
- AI       : Claude API (claude-sonnet-4-20250514)
- i18n     : next-intl | MVP1: ko+en / MVP2: +es / MVP3: 미정

## 핵심 대진 흐름 원칙
- Tournament Deadline만 존재. Round에는 Deadline 없음
- Round = Voter 개인의 진행 단계. DB 문서 없음. Voter마다 독립
- Round 전환: Voter 마지막 Match 완료 → advanceRound() 시스템 자동
- Tournament Host는 Tournament Deadline만 설정. 라운드 관여 없음
- 대진별 1일 5회, 자정 KST 리셋
- 실시간 득표 수 절대 노출 금지 → 1시간 캐시 득표율(%)만 표시

## Contestant 정의
- Contestant = 투표 대상 엔터티. 사람·팀·곡·물건 무엇이든 가능
- 하나의 Tournament에 반드시 48개 (숫자 고정)
- nation_cup 타입만 예외: "Nation"이라 부름

## 디자인 토큰
- docs/design/WC48_DESIGN_SYSTEM_v2.3.md 참조
- 공통: #FCD006(골드)

## 디렉토리 구조
/app/(domain0)  → LAUNCH PAD
/app/(domain1)  → THE PITCH
/app/(domain3)  → THE ARENA
/app/admin      → ADMIN DASHBOARD (관리자 전용)
/components     → Shadcn/UI 기반 공통 컴포넌트
/lib/firebase   → Firebase 연동 유틸
/lib/api        → Claude API / GNews API 연동 유틸
/functions      → Cloud Functions 서버리스 함수
```

---

## 4. Domain 0 — LAUNCH PAD

> ★★★ v4.7 복원 | MVP 1 최우선 | 반응형: 375px / 768px / 1440px 3화면 확인 필수 | 🌑 다크

월크48 서비스 오픈 전부터 worldcrown48.com을 통해 잠재 사용자를 모으는 **사전 공개 랜딩페이지**.  
FIFA 2026 월드컵 개막 카운트다운, 이메일 웨이트리스트 수집, 서비스 소개, SNS 팔로우 유도 담당.

### 모듈 분해

| ID | 모듈명 | 핵심 기능 | MVP |
|----|--------|-----------|-----|
| M1 | Hero Landing | FIFA 2026 카운트다운 타이머 · 골드 슬로건 · 이메일 CTA · 풀스크린 다크 | MVP 1 ★★★ |
| M2 | 서비스 소개 | 월크48 3가지 핵심 가치 · 아이콘 카드 3개 | MVP 1 ★★★ |
| M3 | 이메일 웨이트리스트 | 이메일 입력 폼 · Firestore waitlist 저장 · 등록 완료 토스트 | MVP 1 ★★★ |
| M4 | SNS 팔로우 유도 | 인스타그램 / X / 카카오 채널 링크 | MVP 1 ★★ |

### 모듈별 제작 가이드

| 모듈 | Next.js 구현 핵심 | Firebase 연동 |
|------|-------------------|---------------|
| M1 Hero | CSS RadialGradient (골드 블러) + Framer Motion 카운트다운 + Shadcn Input | 정적 |
| M2 소개 | Framer Motion ScrollReveal + 3개 Shadcn Card (grid-cols-1→2→3 반응형) | 정적 |
| M3 웨이트리스트 | Shadcn Input + Button + Toast → /api/waitlist → 중복 이메일 체크 | Firestore `waitlist` 컬렉션 저장 |
| M4 SNS | Shadcn Button 아이콘 3개 + 각 SNS 링크 target=_blank | 정적 외부 링크 |

### 🤖 에이전트 A-0 임무

- Hero Section: `#FCD006` 30% opacity RadialGradient + 풀스크린 `#00003A`
- FIFA 2026 카운트다운: `setInterval` 일/시/분/초 → Framer Motion 숫자 롤링
- 슬로건: "전 세계 팬덤의 심판 — 누가 진짜 왕관을 쓸 것인가?" 골드 + 글로우
- 이메일 CTA: Shadcn Input → `/api/waitlist` → Firestore `waitlist` 저장
- 반응형: 375px / 768px / 1440px 3종 완벽 대응
- 💡 Firebase Auth 불필요. Firestore waitlist 쓰기만 사용. SEO og:image 필수!

### Domain 0 전환 시점

| 시점 | 액션 |
|------|------|
| 2026년 3월 (권장) | Domain 0 LAUNCH PAD 오픈 → 이메일 웨이트리스트 수집 시작 |
| 2026년 5월 말 | THE PITCH + THE ARENA MVP 1 완성 |
| 2026년 6월 개막 직전 | Domain 0 → Domain 1 전환 (리다이렉트) |
| 이후 | 웨이트리스트 이메일로 "서비스 오픈!" 발송 → 초기 MAU 부스팅 |

---

## 5. Domain 1 — THE PITCH

> ✅ MVP 1 최우선 | 반응형: 375px / 768px / 1440px 3화면 확인 필수 | 🌑 다크

월크48의 첫인상을 결정하는 얼굴 도메인. 트렌딩 대진 그리드 + FIFA 월드컵 카운트다운.

### 모듈 분해

| ID | 모듈명 | 핵심 기능 | MVP |
|----|--------|-----------|-----|
| M1 | Hero Section | 메인 배너 · FIFA 2026 카운트다운 · 슬로건 · CTA 버튼 · 골드 블러 배경 | MVP 1 ★★★ |
| M2 | Trending 대진 리스트 | 인기 대진 카드 Grid · 카테고리 탭 (월드컵/K-POP/기타) · Zustand 상태 관리 | MVP 1 ★★★ |
| M3 | Navigation | 상단 GNB · 모바일 하단 탭 바 · 스크롤 투명도 변화 · 로그인 상태 분기 | MVP 1 ★★★ |
| M4 | 대진 만들기 진입 | MVP 기간 비활성화 (자물쇠) · 관리자만 /admin/lab 진입 | MVP 2 관리자 |
| M5 ★ | 뉴스룸 | ★ 2026-05-25 신규 — 키워드+AI-Report 통합 생성순 6건 · Trending 섹션 바로 밑 · '더 보기'→Arena | MVP 1 ★★★ |

### 모듈별 제작 가이드

| 모듈 | Next.js 구현 핵심 | Firebase 연동 |
|------|-------------------|---------------|
| M1 Hero | CSS RadialGradient + Framer Motion 텍스트 등장 + 카운트다운 | 정적 |
| M2 Trending | CSS Grid (1열/2열/3열 반응형) + Next.js Image + Zustand | Firestore `tournaments` 최신 5개 |
| M3 Navigation | useScrollY Hook → 배경 투명→불투명 + 하단 탭 바 | Firebase Auth (role 확인) |
| M4 진입 | role==="admin" → 활성 / 그 외 → disabled + Tooltip | Firestore users.role 확인 |
| M5 뉴스룸 | UnifiedNewsFeed 통합 6건 · NewsFeedItem · '더 보기'→Arena (C4-newsroom.md) | Firestore `news_cache` + `ai_news` |

### 🤖 에이전트 A-1 임무

- Hero: `#FCD006 → transparent` RadialGradient + 슬로건 Framer Motion 등장
- Trending Grid: 모바일 1열 / 태블릿 2열 / 데스크탑 3열 반응형
- Tournament Card: hover 시 골드 테두리 `ring-2 ring-yellow-400`
- Shimmer 로딩: Firestore 로딩 중 Shadcn Skeleton
- Navigation: scroll → `backdrop-blur-sm` + 모바일 하단 탭 바
- 💡 Firebase 연결은 A-1이 구현하되, **Auth 세션 관리는 D-1 에이전트가 선완성** 필요

---

## 6. Domain 2 — THE LAB

> ⚠️ MVP 전 기간 비공개 — 관리자만 `/admin/lab` | 🖥 데스크탑 전용 | 🌑 다크

관리자가 48강 대진을 만드는 창작 공간. M0 대진 생성 마법사 → 48개 Contestant 채우기.

### 모듈 분해

| ID | 모듈명 | 핵심 기능 | MVP |
|----|--------|-----------|-----|
| M0 | 🆕 대진 생성 마법사 ★ v4.6 신설 | Step별 가이드 + 조건 토글 3개 + Tournament Deadline 폼 | MVP 1 관리자 |
| M1 | 대진 초기화 | 주제 입력 · AI/수동 선택 카드 · 대진 생성 버튼 | MVP 1 관리자 |
| M2 | 48 Nodes Grid | 6개씩 슬라이드 모달 8페이지 · 좌우 스와이프 · 이미지 업로드 | MVP 1 관리자 |
| M3 | AI 채우기 | Claude API Contestant 자동 추천 · 관리자 수동 검수 | MVP 1 관리자 |
| M4 | 저장/공개 설정 | Firestore 저장 · 공개/비공개 설정 · Storage 이미지 업로드 | MVP 1 관리자 |

### Domain 2 M0 상세 — 대진 생성 마법사

| Step | UI 컴포넌트 | Firestore 저장 경로 | 필수 여부 |
|------|-------------|---------------------|-----------|
| Step 1 기본 정보 | 대진 제목 TextInput (60자) · 카테고리 Select · 설명 Textarea (200자 선택) | `tournaments.title` · `.category` · `.desc` | 필수 |
| Step 2 생성 조건 | 토글 3개: ① AI 뉴스 자동 생성 ② 다국어 뉴스 허용 ③ 실시간 랭킹 공개 | `tournaments.settings.aiNews/multiLang/showRanking` | 선택 (기본 ON) |
| Step 3 Tournament Deadline | DateTimePicker + 자동 연장 토글 + UTC 기준 표시 | `tournaments.tournamentDeadline` | 필수 |

### Domain 2 M2 상세 — 48 Nodes Grid

| 항목 | 내용 |
|------|------|
| 페이지 구성 | 8페이지 × 6개 Node = 48개 Contestant |
| 페이지 전환 | Framer Motion AnimatePresence + 좌우 슬라이드 |
| 진행 표시 | 상단 Progress Bar: "페이지 3/8 (18/48 완료)" |
| Node 상태 | 빈: 카메라 아이콘 + 번호 / 채운: 이미지 미리보기 |
| 완료 조건 | 48개 Node 모두 채워야 "저장하기" 활성화 |

### 🤖 에이전트 B-1 임무

- 접근 제어: middleware에서 role !== "admin" → 404 리다이렉트
- M0 마법사: React Step Wizard 3단계 + Shadcn StepIndicator
- M2 슬라이드: Framer Motion AnimatePresence 8페이지 + useSwipeable
- 48개 Node 완료 감지 → 저장하기 활성화 (Zustand 노드 상태)
- M3 AI 채우기: `/api/ai-fill` → Claude API → 48개 Contestant JSON 자동 채우기
- 💡 Node 하나 완성 후 나머지 47개는 **같은 컴포넌트 반복 사용**. 재사용 설계가 핵심!

---

## 7. Domain 3 — THE ARENA

> ✅ MVP 1 최핵심 | 반응형: 375px / 768px / 1440px 3화면 확인 필수 | 🌑 다크

월크48의 심장부. Voter가 실제로 투표하고 Crown Card가 생성된다.

### 모듈 분해 ★ v4.8 재정리

| ID | 모듈명 | 핵심 기능 | MVP |
|----|--------|-----------|-----|
| M1 | 대진 상세 View | 48강 Tournament 정보 · 라운드 현황 · 참여 통계 | MVP 1 ★★★ |
| M2 | VS Battle View | 순서대로 1:1 Match 제시 · 투표 버튼 · 골드 선택 테두리 · 라운드 자동 전환 효과 | MVP 1 ★★★ |
| M3 | Crown Card | Champion 확정 시 카드 생성 · AI 뉴스 대표 이미지 · 뉴스 제목+링크 · SNS 공유 | MVP 1 ★★★ |
| M4 | 부정투표 방어 | Rate Limiting MVP1 · fingerprintjs MVP2 · 3단계 차단 MVP3 | MVP 1~3 |
| M5 | 다국어 UI | 한국어 / 영어 / 스페인어 전환 (next-intl) | **MVP 2** |
| M6 | 아레나 뉴스룸 | ★ 2026-05-25 개정 — 2칼럼: 키워드 뉴스 7 + AI-Report 뉴스 3 · Firestore 1h 캐시 | MVP 1 ★★★ |
| M7 | AI 뉴스 (Fan Intelligence) | ★ 2026-05-25 개정 — 관리자 수동 생성 = MVP 1.5 / 특이점·Champion 자동화 = MVP 2 | MVP 1.5~2 ★★★ |

> 📌 **v4.8 삭제**: M3(실시간 랭킹 페이지) 삭제 — 랭킹 페이지가 부정투표 유발.  
> `ranking_cache`는 백엔드에서만 관리. Crown Card + AI 뉴스에서만 활용.

### Domain 3 M2 상세 — VS Battle View + 투표 엔진

| 항목 | 내용 |
|------|------|
| Match 제시 방식 | 해당 Round의 Match를 순서대로 하나씩 제시 — Voter 선택 → 다음 Match 자동 |
| 라운드 자동 전환 | 마지막 Match 완료 → `advanceRound()` 자동 → 전환 효과 → 다음 Round |
| 투표 레이아웃 | CSS Flexbox 좌우 분할 (w-1/2) · Contestant 이미지 · 이름 · vs 심볼 중앙 |
| 선택 효과 | 클릭한 Contestant에 골드 테두리 2px (`ring-2 ring-yellow-400`) + Framer Motion scale 1.05 |
| 투표 처리 | Firebase Realtime DB `runTransaction` → 동시 투표 충돌 방지 필수 |
| 한도 검증 | Cloud Functions에서 대진별 1일 5회 초과 시 거부 |
| Voter 전체 흐름 | 48강(24) → 24강(12) → 12강(6) → 6강(3) → 결승(1) → Champion → Crown Card |

### Domain 3 M4 상세 — 부정투표 방어 시스템

> 🚨 **랭킹 노출이 부정투표를 유발합니다** — 실시간 득표 수 절대 미노출!

| MVP 단계 | 방어 방법 | 구현 내용 |
|----------|-----------|-----------|
| MVP 1 | Rate Limiting + 소셜 로그인 | 1분 내 10회 초과 → 15분 쿨다운 / Google·Apple 로그인 필수 / 대진별 1일 5회 |
| MVP 2 | fingerprintjs | 브라우저 fingerprint 이중 방지 / ip-api.com IP 중복 방지 |
| MVP 3 | 3단계 차단 + 관리자 UI | 소프트(경고) → 하드(임시) → 영구 차단 / Domain 6 M3 UI |

### Domain 3 M6 상세 — 아레나 뉴스룸 ★ 2026-05-25 개정 (2칼럼)

| 항목 | 내용 |
|------|------|
| 레이아웃 | ★ 2칼럼 — 좌: Keyword News View(7) / 우: AI-Report News View(3). 모바일은 탭 전환 |
| API 플랜 | GNews Basic $9/월 — 100req/day · Firestore 1h 캐시 |
| 키워드 뉴스 | 대진 제목 기반 키워드 → GNews max=7 (★ 25→7 축소) |
| AI-Report 뉴스 | `ai_news` published 최신 3건 (MVP1은 "준비 중" 빈 상태) |
| The Pitch 뉴스룸 | 키워드+AI-Report 통합 생성순 6건 (Domain 1 M5) |
| 뉴스 카드 | 출처 + 제목(2줄) + 날짜 + 외부 링크 · 저작권: 본문 미저장 |
| 단일 진실 | `docs/lite-specs/C4-newsroom.md` · `C5-fan-intelligence.md` |

### Domain 3 M7 상세 — AI 뉴스 팩토리 ★★★ v4.8 전면 개정

> ★ 2026-05-25: 아래 자동화 흐름은 **MVP 2** 범위. **관리자 수동 생성(MVP 1.5)**의 개발 명세는 `docs/lite-specs/C5-fan-intelligence.md`를 단일 진실로 한다.

#### AI 뉴스 생성 전체 흐름

```
[트리거 1] 특이점 탐지 — 대진 진행 중 자동 감지
├── T-1: 1위 득표율 ≥ 60% 독보적 장악
├── T-2: 1위-2위 격차 ≥ 30%p
├── T-3: 24시간 투표 증가율 ≥ 200%
└── T-4: 순위 역전 발생 (3위 이내)
           ↓ ranking_cache 기반 Claude API → 뉴스 자동 생성

[트리거 2] Champion 결정 — 결승 완료 시 자동
           ↓ 대진 전체 데이터 기반 Claude API → 결과 뉴스 생성

           ↓
[1단계] AI 자동 검수 — 체크리스트 6항목
  실패 → "검수 실패" 상태로 관리자 전달

           ↓
[2단계] 관리자 최종 승인 — Domain 6 M5
  승인 / 반려 / 수동 편집 후 승인

           ↓
[배포] PR 배포 (MVP 3)
  RedPress / EIN / PR Newswire
  뉴스 대표 이미지 = Crown Card (저작권 제로)
```

#### 특이점 트리거 4종

| ID | 조건 | 뉴스 헤드라인 방향 | 데이터 소스 |
|----|------|-------------------|-------------|
| T-1 | 1위 득표율 ≥ 60% | "압도적 독주" | `rankings[0].rate ≥ 60` |
| T-2 | 1위-2위 격차 ≥ 30%p | "격차 벌어지는" | `rankings[0].rate - rankings[1].rate ≥ 30` |
| T-3 | 24시간 투표 증가율 ≥ 200% | "팬덤 폭발" | votes count 24h 비교 |
| T-4 | 순위 역전 (3위 이내) | "대반전" | 이전 캐시 vs 현재 캐시 비교 |

#### AI 뉴스 검수 체크리스트 — 2단계 검수

| 영역 | 검수 항목 | 실패 시 처리 |
|------|-----------|-------------|
| 법적 | 특정인 명예훼손 가능성 | 검수 실패 → 관리자에게 "법적 위험" 경고 |
| 법적 | 득표수(절대값) 노출 여부 | 자동 수정: 숫자 → % 변환 후 재검수 |
| 법적 | 허위사실 포함 여부 | 검수 실패 → 데이터 불일치 경고 |
| 플랫폼 | 서비스 정체성 위반 (예측·베팅) | 자동 수정: 위반 표현 제거 후 재검수 |
| 품질 | 최소 글자 수 300자 이상 | 검수 실패 → 재생성 요청 |
| 품질 | 수치 정확도 (±1%p 이내) | 검수 실패 → 수치 자동 교정 후 재검수 |

#### AI 뉴스 이미지 정책 — Crown Card 재활용

> 📌 **뉴스 대표 이미지 = Crown Card 재활용** — 저작권 100% 안전 + 브랜드 각인 + 비용 제로

- Crown Card는 월크48이 자체 생성 → 초상권·저작권 리스크 제로
- SNS `og:image`로 바로 사용 가능
- **실존 인물 사진 크롤링 절대 금지 — 초상권+저작권 이중 위반**

### 🤖 에이전트 C-1 임무 (투표 엔진 + 라운드 자동 전환)

- VS Battle: CSS Flexbox w-1/2 좌우 분할
- 투표 클릭 → `ring-2 ring-yellow-400` + Framer Motion `scale(1.05)`
- Match 순서 제시 → Voter 선택 → 다음 Match 자동
- `advanceRound()`: 마지막 Match 완료 → 전환 효과 → 다음 Round
- Firebase Realtime DB `runTransaction`: 동시 충돌 방지 필수
- 반응형 3화면 완벽 대응

### 🤖 에이전트 C-2 임무 (Crown Card 생성 + AI 뉴스 이미지)

- Canvas API: Contestant 이미지 + 이름 + 크라운 + 득표율% + 월크48 로고 합성
- 뉴스 링크 첨부: `news_cache` 최신 뉴스 제목+URL
- SNS 공유: 인스타(링크복사) / X(Web Intent) / 카카오(SDK)
- 해상도: 1080×1080px(인스타) · 1200×628px(X)
- 💡 Crown Card = AI 뉴스 대표 이미지. 별도 뉴스 이미지 생성 불필요!

### 🤖 에이전트 C-3 임무 (랭킹 캐시 + 특이점 탐지)

- Cloud Functions 스케줄러: 1시간마다 득표율(%) → `ranking_cache` 갱신
- 갱신 시 4종 트리거 조건 동시 검사 → 충족 시 `ai_news` 컬렉션 기록
- ⚠️ `ranking_cache`는 유저에게 직접 노출하지 않음 (랭킹 페이지 없음)

### 🤖 에이전트 C-4 임무 (아레나 뉴스룸 — 컨테이너·키워드 뉴스)

- GNews API → Firestore `news_cache` 1h 캐시 관리 (★ max=7)
- 뉴스룸 2칼럼 컨테이너 + The Pitch 통합 뉴스룸 (C4-newsroom.md v1.1)

### 🤖 에이전트 C-5 임무 (Fan Intelligence — AI-Report 뉴스)

- AI-Report News View 칼럼 (MVP1: "준비 중" 빈 상태 / MVP1.5+: 발행 기사)
- `generateFanIntelligence` Cloud Function — 관리자 수동 생성 (MVP1.5)
- AI 자동 검수 6항목 + 관리자 승인 흐름 — 상세: C5-fan-intelligence.md

---

## 8. Domain 4 — THE LOCKER ROOM

> ⚠️ M1·M3: MVP 1 필수 | 전체: MVP 2 오픈 | 반응형: 3화면 확인 | ☀️ 라이트

| ID | 모듈명 | 핵심 기능 | MVP |
|----|--------|-----------|-----|
| M1 | 소셜 로그인 | Firebase Auth · Google/Apple · role 필드 (voter/admin) | MVP 1 필수 ★★★ |
| M2 | 프로필 카드 | Shadcn Avatar · 투표 통계 · 골드 테두리 | MVP 2 |
| M3 | 개인정보 설정 | **GDPR Right to Erasure** · 데이터 삭제 요청 · 쿠키 설정 | MVP 1 필수 ★★★ |
| M4 | 내 투표 기록 | 익명화 투표 기록 조회 | MVP 2 |

### 🤖 에이전트 D-1 임무

- next-auth + firebase-adapter Google/Apple 소셜 로그인
- Firestore `users`: `{uid, email, displayName, role: "voter", createdAt}`
- GDPR 삭제: AlertDialog 2단계 → Auth + Firestore + Storage 전체 삭제
- 삭제 감사 로그: `audit_log` 컬렉션 3년 보관
- ⚠️ **GDPR 데이터 삭제는 MVP 1 런칭 전 반드시 완성! EU 법적 의무.**

---

## 9. Domain 5 — POLICY HUB

> ✅ MVP 1 필수 법적 의무 1순위 | 반응형: 3화면 확인 | ☀️ 라이트

> ⚠️ **Policy Hub 내용은 디자인 작업 전에 반드시 확정해야 합니다. 법적 문서 확정 없이 디자인 시작 금지.**  
> 이용약관·개인정보처리방침 전문: `WorldCrown48_PolicyHub_v1_0.html` 별도 파일 관리

| ID | 모듈명 | 핵심 기능 | MVP |
|----|--------|-----------|-----|
| M1 | 쿠키 동의 배너 | 하단 고정 · 3버튼 (모두허용/필수만/설정) · GDPR Firestore 저장 | MVP 1 최우선 ★★★ |
| M2 | 법적 문서 페이지 | PolicyHub HTML 렌더링 · Shadcn Tabs (한/영/스페인) · react-markdown | MVP 1 ★★★ |
| M3 | 공지사항 | 공지 리스트 · 상세 · 관리자 CRUD | MVP 1 ★★★ |
| M4 | 신고 센터 | 위반 신고 양식 · 처리 현황 | MVP 2 |

### 쿠키 3-티어 분류 (GDPR·CCPA·한국 개인정보보호법 동시 준수)

| 분류 | 유형 | 동의 필요 |
|------|------|-----------|
| 필수 | 세션·인증·CSRF 토큰 | 불필요 |
| 기능 | 언어설정·다크모드·투표임시저장 | 선택 |
| 분석 | GA·Firebase Analytics | 선택 |

### 법적 문서 URL 구조

| URL | 내용 | MVP |
|-----|------|-----|
| `/policies/terms` | 이용약관 (한/영/스페인) | MVP 1 필수 |
| `/policies/privacy` | 개인정보처리방침 (한/영/스페인) | MVP 1 필수 |
| `/policies/cookies` | 쿠키 정책 (한/영/스페인) | MVP 1 필수 |
| `/notices` | 공지사항 | MVP 1 필수 |

### 🤖 에이전트 E-1 임무

- 쿠키 배너: Tailwind `fixed bottom-0` + Shadcn 3개 Button
- "설정하기" → Shadcn Sheet (카테고리별 Toggle Switch)
- 동의 선택: localStorage가 아닌 Firestore `cookie_consents`에 서버 저장 (GDPR 감사 추적)
- ⚠️ **쿠키 배너는 MVP 1 런칭 당일부터 반드시 작동! 가장 먼저 완성해야 하는 컴포넌트.**

---

## 10. Domain 6 — ADMIN DASHBOARD

> ★★ v4.4 신규 도메인 | 🖥 데스크탑 전용 · admin 전용 | ☀️ 라이트

System Admin(대표님)이 전체 플랫폼을 모니터링·관리하는 통합 콘트롤 센터.

| ID | 모듈명 | 핵심 기능 | MVP |
|----|--------|-----------|-----|
| M1 | 메인 대시보드 | Tournament 5지표 + 부정투표 경고 카드 + 시스템 상태 | MVP 1 ★★★ |
| M2 | 대진 목록 관리 | 전체 대진 현황 + 카테고리 필터 + 상태 배지 | MVP 1 ★★★ |
| M3 | 부정투표 처리 | 3단계 차단 시스템 UI ⚠️ v4.5 이연 → **MVP 3** | MVP 3 |
| M4 | 대진 운영 현황 | 대진별 투표 현황 · AI 뉴스 섹션 | MVP 2 |
| M5 | ★ AI 뉴스 대시보드 | 검수 결과 확인 + 승인/반려/수동편집 + 배포 상태 + 오보 정정 | MVP 2 ★★★ |
| M6 | 신고 센터 | 사용자 신고 처리 · 처리 이력 | MVP 2 |

### Tournament 관제탑 5지표 (M1)

| 지표명 | 설명 | 데이터 소스 |
|--------|------|-------------|
| ① 총 투표 수 | 누적 투표 총합 | Realtime DB |
| ② 활성 Voter 수 | 최근 1시간 내 투표 유니크 Voter | Firestore |
| ③ 투표 속도 | 분당 투표 수 (실시간 차트) | Realtime DB |
| ④ 어뷰징 경고 | Rate Limiting 발동 횟수 + 의심 계정 수 | Cloud Functions |
| ⑤ 라운드 현황 | 현재 라운드 · Tournament Deadline까지 남은 시간 | Firestore |

### Domain 6 M5 상세 — AI 뉴스 대시보드 ★ v4.8 강화

| 기능 | 설명 | UI 컴포넌트 |
|------|------|-------------|
| 뉴스 목록 | 상태별 필터 (검수대기/승인대기/배포완료/반려) | Shadcn DataTable + Badge |
| 검수 결과 | 1단계 AI 자동 검수 6항목 통과/실패 표시 | 체크리스트 (✅❌) |
| 승인/반려 | 관리자가 읽고 승인 또는 반려(삭제) | Shadcn Button 2개 + AlertDialog |
| 수동 편집 | 검수 실패 뉴스 직접 수정 후 재승인 | Shadcn Textarea + 재검수 버튼 |
| 오보 정정 | 배포된 뉴스 오류 발견 시 정정 공지 | Shadcn Modal + 정정 사유 입력 |

### 🤖 에이전트 G-1 임무

- 5지표 카드: Shadcn Card 5개 + Recharts LineChart
- 대진 목록: Shadcn DataTable + 카테고리 필터 + 상태 배지
- `/admin/*` 라우트 보호: middleware에서 role !== "admin" → 403
- 데스크탑 전용 레이아웃 (`min-width: 1024px`)

---

## 11. 전체 에이전트 배치 맵

> 💡 **핵심 원칙: "1개 Claude Code 대화 = 1개 에이전트 = 1개 모듈 임무"**

| 에이전트 | 도메인 | 핵심 작업 | 주요 기술 | MVP | 반응형 |
|---------|--------|-----------|-----------|-----|--------|
| A-0 | LAUNCH PAD | Hero + 카운트다운 + 이메일 웨이트리스트 | Next.js + Firestore | 1 | ✅ 3화면 |
| A-1 | THE PITCH | Hero · Trending · Navigation · 반응형 | Next.js + Tailwind + Zustand | 1 | ✅ 3화면 |
| B-1 | THE LAB | M0 마법사 + 48 Nodes + AI채우기 + 저장 | Next.js + Framer Motion | 1 | 🖥 |
| C-1 | THE ARENA | VS Battle · 투표 · Rate Limiting · 라운드 자동 전환 | Next.js + Realtime DB | 1 | ✅ 3화면 |
| C-2 | THE ARENA | Crown Card 생성 + SNS 3종 공유 | Next.js + Canvas API | 1 | ✅ 3화면 |
| C-3 | THE ARENA | 랭킹 캐시 1h + 특이점 탐지 4종 + 어뷰징 감지 | Cloud Functions | 1 | — |
| C-4 | THE ARENA | 아레나 뉴스룸 2칼럼 · 키워드 뉴스 7 · Firestore 캐시 | Next.js + Firestore | 1 | ✅ 3화면 |
| C-5 | THE ARENA | AI-Report News View + Fan Intelligence 수동 생성 | Next.js + Cloud Functions + Claude API | 1·1.5 | ✅ 3화면 |
| D-1 | LOCKER ROOM | 소셜 로그인 · GDPR 삭제 · role 관리 | Next.js + Firebase Auth | 1 | ✅ 3화면 |
| E-1 | POLICY HUB | 쿠키 배너 · 법적 문서 3개국어 · 공지사항 | Next.js + Firestore | 1 | ✅ 3화면 |
| G-1 | ADMIN DASH | 대시보드 M1~M2 · 5지표 · 대진 목록 | Next.js + Firestore | 1 | 🖥 |
| B-2 | THE LAB | AI 채우기 유저 확장 (MVP 2) | Cloud Functions | 2 | — |
| D-2 | LOCKER ROOM | 프로필 카드 · 투표 기록 (MVP 2) | Next.js + Firestore | 2 | — |
| F-1 | AI 뉴스 팩토리 | 특이점 4종 + Champion → AI 뉴스 생성 + 검수 | Cloud Functions + Claude API | 2 | — |
| G-2 | ADMIN DASH | AI 뉴스 M5 검수·승인 + 대진 운영 M4 | Next.js + Firestore | 2 | — |

---

## 12. Claude Code 바이브코딩 실행 가이드

### 12.1 핵심 원칙 3가지

| 원칙 | 내용 |
|------|------|
| ① 1개 대화 = 1개 모듈 | Claude Code를 새로 열 때마다 하나의 모듈 임무만 부여 |
| ② 터미널에서 실행, 한국어로 대화 | `cd ~/Projects/worldcrown48` → `claude` 입력 → 한국어로 임무 부여 |
| ③ 임무 = 역할 + 기술 + 범위 | "당신은 XX 전담 개발자입니다. 이 모듈만 구현하세요. 다른 코드 건드리지 마세요." |

### 12.2 에이전트 임무 부여 표준 템플릿

```
당신은 '월크48 [모듈명] 전담 개발자'입니다.

역할 및 권한:
- 담당 모듈: [모듈명]
- 금지: 다른 도메인/모듈 코드 수정 금지
- 허용: 담당 모듈 폴더 내 모든 파일 생성/수정

기술 스택:
- 프론트엔드: Next.js 14 (App Router) + TypeScript
- UI: Tailwind CSS + Shadcn/UI + Framer Motion
- 백엔드: Firebase (Firestore / Realtime DB / Cloud Functions)
- 디자인 토큰: docs/design/WC48_DESIGN_SYSTEM_v2.3.md 참조 (구버전 색상값 삭제)
- 다국어: next-intl (MVP2부터 ko/en/es)

월크48 핵심 원칙 (반드시 준수):
- 서비스 정체성: 팬 투표 서비스 (예측·베팅·실제경기 연동 절대 금지)
- Contestant: 사람·팀·곡·음식·물건 무엇이든 가능. Tournament에 48개 고정
- Round: Voter 개인의 진행 단계. DB 문서 없음. Voter마다 독립. Deadline 없음
- 대진 흐름: Tournament Deadline만 존재. Round 전환은 advanceRound() 자동
- 투표 정책: 대진별 1일 5회, 자정 리셋
- 실시간 득표 수 절대 미노출 → 1시간 캐시 득표율(%)만 표시

지금 구현할 기능:
1. [구체적 기능 1]
2. [구체적 기능 2]

완료 기준:
- [테스트 가능한 완료 조건]

시작해주세요.
```

### 12.3 터미널 실행 명령어

| 단계 | 명령어 | 설명 |
|------|--------|------|
| 터미널 열기 | ⌘ + 스페이스 → Terminal | Mac 기본 터미널 |
| 프로젝트 이동 | `cd ~/Projects/worldcrown48` | 월크48 폴더 이동 |
| Claude Code 실행 | `claude` | Claude Code 시작 |
| 개발 서버 | `npm run dev` | localhost:3000 접속 |
| Firebase 에뮬레이터 | `firebase emulators:start` | 로컬 Firestore + Auth 테스트 |
| Vercel 배포 | `git push origin main` | 자동 빌드 + 배포 트리거 |

---

## 13. Cloud Functions 모듈 설계

### 13.1 Cloud Functions 전체 목록 ★ v4.8 개정

| 함수명 | 트리거 | 역할 | MVP | 에이전트 |
|--------|--------|------|-----|---------|
| `onVote` | HTTPS POST | 투표 처리 + 한도 검증 + Rate Limiting | 1 | C-1 |
| `onRateLimitCheck` | HTTPS 미들웨어 | 1분 10회 초과 → 15분 쿨다운 | 1 | C-1 |
| `advanceRound` ★ | Firestore 트리거 (Match 완료) | Voter 마지막 Match 완료 → 다음 Round 자동 전환 | 1 | C-1 |
| `scheduleRankingCache` | 매 1시간 스케줄러 | 득표율 집계 → `ranking_cache` 갱신 + 특이점 4종 탐지 | 1 | C-3 |
| `onAbuseDetect` | Firestore 트리거 | 비정상 패턴 → 관리자 이메일 알림 | 1 | C-3 |
| `getNewsCache` | HTTPS GET | GNews API → Firestore 1h 캐시 반환 | 1 | C-4 |
| `onCrownCardCreate` | Firestore 트리거 (Champion) | Crown Card 이미지 생성 → Storage 저장 | 1 | C-2 |
| `onUserDelete` | HTTPS DELETE | GDPR 삭제 → Auth+Firestore+Storage + audit_log | 1 | D-1 |
| `aiFillContestants` | HTTPS POST | Claude API Contestant 48개 자동 추천 | 1 | B-1 |
| `generateAINews` ★ | Firestore 트리거 (특이점/Champion) | 트리거 감지 → Claude API 뉴스 생성 → 1단계 자동 검수 | 2 | F-1 |
| `publishNews` ★ | HTTPS POST | 관리자 승인 완료 → PR 배포 실행 | 3 | G-2 |

### 13.2 핵심 함수 — onVote

```typescript
// functions/src/onVote.ts
export const onVote = functions.https.onCall(async (data, context) => {
  const { tournamentId, matchId, contestantId } = data;
  const userId = context.auth?.uid;

  // 1. 로그인 확인
  if (!userId) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다');

  // 2. Rate Limiting: 1분 10회 초과 체크
  const recentVotes = await checkRateLimit(userId);
  if (recentVotes >= 10) throw new functions.https.HttpsError('resource-exhausted', '15분 대기');

  // 3. 대진별 1일 5회 한도 체크
  const todayVotes = await getTodayVoteCount(userId, tournamentId);
  if (todayVotes >= 5) throw new functions.https.HttpsError('resource-exhausted', '투표 한도 5회 도달');

  // 4. Firebase Realtime DB 트랜잭션 (동시 투표 충돌 방지)
  await realtimeDb.ref(`votes/${matchId}/${contestantId}`)
    .transaction(current => (current || 0) + 1);

  // 5. Firestore votes 기록 저장
  await firestore.collection('votes').add({
    userId, tournamentId, matchId, contestantId,
    votedAt: FieldValue.serverTimestamp(),
    date: getTodayKST(),
    ipHash: hashIP(context.rawRequest.ip),
    deviceId: data.deviceId || null
  });

  return { success: true };
});
```

### 13.3 핵심 함수 — scheduleRankingCache + 특이점 탐지

```typescript
// functions/src/scheduleRankingCache.ts
export const scheduleRankingCache = functions.pubsub
  .schedule('every 1 hours').onRun(async () => {
    const tournaments = await getActiveTournaments();
    for (const t of tournaments) {
      const contestants = await getContestantVoteCounts(t.id);
      const total = contestants.reduce((s, c) => s + c.count, 0);
      const rankings = contestants
        .map(c => ({ contestantId: c.id, rate: total > 0 ? (c.count / total * 100).toFixed(1) : 0 }))
        .sort((a, b) => b.rate - a.rate);

      // 랭킹 캐시 저장 (절대수치 없음, %만)
      await firestore.collection('ranking_cache').doc(t.id).set({
        rankings, cachedAt: FieldValue.serverTimestamp(), tournamentId: t.id
      });

      // ★ 특이점 4종 탐지
      const prev = await getPreviousCache(t.id);
      const triggers = [];
      if (rankings[0].rate >= 60) triggers.push({ type: 'T-1', detail: `1위 ${rankings[0].rate}%` });
      if (rankings[0].rate - rankings[1].rate >= 30) triggers.push({ type: 'T-2', detail: `격차 ${(rankings[0].rate - rankings[1].rate).toFixed(1)}%p` });
      if (await get24hGrowthRate(t.id) >= 200) triggers.push({ type: 'T-3', detail: '24h 200%+ 급증' });
      if (prev && detectReversal(prev.rankings, rankings)) triggers.push({ type: 'T-4', detail: '순위 역전' });

      for (const trig of triggers) {
        await firestore.collection('ai_news').add({
          tournamentId: t.id, trigger: trig,
          status: 'pending_generation', createdAt: FieldValue.serverTimestamp()
        });
      }
    }
  });
```

---

## 14. Firestore 전체 컬렉션 스키마

### 14.1 컬렉션 전체 목록

| 컬렉션명 | 역할 | MVP |
|---------|------|-----|
| `tournaments` | 대진 전체 정보 (tournamentDeadline 포함) | 1 |
| `contestants` | 대진별 48개 Contestant 정보 (이름·이미지) | 1 |
| `votes` | 개별 투표 기록 (userId·matchId·날짜·IP해시) | 1 |
| `ranking_cache` | 1시간 캐시 득표율 (절대 수치 없음, **%만**) | 1 |
| `news_cache` | GNews API 1시간 캐시 (★ 7개 뉴스 — 2026-05-25 25→7) | 1 |
| `users` | 유저 프로필 (uid·role·createdAt) | 1 |
| `cookie_consents` | GDPR 쿠키 동의 기록 | 1 |
| `notices` | 공지사항 | 1 |
| `waitlist` | 이메일 웨이트리스트 | 1 |
| `admin_alerts` | 어뷰징 경고 알림 | 1 |
| `audit_log` | GDPR 삭제 감사 로그 (3년 보관) | 1 |
| `crown_cards` | Crown Card 메타데이터 | 1 |
| `ai_news` ★ | AI 생성 뉴스 (Fan Intelligence) — ko/en 본문·검수·승인상태 | 1.5 |

### 14.2 tournaments 스키마 ★ v4.8 정화

```typescript
// tournaments/{tournamentId}
{
  id: "tournament_abc123",
  title: "2026 FIFA 월드컵 선수 이상형 월드컵",
  category: "FIFA" | "KPOP" | "OTHER",
  tournamentType: "nation_cup" | "player_mvp" | "artist" | "custom",
  entryUnit: "Nation" | "Contestant",  // nation_cup → "Nation" / 나머지 → "Contestant"
  desc: "대진 설명 (선택, 최대 200자)",
  hostUid: "uid_admin",
  status: "draft" | "active" | "closed",
  createdAt: Timestamp,
  tournamentDeadline: Timestamp,  // ★ 유일한 Deadline
  settings: {
    aiNews: true,
    multiLang: true,
    showRanking: true,
    autoExtend: false
  },
  currentRound: 1,       // 시스템이 advanceRound()로 자동 증가
  totalContestants: 48,  // 고정값
  thumbnailUrl: "https://storage..."
}
// ⚠️ rounds[].deadline 필드 완전 제거. Round에는 Deadline이 없다.
```

### 14.3 contestants 스키마 ★ v4.9 정화

```typescript
// contestants/{contestantId}
{
  id: "contestant_001",
  tournamentId: "tournament_abc123",
  name: "손흥민",                        // 사람·팀·곡·음식 무엇이든
  imageUrl: "https://storage...",
  imageSource: "https://...",           // 출처 URL (DMCA 대응, Level 2 필수)
  description: "토트넘 홋스퍼 / 대한민국",  // 선택
  seed: 1,                              // 브래킷 배정 순서 1~48 고정
  createdAt: Timestamp
}
// ⚠️ 항상 정확히 48개 / Tournament. 생성 시 확정, 이후 불변.
// ⚠️ "48명" 표현 금지 → "48개" (사람이 아닐 수 있음)
```

### 14.4 votes 스키마

```typescript
// votes/{voteId}
{
  userId: "uid_xxxxx",
  tournamentId: "tournament_abc123",
  matchId: "match_zzz",
  contestantId: "contestant_aaa",
  votedAt: Timestamp,
  date: "2026-06-14",       // KST 기준 자정 리셋용
  ipHash: "sha256(ip)",
  deviceId: "fp_hash"       // fingerprintjs (MVP2)
}
// 대진별 1일 5회: WHERE userId==? AND tournamentId==? AND date==TODAY → COUNT<5
```

### 14.5 ranking_cache 스키마

```typescript
// ranking_cache/{tournamentId}
{
  tournamentId: "tournament_abc123",
  cachedAt: Timestamp,
  rankings: [
    { contestantId: "contestant_001", rate: "34.5" },
    ...
  ]
}
// ⚠️ count(절대 투표 수) 저장 금지. rate(득표율%)만.
```

### 14.6 ai_news 스키마 ★ 2026-05-25 개정 (ko/en 이중 언어)

> 단일 진실: `docs/lite-specs/C5-fan-intelligence.md §7`. MVP 1 지원 언어가 ko+en이므로 본문을 이중 언어로 저장한다.

```typescript
// ai_news/{newsId}
{
  tournamentId: "tournament_abc123",
  type: "launch_news" | "champion" | "anomaly",
  trigger: { type: "manual" | "T-1" | "T-2" | "T-3" | "T-4" | "champion", detail: "관리자 수동 생성" },
  content: {                       // ★ ko/en 이중 언어
    titleKo: string, titleEn: string,
    bodyKo: string,  bodyEn: string
  },
  crownCardUrl: "https://storage.../crown_cards/xxx.png" | null,  // 대표 이미지
  aiDisclosure: {                  // EU AI Act 준수
    label: "AI-Report",
    model: "claude-sonnet-4-20250514",
    dataSource: "worldcrown48-fan-votes",
    dataTimestamp: Timestamp
  },
  voteData: { top5: [{ contestantName, voteRate }], collectedAt: Timestamp },  // Vote Rate(%)만
  status: "pending_review" | "approved" | "rejected" | "published",
  autoCheckResult: {               // AI 자동 검수 6항목
    hasAiLabel, dataMatch, noDefamation, noCopyright, hasSources, meetsLength, allPassed
  },
  reviewedBy: "uid_admin" | null,
  reviewedAt: Timestamp | null,
  publishedAt: Timestamp | null,
  isLaunchNews: boolean,           // 런치 뉴스 = 뉴스룸 상단 고정
  createdAt: Timestamp
}
```

---

## 15. 즉시 실행 체크리스트

### 15.1 개발 시작 전 완료 사항

| 항목 | 담당 | 기한 | 완료 기준 |
|------|------|------|-----------|
| PolicyHub_v1_0.html 회사 정보 채우기 | 대표 | D-7 | 실제 정보 입력 완료 |
| 이용약관·개인정보처리방침 법무 검토 | 대표 | D-7 | 법무사 또는 온라인 자문 완료 |
| Firebase 프로젝트 생성 + Security Rules | 48티오 | D-5 | Firestore RLS 설정 완료 |
| Firestore users role + admin 계정 | 48티오 | D-5 | admin role 정상 동작 |
| GNews API 키 발급 ($9/월) | 대표 | D-5 | API Key + .env.local 등록 |
| Claude API 키 발급 | 대표 | D-5 | claude-sonnet-4-20250514 접근 확인 |
| Next.js 초기화 + Vercel 연결 | 48티오 | D-4 | 배포 URL 확인 |
| Cloudflare 도메인 + SSL | 48티오 | D-3 | HTTPS 정상 동작 |

### 15.2 MVP 1 에이전트 실행 순서

| 순서 | 에이전트 | 작업 내용 | 의존성 |
|------|---------|-----------|--------|
| 1st | A-0 | LAUNCH PAD — 랜딩·카운트다운·웨이트리스트 | Firebase 설정 완료 |
| 2nd | E-1 | POLICY HUB — 쿠키 배너 + 법적 문서 | A-0 완료 |
| 3rd | D-1 | LOCKER ROOM — 소셜 로그인 + GDPR 삭제 | Firebase Auth 설정 |
| 4th | B-1 | THE LAB — M0 마법사 + 48 Nodes | D-1 완료 |
| 5th | C-1 | THE ARENA — VS Battle + 투표 + 라운드 자동 전환 | B-1에서 대진 1개+ 생성 |
| 6th | C-3 | THE ARENA — 랭킹 캐시 + 특이점 탐지 | C-1 완료 |
| 7th | C-4 | THE ARENA — 아레나 뉴스룸 GNews 25개 | GNews API 키 확보 |
| 8th | C-2 | THE ARENA — Crown Card 생성 | C-4 완료 |
| 9th | A-1 | THE PITCH — 메인 홈 반응형 | 기본 준비 후 |
| 10th | G-1 | ADMIN DASHBOARD — M1~M2 | MVP 1 완료 후 |

### 15.3 MVP 1 완료 기준 체크리스트

| ☐ | 항목 | 에이전트 | 우선순위 |
|---|------|---------|---------|
| ☐ | 도메인 0: 랜딩 + 웨이트리스트 + 카운트다운 | A-0 | ★★★ |
| ☐ | 쿠키 동의 배너: 3버튼 + Firestore 저장 | E-1 | ★★★ |
| ☐ | 소셜 로그인: Google → role 저장 + 로그아웃 | D-1 | ★★★ |
| ☐ | GDPR 삭제: Auth+Firestore+Storage 전체 삭제 | D-1 | ★★★ |
| ☐ | 대진 만들기: M0 마법사 3단계 + 48 Nodes | B-1 | ★★★ |
| ☐ | AI 채우기: Claude API → 48개 Contestant 추천 | B-1 | ★★ |
| ☐ | VS Battle: Match 순서 제시 → 선택 → 라운드 자동 전환 | C-1 | ★★★ |
| ☐ | 투표 한도: 대진별 1일 5회 + 초과 안내 | C-1 | ★★★ |
| ☐ | Rate Limiting: 1분 10회 → 15분 쿨다운 | C-1 | ★★ |
| ☐ | 아레나 뉴스룸: GNews 25개 (데스크탑/태블릿/모바일) | C-4 | ★★★ |
| ☐ | Crown Card: Champion → 이미지 생성 → 뉴스 링크 + 다운로드 | C-2 | ★★★ |
| ☐ | 라운드 자동 전환: 마지막 Match → advanceRound() → 전환 효과 | C-1 | ★★★ |
| ☐ | 어뷰징 감지: 비정상 패턴 → 관리자 이메일 알림 | C-3 | ★★ |
| ☐ | 반응형: 375px / 768px / 1440px 3종 확인 (D0·D1·D3·D4·D5) | 전체 | ★★★ |
| ☐ | 관리자 대시보드: 5지표 + 대진 목록 | G-1 | ★★ |

> ⚠️ PolicyHub_v1_0.html 회사 정보를 실제 정보로 채운 후 법무 검토를 받으세요.

---

## 16. 용어 해설 (Glossary)

| 용어 | 설명 |
|------|------|
| **Tournament** | 48개 Contestant가 참여하는 하나의 완전한 이상형 월드컵 이벤트. Tournament Deadline을 보유 |
| **Round** | Tournament 안에서 Voter의 투표 진행에 따라 시스템이 자동으로 전환하는 단계. **Deadline·DB 문서·Host 제어 없음. Voter마다 독립** |
| **Match** | 하나의 Round 안에서 두 Contestant이 1:1로 겨루는 투표 단위. Voter에게 순서대로 하나씩 제시 |
| **Contestant** | Tournament 안에서 Voter가 선택하는 투표 대상 엔터티. **사람·팀·곡·음식·물건 무엇이든 가능. 48개 고정.** (nation_cup만 예외: Nation) |
| **Nation** | `tournamentType = "nation_cup"` 전용 용어. 국가대표팀 단위. Contestant와 혼용 금지 |
| **Voter** | Tournament에 참여하는 투표자. role: 'voter' |
| **Champion** | 최종 결승에서 Voter가 선택한 최종 1개 Contestant |
| **Tournament Host** | 대진을 만든 자. Tournament Deadline 설정 권한. MVP에서는 System Admin만 가능 |
| **Tournament Deadline** | Tournament 전체 마감 시각. **월크48의 유일한 Deadline** (Round Deadline은 존재하지 않는 개념) |
| **advanceRound()** | Voter가 해당 Round 마지막 Match 완료 시 시스템이 자동 호출하는 라운드 전환 함수. **Host가 호출하지 않음** |
| **Crown Card** | 투표 결과를 SNS 공유 가능한 이미지 카드로 생성. AI 뉴스 대표 이미지로도 활용 (저작권 제로) |
| **Vote Count** | 특정 Contestant이 받은 투표 합계. **UI에 절대 노출 금지** |
| **Vote Rate** | 득표율(%). 랭킹·Crown Card에 표시되는 유일한 수치 |
| **TournamentType** | 대진 유형 분류 키. `nation_cup` / `player_mvp` / `artist` / `custom` |
| **Round Transition** | 각 Round 마지막 Match 완료 후 다음 Round 전 표시되는 전환 화면. "맨 어브 더 월드컵 N강" |
| **ranking_cache** | 1시간 단위 득표율(%) 캐시. 실시간 절대 수치 저장 금지 |
| **ai_news** | AI 생성 뉴스 컬렉션. 트리거·본문·검수결과·승인상태·Crown Card URL 포함 |
| **특이점 트리거** | 대진 진행 중 자동 감지되는 4종 조건 (T-1~T-4). AI 뉴스 자동 생성의 시작점 |
| **Fan Intelligence** | AI가 생성하는 팬덤 기반 뉴스 콘텐츠. 바이라인: "● AI-Report" (11px, 골드) |
| **바이브코딩** | AI에게 비즈니스 목적과 흐름을 전달하여 시스템을 자동 완성하는 의도 중심 개발 방식 |
| **GNews API** | 글로벌 뉴스 API. Basic $9/월 고정 (v4.6 확정) |
| **Rate Limiting** | 1분 내 10회 초과 요청 시 15분 쿨다운. 어뷰징 방지 |
| **GDPR** | EU 일반 개인정보보호법. 위반 시 전 세계 매출 최대 4% 과징금 |
| **next-intl** | Next.js 다국어(i18n) 라이브러리. MVP2부터 ko/en/es 전환 |
| **Cloudflare** | 글로벌 CDN, DDoS 방어, WAF, SSL 인프라 |

---

## 17. 부록 — v4.0→v4.8 변경이력

| # | 버전 | 변경 항목 | 영향 범위 |
|---|------|-----------|-----------|
| ① | v4.1 | 기술스택 변경: Flutter Web → Next.js 14 + React + Tailwind CSS | 전 도메인 |
| ② | v4.1 | THE LAB 비공개: MVP 전 기간 관리자 전용 /admin/lab | Domain 2 |
| ③ | v4.1 | 48 Nodes Grid: 6개씩 슬라이드 모달 8페이지 확정 | Domain 2 M2 |
| ④ | v4.2 | 서비스 정체성 공식화: 예측·베팅·실제경기 연동 절대 금지 | 전 문서 |
| ⑤ | v4.2 | 대진 흐름 원칙: Tournament Deadline만 존재, Round 자동 전환 | 전 문서 |
| ⑥ | v4.2 | 투표 정책 확정: 대진별 1일 5회, 자정 KST 리셋 | Domain 3 |
| ⑦ | v4.4 | Domain 6 추가: 관리자 대시보드 신규 도메인 | Domain 6 신규 |
| ⑧ | v4.4 | Tournament 관제탑 5지표 확정 | Domain 6 M1 |
| ⑨ | v4.4 | 아레나 뉴스룸: GNews API 키워드 뉴스 MVP1 적용 | Domain 3 M6 |
| ⑩ | v4.5 | 반응형 전략: 375px / 768px / 1440px 3화면 확인 필수화 | 전 도메인 |
| ⑪ | v4.6 | GNews $9/월 확정: Basic 플랜 공식 채택 | Domain 3 M6 |
| ⑫ | v4.6 | 뉴스룸 25개 레이아웃: 키워드 15 + 확장 10 확정 | Domain 3 M6 |
| ⑬ | v4.6 | The Lab M0 신설: 대진 생성 마법사 | Domain 2 M0 |
| ⑭ | v4.7 | Domain 0 복원: LAUNCH PAD 사전 랜딩페이지 | Domain 0 신설 |
| ⑮ | v4.7 | Cloud Functions 전체 함수 명세 챕터 신설 | Ch.10 신설 |
| ⑯ | v4.7 | Firestore 스키마 챕터 신설 | Ch.11 신설 |
| ⑰ | v4.8 | 원칙② 전면 개정: Voter 투표 흐름 기반 자동 전환 다이어그램 포함 | 전 문서 |
| ⑱ | v4.8 | AI 뉴스 팩토리 전면 개정: 특이점 4종 + 2단계 검수 시스템 확립 | Domain 3 M7 |
| ⑲ | v4.8 | 용어·스키마 정화: rounds[].deadline 제거, Contestant/Match 통일 | 전 문서 |

---

*© 2026 WorldCrown48 | 작성: 48티오 | v4.9 | CONFIDENTIAL*  
*전 세계 팬덤의 열정을 데이터로, 데이터를 뉴스로, 뉴스를 자산으로 — 👑 WorldCrown48*
