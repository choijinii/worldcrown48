# IMAGE-1 PR 1 — 바탕(데이터 · 저장소 · 표시 5곳 · 파일 48장 · 칸마다) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development 또는 superpowers:executing-plans (대표가 고른 방식). Steps use checkbox (`- [ ]`) syntax.

**Goal:** 엔트리 칸에 그림을 넣을 수 있게 한다(파일 48장 · 칸마다 파일/URL). 그림은 늘 우리 Storage 복사본이고, 그리드 · 매치 무대 · VS 표지 · 차트 아바타 · 크라운 카드 다섯 곳에 보인다.

**Architecture:** 초안 칸이 Storage `entry-images/drafts/{uid}/{draftId}/` 의 복사본 주소를 들고 있다가, 발행 때 서버 함수가 `entry-images/tournaments/{id}/` 로 복사한다. 그 결과는 엔트리 문서 `media.image` 에 실린다. 보여 줄 때 우선순위는 **영상 > 그림 > 이니셜** 하나다. 각 표시 자리는 순수 함수가 정하고, 부품은 그 결과를 그리기만 한다.

**Tech Stack:** Next.js 14 · TypeScript 5.5 · Firebase(Firestore · Storage · Functions v2 · Node 22) · node-canvas 3(서버 줄이기 · 카드) · vitest · Playwright · Firebase 에뮬레이터

**Spec:** 코티오 지시서 `IMAGE-1 PR 1 v1.0`(2026-11-06 · 대표 채팅으로 받음) + 원장 D-77 · D-83 · D-76 · D-21

## 0. 대표 결정 (2026-11-08 채팅)
1. **E2E = 에뮬레이터 판을 새로 만든다.** functions · firestore · storage · auth 에뮬레이터 위에 `next start` 를 띄우고 Playwright로 돌린다(§11.3 그대로).
2. **크라운 카드 = 공유 카드와 다운로드 카드 둘 다** 그림을 넣는다. 공유 카드는 서버 1.91:1 `drawLink`, 다운로드 카드는 브라우저 9:16 · 4:5 `drawPortrait` 다. 브라우저 다운로드에는 버킷 CORS 설정이 필요하다 — 대표가 명령 한 줄로 한다.
3. **문구가 필요 없는 부분부터 먼저 한다.** 편집기 화면(2-C)의 문구가 들어가는 묶음은 6절 승인표가 채워진 뒤에만 커밋한다.

## 1. 지시서와 코드가 다른 곳 → 이 계획의 판단(PR 설명 첫 머리에 그대로 옮긴다)
| # | 지시서 | 실제 코드 | 이 계획 |
|---|---|---|---|
| a | `sharp` 로 줄이기 | 함수에 `sharp` 없음 · `canvas` 3 있음 | **`canvas` 로 줄인다**(새 의존성 0) — Claude Code 판단 |
| b | `drawPortrait` 서버 사본을 `onChampionConfirmed` 가 쓴다 | 서버는 `drawLink`(1.91:1)만 쓴다. 두 사본은 `copy-crown.mjs` 미러(정본 `lib/crown`) | 정본 한 곳만 고친다. 사진은 `drawLink` · `drawPortrait` 둘 다(결정 2) |
| c | `contestantThumbnail` 을 고치면 그리드 · 차트 · 매치 카드가 따라온다 | 호출부 0곳. 차트 아바타는 차트 캐시의 `videoId`(서버 `scheduleRankingCache`), 편집기는 `buildThumbnailUrl` 을 직접 부른다 | 함수는 고치고 **호출부를 하나씩 바꾼다**. 차트 캐시에 `imageUrl` 을 더한다 → `scheduleRankingCache` 도 배포 목록에 넣는다. 차트에는 다음 갱신(09:00/21:00) 때부터 보인다 |
| d | `resolveStageMedia` 가 `{kind:"image"}` 를 돌려준다 | 돌려주는 값 `StageMedia` 는 영상 전용이고 무대 재생기가 그대로 쓴다 | 영상 함수는 그대로 두고 `resolveStageImage` 를 새로 만든다(옛 호출부를 건드리지 않기 위해) |
| e | 지금 E2E | Vercel 미리보기 + 실제 Firebase · `lib/firebase.ts` 에 에뮬레이터 연결이 없다 | 연결은 `NEXT_PUBLIC_USE_EMULATORS=1` 일 때만 켠다(실서비스 번들에서는 꺼진 분기) |
| f | 함수 배포 목록 3개 | — | `importEntryImage` · `finalizeEntryImages` · `onChampionConfirmed` · **`scheduleRankingCache`** |

