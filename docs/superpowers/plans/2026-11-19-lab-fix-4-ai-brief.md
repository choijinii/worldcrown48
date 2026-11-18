# LAB-FIX-4 — "AI에게 알려 줄 내용" 묶음 + 칸 비우기 Implementation Plan

> **For agentic workers:** 실행 = Native(코티오가 직접 · 대표 2026-11-19 승인). Steps use checkbox (`- [ ]`) syntax.

**Goal:** 대회마다 AI에게 "엔트리는 무엇인가 · 덧붙이는 정보 · 고르는 조건"을 알려 주는 묶음을 만들고, 세 AI 지시문이 그것을 맨 위 규칙으로 받게 한다. 칸 ✕ = 통째로 비우기 · [모두 비우기] · 생성 전 붙여넣기 · 링크 제목 읽기 모델 Sonnet.

**Architecture:** 묶음은 `aiBrief {entry, extra, rules}` 하나의 맵(대회 문서 · 초안에 덧붙이기만). 서버는 묶음이 있거나 단위가 `other` 일 때만 **새 지시문 함수**로 가고, 없으면 옛 지시문을 글자 그대로 쓴다(sha256 잠금 유지).

**Spec:** `outputs/prompts/PROMPT_ClaudeCode_LAB-FIX-4_AI안내묶음·칸비우기_v1.0_2026-11-18.md` (§2 결정 A~E · §5 문구 정본 · §7 정답 자료)

## Global Constraints
- 글자 수 한도: entry 40 · extra 40 · rules 300.
- 묶음이 비고 단위가 individual/group 이면 세 AI 일은 **지금과 똑같다**(지시문 글자 · 호출 인자).
- 화면 문구는 §5 표 그대로(15줄 · ko/en/es). 새 키는 `lib/i18n/messages.ts` 한 덩어리.
- 팬 화면 · Category 목록 · 유튜브 검색 · 발행된 대회 백필 — 손대지 않는다.
- raw hex 금지(토큰만) · main 직접 push 금지.

## Review Focus
1. 옛 초안(aiBrief · other 없음)을 열고 저장 → 문서 모양이 지금과 같다(규칙 배포 전에도 저장 통과). → Task 2 시험.
2. 묶음 칸에 공백만 친 경우 → 빈 것으로 본다(옛 지시문). → Task 1 시험.
3. ✕ 로 그림 칸을 비우면 Storage 파일도 지운다(IMAGE-1 삭제 규칙) · 대표 매치로 고른 칸이면 고르기가 풀린다. → Task 5 시험.
4. 종류 미정에서 붙여넣기가 전부 차단 판정이면 종류를 정하지 않는다. → Task 6 시험.
5. "그 외" 대회에서 이름 같고 덧붙임 다르면 중복 배지 없음 · 덧붙임 둘 다 비면 중복. → Task 4 시험.

---

### Task 1: 서버 — 묶음 읽기 · 세 지시문 · 모델 · 제안 함수
**Files:** Create `functions/src/core/aiBrief.ts`, `functions/src/core/aiSuggestBriefCore.ts`, `functions/src/aiSuggestBrief.ts`; Modify `core/extractContestantsCore.ts`, `core/aiFillCore.ts`, `core/translateContestantNamesCore.ts`, `extractContestants.ts`, `aiFillContestants.ts`, `translateContestantNames.ts`, `aiQuota.ts`, `index.ts`; Tests `functions/src/__tests__/*` + fixture `functions/src/__tests__/fixtures/lab-fix4-crews.json`.
**Interfaces (Produces):**
- `type EntryUnit = "individual" | "group" | "other"` (aiFillCore) · `parseEntryUnit` 이 `other` 를 받음.
- `interface AiBrief { entry: string; extra: string; rules: string }` · `AI_BRIEF_LIMITS = { entry: 40, extra: 40, rules: 300 }` · `parseAiBrief(v: unknown): AiBrief | null`(한도 넘음 → null) · `isAiBriefEmpty(b)` · `briefRuleLines(b, unit): string[]`(맨 위 규칙 줄).
- `buildBriefExtractPrompt(items, { brief, entryUnit, title, description })` — 새 함수. `extractContestantsCore` 입력에 `aiBrief?`, `tournamentTitle?`, `tournamentDescription?`.
- `buildBriefFillPrompt(opts)` — 새 함수(`BuildPromptOptions.aiBrief?`).
- `buildBriefNamesPrompt(entries, category, brief, unit)` — 새 함수. `other` 는 발음 대조를 건너뛴다(작품 공식 표기는 발음과 다를 수 있음).
- callable `aiSuggestBrief({title, category, description}) → {entryUnit, entry, extra, rules}` (Haiku · requireAdmin · 분당 5 · aiDailyLimit).
- `extractContestantsFromVideos` 모델 = `SONNET_MODEL` + `thinking: SONNET_THINKING`.
- [ ] 실패 시험: 묶음 빈 경우 세 지시문 sha256 = 지금 값 · 묶음 있으면 첫 규칙 줄에 세 줄 · 노래/배역/라면 시험 줄 · §7 48줄 응답 파싱 · 한도 초과 invalid-argument · 콜러블이 SONNET 으로 부름.
- [ ] 구현 → 통과 → 커밋.

