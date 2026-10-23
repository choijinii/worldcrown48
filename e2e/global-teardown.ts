/**
 * Playwright global teardown — 오래된 시험 대회를 한 번 더 쓸어 낸다 (OPS-FIX-1 · 원장 D-66 ⑤).
 *
 * 시험마다 afterAll 정리가 있지만 CI 가 취소·시간 초과로 끊기면 돌지 않는다. 그래서 실행이
 * 끝날 때마다 `e2e == true` 이고 **심은 지 2시간 넘은** 대회만 지운다 — 같은 Firebase 프로젝트에서
 * 동시에 도는 다른 CI 실행의 대회(방금 심은 것)는 건드리지 않는다. 규칙은 lib/ops/e2eLeftovers.ts
 * (정리 스크립트와 같은 파일). 익명·사용자 계정은 지우지 않는다(2026-10-18 대표).
 *
 * 열쇠(FIREBASE_ADMIN_SDK_KEY)가 없으면 아무것도 하지 않는다. 실패해도 시험 결과를 바꾸지 않는다.
 */
import * as admin from "firebase-admin";
import {
  RELATED_BY_FIELD,
  RELATED_BY_RUN_ID,
  RELATED_BY_TOURNAMENT_ID,
  isRunScopedDocOf,
  isStaleE2ETournament,
} from "@/lib/ops/e2eLeftovers";

function loadServiceAccount(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded) as admin.ServiceAccount;
}

export default async function globalTeardown(): Promise<void> {
  try {
    const sa = loadServiceAccount();
    if (!sa) return;
    if (admin.apps.length === 0) admin.initializeApp({ credential: admin.credential.cert(sa) });
    const db = admin.firestore();

    const snap = await db.collection("tournaments").where("e2e", "==", true).get();
    const now = Date.now();
    const stale = snap.docs.filter((d) => isStaleE2ETournament(d.data(), now));
    if (stale.length === 0) return;

    const runIds: Record<string, string[]> = {};
    for (const coll of RELATED_BY_RUN_ID) {
      runIds[coll] = (await db.collection(coll).listDocuments()).map((r) => r.id);
    }
    for (const t of stale) {
      const refs = new Map<string, admin.firestore.DocumentReference>();
      for (const coll of RELATED_BY_FIELD) {
        const s = await db.collection(coll).where("tournamentId", "==", t.id).get();
        for (const d of s.docs) refs.set(d.ref.path, d.ref);
      }
      for (const [coll, ids] of Object.entries(runIds)) {
        for (const id of ids) if (isRunScopedDocOf(id, t.id)) refs.set(`${coll}/${id}`, db.collection(coll).doc(id));
      }
      for (const coll of RELATED_BY_TOURNAMENT_ID) refs.set(`${coll}/${t.id}`, db.collection(coll).doc(t.id));
      const all = [...Array.from(refs.values()), t.ref];
      for (let i = 0; i < all.length; i += 400) {
        const batch = db.batch();
        for (const r of all.slice(i, i + 400)) batch.delete(r);
        await batch.commit();
      }
      console.log(`[global-teardown] 오래된 시험 대회 ${t.id} 와 딸린 문서 ${all.length - 1}개를 지웠다`);
    }
  } catch (err) {
    console.warn("[global-teardown] 시험 대회 쓸기 실패 — 시험 결과와 무관", err);
  }
}
