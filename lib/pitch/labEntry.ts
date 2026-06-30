/**
 * A-1 LabEntryCard state (Domain 1 · The Pitch).
 *
 * The card invites Tournament Hosts into The Lab (Domain 2). It is `locked`
 * for ordinary Voters (hosting opens after launch) and `active` only for a
 * Tournament Host. Copy is bilingual-static, verbatim from the wireframe
 * (lines 443-453, 646-648) — A-1 has no lang-toggle key system (대표 decision
 * 2026-06-29: follow the wireframe/A-0 bilingual convention).
 */

export type LabState = "locked" | "active";

export function resolveLabState(args: { isTournamentHost?: boolean }): LabState {
  return args.isTournamentHost ? "active" : "locked";
}

export const LAB_COPY = {
  locked: {
    title: "Create Tournament",
    roleTag: "TOURNAMENT HOST",
    sub: "대진 만들기 · The Lab is reserved for Tournament Hosts. Hosting opens after launch.",
    cta: "Coming Soon",
    tooltip: "Coming Soon · Tournament hosting opens after launch",
  },
  active: {
    title: "Create Tournament",
    roleTag: "TOURNAMENT HOST",
    sub: "You are a Tournament Host — open The Lab to create a Tournament, set its Deadline, and publish.",
    cta: "Open The Lab",
    tooltip: "",
  },
} as const;
