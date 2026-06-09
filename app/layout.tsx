import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorldCrown48 — Coming Soon",
  description:
    "WorldCrown48 — the global fan-voting arena. Vote for who you love. Launching 2026.",
  openGraph: {
    title: "WorldCrown48 — Coming Soon",
    description: "The global fan-voting arena. Launching 2026.",
    url: "https://worldcrown48.com",
    siteName: "WorldCrown48",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