### Task 2: 타입 · 초안 · 대회 문서 · 규칙
**Files:** `lib/types/tournament.ts`, Create `lib/lab/aiBrief.ts`(서버와 같은 한도 · 정규화), `lib/lab/tournamentDraft.ts`(DRAFT_FIELDS + `aiBrief` · 비었으면 칸 없음 · `other` 저장), `lib/lab/tournamentDoc.ts`(buildTournamentDoc 이 aiBrief 를 받음 · other 허용), `firestore.rules`(초안 aiBrief 맵 · entryUnit other), rules 시험.
- [ ] 왕복 시험(새 필드 · other · 옛 초안) → 구현 → 통과 → 커밋.

### Task 3: STEP 1 묶음 화면 + 제안 버튼
**Files:** Create `components/admin/lab/AiBriefPanel.tsx`; Modify `EntryUnitSelect.tsx`(세 번째 선택), `TournamentCreator.tsx`(상태 · 저장 · 호출 전달), `lib/i18n/messages.ts`(§5 15줄 한 덩어리 · `lab.embed.subtitle` 교체).
- 배치: 제목 · 캠페인 · 카테고리 · 설명 → **묶음**(제목 1 · 설명 2 · 엔트리 단위 · 세 줄 · [AI에게 제안 받기] · 키워드) → 마감.
- [ ] 문구 키 3언어 시험 · 금지 낱말 → 구현 → 커밋.

### Task 4: 둘째 칸 낱말 · 같은 이름 검사
- `ContestantEditor` affiliation placeholder = `brief.extra || t("lab.contestant.affiliation")`.
- `deriveReviewFlags(slots, opts?: { nameWithExtra?: boolean })` — true 면 이름+덧붙임 키가 같을 때만 중복.
- [ ] 시험 → 구현 → 커밋.

### Task 5: ✕ = 칸 통째로 · [모두 비우기]
- Create `lib/lab/slotClear.ts`: `clearSlot(drafts, index, size, empty) → { drafts, storagePaths }` · `clearAllSlots(drafts) → { drafts: [], storagePaths }`.
- ✕ 는 영상 · 그림 · 기억 주소까지 비움(풍선말 §5-11). [모두 비우기] = 도구 줄 · 확인 창(§5-13·14). 배지 · 못 찾음 표시도 지움. Storage 파일은 deleteEntryImageFiles.
- [ ] 순수 함수 시험 → 구현 → 커밋.

### Task 6: 생성 전 붙여넣기
- `kindTools(null)` → `pasteLinks: true`, `imageLinks: true`(이미지 주소 한꺼번에 넣기 — 같은 원칙). `imageSearch`(이미지만 찾기)는 이미지 대회만.
- 붙여넣기 결과로 1칸 이상 들어가면 `mediaKind` = video · 이미지 주소로 1칸 이상 들어가면 image.
- 추출 호출에 묶음 · 대회 제목 · 설명 전달(검수기 · 칸마다 [영상]).
- [ ] 시험 → 구현 → 커밋.

### Task 7: E2E(에뮬레이터) ①~⑤ + 워크플로 경로
- Create `e2e/emulator/lab-fix4-ai-brief.spec.ts`; image1-e2e.yml 이 e2e/emulator/** 를 이미 돈다.
- [ ] 로컬 `bash scripts/e2e-emulator.sh lab-fix4` 통과 → 커밋.

### Task 8: 마무리
- 전체 유닛(root · functions) · tsc · lint · check:hex · check:docs · build → PR(코드) · 원장 PR(D-94~D-98) · 병합 뒤 함수 3개 + 규칙 배포 · 실 AI 1회 · §8 사전 점검 표.
