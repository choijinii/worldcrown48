/**
 * verdict — videos.list 응답 → 운영자가 조치할 수 있는 판정 (LAB-EV-1 W1).
 *
 * "왜 안 되는지"가 사유별로 갈라져야 검수기가 쓸모 있다(§6 AC#3):
 *   빨강(blocked) — 없는 ID · embeddable=false · 비공개 → 링크를 교체해야 한다
 *   노랑(warn)    — 지역차단 · 연령제한 · 라이브 · 10초 미만 → 쓸 수는 있으나 위험
 *   초록(pass)    — 그대로 슬롯에 주입
 *
 * 연령제한을 빨강이 아니라 노랑에 둔 건 킥의 명시 결정이다(W4). 다만 실제로는
 * 임베드 재생이 막히는 경우가 많으므로 UI 문구에서 "교체 권장"을 분명히 한다.
 */
import { LOOP_SECONDS } from "./constants";
import { buildThumbnailUrl } from "./loopRange";
import { parseIso8601Duration } from "./timestamps";

export interface YouTubeApiItem {
  id: string;
  status?: {
    embeddable?: boolean;
    privacyStatus?: string;
    uploadStatus?: string;
  };
  contentDetails?: {
    duration?: string;
    regionRestriction?: { blocked?: string[]; allowed?: string[] };
    contentRating?: { ytRating?: string };
  };
  snippet?: {
    title?: string;
    channelTitle?: string;
    liveBroadcastContent?: string;
    thumbnails?: Record<string, { url?: string } | undefined>;
  };
}

export type VerdictReason =
  | "not-found"
  | "not-embeddable"
  | "private"
  | "region-blocked"
  | "region-limited"
  | "age-restricted"
  | "live"
  | "too-short";

export type LinkStatus = "pass" | "warn" | "blocked";

export interface LinkVerdict {
  videoId: string;
  exists: boolean;
  embeddable: boolean;
  regionBlockedIn: string[];
  /** allowed 목록만 준 영상 — 그 밖의 모든 국가가 막힌다. */
  regionAllowedOnly: string[];
  ageRestricted: boolean;
  isLive: boolean;
  durationSec: number | null;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  status: LinkStatus;
  reasons: VerdictReason[];
}

const BLOCKING_REASONS: VerdictReason[] = ["not-found", "not-embeddable", "private"];

function pickThumbnail(item: YouTubeApiItem): string {
  const thumbs = item.snippet?.thumbnails ?? {};
  for (const key of ["maxres", "standard", "high", "medium", "default"]) {
    const url = thumbs[key]?.url;
    if (url) return url;
  }
  return buildThumbnailUrl(item.id);
}

function verdictFor(videoId: string, item: YouTubeApiItem | undefined): LinkVerdict {
  if (!item) {
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
      thumbnailUrl: buildThumbnailUrl(videoId),
      status: "blocked",
      reasons: ["not-found"],
    };
  }

  const reasons: VerdictReason[] = [];
  const embeddable = item.status?.embeddable !== false;
  if (!embeddable) reasons.push("not-embeddable");
  if (item.status?.privacyStatus === "private") reasons.push("private");

  const restriction = item.contentDetails?.regionRestriction;
  const regionBlockedIn = restriction?.blocked ?? [];
  const regionAllowedOnly = restriction?.allowed ?? [];
  if (regionBlockedIn.length > 0) reasons.push("region-blocked");
  if (regionAllowedOnly.length > 0) reasons.push("region-limited");

  const ageRestricted = item.contentDetails?.contentRating?.ytRating === "ytAgeRestricted";
  if (ageRestricted) reasons.push("age-restricted");

  const live =
    item.snippet?.liveBroadcastContent === "live" ||
    item.snippet?.liveBroadcastContent === "upcoming";
  if (live) reasons.push("live");

  // 라이브는 길이가 의미 없다(P0D로 온다) — 짧은 영상 경고와 섞이지 않게 null로.
  const durationSec = live ? null : parseIso8601Duration(item.contentDetails?.duration);
  if (durationSec !== null && durationSec < LOOP_SECONDS) reasons.push("too-short");

  const blocked = reasons.some((r) => BLOCKING_REASONS.includes(r));
  return {
    videoId,
    exists: true,
    embeddable,
    regionBlockedIn,
    regionAllowedOnly,
    ageRestricted,
    isLive: live,
    durationSec,
    title: item.snippet?.title ?? "",
    channelTitle: item.snippet?.channelTitle ?? "",
    thumbnailUrl: pickThumbnail(item),
    status: blocked ? "blocked" : reasons.length > 0 ? "warn" : "pass",
    reasons,
  };
}

/**
 * 요청한 id 순서를 그대로 유지한 판정 배열. 순서가 어긋나면 슬롯 번호가 어긋나고,
 * 운영자는 "3번 링크가 차단"이라는 말을 믿을 수 없게 된다.
 */
export function buildVerdicts(
  requestedIds: string[],
  items: YouTubeApiItem[],
): LinkVerdict[] {
  const byId = new Map(items.map((it) => [it.id, it]));
  return requestedIds.map((id) => verdictFor(id, byId.get(id)));
}

/** 재검증 크론(W7)이 문서에 남길 최소 상태. */
export function toVideoStatus(verdict: LinkVerdict, checkedAtMs: number): {
  embeddable: boolean;
  status: LinkStatus;
  reasons: VerdictReason[];
  checkedAt: number;
} {
  return {
    embeddable: verdict.status !== "blocked",
    status: verdict.status,
    reasons: verdict.reasons,
    checkedAt: checkedAtMs,
  };
}
