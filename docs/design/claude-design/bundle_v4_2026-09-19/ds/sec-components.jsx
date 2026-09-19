/* WorldCrown48 DS — Components: buttons · status pills · TournamentCard ·
   VS Battle (interactive) · Crown Card · Floating Island GNB · forms ·
   AI-Report footer (the single allowed AI surface). */

function StatusPill({ status }) {
  const map = {
    draft: { c: "", label: "draft" },
    published: { c: "", label: "published" },
    active: { c: "is-gold", label: "active", dot: true },
    closed: { c: "is-crimson", label: "closed" },
    completed: { c: "is-turq", label: "completed" },
  };
  const s = map[status] || map.draft;
  return <span className={"pill " + s.c}>{s.dot ? <span className="dot" /> : null}{s.label}</span>;
}

/* ── Tournament card (The Pitch) ── */
function TournamentCard({ cat, title, count, deadline, status }) {
  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-border)", overflow: "hidden", background: "var(--color-bg-soft)", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 116, background: "linear-gradient(135deg, rgba(252,208,6,0.18), rgba(54,34,97,0.6))", position: "relative", display: "flex", alignItems: "flex-end", padding: 12 }}>
        <span className="pill is-aura" style={{ fontSize: 9.5, padding: "3px 9px" }}>{cat}</span>
      </div>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", lineHeight: 1.2 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-sub)", letterSpacing: "0.04em" }}>
          {count} Contestants <span style={{ opacity: 0.4 }}>·</span> Closes {deadline}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
          <StatusPill status={status} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-gold)", letterSpacing: "0.06em" }}>ENTER →</span>
        </div>
      </div>
    </div>
  );
}

/* ── VS Battle (interactive) — mirrors preview/43-vs-battle.html ── */
function VSBattle() {
  const [won, setWon] = useState(null);
  const left = { name: "슬기", meta: "KR · VOCAL · MAIN", initial: "SG", short: "슬기", tint: "0,163,183" };
  const right = { name: "미나", meta: "JP · DANCE · MAIN", initial: "MN", short: "미나", tint: "215,6,58" };

  const Card = ({ side, data }) => {
    const isWon = won === side;
    const isLost = won && won !== side;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: isLost ? 0.45 : 1, transform: isWon ? "scale(1.03)" : "scale(1)", transition: "all 220ms cubic-bezier(0.2,0.8,0.2,1)" }}>
        <div style={{
          aspectRatio: "4 / 5", borderRadius: "var(--radius-border)", display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 900, fontSize: 52,
          background: `linear-gradient(180deg, rgba(${data.tint},0.28), rgba(36,23,84,0.65))`,
          border: isWon ? "2px solid var(--color-gold)" : `1px solid rgba(${data.tint},0.45)`,
          color: `rgb(${data.tint})`,
          boxShadow: isWon ? "var(--shadow-gold)" : "none",
        }}>{data.initial}</div>
        <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.015em", color: "var(--color-text)", textAlign: side === "right" ? "right" : "left" }}>{data.name}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-sub)", letterSpacing: "0.1em", textAlign: side === "right" ? "right" : "left" }}>{data.meta}</div>
        {!won ? (
          <button onClick={() => setWon(side)} style={{
            marginTop: 4, minHeight: 44, padding: "9px 14px", border: 0, borderRadius: "var(--radius-border)", cursor: "pointer",
            fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13, display: "flex", flexDirection: "column", textAlign: "left",
            background: side === "left" ? "var(--color-turquoise)" : "var(--color-crimson)",
            color: side === "left" ? "#00181B" : "#fff",
            boxShadow: side === "left" ? "var(--shadow-turquoise)" : "none",
          }}>
            <small style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", opacity: 0.85, fontWeight: 600 }}>PICK {side.toUpperCase()}</small>
            <span style={{ marginTop: 2 }}>{data.short}</span>
          </button>
        ) : (
          <div style={{ marginTop: 4, minHeight: 44, display: "flex", alignItems: "center", justifyContent: side === "right" ? "flex-end" : "flex-start", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.16em", color: isWon ? "var(--color-gold)" : "var(--color-text-muted)" }}>
            {isWon ? "✓ CROWNED" : ""}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ position: "relative", overflow: "hidden", border: "1px solid var(--color-border)", borderRadius: "var(--radius-border)", background: "var(--color-bg-default)", padding: "20px 22px" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 50% 60% at 12% 50%, rgba(0,163,183,0.20), transparent 55%), radial-gradient(ellipse 50% 60% at 88% 50%, rgba(215,6,58,0.20), transparent 55%)" }} />
      <div style={{ position: "relative", textAlign: "center", marginBottom: 22 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 700, fontSize: 19, lineHeight: 1, color: "var(--color-gold)", marginBottom: 10 }}>
          <span style={{ width: 26, height: 1, background: "linear-gradient(90deg, transparent, var(--color-gold))" }} />
          The Arena
          <span style={{ width: 26, height: 1, background: "linear-gradient(90deg, var(--color-gold), transparent)" }} />
        </div>
        <h2 style={{ fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 32, lineHeight: 1.04, letterSpacing: "-0.02em", color: "var(--color-text)", margin: 0 }}>최고의 퍼포먼스 무대
          <span style={{ display: "block", marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, letterSpacing: "0.28em", color: "var(--color-text-sub)" }}>2026</span>
        </h2>
      </div>
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "center" }}>
        <Card side="left" data={left} />
        <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 900, fontSize: 66, lineHeight: 1, color: "var(--color-gold)", textShadow: "0 2px 18px rgba(252,208,6,0.45)" }}>vs</div>
        <Card side="right" data={right} />
      </div>
      {won ? (
        <div style={{ position: "relative", textAlign: "center", marginTop: 18 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-gold)", letterSpacing: "0.06em" }}>Crown cast — the system advances to the next Match. </span>
          <button onClick={() => setWon(null)} style={{ background: "none", border: 0, color: "var(--color-text-sub)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em", textDecoration: "underline", cursor: "pointer" }}>reset</button>
        </div>
      ) : null}
    </div>
  );
}

