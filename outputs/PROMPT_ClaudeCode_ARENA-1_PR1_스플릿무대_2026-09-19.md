# Claude Code 전달 프롬프트 — ARENA-1 PR 1 (VS 스플릿 무대 + 세로 영상 + 배너 자리)

> 대표님은 아래 `---8<---` 사이의 내용을 **통째로 복사해 Claude Code 입력창에 붙여넣기**만 하시면 됩니다.
> 작성: 티오(Cowork) · 2026-09-19 · 기준 `main` = `c87266c` (#102 머지 직후)

---8<--- 여기서부터 복사 ---8<---

WorldCrown48 **ARENA-1 킥의 PR 1(VS 스플릿 무대)** 를 시작한다. RUN-1(#90~#98)은 전부 머지·배포·검증이 끝났고, 디자인은 클로드 디자인에서 확정되어 저장소에 번들로 들어와 있다(#102). 이 작업의 정본은 저장소 안에 있으며 **우선순위는 ① 결정 원장 > ② 킥 §12 부록 > ③ 킥 본문** 이다. 킥 본문 §0·§1·§5 A에 남아 있는 옛 수치(100vw/vh · flex 1.5~2 · scale 1.1 · 채도 30→100% · 10초 루프)는 **무효**다 — §12 부록 A 표가 이긴다.

## 0. 첫 동작
```
git fetch origin
git checkout main && git rebase origin/main   # 기대: c87266c (#102)
git checkout -b feat/arena-1-pr1-split-stage
```
충돌이 나면 멈추고 대표님께 보고하라. `.claude/`·`Claude outputs/`는 커밋하지 마라. `marketing/`은 이제 추적 대상이다(#99).

## 1. 필독 (이 순서로 전부 · 요약하지 말고 읽어라)
1. `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md` — **D-03 · D-07 · D-08 · D-11(바뀜 09-17·09-19 포함) · D-12 · D-14 · D-15 · D-17 · D-18 · D-19 · D-20 · D-21 · D-23**. 각 항목의 "아니라고 한 것"을 반드시 읽어라. 기각된 안을 다시 꺼내면 STOP.
2. `outputs/KICK_ARENA-1_v1.1_매치무대-대수술_2026-09-10.md` — **§12 부록 v1.2 먼저**, 그다음 §3 스코프 · §4 RULE R1~R11 · §6 Auto-STOP · §7 검증 · §8 PR 4블록.
3. `docs/design/WC48_DESIGN_SYSTEM_v4.md` §2-B·§3·§4 (v4.2) — 값의 정본은 css다: `docs/design/arena_stage_tokens.css` · `docs/design/colors_and_type.css`.
4. 디자인 실물: `docs/design/claude-design/Arena_Match_Stage_v1A_9boards_2026-09-19.dc.html` — 대표가 직접 손본 확정 디자인. 아트보드 1(데스크톱 1440)·6(모바일 세로)·9(모바일 가로)가 이 PR의 화면 정답이다. 그 안의 `crop()`·`panels()` 함수가 크롭·조작 규칙의 실물이다.
5. 디자인 시스템 번들: `docs/design/claude-design/bundle_v4_2026-09-19/` — `preview/48-arena-stage.html` · `52-banner-slot.html` · `00-v4-rules.html`.
6. 코드 실물: `components/arena/MatchView.tsx`(79) · `ContestantCard.tsx`(86) · `VsSymbol.tsx`(10) · `arena.module.css` · `components/embed/LoopPlayer.tsx`(179) · `lib/media/mediaSlot.ts` · `lib/types/tournament.ts` · `app/arena/[tournamentId]/page.tsx`(539 — **화면 분기·계측·판 판정 보존**) · `e2e/c1-arena-flow.spec.ts` · `e2e/c2-crown-card-flow.spec.ts` · `e2e/hf3-guest-run.spec.ts`(있으면).

읽은 뒤 **"필독 6건 확인 · D-11 바뀜 2건 확인 · §12 부록 A 표 6줄 확인"** 을 먼저 출력하라.

## 2. 한 줄 목표
**매치 화면의 "카드 2장 + 버튼"을 원장 D-11·D-17의 VS 스플릿 무대로 바꾸고, 재생기가 세로(9:16) 영상을 받게 하며, 무대 아래에 배너 자리를 만들어 기본 공지로 채운다. 선택 엔진·데이터·계측은 바꾸지 않는다.**

## 3. 범위 — 이 PR에서 하는 것

### A. 무대 골격 `SplitStage` (킥 §5 A · D-08 · D-11 · D-17)
- 신설 `components/arena/SplitStage.tsx` · `StageSide.tsx` · 순수 모듈 `lib/arena/stageState.ts`(상태 머신 `idle | focusL | focusR | pickedL | pickedR | loading`, 유닛 테스트 필수).
- **데스크톱(≥1024)**: 화면 4층 — ① 메뉴바(기존 `Navbar`, **이 PR에서 손대지 않음**) ② 안내 문구 층(기존 제목·설명 유지, 가운데) ③ **무대 프레임 1320×680**(패딩 20, 바탕 `--arena-frame-bg`, 테두리 `--arena-frame-border`), 화면 좌우 여백 60 ④ 배너 자리(§C). 프레임 안에 **칸 640×640 두 개, 틈 0**. VS 표식은 맞닿는 선 정중앙 고정(`--arena-vs-*`, `pointer-events:none`, z 9).
- **모바일 세로(<1024, portrait)**: 메뉴바 있음(그대로) · 프레임 366×732(좌 12·상 68) · 상하 2분할 칸 364×365 · VS 58px · 하단 한 줄 `arena.stage.rotateHint`(승인 문구: ko "가로로 돌리면 무대가 더 크게 열립니다" — 디자인 파일의 문구 그대로, en/es는 §5 게이트).
- **모바일 가로(<1024, landscape)**: **메뉴바 숨김**(D-17 ③, D-08 유일 예외) · 무대 732×366(좌 56·상 12) · 좌우 50:50 칸 366. `matchMedia("(orientation: landscape)")`로 자동 전환. **돌려도 진행 중인 판·선택 기록·`match_session_id`는 유지**(D-17 ①) — 상태를 컴포넌트 밖(기존 page.tsx 상태)에 두어 리마운트로 잃지 않게 하라. 유닛/E2E로 못박아라.
- 칸 크기 일반 규칙(D-17): 칸은 정사각, 한 변 = 주어진 자리의 가로·세로 중 짧은 쪽. 기기별 숫자를 하드코딩하지 말고 이 규칙으로 계산하라(위 숫자는 검산값).
- 색·크기는 **전부 `var(--arena-*)` / `var(--color-*)`** (`docs/design/arena_stage_tokens.css`를 `app/globals.css` 옆에 넣고 import). raw hex 금지 — `npm run check:hex` 통과.

### B. 조작 (D-11 · 디자인 파일 `panels()` 그대로)
- 데스크톱 호버 = arm: 그 칸 `scale(var(--arena-hover-scale))`(1.2), 기준점 왼쪽 칸 `left center` / 오른쪽 칸 `right center`(모바일 상하: `center top`/`center bottom`), 커진 칸이 옆칸 **위**로(z 4). 포스터도 `scale(1.06)`(별개). 옆칸은 크기 그대로 `saturate(50%)`. 기본은 양쪽 100%.
- 들어갈 때 `transform 300ms cubic-bezier(.2,.9,.3,1.15), filter 280ms …` / 빠질 때 `200ms cubic-bezier(.4,0,.2,1)`. 토큰 `--arena-ease-*`·`--arena-t-*` 사용. `prefers-reduced-motion`이면 전환 시간 0.
- **클릭 = 선택 확정**(버튼 없음): 커진 칸 클릭 → 테두리 `--arena-cell-confirm-border` + `--arena-cell-confirm-shadow`, 옆칸 `brightness(.4)`, **520ms 뒤** 기존 `onVote(contestantId)` 호출 흐름으로 다음 매치. 모바일: 1탭 = arm(확대·재생) / 2탭 = 확정. **세로·가로 동일**(D-17). 기존 E2E가 "1탭 선택"을 전제하면 §6 Auto-STOP 3번 — 멈추고 갱신 범위를 보고하라.
- 재생(킥 §5 B · D-12): arm된 쪽만 `LoopPlayer` 마운트(동시 1개, R3), 반대쪽은 정지 포스터. 자동재생 금지(R4). 영상 없으면 포스터 그대로. 포스터→영상 전환은 **0.2~0.3초 크로스페이드**(D-15), 잘리는 위치 일치(§C-2).
- **무대 위 허용**: 이름·국적·소속·영상 제목을 **띠** 위에(`--arena-band-*`, 칸 안쪽 inset 24 / 모바일 12, 왼쪽 row · 오른쪽 row-reverse, `backdrop-filter: blur(8px)`). **금지 4종**(R2): 라운드 라벨 · 득표율 · 마감 타이머 · 개발자 고지문(`vs-foot` 삭제). E2E 어서션으로 판정.

### C. 재생기 세로(9:16) 지원 + 참가자 자료 칸 3개 (D-11 · D-14 "이번에 해야 하는 것")
1. `lib/types/tournament.ts`(또는 `lib/media/mediaSlot.ts`의 `EmbedMedia`)에 **`orientation?: "landscape" | "portrait"`(기본 landscape) · `focusY?: number`(기본 40)** 추가. `start`/`end`는 이미 있으면 재사용. Firestore 스키마는 **선택 필드 추가만**(R1 — 기존 문서 무변경, 마이그레이션 없음).
2. `LoopPlayer`: 지금 `width:177.78%` 가로 고정 → `orientation`에 따라 디자인 파일 `crop()` 그대로:
   - 가로 16:9 → `width 177.78% · height 100% · left −38.89% · top 0`
   - 세로 9:16 → `width 100% · height 177.78% · left 0 · top −(77.78 × focusY ÷ 100)%` (focusY 40 → −31.11%)
   - iframe 비율이 영상 비율과 같아야 유튜브가 검은 띠를 넣지 않는다(D-11). 정사각 창문 + `overflow:hidden` + `pointer-events:none` 유지.
3. 정지 포스터 `<img>`는 `object-fit: cover; object-position: center {focusY}%`(가로는 center). **포스터와 영상의 잘리는 자리가 같아야 한다**(D-15) — 두 방식이 같은 `focusY`를 쓰는지 유닛 테스트.
4. `SlotVideoTuner`(관리자 도구)에 `orientation`·`focusY` 입력 2칸 추가(최소 UI, 기존 스타일 재사용). 48강 그리드는 **없다** — 만들지 마라(D-14).

### D. 배너 자리 `BannerSlot` + 기본 공지 (D-21 · 킥 §12 B-2)
- 신설 `components/layout/BannerSlot.tsx` — `slot` 이름으로 Firestore `banners` 컬렉션에서 `active === true && slot === name` 1건(`priority` 오름차순)을 읽어 보여 준다(읽기 규칙: 누구나). **없으면 기본 공지**(i18n `banner.default.*`)를 보여 준다. **빈 상자를 그리지 않는다.**
- 매치 화면 무대 아래 `arena-match-below` **1320×140**(데스크톱, top 960 — 첫 화면 밖) / 모바일 366×(디자인 실측, 세로 아트보드 6 참조)에 배치. 토큰 `--arena-banner-*`.
- `banners` 문서 형태(최소): `{ slot, kind: "notice", title: {ko,en,es}, body?: {ko,en,es}, href?, active, priority, startAt?, endAt? }`. **관리자 CRUD 화면은 만들지 않는다**(BANNER-1 소킥, OUT). 이 PR은 부품 + 기본 공지 + `firestore.rules` 읽기 규칙까지.
- 기본 공지 문구는 **§5 승인 게이트**. 승인 전이면 키만 만들고 값은 `TODO_APPROVAL`이 아니라 **STOP**하고 대표 승인을 요청하라(추측 금지).

### E. 문구·문서
- 새 팬 노출 문구는 전부 `lib/i18n/messages.ts` `arena.*` / `banner.*` 키(ko/en/es). 하드코딩 0건(grep 판정). 낱말 규칙 D-03: 투표·표·예측·배당 금지, 판→참여. **"Vote Now"는 이 PR에서 건드리지 않는다**(메뉴바는 NAV-1 / D-23은 PR 3에서).
- `CLAUDE.md` 대진 흐름 #5 표현·`docs/lite-specs/C1-vote-engine.md` VoteRateBar 절 폐기 표기·`docs/design/wireframes/Domain 3 · The Arena.html` 상단 배너("ARENA-1 이후 구조는 코드가 진실")는 **PR 3(H)** — 이 PR에서는 하지 않는다. 단, 이 프롬프트 파일 `outputs/PROMPT_ClaudeCode_ARENA-1_PR1_스플릿무대_2026-09-19.md`는 커밋에 포함하라.

## 4. 하지 않는 것 (킥 §3 OUT + PR 분할)
- PR 2(M2 픽 절정·M3 라운드 전환·M4 결승 3분할+대관 연출·M5 첫 입장 팝업) · PR 3(M6 문구 교체·M7 계측 신설·M9 랭킹 상시 공개·규범 문서) — **이 PR 아님.**
- 메뉴바·☰ 서랍·"선택 이어가기"(D-18·D-19) — **NAV-1 소킥.** `components/layout/Navbar.tsx`·`SiteMapSheet.tsx`·`lib/layout/domains.ts` 손대지 마라.
- 관리자 배너 CRUD(BANNER-1) · 48강 그리드(D-14) · 프레임 프리즈(D-16) · 브래킷 크기(D-09) · 참가 규칙 재론 · `RATE_LIMIT` · `first_vote`/`match_session_id` 신설(이미 있음).
- **R1 선택 엔진 불변**: `onVote` 시그니처 · `roundProgress` · `decideRun` · `runDocId` · `voteStore` · `RunCompleteActions` · Firestore 스키마(선택 필드 추가 제외) 무변경. 어기게 되면 STOP.

## 5. 승인 게이트 — 대표 답이 문서에 없으면 STOP (추측 금지)
| # | 필요한 것 | 상태 |
|---|---|---|
| 1 | 배너 기본 공지 3언어 | **승인됨 (2026-09-19 대표 "A로")** — 로그인 유도 카피. ko **"로그인하면 크라운 카드를 간직하고, 대회마다 하루 5번 참여할 수 있어요"** / en **"Sign in to keep your Crown Card and play up to 5 times a day per tournament"** / es **"Inicia sesión para guardar tu Crown Card y participar hasta 5 veces al día por torneo"** (링크: 로그인 화면). 로그인한 사용자에게 무엇을 보일지는 **게이트 4**. 순위 발표 카피는 런칭 뒤 참가가 쌓인 다음(BANNER-1)으로 미룸 — 지금 쓰지 마라 |
| 2 | 모바일 세로 한 줄 en/es | ko는 디자인 파일 그대로. en "Turn sideways for a bigger stage" / es "Gira el móvil para un escenario más grande" — **승인됨 (2026-09-19 대표)** |
| 3 | 띠 위 "국적 · 소속" 표기 형식 | 디자인 파일 그대로(`국적 · 소속`, JetBrains Mono 11px) — 승인됨(1A 합격) |
| 4 | 로그인한 사용자에게 보일 기본 공지 | 방향 확정(2026-09-19 대표): **크라운 카드 "공유" 유도** — "쌓였으니 보러 가기"가 아니다. 문구 티오 제안 → 대표 승인 대기: ko **"대회를 마치면 크라운 카드가 생겨요 — 친구에게 공유해 보세요"** / en **"Finish a tournament to earn your Crown Card — share it with friends"** / es **"Termina un torneo y consigue tu Crown Card — compártela con tus amigos"** (링크: `/account` 카드 목록). 승인 전이면 로그인 사용자에게도 게이트 1 문구를 그대로 보이고 진행(STOP 아님) |

## 6. 작업 방식 — Superpowers TDD (순서 엄수)
1. `lib/arena/stageState.ts` 유닛 RED→GREEN (상태 전이 · 회전 시 상태 보존 · 2탭 규칙).
2. `LoopPlayer` 크롭 유닛 RED→GREEN (가로/세로/focusY 3건 + 포스터-영상 일치).
3. `BannerSlot` 유닛 (배너 있음/없음→기본 공지/비활성 무시).
4. 화면 교체 → `npx vitest run` · `npx tsc --noEmit` · `npm run check:hex` · `cd functions && npm run build` 전부 green.
5. E2E: 기존 `c1-arena-flow` · `c2-crown-card-flow` · `hf3-guest-run` · RUN-1 회귀 **전부 PASS**(탭 규칙 충돌은 STOP 후 갱신) + 신규 `e2e/arena1-split-stage.spec.ts`(스플릿 렌더 1440/390/844×390 · 금지 4종 부재 · 재생 iframe ≤1 · 회전 후 진행 유지 · 배너 기본 공지 노출). i18n 의존 단언은 `?lang=` 고정.
6. Phase = 커밋 1개. 커밋 메시지에 원장 번호를 적어라(예: `feat(arena): SplitStage skeleton (D-08·D-11)`).

## 7. 완료 조건
- 킥 §0 DoD 중 이 PR 몫: 스플릿 렌더 · 금지 4종 0건(E2E) · 재생 iframe ≤1 · 계측 5종 **동일 파라미터로 발화**(`tournament_start`·`round_advance`·`champion_confirmed`·`first_vote`·`match_session_id`, R8) · 하드코딩 문구 0건 · Lighthouse 모바일 ≥ 80 · Console 에러 0.
- 세로 숏츠 참가자 1명을 시드에 넣고 **검은 띠 없이** 정사각으로 보이는 캡처 1장.
- 배너 자리에 기본 공지가 3언어로 보이는 캡처(빈 상자 0건).
- PR 본문 4블록(§8) + **"핸드오프와 달랐던 점"** + §5 승인 대기 항목 명시.

## 8. Auto-STOP (킥 §6 + 이 PR 추가)
- 킥 문면과 리포 실물이 다름 · R1 위반 없이 불가 · 탭 규칙이 기존 E2E와 충돌 · §5 승인 없는 문구 · 계측 파라미터 변경 불가피 · 디자인 파일 값이 원장 D-11·D-17과 다름(→ 원장이 이김, 보고) · `firestore.rules` 배포 권한 필요(사람 절차).

## 9. 보고 형식
Phase마다: 무엇을 했나 / 어떻게 확인했나(명령·결과) / 판단이 필요했던 것 / 다음 Phase. 마지막에 §7 표 + §5 승인 대기 목록.

---8<--- 여기까지 복사 ---8<---

## 부록 — 티오 실측 (대표님 참고용, 복사 범위 밖)
- 기준 main `c87266c`(#102). 로컬 `origin/main`은 아직 #101이라 첫 동작의 fetch가 필수.
- 코드 `app/globals.css`는 클로드 디자인 정본 계열(`--radius-border 5px`, `--space-N`)을 쓰고 있어 번들 css와 충돌 없음.
- `LoopPlayer` 현행: 가로 1:1 크롭·mute·pointer-events:none·`resolveLoopRange`(기본 start+10) — D-12의 15초는 `endSec` 명시로 해결(`resolveLoopRange` 기본값 변경은 PR 3 H에서 함께).
- 기존 E2E `c1-arena-flow`가 카드 클릭(1탭 선택) 전제일 가능성 큼 → §8 STOP 3번이 첫 멈춤 지점일 것으로 예상.
