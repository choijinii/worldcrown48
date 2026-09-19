/* Crown Reveal — final ceremony screen + Crown Card share artifact. */

function CrownReveal({ setTab }) {
  const champion = { name: "미나", initial: "MN" };
  return (
    <main className="container" style={{ flex: 1 }}>
      <section className="crown-stage">
        <div className="crown-stage__kicker">THE CROWN GOES TO</div>
        <div className="crown-card">
          <div className="crown-card__photo">{champion.initial}</div>
          <div className="crown-card__top">
            <img src="../../assets/wc48-crown-filled.svg" alt="" />
            <div className="crown-card__label">WORLDCROWN48 · CHAMPION</div>
          </div>
          <div className="crown-card__text">
            <div className="crown-card__name">{champion.name.toUpperCase()}</div>
            <div className="crown-card__tour">최고의 퍼포먼스 무대 · 2026</div>
            <div className="crown-card__bracket">48 → 24 → 12 → 6 → THE FINAL</div>
            <div className="crown-card__sig"><span></span>WorldCrown48 · 2026-05-26 KST<span></span></div>
          </div>
        </div>

        <div className="crown-actions">
          <MagneticButton size="xl">Share My Crown</MagneticButton>
          <MagneticButton variant="secondary" size="xl" onClick={() => setTab("pitch")}>Open another Tournament</MagneticButton>
        </div>

        <div style={{ marginTop: 48, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-muted)", letterSpacing: "0.2em", textAlign: "center" }}>
          1080 × 1350 · 4:5 Instagram feed · framed in Crown Gold
        </div>
      </section>
    </main>
  );
}

Object.assign(window, { CrownReveal });
