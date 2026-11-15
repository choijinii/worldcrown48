# IMAGE-1 PR 3 — 내리기 스위치 · 그림 확인 창 · 영상 대회 크라운 카드 썸네일 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 관리자가 엔트리 하나의 그림(이미지 대회) 또는 영상·썸네일(영상 대회)을 내리면 1분 안에 매치 무대 · 피치 VS 표지 · 차트 아바타 · 크라운 카드(화면 + 서버 PNG)에서 이니셜만 남게 하고, 편집기에 그림 확인 창을 두며, 새 영상 대회 크라운 카드에 유튜브 썸네일을 넣는다.

**Architecture:** 서버 콜러블 `takeDownEntry` 가 한 트랜잭션으로 ① 관리자 전용 기록 `entry_takedowns/{contestantId}` ② 엔트리 `media` 를 `{ type, takedown: { at } }` 로 바꿈(영상·그림 정보 제거) ③ 대회 문서 `mediaTakedownAt` 갱신(열린 화면이 다시 읽는 신호)을 쓰고, 이어서 Storage 두 장 삭제 · 차트 캐시 행 패치 · 카드 장수 세기를 한다. 카드 다시 굽기는 트리거 `onEntryTakedown` 이 기록 문서의 `rebake.cursor` 를 따라 한 쪽(50장)씩 진행한다. 모든 읽는 쪽은 `media.takedown` 을 보면 이니셜로 간다.

**Tech Stack:** Next.js 14 · TypeScript · Firebase(Firestore · Storage · Functions v2) · node-canvas · vitest · Playwright(에뮬레이터)

**Spec:** `outputs/prompts/PROMPT_ClaudeCode_IMAGE-1_PR3_v1.0_2026-11-16.md`

