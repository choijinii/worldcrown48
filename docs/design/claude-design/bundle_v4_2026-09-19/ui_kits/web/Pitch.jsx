/* The Pitch — Domain 1 · trending Tournament grid. Strictly v2.3 compliant:
   - NO LIVE badge anywhere — WC48 does not live-stream
   - NO Round progress
   - NO AI-Report on cards — article footers only
   - {N} Contestants + Tournament Deadline meta only
*/

function TournamentCard({ t, onOpen }) {
  return (
    <article className="tcard" onClick={onOpen}>
      <div className="tcard__cover" style={{
        background: `linear-gradient(135deg, ${t.coverA[0]}, ${t.coverA[1]} 60%, var(--color-bg-soft))`
      }}>
        <span className="tcard__cover-vs">48</span>
        <div className="tcard__chips">
          <span className="tcard__cat">{t.cat}</span>
          <StatusPill status={t.status} />
        </div>
      </div>
      <div className="tcard__body">
        <div className="tcard__title">{t.title}</div>
        <div className="tcard__meta">
          <span>{t.contestants} Contestants</span>
          <span className="sep">·</span>
          <span>Closes {t.deadline}</span>
        </div>
        <div className="tcard__foot">
          <button className="tcard__enter">ENTER <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="19" y2="12"></line><polyline points="13 6 19 12 13 18"></polyline></svg></button>
        </div>
      </div>
    </article>
  );
}

function Pitch({ setTab }) {
  const ts = window.WC_DATA.TOURNAMENTS;
  const featured = ts[0];
  const live = ts.filter(t => t.status === "active");
  const pub  = ts.filter(t => t.status === "published");

  return (
    <main className="container" style={{ flex: 1, paddingBottom: 64 }}>
      {/* Featured hero */}
      <section style={{
        marginTop: 32, position: "relative", overflow: "hidden",
        border: "1px solid var(--color-border)", borderRadius: 5,
        padding: 48, background: "var(--color-bg-default)",
        boxShadow: "var(--shadow-card)",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 50% 80% at 90% 50%, rgba(252,208,6,0.18), transparent 60%), radial-gradient(ellipse 40% 60% at 10% 80%, rgba(215,6,58,0.16), transparent 65%)",
        }}/>
        <div style={{ position: "relative", maxWidth: 720 }}>
          <div className="kicker">{featured.cat} · TOURNAMENT OF THE WEEK</div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 900,
            fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 1.02,
            letterSpacing: "-0.025em", margin: "12px 0 14px", color: "var(--color-text)",
          }}>{featured.title}</h1>
          <p style={{ fontSize: 16, color: "var(--color-text-sub)", lineHeight: 1.55, maxWidth: 560, marginBottom: 24 }}>
            48 Contestants. Five Rounds. The Fan advances Match by Match until one Crown remains.
          </p>
          <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
            <MagneticButton size="lg" onClick={() => setTab("arena")}>Pick Now</MagneticButton>
            <MagneticButton size="lg" variant="secondary">View Contestants</MagneticButton>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <StatusPill status={featured.status} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-sub)", letterSpacing: "0.06em" }}>
              48 Contestants · Closes {featured.deadline}
            </span>
          </div>
        </div>
      </section>

      <div className="section-head">
        <div>
          <div className="kicker">진행 중 · The Pitch</div>
          <h2 className="section-head__title">Active Tournaments</h2>
        </div>
        <span className="section-head__sub">{live.length} active · {pub.length} publishing soon</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {live.map(t => <TournamentCard key={t.id} t={t} onOpen={() => setTab("arena")} />)}
      </div>

      <div className="section-head">
        <div>
          <div className="kicker">대기 중 · Tuning</div>
          <h2 className="section-head__title">Publishing soon</h2>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {pub.map(t => <TournamentCard key={t.id} t={t} onOpen={() => setTab("arena")} />)}
      </div>
    </main>
  );
}

Object.assign(window, { Pitch, TournamentCard });