## Global Constraints
- 수치: 긴 변 **1600** · 사본 **600** · 상한 **10MB** · 세로 하한 **400px**(④ URL만 서버 판정) · 내려받기 **10초** · 칸 **48** · 진행 표시 **"n / 48"** · 무대 그림 칸 = D-76 16:9.
- 바깥 주소를 `<img src>` 에 그대로 쓰는 코드 0줄. 화면에 나가는 그림 주소는 전부 `https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodeURIComponent(path)}?alt=media`(토큰 없음).
- 우선순위 = 영상(유효 · `gone` 아님) > 그림 > 이니셜.
- 색은 `var(--color-…)` 토큰만(`npm run check:hex`). Tailwind · framer-motion 없음.
- 금지 낱말: 표 · 투표 · Vote(화면) · 참가자 · 48명 · 사람 · 월드컵 · FIFA · 전투 은유 · "팀 경로".
- 화면 문구는 6절 승인 뒤에만 사전 키로 넣는다. 승인 전 문구 커밋 금지.
- Firestore 문서에 `undefined` 를 싣지 않는다(있을 때만 펼친다 — 기존 관례).
- 새 칸은 전부 선택 칸. 옛 초안 · 옛 엔트리 문서를 마이그레이션 없이 그대로 읽는다.

## Review Focus
1. **영상과 그림이 둘 다 있는 칸** — 무대 · 표지 · 차트 · 카드 모두 영상이 먼저여야 한다. 단, 카드는 영상 썸네일이 PR 3 범위라 그림이 있으면 그림을 쓴다. → Task 2 · 9 시험에 "둘 다" 경우를 넣는다.
2. **`gone: true` 영상 + 그림** — 영상이 내려가면 그림으로 물러나야 하고 이니셜로 가면 안 된다. → Task 2 시험.
3. **같은 칸에 그림을 다시 넣기** — 파일 이름이 `{slot}.jpg` 로 같아 덮어쓴다. 그런데 브라우저가 옛 그림을 캐시에 들고 있을 수 있다. → 주소 끝에 `&v={addedAt}` 를 붙이고 Task 5 시험으로 확인한다.
4. **칸 순서 바꾸기 · 칸 지우기 뒤 발행** — 파일 이름은 칸 번호지만 초안 칸에는 `imageStoragePath` 가 있다. finalize 는 칸 번호가 아니라 **칸이 들고 있는 경로**로 복사한다. → Task 6 시험(경로가 다른 칸 번호를 가리켜도 맞게 복사).
5. **발행 실패 뒤 다시 발행** — tournaments 경로의 복사본이 남는다. 다시 발행하면 새 Tournament id 로 다시 복사되고, 초안 파일은 그대로 남아 있어야 한다(삭제는 배치 성공 뒤에만). → Task 6 시험.

---

### Task 1: 데이터 모양 (2-A)
**Files:** Modify `lib/media/mediaSlot.ts` · `lib/lab/tournamentDoc.ts` · `lib/lab/tournamentDraft.ts` · `tests/rules/tournament-drafts.rules.test.ts` · Test `lib/__tests__/lab/tournamentDoc.image.test.ts` · `lib/__tests__/lab/tournamentDraft.image.test.ts`

