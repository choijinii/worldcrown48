# LAB-FIX-3 엔트리 칸 버튼 정리 · 초안 목록 펼침 수리 — 작업 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (이 세션에서 코티오가 직접). 단계는 `- [ ]` 체크.

**목표:** 편집기 48칸의 손 넣기를 [영상]·[이미지] 켜고 끄는 버튼 + 주소 기억으로 바꾸고(원장 D-89), 🔎·수동 칸 [영상 찾기]·[그림 지우기]를 없애며, [초안 목록] 펼침이 창 밖으로 나가지 않게 고친다.

**설계:** 판정·병합은 순수 함수 `lib/lab/manualMedia.ts` 에 모은다(칸 모드 · 보이는 버튼 · 주소 해석 · 영상 넣기 순서 · 넣기/빼기 병합). 화면(`ContestantEditor`)은 상태와 배선만, 상위(`TournamentCreator`)는 콜러블을 주입한다. 주소 기억은 초안 칸 필드 3개(`manualVideo` · `manualVideoUrl` · `manualImageUrl`)로 저장하고 발행 문서에는 싣지 않는다.

**기술:** Next.js 14 · TypeScript · vitest(유닛·통합) · Playwright 에뮬레이터 판(`scripts/e2e-emulator.sh`).

**정본:** `outputs/prompts/PROMPT_ClaudeCode_LAB-FIX-3_v1.0_2026-11-13.md`(커밋 안 함) · 원장 D-77 · D-87 · D-88.

## 지켜야 할 것 (지시서 그대로)
- 화면 문구는 승인표 v3 7줄만. 표 밖 문구가 필요하면 멈추고 보고.
- 색은 기존 토큰만(`npm run check:hex`). 칸 크기·색·글자 크기 변경 ×. 자동 칸 동작·검수기 동작 변경 ×. 다른 사이트 영상 ×. 펼친 목록에 [지우기] ×.
- 이름이 있는 칸의 이름은 건드리지 않는다(D-88). 이름 빈 칸만 `keep()` 규칙으로 이름·소속·국가를 채운다.

## 코티오가 정한 것(대표 확인용)
1. **수동 칸 판정** = `!videoId || manualVideo === true`. 그림만 있는 칸(파일 48장 · 이미지 검색 AI · 칸마다 어느 길이든)은 수동 칸 → 켜진 [이미지]로 뺄 수 있다(§5-5).
2. ~~수동 칸에서는 [영상]·[이미지]가 각자 켜고 꺼진다(영상과 그림을 함께 둘 수 있다)~~ — **불합격(대표 2026-11-13 16:04): 대표가 정한 적 없는 내용.** 추가분(D-90)이 대회 종류로 대신한다. [새 영상 찾기]는 자동 칸에서만.
3. 자동 길([동영상 생성]·검수기·[새 영상 찾기])로 영상이 들어오면 `manualVideo` 표시를 지운다 → 그 칸은 자동 칸이 된다. 기억한 주소는 남긴다.
4. 주소 해석 실패: 유튜브가 아님 · 링크 아님 → 승인 문구 3번. 유튜브인데 영상 id 없음 → 검수기 기존 문구(`lab.embed.reason.noVideoId`).
5. 검사·추출 콜러블 오류는 검수기와 같은 토스트 문구(`inspectErrorMessage`). 추출만 실패하면 영상은 넣고 이름은 비워 둔다(검수기와 같음).
6. 빈 칸 크라운 로고는 미리보기 칸 안 가운데 `<img>` 40% 폭(장식 · alt 빈 글자).

## 검토 초점
- 같은 칸에서 [영상] 넣는 중 다시 누르기 → 두 번 넣기 금지(바쁨 동안 버튼 끔).
- 켜진 [이미지]를 올리는 중(busy)에 누르기 → 끔(리뷰 M-4 와 같은 이유).
- 다른 칸 주소 줄이 열려 있을 때 — "한 번에 하나"는 칸 안 기준(칸마다 상태). 칸 하나 안에서 [영상]↔[이미지] 줄은 하나만.
- 차단 판정 영상 → 칸 변화 0 + 사유 문구.
- 옛 초안(새 필드 없음) 불러오기 → 기본값, 오류 없음.

---

### Task 1: 순수 층 `lib/lab/manualMedia.ts` + 초안 저장 필드

