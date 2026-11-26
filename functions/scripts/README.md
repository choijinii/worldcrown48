# functions/scripts

Operational scripts. Not part of the deployed Functions runtime.

| Script | Purpose |
|---|---|
| `copy-crown.mjs` / `copy-ranking.mjs` | Build-time: mirror pure `lib/` modules into `functions/src/_*` so Functions render identically to the client. |
| `seed-preview.mjs` | Inject canonical preview data for every module so a designer can spot-check built domains (W-3, ADR-0008 companion). |

---

## seed-preview.mjs

Unified preview seeder. One command injects the canonical data for every
module. Replaces the per-module inline seeds that used to live only inside E2E
specs — there were never standalone `seed-c*.mjs` files.

### Auth

Reads `FIREBASE_ADMIN_SDK_KEY` (raw service-account JSON **or** base64), the
same variable the E2E specs use. The Admin SDK bypasses security rules, so this
is a privileged tool.

```bash
export FIREBASE_ADMIN_SDK_KEY='<raw-json-or-base64>'
```

### Safeguards

- **Refuses to run when `NODE_ENV=production`** — it never touches a production
  runtime.
- **Idempotent** — existing docs are skipped, not overwritten. Re-running is safe.

### Options

| Flag | Default | Meaning |
|---|---|---|
| `--module=all\|b1\|c1\|c2\|c3\|d1\|e1` | `all` | Modules to seed (comma list allowed, e.g. `b1,c1`). |
| `--deadline=past\|future` | `future` | Tournament Deadline for the Arena tournament. `past` reveals the C-3 ranking (deadline gate); `future` keeps it locked. |
| `--cleanup` | — | Remove seeded docs instead of creating them. |
| `--help`, `-h` | — | Show usage. |

### Examples

```bash
# 1. Seed everything (active Arena tournament + 48 contestants, ranking,
#    lab draft, sample voter). The Dev Nav "Arena" link resolves after this.
node functions/scripts/seed-preview.mjs --module=all

# 2. Test the C-3 ranking deadline gate — past deadline → ranking revealed.
node functions/scripts/seed-preview.mjs --module=c3 --deadline=past

# 3. Seed just the operator-console (B-1) draft tournament.
node functions/scripts/seed-preview.mjs --module=b1

# 4. Tear everything down.
node functions/scripts/seed-preview.mjs --module=all --cleanup

# 5. Seed two modules at once.
node functions/scripts/seed-preview.mjs --module=b1,c1
```

### What each module seeds

| Module | Writes |
|---|---|
| `c1` / `c2` | Shared active Arena tournament `dev-preview` + 48 contestants (crown is produced by playing it through). |
| `c3` | The above **plus** `ranking_cache/dev-preview` (4 ranked rows, Vote Rate only). |
| `b1` | A `draft` tournament `dev-preview-lab` for the operator console list. |
| `d1` | A sample `users/dev-preview-voter` profile for the Account surface. |
| `e1` | Nothing — Policy Hub renders static content. |

The shared Arena id `dev-preview` matches `SAMPLE_TOURNAMENT_ID` in
`lib/dev/devNav.ts`, so the Dev Nav **Arena** link points at seeded data.

---

## assign-founding-rank.mjs · clear-waitlist-test.mjs (PRE-REG-1)

- `assign-founding-rank.mjs` — 옛 사전등록 문서(번호 없음)에 **등록 시각 순서대로** 선착순 번호를
  매기고 번호 기록(`waitlist_meta/founding`)을 봉인한다. 봉인 전에는 등록 함수가 번호 없이 저장한다.
  기본 dry-run(건수·순서만 · 메일은 가림), `--apply` 로 실행. 계획 = `assign-founding-rank.lib.mjs`(단위 시험).