**Interfaces — Produces:**
```ts
// lib/media/mediaSlot.ts
export type EntryImageOrigin = "upload" | "url" | "search"; // search = PR 2 예약
export interface EntryImage { url: string; thumbUrl: string; storagePath: string; sourceUrl?: string; sourcePage?: string; origin: EntryImageOrigin; width: number; height: number; addedAt: number; focusY?: number; /* 0~100 · 기본 40 — Task 2 판단 */ }
export interface ContestantMedia { type: MediaKind; embed?: EmbedMedia; image?: EntryImage; }
// lib/lab/tournamentDoc.ts — ContestantDraft 에 더한다
imageUrl?: string; imageThumbUrl?: string; imageStoragePath?: string;
imageSource?: { origin: EntryImageOrigin; sourceUrl?: string; sourcePage?: string };
imageWidth?: number; imageHeight?: number; imageAddedAt?: number; imageFocusY?: number;   // EntryImage 를 채우는 데 필요(지시서 4칸 + 4칸 — 판단)
videoTitle?: string; videoChannel?: string;
```
- [ ] RED: `buildContestantDocs` — 그림만 있는 칸 → `media: {type:"image", image:{…origin:"upload"}}` · 영상+그림 → `type:"embed"` 에 `embed` 와 `image` 둘 다 · 둘 다 없음 → `media` 없음 · `sourceUrl`/`sourcePage` 가 없으면 키 자체가 없음.
- [ ] RED: `fromDraftDoc` 가 새 칸 9개를 그대로 읽는다. 타입이 틀린 값(숫자 자리에 문자열 등)은 버린다. 옛 초안(칸 없음)은 `undefined`.
- [ ] RED(규칙): 새 칸이 들어 있는 contestants 로 초안 create/update 가 통과한다(`isValidDraft` 는 고치지 않는다 — 칸 목록 안을 훑지 않는다는 것을 시험으로 박는다).
- [ ] GREEN: `mediaOf` 확장 · `toContestant` 확장 · `contestantTouched` 에 `imageUrl` 을 더한다(그림만 넣은 칸도 "입력함").
- [ ] `npm run test:unit -- lib/__tests__/lab` 초록 · `npm run test:rules -- tests/rules/tournament-drafts.rules.test.ts` 초록 → 커밋

### Task 2: 표시 순수 함수 (2-D 14 · 15 · 16 · 차트)
**Files:** Modify `lib/media/mediaSlot.ts` · `lib/media/stageCrop.ts` · `lib/thumbnail/cover.ts` · `lib/ranking/rankingTypes.ts` · `lib/ranking/computeRankings.ts` · `lib/ranking/crownRankings.ts` · 차트 캐시가 엔트리 문서를 읽는 `contestantMetaOf`(위치: `lib/ranking/`) · Create `lib/media/storageUrl.ts` · Tests 각 모듈 `__tests__`

**Interfaces — Produces:**
```ts
// lib/media/storageUrl.ts
export function publicStorageUrl(bucket: string, path: string, version?: number): string; // ?alt=media(&v=)
export function sourceHost(sourcePage: string | undefined): string; // "www." 뗀 호스트 · 틀린 주소 → ""
// lib/media/mediaSlot.ts
contestantThumbnail(media): string            // 영상 썸네일 > image.thumbUrl > image.url > ""
decideMediaRender(media, imageUrl)            // 영상 없고 image 있으면 {render:"image", imageUrl: image.url}
// lib/media/stageCrop.ts
export interface StageImage { url: string; focusY: number; sourceHost: string } // upload → sourceHost ""
export function resolveStageImage(media): StageImage | null // 유효 영상이 있으면 null(영상 우선)
// lib/thumbnail/cover.ts
CoverContestant.media.image?: { thumbUrl?: string; url?: string }
CoverSide += imageUrl?: string               // 그림 칸은 videoId "" + imageUrl
// lib/ranking/rankingTypes.ts
RankingEntry.imageUrl?: string | null        // 옛 캐시엔 없음 = null
```
- [ ] RED: 위 각 함수의 영상>그림>빈 문자열 · 둘 다 · `gone` 영상+그림 → 그림 · `image` 가 빈 옛 `type:"image"` 문서 → none · `resolveStageImage` 의 focusY = `image.focusY`(없으면 40 · 0~100 으로 자름). **판단:** 그림의 focusY 는 영상 칸(`embed.focusY`)을 빌리지 않고 `EntryImage.focusY` 에 따로 둔다 — 빌리면 영상을 갈 때 그림 자르기 값이 같이 사라진다.
- [ ] RED: `coverEntry` — 그림만 있는 칸 `usable: true` · 그림 칸이 `broken` 에 들어 있으면 false.
- [ ] RED: 차트 합산 — 엔트리 메타에 그림만 있으면 `imageUrl` 이 `thumbUrl`, 영상이 있으면 `imageUrl` null(아바타는 영상 우선).
- [ ] GREEN → functions 미러(`copy-ranking.mjs`)가 새 칸을 싣는지 `npm --prefix functions test` 로 확인 → 커밋

