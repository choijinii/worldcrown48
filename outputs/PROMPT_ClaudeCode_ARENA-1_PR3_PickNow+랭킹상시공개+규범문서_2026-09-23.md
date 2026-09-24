# Claude Code 프롬프트 — ARENA-1 PR 3: 'Vote Now' 교체 · 랭킹→차트 · Crown Score v1.0 · 차트 상시 공개 · 규범 문서 (2026-09-24)

> 대표님은 아래 `---8<---` 사이를 통째로 복사해 **`/clear` 한 새 Claude Code 세션**에 붙여 넣으시면 됩니다.
> 작성: 티오. **이 PR로 ARENA-1 킥이 끝납니다.**
> v2.0 (2026-09-24 KST) — 마티오 정본 `CROWN_SCORE_v1.0`(대표 결정 2026-09-23)을 합침: 랭킹→차트 이름 전환 · Crown Score 새 산식 · 10판 기준. 0단계 조사 보고(STOP) 추가.
> v1.2 (2026-09-23 23:25) 관리자 화면 '투표' 낱말 수정 · Vote Rate/득표율 폐기 / v1.1 (23:10) git 위생 · grep 실측 · 규칙 테스트 뒤집기.

---8<--- 여기서부터 복사 ---8<---

# ARENA-1 PR 3 — 'Vote Now' 교체 · 랭킹→차트 · Crown Score v1.0 · 차트 상시 공개 · 규범 문서

## 0. 시작 전 확인 (STOP 조건)
- `git checkout main && git pull` 뒤 `git log --oneline -3`에 **PR #106(ARENA-1 PR 2b)** 머지 커밋이 보여야 한다. 안 보이면 **STOP**하고 보고.
- 브랜치: `git checkout -b feat/arena-1-pr3-chart-crownscore`
- **main에 직접 push 금지.** 모든 변경은 이 브랜치 → PR → 대표 머지.
- `.git/index.lock` 이 있으면 git이 멈춘다. 있으면 **STOP**하고 보고(지우지 말 것). ※ `.git/index.lock.stale-cowork-0923` 은 티오가 남긴 빈 잠금 파일을 이름만 바꿔 둔 것 — 무해, 지워도 된다.
- **`git add -A` · `git add .` 금지 — 파일 이름으로만 add.** 커밋하면 안 되는 것: `Claude outputs/`(익명 uid 목록) · `.claude/` · `다름이름으로 저장/`(대표 참고 사진) · `docs/design/claude-design/export_v2_2026-09-22/uploads/`.
- 티오·마케팅 문서는 **이 PR에 별도 docs 커밋으로 함께 넣는다**(내용 수정 금지): `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md`(미커밋 추가분) · 이 프롬프트 파일 · `outputs/SESSION-HANDOFF_2026-09-23_티오-다음세션_PR3착수.md` · `marketing/00_strategy/CROWN_SCORE_v1.0.md`.

## 1. 필독 (순서대로, 판단 전에 연다)
1. **`marketing/00_strategy/CROWN_SCORE_v1.0.md`** — **Crown Score·차트의 정본(2026-09-23 대표 결정).** 이 문서와 코드·다른 문서가 다르면 이 문서가 이긴다. 특히 옛 Crown Score(2026-07-11: 우승비율×50% + 점유율×50%, LANGUAGE.md §13)와 옛 점유율 정의(받은 선택 ÷ 대회 전체 선택)는 **이 정본으로 대체**된다.
2. `outputs/DECISIONS_결정원장_v1.0_2026-09-11.md` — D-02(게스트 선택은 랭킹 제외) · D-03(낱말 규칙) · D-05(발표 하루 두 번 + 마감 시각 1회) · D-23 · **D-30(상시 공개 · 비로그인 포함)** · D-24.
3. `outputs/KICK_ARENA-1_v1.1_매치무대-대수술_2026-09-10.md` — M9 절 · H 절만. §12 부록이 본문을 이긴다. "대관 연출"은 전부 폐기(D-24).
4. 코드: `functions/src/scheduleRankingCache.ts` · `functions/src/core/rankingAggregator.ts` · `functions/src/core/scheduleRankingCacheCore.ts` · `lib/ranking/*` · `app/arena/[tournamentId]/ranking/page.tsx` · `components/ranking/*` · `firestore.rules`의 `ranking_cache` 절 · `tournament_runs` 판 원장 관련(`lib/run/*`, `functions/src/onVote.ts`).

