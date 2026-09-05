# RUN-1 참가 규칙 v2.0 — 설계서

> **작성**: 2026-09-05 · Claude Code (Superpowers brainstorming Phase 1 산출물)
> **브랜치**: `feat/run-1-participation-v2`

## 0. 이 문서의 위치 — 규칙을 복사하지 않는다

**정본은 `outputs/HANDOFF_RUN-1_참가규칙v2.0_2026-09-03.md`다.** 목표(§2)·파일별 지시(§3)·완료 조건(§4)·
제약(§5)·승인 문구(§8)·함정(§9)은 **전부 거기 있고 여기 복사하지 않는다** (CLAUDE.md Stale-Doc Guard:
"하위 문서는 규칙을 복사하지 말고 부모를 가리킨다").

이 문서가 담는 것은 핸드오프가 담지 않는 **설계** 뿐이다 — 모듈 경계 · 데이터 흐름 · 의존성 순서 · 테스트 전략.
2026-09-05 대표 확정 사항(1안 회차 구조 · B안 이름 규칙 · 조건 9건)은 **핸드오프 §3.0에 박제**되어 있다.

---

## 1. 모듈 경계

### 1.1 신설 — `lib/run/` (순수, import 없음, 클라이언트·서버 공용)

리포의 기존 단일 소스 관례를 그대로 쓴다: `lib/<도메인>/*.ts` 를 빌드 시 `functions/src/_<도메인>/` 로 복사
(`copy-crown` · `copy-ranking` · `copy-news` · `copy-embed` 4개가 이미 있다). **신설 `functions/scripts/copy-run.mjs`.**
복사되는 파일은 `@/` 경로도 브라우저 API도 쓰지 않는다.

| 모듈 | 책임 | 의존 |
|---|---|---|
| `lib/run/runDocId.ts` | **문서 이름을 만드는 유일한 곳** (§3.0 B안 조건 1). `runDocId(uid, tid, runIndex)` · `crownCardStoragePath(tid, uid, runIndex)` · `bracketSeedCacheKey(...)`. "1회차는 접미사 없음"을 아는 유일한 코드 | 없음 |
| `lib/run/decideRun.ts` | 회차·한도·마감 판정 (§3.0 시그니처). `todayKST` 를 **입력으로 받는다** — 내부에서 시계를 읽지 않는다. `normalizeRunIndex` 도 여기 (§1.3) | 없음 |
| `lib/run/guestRun.ts` | 게스트 한도 판정 — `guest_runs/{uid}` 기반, 하루 통틀어 1판 (§3.0 조건 3) | 없음 |

**왜 공용인가**: §9 함정 5 — 클라이언트 게이트와 서버 게이트가 어긋나면 P0다(2026-07-05 사고가 이 유형).
"같은 테스트로 묶는다"보다 **같은 코드를 실행한다**가 강하고, 그 수단이 이미 리포에 있다.

### 1.2 변경 모듈과 각각의 새 책임