/* ── Crown Card (Instagram Story share artifact) ── */
function CrownCard() {
  return (
    <div style={{ aspectRatio: "1080/1920", height: 440, margin: "0 auto", background: "var(--color-bg-deep)", border: "2px solid var(--color-gold)", borderRadius: 6, position: "relative", overflow: "hidden", boxShadow: "var(--shadow-gold)" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(252,208,6,0.30), rgba(36,23,84,0.78))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 900, fontSize: 96, color: "var(--color-gold)", paddingBottom: "22%" }}>MN</div>
      <div style={{ position: "absolute", top: "5%", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", width: 110, height: 110, borderRadius: "50%", background: "radial-gradient(circle, rgba(252,208,6,0.5) 0%, transparent 70%)" }} />
          <img src="assets/wc48-crown-filled.svg" style={{ position: "relative", width: 56, height: 56, filter: "drop-shadow(0 0 12px rgba(252,208,6,0.9))" }} alt="" />
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.3em", color: "var(--color-gold)" }}>WORLDCROWN48 · CHAMPION</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "24% 8% 7%", textAlign: "center", background: "linear-gradient(180deg, transparent, rgba(0,0,58,0.6) 42%, rgba(0,0,58,0.94))" }}>
        <div style={{ fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 38, color: "var(--color-gold)", lineHeight: 1.05, letterSpacing: "-0.02em" }}>미나</div>
        <div style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 11, color: "#F2F2F5", marginTop: "4%" }}>최고의 퍼포먼스 무대 · 2026</div>
      </div>
    </div>
  );
}

/* ── Floating Island GNB ── */
function GNBIsland() {
  const [active, setActive] = useState("Pitch");
  const links = ["Pitch", "Arena", "Newsroom"];
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "5px 8px", background: "var(--color-bg-elevated)", border: "1px solid rgba(252,208,6,0.16)", borderRadius: "var(--radius-border)", boxShadow: "var(--shadow-gnb)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 10px" }}>
        <img src="assets/wc48-crown-filled.svg" style={{ width: 17, height: 17 }} alt="" />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.14em", color: "var(--color-gold)", fontWeight: 700 }}>WorldCrown48</span>
      </div>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
      {links.map((l) => (
        <span key={l} onClick={() => setActive(l)}
          style={{ padding: "4px 12px", borderRadius: "var(--radius-border)", fontSize: 13, fontWeight: 500, cursor: "pointer", color: active === l ? "var(--color-gold)" : "var(--color-text-sub)", background: active === l ? "var(--color-gold-subtle)" : "transparent" }}>
          {l}
        </span>
      ))}
      <button className="btn btn--gold btn--sm" style={{ marginLeft: 4 }}>Sign in</button>
    </div>
  );
}

