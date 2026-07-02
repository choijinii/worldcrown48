"use client";

/**
 * M4 · LabEntryCard — invites Tournament Hosts into The Lab.
 *
 * `locked` for ordinary Voters (Coming Soon tooltip on hover, AC-9), `active`
 * for a Tournament Host (Open The Lab CTA → /admin/lab). State comes from
 * lib/pitch/labEntry (unit-tested); copy is rendered via useT (pitch.lab.*).
 * The DOM transition + tooltip reveal are E2E-covered. Defaults to locked —
 * host detection is wired by the caller.
 */

import Link from "next/link";
import { resolveLabState } from "@/lib/pitch/labEntry";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/useT";

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function LabIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6" />
      <path d="M10 3v6l-5 9a1.6 1.6 0 0 0 1.4 2.4h11.2A1.6 1.6 0 0 0 19 18l-5-9V3" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="12" x2="18" y2="12" />
      <polyline points="12 6 18 12 12 18" />
    </svg>
  );
}

export interface LabEntryCardProps {
  isTournamentHost?: boolean;
}

export function LabEntryCard({ isTournamentHost = false }: LabEntryCardProps) {
  const { t } = useT();
  const state = resolveLabState({ isTournamentHost });

  return (
    <section className="lab-entry" data-lab={state} aria-label="Create Tournament">
      <div className="lab-entry-ico">{state === "active" ? <LabIcon /> : <LockIcon />}</div>
      <div className="lab-entry-body">
        <div className="lab-entry-title">
          {t("pitch.lab.title")} <span className="lab-role-tag">{t("pitch.lab.roleTag")}</span>
        </div>
        <div className="lab-entry-sub">
          {state === "active" ? t("pitch.lab.sub.active") : t("pitch.lab.sub.locked")}
        </div>
      </div>

      {/* active CTA — hidden by CSS when data-lab="locked" */}
      <Link className="lab-cta lab-cta-active" href="/admin/lab">
        {t("pitch.lab.cta.active")} <ArrowIcon />
      </Link>

      {/* locked CTA — hidden by CSS when data-lab="active" */}
      <button
        className="lab-cta lab-cta-locked"
        type="button"
        aria-disabled="true"
        onClick={() => track("a1_lab_locked_hover", {})}
      >
        <LockIcon /> {t("pitch.lab.cta.locked")}
      </button>

      <div className="lab-tip" role="tooltip">{t("pitch.lab.tip")}</div>
    </section>
  );
}
