/**
 * MobileNotice — shown ≤480px instead of the dashboard (handoff §4.6, §5 DON'T:
 * desktop-primary, no mobile layout ambition). CSS swaps .app-shell ↔ this.
 */
"use client";

import { useI18n } from "@/lib/i18n";

export function MobileNotice(): JSX.Element {
  const { lang } = useI18n();
  const t =
    lang === "ko"
      ? {
          title: "더 넓은 화면을 사용하세요",
          sub: "Admin Dashboard는 데스크톱 우선(1440px 기준)입니다. 작은 화면에서는 운영 도구를 모두 볼 수 없어요 — 노트북이나 외부 모니터로 전환해 주세요.",
        }
      : {
          title: "Use a wider screen",
          sub: "Admin Dashboard is desktop-first (1440px primary). On smaller widths the operator tools aren't fully surfaced — please switch to a laptop or external monitor.",
        };
  return (
    <div className="mobile-notice">
      <div className="mn-title">{t.title}</div>
      <div className="mn-sub">{t.sub}</div>
    </div>
  );
}
