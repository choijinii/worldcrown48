/**
 * devNav — pure logic for the Dev Nav widget (ADR-0008, W-1).
 *
 * Dev Nav is an infra-only aid: zero Voter exposure. It's activated by a
 * keyboard shortcut and persisted in localStorage so it survives until the
 * browser is closed. Production/Preview behave identically (no env gate).
 *
 * Dependency-free so it unit-tests in node-env Vitest; the FAB/sheet React
 * shells (DevNavFab, DevNavSheet) consume these and are verified via E2E.
 */

/** localStorage flag — "1" when Dev Nav is on. */
export const DEV_NAV_STORAGE_KEY = "wc48_dev_nav";

/**
 * Arena needs a tournamentId. This is the id the Phase C seeder
 * (`seed-preview.mjs`) writes, so the Dev Nav Arena link resolves after a
 * `--module=all` seed.
 */
export const SAMPLE_TOURNAMENT_ID = "dev-preview";

/** True for Cmd+Shift+D (Mac) or Ctrl+Shift+D (Windows/Linux). */
export function isDevNavShortcut(e: KeyboardEvent): boolean {
  const hasMod = e.metaKey || e.ctrlKey;
  // Match by physical key (code) so it's layout-independent and unaffected
  // by Shift turning "d" into "D". Coerce to a real boolean — callers compare
  // strictly and event flags can be undefined.
  return Boolean(hasMod && e.shiftKey && e.code === "KeyD");
}

export function parseDevNavValue(raw: string | null): boolean {
  return raw === "1";
}

export function serializeDevNavValue(on: boolean): string {
  return on ? "1" : "0";
}

export interface DevDomain {
  key: string;
  label: string;
  href: string;
  enabled: boolean;
  /** Shown when disabled. */
  note?: string;
}

/**
 * The 7 surfaces a designer wants to spot-check (handoff §6). Labels keep the
 * canonical WC48 names; hrefs point at routes that exist in this worktree.
 * Locker Room (Domain 4) is MVP2 → disabled placeholder.
 */
export const DEV_DOMAINS: readonly DevDomain[] = [
  { key: "launch-pad", label: "Launch Pad", href: "/", enabled: true },
  {
    key: "arena",
    label: "The Arena",
    href: `/arena/${SAMPLE_TOURNAMENT_ID}`,
    enabled: true,
  },
  { key: "lab", label: "The Lab", href: "/admin/lab", enabled: true },
  { key: "account", label: "Account", href: "/account", enabled: true },
  {
    key: "policies",
    label: "Policy Hub",
    href: "/policies/privacy",
    enabled: true,
  },
  { key: "admin", label: "Admin Dashboard", href: "/admin", enabled: true },
  {
    key: "locker-room",
    label: "The Locker Room",
    href: "#",
    enabled: false,
    note: "Coming soon",
  },
] as const;
