/**
 * sourcingMessages — 소싱 상태·사유 → i18n 메시지 키 (LAB-EV-2 §5 C).
 *
 * embedMessages(LAB-EV-1)와 같은 이유로 순수 함수다: 컴포넌트가 if-else로 문구를
 * 고르면 3언어 중 하나가 조용히 빠지고, "모든 사유에 문구가 있다"를 아무도 못 지킨다.
 * 여기 매핑은 Record<사유, 키>라 **사유를 하나 추가하면 타입이 먼저 깨진다**.
 */
import type { MessageKey } from "@/lib/i18n/messages";
import type {
  SlotSourcingStatus,
  SourcingFailureReason,
} from "@/lib/embed/sourcing/types";
import type { InspectErrorCode } from "@/lib/lab/inspectYouTube";
import type { SlotSourcingState } from "@/lib/lab/sourcingDraft";
import type { Message } from "@/lib/lab/embedMessages";

const STATUS_KEYS: Record<SlotSourcingStatus, MessageKey> = {
  suggested: "lab.source.badge.suggested",
  manual: "lab.source.badge.manual",
  "unknown-person": "lab.source.badge.unknown",
};

const REASON_KEYS: Record<SourcingFailureReason, MessageKey> = {
  "no-results": "lab.source.reason.noResults",
  "all-blocked": "lab.source.reason.allBlocked",
  "not-relevant": "lab.source.reason.notRelevant",
  "all-duplicate": "lab.source.reason.allDuplicate",
  "search-failed": "lab.source.reason.searchFailed",
};

const ERROR_KEYS: Record<InspectErrorCode, MessageKey> = {
  "permission-denied": "lab.source.error.permission",
  "quota-youtube": "lab.source.error.quota",
  "quota-daily": "lab.source.error.dailyCap",
  // 사유를 못 가른 resource-exhausted — 옛 동작(유튜브 쿼터)을 그대로 둔다.
  "resource-exhausted": "lab.source.error.quota",
  "invalid-argument": "lab.source.error.failed",
  "not-found": "lab.source.error.failed",
  unknown: "lab.source.error.failed",
};

export function sourcingStatusMessage(status: SlotSourcingStatus): Message {
  return { key: STATUS_KEYS[status] };
}

/** 실패 사유. 제안 상태에는 사유가 없다. */
export function sourcingReasonMessage(state: SlotSourcingState): Message | null {
  return state.reason ? { key: REASON_KEYS[state.reason] } : null;
}

export function sourcingErrorMessage(code: InspectErrorCode): Message {
  return { key: ERROR_KEYS[code] };
}

/**
 * 감점 툴팁 (AI-2). 감점된 영상이 실제로 슬롯에 얹혔을 때만 문구가 나온다 —
 * 감점만 되고 다른 영상이 들어갔으면 운영자가 알 필요가 없다.
 */
export function sourcingDemotedMessage(state: SlotSourcingState): Message | null {
  const terms = state.demotedTerms ?? [];
  if (terms.length === 0) return null;
  return { key: "lab.source.demoted", vars: { terms: terms.join(", ") } };
}

/**
 * 배지 색 역할 — 팔레트에 초록이 없다(LAB-EV-1 검수기와 같은 언어).
 *   제안 = turquoise · 수동 필요 = crimson · 실존 의심 = gold(경고)
 */
export type SourcingBadgeTone = "ok" | "danger" | "warn";

const TONES: Record<SlotSourcingStatus, SourcingBadgeTone> = {
  suggested: "ok",
  manual: "danger",
  "unknown-person": "warn",
};

export function sourcingBadgeTone(status: SlotSourcingStatus): SourcingBadgeTone {
  return TONES[status];
}
