#!/usr/bin/env node
/**
 * clear-waitlist-test.mjs — 시험 등록(@wc48.test)을 모음째 지운다 (PRE-REG-1).
 *
 * 시험 메일은 등록 함수가 `waitlist_test` 에 시험 번호(`waitlist_meta/test`)로 저장한다 —
 * 진짜 `waitlist`·진짜 번호는 건드리지 않는다. 이 스크립트는 그 둘만 지운다.
 * E2E(e2e/prereg1-waitlist.spec.ts)는 끝날 때 자기가 만든 문서를 스스로 지운다; 이건 한꺼번에
 * 비우는 손잡이다.
 *
 * 기본은 dry-run(건수만). --apply 로 지운다.
 *   FIREBASE_ADMIN_SDK_KEY="$(cat <키파일>)" node functions/scripts/clear-waitlist-test.mjs [--apply]
 */
import admin from "firebase-admin";

const TEST_COLLECTION = "waitlist_test";
const META = "waitlist_meta";
const TEST_META = "test";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded);
}

async function main() {
  const args = process.argv.slice(2);
  const unknown = args.filter((a) => a !== "--apply");
  if (unknown.length) throw new Error(`알 수 없는 인자: ${unknown.join(" ")} (쓸 수 있는 것: --apply)`);
  const apply = args.includes("--apply");

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) throw new Error("FIREBASE_ADMIN_SDK_KEY 가 필요합니다 (서비스 계정 키 JSON 또는 base64).");
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const snap = await db.collection(TEST_COLLECTION).get();
  const meta = await db.collection(META).doc(TEST_META).get();
  console.log(
    `[clear-waitlist-test] 프로젝트 ${serviceAccount.project_id} · ${TEST_COLLECTION} ${snap.size}건 · ` +
      `시험 번호 기록 ${meta.exists ? `lastRank=${meta.get("lastRank")}` : "없음"}`,
  );
  if (!apply) {
    console.log("[clear-waitlist-test] dry-run — 지우지 않았습니다. 지우려면 --apply.");
    return;
  }
  await db.recursiveDelete(db.collection(TEST_COLLECTION));
  await db.collection(META).doc(TEST_META).delete();
  console.log("[clear-waitlist-test] 시험 등록과 시험 번호 기록을 지웠습니다.");
}

main().catch((err) => {
  console.error(`[clear-waitlist-test] 실패: ${err.message}`);
  process.exit(1);
});
