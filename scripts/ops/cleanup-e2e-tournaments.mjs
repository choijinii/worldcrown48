/**
 * 실서비스 1회 정리 — Lab 시험(B-1)이 실패하며 남긴 "E2E Tournament" 대회 (대표 승인 2026-11-26).
 *
 * GitHub Actions(.github/workflows/ops-cleanup-e2e-tournaments.yml)에서만 돈다. 관리자 열쇠 = 저장소 비밀
 * FIREBASE_ADMIN_SDK_KEY(자동 시험과 같은 것) · 시험 계정 = 비밀 B1_TEST_ADMIN_UID(B-1 시험의 TEST_UID).
 *
 * 대상 = 제목이 정확히 "E2E Tournament" · 만든 계정 = 시험 계정 · 만든 날(KST) = TARGET_DATE. 셋 다 맞아야 한다.
 *   MODE=list   — 목록만 적는다(아무것도 안 지움). 같은 제목인데 조건이 안 맞는 것도 "제외"로 함께 적는다.
 *   MODE=delete — DELETE_IDS 에 적힌 id 만, 조건을 다시 확인한 뒤 Lab [삭제] 버튼과 같은 코드(removeTournament)로 지운다.
 *                 참여 기록이 있으면 그 코드가 거절한다(아무것도 안 지움). 지운 뒤 다시 읽어 남지 않았음을 확인한다.
 * 결과는 실행 요약(GITHUB_STEP_SUMMARY)에 적는다.
 */
import { appendFileSync } from "node:fs";
import { createRequire } from "node:module";
import admin from "firebase-admin";

const require = createRequire(import.meta.url);
const { removeTournament } = require("../../functions/lib/core/tournamentAdminStore.js");

const PROJECT = "worldcrown48";
const TITLE = "E2E Tournament";
const MODE = process.env.MODE ?? "list";
const TARGET_DATE = process.env.TARGET_DATE ?? "";
const DELETE_IDS = (process.env.DELETE_IDS ?? "").split(/[\s,]+/).filter(Boolean);
const TEST_UID = process.env.TEST_UID ?? "";

const out = [];
const say = (line) => {
  out.push(line);
  console.log(line);
};
const finish = (code) => {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join("\n") + "\n");
  process.exit(code);
};

const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
if (!raw) {
  console.error("FIREBASE_ADMIN_SDK_KEY 가 없다 — 멈춘다");
  process.exit(1);
}
const sa = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
if (sa.project_id !== PROJECT) {
  console.error(`열쇠의 프로젝트가 ${sa.project_id} — ${PROJECT} 가 아니라 멈춘다`);
  process.exit(1);
}
if (!TEST_UID || !(TARGET_DATE === "any" || /^\d{4}-\d{2}-\d{2}$/.test(TARGET_DATE)) || !["list", "delete"].includes(MODE)) {
  console.error("TEST_UID · TARGET_DATE(YYYY-MM-DD) · MODE(list|delete) 중 빠진 것이 있다 — 멈춘다");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const kst = (ms) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(ms));
const msOf = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : null);
const mask = (uid) => (uid ? `…${String(uid).slice(-4)}` : "(없음)");

async function describe(doc) {
  const d = doc.data();
  const created = msOf(d.createdAt);
  const [votes, contestants] = await Promise.all([
    db.collection("votes").where("tournamentId", "==", doc.id).count().get(),
    db.collection("contestants").where("tournamentId", "==", doc.id).count().get(),
  ]);
  const isTest = d.hostUid === TEST_UID;
  const sameDay = TARGET_DATE === "any" || (created !== null && kst(created).slice(0, 10) === TARGET_DATE);
  const testTitle = d.title === TITLE || /^E2E Tournament #[\d.]+$/.test(String(d.title ?? ""));
  return {
    id: doc.id,
    title: d.title,
    created: created === null ? "(없음)" : `${kst(created)} KST`,
    host: `${mask(d.hostUid)} ${isTest ? "(시험 계정)" : "(시험 계정 아님)"}`,
    status: `${d.status ?? "?"}${d.hiddenAt ? " · 숨김" : ""}${d.e2e === true ? " · 시험 표시 있음" : " · 시험 표시 없음"}`,
    votes: votes.data().count,
    contestants: contestants.data().count,
    // 대표 조건(2026-11-26 두 번째): 시험 계정이 만든 것 + 팬 참여 기록 0.
    target: testTitle && isTest && sameDay && votes.data().count === 0,
  };
}

// 옛 고정 이름 + 실행 번호가 붙은 새 이름("E2E Tournament #…")을 함께 읽는다.
const snap = await db.collection("tournaments").where("title", ">=", TITLE).where("title", "<", TITLE + "\uf8ff").get();
const rows = await Promise.all(snap.docs.map(describe));
rows.sort((a, b) => a.created.localeCompare(b.created));

say(`## "${TITLE}" 대회 — ${MODE === "list" ? "목록만(지우지 않음)" : "지우기"} · 대상 날짜 ${TARGET_DATE} (KST)`);
say("");
say("| # | id | 이름 | 만든 시각 | 만든 계정 | 발행 상태 | 엔트리 | 참여 기록 | 판정 |");
say("|---|---|---|---|---|---|---|---|---|");
rows.forEach((r, i) =>
  say(`| ${i + 1} | ${r.id} | ${r.title} | ${r.created} | ${r.host} | ${r.status} | ${r.contestants} | ${r.votes} | ${r.target ? "지울 대상" : "제외"} |`),
);
say("");
say(`"${TITLE}"로 시작하는 이름 ${rows.length}개 · 지울 대상 ${rows.filter((r) => r.target).length}개`);

if (MODE === "list") finish(0);

// ---- delete ----
const bucketName = process.env.STORAGE_BUCKET ?? `${PROJECT}.firebasestorage.app`;
const bucket = admin.storage().bucket(bucketName);
const [bucketOk] = await bucket.exists();
if (!bucketOk) {
  say(`❌ 그림 저장소 ${bucketName} 를 찾지 못했다 — 지우지 않고 멈춘다`);
  finish(1);
}
const byId = new Map(rows.map((r) => [r.id, r]));
const values = {
  timestamp: (ms) => admin.firestore.Timestamp.fromMillis(ms),
  deleteField: () => admin.firestore.FieldValue.delete(),
};
let failed = 0;
say("");
say("| id | 결과 |");
say("|---|---|");
for (const id of DELETE_IDS) {
  const r = byId.get(id);
  if (!r || !r.target) {
    say(`| ${id} | ❌ 대상 조건(시험 이름·시험 계정·참여 기록 0)에 안 맞아 건드리지 않음 |`);
    failed++;
    continue;
  }
  try {
    await removeTournament(db, id, {
      nowMs: Date.now(),
      values,
      storage: { deletePrefix: (prefix) => bucket.deleteFiles({ prefix }) },
    });
    const [left, leftEntries] = await Promise.all([
      db.collection("tournaments").doc(id).get(),
      db.collection("contestants").where("tournamentId", "==", id).count().get(),
    ]);
    const gone = !left.exists && leftEntries.data().count === 0;
    say(`| ${id} | ${gone ? "✅ 지움 · 다시 읽어 대회·엔트리 0 확인" : "❌ 지운 뒤에도 남음"} |`);
    if (!gone) failed++;
  } catch (e) {
    say(`| ${id} | ❌ 거절: ${e?.code ?? e?.message ?? e} (아무것도 안 지움) |`);
    failed++;
  }
}
finish(failed ? 1 : 0);
