# Handoff Brief — RUN-1 참가 규칙 v2.0 코드 정합 (Domain 3 The Arena + Functions)

> **From**: Cowork(티오) — 기획·규칙 확정 · **To**: Claude Code — 실코드
> **Date**: 2026-09-03 · **Author**: 대표 · **Version**: v1.0
> **작업 브랜치**: `feat/run-1-participation-v2` (**직전 작업 브랜치에서 분기** — 로컬 main은 stale함)
> **목표 산출물**: 회차(runIndex) 도입 — participation·onVote·bracketSeed·roundProgress·crown_cards·voteGate·재입장 화면·문구 3언어·계측

---

## §0. 자가 검증 (Self-verify) — 코드 작성 전 반드시 모두 ✓

### 0.1 작업 위치
```bash
git branch --show-current
# 기대값: feat/run-1-participation-v2
```

### 0.2 핵심 파일 존재
```bash
test -f CLAUDE.md && echo "✓ CLAUDE.md" || echo "✗"
test -f LANGUAGE.md && echo "✓ LANGUAGE.md" || echo "✗"
test -f functions/src/core/participation.ts && echo "✓ participation" || echo "✗"
test -f lib/arena/bracketSeed.ts && echo "✓ bracketSeed" || echo "✗"
test -f outputs/HANDOFF_RUN-1_참가규칙v2.0_2026-09-03.md && echo "✓ handoff" || echo "✗"
```

### 0.3 정본 규칙이 문서에 반영되어 있는지
```bash
grep -c "Daily Run Limit" LANGUAGE.md   # 기대: 3 이상
grep -c "판(Run)" CLAUDE.md             # 기대: 1 이상
```

✅ 모두 통과해야 §1로 진행.

---

## §1. Pre-flight Checklist — 읽기

```
☐ CLAUDE.md 읽음 — 특히 신설된 "⚖️ 참가 규칙" 절
☐ LANGUAGE.md §2 읽음 — 판(Run) · 회차(Run Index) · 일일 판 한도(Daily Run Limit)
☐ LANGUAGE.md 금지어표 읽음 — "표"를 단위로 쓰는 모든 표현이 금지어
☐ outputs/참가규칙_정본v2.0_판Run_2026-09-03.html (정본)
☐ outputs/RUN-1_작업명세서_v1.0_2026-09-03.html (파일별 지시·문구 표)
☐ 이 핸드오프 처음부터 끝까지
```

---

## §2. Goal — 한 줄 결과 정의

> **한 Voter가 하나의 Tournament를 하루(KST) 최대 5판까지 완주할 수 있고, 판마다 대진표가 새로 섞이며 Crown Card가 1장씩 남는다. 비로그인은 하루 통틀어 1판.**

현재 코드는 "하루에 서로 다른 Tournament 5개"라는 **폐기된 옛 규칙(HF-1)** 로 동작한다. 이 작업은 그 어긋남을 대표 확정 정의에 맞추는 것이다.

---

## §3. Files to CREATE / MODIFY

### Phase 1 — 서버 코어 (PR 1)

