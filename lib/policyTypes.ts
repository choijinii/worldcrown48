/**
 * Policy types + display constants — pure module, safe for client bundles.
 *
 * `lib/policyContent.ts` re-exports from here and adds the server-only
 * file I/O. Client components must import from THIS file, never from
 * policyContent — otherwise `node:fs` gets dragged into the client bundle.
 */

import type { Lang } from "./cookieConsent";

// "crown-score" = Crown Score 산정 기준(RATE-1 · 대표 결정 M 2026-11-28) — 법적 문서는 아니지만 같은 방식(경로 · 목록 · 사이트맵)으로 둔다.
export const POLICY_TYPES = ["cookies", "community", "terms", "privacy", "crown-score"] as const;
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

/** One policy in every language — rendered together, CSS shows the active one. */
export interface PolicyTranslations {
  type: PolicyType;
  ko: PolicyDocument;
  en: PolicyDocument;
  /** POLICY-ES-1 (2026-10-05) — Spanish edition, translated from the Korean original. */
  es: PolicyDocument;
}

export interface PolicyNavEntry {
  type: PolicyType;
  /** Two-digit ordinal shown in the left nav. */
  ord: string;
  ko: string;
  en: string;
  es: string;
}

/**
 * Display order: privacy first (legal hierarchy), then terms, community,
 * cookies. Matches the HTML draft.
 */
export const POLICY_NAV: readonly PolicyNavEntry[] = [
  { type: "privacy", ord: "01", ko: "개인정보처리방침", en: "Privacy", es: "Privacidad" },
  { type: "terms", ord: "02", ko: "이용약관", en: "Terms of Service", es: "Términos del servicio" },
  { type: "community", ord: "03", ko: "커뮤니티 가이드", en: "Community", es: "Comunidad" },
  { type: "cookies", ord: "04", ko: "쿠키 정책", en: "Cookie Policy", es: "Política de cookies" },
  // 페이지 이름 대표 승인 2026-11-28(RATE-1 §4).
  { type: "crown-score", ord: "05", ko: "Crown Score 산정 기준", en: "How Crown Score works", es: "Cómo se calcula Crown Score" },
] as const;