**Files:** Create `lib/lab/manualMedia.ts` · Modify `lib/lab/tournamentDoc.ts`(ContestantDraft 에 필드 3개) · `lib/lab/tournamentDraft.ts`(toContestant) · `lib/lab/videoDraft.ts`(clearVideo 가 manualVideo 도 지움) · `lib/lab/sourcingDraft.ts`(applySourcingResults 가 manualVideo 지움) · Test `lib/__tests__/lab/manualMedia.test.ts` · `lib/__tests__/lab/tournamentDraft.test.ts`(추가)

**Interfaces (Produces):**
- `ContestantDraft.manualVideo?: boolean` · `manualVideoUrl?: string` · `manualImageUrl?: string`
- `slotMode(c: ContestantDraft): "auto" | "manual"`
- `slotButtons(c: ContestantDraft): { manual: boolean; video: "on" | "off" | null; image: "on" | "off" | null; imageFile: boolean; refresh: boolean }` — auto: `{manual:false, video:null, image:null, imageFile:false, refresh:true}`; manual: video = videoId?"on":"off", image = imageUrl?"on":"off", imageFile true, refresh false.
- `parseManualVideoUrl(raw: string): { ok: true; videoId: string; startSec: number | null } | { ok: false; reason: "only-youtube" | "no-video-id" | "blank" }`
- `addManualVideo(drafts, index, verdict: LinkVerdict, startSec: number|null, url: string, extraction: ExtractedContestant | null, total, emptyDraft): ContestantDraft[]` — `applyVideoAssignments`(그 칸 하나) → 이름 빈 칸이면 `applyExtractions` → `manualVideo:true, manualVideoUrl:url`.
- `removeManualVideo(c): ContestantDraft` — `clearVideo` 결과 + `manualVideoUrl` 유지.
- `runManualVideoAdd(input: { url: string; nameEmpty: boolean; entryUnit: EntryUnit }, deps: { validate(ids: string[]): Promise<{verdicts: LinkVerdict[]}>; extract(items, entryUnit): Promise<ExtractedContestant[]> }): Promise<{kind:"parse-fail"; reason} | {kind:"blocked"; verdict} | {kind:"ok"; verdict; startSec; extraction: ExtractedContestant|null; extractFailed: boolean}>`

- [ ] 실패 테스트: slotButtons 4상태(자동·수동 빈 칸·수동 영상·그림만) · parseManualVideoUrl(watch·youtu.be·shorts → ok, vimeo → only-youtube, "abc" → only-youtube, youtube.com/@ch → no-video-id) · addManualVideo(그 칸만 바뀜 · 이름 빈 칸 채움 · 이름 있는 칸 이름 그대로 · 차단 판정이면 변화 없음) · removeManualVideo(주소 남음) · clearVideo 가 manualVideo 지움 · applySourcingResults 가 manualVideo 지움 · toDraftFields→fromDraftDoc 왕복에 3필드 남음 · 옛 초안 → 필드 없음 · buildContestantDocs 결과에 3필드 없음.
- [ ] `npx vitest run lib/__tests__/lab/manualMedia.test.ts lib/__tests__/lab/tournamentDraft.test.ts` → FAIL 확인
- [ ] 구현 → 같은 명령 PASS
- [ ] 커밋

### Task 2: 통합 — `runManualVideoAdd` 콜러블 횟수

**Files:** Test `tests/integration/manualVideoAdd.test.ts`

- [ ] 실패 테스트: 가짜 validate/extract 로 ① 이름 빈 칸 → validate 1회(id 1개) · extract 1회(entryUnit 전달) ② 이름 있는 칸 → extract 0회 ③ 비유튜브 → 둘 다 0회 ④ 차단 → extract 0회 ⑤ extract 던짐 → kind ok + extractFailed true · 결과를 addManualVideo 에 넣으면 48칸 중 그 칸만 바뀜.
- [ ] `npm run test:integration` → (Task 1 전이면 FAIL) / PASS
- [ ] 커밋

### Task 3: 화면 — `ContestantEditor` · `ContestantGrid` · `TournamentCreator` · 문구

**Files:** Modify `components/admin/lab/ContestantEditor.tsx` · `ContestantGrid.tsx` · `TournamentCreator.tsx` · `lib/i18n/messages.ts` · Test `lib/__tests__/lab/slotCardImage.test.ts`(갱신) · `lib/__tests__/i18n/image1Copy.test.ts`(갱신) · 새 `lib/__tests__/i18n/labFix3Copy.test.ts`

