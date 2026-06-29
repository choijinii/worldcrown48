/**
 * A-1 · The Pitch (Domain 1) — page shell.
 *
 * Phase A scaffold: this establishes the route + `.pitch` container-query host
 * and renders the Hero headline so the `/` route swap is verifiable (dev 200 +
 * "Who wears the" present). Phase B replaces the inner placeholder with the
 * full module tree per handoff §6.1:
 *
 *   <GnbIsland /> · <HeroSection /> · <TrendingFeed /> · <LabEntryCard />
 *   · <NewsroomFeed /> · <PitchFoot />
 *
 * Container-query host is `.pitch` (PitchInner), NOT the viewport — handoff
 * §6.3 forbids viewport media queries for the responsive grid.
 */
export default function PitchPage() {
  return (
    <main className="pitch-shell">
      <div className="pitch-grain" aria-hidden="true" />
      <div className="pitch">
        {/* Phase B: GnbIsland · HeroSection · TrendingFeed · LabEntryCard ·
            NewsroomFeed · PitchFoot mount here. */}
        <section className="hero">
          <div className="hero-kicker">트렌딩 · The Pitch · Global Fan Voting</div>
          <h1 className="hero-title">
            <span className="hero-l1">Who wears the</span>
            <span className="hero-l2">Ultimate Crown?</span>
          </h1>
        </section>
      </div>
    </main>
  );
}
