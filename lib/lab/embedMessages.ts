/**
 * embedMessages — 판정/행 오류 → i18n 메시지 키 매핑 (LAB-EV-1 W4).
 *
 * 컴포넌트가 if-else로 문구를 고르면 3언어 중 하나가 조용히 빠진다. 매핑을 순수
 * 함수로 빼두면 "모든 사유에 문구가 있다"를 테스트가 지킨다.
 */
import type { MessageKey } from "@/lib/i18n/messages";
import type { BatchRow } from "@/lib/embed/parseBatch";
import type { LinkStatus, LinkVerdict, VerdictReason } from "@/lib/embed/verdict";
import type { InspectErrorCode } from "@/lib/lab/inspectYouTube";

export interface Message {
  key: MessageKey;
  vars?: Record<string, string | number>;
}

const ROW_REASON_KEYS: Record<string, MessageKey> = {
  "not-youtube": "lab.embed.reason.notYouTube",
  "no-video-id": "lab.embed.reason.noVideoId",
  "not-a-link": "lab.embed.reason.notALink",
  blank: "lab.embed.reason.notALink",
  duplicate: "lab.embed.reason.duplicate",
  "over-limit": "lab.embed.reason.overLimit",
};

const VERDICT_REASON_KEYS: Record<VerdictReason, MessageKey> = {
  "not-found": "lab.embed.reason.notFound",
  "not-embeddable": "lab.embed.reason.notEmbeddable",
  private: "lab.embed.reason.private",
  "region-blocked": "lab.embed.reason.regionBlocked",
  "region-limited": "lab.embed.reason.regionLimited",
  "age-restricted": "lab.embed.reason.ageRestricted",
  live: "lab.embed.reason.live",
  "too-short": "lab.embed.reason.tooShort",
};

const STATUS_KEYS: Record<LinkStatus, MessageKey> = {
  pass: "lab.embed.status.pass",
  warn: "lab.embed.status.warn",
  blocked: "lab.embed.status.blocked",
};

const ERROR_KEYS: Record<InspectErrorCode, MessageKey> = {
  "permission-denied": "lab.embed.error.permission",
  "resource-exhausted": "lab.embed.error.quota",
  "invalid-argument": "lab.embed.error.failed",
  "not-found": "lab.embed.error.failed",
  unknown: "lab.embed.error.failed",
};

export function statusMessage(status: LinkStatus): Message {
  return { key: STATUS_KEYS[status] };
}

export function inspectErrorMessage(code: InspectErrorCode): Message {
  return { key: ERROR_KEYS[code] };
}

/** 파싱 단계에서 떨어진 행의 사유. 통과한 행은 null. */
export function rowMessage(row: BatchRow, limit: number): Message | null {
  if (row.ok || !row.reason) return null;
  const key = ROW_REASON_KEYS[row.reason] ?? "lab.embed.reason.notALink";
  if (row.reason === "duplicate") return { key, vars: { n: row.duplicateOfIndex ?? 0 } };
  if (row.reason === "over-limit") return { key, vars: { limit } };
  return { key };
}

/** API 판정의 사유들. 국가 목록은 문구 안에 그대로 실어 보낸다. */
export function verdictMessages(verdict: LinkVerdict): Message[] {
  return verdict.reasons.map((reason) => {
    const key = VERDICT_REASON_KEYS[reason];
    if (reason === "region-blocked") {
      return { key, vars: { countries: verdict.regionBlockedIn.join(", ") } };
    }
    if (reason === "region-limited") {
      return { key, vars: { countries: verdict.regionAllowedOnly.join(", ") } };
    }
    return { key };
  });
}