## 2. 이 PR의 범위 (IN)
| # | 무엇 | 근거 |
|---|---|---|
| 0 | **조사 보고 — 코드 쓰기 전 STOP** | 정본 · 마케팅 확인 요청 4건 |
| A | 메뉴바 "Vote Now" → ko 참가하기 · en Pick Now · es Elige ahora | D-23 |
| B | 화면의 '투표·Vote·Voter·Vote Rate·득표율' 전수 교체 (관리자 화면 포함) — 승인 게이트 | D-03 · 대표 2026-09-23 |
| C | 화면 이름 '랭킹' → **'차트'** (ko 차트 · en Charts · es 마케팅 문안 대기) | 정본 §1 |
| D | **Crown Score v1.0 계산** (판 순위 점수 10/5/2 → 비율 3개 → 40:30:30 × 1000) + 차트를 Crown Score 순으로 | 정본 §2~4 |
| E | **10판 기준** — 대회 전체 완주 판수 10 미만이면 점수 없이 기다림 안내, 차트 자리는 숨기지 않음 | 정본 §5 |
| F | 차트 상시 공개 — rules 마감 게이트 삭제(비로그인 포함) · `locked` 제거 · "다음 발표" 줄 켜기 | D-30 |
| G | 규범 문서 갱신 | H · Stale-Doc Guard |
| H | 테스트 · 계측 보존 | §6 |

## 3. 할 일

### 0단계. 조사 보고 — **코드를 한 줄도 쓰기 전에 아래를 표로 보고하고 STOP**
대표·티오가 읽고 "진행"이라고 답하기 전에는 다음 단계로 가지 않는다. 각 항목에 **근거 파일·행**을 붙인다. 모르는 것은 "모름"이라고 쓴다.
1. 지금 코드의 순위 산식이 무엇인지 — 정본과 다른 점을 한 줄씩.
2. 지금 저장된 데이터로 **대결에 나온 횟수(appearances)** · **대결에서 뽑힌 횟수(picks)** 를 셀 수 있는지. 결승(3인 중 1명 선택)을 "대결 1번"으로 셀 수 있는지.
3. **판 1회의 순위**(1등 = 결승에서 고른 1명 · 2등 = 결승 3인 중 나머지 2명 · 3등 = 6강에 올랐지만 결승에 못 간 3명)를 판 기록에서 꺼낼 수 있는지. **완주한 판만** 골라낼 수 있는지.
4. **게스트 판을 빼고 셀 수 있는지** — D-02(게스트의 선택은 랭킹 집계 제외, 2026-09-07 이후분만)는 그대로 유효하다. Crown Score의 모든 값과 **10판 기준의 판수에서도 게스트 판은 뺀다**.
5. 재계산 시점 — **D-05 그대로**(KST 09:00·21:00 하루 두 번 + 대회 마감 시각 1회). 판이 끝날 때마다 다시 계산하지 않는다. 이 방식으로 구현 가능한지, 비용(읽기 수)이 지금보다 얼마나 늘어나는지 추정.
6. 이미 쌓인 데이터(런칭 전 테스트 판)로 소급 계산이 되는지, 아니면 앞으로 쌓이는 것만 되는지.
7. 위 2·3이 **불가능하면** 무엇을 새로 기록해야 하는지(필드·문서 이름 제안)와 그 경우 이 PR을 둘로 나눌지에 대한 의견. **스스로 결정하지 말고 STOP.**