| 파일 | 작업 | 상세 |
|---|---|---|
| `functions/src/core/participation.ts` | MODIFY | `DAILY_PARTICIPATION_LIMIT` → **`DAILY_RUN_LIMIT = 5`**. `decideParticipation`을 **`decideRun`** 으로 재작성: 입력 = `{ runsForThisTournament: number, limit? }`, 출력 = `{ status:"allowed", runIndex:number }` \| `{ status:"limit_reached" }`. `runIndex = runsForThisTournament + 1`. 문서 id 헬퍼는 유지(`{uid}_{date}`), 필드만 `tournamentIds: string[]` → **`runs: { [tournamentId]: number }`** |
| `functions/src/core/voteRecord.ts` | MODIFY | `VoteInput`에 `runIndex: number` 추가 + 검증(정수 1..5). matchId 형식 규칙은 **그대로** |
| `functions/src/onVote.ts` | MODIFY | ① 중복 방지 쿼리를 `(userId, matchId)` → **`(userId, matchId, runIndex)`** ② 트랜잭션에서 `daily_runs` 문서의 해당 대회 판 수를 읽어 `decideRun` 호출 ③ 새 판 시작 시에만 카운트 +1 ④ vote 문서에 `runIndex` 기록 ⑤ 에러 코드 `VOTE_ERROR_CODES.DAILY_LIMIT` 유지 |
| `lib/arena/bracketSeed.ts` | MODIFY | `bracketSeedDocId(uid, tid)` → **`bracketSeedDocId(uid, tid, runIndex)`** = `` `${uid}_${tid}_r${runIndex}` ``. 캐시 키(`wc48_bracket_seed_...`)도 같이. mulberry32·load-or-create 구조는 그대로 |
| `functions/src/advanceRound.ts` + roundProgress 계열 | MODIFY | roundProgress 문서 id에 `_r{n}` 접미사, **문서 필드에 `runIndex` 추가** |
| `functions/src/core/crownCardRecord.ts` | MODIFY | `crownCardId(voterUid, tid)` → `crownCardId(voterUid, tid, runIndex)` = `` `${uid}_${tid}_r${n}` ``. 레코드에 `runIndex` 필드 추가 |
| `functions/src/onChampionConfirmed.ts` | MODIFY | `after.runIndex`를 읽어 `crownCardId(...)`에 전달. **문서 id를 파싱하지 말 것**(§9 함정 2) |
| `firestore.rules` | MODIFY | `daily_participation` → **`daily_runs`** 컬렉션명 변경(읽기 규칙 동일: `docId.split('_')[0] == uid`). 나머지 3개 컬렉션 규칙은 **변경 불필요**(§9 함정 1) |

### Phase 2 — 화면·문구 (PR 2)

| 파일 | 작업 | 상세 |
|---|---|---|
| `lib/voteGate.ts` | MODIFY | `decideVoteGate`의 로그인 분기를 **판 기준**으로: `participatedThisTournament`(불리언) → **`runsForThisTournament`(숫자)**. `runsForThisTournament >= 5` → `daily_limit_reached`. 게스트 분기는 §5 DO 3 참조. **서버(`decideRun`)와 같은 순수 함수를 공유하거나, 최소한 동일 입력→동일 출력이 단위 테스트로 고정될 것** |
| `app/arena/[tournamentId]/page.tsx` | MODIFY | 완주(`complete`) 화면에 **[다시 도전 (n/5)]** 버튼 + **지난 판의 Crown Card 목록**. 5판 소진 시 버튼 비활성 + 안내. 버튼 클릭 → 다음 회차로 새 판 시작(새 bracketSeed·새 roundProgress) |
| `lib/i18n/messages.ts` | MODIFY | `arena.vote.dailyLimit` 3언어 교체 + 신규 키(재도전 버튼·지난 카드) — **§8 문구표 그대로** |
| `components/auth/LoginModal.tsx` | MODIFY | `daily_limit` / `dailyLimitSub` 3언어 교체 — **§8 문구표 그대로** |
| `functions/src/onVote.ts` (속도 제한) | MODIFY | **`RATE_LIMIT = 20` → `40`** (2026-09-03 대표 확정). 근거: v2.0에서 5판 = 선택 230번인데 분당 20이면 규칙이 최소 11.5분을 강제해 "결과물을 늘린다"는 설계와 충돌. 40이면 1.5초에 한 번까지 허용 |
| `lib/i18n/messages.ts` (`arena.vote.rateLimited`) | MODIFY | 현재 "잠시 후 다시 시도해주세요." — **왜 막혔는지 설명이 없음**. 대표 지시(09-03): 안내 문구 필수 → §8 표 참조, **대표 승인 후 반영** |
| `functions/src/core/guestVoteGuard.ts` | MODIFY | 게스트는 하루 통틀어 1판. **완주한 대회의 재도전도 로그인 요구**(기존 `completedCurrentTournament` 분기가 이미 그 역할 — 회차 개념만 반영) |

