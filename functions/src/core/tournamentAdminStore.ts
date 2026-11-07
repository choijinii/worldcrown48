/**
 * 대회 삭제 · 조기 마감 · 숨김의 읽기·쓰기 — ARENA-2 PR 3 (원장 D-86).
 *
 * 판정은 tournamentAdmin.ts(순수). 이 파일은 Firestore 를 인자로 받아 에뮬레이터 통합 시험
 * (tests/rules/tournament-admin.store.test.ts)이 진짜 저장소에 대고 돌린다. 부르는 곳 = manageTournament.ts.
 *
 * 삭제 순서 (참여 0명만):
 *   1. 트랜잭션으로 대회 문서에 `removingAt`(지우는 중)을 남긴다. 그 뒤의 onVote 트랜잭션은 대회 문서를
 *      다시 읽어 이 표시를 보고 거절한다 — "0건으로 셌는데 지우는 사이 선택이 들어와 주인 없이 남는" 틈을 닫는다.
 *   2. 선택 기록(게스트 포함) 수와 발행 기사 수를 센다. 하나라도 걸리면 표시를 거두고 거절한다(아무것도 안 지움).
 *   3. 딸린 기록 → 크라운 카드 그림 → 대회 문서 순서로 지운다. 대회 문서가 마지막이라 중간에 실패해도
 *      다시 누르면 이어서 지운다(표시가 남아 그사이 선택도 막힌다).
 */
import type { Firestore } from "firebase-admin/firestore";
import {
  TOURNAMENT_ADMIN_ERROR_CODES as CODES,
  decideRemoval,
  isTournamentRunDocOf,
  planCloseEarly,
  planVisibility,
  type TournamentAdminErrorCode,
  type VisibilityAction,
} from "./tournamentAdmin";

export class TournamentAdminError extends Error {
  constructor(readonly code: TournamentAdminErrorCode) {
    super(code);
    this.name = "TournamentAdminError";
  }
}

/** 크라운 카드 그림(Storage `crown-cards/{tid}/`)을 지우는 쪽 — 콜러블은 진짜 버킷, 시험은 기록만. */
export interface CrownCardFiles {
  deletePrefix(prefix: string): Promise<void>;
}

/**
 * 시각 값과 "칸 지우기"는 부르는 쪽의 firebase-admin 에서 받는다. 이 파일을 시험(루트의 firebase-admin)과
 * 함수(functions 의 firebase-admin)가 함께 쓰는데, 다른 사본의 시각·칸 지우기 값을 섞어 쓰면
 * 저장이 거절된다(waitlistCore 의 serverTime 주입과 같은 이유).
 */
export interface StoreValues {
  timestamp(ms: number): unknown;
  deleteField(): unknown;
}

/** `tournamentId` 칸으로 고르는 딸린 기록. */
const BY_TOURNAMENT_ID = ["contestants", "roundProgress", "crown_cards", "admin_alerts"] as const;
/** tournamentId 칸이 없어 문서 id(`{uid}_{tid}[_r{n}]`)로 고르는 딸린 기록. */
const BY_RUN_DOC_ID = ["bracket_seeds", "tournament_runs"] as const;

/** Firestore 시각 → ms. 어느 사본의 값이든 toMillis 로 읽는다(instanceof 는 사본마다 다르다). */
function deadlineMsOf(value: unknown): number | null {
  const v = value as { toMillis?: () => number } | null | undefined;
  return v && typeof v.toMillis === "function" ? v.toMillis() : null;
}