### A. 메뉴바 CTA 교체 (D-23 — 승인 불필요)
- `components/layout/Navbar.tsx` 115행 근처의 하드코딩 `Vote Now`를 i18n 키 `nav.cta.enter`로. 값 `ko "참가하기" · en "Pick Now" · es "Elige ahora"`. 파일 상단 주석의 "Vote Now" 설명도 고친다.
- 계측 이벤트 이름 `a1_gnb_cta_vote_now`는 **바꾸지 않는다**(코드 식별자). 링크 목적지는 그대로.

### B. 금지 낱말 전수 교체 (승인 게이트 — §5)
- `grep -rn -E "투표|Vote|Voter|표를|표가|표심|득표|Vote Rate|VOTE RATE" app components lib --include=*.ts --include=*.tsx` 로 **화면에 보이는 문자열**만 골라낸다. 코드 식별자(`voteCount`, `voteRate`, `votes` 컬렉션, `onVote`, `a1_gnb_cta_vote_now`, 파일명, 주석)는 건드리지 않는다.
- **관리자 화면도 포함한다(대표 2026-09-23 "수정해야 해")** — `components/admin/dashboard/*` · `components/admin/newsdesk/*` 등.
- **"Vote Rate / VOTE RATE / 득표율"은 폐기된 낱말(대표 2026-09-23)** — 화면에서 모두 없앤다. 랭킹 화면의 "VOTE RATE (%)" 표시는 D(Crown Score)로 대체된다.
- 티오가 미리 찾은 것(화면 글자) — 전부 §5 게이트에 올린다: `pitch.hero.cta.start` · `arena.vote.failed` · 랭킹 `LABELS`(kicker·note·emptyTitle·emptySubtitle·lockedTitle·lockedSub — ko·en만 있고 **es 없음**) · `UserDropdown`/`UserAvatar`의 대체 이름 "Voter" · `app/account/page.tsx` 201행 · `DeleteAccountModal` 332·355행 · `app/layout.tsx` 20행 · `app/launch/layout.tsx` 17행 · `KPICards` · `VoteSpeedChart` · `AlertList` "랭킹 이상 징후" · `GeneratePanel` "주간 랭킹 동향" · 로그인 창 `guestLimitSub`("내 선택이 랭킹에 반영돼요").
- 약관·개인정보 처리방침(Policy Hub) 안의 "Voter"는 법적 정의어라 **이 PR에서 손대지 않는다.**

### C. '랭킹' → '차트' (정본 §1)
- 화면에서 대회 순위표를 가리키는 '랭킹/Ranking/Rankings'를 **ko "차트" · en "Charts"(한 개는 "Chart")** 로. es는 **마케팅 문안이 올 때까지 게이트에서 대기**(§5).
- **'랭킹'이라는 낱말 자체는 없어지지 않는다** — "차트 안에서의 등수"를 뜻하는 일반 명사로 남는다(예: "랭킹 2위"). 뉴스 기사 본문의 "랭킹 N위"는 바꾸지 않는다.
- 주소(`/arena/[id]/ranking`)·폴더·변수·컬렉션 이름(`ranking_cache` 등)은 **바꾸지 않는다**(정본: "내부 이름은 개발 편한 대로"). 주소를 바꾸고 싶으면 STOP하고 물을 것.
- 뉴스룸 카테고리 주소 `rankings` → `charts`: 코드에 뉴스룸 카테고리가 아직 없으면 **문서(뉴스룸 기획·LANGUAGE.md)만** 고치고 보고에 적는다.

### D. Crown Score v1.0 계산 (정본 §2~4 — 0단계 "진행" 뒤에만)
- 판 1회(완주한 판만, 게스트 판 제외): 1등 10점 · 2등 5점×2 · 3등 2점×3 · 나머지 0 (합계 26 고정).
- 대회 단위 누적: `runs_total`(대회 전체 완주 판수) · `placement_points` · `wins` · `picks` · `appearances` (이름은 바꿔도 됨).
- 계산:
  - 순위점수율 `placement_rate = (placement_points / runs_total) / 10`
  - 우승율 `win_rate = wins / runs_total`
  - 점유율 `share_rate = picks / appearances` (appearances 0이면 0)
  - `crown_score = round((placement_rate*0.4 + win_rate*0.3 + share_rate*0.3) * 1000)` — 0~1000 정수
