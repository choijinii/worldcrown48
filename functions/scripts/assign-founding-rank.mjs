#!/usr/bin/env node
/**
 * assign-founding-rank.mjs — 옛 사전등록 문서에 선착순 번호를 매기고 번호 기록을 봉인한다 (PRE-REG-1).
 *
 * 계획(어느 문서에 몇 번)은 전부 assign-founding-rank.lib.mjs 에 있고 단위 시험으로 고정돼 있다.
 * 여기는 그 계획을 Firestore 에 옮겨 적기만 한다.
 *
 * 기본은 **dry-run**(아무것도 쓰지 않음) — 건수와 순서만 출력한다. 대표 승인 뒤 --apply.
 * --apply 는 한 트랜잭션 안에서 문서 전부와 번호 기록을 다시 읽어 계획을 다시 세운 뒤
 * 번호와 봉인(waitlist_meta/founding.lastRank)을 함께 쓴다 — dry-run 과 apply 사이에 들어온
 * 등록도 등록 시각 순서대로 함께 번호를 받는다. 끝나면 전체를 다시 읽어 점검한다.
 *
 * 출력에 메일 원문은 남기지 않는다(앞 한 글자 + 도메인).
 *
 * Usage (실행은 대표):
 *   FIREBASE_ADMIN_SDK_KEY="$(cat <키파일>)" node functions/scripts/assign-founding-rank.mjs
 *   FIREBASE_ADMIN_SDK_KEY="$(cat <키파일>)" node functions/scripts/assign-founding-rank.mjs --apply
 */
import admin from "firebase-admin";
import { maskEmail, planFoundingRanks, rankOrderProblems } from "./assign-founding-rank.lib.mjs";

const WAITLIST = "waitlist";
const META = "waitlist_meta";
const FOUNDING = "founding";
/** 한 트랜잭션에 쓰는 문서 수 상한(Firestore 500) — 여유를 둔다. 넘으면 멈추고 알린다. */
const MAX_WRITES = 450;

const HELP = `assign-founding-rank — 옛 사전등록 문서 번호 매기기 + 번호 기록 봉인

  (옵션 없음)       dry-run: 건수와 순서만 출력, 쓰지 않음
  --apply           출력한 규칙대로 번호를 쓰고 waitlist_meta/founding 을 만든다
  --allow-problems  순서 깨짐 등 문제가 보고돼도 --apply 를 진행한다(대표 판단 뒤에만)
  --help, -h        이 도움말
`;

function parseArgs(argv) {
  const out = { apply: false, allowProblems: false, help: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--apply") out.apply = true;
    else if (arg === "--allow-problems") out.allowProblems = true;
    else throw new Error(`알 수 없는 인자: ${arg}`);
  }
  return out;
}

function loadServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded);
}

function toRow(snap) {
  const createdAt = snap.get("createdAt");
  const rank = snap.get("founding_rank");
  return {
    id: snap.id,
    email: snap.get("email"),
    source: snap.get("utm.source") ?? null,
    createdAtMs: createdAt && typeof createdAt.toMillis === "function" ? createdAt.toMillis() : null,
    rank: typeof rank === "number" ? rank : null,
  };
}

const kst = (ms) =>
  ms === null ? "(시각 없음)" : new Date(ms + 9 * 3600_000).toISOString().replace("T", " ").slice(0, 19) + " KST";

