import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorldCrown48 — Who Rules the World?",
  description:
    "WorldCrown48 — the global fan-voting arena. A WorldCrown48 tournament is open. Vote for who you love. Crown your champion.",
  openGraph: {
    title: "WorldCrown48 — Who Rules the World?",
    description: "The global fan-voting arena. A WorldCrown48 tournament is open.",
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
    <html lang="ko">
      <head>
        {/* Inter · JetBrains Mono via Google Fonts (allowed by brief).
            Playfair Display italics + Pretendard are self-hosted via @font-face
            in globals.css (brand-mandatory, no CDN). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
