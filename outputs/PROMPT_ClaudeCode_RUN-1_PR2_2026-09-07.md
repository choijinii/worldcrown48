# Claude Code 전달 프롬프트 — RUN-1 PR 2 (화면·문구 + 참가 규칙 v2.1 게스트 정책)

> 대표님은 아래 `---8<---` 사이의 내용을 **통째로 복사해 Claude Code 입력창에 붙여넣기**만 하시면 됩니다.
> 작성: 티오(Cowork) · 2026-09-07 · 브랜치 `feat/run-1-pr2-screens-v2.1` (문서 커밋 `e273782` · `c800093` 위)

---8<--- 여기서부터 복사 ---8<---

WorldCrown48 RUN-1 킥의 **PR 2(화면·문구)** 를 시작한다. PR 1(서버 코어 #90 · 핫픽스 #91 · P0 복구 #92)은 머지·배포·눈검사까지 끝났다. 이 작업의 정본 지시서는 저장소 안에 있다.

## 0. 지금 브랜치와 첫 동작
현재 브랜치는 `feat/run-1-pr2-screens-v2.1` 이고, `main`(= origin/main, `ae2ad9b` #92)에서 분기해 **문서 커밋 2개(`e273782`, `c800093`)** 가 올라가 있다. 첫 동작:

```
git fetch origin
git rebase origin/main
```
충돌이 나면 멈추고 대표님께 보고하라.

## 1. 필독 (이 순서로 전부)
1. `outputs/HANDOFF_RUN-1_참가규칙v2.0_2026-09-03.md` **v1.1** — §3 Phase 2 표 · §4 · §5 · §7 · **§8 문구표(2026-09-07 승인 최종본)** · §9 · §11 · **§14(09-06 P0)** · **§16(v2.1 게스트 정책 + 실측 4건 + 배포 전제)**
2. `outputs/참가규칙_정본v2.1_판Run_2026-09-07.html` — 규칙 정본 (§4 게스트 정책)
3. `CLAUDE.md` "⚖️ 참가 규칙" 절 (v2.6) · `LANGUAGE.md` §1 표시 용어 층(판→"참여" 순화) · §2 게스트 일일 판 한도 · §7 금지어("표" 낱말 자체 금지)
4. `functions/src/onVote.ts` 상단 주석과 `deadlinePassed: false` 줄 — 이 PR이 되살리는 자리

읽은 뒤 핸드오프 §0 자가 검증 명령을 **직접 실행**해 전부 ✓인지 확인하고 결과를 먼저 출력하라 (`grep -c "게스트 일일 판 한도" LANGUAGE.md` ≥ 3 포함).

## 2. 한 줄 목표
**팬 화면이 회차(runIndex)를 이해하게 만들고, 게스트 정책 v2.1(하루 통틀어 3판 · 공유 개방 · 저장 잠금 · 게스트의 선택 랭킹 제외용 표시)을 적용하며, PR 1에서 껐던 마감 강제를 "마감됐어요" 안내와 한 쌍으로 되살린다.**

## 3. ⛔ 배포 전제 — 0단계 (코드보다 먼저, 배포 전에 반드시)
2026-09-07 라이브 실측: The Pitch "진행 중" 12개 중 **마감이 남은 Tournament가 0개**(마감 지남 7 · 마감 없음 5). 마감 강제를 되살리면 정리 없이는 09-06 P0가 재발한다. **대표 확정 처리안(2026-09-07)**:

| 대상 | 처리 |
|---|---|
| 실제 팬용 4개 — "현재 활동하는 kpop여자 아이돌…"(마감 9/3) · "현재 Kpop 아티스트중에…"(8/24) · "현존하는 최고의 댄스퍼포먼스의 남자아이돌…"(8/16) · "테스트 토너먼트-3 전세계의 틱톡커…"(8/4) | **`tournamentDeadline` 연장** — 날짜는 아래 보고 후 대표님이 정한다 (제안: 2026-11-30 KST) |
| 나머지 마감 지난 것 + **마감이 없는 5개**(발로란트 · 라면 · 아름다운 k-pop 여자 아이돌 · Kpop 남자아이돌 비주얼 · 월드컵특집 축구선수) + `a1-preview-*` · `admin-preview-*` | **숨김** (`status` 를 hidden/archived 중 코드가 실제로 Pitch 목록에서 제외하는 값으로 — 먼저 `lib/pitch/trending.ts` 등에서 필터 조건을 실측해 정하라) |
| 09-06 §7 0단계 스크립트 테스트가 남긴 **익명 uid의 votes·roundProgress·tournament_runs·guest_runs·crown_cards** | **확인 후 삭제** (대표 확인: "아직 안 됐다/모르겠다") |

절차: ① `tournaments` 전수 조회 → id · 제목 · status · tournamentDeadline · 표시 여부를 **표로 대표님께 보고** ② 대표님이 연장 날짜·숨김 목록을 확정 ③ 그때 쓴다. **보고 전에 쓰지 마라.** 기존 관리자 스크립트 관례(`functions/scripts/*.mjs` + `FIREBASE_ADMIN_SDK_KEY`)를 따르되, 이 정리는 §5 DON'T 3(마이그레이션 금지)의 예외다 — 데이터 정리이지 스키마 변환이 아니다. 실행 로그를 PR 본문에 남겨라.

## 4. 범위 — 이 PR에서 하는 것 (핸드오프 §3 Phase 2 + §16)
**A. 회차 화면 (v2.0 원안)**
- `lib/voteGate.ts` — HF-1 판정 전면 교체: `daily_participation` 읽기·`DAILY_PARTICIPATION_LIMIT`·`GUEST_RUN_TID_KEY`·`getGuestRunState` **폐기**. `tournament_runs/{uid}_{tid}` + `roundProgress/{runDocId}` + `guest_runs/{uid}` 를 읽어 **서버와 같은 순수 함수(`lib/run/decideRun` · `lib/run/guestRun`)** 를 돌린다. 판정 결과 → `allowed` / `login_required(reason: "guest_limit")` / `daily_limit_reached` / `deadline_passed`.
- `lib/arena/voteStore.ts` — `loadTournament`에 `where("runIndex","==",n)` (§9 함정 9 클라이언트 쪽) + 회차를 스토어 상태에 보관. 회차는 `tournament_runs.runIndex`(없으면 옛 문서 존재 여부로 1) — 문서 id 파싱 금지.
- `lib/arena/useRoundTransition.ts` · `championLoader` — 구독·조회 id를 `runDocId(uid, tid, runIndex)` 로.
- `app/arena/[tournamentId]/page.tsx` 완주 화면 — **[다시 참여 (n/5)]** 버튼(n = `runsToday`, 5/5면 비활성 + `dailyLimit` 안내) + **이전 참여의 Crown Card 목록**(접힘, 각각 조회·공유). 버튼 → 새 회차로 새 판(새 bracketSeed · 새 roundProgress). §6 디자인 참조: 새 색·새 컴포넌트 금지.
- `components/auth/LoginModal.tsx` — `daily_limit`·`dailyLimitSub` 교체, **`LoginReason`에 `guest_limit` 신설**(Google 버튼 노출 유지), **상단 주석의 HF-1 규칙(5 NEW Tournaments…)을 v2.1로 교체**.
- `functions/src/onVote.ts` — **`RATE_LIMIT` 20 → 40** + `arena.vote.rateLimited` 문구.

**B. 마감 강제 복원 — 문구·화면과 한 쌍 (§14)**
- `onVote.ts`의 `deadlinePassed: false` → 실제 판정: `tournaments/{tid}.tournamentDeadline < now`. **`tournamentDeadline`이 없는 문서는 "마감 아님"으로 본다**(정리로 숨기지만 코드는 방어). 트랜잭션 안에서 tournament 문서를 한 번 더 읽는다.
- 클라이언트도 같은 판정(`decideRun`의 `deadlinePassed` 입력)으로 **① 완주 화면 [다시 참여] 비활성 + `arena.run.deadlinePassed` 한 줄 ② 한 판도 안 돈 팬의 첫 진입 화면에도 같은 한 줄**(AC 16). 진행 중인 판은 이어갈 수 있게 둔다(AC 9).
- 서버 `deadline_passed` 오류를 받으면 화면은 **일반 실패 배너가 아니라** `arena.run.deadlinePassed` 를 보여야 한다(`details.code === VOTE_ERROR_CODES.DEADLINE_PASSED`).
- ⚠️ **화면 처리 없이 `deadlinePassed`만 true로 돌리는 커밋을 만들지 마라.** 같은 커밋 안에 문구·화면이 있어야 한다.

**C. 게스트 정책 v2.1 (§16)**
1. `lib/run/guestRun.ts`(+ `functions/src/_run` 미러, `copy-run.mjs`) — `GUEST_DAILY_RUN_LIMIT = 3`. `decideGuestRun`에서 **`runTournamentId`·`tournamentId` 비교 제거**, 대신 `isContinue: boolean`(= 그 Tournament의 `decideRun` 결과가 `continue`) 입력: `isContinue → allow` · `effectiveRunsToday < limit → allow` · 그 외 `login_required`.
2. `functions/src/core/planRunWrite.ts` — `guestRuns` 에서 `tournamentId` 제거 → `{ runsToday, lastRunDate }`.
3. **vote 문서에 `isGuest: boolean` 신설** — `onVote`가 `req.auth.token.firebase.sign_in_provider === "anonymous"` 로 판정해 기록(클라이언트 플래그 아님). `buildVoteDoc`·`VoteInput` 갱신. `functions/src/linkSessionVote.ts` 재부모화 시 **`isGuest: false`** 로 갱신. (랭킹 집계에서 빼는 것 자체는 PR 3 — 이 PR은 필드만.)
4. **공유 개방 / 저장 잠금 분리** — `CrownCardModal` · `ShareActions` · `CrownCanvasPreview` · `ShareMenu`: `canShare`(로그인) 하나로 잠그던 것을 **공유(X · 네이티브 공유 시트 · 링크)는 게스트에게 열고, 다운로드(Story PNG 등 `downloadCrown`)만 로그인 게이트**. `LoginPromptBanner` 문구는 "저장하려면 로그인" 취지로(§8 `arena.guest.remaining` 뒷부분과 톤 일치 — 새 문구가 필요하면 **구현 전 대표 승인**). 공유 링크 규격은 로그인과 동일(`withShareUtm` 그대로). `crown_shared_x` · `crown_shared_native` 이벤트에 **`is_guest`** 파라미터 추가(`crown_card_created`와 같은 방식).
5. **게스트 안내 3지점** — ① 첫 진입(`arena.guest.welcome`) ② 1판 완주 후 Crown Card 화면(`arena.guest.remaining`, n = `3 − effectiveRunsToday`) ③ 소진 시 `guest_limit` 모달. 표시 위치·존재가 이 PR 범위, 시각 다듬기는 아레나 개편.
6. `firestore.rules` — 옛 `daily_participation` 블록은 **Phase 3에서** 지운다(이 PR에서 지우지 마라).
7. **계측 2건 (2026-09-08 대표 확정 — EVENT_SPEC v1.2)** — LoginModal·Crown Card를 어차피 만지는 PR이라 여기서 한다.
   - **`guest_limit_view` 신설**: 게스트가 3판 소진으로 `guest_limit` 모달을 본 시점에 1회. 파라미터 = 공통 4개(`commonEventParams`) + `runs_today`(3). v2.1에서 회원 전환의 주 지점이 "공유 잠금"에서 "3판 소진"으로 옮겨갔으므로 이 이벤트가 전환율의 **분모**다.
   - **`guest_signin_convert`의 `trigger_point`에 `guest_limit` 버킷 추가** — `LoginModal.tsx`의 reason→trigger_point 매핑에 `reason === "guest_limit" → "guest_limit"`. 기존 `card_modal`(공유 잠금 배너) 매핑은 "저장 잠금 배너"로 의미만 바뀌고 이름은 유지.
   - `share_locked_view`는 **이름 유지, 의미만 "저장(다운로드) 잠금 배너를 본 시점"으로** — 코드 주석과 EVENT_SPEC v1.2를 맞춘다. 공유 3이벤트(`crown_shared_x`·`crown_shared_native`·`crown_downloaded`)에 공통 4파라미터를 붙이는 것은 C-4와 같은 일이다.

**D. 히어로 문구 정정** — `lib/i18n/messages.ts` `pitch.hero.sub` 3언어: "예측도, 배당도 없이 —" 구절 삭제 + "당신의 한 표가 Champion을 만듭니다" → §8 승인본. (금지어 "표" 정정)

## 5. 화면 문구 3언어 — 2026-09-07 대표 승인 최종본 (글자 그대로 · 핸드오프 §8과 동일)

| 키 | ko | en | es |
|---|---|---|---|
| `arena.vote.dailyLimit` | 이 Tournament는 오늘 5번 참여를 모두 하셨어요 (5/5) | You've played all 5 runs of this Tournament today (5/5) | Ya has jugado las 5 partidas de este Tournament hoy (5/5) |
| `dailyLimitSub` | 한국 시간 자정에 참여 횟수가 다시 채워져요. 다른 Tournament는 지금 바로 참여하실 수 있어요. | Your 5 runs reset at Seoul midnight. Other Tournaments are open right now. | Tus 5 partidas se reinician a medianoche de Seúl. Otros Tournaments están abiertos ahora. |
| `arena.run.playAgain` | 다시 참여 (n/5) | Play again (n/5) | Jugar otra vez (n/5) |
| `arena.run.pastCards` | 이전 참여의 Crown Card | Your earlier Crown Cards | Tus Crown Cards anteriores |
| `arena.vote.rateLimited` | 조금 빠르게 고르고 계시네요. 몇 초만 쉬었다 이어가 주세요. | You're choosing quickly. Take a few seconds, then keep going. | Estás eligiendo muy rápido. Espera unos segundos y continúa. |
| `arena.run.deadlinePassed` | 이 Tournament는 마감됐어요. 다른 Tournament에 참여해 보세요. | This Tournament has closed. Try a new run in another Tournament. | Este Tournament ha cerrado. Empieza una nueva partida en otro Tournament. |
| `login.guest_limit.title` | 오늘의 서비스(3번 참여)를 모두 소진하셨어요. | You've used all 3 of today's free entries. | Has usado tus 3 participaciones gratis de hoy. |
| `login.guest_limit.sub` | 로그인하면 Tournament마다 하루 5번까지 참여 — 내 선택이 랭킹에 반영돼요. | Sign in for up to 5 entries a day in every Tournament — and your picks count in the Ranking. | Inicia sesión: hasta 5 participaciones al día en cada Tournament — y tus elecciones cuentan en el Ranking. |
| `arena.guest.welcome` | 로그인 없이 하루 3번까지 참여가 가능해요! | Join up to 3 times a day — no sign-in needed! | ¡Participa hasta 3 veces al día — sin iniciar sesión! |
| `arena.guest.remaining` | 오늘 남은 참여 가능 횟수는 : n판 · 저장하려면 로그인 | Entries left today: n · Sign in to save | Participaciones restantes hoy: n · Inicia sesión para guardar |
| `pitch.hero.sub` 뒷부분 (앞부분 "48 Contestants. Five Rounds. …전진합니다." 3언어 그대로) | 오직 팬의 선택. 당신의 선택이 왕관의 주인을 만듭니다. | Pure fan choice. Your pick crowns the Champion. | Solo la elección de los fans. Tu elección corona al Champion. |

"Tournament" · "Crown Card"는 3언어 원문 그대로(RULE 1). **표 밖의 새 문구가 필요하면 구현하지 말고 대표님께 승인 요청**하라. 표시 용어 규칙: 화면 글에서 **'판'은 "참여/N번 참여"로 순화**(시스템 용어 Run(판)은 코드·문서에서 그대로) · **"표"는 낱말 자체 금지 → "선택"** · "예측·배당" 표현 금지.

## 6. 작업 방식 — Superpowers TDD (순서 엄수)
```
/brainstorm : §2 목표 + 핸드오프 §9 함정 12건 + §16 실측 4건 입력 → 접근·순서 정리
/plan       : §4 A~D 파일 순서 확정, AC(아래 §8)를 테스트로 매핑 — §11.2 표
TDD RED-GREEN-REFACTOR : 순수 함수부터(voteGate 판정 · decideGuestRun 3판/isContinue · planRunWrite guestRuns · buildVoteDoc isGuest · 공유/저장 게이트). 테스트 없이 구현 먼저 금지
/review     : §5 제약 위반 0건 · 금지어 0건 · strict 통과 · functions 빌드(`cd functions && npm run build`) 통과
/pr         : §10 종료 조건 + 0단계 정리 로그를 PR 본문에
```
Superpowers 미설치면 멈추고 대표님께 알려라. `.claude/`·`marketing/`은 커밋하지 마라.

## 7. 절대 규칙 (핸드오프 §5 — v2.1 반영)
**DO** ① 회차의 정본은 필드 `runIndex` ② 한도 판정은 서버가 최종, 클라는 같은 순수 함수 ③ **게스트 = 하루 통틀어 3판**(`GUEST_DAILY_RUN_LIMIT` 한 곳) ④ 미완주 판은 이어하기, 카운트는 첫 선택 시점 ⑤ 마감 지난 Tournament는 새 판 불가, 진행 중 판은 계속 ⑥ 지난 회차 Crown Card 전부 보존 ⑦ 문구는 §5 표 그대로
**DON'T** ① "표" 낱말 자체 금지(코드 내부 `vote` 제외) ② ~~rankingAggregator 금지~~ → **해제됨**(단 이 PR은 `isGuest` 필드까지, 집계 필터는 PR 3) ③ 마이그레이션 스크립트 금지(0단계 데이터 정리는 예외) ④ `bracket_seeds` create-once 완화 금지 ⑤ 문서 id `split('_')`로 tid 복원 금지 ⑥ Arena UI 대수술(ARENA-1/2) 금지 ⑦ 새 색·새 컴포넌트 금지 ⑧ **화면 없이 마감 강제만 켜는 커밋 금지**

## 8. 완료 조건 (핸드오프 §4 — 이 PR 해당분)
1·2 같은 Tournament 5판, 다른 Tournament 별도 5판 · 3 판마다 대진표 상이(화면에서 확인) · 4·5 카드 회차별 생성·보존, 목록에서 각각 조회·공유 · **6 게스트 하루 통틀어 3판 — 대회 오가기 가능, 미완주 판은 한도 무관 이어하기, 4판째 `guest_limit`(Google 버튼 노출), 공유는 열리고 저장은 잠김, 안내 3지점 노출** · 7 KST 리셋 · 8 이어하기 · **9·16 마감 지난 Tournament: 새 판 차단 + 첫 진입·완주 화면 모두 `deadlinePassed` 안내, 진행 중 판은 계속** · 12 문구 3언어 글자 단위 일치 · 13 분당 40회, 41회째 `rateLimited` 안내 · 17 게스트 차단 사유 안내 · **신규: vote 문서에 `isGuest` 기록(익명 true / 로그인 false), `linkSessionVote` 후 false**

**계측 완료 조건(신규)**: 게스트 4판째 시도 → `guest_limit_view` 1회(공통 4파라미터 + runs_today) · 그 모달에서 Google 로그인 → `guest_signin_convert{trigger_point:"guest_limit"}` · 공유 3이벤트에 `is_guest`·`category`·`lang`·`tournament_id`가 붙는다.

금지어 게이트: `grep -rn "5표\|46표\|투표 무제한" app lib components` = 0건 **+** `grep -rn "한 표\|표가 \|표를 " lib/i18n/messages.ts components app --include=*.ts --include=*.tsx | grep -v "표시\|목표\|대표\|발표\|도표\|표기\|표준\|표현\|표본"` 에 팬 노출 문구가 **0건**.

## 9. 머지·배포 후 — 네가 먼저 완주할 것 (§7)
Vercel Preview + Firebase 배포(`functions` · `firestore:rules`) 후, **마감이 남은 Tournament(0단계에서 연장한 4개 중 하나)** 로:
1. 로그인: A 1판 완주 → 카드 1장 → **[다시 참여 (2/5)]** → 2판째 48강 첫 매치 대진이 1판째와 **다른지**(핵심) → 2판 완주 → 카드 2장 각각 공유
2. 로그인: A 5판 소진 → 6판째 `dailyLimit` → B는 정상 진입
3. 마감 지난 Tournament(숨기기 전에 하나 남겨 두거나 프리뷰용 시드) 첫 진입 → `deadlinePassed` 한 줄, 선택 시도 시 일반 실패 배너가 **아닌** 같은 안내
4. **시크릿 창(게스트)**: 첫 진입 `welcome` → 1판 완주 → `remaining`(2) → **공유 버튼 활성·다운로드는 로그인 요구** → 다른 대회 2·3판 → 4판째 `guest_limit` + Google 버튼 → A로 돌아가 미완주 판이 있으면 이어하기 허용
5. 결과를 표로 보고한 뒤 대표님 눈검사 요청. **"확인해 주세요"를 먼저 말하지 마라.** (Chrome 확장이 연결돼 있으면 티오가 같은 경로를 병행 검증한다.)

## 10. 보고 형식
각 단계 끝에 (a) 실행한 명령·결과 (b) 바뀐 파일 목록 (c) 남은 위험. 모호한 결정이 나오면 추측하지 말고 대표님께 한 가지 질문으로 물어라.

---8<--- 여기까지 복사 ---8<---
