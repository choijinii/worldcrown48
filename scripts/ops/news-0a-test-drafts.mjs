/**
 * NEWS-0a 3-2 — 쌓인 시험 초안 지우기 (두 단계 · 대표 확인 사이에 둠).
 *
 *   node scripts/ops/news-0a-test-drafts.mjs list     # 1단계 — 읽기만. outputs/news-0a/ 에 묶음 파일
 *   node scripts/ops/news-0a-test-drafts.mjs delete   # 2단계 — 대표 "지워" 뒤에만. 가장 최근 1단계 파일의 (가)만
 *
 * 2단계: (가) 문서 전체를 outputs/news-0a/backup-*.json 에 먼저 내려 두고(git 에 넣지 않음), 100건씩 다시 읽어
 * 지금도 초안 · (가) 이고 사본 뒤 바뀌지 않았을 때만(updateTime 조건) 지운다. 묶음 사이 3초 쉼. 다시 돌려도 안전.
 *
 * 인증(화면 · 기록 · 파일에 열쇠를 남기지 않는다):
 *   FIREBASE_ADMIN_SDK_KEY(JSON 원문 또는 base64 · 기존 ops 스크립트와 같은 이름)가 있으면 그 서비스 계정,
 *   없으면 이 컴퓨터에 로그인한 firebase CLI 의 접근 토큰(~/.config/configstore/firebase-tools.json — 먼저
 *   `npx firebase projects:list` 로 새로 받는다). 데이터는 Firestore REST 로만 읽는다.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { classifyDraft, runDeleteStep } from "./news-0a-test-drafts.lib.mjs";

const PROJECT = "worldcrown48";
// 시험용: NEWS0A_EMULATOR=host:port 면 로컬 에뮬레이터(열쇠 "owner")를 부른다 — 실서비스에 닿지 않는다.
const EMU = process.env.NEWS0A_EMULATOR;
const BASE = `${EMU ? `http://${EMU}` : "https://firestore.googleapis.com"}/v1/projects/${PROJECT}/databases/(default)/documents`;
const OUT_DIR = process.env.NEWS0A_OUT_DIR || join(process.cwd(), "outputs", "news-0a");

async function accessToken() {
  if (EMU) return "owner";
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (raw) {
    const sa = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
    if (sa.project_id !== PROJECT) throw new Error(`열쇠의 프로젝트가 ${sa.project_id} — 멈춘다`);
    const { default: admin } = await import("firebase-admin");
    return (await admin.credential.cert(sa).getAccessToken()).access_token;
  }
  const t = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8")).tokens ?? {};
  if (!t.access_token || (t.expires_at ?? 0) < Date.now() + 5 * 60_000) {
    throw new Error("firebase CLI 토큰이 없거나 곧 끝난다 — `npx firebase projects:list` 를 먼저 돌린다");
  }
  return t.access_token;
}

function decode(v) {
  if (!v || typeof v !== "object") return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("nullValue" in v) return null;
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, decode(x)]));
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(decode);
  return undefined;
}
const fieldsOf = (doc) => Object.fromEntries(Object.entries(doc.fields ?? {}).map(([k, x]) => [k, decode(x)]));

async function post(token, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Firestore ${path} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function listDrafts(token) {
  const rows = await post(token, ":runQuery", {
    structuredQuery: {
      from: [{ collectionId: "news" }],
      where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "draft" } } },
      select: { fields: ["slug", "title", "origin", "template", "createdAt", "tournamentId", "status", "e2e"].map((fieldPath) => ({ fieldPath })) },
    },
  });
  return rows.filter((r) => r.document).map((r) => ({ id: r.document.name.split("/").pop(), ...fieldsOf(r.document) }));
}

async function countByStatus(token, status) {
  const r = await post(token, ":runAggregationQuery", {
    structuredAggregationQuery: {
      structuredQuery: {
        from: [{ collectionId: "news" }],
        where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: status } } },
      },
      aggregations: [{ alias: "n", count: {} }],
    },
  });
  return Number(r[0]?.result?.aggregateFields?.n?.integerValue ?? 0);
}

async function loadTournaments(token, ids) {
  const map = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const res = await post(token, ":batchGet", {
      documents: chunk.map((id) => `projects/${PROJECT}/databases/(default)/documents/tournaments/${id}`),
      mask: { fieldPaths: ["status", "e2e", "hostUid", "title"] },
    });
    for (const r of res) {
      if (r.found) map.set(r.found.name.split("/").pop(), { exists: true, ...fieldsOf(r.found) });
      else if (r.missing) map.set(r.missing.split("/").pop(), { exists: false });
    }
  }
  return map;
}

const titleKo = (t) => (t && typeof t === "object" ? t.ko ?? t.en ?? "" : typeof t === "string" ? t : "");
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

async function list() {
  const token = await accessToken();
  const drafts = await listDrafts(token);
  const ids = [...new Set(drafts.map((d) => d.tournamentId).filter((x) => typeof x === "string" && x))];
  const tournaments = await loadTournaments(token, ids);
  const counts = { published: await countByStatus(token, "published"), archived: await countByStatus(token, "archived") };

  const groups = { delete: [], keep: [], unsure: [] };
  for (const d of drafts) {
    const { group, reason } = classifyDraft(d, tournaments);
    if (group === "skip") continue;
    const t = d.tournamentId ? tournaments.get(d.tournamentId) : undefined;
    groups[group].push({
      slug: d.slug ?? d.id,
      docId: d.id,
      titleKo: titleKo(d.title),
      origin: d.origin ?? "",
      template: d.template ?? "",
      createdAt: d.createdAt ?? "",
      tournamentId: d.tournamentId ?? "",
      tournamentState: !d.tournamentId ? "-" : !t?.exists ? "없음" : `${t.status ?? "?"}${t.e2e === true ? " · e2e" : ""}${typeof t.hostUid === "string" && t.hostUid.startsWith("seed-") ? " · seed" : ""}`,
      tournamentTitle: t?.exists ? titleKo(t.title) : "",
      reason,
    });
  }
  for (const g of Object.values(groups)) g.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(OUT_DIR, { recursive: true });
  const summary = { at: new Date().toISOString(), drafts: drafts.length, delete: groups.delete.length, keep: groups.keep.length, unsure: groups.unsure.length, published: counts.published, archived: counts.archived };
  writeFileSync(join(OUT_DIR, `step1-${stamp}.json`), JSON.stringify({ summary, groups }, null, 2));
  const table = (rows) =>
    ["| slug | 제목(한국어) | 출처 | 만든 날 | 대회 id | 대회 상태 | 까닭 |", "|---|---|---|---|---|---|---|"]
      .concat(rows.map((r) => `| ${cell(r.slug)} | ${cell(r.titleKo)} | ${r.origin} | ${String(r.createdAt).slice(0, 16)} | ${r.tournamentId} | ${cell(r.tournamentState)}${r.tournamentTitle ? ` — ${cell(r.tournamentTitle)}` : ""} | ${r.reason} |`))
      .join("\n");
  writeFileSync(
    join(OUT_DIR, `step1-${stamp}.md`),
    [
      `# NEWS-0a 1단계 목록 (읽기만) — ${summary.at}`,
      "",
      `초안 ${summary.drafts} · (가) 지울 것 ${summary.delete} · (나) 남길 것 ${summary.keep} · (다) 판단이 서지 않는 것 ${summary.unsure} · 참고: 발행 ${counts.published} · 보관 ${counts.archived}`,
      "",
      `## (나) 남길 것 — ${groups.keep.length}`, "", table(groups.keep), "",
      `## (다) 판단이 서지 않는 것 — ${groups.unsure.length}`, "", table(groups.unsure), "",
      `## (가) 지울 것 — ${groups.delete.length}`, "", table(groups.delete), "",
    ].join("\n"),
  );
  console.log(JSON.stringify(summary));
  console.log(`파일: outputs/news-0a/step1-${stamp}.md · .json`);
}

async function readArticles(token, ids) {
  const res = await post(token, ":batchGet", {
    documents: ids.map((id) => `projects/${PROJECT}/databases/(default)/documents/news/${id}`),
  });
  const map = new Map();
  for (const r of res) {
    if (r.found) map.set(r.found.name.split("/").pop(), { exists: true, data: fieldsOf(r.found), updateTime: r.found.updateTime, raw: r.found });
    else if (r.missing) map.set(r.missing.split("/").pop(), { exists: false });
  }
  return map;
}

async function deleteMany(token, items) {
  const res = await post(token, ":batchWrite", {
    writes: items.map((it) => ({
      delete: `projects/${PROJECT}/databases/(default)/documents/news/${it.id}`,
      currentDocument: { updateTime: it.updateTime },
    })),
  });
  return items.map((it, i) => {
    const code = res.status?.[i]?.code ?? 0;
    if (code === 0) return { id: it.id, ok: true };
    // 9 FAILED_PRECONDITION · 5 NOT_FOUND = 사본 뒤에 바뀌었거나 사라짐 → 건너뜀
    if (code === 9 || code === 5) return { id: it.id, ok: false, reason: "precondition" };
    return { id: it.id, ok: false, reason: `code ${code}` };
  });
}

async function del() {
  const step1 = readdirSync(OUT_DIR).filter((f) => /^step1-.*\.json$/.test(f)).sort().pop();
  if (!step1) throw new Error("1단계 파일이 없다 — list 를 먼저");
  const candidateIds = JSON.parse(readFileSync(join(OUT_DIR, step1), "utf8")).groups.delete.map((r) => r.docId);
  const token = await accessToken();
  const before = { draft: await countByStatus(token, "draft"), published: await countByStatus(token, "published"), archived: await countByStatus(token, "archived") };
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(OUT_DIR, `backup-${stamp}.json`);
  const result = await runDeleteStep({
    candidateIds,
    readArticles: async (ids) => {
      const m = new Map();
      for (let i = 0; i < ids.length; i += 100) for (const [k, v] of await readArticles(token, ids.slice(i, i + 100))) m.set(k, v);
      return m;
    },
    readTournaments: (ids) => loadTournaments(token, ids),
    writeBackup: (docs) => {
      writeFileSync(backupPath, JSON.stringify({ at: new Date().toISOString(), from: step1, count: docs.length, docs }, null, 1));
      const back = JSON.parse(readFileSync(backupPath, "utf8"));
      if (back.count !== docs.length || back.docs.length !== docs.length) throw new Error("안전 사본을 다시 읽어 보니 건수가 다르다 — 멈춘다");
      console.log(`안전 사본 ${docs.length}건 → ${backupPath}`);
    },
    deleteMany: (items) => deleteMany(token, items),
    batchSize: 100,
    pauseMs: 3000,
    retries: 2,
  });
  const after = { draft: await countByStatus(token, "draft"), published: await countByStatus(token, "published"), archived: await countByStatus(token, "archived") };
  const report = { step1, backupPath, before, after, ...result };
  writeFileSync(join(OUT_DIR, `step2-result-${stamp}.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

const cmd = process.argv[2];
if (cmd === "list") await list();
else if (cmd === "delete") await del();
else {
  console.error("쓰는 법: node scripts/ops/news-0a-test-drafts.mjs list | delete");
  process.exit(1);
}