### Task 3: Storage 규칙 (2-B 4)
**Files:** Modify `storage.rules` · `tests/rules/storage-rules.test.ts`
- [ ] RED: drafts 경로 — 자기 uid(구글 로그인) jpg 쓰기 허용 · 남의 uid 거부 · 익명 거부 · 11MB 거부 · `text/plain` 거부 · 자기 파일 삭제 허용 · 남의 파일 삭제 거부 · 비로그인 읽기 허용. tournaments 경로 — 아무나 쓰기 거부 · 비로그인 읽기 허용. 기존 crown-cards · 기본 거부 시험은 그대로.
- [ ] GREEN: `request.auth.token.firebase.sign_in_provider != 'anonymous'` · `request.resource.size <= 10 * 1024 * 1024` · `request.resource.contentType.matches('image/.*')`. 삭제에는 `request.resource` 가 없다 — 삭제 조건은 uid 만 본다.
- [ ] `npm run test:rules` 초록 → 커밋

### Task 4: 서버 — 그림 줄이기 · importEntryImage (2-B 5)
**Files:** Create `functions/src/core/entryImageCore.ts` · `functions/src/importEntryImage.ts` · Modify `functions/src/index.ts` · Test `functions/src/__tests__/entryImageCore.test.ts`

**Interfaces — Produces:**
```ts
export type ImportFailure = "fetch-failed" | "not-image" | "too-large" | "too-small";
export const ENTRY_IMAGE = { LONG_EDGE: 1600, THUMB_EDGE: 600, MAX_BYTES: 10 * 1024 * 1024, MIN_HEIGHT: 400, FETCH_TIMEOUT_MS: 10_000 } as const;
export function fitLongEdge(w: number, h: number, max: number): { w: number; h: number } // 작으면 키우지 않음
export async function fetchImageBytes(url: string, fetchImpl?: typeof fetch): Promise<Buffer> // 실패 → ImportError(code)
export async function resizeToJpegs(buf: Buffer): Promise<{ full: Buffer; thumb: Buffer; width: number; height: number }>
export class ImportError extends Error { code: ImportFailure }
// 콜러블: importEntryImage({draftId, slot, url}) → {url, thumbUrl, storagePath, width, height, sourceUrl, sourcePage}
```
- [ ] RED: `fitLongEdge(3200,1800,1600)` → 1600×900 · `(900,1600,1600)` 그대로 · `(800,450,1600)` 그대로.
- [ ] RED(로컬 http 서버 `node:http` · 시험 안에서 띄움): jpg 응답 → 바이트 · `text/html` → `not-image` · `Content-Length` 11MB → `too-large`(본문을 끝까지 받지 않는다) · 길이 헤더 없이 10MB 넘게 흘려보냄 → `too-large` · 11초 지연 → `fetch-failed`(타이머는 주입한 값으로 짧게) · 404 → `fetch-failed` · `http://` 가 아닌 `file:`/`data:` → `fetch-failed`.
- [ ] RED: `resizeToJpegs` — canvas 로 만든 2000×1000 png → full 1600×800 jpg · thumb 600×300 · 세로 399px → `too-small`.
- [ ] RED: 콜러블 입력 검사 — `slot` 0~47 정수 · `draftId` `^[A-Za-z0-9]{1,64}$` · 관리자 아님 → `permission-denied`(`requireAdmin` 재사용 · `ADMIN_UID` 는 기존 콜러블과 같은 방식으로 읽는다).
- [ ] GREEN: 저장 경로 `entry-images/drafts/{uid}/{draftId}/{slot}.jpg` · `{slot}_600.jpg` · `contentType: image/jpeg` · `cacheControl: public,max-age=31536000`(주소에 `&v=` 가 있어 안전). `sourcePage` = 입력 URL(④는 그림 주소 = 출처 페이지). → 커밋

