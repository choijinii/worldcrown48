import type { Metadata } from "next";

/**
 * Launch Pad (A-0) route metadata — moved out of the root layout during the
 * A-1 route swap (handoff §3, Phase A). The root layout's metadata now
 * describes A-1 The Pitch; this nested layout restores A-0's original
 * title/description/OG for the `/launch` archive so the waitlist surface
 * keeps its identity in link previews.
 *
 * This is a nested layout: it adds metadata and passes children through.
 * <html>/<body> and all providers (I18n, Auth, cookie consent, Navbar)
 * stay in the root layout and continue to wrap this subtree.
 */
export const metadata: Metadata = {
  title: "WorldCrown48 — Who Rules the World?",
  description:
    "WorldCrown48 — the global fan-voting arena. A WorldCrown48 tournament is open. Vote for who you love. Crown your champion.",
  openGraph: {
    title: "전 세계 팬들의 선택이 모이는 곳",
    description: "A global fan-voting arena where every vote counts toward crowning one champion.",
    url: "https://worldcrown48.com/launch",
    siteName: "WorldCrown48",
    type: "website",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function LaunchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