### Phase 3 — 정리·계측 (PR 3)

| 파일 | 작업 | 상세 |
|---|---|---|
| 옛 데이터 읽기 폴백 | MODIFY | `runIndex`가 없는 기존 문서 = **1회차로 간주**. 이관 스크립트 없음. 옛 `daily_participation/{uid}_{date}`의 `tournamentIds[]`는 읽지 않고 버림(그날 자정에 자연 소멸) |
| `match_session_id` 계측 | MODIFY | 해시 입력에 **runIndex 추가** → `hash(uid + tournamentId + runIndex)` 앞 16자 |
| `first_vote` 이벤트 | CREATE | 판당 1회 발화 (마케팅 요청, 09-03 서신) |
| `functions/src/scheduleRankingCache.ts` | MODIFY | **갱신 주기 `every 60 minutes` → `every 12 hours`** (2026-09-03 대표 확정). 설정 한 줄. 근거: 부하 재산정 — 현재 매시간 전량 재읽기가 비용·중단의 99% 원인. **증분 집계(W4)까지 버티는 임시 방어이자, "발표 시각" 제품 기능의 기반** |
| 랭킹 화면 **다음 발표 시각 한 줄** | CREATE | **2026-09-04 대표 확정 — 12시간 전환의 필수 동반 조건.** 랭킹 화면에 `다음 발표: 오늘 21:00` 형태 한 줄 노출. 문구 = §8 표 `ranking.nextUpdate.today` / `.tomorrow` (승인 완료). 없으면 팬이 12시간 정지를 **"고장"으로 읽는다** — 이 한 줄 없이 주기만 늘리지 말 것 |

---

## §4. Acceptance Criteria — 완료 조건

1. 로그인 Voter가 **같은 Tournament를 하루 5판** 완주할 수 있다. 6판째 시작 시 `daily_limit_reached`.
2. **다른 Tournament는 별도로 5판** — A대회 5판을 다 써도 B대회는 5판이 그대로 남는다.
3. **판마다 대진표가 다르다** — 같은 uid·같은 대회의 1회차와 2회차 bracket seed가 서로 다르다.
4. **판마다 Crown Card가 1장** 생성된다 (5판 → 카드 5장, 각각 조회·공유 가능).
5. **지난 판의 카드가 보존**된다 — 새 판을 시작해도 이전 회차 카드가 사라지지 않는다.
6. **비로그인은 하루 통틀어 1판.** 완주 후 같은 대회 재도전·다른 대회 진입 모두 로그인 요구.
7. **한도는 KST 자정에 리셋**된다.
8. **미완주 판도 회차 1개를 차지**한다 — 24강까지만 하고 나갔다가 다시 들어오면 **그 판을 이어서** 진행하며, 새 판이 아니다.
9. **마감(Deadline) 지난 Tournament는 새 판을 시작할 수 없다.**
10. 랭킹 집계 결과가 5판 전부를 반영한다(`rankingAggregator` **코드 변경 없이** 그대로 동작).
11. 옛 문서(회차 없음)를 가진 계정이 화면에서 정상 동작한다 — 1회차로 표시.
12. 화면 문구 3언어가 §8 표와 **글자 단위로 일치**한다.
13. 1분에 40번까지 선택이 허용되고, 41번째에 **왜 막혔는지 알려주는 안내**가 뜬다.
14. 랭킹 갱신 주기가 12시간이다.
15. 랭킹 화면에 **다음 발표 시각 한 줄**이 3언어로 뜨고, 날짜가 넘어가면 "오늘"→"내일"로 정확히 바뀐다.

---

## §5. Hard Constraints — DO / DON'T

