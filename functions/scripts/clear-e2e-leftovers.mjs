#!/usr/bin/env node
/**
 * clear-e2e-leftovers.mjs — 실서비스에 남은 E2E 시험 대회를 지운다 (OPS-FIX-1 · 원장 D-66).
 *
 * 무엇이 시험 대회인지는 lib/ops/e2eLeftovers.ts 한 곳이 정한다(단위 시험 있음 · Playwright 전역
 * 마무리도 같은 파일). Node 가 TS 타입을 지우고 그대로 불러 쓴다 — 실행 때 "MODULE_TYPELESS"
 * 경고가 한 줄 뜰 수 있는데 동작과 무관하다.
 *
 * 기본은 dry-run: 지울 대회와 딸린 문서 수만 표로 보인다. `--apply` 때만 지운다.
 *   지우는 것: 그 대회 문서 + contestants · votes · roundProgress · crown_cards(tournamentId 칸)
 *             + roundProgress · bracket_seeds · crown_cards · tournament_runs({uid}_{tid}[_rN])
 *             + ranking_cache/{tid}
 *   지우지 않는 것: 사용자·익명 계정(2026-10-18 대표) · 진짜 대회 · "확인 필요"(이름에 e2e·test 만 든 것)
 *             · guest_runs/{uid} (대회가 아니라 사람 단위 하루 판 수 — 지우면 그 게스트의 한도가 풀린다)
 *
 * 열쇠 (둘 중 하나 · 내용은 출력하지 않는다):
 *   GOOGLE_APPLICATION_CREDENTIALS=<키 파일 경로>   또는   FIREBASE_ADMIN_SDK_KEY="$(cat <키 파일>)"
 *
 * Usage (실행은 대표):
 *   GOOGLE_APPLICATION_CREDENTIALS=~/wc48-keys/admin-key.json node functions/scripts/clear-e2e-leftovers.mjs [--apply]
 */
import { readFileSync } from "node:fs";
import admin from "firebase-admin";
import {
  RELATED_BY_FIELD,
  RELATED_BY_RUN_ID,
  RELATED_BY_TOURNAMENT_ID,
  isRunScopedDocOf,
  planLeftovers,
} from "../../lib/ops/e2eLeftovers.ts";

function loadCredential() {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (raw) {
    const json = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
    return { credential: admin.credential.cert(json), projectId: json.project_id };
  }
  const file = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (file) {
    const json = JSON.parse(readFileSync(file, "utf8"));
    return { credential: admin.credential.cert(json), projectId: json.project_id };
  }
  return null;
}

/** 지울 대회 하나에 딸린 문서 참조 전부 (중복 없이). */
async function relatedRefs(db, tid, runScopedIds) {
  const refs = new Map();
  for (const coll of RELATED_BY_FIELD) {
    const snap = await db.collection(coll).where("tournamentId", "==", tid).get();
    for (const d of snap.docs) refs.set(d.ref.path, d.ref);
  }
  for (const [coll, ids] of Object.entries(runScopedIds)) {
    for (const id of ids) if (isRunScopedDocOf(id, tid)) refs.set(`${coll}/${id}`, db.collection(coll).doc(id));
  }
  for (const coll of RELATED_BY_TOURNAMENT_ID) {
    const ref = db.collection(coll).doc(tid);
    if ((await ref.get()).exists) refs.set(ref.path, ref);
  }
  return [...refs.values()];
}

function countBy(refs) {
  const out = {};
  for (const r of refs) out[r.parent.id] = (out[r.parent.id] ?? 0) + 1;
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const unknown = args.filter((a) => a !== "--apply");
  if (unknown.length) throw new Error(`알 수 없는 인자: ${unknown.join(" ")} (쓸 수 있는 것: --apply)`);
  const apply = args.includes("--apply");

  const cred = loadCredential();
  if (!cred) throw new Error("열쇠가 필요합니다: GOOGLE_APPLICATION_CREDENTIALS(키 파일 경로) 또는 FIREBASE_ADMIN_SDK_KEY.");
  admin.initializeApp({ credential: cred.credential });
  const db = admin.firestore();
  console.log(`[clear-e2e-leftovers] project: ${cred.projectId} · ${apply ? "APPLY (지운다)" : "dry-run (지우지 않는다)"}`);

  const tSnap = await db.collection("tournaments").get();
  const plan = planLeftovers(tSnap.docs.map((d) => ({ id: d.id, data: d.data() })));

  // 판 단위 문서는 id 로만 대회를 알 수 있다 — 컬렉션마다 id 목록을 한 번만 읽는다(내용은 읽지 않음).
  const runScopedIds = {};
  if (plan.toDelete.length > 0) {
    for (const coll of RELATED_BY_RUN_ID) {
      runScopedIds[coll] = (await db.collection(coll).listDocuments()).map((r) => r.id);
    }
  }

  console.log(`\n대회 ${tSnap.size}개 · 지울 시험 대회 ${plan.toDelete.length}개 · 확인 필요 ${plan.toReview.length}개 · 진짜 ${plan.realCount}개\n`);
  const work = [];
  for (const t of plan.toDelete) {
    const refs = await relatedRefs(db, t.id, runScopedIds);
    work.push({ t, refs });
    const tDoc = tSnap.docs.find((d) => d.id === t.id);
    const created = tDoc?.get("createdAt")?.toDate?.().toISOString() ?? "";
    console.log(`  ✗ ${t.id} · "${t.title}" · 주인 ${t.hostUid} · 만든 시각 ${created} · 이유 ${t.reasons.join(", ")}`);
    console.log(`      딸린 문서 ${refs.length}개 ${JSON.stringify(countBy(refs))}`);
  }
  for (const t of plan.toReview) {
    console.log(`  ? ${t.id} · "${t.title}" · 주인 ${t.hostUid} — 이름에 e2e·test 가 들었지만 확실한 신호가 없어 지우지 않는다`);
  }

  if (!apply) {
    console.log("\n[clear-e2e-leftovers] dry-run — 아무것도 지우지 않았습니다. 지우려면 --apply.");
    return;
  }
  let deleted = 0;
  for (const { t, refs } of work) {
    const all = [...refs, db.collection("tournaments").doc(t.id)];
    for (let i = 0; i < all.length; i += 400) {
      const batch = db.batch();
      for (const r of all.slice(i, i + 400)) batch.delete(r);
      await batch.commit();
    }
    deleted += all.length;
  }
  console.log(`\n[clear-e2e-leftovers] 시험 대회 ${work.length}개 · 문서 ${deleted}개를 지웠습니다. 다시 dry-run 으로 0개를 확인하세요.`);
}

main().catch((err) => {
  console.error(`[clear-e2e-leftovers] 실패: ${err.message}`);
  process.exit(1);
});
