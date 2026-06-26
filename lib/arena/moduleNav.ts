/**
 * lib/arena/moduleNav — pure model for the Arena ModuleNav strip (W-6).
 *
 * The wireframe tabstrip (Domain 3 · The Arena, line 591~596) listed 6 tabs;
 * 대표 정제 → 4 (Round Transition·THE FINAL are VS Battle sub-states, not tabs —
 * the Voter auto-advances, so they need no nav). Newsroom (C-4/C-5) is unbuilt →
 * a disabled "Coming soon" tab.
 *
 * Kept SDK-free + pure so ModuleNav.tsx is thin glue (usePathname → this) and the
 * logic is node-env vitest'd (codebase pure-core + thin-glue pattern).
 */

export type ModuleTabKey = "vs" | "crown" | "ranking" | "newsroom";

export interface ModuleTab {
  key: ModuleTabKey;
  label: string;
  /** Appended to `/arena/{tournamentId}`. "" = the VS Battle base route. */
  subPath: string;
  /** Newsroom is unbuilt — render disabled with a "Coming soon" chip. */
  disabled: boolean;
}

export const MODULE_TABS: readonly ModuleTab[] = [
  { key: "vs", label: "VS Battle", subPath: "", disabled: false },
  { key: "crown", label: "Crown Card", subPath: "/champion", disabled: false },
  { key: "ranking", label: "Ranking", subPath: "/ranking", disabled: false },
  { key: "newsroom", label: "Newsroom", subPath: "/newsroom", disabled: true },
];

/** Absolute href for a tab given the current Tournament. */
export function moduleTabHref(tournamentId: string, tab: ModuleTab): string {
  return `/arena/${tournamentId}${tab.subPath}`;
}

/**
 * Which tab is active for a pathname. EXACT route, not prefix (trap #6):
 * `/arena/{id}` is a prefix of every sub-route, so a startsWith check would
 * wrongly keep VS Battle active on /ranking. Match the leaf segment instead.
 */
export function resolveActiveTab(pathname: string): ModuleTabKey {
  if (pathname.endsWith("/champion")) return "crown";
  if (pathname.endsWith("/ranking")) return "ranking";
  if (pathname.endsWith("/newsroom")) return "newsroom";
  return "vs";
}
