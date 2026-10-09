/**
 * /policies/[type] — dynamic route for the 4 policy documents.
 *
 *   /policies/cookies    /policies/community
 *   /policies/terms      /policies/privacy
 *
 * Server component:
 *   - Validates the `type` segment (handoff §4 — invalid type → notFound())
 *   - Loads every language edition (ko · en · es) from content/{lang}/{type}.md
 *   - Hands the documents to PolicyShell, which composes the
 *     nav + header + content + mobile anchor bar
 *
 * `generateStaticParams` enumerates the four valid types so Next.js
 * pre-renders them at build time. `generateMetadata` reads the KO
 * frontmatter to populate <title> and <description> for SEO.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PolicyShell } from "@/components/policy/PolicyShell";
import {
  POLICY_TYPES,
  isPolicyType,
  loadPolicy,
} from "@/lib/policyContent";

// Pre-render all four routes at build time.
export function generateStaticParams() {
  return POLICY_TYPES.map((type) => ({ type }));
}

interface RouteParams {
  params: { type: string };
}

export async function generateMetadata(
  { params }: RouteParams,
): Promise<Metadata> {
  if (!isPolicyType(params.type)) return { title: "WorldCrown48 — Policy" };
  const policy = await loadPolicy(params.type);
  return {
    title: `${policy.ko.frontmatter.title} · WorldCrown48`,
    description:
      "WorldCrown48 — global fan-voting platform policy documents " +
      "(privacy, terms, community, cookies).",
    alternates: {
      languages: {
        ko: `/policies/${params.type}?lang=ko`,
        en: `/policies/${params.type}?lang=en`,
        es: `/policies/${params.type}?lang=es`,
      },
    },
  };
}

export default async function PolicyPage(
  { params }: RouteParams,
): Promise<JSX.Element> {
  if (!isPolicyType(params.type)) notFound();
  const policy = await loadPolicy(params.type);
  return <PolicyShell policy={policy} />;
}
