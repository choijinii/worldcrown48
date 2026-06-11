"use client";

/**
 * M4 · SNSLinks — Instagram · X · TikTok.
 * Footer: "WorldCrown48 · 48 Contestants · One Crown" (mono caps).
 */

import { track } from "@/lib/analytics";

type Platform = "instagram" | "x" | "tiktok";

const links: { platform: Platform; href: string; label: string }[] = [
  { platform: "instagram", href: "https://instagram.com/worldcrown48", label: "Instagram" },
  { platform: "x", href: "https://twitter.com/worldcrown48", label: "X" },
  { platform: "tiktok", href: "https://tiktok.com/@worldcrown48", label: "TikTok" },
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
  if (platform === "instagram") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (platform === "x") {
    return (
      <svg {...common}>
        <path d="M4 4 L20 20 M20 4 L4 20" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M9 11.5 a4 4 0 1 0 4 4 V4 c0.8 2.4 2.6 3.8 5 4" />
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
