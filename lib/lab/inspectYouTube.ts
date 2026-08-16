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

/** Firebase 콜러블 에러 코드 → 화면 메시지 키를 고르기 위한 최소 분류. */
export type InspectErrorCode =
  | "permission-denied"
  | "resource-exhausted"
  | "invalid-argument"
  | "not-found"
  | "unknown";

export function inspectErrorCode(err: unknown): InspectErrorCode {
  const raw = String((err as { code?: string }).code ?? "").replace(/^functions\//, "");
  switch (raw) {
    case "permission-denied":
    case "unauthenticated":
      return "permission-denied";
    case "resource-exhausted":
      return "resource-exhausted";
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