- **검산 단위 테스트 필수**: runs_total 1,000 / placement_points 5,150 / wins 300 / picks 3,750 / appearances 4,450 → **549**.
- 차트 정렬 = Crown Score 높은 순. 동점 처리 규칙은 지금 코드(1·1·3)를 따른다.
- 계산 위치는 **순수 함수(core)** 로 두고 `scheduleRankingCache` 는 입출력만 — 지금 구조 그대로. 재계산 시점은 D-05 그대로.
- `ranking_cache` 에 Crown Score와 세 비율을 싣는다. 이상 징후 감지(T-1~T-4, 관리자 알림)는 **지금 동작을 유지**하되, 바뀐 데이터 모양 때문에 깨지면 STOP.
- 화면: 순위 · 이름 · 아바타 · **Crown Score(정수)**. 세 비율을 화면에 보일지·어떻게 보일지는 **이 PR에서 정하지 않는다** — 설명창 자리만(아래).
- **설명창(툴팁) 자리만 만든다** — Crown Score 옆 "?" 자리. 문구는 마케팅이 정본을 근거로 따로 지어 보낸다. 문구가 오기 전에는 **빈 채로 숨겨 둔다**(임시 문구를 지어 넣지 말 것).
- 선택 수(`voteCount`) 등 **절대 수치는 여전히 화면 금지**. Crown Score는 비율로 계산된 점수라 표시 허용(정본).

### E. 10판 기준 (정본 §5)
- 대회 전체 완주 판수(게스트 제외)가 **10 미만**이면: 차트 화면은 열리고, 점수·등수 없이 안내 문구만. ko **"아직 참여가 적어요. 조금만 기다려주세요!"**(정본 확정 문구 — 승인 불필요). en·es는 **마케팅 문안 대기**(§5).
- **10판 전에도 차트로 가는 길(메뉴·링크)을 숨기지 않는다.**
- 안내 문구에 '참가자'를 쓰지 않는다('참가자' = 대회에 나오는 48명).
- 기준 판수는 **캐시에 실어 오는 값**으로 판정한다(화면에서 따로 세지 않는다). 판수 자체는 화면에 보이지 않는다.

### F. 차트 상시 공개 (D-30)
1. `firestore.rules` — `ranking_cache` 와 `history` 하위 `allow read` 에서 `tournamentDeadline < request.time` **삭제**. 대회 문서가 있으면 누구나(비로그인 포함) 읽기. 주석의 "W-7 · 표심" 문장을 D-30 사유("발표는 보여주려고 하는 것")로. 파일 상단 경로 목록(11행) 설명도.
2. `ranking/page.tsx` — `deriveState` 의 `locked` 분기 제거, `RankLocked`·`lockedTitle/lockedSub` 는 쓰는 곳이 없어지면 지운다. `SHOW_NEXT_UPDATE_LINE = true`, 긴 주석은 한 문단으로. 마감 뒤(`deadlineMs <= now`)에는 "다음 발표" 줄을 감춘다. 새벽 구간(KST 00:00~08:59) 문구는 새로 만들지 말고 지금처럼 감춤.
3. **기존 테스트 뒤집기** — `tests/rules/ranking-rules.test.ts` 의 "DENIES read BEFORE the Deadline (locked)"는 D-30과 반대 → **"ALLOWS read BEFORE the Deadline (비로그인)"으로 뒤집는다**(지우지 말 것). `RankingView`·`RankLocked` 단위 테스트도 같은 방식. 뒤집은 목록을 보고에.
4. 사람 절차 예고: 머지 뒤 **`firebase deploy --only firestore:rules`** 와, D에서 함수를 바꿨다면 **`firebase deploy --only functions:scheduleRankingCache`** 를 대표가 직접 해야 실제로 열린다. §9 보고에 명령을 한 줄씩 따로 적어라.

