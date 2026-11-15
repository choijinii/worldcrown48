/**
 * takeDownEntry 콜러블 배선 + 내리기 창 읽기 (IMAGE-1 PR 3 · 원장 D-93).
 * 판정과 쓰기는 전부 서버가 한다. 창은 엔트리(공개 읽기)와 내리기 기록(관리자만 읽기 — firestore.rules)을 읽는다.
 */
import { httpsCallable } from "firebase/functions";
import { collection, getDocs, orderBy, query, where, type Timestamp } from "firebase/firestore";
import { getDb, getFunctionsInstance } from "@/lib/firebase";
import type { TakedownContestant, TakedownRecordLite } from "@/lib/lab/takedown";

export async function takeDownEntry(input: {
  tournamentId: string;
  contestantId: string;
  reason: string;
}): Promise<{ cards: number; already: boolean }> {
  const call = httpsCallable<typeof input, { cards: number; already: boolean }>(getFunctionsInstance(), "takeDownEntry");
  const res = await call(input);
  return res.data;
}

export async function loadTakedownData(tournamentId: string): Promise<{
  contestants: TakedownContestant[];
  records: Record<string, TakedownRecordLite>;
}> {
  const db = getDb();
  const [cSnap, rSnap] = await Promise.all([
    getDocs(query(collection(db, "contestants"), where("tournamentId", "==", tournamentId), orderBy("order"))),
    getDocs(query(collection(db, "entry_takedowns"), where("tournamentId", "==", tournamentId))),
  ]);
  const contestants = cSnap.docs.map((d) => {
    const x = d.data() as Omit<TakedownContestant, "id">;
    return { id: d.id, order: x.order, name: x.name, media: x.media };
  });
  const records: Record<string, TakedownRecordLite> = {};
  for (const d of rSnap.docs) {
    const x = d.data() as { at?: Timestamp; reason?: string };
    records[d.id] = { atMs: x.at?.toMillis?.(), reason: x.reason ?? "" };
  }
  return { contestants, records };
}
