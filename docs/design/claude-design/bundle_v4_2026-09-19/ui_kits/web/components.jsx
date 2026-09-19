/* Shared components — Nav, Footer, ArticleAIByline, etc.
   v2.3: AI-Report appears ONLY on the footer of a news article.
   Never on cards, banners, or boxes. */

const { useState, useEffect, useRef, useCallback } = React;

function Nav({ tab, setTab }) {
  const links = [
    { id: "pitch",  label: "Pitch" },
    { id: "arena",  label: "The Arena" },
    { id: "crown",  label: "Crown" },
    { id: "launch", label: "Launch Pad" },
  ];
  return (
    <div className="gnb-wrap">
      <nav className="gnb">
        <button className="gnb__brand" onClick={() => setTab("launch")}>
          <img src="../../assets/wc48-crown-filled.svg" alt="" />
          <span className="gnb__wm">WorldCrown48</span>
        </button>
        <div className="gnb__sep"></div>
        {links.map((l) => (
          <button
            key={l.id}
            className={`gnb__link ${tab === l.id ? "is-active" : ""}`}
            onClick={() => setTab(l.id)}
          >{l.label}</button>
        ))}
        <div className="gnb__sep"></div>
        <button className="gnb__cta" onClick={() => setTab("arena")}>Pick Now</button>
      </nav>
    </div>
  );
}

function MagneticButton({ children, variant = "primary", size, fullWidth, onClick, disabled, style }) {
  const ref = useRef(null);
  const [t, setT] = useState({ x: 0, y: 0 });

  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2)  * 0.06;
    const y = (e.clientY - r.top  - r.height / 2) * 0.06;
    setT({ x, y });
  };
  const reset = () => setT({ x: 0, y: 0 });

  const cls = ["btn"];
  if (variant === "secondary") cls.push("btn--secondary");
  if (variant === "ghost")     cls.push("btn--ghost");
  if (variant === "crimson")   cls.push("btn--crimson");
  if (size === "lg") cls.push("btn--lg");
  if (size === "xl") cls.push("btn--xl");

  return (
    <button
      ref={ref}
      className={cls.join(" ")}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{
        transform: `translate(${t.x}px, ${t.y}px)`,
        width: fullWidth ? "100%" : undefined,
        ...style,
      }}
    >{children}</button>
  );
}

function StatusPill({ status }) {
  if (status === "active")    return <span className="pill is-gold"><span className="dot"></span>active</span>;
  if (status === "published") return <span className="pill">published</span>;
  if (status === "draft")     return <span className="pill">draft</span>;
  if (status === "closed")    return <span className="pill is-warn"><span className="dot"></span>closed</span>;
  if (status === "completed") return <span className="pill is-ok"><span className="dot"></span>completed</span>;
  return null;
}

function ArticleAIByline({ timestamp }) {
  // ✦ AI-Report — ONLY allowed on the footer of a news article. Never on cards/banners/boxes.
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--color-gold)",
        borderTop: "1px solid rgba(252,208,6,0.2)",
        paddingTop: 8,
        letterSpacing: "0.18em",
      }}
    >
      ✦ AI-Report{timestamp ? ` · ${timestamp}` : ""}
    </span>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div className="container foot__row">
        <img src="../../assets/wc48-crown-circle-outline.svg" alt="" />
        <span>WorldCrown48 · 월크48</span>
        <span className="foot__sep">·</span>
        <span>worldcrown48.com</span>
        <span className="foot__sep">·</span>
        <span className="foot__status"><span className="dot"></span>SYSTEM OPERATIONAL</span>
        <span className="spacer-grow" style={{ flex: 1 }}></span>
        <span>© 2026 · v2.3 Twilight Stadium</span>
      </div>
    </footer>
  );
}

Object.assign(window, { Nav, MagneticButton, StatusPill, ArticleAIByline, Footer });