### G. 규범 문서 (Stale-Doc Guard — 같은 PR에 들어가야 DoD)
1. `LANGUAGE.md` — ① Crown Score 항목(§13)을 정본 v1.0으로 교체(옛 50:50 산식은 "폐기(2026-09-23)" 표시, 지우지 않음) ② "득표율 / Vote Rate" 행에 "폐기(2026-09-23 대표)" ③ "득표 / Vote Count" 행의 화면 표기 = "선택 수"(코드 이름 불변) ④ **차트(Chart) · 랭킹(차트 속 등수, 일반 명사)** 등재 ⑤ 점유율 정의 = "대결에서 뽑힌 횟수 ÷ 대결에 나온 횟수"로 교체 ⑥ 순위점수율·우승율 등재 ⑦ "Pick Now / 참가하기 / Elige ahora (구 Vote Now, D-23)" ⑧ "Choe-ae(최애)" — 결승 제목 한 곳에만, 로마자 고정(D-25) ⑨ "Crown Ceremony(대관 연출)"이 있으면 "폐기(D-24)", 없으면 넣지 않음.
2. `CLAUDE.md` — 원칙 #8(랭킹 표시 지표·Crown Score 산식)을 정본 v1.0으로 · 140행 "Vote Rate" 정리 · "랭킹은 마감 전에도 항상 공개(D-30)" · "대관 연출 폐기(D-24)" · 'Vote Now' → D-23 값.
3. `docs/lite-specs/C1-vote-engine.md` — THE FINAL 뒤 "대관 연출: 폐기(D-24)" 한 줄 · `VoteRateBar` 절 "폐기(D-03)" · 랭킹 공개 조건 D-30.
4. `docs/design/wireframes/Domain 3 · The Arena.html` — 맨 위 배너 한 줄: "ARENA-1(2026-09) 이후 아레나 구조는 코드와 클로드 디자인 정본이 진실 — 이 와이어프레임은 참고용". 그림은 손대지 않는다.
5. 랭킹 산식을 설명하는 다른 문서(`grep -rln "우승비율\|Crown Score\|점유율" docs outputs --include=*.md`)가 있으면 **고치지 말고 목록만** 보고(티오가 정리).

### H. 테스트 · 계측
- 단위: Crown Score 순수 함수 — 검산 549 · appearances 0 · runs_total 0 · 동점 · 게스트 판 제외 · 미완주 판 제외 · 판 1회 점수 합계 26.
- 단위: `nav.cta.enter` 3언어 · 금지 낱말 검사(`messagesContent.test.ts`에 '투표'·'Vote Rate'·'득표' 0건 단언 — 코드 식별자 제외).
- 규칙 테스트(에뮬레이터): 비로그인 `ranking_cache` 읽기 허용 · 쓰기 거부 그대로.
- E2E(C-1 워크플로, `?lang=ko|en|es` 로 언어 고정): ① 마감 전 대회의 차트(비로그인)에 Crown Score 순 목록 ② 판수 10 미만 대회는 기다림 안내 ③ `voteCount` 문자열이 DOM에 없다 ④ 메뉴바 버튼 글자 3언어 ⑤ "다음 발표" 줄.
- 계측 5종(`tournament_start` · `round_advance` · `champion_confirmed` · `first_vote` · `match_session_id`) 이름 변경 금지.

## 4. 하지 말 것 (OUT)
- NAV-1(☰ 서랍 · "선택 이어가기" 알약) · BANNER-1 · COOKIE-1 · FONT-1 · E2E-1 — 각각 별도.
- 차트 화면 **디자인** 변경(색·배치) — 이름·숫자만 바꾼다. 세 비율의 화면 표시 방식 결정.
- 발표 주기 변경(D-05) · 참가 규칙 · 탭 규칙 · 배너 크기 · 디자인 정본 재내보내기.
- 마케팅이 지을 문구(es 차트 이름, en·es 기다림 안내, 설명창 3언어)를 **임시로 지어 넣기**.
- 약관·정책 문서의 "Voter". `ceremony_viewed`·`ceremony_skipped` 계측 만들기(D-24).

