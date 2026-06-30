/**
 * /admin — G-1 Admin Dashboard entry point (Domain 6 · M1).
 *
 * Operator-only (NEXT_PUBLIC_ADMIN_UID). The gate (light variant) decides
 * loading / needs-signin / forbidden / allowed; only `allowed` renders the
 * dashboard. noindex here is defense-in-depth alongside middleware's
 * X-Robots-Tag and robots.ts Disallow — the console must never be indexed.
 *
 * M2 (Tournaments table) is intentionally NOT here — split to a later PR.
 */
import type { Metadata } from "next";
import { AdminAuthGuardLight } from "@/components/admin/dashboard/AdminAuthGuardLight";
import { AdminShell } from "@/components/admin/dashboard/AdminShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage(): JSX.Element {
  return (
    <AdminAuthGuardLight>
      <AdminShell />
    </AdminAuthGuardLight>
  );
}