- `clear-waitlist-test.mjs` — 시험 메일(`@wc48.test`) 등록(`waitlist_test` + `waitlist_meta/test`)을 모음째
  지운다. 기본 dry-run, `--apply` 로 삭제. 진짜 `waitlist` 는 건드리지 않는다.

## compare-ranking-accum.mjs (T5 차트 증분 집계 · 읽기 전용)

배포 전에 실서비스에 대고 돌려, 누적(`ranking_accum/{tid}`)이 대회 기록 전량을 처음부터 다시 센 값과
같은지 확인한다(누적의 `cursorMs` 까지 · 크론의 그림자 비교와 같은 계산). **아무것도 쓰지 않는다.**
먼저 `cd functions && npm run build`(빌드 결과 `lib/core` 를 가져온다). 인증 = ADC(`gcloud auth
application-default login`) 또는 `FIREBASE_ADMIN_SDK_KEY`.

```
node functions/scripts/compare-ranking-accum.mjs --project <프로젝트 id> [--tournament <tid>] [--json]
```

`--tournament` 없으면 집계 창 안 대회 전부(크론과 같은 쿼리). 대회마다 일치 여부 · 다른 엔트리(두 값) ·
`runIndex`/`isGuest` 없는 기록 수 · 읽은 문서 수를 낸다. 누적 문서가 없으면 그렇게 적고 전량 요약만 낸다.

⚠ 비용: 대상 대회마다 그 대회 기록(votes)을 **전부** 읽는다 — 큰 대회는 `--tournament` 로 하나씩 돌린다.

## request-ranking-recount.mjs (T5 차트 증분 집계 · 다시 세기 요청)

되돌리기(롤백) 뒤 다시 배포할 때 쓴다. 롤백 동안 옛 함수가 돌면 기록은 바뀌었는데 누적(`ranking_accum`)은
그대로일 수 있다 — 증분은 지난 누적을 믿으므로, 다시 배포한 뒤 이 스크립트로 다시 세기를 요청한다.
쓰는 것은 `ranking_recount_requests/{tid}` 문서(`{tournamentId, reason:"admin", requestedAt: 서버 시각}`)
**하나뿐**이고, 실제 다시 세기는 다음 발표(09:00 · 21:00 KST)가 하며 예산에 닿으면 5분 도우미가 잇는다.
기본은 dry-run(쓸 문서만 출력) · `--apply` 가 있어야 쓴다. 먼저 `cd functions && npm run build`. 인증은
compare 스크립트와 같다(ADC 또는 `FIREBASE_ADMIN_SDK_KEY`).

```
node functions/scripts/request-ranking-recount.mjs --project <프로젝트 id> --tournament <tid>
node functions/scripts/request-ranking-recount.mjs --project <프로젝트 id> --all-in-window
node functions/scripts/request-ranking-recount.mjs --project <프로젝트 id> --all-in-window --apply
```

`--all-in-window` 는 크론과 같은 쿼리(마감이 집계 창 시작보다 뒤인 대회)다. 다시 세기는 대회 기록을
처음부터 다 읽으므로 비용은 compare 스크립트와 같은 크기다.

## survey-rate-articles.mjs (T5 PR 2 · 옛 rate 기사 조사 · 읽기 전용)

기사 숫자 허용 목록(2026-11-25 확정)으로 빠진 옛 rate 칸이 이미 만든 기사에 얼마나 남았는지 본다.
`news` 컬렉션을 **읽기만** 하고 고치거나 지우지 않는다(보고만 · 시험이 소스 글자로 쓰기 0 확인).
걸리는 조건: ① `evidence.stats` 라벨이 `RATE`·`MOMENTUM` 이거나 값에 `%` ② 본문 `stats` 블록 항목(언어마다)에 `%`.
판정은 `survey-rate-articles.lib.mjs`(단위 시험). 인증은 compare 스크립트와 같다.

```
node functions/scripts/survey-rate-articles.mjs --project <프로젝트 id> --out outputs/t5-evidence/rate-articles.md
```
