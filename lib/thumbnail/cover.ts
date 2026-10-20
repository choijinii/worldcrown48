/**
 * 피치 카드 커버 — contestants 문서에서 VS 장면 두 칸으로 (THUMB-1 PR 2 · 원장 D-35 · 킥 §4 ㉣).
 *
 * 고르는 규칙은 전부 `resolveThumbnailPair`(pair.ts) 하나다 — 여기는 문서를 그 입력 모양으로
 * 바꾸고, 결과를 VSThumb 이 받는 모양으로 바꿀 뿐이다.
 *   · 커버 그림은 유튜브 포스터뿐이라 **영상이 없는 엔트리는 쓸 수 없다**
 *   · 화면에서 그림이 깨진 엔트리(㉣ 원본 삭제·비공개)는 지워진 것과 같다 → 앞 번호로 대체
 *   · 읽기는 고른 두 개만 먼저 — 대체가 필요할 때만 대회의 엔트리 전체(`needsFullList`)
 *
 * 순수 모듈 — Firestore 읽기·그림 불러오기는 components/thumbnail/useCoverPair 가 한다.
 */
import { isValidVideoId } from "@/lib/embed/youtubeUrl";
import type { EmbedOrientation } from "@/lib/media/stageCrop";
import { posterStep, type PosterOutcome } from "./poster";
import { resolveThumbnailPair, type PairEntry, type ThumbnailPair } from "./pair";

/** contestants 문서 중 커버에 필요한 칸만. */
export interface CoverContestant {
  id: string;
  order: number;
  media?: { embed?: { videoId?: string; orientation?: EmbedOrientation } };
}

/** VSThumb 한 칸(`VSThumbSide`)과 같은 모양. */
export interface CoverSide {
  videoId: string;
  orientation: EmbedOrientation;
  pos: number;
}

export interface CoverSides {
  a: CoverSide | null;
  b: CoverSide | null;
  aId: string | null;
  bId: string | null;
  /** 고른 엔트리 대신 다른 엔트리가 들어갔다 — 관리자 "대표 매치 그림 깨짐" 표시의 근거. */
  replaced: boolean;
}

export function coverEntry(
  c: CoverContestant,
  broken: ReadonlySet<string>,
): { entry: PairEntry; videoId: string } {
  const embed = c.media?.embed;
  const videoId = embed?.videoId ?? "";
  const orientation: EmbedOrientation = embed?.orientation === "portrait" ? "portrait" : "landscape";
  return {
    entry: { id: c.id, order: c.order, orientation, usable: isValidVideoId(videoId) && !broken.has(c.id) },
    videoId,
  };
}

export function coverSides(
  pair: ThumbnailPair | null | undefined,
  contestants: readonly CoverContestant[],
  broken: ReadonlySet<string>,
): CoverSides {
  const mapped = contestants.map((c) => coverEntry(c, broken));
  const videoOf = new Map(mapped.map((m) => [m.entry.id, m.videoId]));
  const r = resolveThumbnailPair(pair, mapped.map((m) => m.entry));
  const side = (s: typeof r.a): CoverSide | null =>
    s ? { videoId: videoOf.get(s.entry.id) ?? "", orientation: s.entry.orientation, pos: s.pos } : null;
  return {
    a: side(r.a),
    b: side(r.b),
    aId: r.a?.entry.id ?? null,
    bId: r.b?.entry.id ?? null,
    replaced: r.replaced,
  };
}

/** 고른 두 개만 읽은 결과로 모자라면 true — 옛 대회(1·2번을 알아야 함)이거나 대체가 필요할 때. */
export function needsFullList(pair: ThumbnailPair | null | undefined, sides: CoverSides): boolean {
  return !pair || sides.replaced;
}

/**
 * 포스터 주소를 차례로 불러 보고 그림이 뜨는지 본다(관리자 화면 · ㉣). 판정은 VSThumb 과 같은
 * `posterStep` — 유튜브 회색 자리 그림(120px)도 실패다. `load` 는 주입(화면에서는 `new Image()`).
 */
export async function probePoster(
  sources: readonly string[],
  load: (src: string) => Promise<PosterOutcome>,
): Promise<"ok" | "broken"> {
  for (let i = 0; i < sources.length; i++) {
    const step = posterStep(i, sources.length, await load(sources[i]));
    if (step === "ok") return "ok";
    if (step === "broken") return "broken";
  }
  return "broken";
}
