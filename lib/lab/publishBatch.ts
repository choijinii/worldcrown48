/**
 * 발행 배치 — Tournament 1 + Contestant 48 + (있으면) 초안 삭제를 **한 writeBatch** 로.
 *
 * EDITOR-FIX-1: 초안은 발행이 성공한 뒤에만 지운다. 같은 배치에 넣으면 그 조건이
 * 원자적으로 지켜진다 — 발행이 실패하면(규칙 거부·네트워크) 초안 삭제도 함께 취소된다.
 * 쓰기 수 50 — 배치 상한 500 안이다.
 *
 * THUMB-1: 대표 매치는 편집기에선 그리드 칸 번호(0~47)다. contestant 문서 id 는 여기서
 * 정해지므로, 같은 배치 안에서 칸 번호 → id 로 바꿔 Tournament 에 `thumbnailPair` 로 싣는다.
 */
import {
  collection,
  doc,
  writeBatch,
  type DocumentData,
  type Firestore,
  type WriteBatch,
} from "firebase/firestore";
import { DRAFTS_COLLECTION } from "@/lib/lab/tournamentDraft";

export function buildPublishBatch(
  db: Firestore,
  args: {
    tournament: DocumentData;
    /** Contestant 문서들 — Tournament id 가 정해진 뒤에 만들어진다. */
    contestants: (tournamentId: string) => readonly object[];
    draftId: string | null;
    /** 그리드 칸 번호(0~47)와 위치 값(0~100). 없으면 싣지 않는다. */
    thumbnailPair?: { a: number; b: number; aPos: number; bPos: number };
  },
): { batch: WriteBatch; tournamentId: string } {
  const batch = writeBatch(db);
  const tRef = doc(collection(db, "tournaments"));
  const contestants = args.contestants(tRef.id);
  const cRefs = contestants.map(() => doc(collection(db, "contestants")));
  const pair = args.thumbnailPair;
  batch.set(
    tRef,
    pair
      ? {
          ...args.tournament,
          thumbnailPair: { a: cRefs[pair.a].id, b: cRefs[pair.b].id, aPos: pair.aPos, bPos: pair.bPos },
        }
      : args.tournament,
  );
  contestants.forEach((c, i) => batch.set(cRefs[i], c as DocumentData));
  if (args.draftId) batch.delete(doc(db, DRAFTS_COLLECTION, args.draftId));
  return { batch, tournamentId: tRef.id };
}
