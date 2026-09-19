/* WorldCrown48 DS — Foundation: color · type · spacing · radii · shadow · noise */

function SecFoundation() {
  const darkBg = [
    { fill: "#00001F", tag: "VOID", name: "Stadium Void", value: "#00001F", role: "Deepest layer · letterbox", tagColor: "#FCD006" },
    { fill: "#00003A", tag: "DEEP", name: "Deep Osidian", value: "#00003A", role: "Arena hero · section base" },
    { fill: "#0E0944", tag: "BG", name: "Deep Twilight", value: "#0E0944", role: "Default dark background" },
    { fill: "#241754", tag: "SOFT", name: "Twilight Soft", value: "#241754", role: "Cards · panels" },
    { fill: "#362261", tag: "ELEV", name: "Twilight Indigo", value: "#362261", role: "Modals · dropdowns" },
    { fill: "#1E1E24", tag: "GNB", name: "GNB Charcoal", value: "#1E1E24", role: "Floating Island GNB" },
  ];
  const gold = [
    { fill: "#FCD006", tag: "POINT", name: "Crown Gold", value: "#FCD006", role: "The only point color", tagColor: "#1A1205" },
    { fill: "#FBB03B", tag: "ACCENT", name: "Sunburst", value: "#FBB03B", role: "Warm accent", tagColor: "#1A1205" },
    { fill: "#E3BB05", tag: "HOVER", name: "Gold Hover", value: "#E3BB05", role: "CTA hover state", tagColor: "#1A1205" },
    { fill: "#EEDA7D", tag: "AURA", name: "Aura Yellow", value: "#EEDA7D", role: "Soft emphasis only", tagColor: "#1A1205" },
  ];
  const accent = [
    { fill: "#D7063A", tag: "STATE", name: "Royal Crimson", value: "#D7063A", role: "VS-right · error — never decorative" },
    { fill: "#00A3B7", tag: "STATE", name: "Turquoise", value: "#00A3B7", role: "VS-left · success · complete" },
    { fill: "#B1B5C4", tag: "TEXT", name: "Powder Blue", value: "#B1B5C4", role: "Secondary text", tagColor: "#1A1205" },
  ];
  const lightTheme = [
    { fill: "#F2F2F5", tag: "BG", name: "Light BG", value: "#F2F2F5", role: "Domain 4–6 page", tagColor: "#0E0944" },
    { fill: "#FFFFFF", tag: "SURFACE", name: "Surface", value: "#FFFFFF", role: "Cards on light", tagColor: "#0E0944" },
    { fill: "#0E0944", tag: "TEXT", name: "Text", value: "#0E0944", role: "Body text on light" },
    { fill: "#3A4570", tag: "SUB", name: "Text Sub", value: "#3A4570", role: "Secondary on light" },
    { fill: "#8C99B3", tag: "MUTED", name: "Text Muted", value: "#8C99B3", role: "Labels · placeholder (AA Large)", tagColor: "#0E0944" },
    { fill: "#D4DCE3", tag: "BORDER", name: "Border", value: "#D4DCE3", role: "Hairlines on light", tagColor: "#0E0944" },
  ];

  return (
    <Section id="foundation" num="01 — FOUNDATION" title="Foundation"
      desc="Color, type, spacing, radii and shadow. Every value below resolves from colors_and_type.css — the single source of truth. Click any swatch or token to copy.">

      <Block label="Dark theme · Domain 0–3 · Twilight Stadium" note={<>Pure black <span className="ds-inline-code">#000000</span> is banned. The darkest surface is Stadium Void <span className="ds-inline-code">#00001F</span>.</>}>
        <div className="ds-grid ds-grid--6">{darkBg.map((s, i) => <Swatch key={i} {...s} />)}</div>
      </Block>

      <Block label="Crown Gold + warm accents — the point color">
        <div className="ds-grid ds-grid--4">{gold.map((s, i) => <Swatch key={i} {...s} />)}</div>
      </Block>

      <Block label="State accents — never decorative" note="Crimson and Turquoise carry meaning only: VS sides, success, error. Never use them as background fills or brand flourish.">
        <div className="ds-grid ds-grid--3">{accent.map((s, i) => <Swatch key={i} {...s} />)}</div>
      </Block>

      <Block label="Light theme · Domain 4–6 · Locker Room · Policy · Admin" note="Never mix dark and light on a single screen. Gold remains the only point color across both themes.">
        <div className="ds-grid ds-grid--6">{lightTheme.map((s, i) => <Swatch key={i} {...s} />)}</div>
      </Block>

      {/* ── TYPE ── */}
      <Block label="Type — three families + Korean fallback">
        <Stage className="stage--col" cap="Specimens">
          <div style={{ width: "100%" }}>
            <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 900, fontSize: 52, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--text)" }}>Champion</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.18em", color: "var(--color-gold)", marginTop: 8 }}>PLAYFAIR DISPLAY · ITALIC · DISPLAY &amp; CHAMPION NAMES (LATIN ONLY)</div>
          </div>
          <div style={{ width: "100%", borderTop: "1px solid var(--color-border)", paddingTop: 20 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 30, letterSpacing: "-0.01em", color: "var(--text)" }}>Pick your Champion · 누가 왕관을 쓸까</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.18em", color: "var(--color-gold)", marginTop: 8 }}>INTER 800 · UI HEADINGS · PRETENDARD AUTO-RESOLVES KOREAN</div>
          </div>
          <div style={{ width: "100%", borderTop: "1px solid var(--color-border)", paddingTop: 20 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 16, lineHeight: 1.6, color: "var(--text-sub)" }}>Fans decide, not algorithms. 48 Contestants enter; one Crown is claimed. Body copy sets in Inter with Pretendard resolving Hangul at equal weight.</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.18em", color: "var(--color-gold)", marginTop: 8 }}>INTER 400/500 · BODY · 16/1.6</div>
          </div>
          <div style={{ width: "100%", borderTop: "1px solid var(--color-border)", paddingTop: 20 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 18, letterSpacing: "0.12em", color: "var(--text)" }}>ROUND OF 48 · 34.5% · VOTE RATE</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.18em", color: "var(--color-gold)", marginTop: 8 }}>JETBRAINS MONO · NUMERALS · TAGS · METADATA</div>
          </div>
        </Stage>
      </Block>

      {/* ── SPACING ── */}
      <Block label="Spacing — 8-grid" note="Scale tokens space-1 → space-32. Compose layouts on the grid; lean on flex/grid gap rather than per-element margins.">
        <Stage className="stage--col">
          {[["space-1", 4], ["space-2", 8], ["space-3", 12], ["space-4", 16], ["space-6", 24], ["space-8", 32], ["space-12", 48], ["space-16", 64], ["space-24", 96]].map(([t, v]) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-gold)", width: 96 }}>--{t}</div>
              <div style={{ height: 14, width: v, background: "var(--color-gold)", borderRadius: 2 }} />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-sub)" }}>{v}px</div>
            </div>
          ))}
        </Stage>
      </Block>

      {/* ── RADII ── */}
      <Block label="Radii — angular system, three values only" note={<>Nothing between. Rectangle <span className="ds-inline-code">0</span>, Border <span className="ds-inline-code">5px</span>, Pill <span className="ds-inline-code">999px</span>.</>}>
        <div className="ds-grid ds-grid--3">
          {[["Rectangle", "0", "0"], ["Border", "5px", "5px"], ["Pill / chip", "999px", "999px"]].map(([name, r, val]) => (
            <Stage key={name} className="stage--center" style={{ padding: 22 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ width: 96, height: 56, background: "var(--color-gold-subtle)", border: "1px solid var(--color-border-gold)", borderRadius: r }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{name}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-sub)" }}>{val}</div>
                </div>
              </div>
            </Stage>
          ))}
        </div>
      </Block>

      {/* ── SHADOWS ── */}
      <Block label="Shadow — colored elevation">
        <div className="ds-grid ds-grid--3">
          {[["--shadow-card", "var(--shadow-card)"], ["--shadow-gold", "var(--shadow-gold)"], ["--shadow-gnb", "var(--shadow-gnb)"], ["--shadow-crimson", "var(--shadow-crimson)"], ["--shadow-turquoise", "var(--shadow-turquoise)"], ["--shadow-light", "var(--shadow-light)"]].map(([name, val]) => (
            <Stage key={name} className="stage--center stage--deep" style={{ padding: 30 }}>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <div style={{ width: 92, height: 60, background: "var(--color-bg-soft)", borderRadius: "var(--radius-border)", boxShadow: val, border: "1px solid var(--color-border)" }} />
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--color-gold)" }}>{name}</div>
              </div>
            </Stage>
          ))}
        </div>
      </Block>

      {/* ── TOKENS TABLE ── */}
      <Block label="Token reference">
        <SpecTable rows={[
          { token: "--font-sans", value: "Inter · Pretendard", desc: "UI · body · headings" },
          { token: "--font-display", value: "Playfair Display", desc: "Italic display · Champion names (Latin)" },
          { token: "--font-mono", value: "JetBrains Mono", desc: "Numerals · tags · metadata" },
          { token: "--radius-border", value: "5px", desc: "Default surface radius" },
          { token: "--color-gold", value: "#FCD006", desc: "The only point color" },
          { token: "--shadow-gold", value: "0 0 32px …", desc: "CTA glow" },
        ]} />
      </Block>
    </Section>
  );
}

window.SecFoundation = SecFoundation;
