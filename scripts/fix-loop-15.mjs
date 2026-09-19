#!/usr/bin/env node
/**
 * fix-loop-15.mjs — 기존 참가자 루프 구간을 15초로 보정 (ARENA-1 PR 1 · 원장 D-12).
 *
 * DRY-RUN 이 기본: `contestants` 전부를 읽어 보정 계획(planLoopFix)을 출력만 한다.
 * `--apply` 를 붙이면 출력한 계획 그대로 `media.embed.end` 만 고쳐 쓴다 — "드라이런 로그 =
 * 실제 결과". 다른 필드는 건드리지 않는다. 이미 15초 이상인 문서는 계획에 들어가지 않는다.
 *
 * 사용 (실행은 대표):
 *   FIREBASE_ADMIN_SDK_KEY=... node scripts/fix-loop-15.mjs            # 드라이런
 *   FIREBASE_ADMIN_SDK_KEY=... node scripts/fix-loop-15.mjs --apply    # 실제 보정
 *   node scripts/fix-loop-15.mjs --help
 *
 * 인증: FIREBASE_ADMIN_SDK_KEY (JSON 원문 또는 base64). Admin SDK 라 규칙을 우회한다.
 */
import admin from "firebase-admin";
import { LOOP_15_SECONDS, planLoopFix } from "./fix-loop-15.lib.mjs";

const HELP = `fix-loop-15 — 참가자 루프 구간 end = start + ${LOOP_15_SECONDS} (원장 D-12)

  (옵션 없음)  드라이런: 계획만 출력, 쓰지 않음
  --apply      출력한 계획대로 media.embed.end 를 고쳐 쓴다
  --help, -h   이 도움말
`;

/** Firestore 한 번의 일괄 쓰기 상한은 500 — 여유를 둔다. */
const BATCH_SIZE = 400;

function parseArgs(argv) {
  const out = { apply: false, help: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--apply") out.apply = true;
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

  const snap = await db.collection("contestants").get();
  const plan = planLoopFix(snap.docs.map((d) => ({ id: d.id, data: d.data() })));

  console.log(`[fix-loop-15] 프로젝트 ${serviceAccount.project_id} · 참가자 ${snap.size}건 중 보정 대상 ${plan.length}건`);
  for (const p of plan) {
    console.log(
      `  ${p.id}\t${p.tournamentId}\t${p.name}\tstart ${p.start}\tend ${p.oldEnd ?? "(없음)"} → ${p.newEnd}`,
    );
  }

  if (!opts.apply) {
    console.log("\n[fix-loop-15] 드라이런 — 아무것도 쓰지 않았습니다. 실제 보정은 --apply.");
    return;
  }

  let written = 0;
  for (let i = 0; i < plan.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const p of plan.slice(i, i + BATCH_SIZE)) {
      batch.update(db.doc(`contestants/${p.id}`), { "media.embed.end": p.newEnd });
    }
    await batch.commit();
    written += Math.min(BATCH_SIZE, plan.length - i);
  }
  console.log(`\n[fix-loop-15] --apply 완료 — ${written}건의 media.embed.end 를 고쳤습니다.`);
}

main().catch((err) => {
  console.error("[fix-loop-15] 실패:", err);
  process.exit(1);
});