function SecComponents() {
  return (
    <Section id="components" num="03 — COMPONENTS" title="Components"
      desc="The production kit. Buttons are magnetic, the GNB is a Floating Island, and the VS Battle is the heart of the Arena. Every component obeys the contract — no LIVE, no Round HUD, no Vote Rate during voting, no AI-Report on cards.">

      <Block label="Buttons — magnetic" note="Hover to feel the cursor-tracking pull. Gold is primary; ghost and quiet are secondary. Hit target ≥ 44px.">
        <Stage cap="Hover me">
          <MagneticButton variant="gold" size="lg">Pick Now</MagneticButton>
          <MagneticButton variant="ghost">Explore Tournaments</MagneticButton>
          <MagneticButton variant="quiet" size="sm">Learn more</MagneticButton>
        </Stage>
      </Block>

      <Block label="Status pills — the only Tournament states" note={<>Use one of five: <span className="ds-inline-code">draft · published · active · closed · completed</span>. Never <span className="ds-inline-code">In Progress</span>. Never a LIVE pill — WC48 does not live-stream.</>}>
        <Stage>
          <StatusPill status="draft" />
          <StatusPill status="published" />
          <StatusPill status="active" />
          <StatusPill status="closed" />
          <StatusPill status="completed" />
          <span className="pill is-aura">K-POP</span>
          <span className="pill is-aura">OTHER</span>
        </Stage>
      </Block>

      <Block label="Tournament card · The Pitch" note="Category · title · {N} Contestants · Tournament Deadline · status. No Round progress, no vote count, no LIVE, no AI-Report.">
        <div className="ds-grid ds-grid--3">
          <TournamentCard cat="K-POP" title="최고의 퍼포먼스 무대" count="48" deadline="May 31" status="active" />
          <TournamentCard cat="K-POP" title="Idol of the Decade" count="48" deadline="Jun 14" status="published" />
          <TournamentCard cat="OTHER" title="올해의 무대" count="48" deadline="Jun 30" status="completed" />
        </div>
      </Block>

      <Block label="VS Battle · The Arena — interactive" note="Pick a Contestant. The system advances to the next Match automatically. No Round/Match HUD, no timer, no Vote Rate, no timestamp — the Voter is a player, not a spectator.">
        <VSBattle />
      </Block>

      <div className="ds-grid ds-grid--2" style={{ marginTop: 44, alignItems: "start" }}>
        <Block label="Crown Card · share artifact">
          <CrownCard />
        </Block>
        <div>
          <Block label="Floating Island GNB">
            <Stage className="stage--center stage--deep">
              <GNBIsland />
            </Stage>
          </Block>
          <Block label="Form controls">
            <Stage className="stage--col">
              <input placeholder="you@email.com" style={{ width: "100%", padding: "12px 14px", background: "var(--color-bg-default)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-border)", color: "var(--color-text)", fontFamily: "var(--font-sans)", fontSize: 14 }} />
              <div style={{ display: "flex", gap: 10, width: "100%" }}>
                <MagneticButton variant="gold" style={{ flex: 1 }}>Join the waitlist</MagneticButton>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--color-text-sub)" }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, border: "1px solid var(--color-border-gold)", background: "var(--color-gold-subtle)", display: "inline-block" }} />
                I accept the Policy Hub terms
              </label>
            </Stage>
          </Block>
        </div>
      </div>

      <Block label="AI-Report — the single allowed surface" note="✦ AI-Report appears only as the footer of a news article (12px gold mono). It never appears on a card, banner, box, or list item. “AI GENERATED” and the old ● AI-Report card byline are permanently retired.">
        <Stage className="stage--col" style={{ background: "var(--color-bg-default)" }}>
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--color-text)", lineHeight: 1.25 }}>Fan sentiment surges as the 24강 bracket tightens</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--color-text-sub)", marginTop: 12 }}>Across the past day, fan momentum shifted decisively toward the top seed, with the gap widening to a commanding margin. Fans are making their voice heard across every region.</p>
            <span className="ai-report-footer">✦ AI-Report</span>
          </div>
        </Stage>
      </Block>
    </Section>
  );
}

window.SecComponents = SecComponents;
