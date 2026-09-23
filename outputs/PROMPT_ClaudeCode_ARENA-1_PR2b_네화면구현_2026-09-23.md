# Claude Code 전달 프롬프트 — ARENA-1 PR 2b (선택 확정 연출 · 라운드 전환 · 결승 3분할 · 첫 입장 팝업 + 배너 970×90/320×100)

> 대표님은 아래 `---8<---` 사이의 내용을 **통째로 복사해 Claude Code 입력창에 붙여넣기**만 하시면 됩니다.
> 작성: 티오(Cowork) · 2026-09-23 · 디자인 정본 = `docs/design/claude-design/Arena_Match_Stage_v2_27boards_2026-09-22.dc.html` (2026-09-22 대표 합격)
> 전제: PR 2a(#105)가 main에 머지된 뒤 시작한다. 머지 전이면 §0에서 STOP.

---8<--- 여기서부터 복사 ---8<---

WorldCrown48 **ARENA-1 킥의 PR 2b** 를 시작한다. PR 1(#103, VS 스플릿 무대)과 PR 2a(#105, 가로 전체화면 · 게스트 안내 제거 · 문구 7건)는 머지됐다. 네 화면의 디자인은 클로드 디자인에서 **2026-09-22 대표 합격** 뒤 저장소에 들어와 있다. 정본 우선순위는 **① 결정 원장 > ② 디자인 정본 파일(아트보드 27장) > ③ 킥 §12 부록 > ④ 킥 본문** 이다. 디자인 파일의 값이 원장과 다르면 **원장이 이기고**, 보고하라.

## 0. 첫 동작
```
git fetch origin
git log --oneline origin/main -3
```
`origin/main` 맨 위에 **PR #105(PR 2a) 머지 커밋**이 없으면 STOP — "PR 2a가 아직 머지되지 않았습니다"라고 보고하고 기다려라. 있으면:
```
git checkout main && git rebase origin/main
git checkout -b feat/arena-1-pr2b-four-screens
```
- 작업 트리에 미커밋 문서가 있으면 되돌리지 마라(티오가 고친 원장·프롬프트). `git stash` → rebase → `git stash pop` 뒤 이 PR의 첫 `docs:` 커밋으로 넣어라.
- `.claude/` · `Claude outputs/` · `docs/design/claude-design/*.zip`은 **커밋 금지**(zip이 남아 있으면 커밋에서 빼고 보고).
- 충돌이 나면 멈추고 대표님께 보고하라.

## 1. 필독 (이 순서로 · 요약하지 말고 읽어라)
1. `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md` — **D-03 · D-06 · D-07 · D-08 · D-11 · D-13 · D-15 · D-17(+바뀜 2건) · D-19(+바뀜) · D-21(+바뀜 2건, 최신 = 09-21 "구글 광고 표준 크기") · D-24(대관 연출 폐기) · D-25(최애) · D-26(PR 분할) · D-28(크라운은 Crown Card에만) · D-29(결승 1.3배 · 띠 3색)**. "아니라고 한 것"을 반드시 읽어라.
2. `docs/design/claude-design/Arena_Match_Stage_v2_27boards_2026-09-22.dc.html` — **화면 정답.** 아트보드 번호: 1~9 매치 무대(PR 1로 구현됨) · **10~14 선택 확정 연출** · **15~18 라운드 전환** · **19~23 결승 3분할** · **24~26 첫 입장 팝업** · **27 확정 정지 상태(reduced-motion)**. 각 묶음 앞의 설명 단락과 Tweaks 값(`finalScale` 1.3 · `hoverScale` 1.2 · `posterZoom` 1.06)이 실물이다. 설명 글에 "1.12배"·"크라운 글리프"라고 남은 옛 문장은 **무효**(Tweaks와 원장 D-28·D-29가 이김).
3. `docs/design/claude-design/export_v2_2026-09-22/_ds/*/components/BannerSlot/` — 배너 부품 두 크기(desktop 970×90 · mobile 320×100).
4. `outputs/KICK_ARENA-1_v1.1_매치무대-대수술_2026-09-10.md` — §12 부록 + §12-E·F, §4 RULE R1~R8(R9~R11은 D-24로 무효), §5 C·D·E·G, §6 Auto-STOP.
5. `outputs/PROMPT_ClaudeCode_ARENA-1_PR1_스플릿무대_2026-09-19.md` §3 · `outputs/PROMPT_ClaudeCode_ARENA-1_PR2a_가로전체화면+문구정리_2026-09-20.md` §3 — 이미 만들어진 것.
6. 코드 실물: `components/arena/SplitStage.tsx` · `StageSide.tsx` · `stage.module.css` · `lib/arena/stageState.ts` · `stageLayout.ts` · `useStageViewport.ts` · `fullscreenGate.ts` · `RoundTransition.tsx` · `FinalPickView.tsx` · `arena.module.css` · `components/layout/BannerSlot.tsx` · `docs/design/arena_stage_tokens.css` · `lib/i18n/messages.ts`(`arena.round.*` · `arena.final.*` · `arena.stage.rotateHint` · `banner.default.*`) · `app/arena/[tournamentId]/page.tsx` · `e2e/arena1-split-stage.spec.ts` · `e2e/c1-arena-flow.spec.ts` · `e2e/c2-crown-card-flow.spec.ts`.

읽은 뒤 **"필독 6건 확인 · 원장 D-24 · D-28 · D-29 · D-21 최신(970/320) 확인 · 디자인 아트보드 27장 확인"** 을 먼저 출력하라.

## 2. 한 줄 목표
**PR 1의 스플릿 무대 위에 네 화면(선택 확정 연출 · 라운드 전환 · 결승 3분할 · 첫 입장 팝업)을 디자인 정본 그대로 얹고, 배너 자리를 970×90 / 320×100으로 바꾼다. 선택 엔진 · 탭 규칙 · 계측은 바꾸지 않는다. 크라운 표식은 무대 어디에도 넣지 않는다.**

## 3. 범위 — 이 PR에서 하는 것

### A. 선택 확정 연출 (아트보드 10~14 · 27 · 원장 D-11 · D-28)
- 고른 칸 확정 순간: 디자인 설명 단락의 타임라인 그대로 — 테두리(`--arena-cell-confirm-border`)·그림자 즉시 · 0→180ms 고른 칸 1.20 → 1.235 → 1.20 스냅(크기만) · 0→300ms **금색 고리 두 겹**이 0.55 → 1.5배로 퍼지며 투명해짐 · 옆칸 밝기 40% · **520ms 뒤** 기존 `onVote` 흐름으로 다음 매치. 값은 토큰으로(`arena_stage_tokens.css`에 `--arena-confirm-*` 추가). **크라운 글리프는 넣지 않는다**(D-28 — 디자인 데이터에 `crown` 항목이 남아 있어도 무시).
- 서버 응답 대기(아트보드 11): 고른 칸 **안** 오른쪽 위 작은 표시 하나("확인 중" — §5 게이트). 화면 전체를 덮지 않는다.
- 실패(아트보드 12): 크기 1.0 복귀 · 테두리 원복 · 옆칸 밝기 100% · 고른 칸 안 크림슨 한 줄 안내(§5 게이트). 오류 문구는 **기존 오류 키**를 재사용한다 — 새 키를 만들 이유가 있으면 STOP.
- 움직임은 크기·위치·투명도만(R5). `prefers-reduced-motion`(아트보드 27): 스냅·고리 없음, 테두리·그림자·옆칸 40% 즉시, **520ms 자동 넘김 대신 "다음 매치로" 버튼**(§5 게이트). 모바일 세로·가로 동일 문법(아트보드 13·14).
- **탭 규칙 불변**: 1탭 = 확대·재생, 2탭 = 확정. 전체화면(PR 2a) 동작과 충돌하면 STOP.

### B. 라운드 전환 (아트보드 15~18 · D-06 · R2)
- 전체화면 · 메뉴 없음 · 약 2초 자동 진행 + 진행 바 · **탭하면 즉시 넘어감**. 동심원 5겹(안쪽 2겹 선명 · 바깥 흐려짐) · 중심 금색 방사 그라디언트 한 겹(정지) · 방금 마친 라운드 작게·흐리게 · 다음 라운드 크게·금색(JetBrains Mono).
- **큰 라운드 글자는 디자인 파일 그대로 "ROUND OF 24" 형식**(CLAUDE.md 대진 흐름 #6과 일치 · 마지막은 THE FINAL). FIFA 명칭 금지. 라운드 이름은 이 화면에만(R2).
- 코너 라벨 4개 · "방금 마친 라운드" · "다음 무대가 곧 열립니다" · "탭하면 바로 넘어갑니다" — 전부 **§5 게이트**. 기존 키 `arena.round.completed` · `arena.round.next` · `arena.round.spectatorNote`는 이 화면의 새 배치에 맞게 **재사용**(값 변경 금지).
- reduced-motion(아트보드 18): 움직임·대기 없음, 진행 바 대신 "다음 라운드로" 버튼(§5 게이트).
- 배너 자리 **없음**(D-26).
- 계측 `round_advance`는 발화 지점이 옮겨가도 파라미터 동일(R8).

### C. 결승 THE FINAL 3분할 (아트보드 19~23 · D-06 · D-29 · D-28)
- `SplitStage`의 3분할 변형(또는 `FinalStage` 신설 — `stageState`를 3칸으로 일반화). 데스크톱 칸 426.67 정사각 3개 균등, 무대 프레임 1320×680 그대로 · 모바일 세로 232 정사각 3단 쌓기 · 모바일 가로 244 정사각 3칸. 칸 크기는 D-17 일반 규칙으로 계산(하드코딩 금지, 위 값은 검산값).
- 호버/1탭 확대 **1.3배**(`--arena-final-hover-scale`) · 가장자리 칸은 가장자리 기준, 가운데 칸은 가운데 기준 · 커진 칸이 옆칸 위로(z) · 옆칸 채도 50% · 재생은 한 칸만(R3·R4). 클릭/2탭 = 확정 → A의 확정 연출과 같은 문법 → **바로 크라운 카드**(D-24 — 대관 연출 없음, `ceremony_*` 계측 없음).
- 이름 띠 3색(D-29): 왼쪽 `--arena-band-left-*` · 오른쪽 `--arena-band-right-*` 재사용 · **가운데 = Crown Gold, 같은 투명도** — 토큰 `--arena-band-mid-bg: rgba(252,208,6,.22)` · `--arena-band-mid-border: 1px solid rgba(252,208,6,.65)` 신설. 모바일 세로에서는 위·가운데·아래.
- **크라운 표식 없음**(D-28). 라운드 라벨·득표율·타이머·고지문 없음(R2).
- 문구: `arena.final.eyebrow` · `title`("당신의 최애를 골라 주세요") · `sub` · `foot`는 PR 2a에서 승인·적용됨 — **그대로 쓴다.** 디자인 파일의 "마지막 한 자리 · 세 무대 중 하나"는 임시 글자였으므로 쓰지 않는다.
- 배너 자리: 매치와 같음(§D).
- 계측 `champion_confirmed` · `first_vote` · `match_session_id` 동일 파라미터(R8).

### D. 배너 자리 크기 교체 (원장 D-21 최신 · 아트보드 전부)
- `BannerSlot`을 두 변형으로: **desktop 970×90**(무대 프레임 아래, 가로 가운데) · **mobile portrait 320×100**(무대 아래 12px, 가운데) · **모바일 가로 없음** · 라운드 전환 없음. 옛 1320×140 · 폭 366 값 제거. 토큰 `--arena-banner-*` 갱신. 문구는 기존 `banner.default.*` 두 키(비로그인/로그인) 그대로. **빈 상자 금지**는 그대로.
- 다른 화면(아레나 홈·피치·뉴스룸)의 배너 자리는 이 PR 범위 밖(BANNER-1).

### E. 첫 입장 안내 팝업 (아트보드 24~26 · D-13 · D-17 ②)
- 신설 `components/arena/ArenaIntroModal.tsx` — 기기당 1회(`localStorage` `wc48:arena:intro:v1`), 닫기 전 선택 불가(focus-trap 재사용), 뒤 무대는 어둡게(디자인 값 78%). 구성: 작은 브랜드 줄(크라운 아이콘 + WORLDCROWN48 — **팝업은 무대가 아니므로 D-28 예외, 그대로 둔다**) · 환영 한 줄 · 데이터 안내 한 줄 · 필수 문장(Crown Card 공개 시점) · "시작하기" 버튼. **모바일 세로에서만** "가로로 돌리면 무대가 더 크게 열립니다"(`arena.stage.rotateHint` 재사용) 한 줄 추가. 데스크톱·모바일 가로에는 없음.
- 문구는 **§5 게이트(승인됨)** 값 그대로. 개인정보처리방침 표현과 어긋나지 않는지 `content/` 정책 문서와 대조하고, 어긋나면 STOP.
- 팝업 뒤 배너 자리는 그대로(§D).

### F. 문서
- 킥 §12-F 아래에 **"§12-G · PR 2b 시작 기록 (날짜)"**: 디자인 정본 파일명 · 아트보드 27장 · 이 프롬프트 파일명.
- `docs/design/WC48_DESIGN_SYSTEM_v4.md`에 배너 두 크기 · 결승 띠 3색 · finalScale 1.3을 **표식 방식**(D-22)으로 얹어라. 손편집 금지인 것은 css 사본이지 해설서가 아니다.

## 4. 하지 않는 것
- **대관 연출 · `ceremony_viewed/skipped` · `public/ceremony/` · CROWNED 문구** — 전부 폐기(D-24). 만들지 마라.
- **무대 어디에도 크라운 표식** (D-28) — 팝업 머리의 브랜드 아이콘만 예외.
- **PR 3**: 'Vote Now'→Pick Now(D-23) · M9 랭킹 상시 공개 · 규범 문서 4건(CLAUDE.md 대진 흐름 #5 · C1-vote-engine · wireframe 배너 · LANGUAGE.md) · `resolveLoopRange` 기본값.
- **NAV-1**(메뉴바 · ☰ 서랍 — Arena Home/K-POP/CREATOR · 뉴스룸 6개 카테고리 · "선택 이어가기") · **BANNER-1**(관리자 CRUD · 다른 화면 배너) · **COOKIE-1** · **FONT-1** · NAME-I18N-1 · 48강 그리드 · 프레임 프리즈 · 참가 규칙 재론.
- **R1 선택 엔진 불변** · **R8 계측 5종 불변**. 어기게 되면 STOP.

## 5. 승인 게이트 — 대표 답이 문서에 없으면 STOP (추측 금지)
| # | 자리 | ko | en | es | 상태 |
|---|---|---|---|---|---|
| 1 | 팝업 · 환영 | 48개의 무대, 당신의 선택은 | 48 stages. Your pick. | 48 escenarios. Tu elección. | ⏸ 대표 승인 대기 |
| 2 | 팝업 · 데이터 안내 | 선택은 이 기기에 저장되고, 로그인하면 계정으로 이어집니다. | Your picks are saved on this device and carry over to your account when you sign in. | Tus elecciones se guardan en este dispositivo y pasan a tu cuenta al iniciar sesión. | ⏸ |
| 3 | 팝업 · 필수 문장 | **Crown Card는 Tournament가 끝난 뒤 공개됩니다** | **Your Crown Card is revealed when the Tournament ends** | **Tu Crown Card se revela cuando termina el Tournament** | ✅ 승인됨 (2026-09-23 대표 · D-13 문구 갱신) |
| 4 | 팝업 · 버튼 | 시작하기 | Start | Empezar | ⏸ |
| 5 | 전환 · 코너 왼쪽 위 | 당신의 선택은 계속됩니다 | Your picks continue | Tus elecciones continúan | ⏸ |
| 6 | 전환 · 코너 오른쪽 위 | 남은 무대 {n} | {n} stages left | {n} escenarios restantes | ⏸ |
| 7 | 전환 · 코너 왼쪽 아래 | 다음 라운드 준비 | Next round ahead | Siguiente ronda en camino | ⏸ |
| 8 | 전환 · 코너 오른쪽 아래 | 탭하면 바로 | Tap to skip | Toca para saltar | ⏸ |
| 9 | 전환 · 큰 글자 아래 | 다음 무대가 곧 열립니다 | The next stage opens now | El siguiente escenario se abre ya | ⏸ |
| 10 | 전환 · 진행 바 옆 | 2.0s · 탭하면 바로 넘어갑니다 | 2.0s · Tap to skip ahead | 2.0s · Toca para saltar | ⏸ |
| 11 | 전환 reduced-motion · 버튼 | 다음 라운드로 | Next round | Siguiente ronda | ⏸ |
| 12 | 확정 · 응답 대기 | 확인 중 | Confirming | Confirmando | ⏸ |
| 13 | 확정 reduced-motion · 버튼 | 다음 매치로 | Next Match | Siguiente Match | ⏸ |
| 14 | 확정 실패 안내 | (기존 오류 키 재사용 — 새 문구 없음) | | | ✅ 규칙 |

- 낱말 규칙 D-03(투표·표·예측·배당 금지 · 판→참여) · 전투 은유 금지 · Tournament · Match · Crown Card는 3언어 영문 원형.
- **⏸ 항목은 대표 승인 뒤에만 커밋.** 승인 전에는 A·B·C·D의 모양·동작을 먼저 만들고, 문구 키 값이 필요한 Phase에서 STOP하고 이 표를 대표에게 보여 승인을 청하라.

## 6. 작업 방식 — Superpowers TDD (Phase = 커밋 1개)
0. `docs:` 미커밋 문서 + 이 프롬프트 + 킥 §12-G.
1. `BannerSlot` 두 크기 (유닛: 변형 2개 · 모바일 가로/전환 화면에서 미렌더).
2. `stageState` 3칸 일반화 + 확정 타임라인 순수 모듈(`lib/arena/confirmTimeline.ts` — 단계·시각 표, reduced-motion 분기) 유닛 RED→GREEN.
3. 확정 연출 A 화면 연결 → E2E: 확정 후 520ms 내 다음 매치 · 크라운 요소 0건 · reduced-motion에서 버튼 노출.
4. 라운드 전환 B → E2E: 라운드 이름이 **이 화면에만** · 탭 스킵 · `round_advance` 파라미터 동일.
5. 결승 C → E2E: 3칸 렌더(1440/390/844×390) · 호버 1.3 · 띠 3색 토큰 · 크라운 0건 · 확정 → 크라운 카드 모달(`c2-crown-card-flow` 회귀).
6. 팝업 E → E2E: 첫 진입 1회 · 닫기 전 선택 불가 · 세로에서만 회전 안내 · 두 번째 방문 미표시.
7. 문구 키 채우기(§5 승인 뒤) · `messagesContent.test.ts` 글자 단위 고정 · 하드코딩 grep 0건.
8. `npx vitest run` · `npx tsc --noEmit` · `npm run check:hex` · `cd functions && npm run build` green · 기존 E2E(`arena1-split-stage` · `arena1-pr2a` · `c1` · `c2` · RUN-1 회귀) 100% PASS · Lighthouse 모바일 ≥ 80(글꼴은 FONT-1 몫 — 그 원인이면 "판정 보류"로 표기).
9. **프리플라이트**: 1440×900 · 390×844 · 844×390에서 첫 진입 팝업 → 매치 → 확정 연출 → 라운드 전환 → 결승 → 크라운 카드까지 끝까지 걸어 보고 ko/en/es 콘솔 에러 0을 표로 보고한 뒤에만 대표 눈검사를 청하라. 눈검사는 **자동이 못 보는 것만**(연출의 느낌 · 띠 색 · 팝업 첫인상).

## 7. 완료 조건
- 네 화면이 아트보드 27장과 육안 일치(디자이너 대표 판정) · 크라운 표식 무대 0건 · 배너 970/320 · 결승 1.3배 · 띠 3색 · 라운드 이름은 전환 화면에만 · 팝업 기기당 1회.
- 계측 5종 동일 파라미터 · Console 에러 0 · 하드코딩 문구 0 · 기계 검증 green · E2E 100%.
- PR 본문 4블록 + "핸드오프와 달랐던 점" + §5 승인 상태 + 프리플라이트 표. 머지는 브랜치 → PR → 병합(`git push origin main` 금지). 사람 절차(rules·functions 배포) 없음 — 생기면 보고.

## 8. Auto-STOP
- 디자인 값이 원장(D-11 · D-17 · D-21 · D-28 · D-29)과 다름 → 원장이 이김, 보고 · §5 미승인 문구 · R1/R8 위반 없이 불가 · 탭 규칙/전체화면과 충돌 · 팝업 문구가 정책 문서와 어긋남 · `localStorage` 차단 환경에서 팝업이 매번 뜨는 설계 · 킥 문면과 실물이 다름 · PR 2a 미머지.

## 9. 보고 형식
Phase마다: 무엇 / 어떻게 확인(명령·결과) / 판단 필요 / 다음. 마지막에 §7 표 + §5 상태 + 프리플라이트 표 + 눈검사 요청(온전한 문장으로).

---8<--- 여기까지 복사 ---8<---

## 부록 — 티오 실측 (복사 범위 밖)
- 2026-09-23 01:25 KST 로컬: 현재 브랜치 `feat/arena-1-pr2a-fullscreen-copy`(맨 위 `abc7870`), `main`/`origin/main` = `b120825`(#104 머지) — **#105는 아직 미머지.** §0의 STOP 조건이 이 상황을 잡는다.
- 디자인 파일 실측: finalScale 기본 1.3 ✅ · 배너 970/320 ✅ · 서랍 Arena Home/K-POP/CREATOR ✅ · 뉴스룸 6개 ✅ · 크라운은 메뉴바 로고·팝업 머리에만 ✅(대표 캡처 확인) · 결승 가운데 띠 노란 반투명 ✅(대표 캡처). 설명 글의 "1.12배"·"크라운 글리프"는 옛 문장.
- 팝업 문구 3번은 D-13의 "라운드가 끝난 뒤"를 "Tournament가 끝난 뒤"로 갱신한 것 — 원장 D-13 바뀜으로 기록함.