### DO
1. **회차는 문서 "필드"가 정본이다.** 문서 id의 `_r{n}` 접미사는 키 충돌 방지용일 뿐, 로직은 항상 `runIndex` 필드를 읽는다.
2. **한도 판정은 서버가 최종.** 클라이언트 게이트(`voteGate`)는 UX용이고, `onVote`가 독립적으로 다시 판정한다(현행 방어 구조 유지).
3. **게스트 = 하루 통틀어 1판** (대회당 1판 아님 — 2026-09-03 대표 확정 (가)안).
4. **미완주 판도 회차를 소모한다** — 판을 시작한 시점에 카운트한다(완주 시점 아님). 이유: 24강까지만 반복해 카드 없이 판만 태우는 구멍 차단.
5. **마감 지난 대회는 새 판 불가** (기존 마감 원칙 유지).
6. **지난 회차 Crown Card는 전부 보존**하고 각각 공유·저장 가능하게 한다.
7. 문구는 **§8 표 그대로** (대표 승인 완료본). 한 글자도 임의 변경 금지.

### DON'T
1. ❌ **"표"를 단위로 쓰는 문구를 만들지 말 것** — "1일 5표", "하루 230표", "46표", "투표 무제한" 전부 LANGUAGE.md 금지어. 사람에게 보이는 단위는 **판**뿐이다.
2. ❌ `rankingAggregator` / `scheduleRankingCache`의 집계 로직을 건드리지 말 것 (5판 전부 반영이 확정이라 변경 불필요).
3. ❌ 기존 프로덕션 문서를 일괄 변환하는 **마이그레이션 스크립트를 쓰지 말 것** — 읽기 폴백으로 처리한다.
4. ❌ `bracket_seeds`의 create-once 불변 규칙을 완화하지 말 것 — 새 판은 **새 문서 id**로 만든다.
5. ❌ 문서 id를 `split('_')`로 잘라 tournamentId를 복원하지 말 것 (§9 함정 2).
6. ❌ Arena UI 대수술(ARENA-1/2)을 여기서 하지 말 것 — 이 킥은 **재입장 화면에 버튼·목록을 얹는 것까지**가 범위.

---

## §6. Design Reference

재입장 화면(완주 상태)은 기존 `CrownCardModal` 구조를 유지하고 그 아래에 액션 영역만 추가한다.

```
[ Crown Card (이번 판 결과) ]
[ 공유 ] [ 저장 ]
──────────────────────────────
[ 다시 도전 (2/5) ]          ← 신설. 5/5면 비활성 + 보조 안내문
▸ 지난 판의 Crown Card (1장)  ← 신설. 접힘 목록, 각 카드 조회·공유 가능
```

디자인 토큰은 `docs/design/` v3.0 계열 그대로. **새 색·새 컴포넌트를 만들지 말 것** — 기존 버튼 스타일 재사용.

---

## §7. Test Plan (수동)

Vercel Preview에서 **로그인 계정**으로:
1. A대회 1판 완주 → 카드 1장 확인 → **[다시 도전 (2/5)]** 클릭
2. 2판째 진입 → **48강 첫 매치의 대진 조합이 1판째와 다른지 눈으로 확인** (핵심 검증)
3. 2판 완주 → 카드 2장이 모두 남아 있는지, 각각 공유되는지
4. A대회 5판 소진 → 6판째 차단 문구 확인 → B대회는 정상 진입되는지
5. **시크릿 창(비로그인)**: 1판 완주 → 같은 대회 재도전·다른 대회 진입 모두 로그인 모달

---

## §8. 화면 문구 — 대표 승인 완료본 (글자 그대로)

