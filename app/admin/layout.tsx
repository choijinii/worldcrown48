/**
 * /admin layout — light-theme wrapper for the G-1 Admin Dashboard (Domain 6).
 *
 * `.wc-admin` scopes the entire light palette (app/admin/admin.css) so it never
 * leaks into the dark global app. The class also carries the design-token CSS
 * variables, so both the gate and the dashboard inherit them.
 *
 * Auth + i18n come from the root layout (AuthProvider · I18nProvider), so this
 * layer only sets the visual container. noindex lives on the page metadata +
 * middleware X-Robots-Tag (defense-in-depth).
 */
import type { ReactNode } from "react";
import "./admin.css";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="wc-admin" data-theme="light">
      {children}
    </div>
  );
}
