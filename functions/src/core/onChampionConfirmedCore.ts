/**
 * onChampionConfirmedCore — pure transition guard for the Crown Card trigger
 * (handoff §3, 부록 D, ADR-0005).
 *
 * The trigger fires on every roundProgress write. A Crown Card must be generated
 * exactly once, on the false→true edge of `complete`, and only when the doc
 * carries a real Champion (championId + userId + tournamentId). A redelivered
 * "already complete" event (before.complete === true) must be a no-op — that,
 * plus the crown_cards existence check in the trigger, gives idempotency.
 */
import type { CrownData } from "../_crown/formats";
import { crownCardName } from "../_crown/cardName";
import { campaignForTournament } from "../_crown/campaignSlugValidation";

const VICTORY_PATH = "48 → 24 → 12 → 6 → THE FINAL";
export interface RoundProgressData {
  /** RUN-1: 이 판의 회차. 옛 문서에는 없다 → 읽는 쪽에서 1로 본다. */
  runIndex?: number;
  userId?: string | null;
  tournamentId?: string | null;
  complete?: boolean;
  championId?: string | null;
}

export function shouldGenerateCrownCard(
  before: RoundProgressData | undefined,
  after: RoundProgressData | undefined,
): boolean {
  if (!after) return false;
  // Only the false→true edge — never a redelivered already-complete event.
  if (before?.complete === true) return false;
  if (after.complete !== true) return false;
  // Must carry a real Champion + identity.
  return Boolean(after.championId && after.userId && after.tournamentId);
}

/**
 * 서버가 그리는 카드 그림의 입력. 카드 안 이름은 화면 카드와 같은 crownCardName —
 * 언어와 상관없이 영어, 없으면 한글 (NAME-I18N-1 · 원장 D-62). `campaign` 은 그림에 그리지
 * 않지만 CrownData 가 요구한다 — 값 규칙은 클라이언트와 같은 함수(UTM_RULES v1.0 §1).
 */
export function crownPngInput(args: {
  tournamentId: string;
  tournament: { title?: unknown; campaignSlug?: unknown };
  contestant: { name?: unknown; nameI18n?: unknown };
}): CrownData {
  const raw = (args.contestant.nameI18n ?? null) as { ko?: unknown; en?: unknown; es?: unknown } | null;
  const nameI18n = raw && typeof raw === "object" ? { en: typeof raw.en === "string" ? raw.en : "" } : null;
  const name = crownCardName({ name: String(args.contestant.name ?? ""), nameI18n });
  return {
    initial: name.trim() ? Array.from(name.trim())[0].toUpperCase() : "?",
    name,
    title: String(args.tournament.title ?? ""),
    url: "worldcrown48.com",
    path: VICTORY_PATH,
    campaign: campaignForTournament({
      id: args.tournamentId,
      campaignSlug: typeof args.tournament.campaignSlug === "string" ? args.tournament.campaignSlug : undefined,
    }),
  };
}