| 모듈 | 바뀌는 책임 |
|---|---|
| `functions/src/onVote.ts` | 트랜잭션 안에서 `tournament_runs` + `roundProgress` 를 읽어 `decideRun` 호출 → `runIndex` 확정 → vote 문서에 기록 · `new_run` 일 때만 카운터 갱신. 게스트는 `guest_runs` 로 판정 |
| `functions/src/advanceRound.ts` | 라운드 완료 판정에 `runIndex` 필터 추가(§9 함정 9). 회차는 vote 문서의 **필드**에서 읽는다 |
| `functions/src/onChampionConfirmed.ts` | `after.runIndex` → `runDocId` · `crownCardStoragePath` (§9 함정 10) |
| `functions/src/linkSessionVote.ts` | 게스트→로그인 이관의 문서 id 4곳을 `runDocId` 경유로 (§9 함정 11) |
| `lib/arena/bracketSeed.ts` | id·캐시 키를 `runDocId` 경유로. create-once·mulberry32·로드 구조는 **그대로** (§5 DON'T 4) |
| `lib/arena/voteStore.ts` | 선택 기록 조회에 `runIndex` 필터(§9 함정 9) + 회차를 스토어 상태로 보관 |
| `lib/arena/useRoundTransition.ts` | 구독 문서 id를 `runDocId` 경유로 |
| `lib/voteGate.ts` | `decideRun` 을 그대로 호출하는 얇은 어댑터가 된다 (판정 로직이 여기서 사라진다) |
| `app/arena/[tournamentId]/page.tsx` | 완주 화면에 [다시 도전 (n/5)] · 지난 판 Crown Card 목록 · 마감 안내 (§6 화면 스케치) |

**삭제 후보**: `functions/src/core/participation.ts` · `functions/src/core/guestVoteGuard.ts` —
유일한 호출자가 `onVote` 이고, 판정 로직이 `_run/` 으로 옮겨가면 남는 것이 없다.
핸드오프 §3은 "MODIFY"라고 적었으나 실제로는 **대체**다. (얇은 재수출 껍데기를 남기지 않는다 — 이름이 둘이면 다음 사람이 헷갈린다.)

### 1.3 `normalizeRunIndex` — 전환 시점의 유일한 옛 데이터 처리

배포 직후에는 아무 계정에도 `tournament_runs` 문서가 없다 → `runIndex = 0`.
그런데 **이미 1판을 완주해 둔 계정**이 있다: `roundProgress/{uid}_{tid}.complete === true` 인데 `runIndex` 는 0이다.
그대로 두면 "새 판 = 1회차"로 판정되어 **완주된 1회차 문서 위에 다시 들어가** 즉시 완주 화면이 뜨고 새 카드가 안 생긴다.

```ts
normalizeRunIndex({ runIndex, legacyRunExists })
  // runIndex > 0        → 그대로
  // runIndex === 0 && legacyRunExists → 1   (옛 판이 곧 1회차다)
  // 그 외               → 0                 (아직 한 판도 안 돌았다)
```

`legacyRunExists` = 접미사 없는 `roundProgress/{uid}_{tid}` 문서의 존재.
**이것이 AC 11의 실체다** — 폴백 분기가 아니라 회차 번호를 한 번 보정하는 것뿐이고, 그 뒤 로직은 완전히 동일하다.

---

## 2. 데이터 흐름 — 세 갈래뿐

읽는 문서는 늘 **두 개**다: `tournament_runs/{uid}_{tid}` 와 `roundProgress/{runDocId(uid,tid,n)}`.
클라이언트와 서버가 **같은 두 문서를 읽고 같은 함수를 돌려** 같은 회차에 도달한다.

```
        tournament_runs 읽기 → normalizeRunIndex → n
                                    │
                roundProgress(n).complete 읽기
                                    │
                              decideRun(...)
        ┌───────────────┬───────────┴───────────┬────────────────┐
   continue(n)      new_run(n+1)          limit_reached    deadline_passed
   한도 미소모       한도 1 소모            5/5 안내          마감 안내
   그 판 이어하기    새 씨앗·새 진행문서    (§8 dailyLimit)   (§8 deadlinePassed)
```

- **판 시작 시점에 카운트**한다(§5 DO 4) — `new_run` 판정이 난 그 판의 **첫 선택**에서 서버가 카운터를 올린다.
  아레나에 들어오기만 하고 한 번도 안 고르면 카운트되지 않는다. 미완주 판은 `continue` 로만 재진입되므로
  **판만 태우는 구멍이 없다**(끝내야 다음 판이 열린다).
- **마감은 `continue` 를 막지 않는다**(2026-09-05 대표 확정) — 진행 중인 판은 끝까지 간다.

---

## 3. 의존성 순서

### PR 1 — 서버 코어 (프로덕션 동작 무변화가 목표)

```
① lib/run/runDocId       ─┐
② lib/run/decideRun       ├─ 전부 순수·의존 없음 → TDD RED-GREEN이 여기 다 들어간다
③ lib/run/guestRun       ─┘
④ functions/scripts/copy-run.mjs + functions build/test 스크립트 배선
⑤ voteRecord (runIndex 검증) → ⑥ crownCardRecord → ⑦ bracketSeed
⑧ onVote (②③⑤에 의존)  → ⑨ advanceRound → ⑩ onChampionConfirmed → ⑪ linkSessionVote
⑫ firestore.rules (tournament_runs · guest_runs 신설)
```

⑦ `bracketSeed` 는 클라이언트 파일이라 PR 1에서도 화면에 닿는다.
**`runIndex` 인자에 기본값 1을 주어 호출부를 안 바꾼다** → B안(1회차 접미사 없음)과 합쳐져 PR 1의 화면 동작은 현행과 완전히 동일하다.
PR 2에서 실제 회차를 넘기기 시작한다.

**→ 여기서 §7 0단계 중간 구간 검증** (§3.0 B안 조건 2 — 건너뛰지 않는다).

### PR 2 — 화면·문구

```
voteGate(→decideRun 어댑터) → voteStore(회차 필터·회차 상태) → useRoundTransition(구독 id)
  → arena 완주 화면([다시 도전]·지난 카드·마감 안내) → messages.ts 3언어 → LoginModal
  → onVote RATE_LIMIT 20→40
```

### PR 3 — 정리·계측

```
match_session_id 해시에 runIndex → first_vote 이벤트 → scheduleRankingCache 12시간
  → 랭킹 다음 발표 시각 한 줄(오늘/내일은 날짜 비교) → daily_participation 규칙 블록 삭제
```

---

## 4. 오류 처리

- **한도·마감 거부는 서버가 최종**(§5 DO 2). 클라이언트 게이트는 UX용이고, `onVote` 가 독립적으로 다시 판정한다.
- 거부는 기존 방식 그대로 `HttpsError` + `details.code` 로 내보내고 **화면이 3언어로 번역**한다
  (한국어 메시지를 서버에서 만들지 않는다 — 2026-07 #12 회귀 방지). 마감 거부는 새 코드가 필요하다.
- **읽기 실패 시 fail-open 은 유지하지 않는다.** 회차를 잘못 짚으면 남의 판에 선택이 들어가거나 카드가 덮인다.
  회차 판정에 필요한 읽기가 실패하면 **거부**하고 재시도를 안내한다. (기존 게스트 가드의 fail-open 은 "한 판 더 허용"이라
  비용이 작았지만, 회차는 그렇지 않다.)
- 씨앗 생성의 타임아웃 레이스(`SEED_PERSIST_TIMEOUT_MS`)와 두 탭 경쟁 처리는 **그대로 둔다** — 회차가 붙어도 논리가 같다.

---

## 5. 테스트 전략

| 층 | 대상 |
|---|---|
| 순수 단위 | `runDocId`(1·2·5회차 경계) · `decideRun`(0~5판 경계·이어하기·마감·KST 리셋) · `guestRun` · `normalizeRunIndex` |
| 어댑터 단위 | `voteRecord` runIndex 검증 · `crownCardRecord` · `voteGate` 어댑터가 `decideRun` 과 같은 답을 내는지 |
| 규칙 | `tournament_runs` · `guest_runs` 소유자 읽기 / 타인 거부 / 쓰기 차단 |
| E2E | 로그인 5판 완주 → 6판째 차단 · 비로그인 1판 게이트 (§11.3 의무 대상) |
| 수동 | §7 0단계(중간 구간) + 5단계 |

**시계는 절대 실시간으로 읽지 않는다** — 순수 함수는 `todayKST` 를 주입받고, `kstDate()` 자체만 고정 `Date` 로 검증한다
(UTC 14:59:59 / 15:00:00 경계 + UTC 00:00~09:00 구간 — §3.0 조건 1·2).

---

## 6. 열린 위험 3건

| # | 위험 | 처리 |
|---|---|---|
| 1 | 옛 `votes` 에 `runIndex` 필드가 없어 회차 필터에 안 걸린다 → 전환 시점 **진행 중인 판이 초기화** | 배포 판단 기준을 **실측 전에 확정**해 뒀다 — 0건이면 배포, 1건 이상이면 대표 보고 (§3.0 조건 4) |
| 2 | 회차 필터가 붙은 `votes` 조회에 복합 인덱스가 필요할 수 있다 | 두 조회 모두 **등가 조건만** 써서 인덱스 병합이 적용될 것으로 보이나 **에뮬레이터 실측 확인**(§9 함정 9) |
| 3 | 마감 후 이어하기에 기한이 없다 → 마감된 Tournament에 계속 선택이 들어간다 | **이번 범위 밖**, §12 후속 항목으로 기록됨 (2026-09-05 대표 지시) |
