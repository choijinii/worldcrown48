#!/usr/bin/env node
/**
 * NEWS-2 결정 J — 옛 기사에 생성 뒤 검사 기록을 처음 한 번 채운다(검사 기록이 없으면 새 발행 규칙이 발행을 막는다).
 *
 *   node scripts/ops/news-check-backfill.mjs list    — 읽기만. 검사 기록이 없거나 글과 어긋난 기사 수와 목록(쓰기 0)
 *   node scripts/ops/news-check-backfill.mjs apply   — 그 기사에만 checkWarnings · checkedText · checkBlocked 를 적는다
 *
 * 적는 칸은 그 셋뿐 — 제목 · 본문 · 상태 · 발행 시각은 건드리지 않는다. 판단은 함수 코드와 같은 것
 * (functions/lib/core/newsCheckState.js checkPatchFor — 먼저 `cd functions && npm run build`).
 * 문서 시각(updateTime) 조건으로 쓴다 — 사이에 관리자가 고쳤으면 그 기사는 건너뛴다(onNewsCheck 트리거가 맡는다).
 * 다시 돌려도 안전하다(이미 맞는 기사는 건너뜀).
 * 인증은 news-0a-test-drafts.mjs 와 같다(FIREBASE_ADMIN_SDK_KEY 또는 로그인한 firebase CLI 토큰). 열쇠는 화면 · 파일에 남기지 않는다.
 * 시험용: NEWS_CHECK_EMULATOR=host:port 면 로컬 에뮬레이터만 부른다.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { checkPatchFor, recheckPatch } = require(join(process.cwd(), "functions", "lib", "core", "newsCheckState.js"));

const PROJECT = process.env.NEWS_CHECK_PROJECT || "worldcrown48";
const EMU = process.env.NEWS_CHECK_EMULATOR;
const BASE = `${EMU ? `http://${EMU}` : "https://firestore.googleapis.com"}/v1/projects/${PROJECT}/databases/(default)/documents`;

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

export function encode(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, encode(x)])) } };
}

async function listAll(token) {
  const out = [];
  let pageToken = "";
  do {
    const res = await fetch(`${BASE}/news?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Firestore list HTTP ${res.status}`);
    const j = await res.json();
    out.push(...(j.documents ?? []));
    pageToken = j.nextPageToken ?? "";
  } while (pageToken);
  return out.map((d) => ({ id: d.name.split("/").pop(), updateTime: d.updateTime, data: Object.fromEntries(Object.entries(d.fields ?? {}).map(([k, x]) => [k, decode(x)])) }));
}

async function main() {
  const mode = process.argv[2];
  if (mode !== "list" && mode !== "apply") throw new Error("사용: list | apply");
  const token = await accessToken();
  const docs = await listAll(token);
  const need = docs.filter((d) => d.data.title && d.data.body && recheckPatch(d.data) !== null);
  const rows = need.map((d) => {
    const p = checkPatchFor(d.data);
    return { slug: d.id, status: d.data.status, origin: d.data.origin, warnings: p.checkWarnings.length, blocked: p.checkBlocked, patch: p, updateTime: d.updateTime };
  });
  const by = (k) => rows.reduce((m, r) => ((m[r[k]] = (m[r[k]] ?? 0) + 1), m), {});
  console.log(JSON.stringify({ at: new Date().toISOString(), mode, total: docs.length, need: rows.length, byStatus: by("status"), blocked: rows.filter((r) => r.blocked).length }));
  for (const r of rows) console.log(`${r.slug}\t${r.status}\t${r.origin}\t경고 ${r.warnings}\t${r.blocked ? "잠김" : "통과"}`);
  if (mode === "list") return;

  let written = 0, skipped = 0, failed = 0;
  for (const r of rows) {
    const qs = ["checkWarnings", "checkedText", "checkBlocked"].map((f) => `updateMask.fieldPaths=${f}`).join("&");
    const res = await fetch(`${BASE}/news/${r.slug}?${qs}&currentDocument.updateTime=${encodeURIComponent(r.updateTime)}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ fields: { checkWarnings: encode(r.patch.checkWarnings), checkedText: encode(r.patch.checkedText), checkBlocked: encode(r.patch.checkBlocked) } }),
    });
    if (res.ok) written += 1;
    else if (res.status === 400 || res.status === 409 || res.status === 412) skipped += 1; // 사이에 고쳐짐 — 트리거가 맡는다
    else failed += 1;
  }
  console.log(JSON.stringify({ written, skipped, failed }));
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
