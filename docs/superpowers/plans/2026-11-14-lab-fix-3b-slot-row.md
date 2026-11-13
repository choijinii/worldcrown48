# LAB-FIX-3b 엔트리 칸 버튼 줄 · 이미지 대회 버튼 이름 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 리뷰 표시와 [영상]/[이미지] 버튼을 한 줄(왼쪽 · 오른쪽 끝)에 두고, 이미지 대회의 빈칸 버튼 이름을 "빈칸 채우기"로 바꾼다.

**Architecture:** `ContestantEditor` 에 "칸 줄"(`slot-row-*`) 하나를 둔다 — 왼쪽 = 리뷰 표시(`contestant-review-*`, 있을 때만), 오른쪽 끝 = [영상]·[이미지]·[이미지 파일](flex-shrink 0). 주소 칸은 이 줄 바로 다음 형제. [새 영상 찾기]는 소싱 배지 밑 원래 줄에 그대로 둔다. 빈칸 버튼 이름은 순수 함수 `fillBlanksLabel(kind)` 로 고른다.

**Tech Stack:** Next.js 14 · React · vitest(유닛 · 통합 = 정적 렌더) · Playwright 에뮬레이터 E2E

**Spec:** `outputs/prompts/PROMPT_ClaudeCode_LAB-FIX-3b_v1.0_2026-11-14.md`

## Global Constraints
- 문구는 `lab.fill.blanksImage` = 빈칸 채우기 / Fill blanks / Rellenar vacíos — 한 글자도 바꾸지 않는다. 그 밖의 문구는 바꾸지 않는다.
- 대회 종류 잠금 동작 · firestore.rules · storage.rules · Functions 는 건드리지 않는다.
- 색은 `var(--color-…)` 토큰만(`npm run check:hex`). 칸 높이를 키우지 않는다.

## Review Focus
1. 리뷰 표시가 여러 개(불일치 + 중복 + [N번 칸으로])여도 버튼이 줄어들거나 밑으로 밀리지 않는다 — E2E 에서 불일치 칸 y = 일반 칸 y.
2. 주소 칸을 열고 닫아도 버튼 y 가 같다 — E2E.
3. 리뷰 표시도 넣기 버튼도 없는 칸(종류 미정 · 자동 칸)에는 빈 줄이 생기지 않는다 — 통합 시험.
4. 기존 testid(`contestant-review-*` 는 리뷰가 있을 때만 있음)를 쓰는 시험이 그대로 통과한다 — 전체 유닛 · E2E.

---

### Task 1: 빈칸 버튼 이름
**Files:** Modify `components/admin/lab/GeneratePanel.tsx`, `lib/i18n/messages.ts` · Test `lib/__tests__/lab/generatePanelKind.test.ts`, `lib/__tests__/i18n/labFix3Copy.test.ts`
**Produces:** `export function fillBlanksLabel(kind: MediaKind | null): "lab.fill.blanks" | "lab.fill.blanksImage"`
- [ ] 시험: `fillBlanksLabel("video") === "lab.fill.blanks"`, `("image") === "lab.fill.blanksImage"`; 새 키 3언어 = 표 그대로 → 빨강 확인
- [ ] 함수 · 키(주석 한 줄 포함) · 버튼에 연결 → 초록

### Task 2: 칸 줄
**Files:** Modify `components/admin/lab/ContestantEditor.tsx` · Test `tests/integration/slotRow.test.ts`(새)
- [ ] 시험(정적 렌더 · DOM 파싱): 리뷰 있음/없음 모두 `slot-video-N` 이 `slot-row-N` 의 버튼 묶음 마지막 자식이고 버튼 묶음이 줄의 마지막 자식 · 주소 칸(열린 상태)이 `slot-row-N` 의 다음 형제 → 빨강
- [ ] 구현 → 초록

### Task 3: E2E
**Files:** Create `e2e/emulator/lab-fix3b-slot-row.spec.ts`
- [ ] 불일치 칸(MISMATCH_SLOT)과 같은 줄 일반 칸의 `slot-video-*` y 비교 · 주소 칸 열기 전후 y · 이미지/영상 대회 `fill-blanks-button` 글자 · en·es
- [ ] 고치기 전 코드에서 빨강, 고친 뒤 초록
