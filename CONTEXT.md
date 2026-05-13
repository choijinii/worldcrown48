# WorldCrown48 (월크48) — Domain Context
# v0.3 — 2026년 5월 | CLAUDE.md v1.1 정책 변경 반영

> **변경 이력**
> - v0.2 → v0.3: CLAUDE.md v1.1 불변 원칙 개정 반영
>   - ★ "다크모드 전용" → "듀얼 테마" 전환 (다크 4 도메인 + 라이트 3 도메인)
>   - ★ 배경색 #05070A 단일 고정 폐지 → 다크 팔레트 범위 유연 적용
>   - ★ "초상권 보호(수동만)" → "3단계 이미지 소싱 정책" 전환
>   - 도메인 구조에 테마 표시 추가
> - v0.1 → v0.2: 설계서 v4.8 방향 반영
>   - ★ 용어 정의 전체를 LANGUAGE.md v1.2로 이관 (중복 제거)
>   - ★ Round 재정의: Round Deadline 폐지, Voter 투표 흐름 기반 자동 전환
>   - ★ 용어 통일: Candidate → Contestant, Battle → Match
>   - Domain 0 (Launch Pad) 추가
>   - 전체 문서 압축 (LANGUAGE.md·ProjectSkill.md와 역할 분리)

---

## 이 파일의 역할

```
CONTEXT.md    = "지금 프로젝트가 어디까지 왔는가" (현황·정책·기술 요약)
LANGUAGE.md   = "용어를 어떻게 쓰는가" (공식 용어 정의 — 단일 진실 공급원)
ProjectSkill  = "Claude가 어떻게 일하는가" (에이전트 임무·협업 가이드)
```

> ⚠️ **용어 정의는 이 파일에 없습니다. LANGUAGE.md v1.2를 참조하세요.**

---

## 핵심 비전

48명의 Contestant을 1:1 Match 방식으로 투표해 최후의 1인(Champion)을 가리는 글로벌 팬덤 Tournament 플랫폼.
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

## ★ 대진 흐름 핵심 원칙 (v0.2 전면 수정)

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
| UI/UX | Tailwind CSS + Shadcn/UI + Framer Motion + Zustand |
| 백엔드 | Firebase (Firestore + Realtime DB + Auth + Cloud Functions) |
| AI | Claude API (claude-sonnet-4-20250514) |
| 뉴스 | GNews API Basic $9/월 (MVP 1) → Claude API (MVP 2) |
| 호스팅 | Vercel (프론트) + Firebase (백엔드) |
| CDN/보안 | Cloudflare |
| 도메인 | worldcrown48.com |

---

## 핵심 불변 원칙

1. **듀얼 테마** — 핵심 화면(D0~3) = 다크, 유틸리티 화면(D4~6) = 라이트 허용. 배경색 고정 아님.
2. **Pure Gold만** — 포인트 컬러 `#FFD700`만. 다크·라이트 양쪽 테마 모두 적용. 형광 노랑/그린 금지.
3. **한국적 요소 금지** — 글로벌 MZ Sporty 럭셔리.
4. **AI 생성 표기 의무** — "AI GENERATED" 배지 필수.
5. **FIFA 상표권 준수** — "FIFA", "Official" 표기 금지.
6. **3단계 이미지 소싱 정책** — L1 자동 허용(CC 라이선스·공식 프로필) + L2 관리자 수동 승인 + L3 금지(사생활·미성년자·딥페이크). 상세는 CLAUDE.md §3-B 참조.
7. **웹 전용** — 모바일 앱 없음. Flutter 전환 계획 없음.
8. **스택 고정** — Next.js + Firebase. 변경 시 ADR 필수.

### 듀얼 테마 디자인 토큰

```css
/* 다크 테마 (Domain 0, 1, 2, 3) */
--color-bg-deep:    #05070A;   /* 가장 깊은 배경 */
--color-bg-default: #0A0D12;   /* 기본 다크 배경 */
--color-bg-soft:    #0E1217;   /* 카드/패널 배경 */
--color-gold:       #FFD700;   /* 브랜드 골드 (양쪽 공통) */
--color-text:       #F8FAFC;   /* 다크 기본 텍스트 */
--color-border:     #30363D;   /* 다크 테두리 */
--color-muted:      #8B949E;   /* 다크 보조 텍스트 */

/* 라이트 테마 (Domain 4, 5, 6) */
--color-bg-light:      #FAFBFC;   /* 라이트 배경 */
--color-surface-light:  #FFFFFF;   /* 라이트 카드 배경 */
--color-text-light:     #1A1A2E;   /* 라이트 기본 텍스트 */
--color-border-light:   #E2E8F0;   /* 라이트 테두리 */
--color-muted-light:    #64748B;   /* 라이트 보조 텍스트 */
```

> 다크 배경은 `#05070A` 단일 고정이 아닙니다. deep/default/soft 범위 내에서 유연 적용.

---

## 뉴스 전략

```
MVP 1: GNews API 키워드 뉴스 소비 (25개 레이아웃 · $9/월)
MVP 2: AI 뉴스 생성
  - 트리거 1: 크라운 결정 이벤트 (Champion 확정 시 → 먼저 구현)
  - 트리거 2: 특이점 탐지 (지지율 급변 감지 → 이후 구현)
MVP 3: PR 자동 배포 (RedPress / EIN / PR Newswire)
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

| 단계 | 시기 | 핵심 |
|---|---|---|
| MVP 1 | 2026년 6월 전 | Domain 0~3 + 5~6 일부, 투표 엔진, Crown Card, 뉴스룸, Rate Limiting |
| MVP 2 | 2026년 7월 | AI 뉴스 생성, K-POP, Locker Room, 다국어, fingerprintjs |
| MVP 3 | 2026년 하반기 | B2B SaaS, PR 배포, 부정투표 3단계, 수익 모델 |
