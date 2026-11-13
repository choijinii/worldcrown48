/**
 * manualMedia — 엔트리 칸의 손 넣기 (LAB-FIX-3 · 원장 D-89).
 *
 * 칸은 둘 중 하나다.
 *   · 자동 칸 — [동영상 생성] · 검수기 · [새 영상 찾기]로 영상이 들어온 칸. [새 영상 찾기]만 보인다.
 *   · 수동 칸 — 영상이 없는 칸 + 손으로 영상을 넣은 칸(`manualVideo`). [영상] · [이미지] · [이미지 파일].
 * [영상]·[이미지]는 켜고 끄는 버튼이다: 넣으면 켜지고, 켜진 것을 누르면 빠진다(묻지 않음). 마지막으로
 * 넣은 주소는 칸마다 초안에 기억한다(`manualVideoUrl` · `manualImageUrl`) — 발행 문서에는 싣지 않는다.
 *
 * 대회 종류(원장 D-90): 영상 대회 = [영상]만 · 이미지 대회 = [이미지]·[이미지 파일]만 · 종류 미정 = 넣기 버튼 없음.
 * 한 칸에 영상과 그림을 함께 두지 않는다. 옛 섞인 초안의 반대 종류 미디어는 빼기 전용 켜진 버튼으로만 보인다.
 *
 * 영상 넣기는 검수기와 같은 길을 칸 하나에 쓴다: 주소 해석(parseYouTubeLink) → 검사(validateYouTubeLinks,
 * 영상 1개) → 이름이 빈 칸이면 제목 추출(엔트리 단위 전달) → applyVideoAssignments · applyExtractions.
 * 이름이 있는 칸의 이름은 건드리지 않는다(원장 D-88).
 */
import { parseYouTubeLink } from "@/lib/embed/youtubeUrl";
import type { LinkVerdict } from "@/lib/embed/verdict";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import { applyVideoAssignments, clearVideo } from "@/lib/lab/videoDraft";
import { applyExtractions, type ExtractedContestant } from "@/lib/lab/pasteExtract";
import type { EntryUnit } from "@/lib/types/tournament";
import type { MediaKind } from "@/lib/lab/mediaKind";

export type SlotMode = "auto" | "manual";
export type Toggle = "on" | "off";

export interface SlotButtons {
  manual: boolean;
  /** [영상] — 수동 칸에서만(null = 안 보임). */
  video: Toggle | null;
  /** [이미지] — 수동 칸에서만. 어느 길로 들어온 그림이든 켜진 [이미지]로 뺀다. */
  image: Toggle | null;
  /** [이미지 파일] */
  imageFile: boolean;
  /** [새 영상 찾기] — 자동 칸에서만. */
  refresh: boolean;
}

export function slotMode(c: ContestantDraft): SlotMode {
  return c.videoId && !c.manualVideo ? "auto" : "manual";
}

export function slotButtons(c: ContestantDraft, kind: MediaKind | null): SlotButtons {
  const manual = slotMode(c) === "manual";
  // 반대 종류 미디어(옛 섞인 초안)는 빼기 전용 — 켜진 버튼만 보인다.
  const removeOnlyImage: Toggle | null = c.imageUrl ? "on" : null;
  const removeOnlyVideo: Toggle | null = c.videoId ? "on" : null;
  if (kind === "image") {
    return { manual, video: removeOnlyVideo, image: c.imageUrl ? "on" : "off", imageFile: true, refresh: false };
  }
  if (kind === "video") {
    if (!manual) return { manual, video: null, image: removeOnlyImage, imageFile: false, refresh: true };
    return { manual, video: c.videoId ? "on" : "off", image: removeOnlyImage, imageFile: false, refresh: false };
  }
  // 종류 미정 — 넣기 버튼 없음(반드시 생성 버튼으로 시작).
  return { manual, video: removeOnlyVideo, image: removeOnlyImage, imageFile: false, refresh: false };
}

export type ManualVideoParse =
  | { ok: true; videoId: string; startSec: number | null }
  | { ok: false; reason: "only-youtube" | "no-video-id" | "blank" };

