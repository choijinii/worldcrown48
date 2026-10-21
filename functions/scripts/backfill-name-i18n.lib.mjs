/**
 * backfill-name-i18n.lib.mjs — 이미 발행된 대회의 엔트리 이름 3언어 백필 (NAME-I18N-1 · 원장 D-61).
 *
 * firebase-admin·AI SDK 없이 순수 함수 + 주입받는 의존성(load·translate·write)만 — 그래서
 * Vitest 로 "dry-run 은 쓰지 않는다"를 그대로 시험한다. 실행 파일(backfill-name-i18n.mjs)은
 * Firestore·Haiku 를 이어 붙이기만 한다.
 *
 * 흐름 (대표 검수 게이트):
 *   1. dry-run(기본) — 대회마다 AI 1번 → 검수표(md)만 만든다. Firestore 에 쓰지 않는다.
 *   2. 대표가 검수표의 "영어" 칸을 고친다(확신 낮은 이름은 맨 위에 모여 있다).
 *   3. --write <검수표> — 표에 적힌 값만 쓴다(AI 다시 부르지 않음). en = es, ko = name.
 * 이미 `nameI18n.en` 이 있는 엔트리는 어느 단계에서든 건너뛴다 — 다시 돌려도 안전하다.
 */
const HANGUL_RE = /[가-힣ᄀ-ᇿ㄰-㆏]/;

function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

/** `nameI18n.en` 이 비었거나 없으면 백필 대상. */
export function needsNameI18n(c) {
  return !str(c?.nameI18n?.en);
}

/**
 * 발행된 대회(status ≠ draft)마다 채울 엔트리를 순서대로 고른다(순수).
 * @returns {{ targets: { tournament, contestants }[], alreadyFilled: number }}
 */
export function planNameBackfill(tournaments, contestants) {
  const byTournament = new Map();
  for (const c of contestants) {
    const list = byTournament.get(c.tournamentId) ?? [];
    list.push(c);
    byTournament.set(c.tournamentId, list);
  }
  const targets = [];
  let alreadyFilled = 0;
  for (const t of tournaments) {
    if (t.status === "draft") continue;
    const list = (byTournament.get(t.id) ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const need = [];
    for (const c of list) {
      if (needsNameI18n(c)) need.push(c);
      else alreadyFilled += 1;
    }
    if (need.length > 0) targets.push({ tournament: t, contestants: need });
  }
  return { targets, alreadyFilled };
}

function cell(v) {
  return String(v ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

const HEAD = ["| 순서 | 한글 | 영어 (en = es) | id |", "|---|---|---|---|"];

function tableOf(rows) {
  return [...HEAD, ...rows.map((r) => `| ${r.order} | ${cell(r.name)} | ${cell(r.en)} | ${r.id} |`)];
}

/**
 * 대표 검수표(md). 확신 낮음·실패를 맨 위("먼저 볼 이름")에, 나머지를 대회별로.
 * 각 엔트리는 표에 한 번만 나온다 — 고칠 자리가 하나다. 표 모양은 parseReviewTable 이 읽는다.
 */
export function renderReviewTable({ date, results }) {
  const flagged = [];
  const rest = [];
  for (const r of results) {
    const bad = r.rows.filter((x) => !x.sure || !str(x.en));
    const good = r.rows.filter((x) => x.sure && str(x.en));
    if (bad.length) flagged.push({ tournament: r.tournament, rows: bad });
    if (good.length) rest.push({ tournament: r.tournament, rows: good });
  }
  const count = (list) => list.reduce((n, r) => n + r.rows.length, 0);
  const out = [
    `# NAME-I18N-1 — 엔트리 이름 검수표 (${date})`,
    "",
    "- 백필 dry-run 결과. **Firestore 에는 아직 아무것도 쓰지 않았다.**",
    "- 고칠 곳은 **영어** 칸 하나뿐이다. es 는 en 을 그대로 복사해 쓴다(원장 D-61).",
    "- 영어 칸을 비워 두면 그 엔트리는 쓰지 않는다(화면은 한글 그대로).",
    "- 한글·id 칸은 고치지 않는다 — `--write` 가 문서의 지금 한글 이름과 대조한다.",
    `- 대회 ${results.length}개 · 이름 ${count(results)}개 · 먼저 볼 이름 ${count(flagged)}개`,
    "",
    "## 1. 먼저 볼 이름 — AI 가 공식 철자를 확신하지 못했거나 받지 못한 것",
    "",
  ];
  if (flagged.length === 0) out.push("(없음)", "");
  for (const r of flagged) {
    out.push(`### ${cell(r.tournament.title)} (${r.tournament.id})`, "", ...tableOf(r.rows), "");
  }
  out.push("## 2. 나머지 — 대회별", "");
  if (rest.length === 0) out.push("(없음)", "");
  for (const r of rest) {
    out.push(`### ${cell(r.tournament.title)} (${r.tournament.id})`, "", ...tableOf(r.rows), "");
  }
  return out.join("\n");
}

function splitRow(line) {
  const cells = [];
  let cur = "";
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "\\" && line[i + 1] === "|") {
      cur += "|";
      i += 1;
    } else if (ch === "|") {
      cells.push(cur);
      cur = "";
    } else cur += ch;
  }
  cells.push(cur);
  return cells.slice(1, -1).map((c) => c.trim());
}

const ID_RE = /^[A-Za-z0-9_-]{6,}$/;

/** 검수표 → [{ id, name, en }] (표에 나온 순서). 머리줄·구분줄은 건너뛴다. */
export function parseReviewTable(md) {
  const rows = [];
  for (const line of md.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = splitRow(line.trim());
    if (cells.length !== 4) continue;
    const [order, name, en, id] = cells;
    if (!/^\d+$/.test(order) || !ID_RE.test(id)) continue;
    rows.push({ id, name, en });
  }
  return rows;
}

/**
 * 검수표 행 + 지금 문서 → 쓸 값(순수). 쓰지 않는 행은 이유를 남긴다:
 * duplicate · missing-doc · name-changed · already-filled · empty-en · hangul-en.
 */
export function buildNameWrites(rows, docsById) {
  const writes = [];
  const skipped = [];
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.id)) {
      skipped.push({ id: r.id, reason: "duplicate" });
      continue;
    }
    seen.add(r.id);
    const doc = docsById.get(r.id);
    const en = str(r.en);
    if (!doc) skipped.push({ id: r.id, reason: "missing-doc" });
    else if (str(doc.name) !== str(r.name)) skipped.push({ id: r.id, reason: "name-changed" });
    else if (!needsNameI18n(doc)) skipped.push({ id: r.id, reason: "already-filled" });
    else if (!en) skipped.push({ id: r.id, reason: "empty-en" });
    else if (HANGUL_RE.test(en)) skipped.push({ id: r.id, reason: "hangul-en" });
    else writes.push({ id: r.id, nameI18n: { ko: str(doc.name), en, es: en } });
  }
  return { writes, skipped };
}

