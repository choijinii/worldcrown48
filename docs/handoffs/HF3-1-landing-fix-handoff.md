# HF-3.1 — Guest Run 착지·충돌 정합 수정 (미니 핸드오프 v1.0 · 2026-07-08)

> 대상: 열려 있는 Claude Code 세션(wc48-hf3). PR #40 머지 후 Production 라이브 검증에서 발견.
> 기준: origin/main 최신 (d1846bb, PR #40 머지 커밋) 위에 새 브랜치 `feat/hf3-1-landing`.

## 발견 증상 (대표 실증, 2026-07-08)

게스트로 대회 X 완주 → 로그인 → 착지된 Crown Card가 방금 완주 결과가 아니라 **계정에 이미 있던 X의 옛 카드**. 원인 확정: 계정이 X를 과거에 완주한 상태 → planner가 skip(구글 우선, 스펙대로) → 응답 `complete:true` → 착지. **코드는 스펙대로였고, 문제는 (a) 안내 없는 착지 UX (b) 충돌 대회의 게스트 votes가 무조건 이전되어 같은 사람 2회 투표로 Vote Rate 왜곡 가능성** (HF-3 핸드오프 §8 Edge 1 설계 결함 — Cowork 자인).

## 대표 확정 결정 (2026-07-08)

1. **충돌 UX** = 기존 카드에 착지하되 **안내 문구 표시**: "이 대회는 이미 이 계정으로 완주하셨어요 — 기존 기록을 보여드려요" 취지, ko/en.
2. **충돌 대회의 게스트 votes = 삭제** (이전 금지). "게스트 데이터 폐기" 규칙과 일관.

## Scope (3 W)

**W1 — 서버 (functions/src/linkSessionVote.ts + core/linkRoundProgress.ts):**
- 실행 순서 재배치: **roundProgress 충돌 facts를 먼저 조회** → 충돌(googleExists) 대회 목록 확정 → votes 처리 분기:
  - 비충돌 대회 votes → 재부모화 (기존 로직)
  - 충돌 대회 votes → **batch delete** (linked 카운트에 미포함)
  - ⚠️ 현재는 votes 전체 쿼리에서 tids를 수집한 뒤 facts를 읽음 — tids 수집(read-only 1패스)과 쓰기(2패스)를 분리하면 순서 문제 해결
- planner 응답 확장: 항목별 `source: "guest" | "existing"` (refire → guest, skip+googleComplete → existing, copy/skip-else → 해당 없음이지만 타입상 명시)
- bracket_seeds create-once·daily_participation arrayUnion은 충돌에 이미 안전 — 변경 없음 확인만

**W2 — 클라이언트 착지 (components/auth/AuthProvider.tsx):**
- 착지 우선순위: `complete && source==="guest"` 항목 최우선 (방금 완주) → 없으면 `complete && source==="existing"` 항목에 착지하되 **안내 플래그 전달** (쿼리 파라미터 or sessionStorage — 구현자 선택, 새로고침 시 배너 재출현 없어야 함)
- 옛 함수 응답(`source` 부재)에도 안전해야 함 (배포 시차 대비 — optional 처리)

**W3 — 안내 배너 (champion 페이지):**
- 플래그 수신 시 카드 상단에 1회성 안내 (ko/en, `lib/i18n` 사전 등록). 디자인: 기존 토스트/배너 패턴 재사용, Crown Gold 규칙 준수, 새 컴포넌트 최소화

## ⛔ 합격 기준 — 두 케이스의 구분이 이 모듈의 전부 (대표 강조 2026-07-08)

| 케이스 | 판정 (대회별) | 처리 |
|---|---|---|
| **1. 새 토너먼트 게스트 완주** — 계정에 그 대회 roundProgress **없음** | 비충돌 | **전체 이전 (폐기 금지!)**: votes 재부모화 + refire로 카드 새 계정 명의 재생성 + 그 카드로 착지 + 공유 가능. HF-3 E2E-1 회귀 테스트 필수 통과 |
| **2. 이미 완주한 대회에 게스트 재도전** — 계정에 그 대회 roundProgress **있음** | 충돌 | 게스트 votes **삭제** + 기존 카드 착지 + 안내 배너 |

- 판정은 **대회별 독립**: 한 익명 uid에 두 대회가 섞여 있으면(과거 게스트 기록 잔존) 각각 따로 판정. 케이스 1 대회는 이전, 케이스 2 대회는 삭제가 **동시에** 일어날 수 있고 이때 착지는 케이스 1(guest) 우선.
- "게스트 데이터 폐기" 문구를 케이스 1에 확대 적용하는 것은 **Auto-STOP감 사양 위반.**

## 테스트 (§0.5 관례)

- planner 단위테스트: source 필드 + 충돌 votes 삭제 계획 (RED 먼저)
- 착지 우선순위 순수 로직 분리 후 단위테스트 (guest > existing > null)
- E2E: 기존 hf3-guest-run.spec.ts에 충돌 시나리오 1건 추가 가능하면 추가, 무거우면 단위로 갈음하고 사유 기록

## 참고·주의

- votes 삭제 → ranking_cache는 다음 cron 주기에 자연 수렴 (즉시 재계산 불필요)
- 머지 후 functions 재배포 필수: `firebase deploy --only functions --project worldcrown48` (활성 프로젝트 꼬임 회피 형태)
- Auto-STOP·TDD·push 확인 의무는 HF-3 핸드오프(v2.1 템플릿) 규칙 그대로 승계

*© 2026 WorldCrown48 | HF-3.1 Mini Handoff | CONFIDENTIAL*
