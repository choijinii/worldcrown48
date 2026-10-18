/**
 * 초안 저장소 — `tournamentDrafts/{draftId}` 읽기·쓰기 (EDITOR-FIX-1).
 *
 * 저장은 문서 통째 덮어쓰기(setDoc)다: 두 탭이 같은 초안을 열면 **마지막 저장이
 * 이긴다**. 막는 기능은 이번 범위가 아니다.
 *
 * 목록 쿼리는 `where hostUid == uid` 하나뿐이고 정렬은 여기서 한다 — orderBy 를
 * 붙이면 복합 색인이 필요해진다(B-1→C-1 색인 함정).
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import {
  DRAFTS_COLLECTION,
  fromDraftDoc,
  sortDraftsByUpdated,
  toDraftFields,
  type DraftEditorState,
  type DraftSummary,
} from "@/lib/lab/tournamentDraft";

/** 새 초안 id — 처음 저장할 때 한 번 정한다(빈 편집기는 문서를 만들지 않는다). */
export function newDraftId(db: Firestore): string {
  return doc(collection(db, DRAFTS_COLLECTION)).id;
}

export async function saveDraft(
  db: Firestore,
  draftId: string,
  hostUid: string,
  state: DraftEditorState,
): Promise<void> {
  await setDoc(doc(db, DRAFTS_COLLECTION, draftId), {
    ...toDraftFields(state),
    hostUid,
    updatedAt: serverTimestamp(),
  });
}

export async function loadDraft(
  db: Firestore,
  draftId: string,
): Promise<DraftEditorState | null> {
  const snap = await getDoc(doc(db, DRAFTS_COLLECTION, draftId));
  return snap.exists() ? fromDraftDoc(snap.data()) : null;
}

function millis(v: unknown): number {
  return v && typeof (v as { toMillis?: unknown }).toMillis === "function"
    ? (v as { toMillis: () => number }).toMillis()
    : 0;
}

export async function listMyDrafts(db: Firestore, hostUid: string): Promise<DraftSummary[]> {
  const snap = await getDocs(
    query(collection(db, DRAFTS_COLLECTION), where("hostUid", "==", hostUid)),
  );
  return sortDraftsByUpdated(
    snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: typeof data.title === "string" ? data.title : "",
        updatedAtMs: millis(data.updatedAt),
      };
    }),
  );
}

export async function deleteDraft(db: Firestore, draftId: string): Promise<void> {
  await deleteDoc(doc(db, DRAFTS_COLLECTION, draftId));
}
