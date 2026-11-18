/**
 * 칸 비우기 (LAB-FIX-4 · 원장 결정 B · C).
 *
 *   ✕ = 그 칸을 **통째로** 비운다 — 이름 · 덧붙이는 정보 · 국가 · 검색어 · 영상 · 그림 · 기억한 주소까지.
 *       (11/08 결정 "✕는 영상을 건드리지 않음"을 바꿨다. 대표 실측 — 링크를 다시 붙이려면 ✕ 뒤에 칸에 들어가 영상을
 *       또 빼야 했다.) 영상만 빼는 "빼기"는 따로 그대로 남는다. 이름을 고쳐도 영상은 그대로(D-88)도 그대로다.
 *   [모두 비우기] = 엔트리 칸 전부. 대회 제목 · 설명 · "AI에게 알려 줄 내용" · 대회 종류는 그대로 둔다(호출자 몫).
 *
 * 올려 둔 그림 파일은 IMAGE-1 의 삭제 규칙대로 호출자가 지운다(deleteEntryImageFiles) — 그래서 경로를 돌려준다.
 */
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

export interface ClearResult {
  drafts: ContestantDraft[];
  /** 지울 그림 파일(Storage) 경로. */
  storagePaths: string[];
}

export function clearSlot(
  drafts: readonly ContestantDraft[],
  index: number,
  size: number,
  empty: () => ContestantDraft,
): ClearResult {
  const next = Array.from({ length: size }, (_, i) => drafts[i] ?? empty());
  const path = next[index]?.imageStoragePath;
  next[index] = empty();
  return { drafts: next, storagePaths: path ? [path] : [] };
}

export function clearAllSlots(drafts: readonly ContestantDraft[]): ClearResult {
  return {
    drafts: [],
    storagePaths: drafts.map((d) => d?.imageStoragePath).filter((p): p is string => Boolean(p)),
  };
}

/** ✕ 를 보일지 — 칸에 비울 것이 하나라도 있으면. */
export function slotHasAnything(c: ContestantDraft): boolean {
  return (
    [c.name, c.nationality, c.affiliation, c.imageSearchKeyword].some((v) => (v ?? "").trim() !== "") ||
    Boolean(c.videoId || c.imageUrl || c.manualVideoUrl || c.manualImageUrl)
  );
}
