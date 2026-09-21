# Claude Code 전달 프롬프트 — ARENA-1 PR 2a (가로 첫 탭 전체화면 + 매치 화면 게스트 안내 제거 + 금지 문구·하드코딩 문구 정리)

> 대표님은 아래 `---8<---` 사이의 내용을 **통째로 복사해 Claude Code 입력창에 붙여넣기**만 하시면 됩니다.
> 작성: 티오(Cowork) · 2026-09-20 · 기준 `main` = `7bb4a93` (#103). **PR #104는 아직 머지되지 않았다**(2026-09-20 밤 대표 정정)
> **왜 2a인가** — PR 2의 네 화면(선택 확정 연출 1B · 라운드 전환 · 결승 3분할 · 첫 입장 팝업)은 클로드 디자인 실물이 아직 없다. 원장 D-20(디자인 정본 = 클로드 디자인)과 2026-08-31 확정(클로드 디자인 → Claude Code 순서)에 따라, **디자인이 필요 없는 것만 2a로 먼저** 하고 네 화면은 디자인 합격 뒤 PR 2b로 발행한다 (2026-09-20 대표 승인).

---8<--- 여기서부터 복사 ---8<---

WorldCrown48 **ARENA-1 킥의 PR 2a** 를 시작한다. PR 1(#103, VS 스플릿 무대)은 머지·배포·데이터 보정·스모크·대표 눈검사(2026-09-20 16:50 KST 합격)까지 전부 끝났다. PR #104(COOKIE-1 프롬프트 초안, 문서만)는 **아직 머지되지 않았다 — 이 PR과 순서 무관, 건드리지 마라.** 이 작업의 정본 우선순위는 **① 결정 원장 > ② 킥 §12 부록 > ③ 킥 본문** 이다.

**이 PR은 화면의 "모양"을 새로 만들지 않는다.** 결승 3분할 · 라운드 전환 재설계 · 선택 확정 연출 · 첫 입장 팝업은 **전부 이 PR이 아니다**(§4). **대관 연출(결승에서 고른 직후 약 3초짜리 우승 연출, 킥 Phase F)은 2026-09-20 대표 결정으로 만들지 않는다** — 결승에서 고르면 지금처럼 바로 크라운 카드로 간다. 모양을 지어내게 되는 순간 STOP.

## 0. 첫 동작
```
git fetch origin
git status --short
git checkout main && git rebase origin/main   # 기대: 7bb4a93 (#103). 그 위에 #104 머지 커밋이 있어도 정상
git checkout -b feat/arena-1-pr2a-fullscreen-copy
```
- **작업 트리에 미커밋 문서가 있다 — 되돌리지 마라.** 09-20 세션에서 티오가 고친 것이다: `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md`(D-17 바뀜 · RUN-1 게스트 안내 바뀜 추가) · `outputs/KICK_ARENA-1_v1.1_…md`(§12-E PR 1 종료 기록) · 새 파일 `outputs/SESSION-HANDOFF_2026-09-20_…md` · `outputs/눈검사_ARENA-1_PR1_2026-09-20.html` · `outputs/ARENA-1_ClaudeDesign_PR2b_네화면_지시_v1.0_2026-09-20.md` · `outputs/PROMPT_ClaudeCode_COOKIE-1_v1.0_승인반영_2026-09-20.md` · `marketing/00_strategy/서신_티오→마케팅_대관연출-폐기+사전등록-이미지_2026-09-20.md` · 이 프롬프트 파일. 원장에는 같은 날 저녁 D-24~D-27과 "COOKIE-1 승인 게이트 닫힘"도 추가돼 있다. rebase가 이 수정 때문에 막히면 `git stash` → rebase → `git stash pop` 하고, **이 문서들을 이 PR의 첫 커밋(`docs: …`)으로 넣어라.**
- `.claude/` · `Claude outputs/`(익명 uid 목록 포함)는 **커밋 금지**.
- 충돌이 나면 멈추고 대표님께 보고하라.

## 1. 필독 (이 순서로 · 요약하지 말고 읽어라)
1. `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md` — **D-24(대관 연출 폐기) · D-25(최애 / Choe-ae) · D-26(PR 2 분할) · D-03(낱말 규칙) · D-06(라운드 구조 · THE FINAL) · D-07(세계관 = 스포츠) · D-08 · D-11 · D-17 본문 + 맨 아래 "D-17 · 바뀜 (2026-09-20) — 모바일 가로 전체화면" · "RUN-1 게스트 안내 · 바뀜 (2026-09-20)" · D-20 · D-21 바뀜**. 각 항목의 "아니라고 한 것"을 반드시 읽어라. 기각된 안을 다시 꺼내면 STOP.
2. `outputs/KICK_ARENA-1_v1.1_매치무대-대수술_2026-09-10.md` — **§12 부록 v1.2 + §12-E 먼저**, 그다음 §4 RULE R1~R11 · §6 Auto-STOP · §7 검증 · §8 PR 4블록.
3. `outputs/PROMPT_ClaudeCode_ARENA-1_PR1_스플릿무대_2026-09-19.md` — PR 1이 무엇을 만들었는지(§3)와 무엇을 뺐는지(§4).
4. `LANGUAGE.md` §1 표시 용어 층 · §7 금지어 · §10 번역 불가 고유명사(Champion · Crown · Crown Card · The Arena는 3언어 모두 영문 원형).
5. 코드 실물: `app/arena/[tournamentId]/page.tsx`(545 — 520~540행 `notice=` 블록이 게스트 안내 ①) · `components/arena/SplitStage.tsx`(213 — `notice` prop 46·85·178행) · `StageSide.tsx`(195) · `lib/arena/stageState.ts`(82) · `lib/arena/stageLayout.ts`(97) · `lib/arena/useStageViewport.ts`(87 — `window.innerWidth/innerHeight` + `matchMedia("(orientation: landscape)")`) · `components/arena/RoundTransition.tsx`(76) · `FinalPickView.tsx`(96) · `lib/i18n/messages.ts`(`arena.guest.welcome` 263행 부근) · `lib/__tests__/messagesContent.test.ts`(89행 부근) · `e2e/arena1-split-stage.spec.ts` · `e2e/c1-arena-flow.spec.ts` · `e2e/hf3-guest-run.spec.ts`.

읽은 뒤 **"필독 5건 확인 · 원장 '바뀜' 2건(D-17 전체화면 · RUN-1 게스트 안내) 확인 · §4 OUT 목록 확인"** 을 먼저 출력하라.

## 2. 한 줄 목표
**모바일 가로에서 첫 탭에 브라우저 전체화면으로 들어가게 하고(되는 기기만), 매치 화면의 게스트 안내 한 줄을 빼고, 라운드 전환·결승 화면에 박혀 있는 글자를 3언어 키로 옮기며 금지 문구 2건을 없앤다. 화면 모양·선택 엔진·탭 규칙·계측은 바꾸지 않는다.**

## 3. 범위 — 이 PR에서 하는 것

### A. 모바일 가로 첫 탭 전체화면 (원장 "D-17 · 바뀜 2026-09-20")
- **의도 먼저**: 안드로이드 크롬 가로에서 주소창이 커서 무대가 아래로 밀린다(09-20 대표 눈검사). 가로 = 집중 모드(D-17 ③)라 주소창도 방해다. 그래서 가로에서 **팬의 첫 탭에** 전체화면(브라우저 주소창·탭 줄이 사라지는 상태)으로 들어간다.
- 신설 순수 모듈 `lib/arena/fullscreenGate.ts` (유닛 테스트 필수): 입력 `{ mode, isFullscreen, supported, requestedThisLandscape }` → 출력 `"request" | "exit" | "none"`.
  - `mode === "landscape"`(`lib/arena/stageLayout.ts`의 `StageMode` — `"desktop" | "portrait" | "landscape"`를 그대로 쓴다) + `supported` + 아직 전체화면 아님 + **이번 가로 진입에서 아직 요청한 적 없음** → `"request"`.
  - 세로(또는 데스크톱)로 바뀌었는데 전체화면 상태 → `"exit"`(자동 해제). 세로로 돌아가면 `requestedThisLandscape`를 초기화한다.
  - 그 외 `"none"`.
- 연결: 무대(SplitStage 루트)의 **pointerdown/click 핸들러 안에서 동기적으로** `document.documentElement.requestFullscreen?.()` 호출(브라우저 규칙: 사용자 동작 안에서만 허용). Promise 거부는 **조용히 무시**(콘솔 에러 0 유지). 해제는 `document.exitFullscreen?.()`.
- **탭 규칙은 바뀌지 않는다(D-17 · 재론 금지)**: 그 첫 탭은 평소대로 **1탭 = 확대·재생(arm)** 으로도 동작한다. 전체화면 요청은 같은 탭에 **얹히는 부수 효과**일 뿐, 탭을 소비하지 않는다. 2탭 = 선택 확정도 그대로.
- **"한 번만"의 의도**: 팬이 뒤로가기 등으로 전체화면을 일부러 나갔는데 다음 탭에서 또 끌고 들어가면 방해다. 그래서 가로 진입 1회당 1번만 요청한다. *이 규칙이 정하지 않는 것*: 세로↔가로를 다시 돌리면 새 진입으로 보고 다시 요청한다.
- **지원 안 되는 기기(아이폰 사파리 — `requestFullscreen` 없음)**: 아무것도 하지 않는다. 대신 무대 칸 크기가 **실제로 남는 높이**로 계산되는지 확인하라 — `useStageViewport`가 `window.innerHeight`를 쓰는데, 주소창이 접히고 펴질 때(`resize` · `visualViewport` `resize`) 다시 계산되는지 실측하고, 안 되면 `visualViewport.height`(없으면 `innerHeight`) 기준으로 재계산되게 하라. 칸 크기는 D-17 일반 규칙(칸 = 정사각, 한 변 = 주어진 자리의 가로·세로 중 짧은 쪽) 그대로 — **기기별 숫자 하드코딩 금지.**
- **전체화면 진입·해제로 화면 크기가 바뀌어도 진행 중인 판 · 선택 기록 · `match_session_id` · arm 상태는 유지**(D-17 ①). PR 1에서 상태를 컴포넌트 밖에 둔 구조를 그대로 쓴다. 리마운트로 잃으면 결함이다 — 테스트로 못박아라.
- "돌리면 자동 전체화면"(×, 브라우저가 막음) · "아이폰도 전체화면"(×) · "전체화면 버튼을 따로 둔다"(×, D-17 '가로 전용 버튼' 기각과 같은 논리) — 만들지 마라.
- 새 팬 노출 문구 **없음**. 안내 토스트·힌트를 덧붙이지 마라.

### B. 매치 화면 게스트 안내 제거 (원장 "RUN-1 게스트 안내 · 바뀜 2026-09-20")
- `app/arena/[tournamentId]/page.tsx`의 `notice={ isGuest && run?.runsToday === 0 ? … t("arena.guest.welcome") … }` 블록을 **삭제**한다. 데스크톱·모바일 세로 모두. "작게 남김"(×).
- `SplitStage`의 `notice` prop은 다른 사용처가 없으면 함께 제거한다(있으면 보고).
- i18n 키 `arena.guest.welcome`은 사용처가 0이 되면 `messages.ts`에서 삭제하고 `lib/__tests__/messagesContent.test.ts`의 해당 단언을 정리한다.
- **나머지 두 지점은 절대 건드리지 마라**: ② 크라운 카드 화면의 남은 횟수(`arena.guest.remaining`, `RunCompleteActions.tsx`) · ③ 3번 소진 시 모달(`login.guest_limit.*`). 배너 기본 공지(`banner.default.*`)도 그대로.
- E2E: 게스트 첫 진입 매치 화면에 그 문장이 **없다**(3언어 `?lang=` 고정) + 소진 모달·남은 횟수 문구는 **여전히 뜬다**(기존 `hf3-guest-run` 회귀). `hf3-guest-run`이 그 문장의 존재를 단언하고 있으면 그 단언만 "없음"으로 뒤집고 범위를 보고하라.

### C. 금지 문구 2건 + 하드코딩 문구 → i18n 키 (모양 불변 · §5 승인 게이트)
- `components/arena/RoundTransition.tsx` — `"✦ Voter is briefly the spectator"`(금지: "Voter") · `"방금 완료 · You completed"` · `"다음 라운드 · Next round"`.
- `components/arena/FinalPickView.tsx` — `"결승 · THE FINAL"` · `"Choose your Champion"`(금지: 하드코딩 영문, 킥 §7 grep 0건 대상) · `"3명의 파이널리스트 중 … · pick one of three, directly"` · `"One pick · One Crown · no second round"`. 카드 안 작은 글자 `CROWN`은 브랜드 글리프 낱말이라 **그대로 둔다**.
- 전부 `lib/i18n/messages.ts`의 `arena.round.*` / `arena.final.*` 키(ko/en/es)로 옮기고 `useT()`로 읽는다. **값은 §5 표에서 "승인됨"인 것만 쓴다.** 승인 전이면 이 Phase에서 STOP(추측 금지 · `TODO` 값 금지).
- **레이아웃·CSS·애니메이션·타이밍은 한 줄도 바꾸지 않는다.** `arena.module.css` 무변경. 글자가 길어져 줄이 넘치면 고치지 말고 캡처와 함께 보고하라(모양은 2b 디자인 몫).
- **라운드 이름(`roundName(…, "en")` → "ROUND OF 48" 등)은 이 PR에서 건드리지 않는다.** 라운드 큰 타이포(48 → 24 → 12 → 6 → THE FINAL)는 2b 디자인에서 정한다.
- 판정: `grep -rn "Choose your Champion\|briefly the spectator\|Voter" components/arena app/arena` → 팬 노출 문자열 0건(주석·타입 이름 제외, 제외한 줄은 보고).

### D. 문서
- §0의 미커밋 문서 + 이 프롬프트 파일을 커밋에 포함.
- 킥 문서 §12-E 아래에 **"§12-F · PR 2 분할 기록 (2026-09-20)"** 을 추가하라: "PR 2 = 2a(이 PR: 가로 전체화면 · 게스트 안내 제거 · 문구 정리) + 2b(선택 확정 연출 1B · 라운드 전환 · 결승 3분할 · 첫 입장 팝업 — 클로드 디자인 합격 뒤 발행). 이유: D-20 · 08-31 확정 순서. **대관 연출(킥 Phase F · ARENA-1a · M7의 ceremony 계측 2종 · R9~R11)은 2026-09-20 대표 결정으로 폐기** — 크라운 카드가 그 역할을 맡는다. 원장 D-24에 기록됨."

## 4. 하지 않는 것
- **PR 2b**: M2 선택 확정(픽 절정) 연출 + 다음 매치 프리로드 · M3 라운드 전환 재설계(동심원 링 · 코너 라벨 4개 · 큰 라운드 타이포) · M4 결승 3분할 · M5 첫 입장 팝업(+ "가로로 돌리면 더 크게" 한 줄). **디자인 실물이 없다 — 손대지 마라.**
- **대관 연출(킥 Phase F / ARENA-1a)** — **폐기(2026-09-20 대표).** `CeremonyStage` · `useCeremonyTimeline` · `ceremony_viewed/skipped` · `public/ceremony/` 어느 것도 만들지 마라. 결승 선택 → 크라운 카드 흐름은 지금 그대로 둔다.
- **PR 3**: M6 'Vote Now' 교체(D-23) · M7 계측 5종 보존 확인(ceremony 2종은 대관 연출 폐기로 없어짐) · M9 랭킹 상시 공개 · 규범 문서 4건 · `resolveLoopRange` 기본값.
- **NAV-1**(메뉴바 · ☰ 서랍 · "선택 이어가기" — `Navbar.tsx` · `SiteMapSheet.tsx` · `lib/layout/domains.ts`) · **BANNER-1**(관리자 배너 CRUD) · **COOKIE-1**(동의 바 — 별도 프롬프트 · `components/policy/*` · `lib/cookieConsent.ts` · `firestore.rules` 손대지 마라) · **FONT-1**(글꼴) · NAME-I18N-1 · 48강 그리드(D-14) · 프레임 프리즈(D-16) · 참가 규칙 재론.
- **R1 선택 엔진 불변**: `onVote` 시그니처 · `roundProgress` · `decideRun` · `runDocId` · `voteStore` · `RunCompleteActions` · Firestore 스키마 무변경. **R8 계측 5종**(`tournament_start` · `round_advance` · `champion_confirmed` · `first_vote` · `match_session_id`) 이벤트명·파라미터·1회성 가드 무변경. 어기게 되면 STOP.
- 배너 자리(D-21): 이 PR은 새 화면을 만들지 않으므로 배너 자리 변경 없음. 기존 `arena-match-below`(데스크톱 1320×140 · 모바일 세로 폭 366 · **모바일 가로 없음**)가 전체화면 진입·해제 뒤에도 규칙대로인지만 E2E로 확인.

## 5. 승인 게이트 — 대표 답이 문서에 없으면 그 Phase에서 STOP (추측 금지)
> 모양은 그대로, 글자만 키로 옮기는 전후 비교다. 고유명사(Champion · Crown · THE FINAL)는 LANGUAGE.md §10에 따라 3언어 모두 영문 원형.

| # | 자리 | 지금(하드코딩) | ko | en | es | 상태 |
|---|---|---|---|---|---|---|
| 1 | 라운드 전환 · 왼쪽 아래 코너 | ✦ Voter is briefly the spectator | ✦ 잠시 숨을 고르는 시간 | ✦ A moment to breathe | ✦ Un momento para respirar | ✅ 승인됨 (2026-09-20 대표) |
| 2 | 라운드 전환 · 윗줄 | 방금 완료 · You completed **{라운드}** | 방금 마친 라운드 **{라운드}** | You completed **{라운드}** | Has completado **{라운드}** | ✅ 승인됨 |
| 3 | 라운드 전환 · 가운데 라벨 | 다음 라운드 · Next round | 다음 라운드 | Next round | Siguiente ronda | ✅ 승인됨 |
| 4 | 결승 · 맨 위 작은 글자 | 결승 · THE FINAL | 결승 · THE FINAL | THE FINAL | THE FINAL | ✅ 승인됨 |
| 5 | 결승 · 제목 | Choose your Champion | 당신의 최애를 골라 주세요 | Pick your Choe-ae | Elige a tu Choe-ae | ✅ 승인됨 (2026-09-20 대표 — "Champion" 대신 "최애", 로마자 철자 **Choe-ae** 확정 · 원장 D-25) |
| 6 | 결승 · 제목 아래 | 3명의 파이널리스트 중 한 명을 직접 선택하세요 · pick one of three, directly | 세 명 중 한 명을 직접 골라 주세요 | Pick one of the three | Elige a uno de los tres | ✅ 승인됨 |
| 7 | 결승 · 맨 아래 | One pick · One Crown · no second round | 한 번의 선택 · 하나의 Crown · 되돌리기 없음 | One pick · One Crown · No do-overs | Una elección · Un Crown · Sin vuelta atrás | ✅ 승인됨 |

**5번 주의**: "최애"(가장 아끼는 한 사람)는 새 표시 낱말이다. `LANGUAGE.md` §1 표시 용어 층에 "최애 / Choe-ae — 결승 제목에서 팬이 고르는 대상을 부르는 표시 낱말(2026-09-20 대표 · 원장 D-25 · 로마자 철자는 Choe-ae로 고정)"로 **추가 등재**하라. 시스템 용어 Champion의 정의는 바꾸지 않는다(IMMUTABLE TERMINOLOGY RULE — 새 개념은 새 용어로). 다른 자리의 "Champion"은 건드리지 마라.

낱말 규칙(D-03): 투표 · '표' · 예측 · 배당 금지, 화면 글의 '판'은 '참여'. 전투 은유 금지(LANGUAGE.md). 위 표는 이 규칙을 통과한 제안이다.

## 6. 작업 방식 — Superpowers TDD (순서 엄수 · Phase = 커밋 1개)
0. `docs:` 미커밋 문서 + 이 프롬프트 + 킥 §12-F.
1. `lib/arena/fullscreenGate.ts` 유닛 RED→GREEN — 가로 첫 탭 request · 같은 가로 진입에서 두 번째는 none · 세로 복귀 시 exit + 초기화 · 미지원 none · 데스크톱 none.
2. 무대 연결 + 상태 보존 유닛(전체화면 진입·해제의 크기 변화에서 `stageState`·진행 위치 유지) + 미지원 기기 높이 재계산(필요 시).
3. 게스트 안내 제거(B) + 테스트 정리.
4. 문구 키화(C) — **§5가 "승인됨"으로 바뀐 뒤에만.** 커밋 전 전후 비교표를 PR 본문에 싣는다.
5. 검증: `npx vitest run` · `npx tsc --noEmit` · `npm run check:hex` · `cd functions && npm run build` 전부 green.
6. E2E: 기존 `arena1-split-stage` · `c1-arena-flow` · `c2-crown-card-flow` · `hf3-guest-run` · RUN-1 회귀 **전부 PASS** + 신규 단언(파일은 `e2e/arena1-split-stage.spec.ts`에 추가하거나 `e2e/arena1-pr2a.spec.ts` 신설):
   - 844×390에서 첫 탭 → `requestFullscreen`이 **정확히 1회** 호출(헤드리스는 실제 전체화면이 불안정하므로 `addInitScript`로 스파이를 심어 호출 횟수로 판정) + 그 탭으로 칸이 arm 상태 + 두 번째 탭으로 선택 확정(탭 규칙 불변).
   - 같은 가로 진입에서 다시 탭 → 추가 호출 0회. 세로(390×844)로 바꾸면 `exitFullscreen` 호출, 다시 가로 → 첫 탭에 1회.
   - 1440×900 · 390×844에서는 호출 0회.
   - `requestFullscreen`을 지운 환경(아이폰 흉내)에서 콘솔 에러 0 · 무대가 화면 밖으로 넘치지 않음.
   - 회전·전체화면 전후로 진행 위치(n번째 매치) 유지.
   - 게스트 안내 문장 부재(3언어) · 소진 모달/남은 횟수 문구 존재.
   - i18n 의존 단언은 `?lang=` 고정.
   - **`hf3-guest-run`은 어느 CI 워크플로에도 연결돼 있지 않다(E2E-1 미결).** 로컬에서 직접 돌려 결과를 보고하라. 워크플로 연결 자체는 이 PR 범위가 아니다.
7. **프리플라이트(대표 눈검사 전 의무)**: 프리뷰 또는 localhost에서 1440×900 · 390×844 · 844×390 세 화면을 직접 끝까지 걸어 보고(진입 → 1탭 → 2탭 → 다음 매치 → 라운드 전환 → 결승), `lang=ko/en/es` 콘솔 에러 0을 **표로 보고한 뒤에만** 대표 눈검사를 청하라. 대표에게는 **자동 검사가 못 하는 것만** 청한다: 실제 안드로이드 크롬 가로에서 첫 탭에 주소창이 사라지는지 · 세로로 돌리면 돌아오는지 · 실제 아이폰 사파리 가로에서 무대가 잘리지 않는지.

## 7. 완료 조건
- 안드로이드 크롬(또는 Chromium 에뮬레이션 + 스파이) 가로 첫 탭 전체화면 1회 · 세로 복귀 자동 해제 · 탭 규칙 불변 · 진행 유지.
- 매치 화면 게스트 안내 0건(3언어) · 나머지 두 지점 유지.
- 금지 문구 grep 0건 · `RoundTransition`/`FinalPickView` 팬 노출 하드코딩 0건 · `arena.module.css` diff 0줄.
- 계측 5종 동일 파라미터 발화(R8) · Console 에러 0 · 기계 검증 전부 green · 기존 E2E 회귀 100% PASS.
- PR 본문 4블록(킥 §8) + **"핸드오프와 달랐던 점"** + §5 전후 비교표 + 사용자 영향 한 줄.
- 사람 절차 없음(rules · functions 배포 불필요). 머지는 **브랜치 → PR → 병합**. `main`은 보호 브랜치다 — `git push origin main` 금지.

## 8. Auto-STOP
- 킥·원장 문면과 리포 실물이 다름 · R1/R8 위반 없이 불가 · §5 미승인 문구 · 모양(레이아웃·CSS·연출)을 바꿔야만 성립 · 전체화면 연결이 탭 규칙(1탭 확대 · 2탭 확정)을 바꾸게 됨 · 전체화면 진입·해제에서 진행 상태를 잃는 구조 결함 · 기존 E2E가 새 동작과 충돌(갱신 범위를 먼저 보고) · 필독 문서에 기각된 안을 다시 꺼내게 됨.

## 9. 보고 형식
Phase마다: 무엇을 했나 / 어떻게 확인했나(명령·결과) / 판단이 필요했던 것 / 다음 Phase. 마지막에 §7 표 + §5 승인 상태 + 프리플라이트 표 + 대표 눈검사 요청 3항목(온전한 문장으로, 어느 기기에서 무엇을 누르고 무엇이 보여야 하는지).

---8<--- 여기까지 복사 ---8<---

## 부록 — 티오 실측 (대표님 참고용, 복사 범위 밖)
- 2026-09-20 19:30 KST 기준 로컬 저장소: `main` = `7bb4a93`. 이 세션에서는 GitHub에 접속할 수 없어(키 없음) #104 머지 뒤의 커밋 번호는 직접 확인하지 못했다 — 처음에는 대표님 회신("PR #104 머지 완료")을 근거로 적었으나 **같은 날 밤 대표님이 "머지하지 않았다"로 정정** — 본문을 그에 맞게 고쳤다.
- 디자인 실물 확인: `docs/design/claude-design/`에는 `Arena_Match_Stage_v1A_*.dc.html` 2개와 `bundle_v4_2026-09-19/`뿐이고, 두 파일 모두 "THE FINAL"이 0회 나온다 → 결승·전환·팝업 디자인 없음이 확인됨.
- 대관 연출은 2026-09-20 대표 결정으로 폐기(크라운 카드가 그 역할). 자산 6종 제작도 필요 없어짐.
- `useStageViewport`는 `window.innerHeight` 기반 → 아이폰 사파리 주소창 변화에서 재계산되는지는 Claude Code 실측 항목(§3 A).
- 문서만 남은 사람 절차: 익명 사용자 5명 삭제(`Claude outputs/anon-smoke-2026-09-20.tsv`) — 2026-09-20 저녁 기준 **미실행**. 이 PR과 무관하지만 잊지 말 것.