- 새 키(승인표 v3 그대로): `lab.manual.video`(1) · `lab.manual.videoPlaceholder`(2) · `lab.manual.onlyYouTube`(3) · `lab.manual.imagePlaceholder`(5) · `lab.manual.submit`(7). 바뀜: `lab.image.chipUrl` → 이미지/Image/Imagen(4) · `lab.image.chipFile` → 이미지 파일/Image file/Archivo de imagen(6). 삭제: `lab.image.remove` · `lab.review.hintTip` · `lab.source.find`(쓰는 곳이 없어지면).
- 시험 id: `slot-video-{i}`(aria-pressed) · `slot-image-url-{i}`(aria-pressed, 유지) · `slot-image-file-{i}`(유지) · `slot-line-input-{i}` · `slot-line-submit-{i}` · `slot-line-fail-{i}` · `slot-crown-{i}`. 없어짐: `contestant-hint-` · `slot-image-remove-`.
- 상위: `video={{ onAdd(index, url) → Promise<실패 메시지|null>, onRemove(index) }}` 를 내려 준다. onAdd 는 runManualVideoAdd(validateYouTubeLinks · extractContestantsFromVideos) → addManualVideo 로 setContestants, 배지 정리(dropSourcingStates). 이미지 성공 시 `manualImageUrl` 기록, removeSlotImage 는 주소 유지.
- [ ] 실패 테스트(정적 렌더): 자동 칸에 slot-video/slot-image-url/slot-image-file 없음 + contestant-refresh 있음 · 수동 빈 칸에 셋 있음 + contestant-refresh 없음 · 🔎·slot-image-remove 없음 · 이름만 있는 빈 칸에 slot-crown(`/brand/wc48-crown-filled.svg`) · 켜진 버튼 aria-pressed=true · 3언어 문구 표 일치.
- [ ] FAIL 확인 → 구현 → `npx vitest run` 전체 PASS · `npx tsc --noEmit` · `npm run check:hex`
- [ ] 커밋

### Task 4: [초안 목록] 펼침 수리 (systematic-debugging)

**Files:** Modify `components/admin/lab/DraftMenu.tsx` · Test `lib/__tests__/lab/draftMenu.test.ts`(추가)

- [ ] 1440 창에서 재현·원인 확인(로컬 에뮬레이터 + Playwright 로 목록 상자 좌표 측정).
- [ ] 원인에 맞는 고침 + `max-width: calc(100vw - 32px)` 안전판. 렌더 테스트로 스타일 고정.
- [ ] 커밋

### Task 5: E2E(에뮬레이터) + 칸 높이 + 문서

**Files:** Create `e2e/emulator/lab-fix3-slot-buttons.spec.ts` · Modify 원장(D-89) · `CLAUDE.md`(v2.12 이력 한 줄) · DraftMenu/ContestantEditor 머리 주석

- 유튜브 콜러블 2개와 `i.ytimg.com` 은 `page.route` 로 가짜 응답(바깥 사이트 부르지 않음). 이미지는 기존 가짜 그림 서버.
- [ ] §5의 1·2·3·4·6·8·9 시험 작성 → **고치기 전 main 코드에서 빨강**(git stash 로 화면 코드만 되돌려 확인·캡처) → 고친 뒤 초록·캡처.
- [ ] 칸 높이 전·후 측정(1440×900, `contestant-node-*` boundingBox) 기록.
- [ ] 원장 D-89 네 줄 · CLAUDE.md 이력 · `npm run check:docs` · 금지 낱말 검사.
- [ ] verification-before-completion: 유닛·통합·E2E·tsc·hex·docs 전부 다시 실행 → PR.

---

## 추가분 — 대회 종류(영상 대회 · 이미지 대회) 잠금 (원장 D-90 · 지시서 `PROMPT_ClaudeCode_LAB-FIX-3_추가_대회종류_v1.0_2026-11-13.md`)

**목표:** 대회 하나 = 영상 대회 또는 이미지 대회. 처음 누른 생성 버튼이 종류를 정해 초안에 저장하고, 반대 종류의 버튼·도구·칸 넣기 버튼은 꺼지거나 숨는다. 섞이면 발행 안 됨.

**설계:** 판정은 순수 함수 `lib/lab/mediaKind.ts`. 초안 칸 `mediaKind`(최상위 · firestore.rules 허용 목록에 추가) · 발행 문서 `mediaKind`. 칸 버튼 판정 `slotButtons(c, kind)` 가 종류를 받는다.

