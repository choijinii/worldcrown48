import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { CookieBanner } from "@/components/policy/CookieBanner";
import { ConsentModal } from "@/components/policy/ConsentModal";
import { CookieConsentProvider } from "@/components/policy/CookieConsentProvider";
import { FooterPolicyRow } from "@/components/policy/FooterPolicyRow";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Navbar } from "@/components/auth/Navbar";
import { DevNavFab } from "@/components/dev/DevNavFab";
import { Toaster } from "@/components/Toaster";

export const metadata: Metadata = {
  // A-1 The Pitch is the homepage as of the route swap (handoff §3, Phase A).
  // A-0 Launch Pad's metadata moved to app/launch/layout.tsx.
  title: "WorldCrown48 — Who Wears the Ultimate Crown?",
  description:
    "The Pitch — WorldCrown48's trending tournament feed. 48 contestants, one crown. Vote for who you love and crown your champion.",
  openGraph: {
    title: "WorldCrown48 — Who Wears the Ultimate Crown?",
    description:
      "The Pitch — trending fan-voting tournaments. 48 contestants, one crown.",
    url: "https://worldcrown48.com",
    siteName: "WorldCrown48",
    type: "website",
  },
};

/**
 * RootLayout — wraps the entire app with the I18n + cookie consent
 * providers and mounts the banner/modal once at the root.
 *
 * Theme scoping (handoff §9 trap 1):
 *   - Domain 0~3 surfaces (e.g. `.lp` in app/page.tsx) keep using the
 *     dark `:root` tokens from globals.css.
 *   - The cookie banner and consent modal carry their OWN
 *     `data-theme="light"` so the light tokens apply only inside their
 *     subtree, no matter what page they overlay.
 *   - Policy pages (PR-B) wrap their root in `.domain-policy` for the
 *     same effect over the body content.
 *
 * Footer (handoff §5 / §10):
 *   - "Report content" mailto:
 *   - "Cookie 설정 다시 열기" button (calls Provider.reopen())
 *   These need consent context, so they live in a client component
 *   (FooterPolicyRow) under the Provider.
 */
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
      <body>
        <I18nProvider>
          <CookieConsentProvider>
            <AuthProvider>
              <Navbar />
              {children}
              <FooterPolicyRow />
              {/* Banner + modal are themed locally — they overlay any page. */}
              <div data-theme="light">
                <CookieBanner />
                <ConsentModal />
              </div>
              <Toaster />
              {/* Dev-only nav aid — renders null unless Cmd/Ctrl+Shift+D is on. */}
              <DevNavFab />
            </AuthProvider>
          </CookieConsentProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
