"use client";

/**
 * M1 · HeroSection — kicker + L1/L2 title + sub + Start Voting / Explore CTA.
 *
 * Copy is bilingual-static, verbatim from the wireframe (lines 400-412) — A-1
 * has no lang-toggle key system (대표 decision 2026-06-29). The L2 line
 * "Ultimate Crown?" is the marker the route-swap + CDN checks grep for
 * (handoff §0 / §10).
 *
 * Both CTAs scroll to the trending feed (#trending). prefers-reduced-motion is
 * honoured in pitch.css (transitions/transform disabled); the magnetic hover
 * polish is intentionally CSS-only here (repo precedent: CSS-only animation,
 * [[project-dev-visual-aid-stack-conflict]]).
 */

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
  return (
    <section className="hero" aria-label="Hero">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-kicker">트렌딩 · The Pitch · Global Fan Voting</div>
      <h1 className="hero-title">
        <span className="hero-l1">Who wears the</span>
        <span className="hero-l2">Ultimate Crown?</span>
      </h1>
      <p className="hero-sub">
        48 Contestants. Five Rounds. You advance Match by Match until one Crown
        remains. No predictions, no odds — pure fan choice. 당신의 한 표가
        챔피언을 만듭니다.
      </p>
      <div className="hero-cta">
        <button className="btn btn-primary" type="button" onClick={scrollToTrending}>
          Start Voting <ArrowIcon />
        </button>
        <button className="btn btn-ghost" type="button" onClick={scrollToTrending}>
          Explore
        </button>
      </div>
    </section>
  );
}
