/**
 * PolicyDocSwitch — mobile-only top chip row that mirrors the desktop
 * left nav (PolicyNav). Visible <480px (see globals.css @container).
 *
 * Uses Next.js <Link> for hard navigation — these chips match the route
 * segment, not a client-side filter.
 */

"use client";

import Link from "next/link";
import { POLICY_NAV, type PolicyType } from "@/lib/policyTypes";
import { useI18n } from "@/lib/i18n";

export interface PolicyDocSwitchProps {
  activeType: PolicyType;
}

export function PolicyDocSwitch({
  activeType,
}: PolicyDocSwitchProps): JSX.Element {
  const { lang } = useI18n();
  return (
    <nav
      className="policy-doc-switch"
      role="tablist"
      aria-label="Policy document"
    >
      {POLICY_NAV.map((entry) => (
        <Link
          key={entry.type}
          href={`/policies/${entry.type}`}
          role="tab"
          aria-current={entry.type === activeType ? "page" : undefined}
        >
          {lang === "ko" ? entry.ko : entry.en}
        </Link>
      ))}
    </nav>
  );
}