| 키 | ko | en | es |
|---|---|---|---|
| `arena.vote.dailyLimit` | 이 Tournament는 오늘 5판을 모두 도셨어요 (5/5) | You've played all 5 runs of this Tournament today (5/5) | Ya has jugado las 5 partidas de este Tournament hoy (5/5) |
| `dailyLimitSub` | 한국 시간 자정에 5판이 다시 채워져요. 다른 Tournament는 지금 바로 도실 수 있어요. | Your 5 runs reset at Seoul midnight. Other Tournaments are open right now. | Tus 5 partidas se reinician a medianoche de Seúl. Otros Tournaments están abiertos ahora. |
| `arena.run.playAgain` (신설) | 다시 도전 (n/5) | Play again (n/5) | Jugar otra vez (n/5) |
| `arena.run.pastCards` (신설) | 지난 판의 Crown Card | Your earlier Crown Cards | Tus Crown Cards anteriores |
| `arena.vote.rateLimited` **✅ 승인 (2026-09-04)** | 조금 빠르게 고르고 계시네요. 몇 초만 쉬었다 이어가 주세요. | You're choosing quickly. Take a few seconds, then keep going. | Estás eligiendo muy rápido. Espera unos segundos y continúa. |
| `ranking.nextUpdate.today` **✅ 승인 (2026-09-04)** | 다음 발표: 오늘 21:00 | Next update: today 21:00 KST | Próxima actualización: hoy 21:00 KST |
| `ranking.nextUpdate.tomorrow` **✅ 승인 (2026-09-04)** | 다음 발표: 내일 09:00 | Next update: tomorrow 09:00 KST | Próxima actualización: mañana 09:00 KST |

> "Tournament" · "Crown Card"는 3언어 모두 **원문 그대로** 유지(LANGUAGE.md RULE 1).

> **발표 시각 표기 규칙 (2026-09-04 대표 확정)**
> - 시각은 **KST 고정**. en·es는 `21:00 KST`처럼 시간대를 명시한다.
> - **"오늘/내일" 판정은 시각이 아니라 날짜로 한다** — 다음 발표 시각의 **KST 날짜**가 오늘과 같으면 `today`, 다음 날이면 `tomorrow`.
>   ❌ "22시 이후면 내일" 같은 시각 기준으로 박지 말 것 — 자정을 넘긴 새벽에 틀린 글자가 뜬다.
> - **현지 시각 자동 표시는 이번 범위 밖** → §12 W4 후속 항목.

---

## §9. 알려진 함정 (티오가 미리 실측해 둔 위험)

1. **✅ Firestore 보안 규칙은 손댈 필요가 거의 없다.** `bracket_seeds`·`roundProgress`·`crown_cards` 규칙은 `docId.split('_')[0] == request.auth.uid` 로 소유자를 판정한다. 뒤에 `_r{n}`을 붙여도 **첫 조각은 여전히 uid**라 그대로 통과한다. (컬렉션명을 바꾸는 `daily_participation` → `daily_runs`만 규칙 수정.)
2. **⚠️ tournamentId에 `_`가 들어 있다.** 실제 슬러그가 `gen4_idol_48`·`best_stage_48` 형태다. 따라서 문서 id를 `split('_')`로 잘라 tournamentId를 복원하는 코드를 **새로 만들지 말 것**. 다행히 `onChampionConfirmed`는 이미 문서 **필드**(`after.tournamentId`)를 읽는다 — 그 방식을 유지·확장하라.
3. **⚠️ `bracket_seeds`는 create-once 불변**이고 규칙이 키를 `['seed','createdAt']`로 제한한다. 회차를 **필드로 추가하려면 규칙의 `hasOnly` 목록도 함께 고쳐야** 한다. 더 안전한 길: 회차는 **문서 id에만** 담고 필드는 건드리지 않는다.
4. **⚠️ 게스트 uid는 브라우저마다 새로 생긴다.** 게스트 표도 랭킹에 그대로 집계되므로, 게스트 한도(하루 1판)를 느슨하게 만들면 랭킹 조작 비용이 0이 된다. §5 DO 3을 반드시 지킬 것.
5. **⚠️ 클라이언트·서버 게이트가 어긋나면 P0.** 2026-07-05 사고가 정확히 이 유형이었다(스펙이 오염원). 두 곳의 판정을 **같은 순수 함수 또는 동일한 테스트 케이스**로 묶어라.
6. **⚠️ 진행 중 판의 이어하기가 깨지기 쉽다.** "다시 도전"은 **완주 상태에서만** 노출된다. 미완주 상태에서 재입장하면 언제나 **그 판을 이어서**다(§4 AC 8).
7. **⚠️ 로컬 main은 매번 stale하다.** 새 브랜치는 직전 작업 브랜치에서 딸 것.