## 5. 승인 게이트 — 문구 (대표 승인 전 커밋 금지)
0단계 "진행"을 받은 뒤, 코드 전에 **이 표 전체를 한 번에** 올리고 STOP. 티오 초안은 그대로 쓰거나, 더 나은 안이 있으면 나란히 제시.

| # | 자리 | 지금 | 티오 초안 |
|---|---|---|---|
| 1 | `pitch.hero.cta.start` | 투표 시작 / Start Voting / Empezar a votar | **참가하기 / Pick Now / Elige ahora** (D-23 낱말) |
| 2 | `arena.vote.failed` | 투표에 실패했어요. 다시 시도해주세요. / Your vote didn't go through… / No se registró tu voto… | **선택이 저장되지 않았어요. 다시 시도해 주세요. / Your pick wasn't saved. Please try again. / Tu elección no se guardó. Inténtalo de nuevo.** |
| 3 | 랭킹 `kicker` | 랭킹 · RANKING / RANKING | **차트 · CHART / CHART / (es 마케팅 대기)** |
| 4 | 랭킹 `note` | VOTE RATE (%) · 투표 완료 후 공개 / … published after vote close | **Crown Score · 하루 두 번 발표 / Crown Score · Updated twice a day / Crown Score · Se actualiza dos veces al día** |
| 5 | 랭킹 `emptyTitle`·`emptySubtitle` (캐시가 아예 없을 때) | 아직 랭킹이 없어요 / 투표가 모이면 Vote Rate 랭킹이… | **E의 기다림 안내와 같은 문구로 통일**: ko "아직 참여가 적어요. 조금만 기다려주세요!" / en·es 마케팅 대기 |
| 6 | E 기다림 안내 | (새로) | ko **아직 참여가 적어요. 조금만 기다려주세요!**(정본 확정) / en·es **마케팅 대기** |
| 7 | 대체 이름(UserDropdown·UserAvatar) | Voter | **팬 / Fan / Fan** |
| 8 | 계정 페이지 201행 | 계정과 투표 기록·환경설정을… | **계정과 선택 기록·환경설정을…**(뒤 그대로) / en·es 'vote'→'pick' 짝 초안 |
| 9 | 계정 삭제 창 332·355행 | 투표 기록 (지금까지 한 모든 Match 투표) / Vote history… | **선택 기록 (지금까지 한 모든 Match 선택) / Pick history (every Match pick you've made) / Historial de elecciones (cada elección que hiciste en un Match)** |
| 10 | `app/layout.tsx` 사이트 설명 | …Vote for who you love and crown your champion. | …**Pick who you love and crown your Champion.** |
| 11 | `app/launch/layout.tsx` 사이트 설명 | the global fan-voting arena. … Vote for who you love… | **the global fan arena.** … **Pick who you love. Crown your Champion.** |
| 12 | 로그인 창 `guestLimitSub` | …내 선택이 랭킹에 반영돼요. | …**내 선택이 차트에 반영돼요.** (en·es 짝 동일 원칙) |
| 13 | 관리자 `KPICards` | 총 투표 수 · 활성 Voter 수 · 투표 속도 + 설명 2개 | **총 선택 수 · 활성 팬 수 · 선택 속도** / Total Picks · Active Fans · Pick Speed · 설명: **선택 수는 운영자 전용 — 팬 화면에 절대 나오지 않습니다.** / **최근 1시간 안에 선택한 서로 다른 팬 수.** |
| 14 | 관리자 `VoteSpeedChart` | 투표 속도 · 최근 24시간 / 시간당 투표 수 / 아직 투표 데이터가 없어요 / 첫 투표가 들어오면… | **선택 속도 · 최근 24시간 / 시간당 선택 수 / 아직 선택 기록이 없어요 / 첫 선택이 들어오면 차트가 나타납니다** |
| 15 | 관리자 `AlertList` · `GeneratePanel` | 랭킹 이상 징후 · 주간 랭킹 동향 | **차트 이상 징후 · 주간 차트 동향** |
| 16~ | grep에서 새로 나온 것 | (전/후 3언어) | — |

게이트 규칙: '표·투표·득표·Vote Rate·예측·배당·Voter(화면)' 금지, '판'→'참여', 전투 은유 금지, Champion·Crown·Crown Card·**Crown Score**·Tournament·Match는 3언어 모두 영문 원형. **"마케팅 대기" 칸은 문안이 올 때까지 머지하지 않는다** — 티오가 받아 전달한다.

## 6. TDD · 검증 순서
0단계 보고 → "진행" → §5 게이트 → 실패하는 테스트 먼저 → 구현 → `tsc` · hex guard · vitest · 규칙 테스트 · functions 테스트 · C-1 E2E 전부 초록 → PR → **Vercel Preview 프리플라이트 캡처 4장**(메뉴바 3언어 · 판수 10 이상 대회의 차트(비로그인) · 판수 10 미만 대회의 기다림 안내 · "다음 발표" 줄) 보고.

## 7. 완료 기준 (DoD)
- [ ] 0단계 조사 보고 → 대표 "진행"
- [ ] 메뉴바 CTA 3언어, `a1_gnb_cta_vote_now` 유지
- [ ] 화면 문자열에서 '투표·Vote·Voter·Vote Rate·득표' 0건(관리자 화면 포함) — 게이트 통과본으로
- [ ] 화면 이름 '차트' — ko·en 적용, es·기다림 안내 en/es·설명창은 마케팅 문안 반영
- [ ] Crown Score v1.0 순수 함수 + 검산 549 + 게스트·미완주 제외 테스트
- [ ] 10판 기준 + 차트 길 숨기지 않음
- [ ] rules 마감 게이트 삭제 + 규칙 테스트 뒤집기 · `locked` 제거 · "다음 발표" 줄(마감 후 감춤) · `voteCount` 미노출 E2E
- [ ] 규범 문서 갱신이 같은 PR에
- [ ] CI 전부 초록(C-1 E2E flaky 0) · 캡처 4장 · §9 보고

## 8. Auto-STOP (멈추고 물을 것)
0단계 보고 뒤 · §5 게이트 · 데이터가 없어 새로 기록해야 할 때 · 주소를 바꾸고 싶을 때 · `voteCount`가 화면에 보일 때 · 이상 징후 감지가 깨질 때 · 규범 문서에 정본·원장과 어긋나는 확정이 있을 때(정본·원장이 이김 — 둘끼리도 다르면 STOP).

## 9. 보고 형식
바꾼 파일과 이유(절 번호별) · 테스트 수(전/후) · CI 링크 · 캡처 4장 · 사람 절차 명령(한 줄씩 따로 상자) · 범위 밖에서 발견한 것(고치지 말고 목록만) · 원장에 적어야 할 새 사실.

---8<--- 여기까지 복사 ---8<---

## 이유 (기록용 — 프롬프트에 넣지 말 것)
- 2026-09-23 대표 결정(마티오 경유): 랭킹→차트, Crown Score v1.0(10/5/2 · 40:30:30 · ×1000), 10판 기준. 정본 = `marketing/00_strategy/CROWN_SCORE_v1.0.md`(드라이브 원본을 티오가 옮김).
- 대표 2026-09-23: 관리자 화면 '투표' 낱말도 수정 · Vote Rate/득표율 폐기.
- 원장과의 연결(티오 판단 — 새 선택지 아님): 게스트 판 제외 = D-02 / 재계산 시점 = D-05 / 비로그인 공개 = D-30 / Crown Score 영문 원형 = LANGUAGE.md 규칙.
- 마케팅에 받아야 할 문안 4건: es 차트 이름 · 기다림 안내 en·es · 설명창 3언어.
