/**
 * /policies/[type]/loading.tsx — automatic Next.js Suspense fallback.
 *
 * The MD file load is fast (local disk) but on slow networks or cold
 * function starts this skeleton bridges the gap. Matches the `.skel`
 * shimmer pattern in globals.css.
 */

import { PolicySkeleton } from "@/components/policy/PolicySkeleton";

export default function Loading(): JSX.Element {
  return (
    <div className="policy-shell">
      {/* No nav skeleton — the nav is static and renders instantly */}
      <div />
      <main className="policy-main">
        <PolicySkeleton />
      </main>
    </div>
  );
}
