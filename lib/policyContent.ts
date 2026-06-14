/**
 * Policy content loader — RSC/server-only.
 *
 * Reads `content/{lang}/{type}.md` from disk and returns a typed bilingual
 * shape. The pure types + constants live in `lib/policyTypes.ts` so
 * client components can import them without pulling `node:fs` into the
 * browser bundle.
 *
 * Frontmatter shape (handoff Appendix A):
 *   title: string
 *   type: 'cookies' | 'community' | 'terms' | 'privacy'
 *   lang: 'ko' | 'en'
 *   lastUpdated: 'YYYY-MM-DD'
 *   version: string
 */

import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { Lang } from "./cookieConsent";
import type {
  BilingualPolicy,
  PolicyDocument,
  PolicyFrontmatter,
  PolicyType,
} from "./policyTypes";

// Re-export the pure module so server code only has to import from one
// place. Client code MUST import directly from "./policyTypes".
export {
  POLICY_TYPES,
  POLICY_NAV,
  isPolicyType,
  type PolicyType,
  type PolicyFrontmatter,
  type PolicyDocument,
  type BilingualPolicy,
  type PolicyNavEntry,
} from "./policyTypes";

const CONTENT_ROOT = path.join(process.cwd(), "content");

async function readPolicyDoc(
  type: PolicyType,
  lang: Lang,
): Promise<PolicyDocument> {
  const filePath = path.join(CONTENT_ROOT, lang, `${type}.md`);
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);

  const fm = parsed.data as Record<string, unknown>;
  // Defensive normalization — every required field must be present, but
  // we don't want a missing field to nuke the page. Fall back to safe
  // defaults. Note that gray-matter uses js-yaml, which auto-parses YAML
  // 1.1 date literals (`2026-06-11`) into Date objects and bare decimals
  // (`1.0`) into numbers — both would crash react-markdown's renderer
  // when interpolated as text. We coerce to strings here.
  const frontmatter: PolicyFrontmatter = {
    title: String(fm.title ?? type),
    type: (fm.type ?? type) as PolicyType,
    lang: (fm.lang ?? lang) as Lang,
    lastUpdated: formatYamlDate(fm.lastUpdated),
    version: String(fm.version ?? "1.0"),
  };

  return { frontmatter, body: parsed.content.trimStart() };
}

/**
 * YAML 1.1 auto-coerces `2026-06-11` to a Date object. Render it as a
 * locale-neutral ISO short date so the policy header shows a stable
 * string regardless of the runtime locale.
 */
function formatYamlDate(value: unknown): string {
  if (value instanceof Date) {
    // Use UTC slice to avoid timezone shifts (2026-06-11 UTC could be
    // 2026-06-10 in PT if .toISOString() rolled over).
    const yyyy = value.getUTCFullYear();
    const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(value.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof value === "string" && value.length > 0) return value;
  return "";
}

/**
 * Load both KO and EN versions of a single policy type. Throws if either
 * file is missing — that's a deploy-time error, not a runtime one.
 */
export async function loadBilingualPolicy(
  type: PolicyType,
): Promise<BilingualPolicy> {
  const [ko, en] = await Promise.all([
    readPolicyDoc(type, "ko"),
    readPolicyDoc(type, "en"),
  ]);
  return { type, ko, en };
}