### 코티오가 정한 것(보고에 적음)
1. 반대 종류의 미디어가 이미 있는 칸(옛 섞인 초안)에는 **빼기 전용**으로 켜진 버튼 하나만 보인다(영상 대회의 그림 칸 = 켜진 [이미지] · 이미지 대회의 영상 칸 = 켜진 [영상]). 넣기 버튼은 아니므로 "그 종류의 넣기 버튼만"과 어긋나지 않는다 — 섞인 초안을 발행 가능하게 고칠 길.
2. 종류 미정 초안에서는 직접 손보기 도구(검수기 · 빈칸만 AI · 이미지 파일 넣기)도 숨는다(반드시 생성 버튼으로 시작). [빈칸만 AI]는 영상 대회 = 기존 영상 체인, 이미지 대회 = 채우기만.
3. 섞여서 발행이 막힐 때 새 문구는 만들지 않는다(발행 버튼만 꺼짐) — 필요하면 3언어 표로 따로 보고.
4. "URL 48줄" 넣기는 지금 코드에 없다(찾아도 0건) — 막을 대상 없음.

### Task A: 순수 층 `lib/lab/mediaKind.ts` + 초안·발행 문서 + 규칙
- `type MediaKind = "video" | "image"` · `inferMediaKind(cs): { kind: MediaKind | null; mixed: boolean }`(영상 있으면 video · 그림만 있으면 image · 둘 다 = video + mixed) · `resolveMediaKind(stored, cs): MediaKind | null`(저장값이 맞으면 그것, 아니면 추론) · `isMediaPublishable(kind, cs): boolean`(영상 대회에 그림 0 · 이미지 대회에 영상 0 · 미정이면 섞임 없음).
- `DraftEditorState.mediaKind: MediaKind | null` · `toDraftFields` 는 정해졌을 때만 싣는다 · `fromDraftDoc` = resolve · `DRAFT_FIELDS`·firestore.rules `isValidDraft` 에 `mediaKind`('video'|'image') · rules 시험.
- `TournamentInput.mediaKind?` → 발행 문서 `mediaKind`(있을 때만) · `Tournament` 타입에 선택 칸.
- 시험 먼저: `lib/__tests__/lab/mediaKind.test.ts` · tournamentDraft · tournamentDoc · rules.

### Task B: 칸 버튼 `slotButtons(c, kind)`
- 미정 → 넣기 버튼 없음 · video → [영상](수동 칸) · image → [이미지]·[이미지 파일] · 반대 종류 미디어가 있으면 켜진 빼기 버튼만. 자동 칸 [새 영상 찾기]는 그대로.
- 시험 먼저: manualMedia.test.ts · slotButtons.test.ts 갱신.

### Task C: 화면 — GeneratePanel · TournamentCreator · 발행
- GeneratePanel `mediaKind` prop: 반대쪽 버튼 꺼짐 + `title`(2a/2b) · 버튼 밑 안내(1) `lab-media-kind-note` · 도구 줄: 검수기 = video 만 · [빈칸만 AI] = 정해졌을 때 · [이미지 파일 넣기]·끌어놓기 = image 만.
- 생성 버튼을 누르는 순간 `setMediaKind` → 자동 저장. [새로 시작]·초안 열기 때 다시 정함.
- `PublishButton` `mediaReady` prop.
- 문구 3줄(`lab.kind.note` · `lab.kind.lockedVideo` · `lab.kind.lockedImage`) — 승인표 그대로 · 시험.

### Task D: E2E
- 에뮬레이터 `lab-fix3-media-kind.spec.ts`: §5 1·2·3·4·5·6(AI 채우기·견적은 가짜 응답, 견적 창 [취소]). 고치기 전 main 에서 빨강.
- 기존 시험 정리: 에뮬레이터 `seedDraft` 에 `mediaKind` 인자 — IMAGE-1 그림 시험은 이미지 대회(영상 칸 없음) · 불일치 배지 확인은 영상 대회 초안으로 분리 · lab-fix3 시험은 영상/이미지 초안 각각. 미리보기 b1·thumb1 은 [동영상 생성] → 견적 창 [취소] → 검수기로 영상.
- 원장 D-90 · CLAUDE.md 이력 · 사전 점검 표 갱신.