## Global Constraints
- 화면 문구는 지시서 2-D 표 글자 그대로(글자 하나 바꾸지 않음) · 표에 없는 문구 금지(기존 [취소] `lab.list.deleteCancel` · [닫기] `lab.embed.close` · [새 이미지 찾기] `lab.image.refresh` 재사용).
- `mediaKind` 없는 대회 = 영상 대회.
- 브라우저에서 엔트리 `media` · 내리기 기록을 바꾸는 길 없음(규칙).
- 매치 무대에 "ⓘ 내리기 요청" 글자 넣지 않음 · 무대 출처 글자는 그대로(링크 없음).
- 기존 크라운 카드 백필 없음 — 새 카드부터 영상 썸네일. 내린 엔트리 카드만 다시 굽기.
- 색은 토큰만(`check:hex`) · 정책 문서(content/*) 고치지 않음 · 되돌리기 · 대회 전체 내리기 없음.
- CI/에뮬레이터는 바깥 사이트를 부르지 않는다(유튜브 썸네일 = 가짜 서버 `YT_THUMB_BASE`, 에뮬레이터에서만 읽음).

## Review Focus
1. 같은 엔트리에 두 관리자 창이 동시에 [내리기] → 기록 1건 · 오류 없음(트랜잭션 · 두 번째는 `already`). → Task 2 통합 시험.
2. Storage 삭제가 중간에 실패 → 문서는 이미 이니셜, 다시 부르면 파일 삭제를 마저 함(반쪽 상태 없음). → Task 2.
3. 진행 중인 팬의 현재 매치에 내린 엔트리가 있음 → 판이 끊기지 않고 그 칸이 이니셜로 바뀜. → Task 5 · E2E ①.
4. 대표 매치 A 를 내림 → 표지는 다음 번호 엔트리로 대체(기존 D-35 규칙) · 그 그림은 안 보임. → Task 4 유닛 · E2E ①.
5. 유튜브 hq720 이 없음(404)·회색 자리 그림 → hqdefault 로, 그것도 실패하면 이니셜. → Task 3 유닛.

---

### Task 1: 순수 판정 — 내린 엔트리는 어디서나 이니셜
**Files:** Modify `lib/media/mediaSlot.ts`, `lib/media/stageCrop.ts`, `lib/thumbnail/cover.ts`, `functions/src/core/rankingAggregator.ts`, `lib/crown/championLoader.ts` · Test `lib/__tests__/media/takedown.test.ts`, `functions/src/__tests__/rankingAggregator.takedown.test.ts`
**Produces:** `ContestantMedia.takedown?: { at: number }` · `isTakenDown(media): boolean` (mediaSlot) · `crownPhotoSources(c: Contestant): { url: string; fallback?: string; focusY?: number } | null` (championLoader — 그림 → 1600 · 영상 → 유튜브 썸네일 [hq720|oar2, hqdefault] · 내림 → null)
- [ ] 실패 시험: takedown 있는 media 에 embed·image 가 남아 있어도 `contestantThumbnail` "" · `decideMediaRender` none · `resolveStageMedia`/`resolveStageImage` null · `coverEntry().entry.usable` false · `contestantMetaOf` videoId "" imageUrl 없음 · `toCrownData` photoUrl 없음. 영상 챔피언 → photoUrl hq720 + fallback hqdefault(세로는 oar2).
- [ ] 구현 → 통과 → 커밋.

### Task 2: 서버 내리기 — 판정 + 저장 + 콜러블
**Files:** Create `functions/src/core/entryTakedown.ts`(순수: `planTakedown`), `functions/src/core/entryTakedownStore.ts`(`takeDownEntry(db, deps, input)`), `functions/src/takeDownEntry.ts`(콜러블) · Modify `functions/src/index.ts`, `firestore.rules` · Test `functions/src/__tests__/entryTakedown.test.ts`, `tests/rules/entry-takedown.store.test.ts`
**Produces:** 콜러블 `takeDownEntry({ tournamentId, contestantId, reason })` → `{ cards: number, already: boolean }` · 거절 코드 `not_found` · `wrong_tournament` · `reason_required` (details.code) · 기록 문서 `entry_takedowns/{contestantId}` = `{ tournamentId, contestantId, name, mediaKind, at, reason, byUid, sourceUrl?, sourcePage?, storagePath?, videoId?, videoSourceUrl?, rebake: { total, done, cursor: null, finishedAt: null } }`
- [ ] 순서: 트랜잭션(기록 + 엔트리 media 교체 + 대회 `mediaTakedownAt`) → Storage 두 장(무시: 없음) → 차트 캐시 행 `videoId: null` · `imageUrl` 제거 → 카드 수(`championContestantId == c`) 를 기록 `rebake.total`. 이미 내림이면 트랜잭션 건너뛰고 Storage 삭제·캐시 패치만 다시(멱등), `already: true`.
- [ ] Storage 경로는 `entry-images/tournaments/{tournamentId}/` 아래일 때만 지운다.
- [ ] 규칙: contestants update 가 `media` 를 바꾸면 거절 · `entry_takedowns` 읽기 = `token.admin == true` · 쓰기 거절.
- [ ] 통합 시험(에뮬레이터): 관리자 아님 거절(콜러블 관문은 `requireAdmin` 유닛) · 두 장 삭제 · 다른 엔트리/대회 파일·문서 무변화 · 기록 필드 · 두 번 = 같은 결과 · Storage 실패 주입 → 기록·문서는 있고 재호출이 마저 지움 · 캐시 패치 · 카드 수. 규칙: 주인이 media/기록을 못 바꿈, 이름 3언어는 여전히 바꿈.

### Task 3: 크라운 카드 — 영상 썸네일 + 다시 굽기
**Files:** Modify `functions/src/core/onChampionConfirmedCore.ts`(`championPhoto` → `{ storagePath } | { urls } | null`), `functions/src/onChampionConfirmed.ts` · Create `functions/src/core/youtubeThumb.ts`(`fetchFirstThumb(urls, fetchFn) → Buffer | null` · 120px 이하 = 실패 · base = `YT_THUMB_BASE`(에뮬레이터에서만) 또는 `https://i.ytimg.com`), `functions/src/core/crownRebake.ts`(`rebakePage(db, deps, takedownId, pageSize=50)`), `functions/src/onEntryTakedown.ts`(onDocumentWritten — cursor 가 바뀌었거나 새 문서이고 finishedAt 없을 때 한 쪽) · Test `functions/src/__tests__/crownPhoto.test.ts`, 위 통합 시험에 다시 굽기
- [ ] 다시 굽기는 같은 Storage 경로에 덮어쓰고(cacheControl `public,max-age=60`) 카드 문서 `imageUrl` 끝 `&v=` 갱신 · `photoTakenDownAt` 표시.
- [ ] 화면 카드: `CrownCanvasPreview.loadCrownPhoto(url, fallback)` · `CrownStaticCard` img onError → fallback → 이니셜.

### Task 4: Lab 내리기 창
**Files:** Create `lib/lab/takedown.ts`(순수: `takedownCopy(kind)` 키 묶음 · `takedownRows(contestants, records)` · `isReasonValid`), `lib/lab/takeDownEntry.ts`(콜러블 배선), `components/admin/lab/TakedownDialog.tsx` · Modify `components/admin/lab/TournamentList.tsx`(버튼 [이름 언어] 옆), `lib/i18n/messages.ts` · Test `lib/__tests__/lab/takedown.test.ts`, `lib/__tests__/i18n/image1Pr3Copy.test.ts`
- [ ] 창: 엔트리 48줄(칸 순서) · 이름 · (그림 대회) 도메인 · [내리기] / 내린 줄 = 문구 15 · 내릴 것 없음 = 17 · 사유 칸(10 · 비우면 11) · 확인(12 · 13 · 취소) · 끝 토스트 14(n) · 실패 16.

### Task 5: 열린 화면도 1분 안에
**Files:** Create `lib/arena/useTakedownRefresh.ts` · Modify `lib/arena/voteStore.ts`(`patchMedia(map)`), `app/arena/[tournamentId]/page.tsx`, `app/arena/[tournamentId]/champion/page.tsx`, `components/thumbnail/useCoverPair.ts`(`revision` 인자) + 호출 4곳 · Test `lib/__tests__/arena/patchMedia.test.ts`
- [ ] 대회 문서를 구독해 `mediaTakedownAt` 이 바뀌면 엔트리를 다시 읽어 `media` 만 갈아 끼운다(대진 id·순서 그대로).

### Task 6: 그림 확인 창(편집기)
**Files:** Create `components/admin/lab/ImageCheckDialog.tsx`, `lib/lab/imageCheck.ts`(`imageCheckLinks(draft)` → `{ sourcePage?, sourceUrl? }` http(s)만) · Modify `components/admin/lab/ContestantEditor.tsx`(배지 · 도메인 글자 = 버튼, title 문구 5), `ContestantGrid.tsx`, `TournamentCreator.tsx` · Test `lib/__tests__/lab/imageCheck.test.ts`

### Task 7: 문서 · 원장 · 검사
**Files:** `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md`(D-91 · D-92 · D-93 · D-83 바뀜 두 줄), `CLAUDE.md`(v2.13 · #14), `LANGUAGE.md`(내리기), `scripts/check-docs.lib.mjs`(D-91~93 ↔ CLAUDE.md · 이용약관 5.4 세 언어 · policy@ · 24) + 시험

### Task 8: E2E(에뮬레이터) + 워크플로 + 사전 점검
**Files:** Create `e2e/emulator/image1-pr3-takedown.spec.ts` · Modify `e2e/emulator/helpers.ts`(영상 대회 시드 · 가짜 썸네일 서버 9312), `scripts/e2e-emulator.sh`(`YT_THUMB_BASE`), `.github/workflows/image1-e2e.yml`(새 spec 경로 먼저)
- [ ] ① 이미지 대회 내리기 → 무대(진행 중) · 표지 · 차트 · 카드 화면 · 서버 PNG 이니셜 · 초 측정 ② 영상 대회 ③ 그림 확인 창 ④ 영상 카드 썸네일/실패 이니셜 ⑤ 무대에 "내리기 요청" 없음.
