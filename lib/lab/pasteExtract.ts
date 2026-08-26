/**
 * pasteExtract — 붙여넣은 링크의 추출 결과를 슬롯에 얹는 순수 층 (LAB-UX-1 ③).
 *
 * 영상 주입은 이미 `videoDraft.applyVideoAssignments`가 한다. 여기서 더하는 것은
 * **인물 정보**뿐이다: 제목에서 읽어낸 이름·소속·국가, 그리고 그 결과를 화면에
 * 알리는 배지.
 *
 * 규칙 셋이 전부다.
 *   ① 이름을 확신한 칸 → 이름·소속·국가를 채우고 배지 "제안"
 *   ② 확신 못 한 칸 → **이름을 비운 채** 영상만 두고 배지 "수동 필요"
 *   ③ 운영자가 이미 적어 둔 값은 덮지 않는다
 *
 * ③이 중요하다. 이 도구는 복구용이고, 복구 도구가 사람이 쓴 것을 지우면 안 된다.
 * 링크는 빈칸에만 배정되므로(assignSlots) 보통은 부딪히지 않지만, 같은 칸을
 * 두 번 처리하는 경로가 생겨도 안전하도록 여기서 한 번 더 막는다.
 */
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import type { SlotAssignment } from "@/lib/embed/parseBatch";
import type { SourcingStates } from "@/lib/lab/sourcingDraft";

/** 서버(extractContestantsFromVideos)가 돌려주는 항목. */
export interface ExtractedContestant {
  videoId: string;
  /** 확신 못 하면 빈 문자열 — 지어낸 이름이 오지 않는다. */
  name: string;
  affiliation: string;
  /** ISO 3166-1 alpha-2 또는 빈 문자열. */
  nationality: string;
  confident: boolean;
}

/** 이름을 확정한 칸 수 / 사람이 봐야 하는 칸 수 — 완료 토스트가 읽는다. */
export interface PasteExtractTally {
  named: number;
  manual: number;
}

export interface PasteExtractResult {
  drafts: ContestantDraft[];
  states: SourcingStates;
  tally: PasteExtractTally;
}

function keep(existing: string | undefined, incoming: string): string {
  const current = (existing ?? "").trim();
  // 운영자가 적어 둔 값이 이긴다(규칙 ③).
  return current !== "" ? current : incoming.trim();
}

/**
 * 배정된 슬롯에 추출 결과를 얹는다. 입력 배열을 바꾸지 않는다.
 *
 * 배정되지 않은 슬롯은 손대지 않는다 — 링크가 빈칸 수보다 많아 남은 것들은
 * 애초에 `assignments`에 없다.
 */
export function applyExtractions(
  drafts: ContestantDraft[],
  assignments: readonly SlotAssignment[],
  extractions: readonly ExtractedContestant[],
  total: number,
  emptyDraft: () => ContestantDraft,
): PasteExtractResult {
  const next = Array.from({ length: total }, (_, i) => ({ ...(drafts[i] ?? emptyDraft()) }));
  const byVideoId = new Map(extractions.map((e) => [e.videoId, e]));
  const states: SourcingStates = {};
  let named = 0;
  let manual = 0;

  for (const assignment of assignments) {
    const index = assignment.slot - 1;
    if (index < 0 || index >= total) continue;
    const found = byVideoId.get(assignment.videoId);

    // 추출 결과가 아예 없는 칸도 "수동 필요"다 — 영상은 들어갔는데 인물을
    // 모르는 상태이므로 사람이 봐야 한다.
    if (!found || !found.confident) {
      // 사유는 붙이지 않는다. 기존 사유 목록(no-results·not-relevant…)은 **검색**
      // 실패를 설명하는 말이라, "제목만으로 인물을 못 알아봤다"에 갖다 붙이면
      // 운영자가 있지도 않은 검색 결과를 떠올린다. 배지 "수동 필요"로 충분하다.
      states[index] = { status: "manual" };
      manual += 1;
      continue;
    }

    next[index] = {
      ...next[index],
      name: keep(next[index].name, found.name),
      affiliation: keep(next[index].affiliation, found.affiliation),
      nationality: keep(next[index].nationality, found.nationality),
    };
    states[index] = { status: "suggested" };
    named += 1;
  }

  return { drafts: next, states, tally: { named, manual } };
}

/**
 * 비어 있는 슬롯의 index — 화면 순서대로.
 *
 * "빈칸"의 기준은 **이름**이다(그리드의 빈 칸 표시와 같은 기준). 영상만 붙어 있고
 * 이름이 없는 칸도 빈칸으로 본다 — 그 칸이야말로 이 도구가 채우려는 자리다.
 */
export function blankSlotIndexes(drafts: ContestantDraft[], total: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < total; i += 1) {
    if ((drafts[i]?.name ?? "").trim() === "") out.push(i);
  }
  return out;
}
