/**
 * Policy types + display constants — pure module, safe for client bundles.
 *
 * `lib/policyContent.ts` re-exports from here and adds the server-only
 * file I/O. Client components must import from THIS file, never from
 * policyContent — otherwise `node:fs` gets dragged into the client bundle.
 */

import type { Lang } from "./cookieConsent";

export const POLICY_TYPES = ["cookies", "community", "terms", "privacy"] as const;
export type PolicyType = (typeof POLICY_TYPES)[number];

export function isPolicyType(t: string): t is PolicyType {
  return (POLICY_TYPES as readonly string[]).includes(t);
}

export interface PolicyFrontmatter {
  title: string;
  type: PolicyType;
  lang: Lang;
  lastUpdated: string;
  version: string;
}

export interface PolicyDocument {
  frontmatter: PolicyFrontmatter;
  /** Raw markdown body, frontmatter stripped. */
  body: string;
}

export interface BilingualPolicy {
  type: PolicyType;
  ko: PolicyDocument;
  en: PolicyDocument;
}

export interface PolicyNavEntry {
  type: PolicyType;
  /** Two-digit ordinal shown in the left nav. */
  ord: string;
  ko: string;
  en: string;
}

/**
 * Display order: privacy first (legal hierarchy), then terms, community,
 * cookies. Matches the HTML draft.
 */
export const POLICY_NAV: readonly PolicyNavEntry[] = [
  { type: "privacy", ord: "01", ko: "개인정보처리방침", en: "Privacy" },
  { type: "terms", ord: "02", ko: "이용약관", en: "Terms of Service" },
  { type: "community", ord: "03", ko: "커뮤니티 정책", en: "Community" },
  { type: "cookies", ord: "04", ko: "쿠키 정책", en: "Cookie Policy" },
] as const;
