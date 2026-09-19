/* WorldCrown48 DS — Cinematic: manifesto · interactive feature cards ·
   three-step archive. Built with React state/intervals (no GSAP dep).
   Conflict resolved in favor of the contract: the vote feed is labelled
   "VOTE FEED", never "LIVE" — WC48 does not live-stream. */

/* ── Card 1: Tournament Shuffler ── */
function TournamentShuffler() {
  const SAMPLE = [
    { label: "K-POP", title: "최고의 퍼포먼스 무대", count: "48 Contestants" },
    { label: "K-POP", title: "Idol of the Decade", count: "48 Contestants" },
    { label: "OTHER", title: "올해의 무대", count: "48 Contestants" },
  ];
  const [items, setItems] = useState(SAMPLE);
  useEffect(() => {
    const id = setInterval(() => setItems((p) => { const n = [...p]; n.unshift(n.pop()); return n; }), 3000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ position: "relative", height: 168 }}>
      {items.map((it, i) => (
        <div key={it.title} style={{
          position: "absolute", left: 0, right: 0, top: i * 16,
          transform: `scale(${1 - i * 0.05})`, opacity: 1 - i * 0.28, zIndex: 3 - i,
          background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-border)", padding: "16px 20px",
          transition: "all 600ms cubic-bezier(0.2,0.8,0.2,1)",
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--color-text-muted)", letterSpacing: "0.2em" }}>{it.label}</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 6, color: "var(--color-text)" }}>{it.title}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-gold)", marginTop: 4 }}>{it.count}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Card 2: Vote Feed Typewriter ── */
function VoteFeedTypewriter() {
  const MSGS = [
    "Fan #4,812 just picked 미나",
    "New tournament: Idol of the Decade",
    "Fans are making their voice heard",
    "ROUND OF 24 begins for a Fan",
    "Fan #7,301 claimed their Crown Card",
    "48 Contestants. One Crown.",
  ];
  const [txt, setTxt] = useState("");
  const [mi, setMi] = useState(0);
  const [ci, setCi] = useState(0);
  useEffect(() => {
    const cur = MSGS[mi];
    let t;
    if (ci < cur.length) { t = setTimeout(() => { setTxt(cur.slice(0, ci + 1)); setCi((c) => c + 1); }, 38); }
    else { t = setTimeout(() => { setMi((m) => (m + 1) % MSGS.length); setCi(0); setTxt(""); }, 2000); }
    return () => clearTimeout(t);
  }, [ci, mi]);
  return (
    <div style={{ padding: "20px 22px", background: "var(--color-bg-elevated)", borderRadius: "var(--radius-border)", border: "1px solid var(--color-border)", minHeight: 130 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-turquoise)" }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--color-text-muted)", letterSpacing: "0.22em" }}>VOTE FEED</span>
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--color-text)", lineHeight: 1.5 }}>
        {txt}<span style={{ display: "inline-block", width: 2, height: "1em", background: "var(--color-gold)", marginLeft: 2, verticalAlign: "text-bottom", animation: "wc-blink 1s step-end infinite" }} />
      </div>
    </div>
  );
}

/* ── Card 3: Match Scheduler (journey) ── */
function MatchScheduler() {
  const ROUNDS = [["ROUND OF 48", 24], ["ROUND OF 24", 12], ["ROUND OF 12", 6], ["ROUND OF 6", 3], ["THE FINAL", 1]];
  const [hot, setHot] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHot((h) => (h + 1) % ROUNDS.length), 1100);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ padding: "20px 22px", background: "var(--color-bg-elevated)", borderRadius: "var(--radius-border)", border: "1px solid var(--color-border)" }}>
      {ROUNDS.map(([name, m], i) => (
        <div key={name} style={{
          display: "flex", alignItems: "center", gap: 12, padding: "9px 13px", borderRadius: 6, marginBottom: 6,
          border: "1px solid " + (hot === i ? "rgba(252,208,6,0.5)" : "rgba(252,208,6,0.12)"),
          background: hot === i ? "rgba(252,208,6,0.14)" : "transparent", transition: "all 300ms ease",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: hot === i ? "var(--color-gold)" : "var(--color-text-muted)", transform: hot === i ? "scale(1.4)" : "scale(1)", transition: "all 300ms ease", flex: "none" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 13, color: "var(--color-text)", flex: 1, letterSpacing: "0.04em" }}>{name}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-sub)" }}>{m} {m === 1 ? "Match" : "Matches"}</span>
        </div>
      ))}
    </div>
  );
}

function SecCinematic() {
  const steps = [
    { num: "01", title: "Enter the Arena", desc: "48 Contestants. Your tournament. Your rules.", bg: "var(--color-bg-elevated)" },
    { num: "02", title: "Pick your Champion", desc: "One Match at a time. Pure fan choice.", bg: "var(--color-bg-deep)" },
    { num: "03", title: "Claim your Crown", desc: "Your Champion is crowned. Share your Crown Card with the world.", bg: "var(--color-bg-deep)" },
  ];
  return (
    <Section id="cinematic" num="04 — CINEMATIC" title="Cinematic patterns"
      desc="The motion language that keeps WC48 from reading as a flat AI template. Measured, percussive, theatrical — never cute. These are the Launch Pad and The Pitch signature moments.">

      <Block label="Manifesto">
        <div style={{ position: "relative", overflow: "hidden", background: "var(--color-bg-deep)", borderRadius: "var(--radius-border)", border: "1px solid var(--color-border)", padding: "72px 24px", textAlign: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(252,208,6,0.08), transparent 70%)" }} />
          <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 17, color: "var(--color-text-muted)", margin: 0 }}>Most platforms focus on</p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 21, color: "var(--color-text)", opacity: 0.6, marginTop: 8 }}>predicting the winner.</p>
            <div style={{ width: 60, height: 1, background: "var(--color-gold)", margin: "30px auto" }} />
            <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "clamp(36px,6vw,64px)", color: "var(--color-text)", margin: 0, lineHeight: 1.1 }}>We let fans</p>
            <p style={{ fontFamily: "var(--font-sans)", fontWeight: 900, fontSize: "clamp(52px,8vw,88px)", color: "var(--color-gold)", margin: "6px 0 0", letterSpacing: "-0.02em", lineHeight: 1 }}>DECIDE.</p>
          </div>
        </div>
      </Block>

      <Block label="Interactive feature cards" note="Three live micro-UIs for the Features section: Tournament Shuffler, Vote Feed Typewriter, Match Scheduler.">
        <div className="ds-grid ds-grid--3">
          <Stage className="stage--col" style={{ padding: 18 }}><TournamentShuffler /></Stage>
          <Stage className="stage--col" style={{ padding: 18 }}><VoteFeedTypewriter /></Stage>
          <Stage className="stage--col" style={{ padding: 18 }}><MatchScheduler /></Stage>
        </div>
      </Block>

      <Block label="Three-step archive" note="Launch → Vote → Crown. On the live site these pin and stack on scroll; here is the storytelling sequence.">
        <div className="ds-grid ds-grid--3">
          {steps.map((s) => (
            <div key={s.num} style={{ background: s.bg, border: "1px solid var(--color-border)", borderRadius: "var(--radius-border)", padding: "26px 22px", minHeight: 188, display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-gold)", letterSpacing: "0.3em", marginBottom: 18 }}>{s.num}</div>
              <h3 style={{ fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 22, color: "var(--color-text)", margin: "0 0 12px" }}>{s.title}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--color-text-sub)", margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </Block>
    </Section>
  );
}

window.SecCinematic = SecCinematic;
