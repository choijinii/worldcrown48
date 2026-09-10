# Claude Code 전달 프롬프트 — RUN-1 PR 3 (정리·계측 + 랭킹 발표 주기)

> 대표님은 아래 `---8<---` 사이의 내용을 **통째로 복사해 Claude Code 입력창에 붙여넣기**만 하시면 됩니다.
> 작성: 티오(Cowork) · 2026-09-10 · 기준 `main` = `433b5c4` (#94)

---8<--- 여기서부터 복사 ---8<---

WorldCrown48 RUN-1 킥의 **PR 3(정리·계측)** 를 시작한다. PR 1(#90·#91·#92)과 PR 2(#93·#94)는 머지·배포·프로덕션 검증·대표 눈검사까지 전부 끝났다. 이 작업의 정본 지시서는 저장소 안에 있다.

## 0. 첫 동작
```
git fetch origin
git checkout main && git rebase origin/main   # 기대: 433b5c4 (#94)
git checkout -b feat/run-1-pr3-cleanup-metrics
```
충돌이 나면 멈추고 대표님께 보고하라. `.claude/`·`marketing/`은 커밋하지 마라.

## 1. 필독 (이 순서로 전부)
1. `outputs/HANDOFF_RUN-1_참가규칙v2.0_2026-09-03.md` — **§3.0(회차 구조 B안)** · **§3 Phase 3 표** · §4 AC **10·11·14·15** · §5 DO/DON'T(**DON'T 2는 해제됨**) · §7 · **§8 문구표** · §9 함정 1~12 · §11 · §16
2. `marketing/00_strategy/EVENT_SPEC.md` **v1.2** — ⑩ 판(회차) 단위 계측 · 공통 4파라미터(`is_guest`·`tournament_id`·`category`·`lang`)
3. `CLAUDE.md` "⚖️ 참가 규칙" 절 · `LANGUAGE.md` §1 표시 용어 층 · §7 금지어
4. `functions/src/core/rankingAggregator.ts` · `functions/src/scheduleRankingCache.ts` · `firestore.rules` 의 `daily_participation` 블록

읽은 뒤 핸드오프 §0 자가 검증 명령을 **직접 실행**해 전부 ✓인지 확인하고 결과를 먼저 출력하라.

## 2. 한 줄 목표
**게스트의 선택을 랭킹에서 빼고, 랭킹 발표를 하루 두 번(09:00·21:00 KST)으로 바꾸면서 "다음 발표" 한 줄을 화면에 띄우고, 판(회차) 단위 계측을 붙이고, 죽은 규칙 블록을 지운다.**

## 3. 범위 — 이 PR에서 하는 것 (핸드오프 §3 Phase 3)

### A. 게스트의 선택을 랭킹 집계에서 제외 (AC 10 · §16-5)
- `functions/src/core/rankingAggregator.ts`: `VoteLike` 에 `isGuest?: boolean` 추가, `tallyVotes` 가 **`isGuest === true` 인 기록을 건너뛴다.**
- **반드시 메모리 필터다.** Firestore `where("isGuest","!=",true)` 를 쓰지 마라 — `!=` 쿼리는 **필드가 없는 옛 문서를 통째로 빼버려** 소급 제외가 돼 버린다. `scheduleRankingCache` 는 이미 `votes` 를 통째로 한 번 읽으므로 추가 읽기 비용이 없다.
- **소급 없음(2026-09-07 대표 확정)**: `isGuest` 필드가 **없는** 옛 기록은 `undefined` 라 그대로 집계된다. 이 동작을 테스트로 못박아라 — `true` 제외 · `false` 집계 · **`undefined` 집계** 3건.
- 허용 범위는 이것뿐이다. 회차 가중치·로그인 Voter의 판 제외 등 다른 집계 변경은 여전히 금지(§5 DON'T 2).

### B. 랭킹 갱신 주기 60분 → 12시간, **09:00·21:00 KST 고정** (AC 14)
- `functions/src/scheduleRankingCache.ts` 의 `schedule: "every 60 minutes"` 를 바꾼다.
- ⚠️ **`"every 12 hours"` 로 쓰지 마라.** 그건 배포 시각을 기준으로 12시간마다 도는 상대 주기라 발표 시각이 배포할 때마다 달라진다. 그런데 §8 승인 문구는 **"오늘 21:00" · "내일 09:00" 이라는 고정 시각**이다 — 문구가 사실이 되려면 스케줄이 그 시각에 못박혀 있어야 한다.
- 따라서: `schedule: "0 9,21 * * *"`, `timeZone: "Asia/Seoul"` (`region` 은 `asia-northeast3` 그대로). `onSchedule` 의 `timeZone` 옵션을 반드시 함께 넣어라 — 없으면 UTC로 돌아 KST 18:00·06:00에 발표된다.
- 주기가 12배 길어지므로 함수 1회가 다루는 양은 그대로지만 **`timeoutSeconds: 540` 은 유지**한다. 파일 상단 주석의 "every 60 min" 도 함께 고쳐라.

### C. 랭킹 화면 "다음 발표" 한 줄 (AC 15) — B와 한 쌍, 따로 배포 금지
- **이 한 줄 없이 주기만 늘리지 마라.** 팬은 12시간 멈춘 랭킹을 "고장"으로 읽는다(핸드오프 §3 Phase 3).
- `lib/i18n/messages.ts` 에 §8 승인본 그대로 추가:
  - `ranking.nextUpdate.today` — ko `다음 발표: 오늘 21:00` / en `Next update: today 21:00 KST` / es `Próxima actualización: hoy 21:00 KST`
  - `ranking.nextUpdate.tomorrow` — ko `다음 발표: 내일 09:00` / en `Next update: tomorrow 09:00 KST` / es `Próxima actualización: mañana 09:00 KST`
  - 한 글자도 임의 변경 금지(§5 DO 7). `lib/__tests__/messagesContent.test.ts` 에 글자 단위 고정 테스트를 추가하라.
- **순수 함수로 판정한다** — `lib/ranking/nextRankingUpdate.ts` (또는 리포 관례에 맞는 자리):
  ```ts
  nextRankingUpdate(nowKST: Date | { hour: number; date: string }) => "today" | "tomorrow"
  ```
  호출자가 KST 시각을 **주입**한다(함수 안에서 시계를 읽지 않는다 — §3.0 대표 조건 2와 같은 이유).
- **판정은 시각이 아니라 날짜로 한다** (§8 발표 시각 표기 규칙): 다음 발표 시각의 **KST 날짜**가 오늘과 같으면 `today`, 다음 날이면 `tomorrow`.
  - KST 00:00~08:59 → 다음 발표 오늘 09:00 → **`today`** (문구는 "오늘 21:00" 이 아니라 **오늘 09:00** 이어야 한다 ⚠️ 아래 주의)
  - KST 09:00~20:59 → 오늘 21:00 → `today`
  - KST 21:00~23:59 → 내일 09:00 → `tomorrow`
  - ⚠️ **승인 문구는 "오늘 21:00"·"내일 09:00" 두 개뿐이라 새벽 구간(00:00~08:59)의 "오늘 09:00" 을 표현할 문구가 없다.** 문구를 새로 만들지 마라. 이 구간은 **`tomorrow` 키를 쓰지 말고**, 승인 문구가 사실과 맞는 구간(09:00~23:59)에서만 한 줄을 노출하고 새벽 구간에는 **줄을 감춘다.** 이 처리를 코드 주석과 PR 본문에 명시하고, "새벽 구간 문구 1건 승인 필요"를 **남은 위험**으로 보고하라. 대표님께 임의로 새 문구를 지어 올리지 마라.
  - KST 날짜·시각은 기존 헬퍼 `lib/kst.ts` `getTodayKST()` 계열을 **재사용**한다. ❌ `new Date().toISOString().slice(0,10)` 신규 사용 금지.
- 화면: `components/ranking/RankingHeader.tsx` 의 `rank-note` 아래 한 줄. **새 색·새 컴포넌트를 만들지 마라** — 기존 토큰·기존 텍스트 스타일 재사용(§5 DON'T 7). `data-testid="ranking-next-update"` 를 붙여라.

### D. 판(회차) 단위 계측 — `first_vote` · `match_session_id` (EVENT_SPEC v1.2 ⑩)
- ⚠️ **핸드오프 §3 Phase 3 표는 `match_session_id` 를 "MODIFY" 라고 적었지만, 실측 결과 저장소에 이 값은 아직 없다**(ARENA-1 소킥이 밀리면서 구현된 적이 없다). **CREATE 다.** 이 사실을 PR 본문에 적어라.
- `lib/analytics/matchSessionId.ts` 신설 — **순수 동기 결정적 함수**:
  ```ts
  matchSessionId(uid: string, tournamentId: string, runIndex: number): string  // 16자
  ```
  - 입력이 같으면 기기·세션이 달라도 같은 값이 나온다(저장하지 않는다).
  - 외부 의존 없이(암호 라이브러리·SubtleCrypto 없이) 구현한다 — 비동기가 섞이면 이벤트 발화 지점이 전부 오염된다.
  - ⚠️ `tournamentId` 에는 `_` 가 들어 있다(`gen4_idol_48`). 구분자로 `_` 를 쓰지 마라 — 다른 조합이 같은 문자열이 되는 자리가 생긴다(§9 함정 2와 같은 유형). 충돌 없는 구분자를 쓰고 그 이유를 주석에 남겨라.
  - 테스트: 결정성(같은 입력 = 같은 값) · **회차가 다르면 값이 다르다** · 길이 16 · `tournamentId` 경계(`a_b`+`c` 와 `a`+`b_c` 가 다른 값).
- `first_vote` 신설 — **한 판의 첫 선택 시 정확히 1회.** params = 공통 4파라미터 + `run_index` + `match_session_id`.
  - "판당 1회" 판정은 **회차 단위 키**로 한다. `lib/analytics/funnelEvents.ts` 의 `markTournamentStart` 와 같은 `sessionStorage` 관례를 따르되 **키에 회차를 포함**하라 — 회차가 빠지면 2판째에 발화하지 않는다.
  - 새로고침·이어하기로 **다시 발화하지 않는지**가 핵심이다. 반대로 **새 판(회차 +1)에서는 반드시 다시 발화**해야 한다.
- 기존 판 단위 이벤트에 `match_session_id` 를 붙인다: `tournament_start` · `round_advance` · `champion_confirmed`(`app/arena/[tournamentId]/page.tsx`) · `crown_card_created`(`components/crown/CrownCardModal.tsx`) · `crown_downloaded` · `crown_shared_x` · `crown_shared_native`(`components/crown/ShareMenu.tsx`).
  - `ceremony_viewed`·`ceremony_skipped` 는 아직 구현 자체가 없다(ARENA-1). **이 PR에서 만들지 마라** — 나중에 같은 헬퍼를 쓰라는 주석만 남겨라.
  - 게스트도 uid(익명 계정 uid)가 있으므로 값이 나온다. 동의 게이트는 기존 `trackWithConsent` 경로 그대로 — 새 우회로를 만들지 마라.

### E. 죽은 규칙 블록 삭제 (§3.0 대표 조건 4)
- `firestore.rules` 의 `match /daily_participation/{docId}` 블록과 그 위 주석을 **삭제**한다. PR 1에서 지우지 않고 여기까지 미룬 이유는 옛 코드를 들고 있는 열린 탭이 읽기 거부를 맞지 않게 하기 위해서였고, PR 2 배포 후 그 창은 닫혔다.
- 옛 `daily_participation/{uid}_{date}` 문서는 **읽지 않고 버린다**(그날 자정에 자연 소멸). 삭제 스크립트를 쓰지 마라(§5 DON'T 3).

### F. 옛 문서 회차 폴백 확인 (AC 11)
- `crown_cards` · `roundProgress` 의 **필드** `runIndex` 가 없을 때 **`1` 로 읽는지** 실측하라. `functions/src/onChampionConfirmed.ts:43` 은 이미 `Number(after.runIndex ?? 1)` 로 맞다.
- **없는 곳만 고쳐라.** 이미 맞는 곳을 다시 손대지 마라. ⚠️ `tournament_runs.runIndex` 의 폴백은 `0` 이 맞다(첫 판 없음) — 이 둘을 섞지 마라.
- 이관 스크립트·일괄 변환은 금지(§5 DON'T 3). 옛 문서 id가 곧 1회차 id라는 §3.0 B안 구조로 만족된다.

## 4. 하지 않는 것
아레나 UI 대수술(ARENA-1/2) · 대관 연출(Crown Ceremony) · MVP1.5 검수 · 참가 규칙 v2.0/v2.1 재론 · 새 색·새 컴포넌트 · §8 표 밖의 새 문구(필요하면 구현하지 말고 대표님께 승인 요청).

## 5. 용어 (LANGUAGE.md)
**"표"는 낱말 자체가 금지 → "선택"** (코드 내부 이름 `votes`·`Vote`·`onVote` 는 예외). 화면 글에서 **'판'은 "참여·N번 참여·참여 횟수"로 순화**(시스템 용어 Run(판)은 코드·문서에서 그대로). "예측"·"배당" 표현 금지. "Tournament"·"Crown Card" 는 3언어 원문 그대로.

## 6. 작업 방식 — Superpowers TDD (순서 엄수)
```
/brainstorm : §2 목표 + 핸드오프 §9 함정 + 위 B의 앵커 문제 + D의 "판당 1회" 판정 입력 → 접근·순서 정리
/plan       : A~F 순서 확정, AC(10·11·14·15)를 테스트로 매핑 — §11.2 표
TDD RED-GREEN-REFACTOR : 순수 함수부터(tallyVotes isGuest 3분기 · nextRankingUpdate 시각 경계 · matchSessionId 결정성/충돌). 테스트 없이 구현 먼저 금지
/review     : §5 제약 위반 0건 · 금지어 0건 · strict 통과 · functions 빌드(`cd functions && npm run build`) 통과 · 기존 테스트 전량 green
/pr         : §10 종료 조건을 PR 본문에
```
Superpowers 미설치면 멈추고 대표님께 알려라.

## 7. 완료 조건
1. **AC 10** — `isGuest === true` 는 집계에서 빠지고, `false` 와 **필드 없음**은 집계된다(단위 테스트 3건).
2. **AC 14** — 랭킹 갱신이 **KST 09:00·21:00** 에 돈다(`schedule` + `timeZone` 둘 다 확인).
3. **AC 15** — 랭킹 화면에 "다음 발표" 한 줄이 3언어로 뜨고, **날짜가 넘어가면 오늘→내일이 정확히 바뀐다**(시계 고정 단위 테스트). 새벽 구간은 줄이 감춰진다.
4. **AC 11** — 옛 문서(회차 필드 없음)를 가진 계정이 1회차로 정상 동작한다.
5. `first_vote` 가 **판당 정확히 1회** 발화하고, 새 판에서 다시 발화한다. params에 `run_index`·`match_session_id`·공통 4파라미터가 붙는다.
6. `match_session_id` 가 **회차마다 다른 값**이고, 위 7개 이벤트에 붙는다.
7. `firestore.rules` 에 `daily_participation` 블록이 없고, 배포 후 기존 화면이 읽기 거부를 맞지 않는다.
8. 금지어 게이트: `grep -rn "5표\|46표\|투표 무제한" app lib components` = 0건.

## 8. 머지·배포 후 — 네가 먼저 확인할 것 (§7)
Vercel Preview + Firebase 배포(`functions` · `firestore:rules`) 후, **마감이 남은 Tournament** 로:
1. **게스트 랭킹 제외(핵심)** — 시크릿 창에서 1판 완주 → 그 대회 랭킹 화면의 총 선택 수를 적어 둔다 → 랭킹 캐시가 갱신된 뒤(수동 트리거 또는 다음 발표 시각) **숫자가 그대로인지** 확인. 로그인 계정으로 1판 완주 → 갱신 후 **숫자가 오른다**.
2. **다음 발표 한 줄** — 랭킹 화면에 3언어로 뜨는지, 09:00·21:00 경계 전후로 "오늘/내일"이 맞는지(브라우저 시각 조정 또는 단위 테스트 결과로 대체 가능).
3. **first_vote** — GA4 DebugView에서 한 판의 첫 선택에 1회만, 새로고침·이어하기에 재발화 없음, [다시 참여]로 연 2판째에 다시 1회. `match_session_id` 가 1판과 2판이 다른 값.
4. **옛 화면 회귀** — 이미 카드가 있는 계정으로 완주 화면·지난 카드 목록이 그대로 뜨는지.
5. 결과를 표로 보고한 뒤 대표님 눈검사를 요청하라. **"확인해 주세요"를 먼저 말하지 마라.**

## 9. 보고 형식
각 단계 끝에 (a) 실행한 명령·결과 (b) 바뀐 파일 목록 (c) 남은 위험. 모호한 결정이 나오면 추측하지 말고 대표님께 한 가지 질문으로 물어라.

---8<--- 여기까지 복사 ---8<---

## 부록 — 티오가 이 프롬프트를 쓰며 실측한 것 (대표님 참고용, 복사 범위 밖)

| 확인 | 결과 |
|---|---|
| `votes` 에 `isGuest` 가 실제로 찍히나 | ✅ PR 2에서 완료 — `onVote.ts:226`(익명 판정), `linkSessionVote.ts:345`(이관 시 false) |
| `match_session_id` 가 코드에 있나 | ❌ **없다.** 핸드오프의 "MODIFY"는 사실과 다르다 → CREATE로 지시 |
| `first_vote` 가 코드에 있나 | ❌ 없다 (CREATE) |
| `ranking.nextUpdate.*` 문구가 코드에 있나 | ❌ 없다 (§8에는 2026-09-04 승인본으로 있음) |
| 분당 선택 한도 40 (AC 13) | ✅ 이미 적용됨 — `onVote.ts:46 RATE_LIMIT = 40` |
| `daily_participation` 규칙 블록 | ⏳ `firestore.rules:161~173` 에 아직 살아 있음 → 이 PR에서 삭제 |
| `"every 12 hours"` 로 쓰면 되나 | ❌ 상대 주기라 발표 시각이 배포마다 달라진다 → `0 9,21 * * *` + `timeZone: "Asia/Seoul"` |
| 새벽 구간(KST 00:00~08:59) 문구 | ⚠️ 승인 문구 2개로는 표현 불가 → 이 구간은 줄을 감추고, 문구 1건은 대표님 승인 대기 |
