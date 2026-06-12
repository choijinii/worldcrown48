/**
 * PolicyNav — desktop left sidebar.
 *
 * Lists the four policy documents (privacy · terms · community · cookies),
 * plus an "이의신청 · APPEALS" card with a mailto link at the bottom
 * (handoff §4 Policy AC).
 *
 * Client component because it reads the active language from the I18n
 * Context. The activeType prop comes from the route segment server-side,
 * so the active highlight is correct on first paint.
 *
 * Reduces to a horizontal-wrap row at <900px and disappears entirely at
 * <480px (PolicyDocSwitch takes over on mobile — see globals.css).
 */

"use client";

import Link from "next/link";
import { POLICY_NAV, type PolicyType } from "@/lib/policyTypes";
import { useI18n } from "@/lib/i18n";
import { trackWithConsent } from "@/lib/analytics";

export interface PolicyNavProps {
  activeType: PolicyType;
}

export function PolicyNav({ activeType }: PolicyNavProps): JSX.Element {
  const { lang } = useI18n();
  return (
    <aside className="policy-nav" aria-label="Policy documents">
      <div className="policy-nav-title">정책 · POLICY DOCUMENTS</div>
      {POLICY_NAV.map((entry) => (
        <Link
          key={entry.type}
          href={`/policies/${entry.type}`}
          aria-current={entry.type === activeType ? "page" : undefined}
        >
          <span className="pn-num">{entry.ord}</span>
          <span>{lang === "ko" ? `${entry.ko} · ${entry.en}` : entry.en}</span>
        </Link>
      ))}
      <AppealsCard />
    </aside>
  );
}

function AppealsCard(): JSX.Element {
  const onClick = () =>
    void trackWithConsent("policy_report_link_click", { source: "nav" });
  return (
    <div className="policy-nav-foot">
      <div className="pnf-lbl">이의신청 · APPEALS</div>
      <a
        className="pnf-mail"
        href="mailto:policy@worldcrown48.com"
        onClick={onClick}
      >
        policy@worldcrown48.com
      </a>
    </div>
  );
}
