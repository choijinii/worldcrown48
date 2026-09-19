/* Launch Pad — Domain 0 · pre-launch landing + email waitlist + manifesto */

function LaunchPad({ setTab }) {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  function onJoin(e) {
    e.preventDefault();
    if (!email) return;
    setJoined(true);
    setTimeout(() => setJoined(false), 2400);
  }

  return (
    <main className="container" style={{ position: "relative", flex: 1 }}>
      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-kicker">WORLDCROWN48 · GLOBAL FAN VOTING · LAUNCHING 2026</div>
        <h1 className="lp-title">
          48 Contestants.<br />
          <em>One Crown.</em>
        </h1>
        <p className="lp-sub">
          Most platforms predict winners. WorldCrown48 lets fans decide — one Match at a time.
          No odds. No betting. Pure fan choice.
        </p>

        <form className="lp-waitlist" onSubmit={onJoin}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@worldcrown48.com"
            disabled={joined}
          />
          <button type="submit" disabled={joined}>
            {joined ? "✓ Joined" : "Join the waitlist"}
          </button>
        </form>

        <div className="lp-stats">
          <div>
            <div className="lp-stat__num">48</div>
            <div className="lp-stat__lbl">Contestants per Tournament</div>
          </div>
          <div>
            <div className="lp-stat__num">5</div>
            <div className="lp-stat__lbl">Rounds · 48→24→12→6→FINAL</div>
          </div>
          <div>
            <div className="lp-stat__num">2026</div>
            <div className="lp-stat__lbl">North American Season</div>
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="manifesto">
        <p style={{ fontSize: 18, color: "var(--color-text-muted)", fontWeight: 400 }}>
          Most platforms focus on:
        </p>
        <p style={{ fontSize: 26, color: "var(--color-text-sub)", marginTop: 8, opacity: 0.7, fontWeight: 400 }}>
          Predicting the winner.
        </p>
        <div style={{ width: 60, height: 1, background: "var(--color-gold)", margin: "40px auto" }} />
        <p style={{
          fontFamily: "var(--font-display)", fontStyle: "italic",
          fontSize: "clamp(40px, 6vw, 84px)",
          color: "var(--color-text)", lineHeight: 1, letterSpacing: "-0.025em",
          fontWeight: 400,
        }}>We let fans</p>
        <p style={{
          fontFamily: "var(--font-sans)",
          fontSize: "clamp(72px, 11vw, 144px)",
          color: "var(--color-gold)", marginTop: 4,
          lineHeight: 0.95, letterSpacing: "-0.045em", fontWeight: 900,
          textShadow: "0 0 60px rgba(252,208,6,0.25)",
        }}>DECIDE.</p>
      </section>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 64 }}>
        <MagneticButton size="lg" onClick={() => setTab("pitch")}>Open the Pitch</MagneticButton>
        <MagneticButton variant="secondary" size="lg" onClick={() => setTab("arena")}>Try a Match</MagneticButton>
      </div>
    </main>
  );
}

Object.assign(window, { LaunchPad });