### Task 5: 서버 — finalizeEntryImages (2-B 6)
**Files:** Create `functions/src/finalizeEntryImages.ts` (+ 순수 계획 함수는 `entryImageCore.ts`) · Test 같은 시험 파일
```ts
export function planFinalize(uid: string, draftId: string, tournamentId: string, slots: { slot: number; storagePath: string }[]):
  { from: string; to: string; fromThumb: string; toThumb: string; slot: number }[]
// 다른 사람 경로(entry-images/drafts/{다른uid}/…)나 다른 초안 경로 → 오류(남의 그림을 복사해 가지 못하게)
// 콜러블 finalizeEntryImages({draftId, tournamentId, slots}) → {images: Record<slot, {url, thumbUrl, storagePath}>}
// 콜러블 같은 함수 {draftId, cleanup: true} → drafts/{uid}/{draftId}/ 아래 파일 전부 삭제
```
- [ ] RED: `planFinalize` 의 경로 짝 · 남의 경로 거부 · 칸 번호와 파일 이름이 달라도(칸 옮김) 칸이 든 경로로 짝을 짓는다 · 결과 `to` 이름은 **새 칸 번호** `{slot}.jpg`.
- [ ] GREEN: admin SDK `file.copy()` · 주소는 `publicStorageUrl`(functions 미러 — `copy-embed.mjs` 처럼 `lib/media/storageUrl.ts` 를 미러에 더한다).
- [ ] 통합 시험은 Task 11 에뮬레이터 E2E 가 맡는다 → 커밋

### Task 6: 발행 흐름 (2-A 3 · 2-B 6)
**Files:** Modify `lib/lab/publishBatch.ts` · `components/admin/lab/PublishButton.tsx` 또는 실제 발행을 부르는 자리(`TournamentCreator.tsx`) · Create `lib/lab/publishImages.ts` · Test `lib/__tests__/lab/publishImages.test.ts`
```ts
// publishBatch: tournamentId 를 밖에서 받을 수 있게(선택 인자 tournamentRef) — 없으면 지금처럼 새로 만든다
export async function publishWithImages(deps: { newTournamentId(): string; finalize(args): Promise<Record<number, {url,thumbUrl,storagePath}>>; commit(tournamentId, drafts: ContestantDraft[]): Promise<void>; cleanup(draftId): Promise<void> }, draftId: string | null, drafts: ContestantDraft[]): Promise<string>
```
- [ ] RED: 그림 칸 없음 → finalize 를 부르지 않는다 · 그림 칸 있음 → finalize 결과로 칸의 `imageUrl`/`imageThumbUrl`/`imageStoragePath` 를 갈아 끼운 뒤 commit · commit 실패 → cleanup 을 부르지 않고 오류를 다시 던진다 · cleanup 실패 → 발행은 성공으로 본다(로그만).
- [ ] GREEN → 커밋

### Task 7: 매치 무대 정지 그림 (2-D 15) + 영상 조정 창의 그림 모드
**Files:** Modify `components/arena/StageSide.tsx` · `components/arena/stage.module.css` · `components/admin/lab/SlotVideoTuner.tsx` · `next.config.mjs`(remotePatterns `firebasestorage.googleapis.com`)
- [ ] `resolveStageMedia` 가 null 이고 `resolveStageImage` 가 있으면 → 16:9 상자에 `<img>`(object-fit cover · `object-position: 50% {focusY}%`) · 재생 버튼 · 원본 열기 칩 없음 · 이름 버튼 옆에 `sourceHost` 글자(링크 아님). 출처 앞말 문구는 6절 ⓕ — 승인 전에는 **호스트 글자만** 넣는다.
- [ ] 조정 창: 칸에 영상이 없고 그림만 있으면 재생 미리보기 대신 정지 그림을 보이고, focusY 막대는 `imageFocusY` 를 바꾼다.
- [ ] 확인: Task 11 E2E ③ · `npm run check:hex` → 커밋

