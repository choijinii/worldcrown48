/**
 * /admin/newsdesk — News Desk 발행인 콘솔 (ND-1 §3 #8).
 *
 * The Lab 패턴 준수: AdminAuthGuard(operator-only gate) → NewsDesk(초안 대기함 +
 * 3언어 편집기 + 근거 스냅샷 패널 + 발행/내리기 토글 + 생성 패널). Voters never
 * reach this subtree; noindex is defense-in-depth alongside middleware + robots.ts.
 */
import type { Metadata } from "next";
import { AdminAuthGuard } from "@/components/admin/lab/AdminAuthGuard";
import { NewsDesk } from "@/components/admin/newsdesk/NewsDesk";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NewsDeskPage(): JSX.Element {
  return (
    <AdminAuthGuard>
      <NewsDesk />
    </AdminAuthGuard>
  );
}
