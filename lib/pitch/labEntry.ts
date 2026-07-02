/**
 * A-1 LabEntryCard state (Domain 1 · The Pitch).
 *
 * The card invites Tournament Hosts into The Lab (Domain 2). It is `locked`
 * for ordinary Voters (hosting opens after launch) and `active` only for a
 * Tournament Host. Copy is rendered via the message catalog (pitch.lab.*,
 * lib/i18n/messages.ts) through useT; LAB_COPY here is the non-localized
 * role/cta reference the component's data attributes and tests key off — the
 * catalog is the single source of truth for displayed strings.
 */

export type LabState = "locked" | "active";

export function resolveLabState(args: { isTournamentHost?: boolean }): LabState {
  return args.isTournamentHost ? "active" : "locked";
}

export const LAB_COPY = {
  locked: { roleTag: "TOURNAMENT HOST", cta: "Coming Soon" },
  active: { roleTag: "TOURNAMENT HOST", cta: "Open The Lab" },
} as const;