/** 유튜브 주소만 받는다. 유튜브가 아니거나 링크가 아니면 "only-youtube"(승인 문구 3번). */
export function parseManualVideoUrl(raw: string): ManualVideoParse {
  const parsed = parseYouTubeLink(raw);
  if (parsed.ok) return { ok: true, videoId: parsed.videoId, startSec: parsed.startSec };
  if (parsed.reason === "blank") return { ok: false, reason: "blank" };
  if (parsed.reason === "no-video-id") return { ok: false, reason: "no-video-id" };
  return { ok: false, reason: "only-youtube" };
}

/** 검사를 통과한 영상을 그 칸 하나에 넣는다. 차단 판정이면 그대로 돌려준다. */
export function addManualVideo(
  drafts: ContestantDraft[],
  index: number,
  verdict: LinkVerdict,
  startSec: number | null,
  url: string,
  extraction: ExtractedContestant | null,
  total: number,
  emptyDraft: () => ContestantDraft,
): ContestantDraft[] {
  if (verdict.status === "blocked") return drafts;
  const assignment = { slot: index + 1, index: 1, videoId: verdict.videoId, startSec };
  const withVideo = applyVideoAssignments(drafts, [assignment], [verdict], total, emptyDraft);
  const nameEmpty = (withVideo[index]?.name ?? "").trim() === "";
  const next = nameEmpty
    ? applyExtractions(withVideo, [assignment], extraction ? [extraction] : [], total, emptyDraft).drafts
    : withVideo;
  next[index] = { ...next[index], manualVideo: true, manualVideoUrl: url };
  return next;
}

/** 켜진 [영상]을 눌렀을 때 — 영상과 손 넣기 표시는 빼고, 기억한 주소는 남긴다. */
export function removeManualVideo(c: ContestantDraft): ContestantDraft {
  return clearVideo(c);
}

export type ManualVideoResult =
  | { kind: "parse-fail"; reason: "only-youtube" | "no-video-id" | "blank" }
  | { kind: "blocked"; verdict: LinkVerdict }
  | {
      kind: "ok";
      verdict: LinkVerdict;
      startSec: number | null;
      extraction: ExtractedContestant | null;
      /** 추출만 실패 — 영상은 넣고 이름은 비워 둔다(검수기와 같음). */
      extractFailed: boolean;
    };

export interface ManualVideoDeps {
  validate: (videoIds: string[]) => Promise<{ verdicts: LinkVerdict[] }>;
  extract: (
    items: { videoId: string; title: string; channelTitle: string }[],
    entryUnit: EntryUnit,
  ) => Promise<ExtractedContestant[]>;
}

/**
 * [영상] 넣기 순서. 검사 콜러블이 던지는 오류는 그대로 올려 보낸다(호출부가 검수기와 같은 문구로 알린다).
 */
export async function runManualVideoAdd(
  input: { url: string; nameEmpty: boolean; entryUnit: EntryUnit },
  deps: ManualVideoDeps,
): Promise<ManualVideoResult> {
  const parsed = parseManualVideoUrl(input.url);
  if (!parsed.ok) return { kind: "parse-fail", reason: parsed.reason };

  const { verdicts } = await deps.validate([parsed.videoId]);
  const verdict = verdicts.find((v) => v.videoId === parsed.videoId) ?? verdicts[0];
  if (!verdict || verdict.status === "blocked") {
    return { kind: "blocked", verdict: verdict ?? notFound(parsed.videoId) };
  }

  let extraction: ExtractedContestant | null = null;
  let extractFailed = false;
  if (input.nameEmpty) {
    try {
      const found = await deps.extract(
        [{ videoId: verdict.videoId, title: verdict.title, channelTitle: verdict.channelTitle }],
        input.entryUnit,
      );
      extraction = found.find((e) => e.videoId === verdict.videoId) ?? null;
    } catch {
      extractFailed = true;
    }
  }
  return { kind: "ok", verdict, startSec: parsed.startSec, extraction, extractFailed };
}

function notFound(videoId: string): LinkVerdict {
  return {
    videoId,
    exists: false,
    embeddable: false,
    regionBlockedIn: [],
    regionAllowedOnly: [],
    ageRestricted: false,
    isLive: false,
    durationSec: null,
    title: "",
    channelTitle: "",
    thumbnailUrl: "",
    status: "blocked",
    reasons: ["not-found"],
  };
}
