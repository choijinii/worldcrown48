# KICK ARENA-1 v1.1 — 매치 무대 대수술 (VS 스플릿 · 라운드 전환 · 결승 · 대관 연출 · 랭킹 상시 공개)

발행 2026-09-10 (v1.1 — v0.9/v0.95를 RUN-1 종료 시점 기준으로 전면 갱신) · 승인 대표 · 담당 Claude Code(구현) + Claude Design(시각 층) + Cowork 티오(킥·게이트·검증)
· 선행 조건: **RUN-1 PR 3(#95) 머지·배포 완료 ✅ (2026-09-10)** · Claude Design 번들 수령
· 기준 HEAD **`4ab69b2`** (2026-09-10, PR #95 머지 직후)

> **v1.1이 v0.9/v0.95와 다른 점 — 반드시 먼저 읽을 것**
> 1. **"한 사람이 같은 대회를 재도전할 수 없다"는 전제가 폐기됐다.** 참가 규칙 v2.0/v2.1로 **하루 5판(게스트 3판)** 재도전이 확정·구현됐다. v0.95 §3의 "판=사람×대회 1:1" 서술은 무효다.
> 2. **v0.95의 계측 3·4번(`match_session_id`·`first_vote`)은 RUN-1 PR 3에서 이미 구현·배포됐다.** 이 킥에서 다시 만들지 마라.
> 3. **`RATE_LIMIT` 40 완화(v0.9 M8)는 이미 적용돼 있다.** `functions/src/onVote.ts:46`. 이 킥의 할 일이 아니다.
> 4. **랭킹 상시 공개(W-7 게이트 폐기)가 이 킥에 신규 포함된다(2026-09-10 대표 확정).** 아래 M9.
> 5. **세계관이 스포츠로 확정됐다(2026-09-09).** 시상식 계열 서사는 배제. 화면 이름은 스포츠 용어 유지. "Vote Now" 및 '투표' 낱말은 교체 대상(문구 승인 게이트).

| 항목 | 값 |
|---|---|
| 킥 코드 | `ARENA-1` (선행 소킥 `ARENA-1a` = 대관 연출) |
| 브랜치 | `feat/arena-1-match-stage` |
| Base 브랜치 | `main` (`4ab69b2`) |
| 후속 킥 | `ARENA-2` 아레나 홈(대기실·아카이브·브래킷 크기) — 별도 문서 v0.7 |

---

## §0 목적 / 완료 정의(DoD)

**목적**: 아레나 매치 화면을 "카드 2장 그리드"에서 **화면 전체를 좌우로 가르는 VS 스플릿 무대**로 바꾸고, 결승 픽 직후 **대관 연출**을 넣어 크라운 카드 공유가 시작되는 감정의 정점을 만든다. 그리고 **랭킹을 마감 전에도 항상 볼 수 있게 연다.** 2026-10-08 런칭의 핵심 체험이다.

**DoD**
- [ ] `/arena/{id}` 매치 화면이 100vw×100vh 좌우 50:50 스플릿으로 렌더되고, 호버(데스크톱)/1탭(모바일)한 쪽이 **flex 1.5~2배로 벌어지며 scale 1.1 + 채도 30→100%**, 그쪽 영상만 10초 무음 루프 재생(영상 없으면 썸네일 정지), 반대쪽은 정지·감채도.
- [ ] 매치 화면 어디에도 라운드 라벨·득표율·마감 타이머·개발자 고지문(`vs-foot`)이 **없다**(E2E 어서션으로 판정).
- [ ] 결승(3인 1택) 픽 직후 대관 연출이 2.5~3초 재생되고 **정지 프레임에서 탭을 기다린다**. 도중 탭 → 즉시 정지 프레임. `prefers-reduced-motion` → 정지 프레임만. 탭 후에만 크라운 카드.
- [ ] **같은 대회를 두 번째 판으로 다시 돌 때도 대관 연출이 정상 재생되고, 탭 한 번으로 건너뛸 수 있다**(하루 최대 5판 — 반복 피로 대응이 v1.1의 핵심 요건).
- [ ] 라운드 전환 화면에 라운드명이 나오고(유일한 노출처), "Voter" 문자열이 팬 노출 문구에 0건.
- [ ] 첫 입장 팝업이 기기당 1회만 뜨고(localStorage), 닫기 전엔 선택 불가.
- [ ] **랭킹 화면이 마감 전에도 열린다** — 잠긴 상태가 사라지고, "다음 발표" 한 줄이 3언어로 뜬다(M9).
- [ ] 계측: `tournament_start` · `round_advance` · `champion_confirmed` · **`first_vote`** · **`match_session_id`** 가 대수술 후에도 **동일 파라미터로 발화**(GA4 DebugView 실측 캡처 첨부) + 신규 `ceremony_viewed` · `ceremony_skipped`.
- [ ] 팬 노출 문구 전부 `arena.*` i18n 키(ko/en/es) — 하드코딩 문자열 0건(grep 판정).
- [ ] 유닛 vitest · 통합(Emulator) · E2E Playwright(기존 회귀 + 신규 `arena1-split-stage`·`arena1-ceremony`) 100% PASS, Console 에러 0건, `npm run check:hex` 위반 0건.
- [ ] 라이트하우스 모바일 Performance ≥ 80 (매치 화면, Moto G Power 프로파일) — 영상 iframe 최대 1개 동시.
- [ ] 최종 보고에 "핸드오프와 달랐던 점".

## §1 필독 컨텍스트 (인라인)

**리포 내 필독**: `CLAUDE.md`(대진 흐름 #1~#10, 불변 원칙, Stale-Doc Guard 절) · `LANGUAGE.md` §1 표시 용어 층 · §7 금지어 · `DESIGN_BRIEF.md` · `docs/design/wireframes/Domain 3 · The Arena.html` · `docs/lite-specs/C1-vote-engine.md`(⚠ VoteRateBar 절은 폐기) · `components/embed/LoopPlayer.tsx` · `lib/embed/constants.ts` · `marketing/00_strategy/대관연출_인계_Crown_Ceremony_2026-08-31.md` · **`outputs/HANDOFF_RUN-1_참가규칙v2.0_2026-09-03.md` §3.0·§8·§16** · **`outputs/참가규칙_정본v2.1_판Run_2026-09-07.html`**

**확정 결정 (날짜순)**
- 2026-07-10: 라운드 흐름 48→24→12→6→THE FINAL(3인 1택, 1v1로 쪼개지 않음). Round Scope Lock(라운드명은 전환 화면에서만). Ranking Scope Lock(득표율·Crown Score는 랭킹 도메인만). "Arena 홈 = 활동"과 브래킷 크기 선택 UI는 **ARENA-2**.
- 2026-08-09: 테마 B안 하이브리드 — 매치·선택은 **다크**. VS 스플릿 100vw/vh Flexbox 50:50, 호버 flex 1.5~2 + scale(1.1) + saturate(30%→100%), VS 뱃지 중앙, 터치(상하 2탭), 픽 절정 연출, 다음 매치 프리로드, `vs-foot` 고지문 무대 제거, 임베드 10초 루프(LoopPlayer 재사용), MAX_CONCURRENT_PLAYERS=6.
- 2026-08-22: 표시 = 매치 화면 임베드 파사드 법리 / 그리드 = 유튜브 썸네일.
- 2026-08-31 (대표): ① ARENA-1/2 분할 ② **영상 자동재생 금지 — 호버/탭한 쪽만 10초 무음 루프**(기본 정지 포스터) ③ 실행 = Claude Design(시각 층) → Claude Code(구현·TDD) ④ 대관 연출을 이 킥에 포함.
- 2026-09-01 (대표): 아레나 홈 = 화이트, 입장 후 매치 무대는 다크(반전이 입장감을 만든다) — 이 킥은 **다크 쪽만** 담당.
- **2026-09-03 (대표) 참가 규칙 v2.0**: 세는 단위가 '대회 개수'에서 **'판(Run)'** 으로. 계정당·대회당·하루 **5판**, 판마다 대진표 재섞기, 크라운 카드는 판마다 1장.
- **2026-09-06/07 (대표) v2.1**: 게스트는 하루 통틀어 **3판**, 게스트 공유 개방·저장 잠금, **게스트의 선택은 랭킹 집계 제외**.
- **2026-09-07 (대표) 표시 용어**: 화면 글에서 **'판'은 "참여·N번 참여·참여 횟수"로 순화**(시스템 용어 Run(판)은 코드·문서에서 그대로). **"표"는 낱말 자체 금지 → "선택"**. "예측·배당" 금지.
- **2026-09-09 (대표) 세계관 = 스포츠 확정**: 시상식 계열 서사 배제. 아레나·토너먼트·랭킹·우수선수 뉴스 같은 스포츠 구조 유지. **'투표' 낱말을 서비스에서 없애고 싶다** — "Vote Now"는 다른 강한 단어로 교체(문구 승인 게이트).
- **2026-09-10 (대표) 대관 연출 방향 = 스포츠 우승 순간**: 대관식(왕관을 씌워 주는 의식)이 아니라 **경기에서 이겨 챔피언이 확정되는 순간**의 문법. 조명이 쏟아지고 화면이 한 사람에게 집중되며 왕관은 챔피언의 표식으로 등장한다. 09-09 세계관 스포츠 확정과 정합. '대관 연출'이라는 이름은 임시 유지(재검토는 아레나 개편 후). 자산 6종은 그대로 유효.
- **2026-09-10 (대표) W-7 폐기**: **랭킹은 마감 전에도 항상 볼 수 있게 게시한다.** 발표(하루 두 번)마다 바뀌는 순위를 팬이 봐야 한다. 근거 — "발표는 보여주려고 하는 것인데 안 보여줄 거면 발표를 왜 하나". W-7은 선거(개표) 개념의 잔재이고 월크48은 투표가 아니다. → M9.

**용어**: Tournament · Contestant · Match · Voter(코드·DB 전용) / 팬·Fan(팬 노출 문구) · Champion · Crown Card · Tournament Deadline · THE FINAL · Run(판, 시스템 용어) / 참여(화면 표시). FIFA 명칭(ROUND OF 16/QUARTERFINAL/SEMIFINAL) 금지. 전투 은유 금지.

**Stale-Doc Guard (인라인)**: 이 킥으로 바뀌는 규범 문서 — `CLAUDE.md`(대진 흐름 #5 표현 정정, 대관 연출 신설, **W-7 폐기 명시**), `docs/lite-specs/C1-vote-engine.md`(§THE FINAL 다음에 "대관 연출" 절, VoteRateBar 절 폐기 표기), `docs/design/wireframes/Domain 3 · The Arena.html` 상단에 "ARENA-1 이후 구조는 코드가 진실" 배너, `LANGUAGE.md`에 "Crown Ceremony(대관 연출)" 용어 등재. **머지 PR에 이 문서 수정이 함께 들어가야 DoD 충족.**

## §2 규모 실측치 (2026-09-10, HEAD `4ab69b2`)

| 파일 | 줄 수 | 비고 |
|---|---|---|
| `components/arena/MatchView.tsx` | 79 | 교체 |
| `components/arena/ContestantCard.tsx` | 86 | 교체 |
| `components/arena/FinalPickView.tsx` | 96 | 교체(결승 3분할) |
| `components/arena/RoundTransition.tsx` | 76 | 재설계 |
| `components/arena/VsSymbol.tsx` | 10 | 교체 |
| `components/arena/ModuleNav.tsx` | 83 | Newsroom disabled 탭 제거 검토 |
| `components/arena/RunCompleteActions.tsx` | **169** | **RUN-1 PR 2 신설 — 손대지 마라**([다시 참여]·지난 카드) |
| `components/arena/arena.module.css` | 605 | 대폭 개편 |
| `app/arena/[tournamentId]/page.tsx` | **539** | 08-31의 346 → RUN-1이 회차·게스트·마감 분기를 추가. **화면 분기·계측·판 판정 보존** |

- **신설**: `CeremonyStage.tsx` + `ceremony.module.css` + `useCeremonyTimeline.ts`(WAAPI) · `ArenaIntroModal.tsx` · `useNextMatchPreload.ts` · `SplitStage.tsx` · `StageSide.tsx` · `lib/arena/stageState.ts`(순수).
- **재사용**: `components/embed/LoopPlayer.tsx`(무음·1:1 크롭·pointer-events:none·에러 시 썸네일 폴백), `lib/media/mediaSlot.ts`, `lib/arena/*`·`lib/run/*` 순수 모듈(**변경 없음**).
- **i18n**: `lib/i18n/messages.ts` `arena.*` 현 **14개** → 약 30개(전환·결승·대관·팝업·대기 문구).
- **계측**: `lib/analytics/funnelEvents.ts` — 기존 5종(`tournament_start`·`round_advance`·`champion_confirmed`·`first_vote`·`match_session_id`) **보존** + `ceremony_viewed`·`ceremony_skipped` 2종 추가.
- **자산(대표 제작, §9)**: `public/ceremony/{crown_main.svg, crown_glow_back.png, crown_glow_front.png(선택), sparkle_01~03.png}` — **현재 `public/ceremony/` 폴더 없음(미제작)**.
- **랭킹 상시 공개(M9)**: `firestore.rules`의 `ranking_cache` 읽기 게이트 · `app/arena/[tournamentId]/ranking/page.tsx`의 `locked` 상태 · `components/ranking/RankingHeader.tsx`의 "다음 발표" 줄(코드·문구·테스트는 PR 3에서 이미 들어가 있고 **노출만 잠겨 있다**).

## §3 스코프 IN / OUT

| | 내용 |
|---|---|
| **IN** | M1 VS 스플릿 무대(호버/탭 재생) · M2 픽 절정 연출 + 다음 매치 프리로드 · M3 라운드 전환 재설계 · M4 결승 3분할 + ★대관 연출 · M5 첫 입장 팝업 · M6 문구 전부 i18n + `vs-foot` 제거 + '투표'/'Vote Now' 낱말 교체 · M7 계측 5종 보존 + ceremony 2종 신설 · **M9 랭킹 상시 공개(W-7 폐기)** · 규범 문서 4건 갱신 |
| **OUT** | 아레나 홈·대기실·브래킷 크기(ARENA-2) · 크라운 카드 디자인 변경 · 랭킹 **산식**(Crown Score, W4) · Pitch 카드 축소판 · 틱톡 임베드 · 참가자 이름 표기 규칙(NAME-I18N-1) · **참가 규칙 v2.0/v2.1 재론** · **`RATE_LIMIT` (이미 40)** · **`first_vote`·`match_session_id` 신설 (이미 완료)** · **리팩터링 유혹 금지** — `lib/arena/*`·`lib/run/*` 순수 모듈과 `voteStore`·`RunCompleteActions`는 손대지 않는다 |
| **후속 킥** | ARENA-2(홈+브래킷 크기) · 랭킹 개편 Crown Score(W4) · Pitch 쇼케이스(W5) · 뉴스룸 승격(W5~6) |

## §4 RULE

- **R1 투표 엔진 불변** — `onVote` 콜러블 시그니처·`roundProgress` 구독·`matches/roundProgress/bracketSeed`·`decideRun`·`runDocId` 순수 모듈·Firestore 스키마를 바꾸지 않는다. 화면만 바꾼다. 어기게 되면 STOP.
- **R2 Round Scope Lock** — 매치·결승·대관 화면에 라운드 라벨·"N강"·진행 HUD·득표율·마감 타이머·Crown Score를 렌더하지 않는다. 라운드명은 `RoundTransition`에서만.
- **R3 동시 플레이어 ≤ 6, 실제 목표 ≤ 1** — 재생 중 iframe은 호버/탭한 쪽 **1개**. 프리로드는 썸네일·포스터·다음 videoId 준비까지만(iframe 사전 생성 금지).
- **R4 자동재생 금지** — 진입 시 어느 쪽도 재생하지 않는다. 재생은 사용자 의도(호버/탭) 이후에만. 무음·playsinline·controls=0·클릭차단·출처 칩 "▶ YouTube" 유지(임베드 파사드 법리).
- **R5 모션은 위치·크기·회전·투명도만** — blur·filter 애니메이션 금지(정적 filter는 허용), 애니메이션 라이브러리 도입 금지(CSS keyframes + Web Animations API). `prefers-reduced-motion`은 모션 제거 + **대기 시간도 제거**.
- **R6 raw hex 금지** — `var(--token)`만. Crown Gold 단일 포인트, Crimson/Turquoise는 좌/우 상태색으로만. `npm run check:hex` 통과.
- **R7 팬 노출 문구 = i18n 키 + 표시 용어** — 하드코딩 금지, "Voter" 금지, **'판'은 "참여"로 순화**, **"표" 낱말 금지 → "선택"**, 전투 은유 금지. **새 문구는 커밋 전 대표 승인 게이트**(전후 비교표).
- **R8 계측 5종 보존** — `tournament_start`·`round_advance`·`champion_confirmed`·`first_vote`·`match_session_id`. 이벤트명·파라미터 변경 금지. 발화 지점이 옮겨가더라도 1회성 가드 유지. **`first_vote`의 "판당 1회" 판정 키(회차 포함)를 깨뜨리지 마라.**
- **R9 대관 연출은 크라운 카드로 자동 전환하지 않는다** — 정지 프레임 + 탭 대기. 정지 프레임은 그 자체로 완성된 화면(사전등록 캡처 소재).
- **R10 CROWNED 문구는 폰트** — 이미지 금지(다국어). ko "크라운 획득" / en "CROWNED" / es "CORONADO" (2026-09-03 확정, i18n 키 `arena.ceremony.crowned`).
- **R11 반복 재생 배려** — 하루 최대 5판이라 같은 팬이 대관 연출을 하루 5번 본다. 탭 건너뛰기는 **연출 시작 즉시부터** 동작해야 하고, 건너뛰기 힌트가 필요한지는 대표 판단(문구 승인 게이트).

## §5 Phase 분할 (Phase = 커밋 1개, 각 Phase TDD RED→GREEN→REFACTOR)

> **순서 주의**: v0.95에서 대관 연출을 **선행 소킥 ARENA-1a**로 분리했다. 자산 6종이 도착해 있으면 **F를 먼저** 하고 A~E로 간다. 자산이 없으면 A부터 시작하고 F는 자산 도착 후.

- **F ★대관 연출 (ARENA-1a, 선행 가능)**: 현재 `FinalPickView` 위에 `CeremonyStage` 7층 레이어 + `useCeremonyTimeline`(WAAPI) + 탭 건너뛰기(`finish()`) + reduced-motion 정지 프레임 + `ceremony_viewed/skipped` 계측 + 탭 후 `CrownCardModal`. **2판째 이후 재생·건너뛰기 테스트 필수(R11).** E2E `arena1-ceremony`.
- **A 무대 골격**: `SplitStage`(100vw/vh flex, 좌우 `StageSide`) + 상태 머신(`idle | focusL | focusR | pickedL | pickedR | loading`) 순수 모듈 `lib/arena/stageState.ts`(유닛 테스트) → `MatchView` 교체. 모바일 = 상하 2탭.
  - ⚠️ **2026-09-12 정정**: 이 줄에 있던 "문구 0개"는 티오가 만든 말로 대표 승인이 없어 삭제한다. 무대에서 금지된 것은 §합격기준 29행의 **라운드 라벨·득표율·마감 타이머·고지문(`vs-foot`)** 네 가지뿐이며, **이름·국적·소속·영상 설명은 무대 위 오버랩 허용**이다. 배치는 대표 그림이 정본(결정 원장 D-11).
- **B 재생·프리로드**: `StageSide`에 LoopPlayer 조건 마운트(focus 쪽만, R3/R4), 반대쪽 포스터. `useNextMatchPreload`. 유닛: focus 전환 시 마운트 수 ≤ 1.
- **C 픽 연출 + 오버레이 축소**: 픽 시 선택 쪽 확장 절정(320ms) → 서버 응답 대기 스피너는 선택 쪽 안에서만. 실패 시 원위치 + 토스트(기존 오류 키).
- **D 라운드 전환 재설계**: 와이어프레임 `.rt-rings`·코너 라벨·`.rt-meta` 복원, 문구 i18n, 표시 용어, reduced-motion 시 hold 2000→0.
- **E 결승 3분할**: `SplitStage` 3분할 변형, 크라운 글리프 복원, 픽 → Phase F 연결.
- **G 첫 입장 팝업**: `ArenaIntroModal`(focus-trap 재사용, localStorage `wc48:arena:intro:v1`), 문구 승인 게이트, 개인정보 고지 정합.
- **★M9 랭킹 상시 공개**: ① `firestore.rules`의 `ranking_cache`(및 `history` 하위) 읽기 조건에서 **`tournamentDeadline < request.time` 삭제** — 인증 여부 조건은 대표 확인 후 결정(기본: 누구나 읽기) ② `app/arena/[tournamentId]/ranking/page.tsx`의 `deriveState`에서 **`locked` 분기 제거** ③ `RankingHeader`의 "다음 발표" 한 줄 **노출 활성화**(PR 3에서 코드·문구·테스트 완비, prop만 연결) ④ **새벽 구간(KST 00:00~08:59) 문구 1건**은 승인 게이트 — 승인 전까지는 그 구간만 줄을 감춘다 ⑤ E2E: 마감 남은 대회의 랭킹 화면에 숫자가 뜬다 + "다음 발표" 줄이 3언어로 뜬다.
- **H 문구·규범 문서**: 잔여 하드코딩 제거(grep 0건), `vs-foot` 삭제, "카드 준비 중…" 키화, **'Vote Now'·'투표' 낱말 교체(승인 게이트)**, CLAUDE.md·C1-vote-engine·wireframe 배너·LANGUAGE.md 갱신.
- **I** PR(4블록) → CI(hex-guard·vitest·E2E) → 프리뷰 눈검증(티오 프리플라이트 → 대표) → 머지 → Vercel 배포 + **`firestore:rules` 배포(M9 반영)** → 프로덕션 GA4 DebugView 계측 7종 확인.

## §6 Auto-STOP 조건

- 킥 문면과 리포 실물이 다름(파일 없음·구조 다름) → STOP: 근거 경로 + 권장안.
- R1을 지키면 요구를 못 지키는 상황 → STOP: 화면 로컬 상태 대안 제시.
- 모바일 "1탭 = 재생·확대, 2탭 = 선택" 규칙이 기존 E2E(1탭 선택 전제)와 충돌 → STOP: 테스트 갱신 범위 제시.
- Claude Design 번들의 값이 §1 확정 스펙(flex 1.5~2, scale 1.1 등)과 다름 → STOP(기본: **킥의 수치 규칙 > 번들의 시각 디테일**).
- 대관 자산 6종 중 누락·규격 불일치(투명 배경 아님, 여백 잘림, SVG에 고정 hex/필터) → STOP: 플레이스홀더 진행 여부 확인.
- 첫 입장 팝업 문구·개인정보 고지 문안·'Vote Now' 대체어·새벽 구간 문구가 문서에 없음 → **추측 금지**, STOP(대표 승인 게이트).
- 계측 파라미터를 바꾸지 않고는 구현이 안 될 때 → STOP.
- **M9에서 랭킹을 열면 `ranking_cache` 문서에 `voteCount`(내부 전용)가 실려 있다** — 규칙은 필드 마스킹을 못 한다. 화면이 절대 렌더하지 않는지 E2E로 확인하고, 값이 노출되면 STOP.
- `firestore:rules` 배포 권한 필요 → STOP: 사람이 할 절차.

## §7 검증 하네스

| | 무엇 | 통과 기준 |
|---|---|---|
| 기계 | `npx vitest run` · `cd functions && npm run build` · `npm run check:hex` · `npx tsc --noEmit` | 전부 green, 위반 0건 |
| 기계 | `grep -rn "Voter" components/arena app/arena --include=*.tsx` (팬 노출 문자열) | 0건(코드 식별자 제외) |
| 기계 | `grep -rn "vs-foot\|vsFoot\|Next match\|Choose your Champion" components/arena app/arena` | 0건 |
| 기계 | 금지어: `grep -rn "5표\|46표\|투표 무제한" app lib components` | 0건 |
| 기계 | Playwright: `c1-arena-flow` · `c2-crown-card-flow`(결승 픽 → **대관 → 탭** → 모달) · `hf3-guest-run` · RUN-1 회귀(5판·게스트 3판·마감) · 신규 `arena1-split-stage`(스플릿 렌더·라운드/득표율 요소 부재·재생 iframe ≤1) · `arena1-ceremony`(2.5~3.2초 후 정지·탭 건너뛰기·**2판째 재생**·reduced-motion 즉시 정지) · 신규 `arena1-ranking-open`(마감 전 랭킹에 숫자가 뜬다) | 100% PASS, Console 에러 0건 |
| 기계 | Lighthouse 모바일(매치 화면) | Performance ≥ 80 |
| 사람 | 프리뷰 데스크톱 1440·모바일 390: 스플릿 호버/탭 확대·재생, 전환 화면, 결승, 대관 정지 프레임 캡처 1장 | 콘티(§C)와 육안 일치 — 디자이너 대표 판정 |
| 사람 | 프로덕션 머지 후 로그인 완주 1회 + GA4 DebugView | `tournament_start`·`first_vote`·`round_advance`×4+final·`champion_confirmed`·`ceremony_viewed` 발화, `match_session_id` 부착 |

## §8 PR 본문 4블록

A 무엇을 했나 · B 어떻게 확인했나(실측 수치·캡처) · C 판단이 필요했던 것 · D 핸드오프와 달랐던 점 · E 리뷰어 체크리스트(사용자 영향 한 줄: "매치·결승·라운드 전환 전면 교체 + 랭킹 상시 공개, 참가 규칙·투표 데이터 무변경").

## §9 준비물 (사람만 할 수 있는 것)

- [ ] **대표**: Claude Design 산출물(§C) → "Send to Claude Code" 번들.
- [ ] **대표**: 대관 자산 6종(투명 PNG 3배, `crown_main.svg`는 `fill=currentColor`·필터 없음·정사각 viewBox·패스만) → `public/ceremony/`. **현재 미제작.**
- [ ] **대표 승인 게이트(문구)**: 첫 입장 팝업(ko/en/es) · 라운드 전환 · 결승 헤더 · "카드 준비 중…" · 개인정보 고지 · **'Vote Now' 대체어** · **새벽 구간 "다음 발표" 문구 1건**.
- [ ] **대표 확인**: M9에서 랭킹 읽기를 **비로그인에게도 열 것인지**(기본안: 연다 — 공유 링크로 들어온 사람이 바로 봐야 확산이 된다).
- [ ] **대표**: `firebase deploy --only firestore:rules` 시점 — 티오가 안내.

## §10 "핸드오프와 달랐던 점" 보고 의무

최종 보고에 킥 문면과 다르게 한 모든 것(실측 차이·없던 파일·판단 변경·번들과의 차이)을 기록한다.

## §11 정리

- [ ] 브랜치 삭제 · 메모리 갱신 · `LESSONS.md` · 이 문서 하단 완료 표시 · 마케팅에 "대관 연출 구현 완료 + 정지 프레임 캡처" 회신.

---

## §D 대관 연출 기술 메모 (Claude Code용)

- 타임라인: `useCeremonyTimeline(root, { reducedMotion })` — `element.animate(keyframes, { duration, delay, easing, fill: 'forwards' })` 7개를 한 컨트롤러로 묶고, `skip()` = 모든 `Animation.finish()`. 완료 콜백 후 `data-ceremony="hold"` → 탭 리스너 등록 → `CrownCardModal`.
- 레이어 z-order(아래→위): dim(1) · loser×2(2) · champion(3) · glow_back(4) · crown(5) · sparkle×N(6) · CROWNED(7). `glow_front`(선택) = crown 위, sparkle 아래.
- 크라운 등장 이징: **등장 방식(점등·확대·솟아오름 등)은 Claude Design 번들을 따른다** — 위에서 내려와 씌워지는 하강은 쓰지 않는다(2026-09-10 대표 확정). 오버슈트가 필요하면 `cubic-bezier(.2,.9,.3,1.15)`. 등장 절정(≈0.8s)에 `glow_back` 확대 0.6→1.0 + opacity 0→.9, crown 밝기는 **두 겹 SVG 크로스페이드**(filter 애니메이션 금지 — R5).
- 자산 로딩: 결승 화면 진입 시 6종 `<link rel=preload as=image>`.
- reduced-motion: 정지 프레임 즉시 렌더, 탭 대기 동일. `ceremony_viewed` 파라미터 `reduced_motion: true`.
- 계측: `ceremony_viewed { tournament_id, champion_id, reduced_motion, match_session_id }` 정지 프레임 도달 시, `ceremony_skipped { elapsed_ms, match_session_id }` 도중 탭 시. **`match_session_id`는 RUN-1 PR 3의 `lib/analytics/matchSessionId.ts` 를 그대로 쓴다 — 새로 만들지 마라.**
- 실패 안전: 자산 로드 실패 시 크라운 글리프(기존 SVG) 폴백, 연출은 진행.

---

## §12 변경 부록 v1.2 (2026-09-18 · 대표 승인) — 이 부록이 §0·§1·§5 A와 다르면 부록이 이긴다

**A. 무대 수치 정정 — 결정 원장 D-11·D-12·D-17이 정본.** 이 문서 §0·§1·§5 A에 남은 옛 값은 무효다.

| 이 문서의 옛 값 (무효) | 정본 (원장) |
|---|---|
| 100vw × 100vh 화면 전체 스플릿 | 무대 프레임 **1320 × 680**(칸 640×2 + 안쪽 패딩 20), 화면 좌우 여백 60, 메뉴 → 안내 문구 → 무대 → 배너 4층 (D-08·D-11) |
| 호버 시 flex 1.5~2배로 벌어짐 + scale 1.1 | 칸 **120% 확대**, 옆칸 쪽으로 커지며 옆칸 위로 겹침 + 포스터 줌 1.06 (D-11) |
| 채도 30% → 100% | 기본 100%, **옆칸만 50%** (D-11) |
| 10초 무음 루프 | **15초** 무음 루프 (D-12) |
| 모바일 = 상하 2탭만 | 세로 = 상하 2분할 / **가로 = 좌우 50:50 자동 전환**, 가로에서는 메뉴 없음 (D-17) |
| Auto-STOP "번들 값이 flex 1.5~2·scale 1.1과 다름" | 삭제. 대신 **번들 값이 원장 D-11·D-17과 다르면 STOP** |

**B. 메뉴바(공통 부품 `components/layout/Navbar.tsx`) — 이 킥에서 하는 것**
- 상단 메뉴를 **The Pitch · The Arena · Newsroom · Locker Room** 으로. The Lab은 관리자 로그인 시에만. "Vote Now" 삭제(M6 낱말 교체와 함께).
- 오른쪽 끝은 기존대로 언어 토글 → 로그인/아바타. **디자인 1A에 있던 노란 "선택 이어가기"는 메뉴바에 넣지 않는다.**
- ☰ 버튼은 기존 위치(왼쪽 끝) 유지.

**C. 이 킥에서 하지 않는 것 → 후속 소킥 NAV-1 (ARENA-1 머지 뒤, ARENA-2 전)**
- **"선택 이어가기" 버튼 (D-18)** — 메뉴 층 바로 아래 안내 문구 층 오른쪽 끝, 아바타와 세로 정렬. 끝내지 않은 참여가 있을 때만 표시. 3언어 키 신설(ko 선택 이어가기 / en Continue your picks / es Continuar tus elecciones). 데이터는 기존 `roundProgress`.
- **☰ 사이트맵 서랍 재설계 (D-19)** — `lib/layout/domains.ts`·`SiteMapSheet` 교체: 단어 나열 + ▸ 토글 하위 펼침, 팬용 5항목(The Pitch · The Arena ▸ · Newsroom ▸ · Locker Room · Policy Hub ▸) + 언어 + 로그인 · 관리자 항목은 로그인 시만. Launch Pad 제외. Locker Room "Coming soon" 해제. The Arena 링크 `/arena/dev-preview` → 아레나 홈(ARENA-2 전까지는 진행 중인 대회 목록). 3언어.
- 이유: 메뉴바·서랍은 다섯 도메인 공통 부품이라 아레나 킥에 넣으면 범위가 새고 E2E가 전 도메인에 걸린다. 디자인만 지금 클로드 디자인 1A 아트보드에서 함께 그린다 (`outputs/ARENA-1_ClaudeDesign_전달사항_v1.2_2026-09-18.html`).

**D. 디자인 진행 상태** — 화면 1A(VS 스플릿 무대, 상태 5종, 데스크톱+모바일 세로+모바일 가로) **합격 2026-09-18**. 다음 = 메뉴바·서랍 수정(위 전달사항) → 화면 1B(선택 확정 연출).

*v1.2 부록 · 2026-09-18 · 티오*

*v1.1 본문 · 2026-09-10 · 티오*