function printPlan(rows, metaLastRank, plan) {
  const ranked = rows.filter((r) => r.rank !== null).length;
  console.log(
    `[assign-founding-rank] waitlist ${rows.length}건 · 번호 있음 ${ranked} · 번호 없음 ${rows.length - ranked} · ` +
      `번호 기록 ${metaLastRank === null ? "없음(봉인 전)" : `lastRank=${metaLastRank}`}`,
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const a of plan.assignments) {
    const r = byId.get(a.id);
    console.log(`  #${String(a.rank).padStart(4)}  ${kst(r.createdAtMs)}  ${maskEmail(r.email)}${r.source ? `  utm_source=${r.source}` : ""}`);
  }
  console.log(`  → 매길 번호 ${plan.assignments.length}건 · 봉인 lastRank=${plan.lastRank}`);
  if (plan.problems.length) {
    console.log(`\n  ⚠ 문제 ${plan.problems.length}건:`);
    for (const p of plan.problems) console.log(`    - ${p}`);
  }
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`${err.message}\n\n${HELP}`);
    process.exit(1);
  }
  if (opts.help) {
    console.log(HELP);
    return;
  }
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.error("ABORT: FIREBASE_ADMIN_SDK_KEY 가 필요합니다 (서비스 계정 키 JSON 또는 base64).");
    process.exit(1);
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();
  const metaRef = db.collection(META).doc(FOUNDING);
  console.log(`[assign-founding-rank] 프로젝트 ${serviceAccount.project_id}`);

  if (!opts.apply) {
    const [snap, meta] = await Promise.all([db.collection(WAITLIST).get(), metaRef.get()]);
    const rows = snap.docs.map(toRow);
    const metaLastRank = meta.exists ? meta.get("lastRank") : null;
    printPlan(rows, metaLastRank, planFoundingRanks(rows, metaLastRank));
    console.log("\n[assign-founding-rank] dry-run — 아무것도 쓰지 않았습니다. 실제 실행은 --apply.");
    return;
  }

  // 같은 트랜잭션 안에서 다시 읽고 다시 계획한다 — dry-run 뒤에 들어온 등록도 함께.
  const written = await db.runTransaction(async (tx) => {
    const [snap, meta] = await Promise.all([tx.get(db.collection(WAITLIST)), tx.get(metaRef)]);
    const rows = snap.docs.map(toRow);
    const metaLastRank = meta.exists ? meta.get("lastRank") : null;
    const plan = planFoundingRanks(rows, metaLastRank);
    printPlan(rows, metaLastRank, plan);
    if (plan.problems.length && !opts.allowProblems) {
      throw new Error("문제가 보고돼 멈춥니다 — 대표 판단 뒤 --allow-problems 로 다시 실행하세요.");
    }
    if (plan.assignments.length > MAX_WRITES) {
      throw new Error(`한 번에 ${plan.assignments.length}건 — 상한 ${MAX_WRITES}건을 넘습니다. 나눠 쓰는 판을 먼저 만드세요.`);
    }
    // 이미 봉인됐고 매길 것도 없으면 아무것도 쓰지 않는다(처음 봉인 시각을 지킨다).
    if (meta.exists && plan.assignments.length === 0) return 0;
    for (const a of plan.assignments) tx.update(db.collection(WAITLIST).doc(a.id), { founding_rank: a.rank });
    const sealFields = meta.exists
      ? { lastRank: plan.lastRank }
      : { lastRank: plan.lastRank, sealedAt: admin.firestore.FieldValue.serverTimestamp() };
    tx.set(metaRef, sealFields, { merge: true });
    return plan.assignments.length;
  });
  console.log(`\n[assign-founding-rank] 번호 ${written}건을 썼습니다 · 번호 기록 봉인됨.`);

  // 점검 — 봉인과 거의 같은 순간에 끝난 등록이 번호 없이 남았을 수 있다. 남았으면 다시 돌리라고 알린다.
  const after = (await db.collection(WAITLIST).get()).docs.map(toRow);
  const problems = rankOrderProblems(after);
  console.log(`[assign-founding-rank] 점검: ${after.length}건 · 문제 ${problems.length}건`);
  for (const p of problems) console.log(`    - ${p}`);
  if (problems.some((p) => p.startsWith("번호 없음"))) {
    console.log("  → 번호 없는 문서가 남았습니다. --apply 를 한 번 더 실행하세요(남은 문서만 이어서 매깁니다).");
  }
}

main().catch((err) => {
  console.error(`[assign-founding-rank] 실패: ${err.message}`);
  process.exit(1);
});
