/**
 * inspectCore — 유튜브 임베드 검수의 순수 층 (LAB-EV-1 W1·W2).
 *
 * YouTube Data API 접근은 `YouTubeGateway`로 주입된다. 이 파일은 네트워크도
 * Firebase도 모르고, 콜러블(validateYouTubeLinks / recommendKillingPart)은 이
 * 코어를 감싸는 얇은 어댑터다 — ADR-EV-7의 "코어는 UI 비의존"이 여기서 시작된다.
 *
 * 지키는 계약 셋:
 *   ① 48개를 videos.list 1콜로 (쿼터: videos.list 1콜 = 1유닛, id 개수 무관)
 *   ② 요청한 id 순서 그대로 판정 반환 (순서 = 슬롯 번호)
 *   ③ 댓글 비활성은 실패가 아니라 ②→③ 폴백 (§8 — 정상 경로)
 */
import { MAX_VIDEOS_PER_CALL } from "../_embed/constants";
import { isValidVideoId } from "../_embed/youtubeUrl";
import { buildVerdicts, type LinkVerdict, type YouTubeApiItem } from "../_embed/verdict";
import {
  recommendKillingPart,
  type KillingPartCandidate,
  type KillingPartSource,
} from "../_embed/killingPart";

/** 관련도 상위 댓글만 캔다 — 전수 조회는 쿼터·시간 낭비다(W2 ①). */
export const COMMENT_PAGE_SIZE = 50;

export type InspectFailure =
  | "invalid-argument"
  | "not-found"
  | "quota-exceeded"
  | "comments-disabled"
  | "upstream";

export class InspectError extends Error {
  constructor(
    public readonly reason: InspectFailure,
    message: string,
  ) {
    super(message);
    this.name = "InspectError";
  }
}

export interface CommentLike {
  text: string;
  likeCount: number;
}

export interface YouTubeGateway {
  /** videos.list — part=status,contentDetails,snippet. 최대 50개/콜. */
  listVideos(ids: string[]): Promise<YouTubeApiItem[]>;
  /** commentThreads.list — order=relevance. 비활성이면 comments-disabled를 던진다. */
  listComments(videoId: string, max: number): Promise<CommentLike[]>;
}

export interface InspectDeps {
  gateway: YouTubeGateway;
  logInfo?: (message: string) => void;
}

function assertVideoIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new InspectError("invalid-argument", "검증할 링크가 없습니다.");
  }
  if (value.length > MAX_VIDEOS_PER_CALL) {
    throw new InspectError(
      "invalid-argument",
      `한 번에 최대 ${MAX_VIDEOS_PER_CALL}개까지 검증할 수 있습니다.`,
    );
  }
  for (const id of value) {
    if (!isValidVideoId(id)) {
      throw new InspectError("invalid-argument", `영상 ID 형식이 아닙니다: ${String(id)}`);
    }
  }
  return value as string[];
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * W1 — 링크 배열을 한 번에 검증한다. 중복 id는 API에 한 번만 묻되(쿼터),
 * 판정은 요청한 개수·순서 그대로 돌려준다(슬롯 정합).
 */
export async function inspectLinks(
  input: { videoIds: unknown },
  deps: InspectDeps,
): Promise<{ verdicts: LinkVerdict[]; apiCalls: number }> {
  const requested = assertVideoIds(input.videoIds);
  const unique = [...new Set(requested)];

  const items: YouTubeApiItem[] = [];
  let apiCalls = 0;
  for (const batch of chunk(unique, MAX_VIDEOS_PER_CALL)) {
    items.push(...(await deps.gateway.listVideos(batch)));
    apiCalls += 1;
  }

  // §6 AC — "48개당 1콜"을 로그로 확인할 수 있어야 한다.
  deps.logInfo?.(
    `inspectLinks: ${requested.length} links (${unique.length} unique) → videos.list ×${apiCalls}`,
  );

  return { verdicts: buildVerdicts(requested, items), apiCalls };
}

export interface KillingPartSuggestion {
  videoId: string;
  durationSec: number | null;
  source: KillingPartSource;
  candidates: KillingPartCandidate[];
  /** 댓글을 실제로 읽었는가 — false면 운영자가 ②·③층 결과임을 알아야 한다. */
  commentsAvailable: boolean;
}

/**
 * W2 — 킬링파트 추천 3층. 댓글 조회 실패 중 "댓글 비활성"만 폴백으로 삼키고,
 * 쿼터 소진은 그대로 올려 보낸다: 조용히 60s로 눙치면 운영자는 추천이 동작한
 * 줄 알고 48개를 그대로 발행한다.
 */
export async function suggestKillingPart(
  input: { videoId: unknown },
  deps: InspectDeps,
): Promise<KillingPartSuggestion> {
  const videoId = input.videoId;
  if (!isValidVideoId(videoId)) {
    throw new InspectError("invalid-argument", "영상 ID 형식이 아닙니다.");
  }
  const id = videoId as string;

  const [item] = await deps.gateway.listVideos([id]);
  if (!item) throw new InspectError("not-found", "영상을 찾을 수 없습니다.");

  const [verdict] = buildVerdicts([id], [item]);

  let comments: CommentLike[] = [];
  let commentsAvailable = true;
  try {
    comments = await deps.gateway.listComments(id, COMMENT_PAGE_SIZE);
  } catch (err) {
    if (err instanceof InspectError && err.reason === "comments-disabled") {
      commentsAvailable = false;
    } else {
      throw err;
    }
  }

  const result = recommendKillingPart({
    comments,
    description: item.snippet?.description ?? "",
    durationSec: verdict.durationSec,
  });

  return {
    videoId: id,
    durationSec: verdict.durationSec,
    source: result.source,
    candidates: result.candidates,
    commentsAvailable,
  };
}
