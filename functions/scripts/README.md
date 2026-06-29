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
