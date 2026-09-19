/* WorldCrown48 DS — app shell: nav · hero · theme toggle · builder · toast */

const NAV = [
  { group: "Overview", items: [["overview", "Thesis"]] },
  { group: "Tokens", items: [["foundation", "Foundation"], ["brand", "Brand marks"]] },
  { group: "Library", items: [["components", "Components"], ["cinematic", "Cinematic"]] },
  { group: "Governance", items: [["rules", "Rules & terms"]] },
];

function useScrollSpy(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);
  return active;
}

function Builder({ open, onClose }) {
  const golds = ["#FCD006", "#FBB03B", "#EEDA7D", "#F4C430"];
  const [gold, setGold] = useState("#FCD006");
  const [radius, setRadius] = useState(5);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-gold", gold);
    root.style.setProperty("--radius-border", radius + "px");
    return () => { root.style.removeProperty("--color-gold"); root.style.removeProperty("--radius-border"); };
  }, [gold, radius]);
  if (!open) return null;
  return (
    <div style={{ position: "fixed", right: 22, bottom: 22, width: 268, background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-gold)", borderRadius: "var(--radius-border)", boxShadow: "var(--shadow-gnb)", padding: 18, zIndex: 50 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.18em", color: "var(--color-gold)" }}>BUILDER</span>
        <span onClick={onClose} style={{ cursor: "pointer", color: "var(--color-text-sub)", fontSize: 16, lineHeight: 1 }}>×</span>
      </div>
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-sub)", marginBottom: 8, letterSpacing: "0.06em" }}>POINT COLOR</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {golds.map((g) => (
          <button key={g} onClick={() => setGold(g)} title={g} style={{ width: 36, height: 36, borderRadius: "var(--radius-border)", background: g, border: gold === g ? "2px solid var(--color-text)" : "1px solid var(--color-border)", cursor: "pointer" }} />
        ))}
      </div>
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-sub)", marginBottom: 8, letterSpacing: "0.06em" }}>BORDER RADIUS · {radius}px</div>
      <input type="range" min="0" max="12" value={radius} onChange={(e) => setRadius(+e.target.value)} style={{ width: "100%", accentColor: "var(--color-gold)" }} />
      <p style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 14, lineHeight: 1.5 }}>Live-tweaks the angular radius and the single point color across the whole system.</p>
    </div>
  );
}

function Toast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let t;
    const h = (e) => { setMsg(e.detail); clearTimeout(t); t = setTimeout(() => setMsg(null), 1800); };
    window.addEventListener("ds-toast", h);
    return () => { window.removeEventListener("ds-toast", h); clearTimeout(t); };
  }, []);
  return <div className={"ds-toast" + (msg ? " is-show" : "")}>{msg}</div>;
}

function App() {
  const ids = ["overview", "foundation", "brand", "components", "cinematic", "rules"];
  const active = useScrollSpy(ids);
  const [theme, setTheme] = useState("dark");
  const [builder, setBuilder] = useState(false);
  const mainRef = useRef(null);

  const go = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };

  return (
    <div className="ds-app">
      <div className="wc-noise" />
      <nav className="ds-nav">
        <div className="ds-nav__brand">
          <img src="assets/wc48-crown-filled.svg" alt="" />
          <div className="ds-nav__wm"><b>WorldCrown48</b><span>DESIGN SYSTEM</span></div>
        </div>
        <span className="ds-nav__ver">v2.4 · Twilight Stadium</span>
        {NAV.map((g) => (
          <div className="ds-nav__group" key={g.group}>
            <div className="ds-nav__grouptitle">{g.group}</div>
            {g.items.map(([id, label]) => (
              <div key={id} className={"ds-nav__link" + (active === id ? " is-active" : "")} onClick={() => go(id)}>
                <span className="ds-nav__dot" />{label}
              </div>
            ))}
          </div>
        ))}
      </nav>

      <main className="ds-main" ref={mainRef} data-theme={theme === "light" ? "light" : undefined}>
        <div className="ds-topbar">
          <button className={"ds-toggle" + (builder ? " is-on" : "")} onClick={() => setBuilder((b) => !b)}>⚙ BUILDER</button>
          <button className="ds-toggle" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
            {theme === "dark" ? "◑ DARK" : "◐ LIGHT"}
          </button>
        </div>

        <div className="ds-main__inner">
          <section id="overview" className="ds-hero" data-screen-label="Thesis">
            <p className="ds-hero__kicker">WorldCrown48 · Integrated Design System · v2.4</p>
            <h1 className="ds-hero__title">Every screen should feel like a <em>digital instrument.</em></h1>
            <p className="ds-hero__lede">Twilight velvet, gold detail, measured percussive motion. One integrated system — foundations, brand, the production component kit, and the cinematic motion language — governed by the v2.4 contract. Fans decide; algorithms don't.</p>
            <div className="ds-hero__meta">
              <span className="pill is-gold"><span className="dot" />Crown Gold #FCD006</span>
              <span className="pill">Dark · Domain 0–3</span>
              <span className="pill">Light · Domain 4–6</span>
              <span className="pill is-aura">Korean + English</span>
            </div>
          </section>

          <SecFoundation />
          <SecBrand />
          <SecComponents />
          <SecCinematic />
          <SecRules />
        </div>
      </main>

      <Builder open={builder} onClose={() => setBuilder(false)} />
      <Toast />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
