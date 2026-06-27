/**
 * ModuleNav — the Arena module tabstrip (W-6). Thin glue: usePathname →
 * resolveActiveTab → render the 4 pure {@link MODULE_TABS}. ALL logic (tab set,
 * disabled Newsroom, href, active detection) lives in lib/arena/moduleNav and is
 * node-env vitest'd; this only wires the client hooks + dark-theme styling.
 *
 * Placement (handoff §2 W-6): page top, NON-sticky (scrolls away) so the
 * full-screen VS Battle vote flow is never obstructed. Mobile = horizontal-scroll
 * chips. data-testid="module-nav" isolates it from existing surface selectors
 * (trap #8). Newsroom is a disabled <button> (a disabled <Link> still navigates,
 * trap #7) with a "Coming soon" chip.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MODULE_TABS,
  moduleTabHref,
  resolveActiveTab,
} from "@/lib/arena/moduleNav";

const STYLE = `
.module-nav { width: 100%; border-bottom: 1px solid var(--color-border); }
.mn-strip { display: flex; gap: var(--space-2); padding: var(--space-3) var(--space-4); max-width: 820px; margin: 0 auto; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.mn-strip::-webkit-scrollbar { display: none; }
.mn-tab { display: inline-flex; align-items: center; gap: var(--space-2); white-space: nowrap; flex: none; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; padding: 6px var(--space-3); border-radius: var(--radius-chip); border: 1px solid transparent; color: var(--color-text-sub); text-decoration: none; background: transparent; cursor: pointer; transition: color 120ms ease, border-color 120ms ease, background 120ms ease; }
.mn-tab:hover { color: var(--color-text); }
.mn-tab[data-active="true"] { color: var(--color-gold); border-color: var(--color-border-gold); background: var(--color-gold-subtle); }
.mn-tab[data-disabled="true"] { opacity: 0.4; cursor: not-allowed; }
.mn-tab[data-disabled="true"]:hover { color: var(--color-text-sub); }
.mn-soon { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; padding: 1px 6px; border-radius: var(--radius-chip); border: 1px solid var(--color-border); color: var(--color-text-muted); }
`;

export function ModuleNav({
  tournamentId,
}: {
  tournamentId: string;
}): JSX.Element {
  const pathname = usePathname() ?? "";
  const active = resolveActiveTab(pathname);

  return (
    <nav className="module-nav" data-testid="module-nav" aria-label="Arena modules">
      <style>{STYLE}</style>
      <div className="mn-strip">
        {MODULE_TABS.map((tab) => {
          const testId = `module-tab-${tab.key}`;
          if (tab.disabled) {
            return (
              <button
                key={tab.key}
                type="button"
                className="mn-tab"
                data-active="false"
                data-disabled="true"
                aria-disabled="true"
                disabled
                data-testid={testId}
              >
                {tab.label}
                <span className="mn-soon">Coming soon</span>
              </button>
            );
          }
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={moduleTabHref(tournamentId, tab)}
              className="mn-tab"
              data-active={isActive}
              aria-current={isActive ? "page" : undefined}
              data-testid={testId}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
