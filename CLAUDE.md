# 🛑 STOP — 모든 작업 전 필독

> **`docs/mental-model/MENTAL_MODEL.svg`** 를 먼저 본다.
> 어떤 코드·디자인·문서 작업도 이 한 장을 보지 않고는 시작하지 않는다.
> 충돌 시 우선순위: **MENTAL_MODEL.svg > LANGUAGE.md > 기타**

---

# WorldCrown48 — CLAUDE.md v2.1 (핵심 압축판)
# 에이전트 진입점 — 가장 먼저 읽는 파일

## ⛔ IMMUTABLE TERMINOLOGY RULE
RULE 1: 기존 용어 정의 절대 변경 금지.  RULE 2: 새 개념 → 새 용어 생성. 재정의 금지.
단일 진실 공급원: `LANGUAGE.md` | 용어 충돌 시 우선순위: LANGUAGE.md > CONTEXT.md > 기타

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
| CONTEXT.md | 프로젝트 현황 요약 |
| docs/CODING_GUIDELINES.md | Karpathy 코딩 행동 규칙 4가지 (코드 작업 시 필독) |
| docs/design/WC48_DESIGN_SYSTEM_v2.3.md | 디자인 토큰 단일 진실 |
| docs/lite-specs/ | 도메인별 기능 스펙 |

---

## 🎯 서비스 정체성 (절대 불변)

월크48 = 팬이 좋아하는 Contestant를 투표하는 서비스 (이상형 월드컵 방식)
절대 금지: 우승자 예측·베팅, 실제 경기 결과 연동, Vote Count(절대 수치) UI 노출

---

## 🔒 불변 원칙 8가지

| # | 원칙 | 규칙 |
|---|------|------|
| 1 | 듀얼 테마 | Domain 0~3 = 다크, Domain 4~6 = 라이트. 팔레트 상세 → docs/design/colors_and_type.css |
| 2 | Crown Gold | 포인트 컬러 #FCD006만 (로고 v3.0 기준). 형광 노랑·그린 금지 |
| 3 | 글로벌 | 한국적 요소 금지. 글로벌 MZ Sporty 럭셔리 |
| 4 | AI-Report | 배지: "● AI-Report" (11px, #FCD006). "AI GENERATED" 완전 폐기 |
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
8. Vote Count(절대 수치) 금지. Vote Rate(%)는 **랭킹 화면에서만** 허용

**Voter 전체 흐름:**
```
ROUND OF 48 (24 Match) → ROUND OF 24 (12 Match) → ROUND OF 12 (6 Match)
→ ROUND OF 6 (3 Match) → THE FINAL (3명 중 1명 선택)
→ Champion 확정 → Crown Card 생성 → SNS 공유
```

---

## 🛠️ 기술 스택

```
프론트엔드:  Next.js 14 (App Router) + TypeScript
UI/UX:      Tailwind CSS 3.4 + Shadcn/UI + Framer Motion + Zustand
백엔드:     Firebase (Firestore + Realtime DB + Auth + Cloud Functions)
AI:         Claude API (claude-sonnet-4-20250514)
호스팅:     Vercel (프론트) + Firebase (백엔드) + Cloudflare
도메인:     worldcrown48.com
```

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
| `active` | `In Progress` |

---

## 🚀 MVP 마일스톤

| 단계 | 시기 | 핵심 | 언어 |
|------|------|------|------|
| MVP 1 | 2026-05-31 | Domain 0~3+5~6, 투표 엔진, Crown Card | ko + en |
| MVP 1.5 | 2026-06-10 | 관리자 수동 Fan Intelligence 생성 | ko + en |
| MVP 2 | 2026-07 | AI 뉴스 자동화, Locker Room, 다국어 | ko + en + es |
| MVP 3 | 2026 하반기 | PR 자동화, B2B SaaS | + 추가 미정 |

---

*© 2026 WorldCrown48 | CLAUDE.md v2.0 | CONFIDENTIAL*
