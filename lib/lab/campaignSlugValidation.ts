/**
 * Campaign slug (캠페인 이름표) — Domain 2 · The Lab, STEP 1.
 *
 * UTM_RULES v1.0 (marketing/00_strategy/UTM_RULES_v1.0.md, 2026-08-28 · 대표 승인
 * 2026-08-31 A안): 공유 링크의 `utm_campaign`에는 사람이 읽는 토너먼트 슬러그
 * (예: best_stage_48)를 넣는다. 명명 규칙 §2 — 소문자 영문·숫자·언더스코어만,
 * 단어 구분은 `_` 하나. UTM 값은 대소문자를 구분하므로 저장 전에 반드시 정규화.
 *
 * 입력칸은 타이핑 즉시 normalizeCampaignSlug를 통과시키므로 "잘못된 값"이 저장될
 * 길이 없다 — 이 모듈은 그 정규화 규칙의 단일 진실이다. 선택 항목: 빈 값이면
 * Tournament 문서에 필드를 싣지 않고, 공유 링크는 대회 ID를 소문자로 폴백한다
 * (lib/crown/championLoader.ts campaignFor).
 */
export const CAMPAIGN_SLUG_MAX = 40;

const ALLOWED = /^[a-z0-9_]*$/;

/**
 * Coerce free text into a UTM_RULES-compliant slug:
 *   lowercase → space·hyphen·dot → `_` → drop anything else → collapse `__` →
 *   trim leading/trailing `_` → cap at CAMPAIGN_SLUG_MAX.
 * Pure and idempotent: normalize(normalize(x)) === normalize(x).
 */
export function normalizeCampaignSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\s\-.]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, CAMPAIGN_SLUG_MAX);
}

export interface CampaignSlugValidation {
  /** Canonical slug to store ("" = 비움 → 필드 미저장). */
  value: string;
  isEmpty: boolean;
  /** Empty is valid (optional field); otherwise must already be canonical. */
  isValid: boolean;
}

export function validateCampaignSlug(raw: string): CampaignSlugValidation {
  const value = raw.trim();
  const isEmpty = value.length === 0;
  const isValid = isEmpty || (ALLOWED.test(value) && value.length <= CAMPAIGN_SLUG_MAX && normalizeCampaignSlug(value) === value);
  return { value, isEmpty, isValid };
}

/**
 * utm_campaign for a Tournament: its slug when the host set one, else the
 * Tournament id normalized (Firestore auto-ids are mixed-case, and UTM values
 * are case-sensitive — normalizing keeps §2 rule 1 while still separating
 * tournaments in GA). `null`/undefined tournament → "site" (토너먼트 밖 공유).
 */
export function campaignForTournament(
  tournament: { id: string; campaignSlug?: string } | null | undefined,
): string {
  if (!tournament) return "site";
  const slug = tournament.campaignSlug?.trim();
  if (slug) return slug;
  // Auto-ids are [A-Za-z0-9] so this is just lowercasing; hand-made ids like
  // "admin-preview-3" get their hyphens folded to `_` per §2 as well.
  return normalizeCampaignSlug(tournament.id) || tournament.id.toLowerCase();
}
