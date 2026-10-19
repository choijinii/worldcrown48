"use client";

/**
 * M4 · SNSLinks — X 하나. Instagram·TikTok 은 계정이 없어 뺐다(대표 눈검사 2026-10-18 · 원장 D-60).
 * Footer: "WorldCrown48 · 48 Contestants · One Crown" (mono caps).
 */

import { track } from "@/lib/analytics";

type Platform = "x";

const links: { platform: Platform; href: string; label: string }[] = [
  { platform: "x", href: "https://x.com/worldcrown48", label: "X" },
];

function Icon({ platform }: { platform: Platform }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg {...common} data-platform={platform}>
      <path d="M4 4 L20 20 M20 4 L4 20" />
    </svg>
  );
}

export function SNSLinks() {
  return (
    <section className="sns" aria-label="Social links">
      <div className="sns-row">
        {links.map((l) => (
          <a
            key={l.platform}
            className="sns-link"
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={l.label}
            onClick={() => {
              void track("sns_link_click", { platform: l.platform });
            }}
          >
            <Icon platform={l.platform} />
          </a>
        ))}
      </div>
      <p className="lp-foot">WorldCrown48 · 48 Contestants · One Crown</p>
    </section>
  );
}