### Task 8: VS 표지 · 차트 아바타 · 편집기 칸 미리보기 호출부
**Files:** Modify `components/thumbnail/VSThumb*`(그림 칸 = `imageUrl` 로 그림) · `components/thumbnail/useCoverPair.ts`(그림 칸 확인도 `probePoster([imageUrl])`) · `components/ranking/RankList.tsx` · `components/admin/lab/ContestantEditor.tsx`(미리보기 = `contestantThumbnail` 와 같은 우선순위 · 그림은 600 사본)
- [ ] 각 부품은 Task 2 결과만 그린다. 스냅샷 대신 기존 부품 시험 관례를 따른다(없으면 E2E ④ 가 맡는다) → 커밋

### Task 9: 크라운 카드 사진 (2-D 17 · 결정 2)
**Files:** Modify `lib/crown/canvas/primitives.ts`(`Canvas2D` 에 `drawImage` · `CrownPhoto` 타입 · `drawPhotoCover`) · `lib/crown/canvas/drawLink.ts` · `lib/crown/canvas/drawPortrait.ts` · `lib/crown/formats.ts`(`CrownData.photoUrl?: string`) · `lib/crown/championLoader.ts` · `components/crown/CrownCanvasPreview.tsx` · `functions/src/core/canvasServer.ts` · `functions/src/onChampionConfirmed.ts` · Create `storage.cors.json`
```ts
export type CrownPhoto = { width: number; height: number } | null; // 캔버스에 그릴 수 있는 그림(브라우저 HTMLImageElement · node-canvas Image)
export function drawPhotoCover(ctx, photo, x, y, w, h, focusY): boolean // 못 그리면 false → 호출부가 이니셜
drawLink(ctx, W, H, d, img, photo?: CrownPhoto) · drawPortrait(…, photo?)
export async function renderCrownPng(data, photo?: Buffer): Promise<Buffer> // 서버 — Storage 에서 storagePath 로 직접 받는다(HTTP 아님)
```
- [ ] RED: 가짜 ctx 기록기로 — 사진 있음 → `drawImage` 1회 · 이니셜 `fillText` 없음 · 사진 null/폭 0 → 이니셜 · cover 자르기 좌표(가로 그림을 정사각 칸에 → 양옆을 자름 · focusY 반영).
- [ ] RED: `onChampionConfirmed` — 챔피언이 그림 엔트리면 `media.image.storagePath` 를 내려받아 넘긴다. 내려받기 실패 → 사진 없이 굽는다(렌더 실패로 세지 않는다). 영상 엔트리 → 사진 없음(PR 3).
- [ ] GREEN: 브라우저는 `img.crossOrigin = "anonymous"` 로 불러온다. 실패하면 사진 없이 그린다(다운로드가 깨지지 않게).
- [ ] `storage.cors.json` = `[{"origin":["https://worldcrown48.com","https://*.vercel.app","http://localhost:3000"],"method":["GET"],"maxAgeSeconds":3600}]` — 대표 명령은 PR 설명에 적는다 → 커밋

### Task 10: 이름↔영상 불일치 판정 (2-C 12의 순수 부분 · 문구 없음)
**Files:** Create `lib/lab/nameVideoMismatch.ts` · Test `lib/__tests__/lab/nameVideoMismatch.test.ts`
```ts
export function nameVideoMismatch(entry: { name: string; nameEn?: string; affiliation?: string }, video: { title?: string; channel?: string } | null): boolean
// 영상 없음 → false(판정 안 함) · 제목·채널이 둘 다 비었음 → false(재료 없음 — 판단) · 이름(한글)·영어 이름·소속 중 하나라도 제목+채널에 들어 있으면 false · 대소문자·공백 무시
export function publishConfirmReady(checks: readonly boolean[]): boolean // 3개 다 true
```
- [ ] RED → GREEN → 커밋

