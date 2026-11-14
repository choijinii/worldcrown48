# IMAGE-1 PR 2 이미지 검색 AI · 주소 여러 줄 · 이미지만 찾기 · 삭제 때 그림 폴더 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 이미지 대회 [이미지 생성]이 이름 48개를 채운 뒤 Brave 이미지 검색으로 칸마다 그림 1장을 우리 Storage 복사본으로 넣고, 주소 여러 줄 · 이미지만 찾기 · 새 이미지 찾기 도구를 더하며, 대회 [삭제]가 그림 폴더까지 지운다.

**Architecture:** 서버 = 순수 코어 `functions/src/core/imageSearchCore.ts`(검색어 · 응답 해석 · 후보 고르기 · 한도 판정 · 동시 3칸) + 얇은 콜러블 `autoSourceImages`(관리자 · 비밀 · Storage 저장은 `importEntryImage`와 공용 `saveDraftImage`). 화면 = 순수 층 `lib/lab/imageSourcing.ts`(대상 · 나눠 부르기 · 결과 얹기 · 주소 줄 나누기·배정) + `TournamentCreator` 배선 + 새 창 `ImageLinksModal`. 삭제 = `finalizeEntryImages`가 대회 그림 파일 메타데이터에 초안 폴더를 적고, `removeTournament`가 대회 폴더와 그 초안 폴더만 지운다(규칙 변경 없음).

**Tech Stack:** Firebase Functions v2 · node-canvas · Next.js 14 · vitest · Playwright 에뮬레이터

**Spec:** `outputs/prompts/PROMPT_ClaudeCode_IMAGE-1_PR2_v1.0_2026-11-14.md`

## Global Constraints
- 화면 문구 = 지시서 §2-D 14줄 글자 그대로. 그 밖의 새 문구 없음([취소]는 기존 `lab.source.confirm.cancel`).
- Brave: `safesearch=strict` · `count=20` · 결과 목록·제목·순위·썸네일 저장 금지 — 남기는 것은 `sourceUrl`(그림 주소) · `sourcePage`(페이지 주소)뿐. 로그는 칸 번호 · 개수만.
- `origin` 은 이미 `"search"`(lib/media/mediaSlot.ts) — `"google"` 없음.
- 402 · 429(월 한도 남음 0 또는 판정 불가) = limit 로 멈춤, 찾은 칸 보존. 실서비스 한도는 초당 50 · 월 상한 없음(크레딧 1,000번 = 무료 범위).
- 규칙(firestore.rules · storage.rules) 바뀌면 멈춤. 색은 토큰만.

## Review Focus
1. 칸 3개를 동시에 돌 때 두 칸이 같은 그림 주소를 고르지 않는다 — 시도 전에 예약.
2. 나눠 부르는 사이 limit 이 오면 뒤 묶음을 부르지 않고 앞 결과는 칸에 남는다.
3. 그림이 든 칸 · 손으로 넣은 칸은 [이미지만 찾기]·[새 이미지 찾기] 대상이 아니다.
4. 삭제 때 메타데이터의 초안 폴더가 `entry-images/drafts/{uid}/{draftId}/` 꼴이 아니면 지우지 않는다(남의 폴더 · 상위 폴더 보호).
5. 체인 도중 초안이 바뀌면(uploadStillCurrent) 결과를 버린다.

### Task 1: 서버 코어 + 콜러블
Files: Create `functions/src/core/imageSearchCore.ts`, `functions/src/autoSourceImages.ts`, `functions/src/core/entryImageStore.ts` · Modify `functions/src/importEntryImage.ts`, `functions/src/index.ts` · Test `functions/src/__tests__/imageSearchCore.test.ts`
- [ ] 유닛: buildImageQuery · parseBraveImages · pickImage(400 미만 · 그림 아님 · 10MB · 제외 주소 · 첫 통과) · braveStatus(402/429 → limit) · runImageSourcing(no-key · limit 보존 · 동시 3 · 결과 키 = 허용 키만) → 빨강 → 구현 → 초록

### Task 2: 삭제 때 그림 폴더
Files: Modify `functions/src/finalizeEntryImages.ts`, `functions/src/core/tournamentAdminStore.ts`, `functions/src/manageTournament.ts` · Test 기존 tournamentAdminStore 시험에 더함
- [ ] 유닛: imageDirsToDelete(tid, metadata draftDir) = 대회 폴더 + 올바른 초안 폴더만 → 빨강 → 구현 → 초록

### Task 3: 화면 순수 층 + 문구
Files: Create `lib/lab/imageSourcing.ts` · Modify `lib/i18n/messages.ts`, `lib/lab/manualMedia.ts` · Test `lib/__tests__/lab/imageSourcing.test.ts`, `lib/__tests__/i18n/image1Pr2Copy.test.ts`
- [ ] 유닛: 대상(이름 있음 · 그림 없음 · blanks=이번 칸) · 나눠 부르기 6칸 · limit 에서 멈춤 · 결과 얹기(origin search · 허용 키) · 주소 줄(빈 줄 무시 · 48 상한 · 그림 없는 칸부터) · 문구 14줄 3언어 그대로

### Task 4: 편집기 배선 + 창
Files: Modify `components/admin/lab/TournamentCreator.tsx`, `GeneratePanel.tsx`, `ContestantEditor.tsx` · Create `components/admin/lab/ImageLinksModal.tsx`, `lib/lab/imageSourceCalls.ts`
- [ ] 통합: 이미지 대회 도구 줄에 [이미지만 찾기]·[이미지 주소 한꺼번에 넣기] · 검색 그림 칸에만 [새 이미지 찾기] · 못 찾은 칸 이유 줄

### Task 5: 에뮬레이터 통합 · E2E
Files: Modify `scripts/e2e-emulator.sh`(BRAVE 가짜 주소·비밀) · Create `e2e/emulator/image1-pr2-search.spec.ts`
- [ ] 가짜 Brave(고정 포트) · [이미지 생성] → 칸 수 · 끝 알림 · 새 이미지 찾기 · 이미지만 찾기 · 주소 3줄 · no-key/limit 문구 · 발행 → 무대 · 삭제 → 폴더 0