---

## §10. 핸드오프 종료 조건

```
☐ §4 Acceptance Criteria 12개 전부 통과
☐ §11 3계층 테스트 100% PASS + Console 에러 0건
☐ PR 3개(Phase 1·2·3) 각각 리뷰 통과 후 머지
☐ Vercel Preview에서 §7 수동 테스트 5단계 완료 (대표 눈검사 전 Claude Code가 먼저 완주)
☐ LANGUAGE.md 금지어("표" 단위) 위반 0건 — `grep -rn "5표\|46표\|투표 무제한" app lib components` 결과 0
☐ 대표 보고: 변경된 화면 3곳의 전후 비교
```

---

## §11. Superpowers 워크플로우 지시 — 필독

> Superpowers 플러그인(`/plugin install superpowers@claude-plugins-official`) **활성화 상태**에서 작업할 것.
> 2026-08-30 계측 소킥에서 TDD가 누락된 전례가 있다 — 이번엔 반드시 적용한다.

### 11.1 적용 단계 (순서 엄수)
```
Phase 1 — /brainstorm : §2 Goal + §9 함정 7건 입력 → 접근 방식·의존성 순서 정리
Phase 2 — /plan       : §3 파일별 순서 확정, §4 AC 12개를 테스트 케이스로 매핑
Phase 3 — TDD RED-GREEN-REFACTOR : 순수 함수부터. 테스트 없이 구현 먼저 금지
Phase 4 — /review     : §5 Hard Constraints 위반 0건 · LANGUAGE.md 금지어 0건 · strict 통과
Phase 5 — /pr         : §10 종료 조건 체크리스트를 PR 본문에 포함
```

### 11.2 TDD 대상 매핑

| 테스트 파일 | 테스트 대상 | AC |
|---|---|---|
| `functions/src/core/__tests__/participation.test.ts` | `decideRun` — 0~5판 경계, runIndex 계산 | 1·2·7 |
| `functions/src/core/__tests__/voteRecord.test.ts` | `runIndex` 검증(1..5, 정수) | 1 |
| `lib/arena/__tests__/bracketSeed.test.ts` | 회차별 문서 id·시드가 서로 다름 | 3 |
| `lib/__tests__/voteGate.test.ts` | 클라 게이트가 서버와 동일 판정 | 1·2·6 |
| `functions/src/core/__tests__/crownCardRecord.test.ts` | 회차별 카드 id 생성·중복 방지 | 4·5 |
| `functions/src/core/__tests__/guestVoteGuard.test.ts` | 게스트 1판 후 전면 차단 | 6 |
| 폴백 테스트 (신규) | `runIndex` 없는 옛 문서 → 1회차 | 11 |

### 11.3~11.6
템플릿 `docs/templates/HANDOFF_BRIEF_TEMPLATE.md` §11.3~11.6 그대로 적용.
**E2E 의무 대상**: 로그인 상태의 "5판 완주 → 6판째 차단" 흐름 + 비로그인 1판 게이트.

---

## §12. 이 킥의 위치

- **RUN-1은 아레나 개편(ARENA-1/2)보다 먼저다** (2026-09-03 대표 확정). 재입장 화면이 겹치므로 순서를 바꾸면 같은 화면을 두 번 만들게 된다.
- 런칭(2026-10-08) 전 반영이 목표.
- 마케팅에는 정정 서신 발송 완료 — `marketing/00_strategy/서신_티오→마케팅_참가규칙v2.0-정정_2026-09-03.md`

### 이 킥에서 의도적으로 제외 — W4 후속 항목
- **발표 시각의 현지 시각 자동 표시.** RUN-1은 **KST 고정 표기**(`21:00 KST`)로 간다. 해외 팬에게 자기 지역 시각으로 환산해 보여주는 일은 **범위 밖** — 랭킹 개편(W4)에서 다룬다. (2026-09-04 대표 확정)
