/**
 * /policies/[type]/not-found.tsx — 404 when a non-existent policy type
 * is requested (e.g. /policies/garbage).
 *
 * The handoff §4 AC requires `notFound()` rather than a redirect, so
 * search engines correctly treat the URL as missing.
 */

import Link from "next/link";
import { POLICY_NAV } from "@/lib/policyContent";

export default function PolicyNotFound(): JSX.Element {
  return (
    <main className="policy-shell">
      <div />
      <div className="policy-main">
        <header className="policy-header">
          <div className="ph-eyebrow">
            <span>WC48 · LEGAL</span>
            <span>·</span>
            <b>404</b>
          </div>
          <h1 className="ph-title">정책을 찾을 수 없습니다.</h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--color-text-sub-light)",
              maxWidth: 640,
              margin: "var(--space-2) 0 0",
            }}
          >
            요청하신 정책 문서가 존재하지 않습니다. 아래 문서 중 하나를
            선택해 주세요.
            <br />
            The policy document you requested does not exist. Please
            choose one of the documents below.
          </p>
        </header>
        <section className="policy-section">
          <ul>
            {POLICY_NAV.map((entry) => (
              <li key={entry.type}>
                <Link href={`/policies/${entry.type}`}>
                  {entry.ko} · {entry.en}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
