/**
 * inspectYouTube — 검수 콜러블 클라이언트 배선 (LAB-EV-1 W1·W2).
 *
 * 검증·추천은 **실패를 삼키지 않는다**. 번역(translateMeta)은 실패해도 발행이
 * 우선이라 원문 폴백을 두지만, 여기서 조용히 폴백하면 운영자는 재생되지 않는
 * 링크 48개를 통과로 착각한다. 그래서 에러 코드를 그대로 올려 화면이 말하게 한다.
 */
import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "@/lib/firebase";
import type { LinkVerdict } from "@/lib/embed/verdict";
import type { KillingPartSource } from "@/lib/embed/killingPart";

export interface ValidateLinksResult {
  verdicts: LinkVerdict[];
  apiCalls: number;
}

export interface KillingPartSuggestion {
  videoId: string;
  durationSec: number | null;
  source: KillingPartSource;
  candidates: {
    startSec: number;
    source: KillingPartSource;
    mentions: number;
    confidence: number;
    chapterTitle?: string;
  }[];
  commentsAvailable: boolean;
}

/**
 * Firebase 콜러블 에러 코드 → 화면 메시지 키를 고르기 위한 분류.
 *
 * `resource-exhausted`를 셋으로 쪼갠 이유(2026-08-25 실측): 서버는 **서로 다른 세
 * 사유**를 같은 코드로 던진다 — 요청 과다 · AI 일일 캡 · YouTube 쿼터. 그걸 하나로
 * 뭉쳐 "유튜브 검색 횟수가 부족합니다"로 보여줬더니, YouTube 쿼터가 50콜 남은
 * 화면에서 그 문구가 떴다. 운영자는 남아 있는 숫자를 보며 원인을 못 찾는다.
 *
 * 서버는 이미 `details.code`로 사유를 실어 보내고 있었다(`ai_daily_limit` ·
 * `youtube_daily_quota`). 읽지 않았을 뿐이라 **클라이언트만 고치면 된다**.
 */
export type InspectErrorCode =
  | "permission-denied"
  | "quota-daily"
  | "quota-youtube"
  | "resource-exhausted"
  | "invalid-argument"
  | "not-found"
  | "unknown";

/** 서버가 details에 싣는 사유 코드 (functions/src/{aiQuota,youtubeQuota}.ts). */
const DETAIL_DAILY_LIMIT = "ai_daily_limit";
const DETAIL_YOUTUBE_QUOTA = "youtube_daily_quota";

export function inspectErrorCode(err: unknown): InspectErrorCode {
  const raw = String((err as { code?: string }).code ?? "").replace(/^functions\//, "");
  switch (raw) {
    case "permission-denied":
    case "unauthenticated":
      return "permission-denied";
    case "resource-exhausted": {
      // 사유는 details에 있다 — **있을 때만** 좁힌다.
      //
      // details가 없다고 "요청 과다"로 단정하면 안 된다: 검수기 경로
      // (validateYouTubeLinks)는 속도 제한도, 진짜 YouTube 쿼터 초과도 둘 다
      // details 없이 던진다. 거기서 "요청이 너무 잦습니다"라고 말하면 쿼터가
      // 바닥난 운영자를 엉뚱한 곳으로 보낸다. 모르면 기존 문구를 유지한다.
      const detail = (err as { details?: { code?: unknown } }).details;
      const reason = typeof detail?.code === "string" ? detail.code : "";
      if (reason === DETAIL_DAILY_LIMIT) return "quota-daily";
      if (reason === DETAIL_YOUTUBE_QUOTA) return "quota-youtube";
      return "resource-exhausted";
    }
    case "invalid-argument":
      return "invalid-argument";
    case "not-found":
      return "not-found";
    default:
      return "unknown";
  }
}

export async function validateYouTubeLinks(videoIds: string[]): Promise<ValidateLinksResult> {
  const callable = httpsCallable<{ videoIds: string[] }, ValidateLinksResult>(
    getFunctionsInstance(),
    "validateYouTubeLinks",
  );
  const res = await callable({ videoIds });
  return { verdicts: res.data?.verdicts ?? [], apiCalls: res.data?.apiCalls ?? 0 };
}

export async function recommendKillingPart(videoId: string): Promise<KillingPartSuggestion> {
  const callable = httpsCallable<{ videoId: string }, KillingPartSuggestion>(
    getFunctionsInstance(),
    "recommendKillingPart",
  );
  const res = await callable({ videoId });
  return res.data;
}
