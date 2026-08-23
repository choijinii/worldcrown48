/**
 * videoDraft — 검수 결과를 48칸 그리드에 얹는 순수 병합 (LAB-EV-1 W4·W5·W6).
 *
 * 검수기 모달은 "판정 → 주입"만 하고, 어떤 슬롯이 무엇을 갖게 되는지는 여기서
 * 결정한다(컴포넌트 렌더 테스트 금지 — §0.5. 대신 이 층을 촘촘히 테스트한다).
 *
 * 규칙:
 *   · 차단(blocked) 판정은 절대 주입하지 않는다 — 재생 안 되는 카드가 생긴다
 *   · 경고(warn)는 주입한다 — 쓸지 말지는 운영자 판단이고, 화면에 노랑으로 남는다
 *   · 이름·국적·이미지 등 기존 입력은 건드리지 않는다 (영상은 **추가** 필드다)
 *   · 시작점은 링크의 t= → 없으면 휴리스틱. 정밀 추천(W2)은 슬롯을 열 때 부른다
 */
import { heuristicStartSec } from "@/lib/embed/killingPart";
import { resolveLoopRange, buildWatchUrl } from "@/lib/embed/loopRange";
import type { LinkVerdict } from "@/lib/embed/verdict";
import type { SlotAssignment } from "@/lib/embed/parseBatch";
import { isRenamedTo } from "@/lib/lab/nameKey";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

export interface VideoDraftFields {
  videoId: string;
  videoStartSec: number;
  videoEndSec: number;
  videoSourceUrl: string;
}

/** 판정 하나 → 슬롯에 저장될 영상 필드. 시작점은 요청값 우선. */
export function buildVideoFields(
  verdict: LinkVerdict,
  requestedStartSec: number | null,
): VideoDraftFields {
  const start = requestedStartSec ?? heuristicStartSec(verdict.durationSec);
  const range = resolveLoopRange({ startSec: start, durationSec: verdict.durationSec });
  return {
    videoId: verdict.videoId,
    videoStartSec: range.startSec,
    videoEndSec: range.endSec,
    videoSourceUrl: buildWatchUrl(verdict.videoId, range.startSec),
  };
}

/**
 * 통과·경고분을 슬롯 01..N에 주입한 새 배열. 길이는 언제나 `total`(=48)로 맞춘다 —
 * 그리드는 규모 N과 무관하게 48칸이고, N=12면 앞 12칸만 채워진다(ADR-EV-6 주석).
 */
export function applyVideoAssignments(
  drafts: ContestantDraft[],
  assignments: SlotAssignment[],
  verdicts: LinkVerdict[],
  total: number,
  emptyDraft: () => ContestantDraft,
): ContestantDraft[] {
  const next = Array.from({ length: total }, (_, i) => ({ ...(drafts[i] ?? emptyDraft()) }));
  const byId = new Map(verdicts.map((v) => [v.videoId, v]));

  for (const a of assignments) {
    const verdict = byId.get(a.videoId);
    if (!verdict || verdict.status === "blocked") continue;
    const index = a.slot - 1;
    if (index < 0 || index >= total) continue;
    next[index] = { ...next[index], ...buildVideoFields(verdict, a.startSec) };
  }

  return next;
}

/** 슬롯 하나의 시작점만 바꾼다(W5 슬라이더·추천 칩). 구간·출처 URL을 함께 갱신. */
export function retimeDraft(
  draft: ContestantDraft,
  startSec: number,
  durationSec: number | null,
): ContestantDraft {
  if (!draft.videoId) return draft;
  const range = resolveLoopRange({ startSec, durationSec });
  return {
    ...draft,
    videoStartSec: range.startSec,
    videoEndSec: range.endSec,
    videoSourceUrl: buildWatchUrl(draft.videoId, range.startSec),
  };
}

/**
 * 이름이 다른 인물로 바뀐 칸 — 이전 인물의 흔적을 뗀 draft (LAB-UX-1 A).
 *
 * 지금까지는 이름을 **완전히 지웠을 때만** 배지가 풀렸다. 그래서 `하린`을 지우고
 * `허윤진`을 바로 쳐 넣으면 하린을 찾아 붙인 영상과 하린용 검색 힌트가 그대로
 * 남았다 — 카드에는 허윤진이라고 쓰여 있는데 재생되는 건 다른 사람이다.
 *
 * 힌트까지 떼는 게 핵심이다. 힌트를 남기면 [새 영상 찾기]가 그 힌트로 다시
 * 검색해 **또 이전 인물을** 데려온다. 힌트가 비면 소싱은 "이름 + 카테고리
 * 키워드" 폴백으로 돌아간다(searchQuery) — 새 이름으로 찾는다는 뜻이다.
 *
 * 배지 해제는 여기서 하지 않는다. 배지는 화면 전용 상태(SourcingStates)라
 * 호출부가 `dropSourcingStates`로 같은 index를 떼어낸다.
 */
export function releaseRenamedSlot(
  draft: ContestantDraft,
  nextName: string,
): ContestantDraft {
  if (!isRenamedTo(draft.name, nextName)) return { ...draft, name: nextName };
  return { ...clearVideo(draft), name: nextName, imageSearchKeyword: "" };
}

/** 영상만 지운다 — 이름·이미지는 남긴다(운영자가 링크만 갈아 끼우는 흐름). */
export function clearVideo(draft: ContestantDraft): ContestantDraft {
  const { videoId, videoStartSec, videoEndSec, videoSourceUrl, ...rest } = draft;
  void videoId;
  void videoStartSec;
  void videoEndSec;
  void videoSourceUrl;
  return rest;
}