### Task 11: 에뮬레이터 E2E 판 (결정 1)
**Files:** Modify `lib/firebase.ts`(`NEXT_PUBLIC_USE_EMULATORS === "1"` 일 때만 `connectAuthEmulator`/`connectFirestoreEmulator`/`connectStorageEmulator`/`connectFunctionsEmulator`) · `firebase.json`(emulators 에 auth 9099 · functions 5001) · Create `playwright.emulator.config.ts` · `e2e/emulator/global-setup.ts`(auth 에뮬레이터 커스텀 토큰 로그인 · 관리자 uid) · `e2e/emulator/fakeImageServer.ts` · `scripts/make-entry-fixtures.mjs` → `e2e/fixtures/entry-images/01.jpg…48.jpg`(1600×900 단색+번호 · canvas 로 생성) · `.github/workflows/image1-e2e.yml`(Java 21 · `firebase emulators:exec --only auth,firestore,storage,functions "next build && next start & playwright"`)
- [ ] 판이 서는지 먼저: 빈 spec 하나(편집기 열림 · 콘솔 에러 0)가 로컬 · CI 둘 다 초록 → 커밋
- [ ] 함수 에뮬레이터용 `ADMIN_UID` 는 `functions/.env.local`(git 무시)이 아니라 워크플로 env 로 준다.

### Task 12: 편집기 화면 (2-C 8 · 9 · 10 · 11 · 12) — **6절 승인 뒤**
**Files:** Create `lib/lab/entryImages.ts`(순수) · `lib/lab/uploadEntryImage.ts`(브라우저) · `components/admin/lab/EntryImageDrop.tsx` · `PublishConfirmDialog.tsx` · `MakingManualDialog.tsx` · Modify `ContestantGrid.tsx` · `ContestantEditor.tsx` · `TournamentCreator.tsx` · `lib/i18n` 사전
```ts
// lib/lab/entryImages.ts (순수 — 승인 전에도 만들어 둘 수 있다)
export function naturalSortFiles<T extends { name: string }>(files: T[]): T[]       // "2.jpg" < "10.jpg"
export function nameCandidate(fileName: string): string                             // "13_뉴진스.jpg"→"뉴진스" · "001.png"→""
export function assignToEmptySlots(slotsFilled: boolean[], count: number): number[] // 빈 칸 번호, 48 초과 버림
```
- [ ] RED/GREEN 순수 함수(승인 전 가능) → 커밋
- [ ] 승인 뒤: 끌어놓기 · [이미지 파일 넣기] · 진행 "n / 48" · 칸 칩 [파일]·[URL] · 미리보기 · "그림" 배지 · [그림 지우기] · 영상 제목·채널 한 줄 · 불일치 배지(새 것이 앞) · [만들기 매뉴얼] · 확인창(체크 3 · 불일치 칸 번호 → 이동). 영상 검수 · 소싱 결과의 제목·채널을 `videoTitle`/`videoChannel` 로 저장한다(받는 자리: 검수기 결과 · `autoSourceVideos` 결과 — 실제 칸 이름은 구현 때 확인).
- [ ] 문구 grep — 승인표와 글자까지 같음 → 커밋

### Task 13: E2E 네 경로 (§11.2)
**Files:** Create `e2e/emulator/image1-editor.spec.ts` · `image1-publish-stage.spec.ts` · `image1-cover-chart-card.spec.ts`
- [ ] ① 48장 `setInputFiles` → "48 / 48" → 자동 저장 → 새로고침 뒤 남음 ② [URL] → 가짜 서버 → 미리보기+출처 글자 · 실패 주소 → 이유 문구 ③ 확인창(체크 전 꺼짐 · 칸 번호 이동) → 발행 → 무대 정지 그림 · 재생 버튼 없음 · 출처 글자 · 1440 · 390 ④ 피치 VS 표지 · 차트 아바타(차트 캐시는 시험이 직접 함수 로직을 불러 만든다) · 그림 엔트리 우승 뒤 카드 사진. 금지 낱말 0 · `expect(consoleErrors).toHaveLength(0)`.
- [ ] 영상 · trace 를 내려받을 수 있게 올린다 → 커밋

### Task 14: 완료 전 검증 · PR
- [ ] superpowers:verification-before-completion — §10 체크리스트를 실제로 돌린 결과를 붙인다.
- [ ] PR 설명: 1절 표 · 질문 · "D-77 보충" · 남는 복사본(배치 실패 시 tournaments 경로 — 청소는 PR 3) · 배포 순서(규칙 storage → 함수 4개) · 대표 명령(CORS).
