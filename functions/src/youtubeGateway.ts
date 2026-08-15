/**
 * youtubeGateway — YouTube Data API v3 접근층 (LAB-EV-1 W1·W2 · ADR-EV-5).
 *
 * ADR-EV-5: 키는 **서버 전용**이다. 클라이언트가 이 API를 직접 부르는 경로는
 * 만들지 않는다 — 브라우저에 나간 키는 즉시 남의 것이 된다
 * [[feedback-api-key-security]]. 키는 `firebase functions:secrets:set
 * YOUTUBE_API_KEY`로 넣는다(.env 아님 — [[feedback-secret-firebase-not-env]]).
 *
 * 이 파일은 HTTP·에러 매핑만 알고, 판정 규칙은 전부 core/inspectCore + _embed에
 * 있다. 그래서 fixture 테스트가 네트워크 없이 전 경로를 덮는다.
 */
import {
  InspectError,
  type CommentLike,
  type YouTubeGateway,
} from "./core/inspectCore";
import type { YouTubeApiItem } from "./_embed/verdict";

const API_BASE = "https://www.googleapis.com/youtube/v3";

/** 쿼터 계열 사유 — 하루치를 다 쓴 상태라 재시도 안내가 유일한 답이다(§8). */
const QUOTA_REASONS = new Set(["quotaExceeded", "rateLimitExceeded", "userRateLimitExceeded"]);
/** 댓글이 꺼진 영상 — 실패가 아니라 ②층 폴백 신호다. */
const COMMENTS_DISABLED_REASONS = new Set(["commentsDisabled", "videoNotFound"]);

interface ApiErrorBody {
  error?: { code?: number; message?: string; errors?: { reason?: string }[] };
}

async function callApi<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${API_BASE}/${path}?${new URLSearchParams(params).toString()}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new InspectError("upstream", `YouTube API 호출 실패: ${String(err)}`);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    const reasons = (body.error?.errors ?? []).map((e) => e.reason ?? "");
    if (reasons.some((r) => QUOTA_REASONS.has(r))) {
      throw new InspectError(
        "quota-exceeded",
        "유튜브 API 일일 쿼터를 모두 사용했습니다. 내일 다시 시도하거나 나눠서 검증해주세요.",
      );
    }
    if (reasons.some((r) => COMMENTS_DISABLED_REASONS.has(r))) {
      throw new InspectError("comments-disabled", "댓글이 비활성화된 영상입니다.");
    }
    throw new InspectError(
      "upstream",
      `YouTube API 오류 (${res.status}): ${body.error?.message ?? "unknown"}`,
    );
  }

  return (await res.json()) as T;
}

/**
 * 실 키를 물린 게이트웨이. `part=status,contentDetails,snippet` 한 번에 —
 * 세 part를 따로 부르면 쿼터가 3배가 된다(videos.list는 콜당 1유닛, id 개수 무관).
 */
export function createYouTubeGateway(apiKey: string): YouTubeGateway {
  return {
    async listVideos(ids: string[]): Promise<YouTubeApiItem[]> {
      if (ids.length === 0) return [];
      const data = await callApi<{ items?: YouTubeApiItem[] }>("videos", {
        part: "status,contentDetails,snippet",
        id: ids.join(","),
        maxResults: String(ids.length),
        key: apiKey,
      });
      return data.items ?? [];
    },

    async listComments(videoId: string, max: number): Promise<CommentLike[]> {
      const data = await callApi<{
        items?: {
          snippet?: {
            topLevelComment?: {
              snippet?: { textOriginal?: string; textDisplay?: string; likeCount?: number };
            };
          };
        }[];
      }>("commentThreads", {
        part: "snippet",
        videoId,
        order: "relevance",
        maxResults: String(Math.min(max, 100)),
        textFormat: "plainText",
        key: apiKey,
      });

      return (data.items ?? []).map((item) => {
        const snippet = item.snippet?.topLevelComment?.snippet;
        return {
          text: snippet?.textOriginal ?? snippet?.textDisplay ?? "",
          likeCount: Number(snippet?.likeCount ?? 0),
        };
      });
    },
  };
}
