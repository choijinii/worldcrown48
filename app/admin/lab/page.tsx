/**
 * /admin/lab — The Lab operator console (Domain 2).
 *
 * Composition (handoff §6):
 *   AdminAuthGuard  → operator-only gate (Voters never reach the subtree)
 *     DesktopOnly   → ≥1440px or an explicit "Desktop only" notice
 *       TournamentCreator → Step1 (title/category/AI Fill) + Step2 (48 nodes)
 *                           + TournamentList
 *
 * noindex metadata is defense-in-depth alongside middleware's X-Robots-Tag and
 * robots.ts Disallow — the console must never be indexed.
 */
import type { Metadata } from "next";
import { AdminAuthGuard } from "@/components/admin/lab/AdminAuthGuard";
import { DesktopOnly } from "@/components/admin/lab/DesktopOnly";
import { TournamentCreator } from "@/components/admin/lab/TournamentCreator";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LabPage(): JSX.Element {
  return (
    <AdminAuthGuard>
      <DesktopOnly>
        <TournamentCreator />
      </DesktopOnly>
    </AdminAuthGuard>
  );
}