/**
 * dry-run — 대회마다 translate 1번 → 검수표. `deps.write` 는 부르지 않는다.
 * deps: { loadTournaments, loadContestants, translate(entries, category) → { nameI18n, unsure, failed } }
 */
export async function runDryRun(deps, { date }) {
  const [tournaments, contestants] = await Promise.all([deps.loadTournaments(), deps.loadContestants()]);
  const plan = planNameBackfill(tournaments, contestants);
  const results = [];
  let unsure = 0;
  let failed = 0;
  for (const { tournament, contestants: list } of plan.targets) {
    const got = await deps.translate(
      list.map((c) => ({ name: str(c.name), affiliation: str(c.affiliation) })),
      str(tournament.category),
    );
    const unsureSet = new Set(got.unsure ?? []);
    const rows = list.map((c, i) => {
      const en = str(got.nameI18n?.[i]?.en);
      if (!en) failed += 1;
      else if (unsureSet.has(i)) unsure += 1;
      return { id: c.id, order: c.order, name: str(c.name), en, sure: Boolean(en) && !unsureSet.has(i) };
    });
    results.push({ tournament: { id: tournament.id, title: str(tournament.title) }, rows });
  }
  const names = results.reduce((n, r) => n + r.rows.length, 0);
  return {
    md: renderReviewTable({ date, results }),
    summary: { tournaments: results.length, names, unsure, failed, alreadyFilled: plan.alreadyFilled },
  };
}

/** --write — 검수표의 값만 쓴다. AI 는 부르지 않는다. */
export async function runWrite(deps, md) {
  const contestants = await deps.loadContestants();
  const docsById = new Map(contestants.map((c) => [c.id, c]));
  const { writes, skipped } = buildNameWrites(parseReviewTable(md), docsById);
  if (writes.length > 0) await deps.write(writes);
  return { writes, skipped };
}
