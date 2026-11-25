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
