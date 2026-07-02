"use client";

/**
 * M1 · HeroSection — kicker + L1/L2 title + sub + Start Voting / Explore CTA.
 *
 * Copy is rendered via the message catalog (lib/i18n/messages.ts) through
 * useT. The `pitch.hero.l2` key resolves to "Ultimate Crown?" in en — the
 * marker the route-swap + CDN checks grep for (handoff §0 / §10).
 *
 * Both CTAs scroll to the trending feed (#trending). prefers-reduced-motion is
 * honoured in pitch.css (transitions/transform disabled); the magnetic hover
 * polish is intentionally CSS-only here (repo precedent: CSS-only animation,
 * [[project-dev-visual-aid-stack-conflict]]).
 */

import { useT } from "@/lib/i18n/useT";

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="12" x2="18" y2="12" />
      <polyline points="12 6 18 12 12 18" />
    </svg>
  );
}

function scrollToTrending() {
  document.getElementById("trending")?.scrollIntoView({ behavior: "smooth" });
}

export function HeroSection() {
  const { t } = useT();
  return (
    <section className="hero" aria-label="Hero">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-kicker">{t("pitch.hero.kicker")}</div>
      <h1 className="hero-title">
        <span className="hero-l1">{t("pitch.hero.l1")}</span>
        <span className="hero-l2">{t("pitch.hero.l2")}</span>
      </h1>
      <p className="hero-sub">{t("pitch.hero.sub")}</p>
      <div className="hero-cta">
        <button className="btn btn-primary" type="button" onClick={scrollToTrending}>
          {t("pitch.hero.cta.start")} <ArrowIcon />
        </button>
        <button className="btn btn-ghost" type="button" onClick={scrollToTrending}>
          {t("pitch.hero.cta.explore")}
        </button>
      </div>
    </section>
  );
}
