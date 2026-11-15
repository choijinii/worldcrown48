/**
 * 엔트리 내리기 저장 + 크라운 카드 다시 굽기 — IMAGE-1 PR 3 (원장 D-77 · D-83 · D-93).
 *
 * 판정은 entryTakedown.ts(순수). 여기는 Firestore 읽기·쓰기 순서만 정한다. Storage · 그림 굽기는 주입한다
 * (부르는 곳 = takeDownEntry.ts 콜러블 · onEntryTakedown.ts 트리거 — 시험은 가짜를 넣는다).
 *
 * 순서(반쪽 상태 없음):
 *   1. 트랜잭션: 기록 `entry_takedowns/{contestantId}` + 엔트리 media 교체 + 대회 `mediaTakedownAt`(열린 화면이 다시 읽는 신호)
 *   2. Storage 그림 두 장 삭제(없으면 무시) — 실패하면 오류를 올린다. 화면은 이미 이니셜이고, 다시 부르면 기록의 경로로 마저 지운다
 *   3. 차트 캐시의 그 행에서 아바타 재료(videoId · imageUrl)를 지운다 — 다음 발표(하루 두 번)를 기다리지 않는다
 *   4. 그 엔트리가 Champion 인 카드 장수를 기록 `rebake.total` 에 — 다시 굽기는 트리거가 한 쪽씩 한다
 */
import type { Firestore } from "firebase-admin/firestore";
import { planTakedown, type EntryTakedownErrorCode } from "./entryTakedown";
import { crownCardStoragePath } from "../_run/runDocId";

export class EntryTakedownError extends Error {
  constructor(public readonly code: EntryTakedownErrorCode) {
    super(code);
    this.name = "EntryTakedownError";
  }
}

export const TAKEDOWN_COLLECTION = "entry_takedowns";

export interface TakedownDeps {
  nowMs: number;
  timestamp: (ms: number) => unknown;
  deleteField: () => unknown;
  /** 파일 하나 삭제 — 이미 없으면 조용히 끝난다. */
  deleteFile: (path: string) => Promise<void>;
}

export async function takeDownEntry(
  db: Firestore,
  deps: TakedownDeps,
  input: { tournamentId: string; contestantId: string; reason: unknown; byUid: string },
): Promise<{ cards: number; already: boolean }> {
  const tRef = db.collection("tournaments").doc(input.tournamentId);
  const cRef = db.collection("contestants").doc(input.contestantId);
  const rRef = db.collection(TAKEDOWN_COLLECTION).doc(input.contestantId);

  const plan = await db.runTransaction(async (tx) => {
    const [t, c, r] = await Promise.all([tx.get(tRef), tx.get(cRef), tx.get(rRef)]);
    const p = planTakedown({
      ...input,
      nowMs: deps.nowMs,
      tournament: t.exists ? (t.data() as Record<string, unknown>) : null,
      contestant: c.exists ? (c.data() as Record<string, unknown>) : null,
      existingRecord: r.exists ? (r.data() as Record<string, unknown>) : null,
    });
    if (!p.ok || p.already) return p;
    const { atMs, ...rest } = p.record;
    tx.set(rRef, {
      ...rest,
      at: deps.timestamp(atMs),
      rebake: { total: 0, done: 0, cursor: null, finishedAt: null },
    });
    tx.update(cRef, { media: p.media });
    tx.update(tRef, { mediaTakedownAt: deps.nowMs });
    return p;
  });
  if (!plan.ok) throw new EntryTakedownError(plan.code);

  // 2. 그림 파일(이미지 대회만 경로가 있다).
  for (const path of plan.storagePaths) await deps.deleteFile(path);

  // 3. 차트 캐시 — 그 행만.
  const cacheRef = db.collection("ranking_cache").doc(input.tournamentId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(cacheRef);
    const rows = snap.exists ? (snap.get("rankings") as Record<string, unknown>[] | undefined) : undefined;
    if (!Array.isArray(rows) || !rows.some((row) => row.contestantId === input.contestantId)) return;
    tx.update(cacheRef, {
      rankings: rows.map((row) => {
        if (row.contestantId !== input.contestantId) return row;
        const { imageUrl: _drop, ...keep } = row;
        return { ...keep, videoId: null };
      }),
    });
  });

  // 4. 다시 구울 카드 장수.
  const count = await championCards(db, input.tournamentId, input.contestantId).count().get();
  const cards = count.data().count;
  if (!plan.already) await rRef.update({ "rebake.total": cards });
  return { cards, already: plan.already };
}