export async function removeTournament(
  db: Firestore,
  tournamentId: string,
  deps: { storage: CrownCardFiles; nowMs: number; values: StoreValues },
): Promise<{ status: "deleted" }> {
  const tRef = db.collection("tournaments").doc(tournamentId);

  // 1. 지우는 중 표시
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(tRef);
    if (!snap.exists) throw new TournamentAdminError(CODES.NOT_FOUND);
    tx.update(tRef, { removingAt: deps.values.timestamp(deps.nowMs) });
  });

  // 2. 참여 · 발행 기사
  const [choices, articles] = await Promise.all([
    db.collection("votes").where("tournamentId", "==", tournamentId).count().get(),
    db.collection("news").where("tournamentId", "==", tournamentId).get(),
  ]);
  const decision = decideRemoval({
    choiceCount: choices.data().count,
    publishedArticleCount: articles.docs.filter((d) => d.get("status") === "published").length,
  });
  if (!decision.ok) {
    await tRef.update({ removingAt: deps.values.deleteField() });
    throw new TournamentAdminError(decision.code);
  }

  // 3. 딸린 기록 → 그림 → 대회
  const writer = db.bulkWriter();
  for (const col of BY_TOURNAMENT_ID) {
    const snap = await db.collection(col).where("tournamentId", "==", tournamentId).get();
    for (const d of snap.docs) void writer.delete(d.ref);
  }
  for (const col of BY_RUN_DOC_ID) {
    // id 만 읽는다(select()) — 칸이 없어 쿼리로 좁힐 수 없다. 삭제는 드문 운영 동작이다.
    const snap = await db.collection(col).select().get();
    for (const d of snap.docs) if (isTournamentRunDocOf(d.id, tournamentId)) void writer.delete(d.ref);
  }
  // 뉴스는 초안만 — 내린 기사(archived)는 기록으로 남긴다. 발행 기사는 위에서 이미 막았다.
  for (const d of articles.docs) if (d.get("status") === "draft") void writer.delete(d.ref);
  await writer.close();

  await db.recursiveDelete(db.collection("ranking_cache").doc(tournamentId));
  await deps.storage.deletePrefix(`crown-cards/${tournamentId}/`);
  await tRef.delete();
  return { status: "deleted" };
}

export async function closeTournamentEarly(
  db: Firestore,
  tournamentId: string,
  deps: { nowMs: number; actorUid: string; values: StoreValues },
): Promise<{ status: "closed"; deadlineMs: number }> {
  const tRef = db.collection("tournaments").doc(tournamentId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(tRef);
    if (!snap.exists) throw new TournamentAdminError(CODES.NOT_FOUND);
    const plan = planCloseEarly({ deadlineMs: deadlineMsOf(snap.get("tournamentDeadline")), nowMs: deps.nowMs });
    if (!plan.ok) throw new TournamentAdminError(plan.code);
    const at = deps.values.timestamp(plan.deadlineMs);
    // status 는 건드리지 않는다 — 진행 중인 팬이 계속 읽고 끝까지 마친다(④).
    tx.update(tRef, { tournamentDeadline: at, closedEarlyAt: at, closedEarlyBy: deps.actorUid });
    return { status: "closed" as const, deadlineMs: plan.deadlineMs };
  });
}

export async function setTournamentVisibility(
  db: Firestore,
  tournamentId: string,
  action: VisibilityAction,
  deps: { nowMs: number; actorUid: string; values: StoreValues },
): Promise<{ status: "hidden" | "active" }> {
  const tRef = db.collection("tournaments").doc(tournamentId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(tRef);
    if (!snap.exists) throw new TournamentAdminError(CODES.NOT_FOUND);
    const plan = planVisibility(action, snap.get("status"));
    if (!plan.ok) throw new TournamentAdminError(plan.code);
    if (plan.status === "hidden") {
      tx.update(tRef, {
        status: plan.status,
        featured: plan.featured,
        hiddenAt: deps.values.timestamp(deps.nowMs),
        hiddenBy: deps.actorUid,
      });
    } else {
      tx.update(tRef, { status: plan.status, hiddenAt: deps.values.deleteField(), hiddenBy: deps.values.deleteField() });
    }
    return { status: plan.status };
  });
}

/** 대회마다 참여가 있는지만 — 숫자는 돌려주지 않는다(화면에 참여 수를 보이지 않는다). */
export async function tournamentFanStates(
  db: Firestore,
  tournamentIds: string[],
): Promise<Record<string, { hasFans: boolean }>> {
  const entries = await Promise.all(
    tournamentIds.map(async (id) => {
      const agg = await db.collection("votes").where("tournamentId", "==", id).count().get();
      return [id, { hasFans: agg.data().count > 0 }] as const;
    }),
  );
  return Object.fromEntries(entries);
}