function championCards(db: Firestore, tournamentId: string, contestantId: string) {
  return db
    .collection("crown_cards")
    .where("tournamentId", "==", tournamentId)
    .where("championContestantId", "==", contestantId);
}

export interface RebakeDeps {
  nowMs: () => number;
  timestamp: (ms: number) => unknown;
  /** 그 엔트리를 사진 없이(이니셜) 구운 1.91:1 PNG. */
  render: (args: { tournamentId: string; tournament: Record<string, unknown>; contestant: Record<string, unknown> }) => Buffer;
  /** 같은 경로에 덮어쓴다(짧은 캐시). */
  saveCard: (path: string, png: Buffer) => Promise<void>;
}

/** 주소 끝 `&v=` 를 새 값으로(있으면 바꾸고 없으면 붙인다) — 캐시를 깬다. */
export function versionedUrl(url: string, v: number): string {
  const clean = url.replace(/&v=\d+$/, "");
  return `${clean}&v=${v}`;
}

/**
 * 카드 한 쪽(pageSize 장)을 다시 굽는다. 기록의 `rebake.cursor`(마지막으로 구운 카드 id) 다음부터.
 * 다 끝나면 `finishedAt`. 트리거가 cursor 가 바뀔 때마다 다시 부른다(한 번에 한 쪽 · 시간 초과 없음).
 */
export async function rebakeTakedownPage(
  db: Firestore,
  deps: RebakeDeps,
  contestantId: string,
  pageSize = 50,
): Promise<{ processed: number; finished: boolean }> {
  const rRef = db.collection(TAKEDOWN_COLLECTION).doc(contestantId);
  const r = await rRef.get();
  if (!r.exists) return { processed: 0, finished: true };
  const rec = r.data() as { tournamentId: string; rebake?: { cursor?: string | null; finishedAt?: unknown; done?: number } };
  if (rec.rebake?.finishedAt) return { processed: 0, finished: true };

  const [tSnap, cSnap] = await Promise.all([
    db.collection("tournaments").doc(rec.tournamentId).get(),
    db.collection("contestants").doc(contestantId).get(),
  ]);
  const tournament = (tSnap.data() ?? {}) as Record<string, unknown>;
  const contestant = (cSnap.data() ?? {}) as Record<string, unknown>;

  // 문서 id 순 — FieldPath 객체 대신 "__name__": 패키지가 둘(루트 · functions)이면 FieldPath 가 어긋난다.
  let q = championCards(db, rec.tournamentId, contestantId).orderBy("__name__").limit(pageSize);
  if (rec.rebake?.cursor) q = q.startAfter(rec.rebake.cursor);
  const page = await q.get();

  const png = deps.render({ tournamentId: rec.tournamentId, tournament, contestant });
  const now = deps.nowMs();
  for (const card of page.docs) {
    const d = card.data() as { voterUid: string; runIndex?: number; imageUrl?: string };
    await deps.saveCard(crownCardStoragePath(rec.tournamentId, d.voterUid, Number(d.runIndex ?? 1)), png);
    await card.ref.update({
      ...(typeof d.imageUrl === "string" ? { imageUrl: versionedUrl(d.imageUrl, now) } : {}),
      photoTakenDownAt: deps.timestamp(now),
    });
  }

  const finished = page.size < pageSize;
  const last = page.docs[page.docs.length - 1]?.id ?? rec.rebake?.cursor ?? null;
  await rRef.update({
    "rebake.cursor": last,
    "rebake.done": (rec.rebake?.done ?? 0) + page.size,
    ...(finished ? { "rebake.finishedAt": deps.timestamp(now) } : {}),
  });
  return { processed: page.size, finished };
}
