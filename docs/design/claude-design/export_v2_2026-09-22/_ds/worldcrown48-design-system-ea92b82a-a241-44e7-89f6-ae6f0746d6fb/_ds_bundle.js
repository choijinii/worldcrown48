/* @ds-bundle: {"format":4,"namespace":"WorldCrown48DesignSystem_ea92b8","components":[{"name":"AIReportFooter","sourcePath":"components/AIReportFooter/AIReportFooter.jsx"},{"name":"Button","sourcePath":"components/Button/Button.jsx"},{"name":"StatusPill","sourcePath":"components/StatusPill/StatusPill.jsx"},{"name":"TournamentCard","sourcePath":"components/TournamentCard/TournamentCard.jsx"},{"name":"VSBattle","sourcePath":"components/VSBattle/VSBattle.jsx"}],"sourceHashes":{"components/AIReportFooter/AIReportFooter.jsx":"5ecd21d9b5d8","components/Button/Button.jsx":"c39d3446b1fe","components/StatusPill/StatusPill.jsx":"74bee5be0d33","components/TournamentCard/TournamentCard.jsx":"d04e99abd10c","components/VSBattle/VSBattle.jsx":"0985e922728e","ds/app.jsx":"ed1c5e1061a2","ds/sec-brand.jsx":"37c32dfec61a","ds/sec-cinematic.jsx":"3104e5fb47b7","ds/sec-components.jsx":"124a0ae8397d","ds/sec-foundation.jsx":"7cf3d6d003db","ds/sec-rules.jsx":"e3e55d028880","ds/widgets.jsx":"42aa4203d3e0","ui_kits/web/App.jsx":"b820510db793","ui_kits/web/Arena.jsx":"19dcfa1485ff","ui_kits/web/CrownReveal.jsx":"362fb36d2ba2","ui_kits/web/LaunchPad.jsx":"8faaa67dd379","ui_kits/web/Pitch.jsx":"84ff54fa3bcd","ui_kits/web/components.jsx":"9b301c45f97b","ui_kits/web/data.jsx":"5207a54b74c2"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.WorldCrown48DesignSystem_ea92b8 = window.WorldCrown48DesignSystem_ea92b8 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/AIReportFooter/AIReportFooter.jsx
try { (() => {
function AIReportFooter({
  timestamp
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--color-gold)",
      borderTop: "1px solid rgba(252,208,6,0.2)",
      paddingTop: 8,
      marginTop: 16,
      letterSpacing: "0.04em"
    }
  }, "\u2726 AI-Report", timestamp ? " · " + timestamp : "");
}
Object.assign(__ds_scope, { AIReportFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/AIReportFooter/AIReportFooter.jsx", error: String((e && e.message) || e) }); }

// components/Button/Button.jsx
try { (() => {
function Button({
  children,
  variant = "gold",
  size = "md",
  onClick,
  style
}) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    fontFamily: "var(--font-sans)",
    fontWeight: 700,
    letterSpacing: "0.01em",
    borderRadius: "var(--radius-border)",
    border: "1px solid transparent",
    cursor: "pointer",
    transition: "background 160ms ease, box-shadow 200ms ease"
  };
  const sizes = {
    sm: {
      padding: "8px 14px",
      fontSize: 12.5,
      minHeight: 36
    },
    md: {
      padding: "12px 22px",
      fontSize: 14,
      minHeight: 44
    },
    lg: {
      padding: "15px 30px",
      fontSize: 15,
      minHeight: 48
    }
  };
  const variants = {
    gold: {
      background: "var(--color-gold)",
      color: "#1A1205"
    },
    ghost: {
      background: "transparent",
      color: "var(--color-text)",
      borderColor: "var(--color-border-gold)"
    },
    quiet: {
      background: "var(--color-bg-elevated)",
      color: "var(--color-text)",
      borderColor: "var(--color-border)"
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      ...base,
      ...sizes[size],
      ...variants[variant],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Button/Button.jsx", error: String((e && e.message) || e) }); }

// components/StatusPill/StatusPill.jsx
try { (() => {
function StatusPill({
  status = "active"
}) {
  const map = {
    draft: {
      color: "var(--color-text-sub)",
      border: "var(--color-border)",
      bg: "var(--color-bg-soft)"
    },
    published: {
      color: "var(--color-text-sub)",
      border: "var(--color-border)",
      bg: "var(--color-bg-soft)"
    },
    active: {
      color: "var(--color-gold)",
      border: "var(--color-border-gold)",
      bg: "var(--color-gold-subtle)",
      dot: true
    },
    closed: {
      color: "var(--color-crimson)",
      border: "rgba(215,6,58,0.4)",
      bg: "rgba(215,6,58,0.08)"
    },
    completed: {
      color: "var(--color-turquoise)",
      border: "rgba(0,163,183,0.4)",
      bg: "rgba(0,163,183,0.08)"
    }
  };
  const s = map[status] || map.draft;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 11px",
      borderRadius: "var(--radius-chip)",
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      letterSpacing: "0.14em",
      fontWeight: 600,
      textTransform: "uppercase",
      color: s.color,
      border: "1px solid " + s.border,
      background: s.bg
    }
  }, s.dot ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "currentColor"
    }
  }) : null, status);
}
Object.assign(__ds_scope, { StatusPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/StatusPill/StatusPill.jsx", error: String((e && e.message) || e) }); }

// components/TournamentCard/TournamentCard.jsx
try { (() => {
function TournamentCard({
  category = "K-POP",
  title,
  contestants = 48,
  deadline,
  status = "active",
  cover
}) {
  return /*#__PURE__*/React.createElement("article", {
    style: {
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-border)",
      overflow: "hidden",
      background: "var(--color-bg-default)",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 130,
      position: "relative",
      overflow: "hidden",
      background: cover || "linear-gradient(135deg, rgba(0,163,183,0.20), rgba(238,218,125,0.10) 60%, var(--color-bg-soft))"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: 14,
      bottom: 4,
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontWeight: 900,
      fontSize: 84,
      lineHeight: 0.8,
      color: "rgba(255,255,255,0.06)"
    }
  }, "48"), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 10,
      left: 10,
      padding: "3px 8px",
      background: "rgba(0,0,0,0.4)",
      border: "1px solid var(--color-border-gold)",
      color: "var(--color-gold)",
      borderRadius: "var(--radius-border)",
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      letterSpacing: "0.22em",
      fontWeight: 600
    }
  }, category)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 16px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      lineHeight: 1.25,
      letterSpacing: "-0.01em",
      color: "var(--color-text)"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--color-text-sub)"
    }
  }, /*#__PURE__*/React.createElement("span", null, contestants, " Contestants"), /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.3
    }
  }, "\xB7"), /*#__PURE__*/React.createElement("span", null, "Closes ", deadline)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.StatusPill, {
    status: status
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      letterSpacing: "0.18em",
      fontWeight: 700,
      color: "var(--color-gold)"
    }
  }, "ENTER \u2192"))));
}
Object.assign(__ds_scope, { TournamentCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/TournamentCard/TournamentCard.jsx", error: String((e && e.message) || e) }); }

// components/VSBattle/VSBattle.jsx
try { (() => {
function VSBattle({
  tournament = "최고의 퍼포먼스 무대",
  year = "2026",
  left,
  right,
  onVote
}) {
  const L = left || {
    name: "슬기",
    meta: "KR · VOCAL · MAIN",
    initial: "SG",
    tint: "0,163,183"
  };
  const R = right || {
    name: "미나",
    meta: "JP · DANCE · MAIN",
    initial: "MN",
    tint: "215,6,58"
  };
  const Side = ({
    side,
    data
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: "4 / 5",
      borderRadius: "var(--radius-border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontWeight: 900,
      fontSize: 52,
      background: "linear-gradient(180deg, rgba(" + data.tint + ",0.28), rgba(36,23,84,0.65))",
      border: "1px solid rgba(" + data.tint + ",0.45)",
      color: "rgb(" + data.tint + ")"
    }
  }, data.initial), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: 17,
      color: "var(--color-text)",
      textAlign: side === "right" ? "right" : "left"
    }
  }, data.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      color: "var(--color-text-sub)",
      letterSpacing: "0.1em",
      textAlign: side === "right" ? "right" : "left"
    }
  }, data.meta), /*#__PURE__*/React.createElement("button", {
    onClick: () => onVote && onVote(side),
    style: {
      marginTop: 4,
      minHeight: 44,
      padding: "9px 14px",
      border: 0,
      cursor: "pointer",
      borderRadius: "var(--radius-border)",
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: 13,
      display: "flex",
      flexDirection: "column",
      textAlign: "left",
      background: side === "left" ? "var(--color-turquoise)" : "var(--color-crimson)",
      color: side === "left" ? "#00181B" : "#fff"
    }
  }, /*#__PURE__*/React.createElement("small", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      letterSpacing: "0.2em",
      opacity: 0.85,
      fontWeight: 600
    }
  }, "VOTE ", side.toUpperCase()), /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 2
    }
  }, data.name)));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      overflow: "hidden",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-border)",
      background: "var(--color-bg-default)",
      padding: "20px 22px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background: "radial-gradient(ellipse 50% 60% at 12% 50%, rgba(0,163,183,0.20), transparent 55%), radial-gradient(ellipse 50% 60% at 88% 50%, rgba(215,6,58,0.20), transparent 55%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      textAlign: "center",
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontWeight: 700,
      fontSize: 19,
      color: "var(--color-gold)",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 1,
      background: "linear-gradient(90deg, transparent, var(--color-gold))"
    }
  }), "The Arena", /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 1,
      background: "linear-gradient(90deg, var(--color-gold), transparent)"
    }
  })), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 800,
      fontSize: 32,
      lineHeight: 1.04,
      letterSpacing: "-0.02em",
      color: "var(--color-text)",
      margin: 0
    }
  }, tournament, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      marginTop: 8,
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: "0.28em",
      color: "var(--color-text-sub)"
    }
  }, year))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "grid",
      gridTemplateColumns: "1fr auto 1fr",
      gap: 16,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Side, {
    side: "left",
    data: L
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontWeight: 900,
      fontSize: 66,
      lineHeight: 1,
      color: "var(--color-gold)",
      textShadow: "0 2px 18px rgba(252,208,6,0.45)"
    }
  }, "vs"), /*#__PURE__*/React.createElement(Side, {
    side: "right",
    data: R
  })));
}
Object.assign(__ds_scope, { VSBattle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/VSBattle/VSBattle.jsx", error: String((e && e.message) || e) }); }

// ds/app.jsx
try { (() => {
/* WorldCrown48 DS — app shell: nav · hero · theme toggle · builder · toast */

const NAV = [{
  group: "Overview",
  items: [["overview", "Thesis"]]
}, {
  group: "Tokens",
  items: [["foundation", "Foundation"], ["brand", "Brand marks"]]
}, {
  group: "Library",
  items: [["components", "Components"], ["cinematic", "Cinematic"]]
}, {
  group: "Governance",
  items: [["rules", "Rules & terms"]]
}];
function useScrollSpy(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setActive(e.target.id);
      });
    }, {
      rootMargin: "-45% 0px -50% 0px"
    });
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);
  return active;
}
function Builder({
  open,
  onClose
}) {
  const golds = ["#FCD006", "#FBB03B", "#EEDA7D", "#F4C430"];
  const [gold, setGold] = useState("#FCD006");
  const [radius, setRadius] = useState(5);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-gold", gold);
    root.style.setProperty("--radius-border", radius + "px");
    return () => {
      root.style.removeProperty("--color-gold");
      root.style.removeProperty("--radius-border");
    };
  }, [gold, radius]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      right: 22,
      bottom: 22,
      width: 268,
      background: "var(--color-bg-elevated)",
      border: "1px solid var(--color-border-gold)",
      borderRadius: "var(--radius-border)",
      boxShadow: "var(--shadow-gnb)",
      padding: 18,
      zIndex: 50
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      letterSpacing: "0.18em",
      color: "var(--color-gold)"
    }
  }, "BUILDER"), /*#__PURE__*/React.createElement("span", {
    onClick: onClose,
    style: {
      cursor: "pointer",
      color: "var(--color-text-sub)",
      fontSize: 16,
      lineHeight: 1
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: "var(--font-mono)",
      color: "var(--color-text-sub)",
      marginBottom: 8,
      letterSpacing: "0.06em"
    }
  }, "POINT COLOR"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 18
    }
  }, golds.map(g => /*#__PURE__*/React.createElement("button", {
    key: g,
    onClick: () => setGold(g),
    title: g,
    style: {
      width: 36,
      height: 36,
      borderRadius: "var(--radius-border)",
      background: g,
      border: gold === g ? "2px solid var(--color-text)" : "1px solid var(--color-border)",
      cursor: "pointer"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: "var(--font-mono)",
      color: "var(--color-text-sub)",
      marginBottom: 8,
      letterSpacing: "0.06em"
    }
  }, "BORDER RADIUS \xB7 ", radius, "px"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "12",
    value: radius,
    onChange: e => setRadius(+e.target.value),
    style: {
      width: "100%",
      accentColor: "var(--color-gold)"
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10.5,
      color: "var(--color-text-muted)",
      marginTop: 14,
      lineHeight: 1.5
    }
  }, "Live-tweaks the angular radius and the single point color across the whole system."));
}
function Toast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let t;
    const h = e => {
      setMsg(e.detail);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 1800);
    };
    window.addEventListener("ds-toast", h);
    return () => {
      window.removeEventListener("ds-toast", h);
      clearTimeout(t);
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "ds-toast" + (msg ? " is-show" : "")
  }, msg);
}
function App() {
  const ids = ["overview", "foundation", "brand", "components", "cinematic", "rules"];
  const active = useScrollSpy(ids);
  const [theme, setTheme] = useState("dark");
  const [builder, setBuilder] = useState(false);
  const mainRef = useRef(null);
  const go = id => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "ds-app"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wc-noise"
  }), /*#__PURE__*/React.createElement("nav", {
    className: "ds-nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-nav__brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/wc48-crown-filled.svg",
    alt: ""
  }), /*#__PURE__*/React.createElement("div", {
    className: "ds-nav__wm"
  }, /*#__PURE__*/React.createElement("b", null, "WorldCrown48"), /*#__PURE__*/React.createElement("span", null, "DESIGN SYSTEM"))), /*#__PURE__*/React.createElement("span", {
    className: "ds-nav__ver"
  }, "v2.4 \xB7 Twilight Stadium"), NAV.map(g => /*#__PURE__*/React.createElement("div", {
    className: "ds-nav__group",
    key: g.group
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-nav__grouptitle"
  }, g.group), g.items.map(([id, label]) => /*#__PURE__*/React.createElement("div", {
    key: id,
    className: "ds-nav__link" + (active === id ? " is-active" : ""),
    onClick: () => go(id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "ds-nav__dot"
  }), label))))), /*#__PURE__*/React.createElement("main", {
    className: "ds-main",
    ref: mainRef,
    "data-theme": theme === "light" ? "light" : undefined
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-topbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ds-toggle" + (builder ? " is-on" : ""),
    onClick: () => setBuilder(b => !b)
  }, "\u2699 BUILDER"), /*#__PURE__*/React.createElement("button", {
    className: "ds-toggle",
    onClick: () => setTheme(t => t === "dark" ? "light" : "dark")
  }, theme === "dark" ? "◑ DARK" : "◐ LIGHT")), /*#__PURE__*/React.createElement("div", {
    className: "ds-main__inner"
  }, /*#__PURE__*/React.createElement("section", {
    id: "overview",
    className: "ds-hero",
    "data-screen-label": "Thesis"
  }, /*#__PURE__*/React.createElement("p", {
    className: "ds-hero__kicker"
  }, "WorldCrown48 \xB7 Integrated Design System \xB7 v2.4"), /*#__PURE__*/React.createElement("h1", {
    className: "ds-hero__title"
  }, "Every screen should feel like a ", /*#__PURE__*/React.createElement("em", null, "digital instrument.")), /*#__PURE__*/React.createElement("p", {
    className: "ds-hero__lede"
  }, "Twilight velvet, gold detail, measured percussive motion. One integrated system \u2014 foundations, brand, the production component kit, and the cinematic motion language \u2014 governed by the v2.4 contract. Fans decide; algorithms don't."), /*#__PURE__*/React.createElement("div", {
    className: "ds-hero__meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pill is-gold"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Crown Gold #FCD006"), /*#__PURE__*/React.createElement("span", {
    className: "pill"
  }, "Dark \xB7 Domain 0\u20133"), /*#__PURE__*/React.createElement("span", {
    className: "pill"
  }, "Light \xB7 Domain 4\u20136"), /*#__PURE__*/React.createElement("span", {
    className: "pill is-aura"
  }, "Korean + English"))), /*#__PURE__*/React.createElement(SecFoundation, null), /*#__PURE__*/React.createElement(SecBrand, null), /*#__PURE__*/React.createElement(SecComponents, null), /*#__PURE__*/React.createElement(SecCinematic, null), /*#__PURE__*/React.createElement(SecRules, null))), /*#__PURE__*/React.createElement(Builder, {
    open: builder,
    onClose: () => setBuilder(false)
  }), /*#__PURE__*/React.createElement(Toast, null));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds/app.jsx", error: String((e && e.message) || e) }); }

// ds/sec-brand.jsx
try { (() => {
/* WorldCrown48 DS — Brand: crown marks · wordmark · lockups */

function SecBrand() {
  const crowns = [{
    src: "assets/wc48-crown-filled.svg",
    name: "Crown · Filled",
    file: "wc48-crown-filled.svg",
    bg: "var(--color-bg-deep)"
  }, {
    src: "assets/wc48-crown-outline.svg",
    name: "Crown · Outline",
    file: "wc48-crown-outline.svg",
    bg: "var(--color-bg-deep)"
  }, {
    src: "assets/wc48-crown-circle-filled.svg",
    name: "Circle · Filled",
    file: "wc48-crown-circle-filled.svg",
    bg: "#FFFFFF"
  }, {
    src: "assets/wc48-crown-circle-outline.svg",
    name: "Circle · Outline",
    file: "wc48-crown-circle-outline.svg",
    bg: "#FFFFFF"
  }];
  return /*#__PURE__*/React.createElement(Section, {
    id: "brand",
    num: "02 \u2014 BRAND",
    title: "Brand marks",
    desc: "Only registered SVG assets may represent the brand. Never redraw the crown. File names encode the background they sit on \u2014 \u201C-dark\u201D marks go on dark surfaces (light ink), \u201C-light\u201D marks go on light surfaces (dark ink)."
  }, /*#__PURE__*/React.createElement(Block, {
    label: "Crown \u2014 four marks"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-grid ds-grid--4"
  }, crowns.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.file,
    className: "sw",
    onClick: () => copyText(c.file, "Asset"),
    style: {
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__fill",
    style: {
      background: c.bg,
      height: 130,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 22
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: c.src,
    alt: c.name,
    style: {
      maxHeight: "100%",
      maxWidth: "100%"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "sw__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__name"
  }, c.name), /*#__PURE__*/React.createElement("div", {
    className: "sw__meta"
  }, c.file)))))), /*#__PURE__*/React.createElement(Block, {
    label: "Wordmark \u2014 \u201CWorldCrown48\u201D \xB7 both palettes"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-grid ds-grid--2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw",
    style: {
      cursor: "default"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__fill",
    style: {
      background: "var(--color-bg-deep)",
      height: 120,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "28px 24px"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/wc48-wordmark-dark.svg",
    alt: "Wordmark on dark",
    style: {
      width: "86%",
      height: "auto"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "sw__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__name"
  }, "On dark"), /*#__PURE__*/React.createElement("div", {
    className: "sw__meta"
  }, "wc48-wordmark-dark.svg \xB7 #F2F2F5 ink"))), /*#__PURE__*/React.createElement("div", {
    className: "sw",
    style: {
      cursor: "default"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__fill",
    style: {
      background: "#F2F2F5",
      height: 120,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "28px 24px"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/wc48-wordmark-light.svg",
    alt: "Wordmark on light",
    style: {
      width: "86%",
      height: "auto"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "sw__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__name"
  }, "On light"), /*#__PURE__*/React.createElement("div", {
    className: "sw__meta"
  }, "wc48-wordmark-light.svg \xB7 #241754 ink"))))), /*#__PURE__*/React.createElement(Block, {
    label: "Lockups \u2014 horizontal & vertical",
    note: "Each lockup ships in a dark and a light variant. Pair every mark with the background its name encodes so it always stays legible."
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-grid ds-grid--2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw",
    style: {
      cursor: "default"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__fill",
    style: {
      background: "var(--color-bg-deep)",
      height: 92,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px 22px"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/wc48-branding-horizontal-dark.svg",
    alt: "",
    style: {
      maxHeight: "100%",
      maxWidth: "100%"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "sw__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__name"
  }, "Horizontal \xB7 dark"), /*#__PURE__*/React.createElement("div", {
    className: "sw__meta"
  }, "wc48-branding-horizontal-dark.svg"))), /*#__PURE__*/React.createElement("div", {
    className: "sw",
    style: {
      cursor: "default"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__fill",
    style: {
      background: "#F2F2F5",
      height: 92,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px 22px"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/wc48-branding-horizontal-light.svg",
    alt: "",
    style: {
      maxHeight: "100%",
      maxWidth: "100%"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "sw__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__name"
  }, "Horizontal \xB7 light"), /*#__PURE__*/React.createElement("div", {
    className: "sw__meta"
  }, "wc48-branding-horizontal-light.svg"))), /*#__PURE__*/React.createElement("div", {
    className: "sw",
    style: {
      cursor: "default"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__fill",
    style: {
      background: "var(--color-bg-deep)",
      height: 168,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/wc48-branding-vertical-dark.svg",
    alt: "",
    style: {
      maxHeight: 132
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "sw__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__name"
  }, "Vertical \xB7 dark"), /*#__PURE__*/React.createElement("div", {
    className: "sw__meta"
  }, "wc48-branding-vertical-dark.svg"))), /*#__PURE__*/React.createElement("div", {
    className: "sw",
    style: {
      cursor: "default"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__fill",
    style: {
      background: "#F2F2F5",
      height: 168,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/wc48-branding-vertical-light.svg",
    alt: "",
    style: {
      maxHeight: 132
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "sw__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__name"
  }, "Vertical \xB7 light"), /*#__PURE__*/React.createElement("div", {
    className: "sw__meta"
  }, "wc48-branding-vertical-light.svg"))))));
}
window.SecBrand = SecBrand;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds/sec-brand.jsx", error: String((e && e.message) || e) }); }

// ds/sec-cinematic.jsx
try { (() => {
/* WorldCrown48 DS — Cinematic: manifesto · interactive feature cards ·
   three-step archive. Built with React state/intervals (no GSAP dep).
   Conflict resolved in favor of the contract: the vote feed is labelled
   "VOTE FEED", never "LIVE" — WC48 does not live-stream. */

/* ── Card 1: Tournament Shuffler ── */
function TournamentShuffler() {
  const SAMPLE = [{
    label: "K-POP",
    title: "최고의 퍼포먼스 무대",
    count: "48 Contestants"
  }, {
    label: "K-POP",
    title: "Idol of the Decade",
    count: "48 Contestants"
  }, {
    label: "OTHER",
    title: "올해의 무대",
    count: "48 Contestants"
  }];
  const [items, setItems] = useState(SAMPLE);
  useEffect(() => {
    const id = setInterval(() => setItems(p => {
      const n = [...p];
      n.unshift(n.pop());
      return n;
    }), 3000);
    return () => clearInterval(id);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 168
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: it.title,
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: i * 16,
      transform: `scale(${1 - i * 0.05})`,
      opacity: 1 - i * 0.28,
      zIndex: 3 - i,
      background: "var(--color-bg-elevated)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-border)",
      padding: "16px 20px",
      transition: "all 600ms cubic-bezier(0.2,0.8,0.2,1)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 9.5,
      color: "var(--color-text-muted)",
      letterSpacing: "0.2em"
    }
  }, it.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      marginTop: 6,
      color: "var(--color-text)"
    }
  }, it.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--color-gold)",
      marginTop: 4
    }
  }, it.count))));
}

/* ── Card 2: Vote Feed Typewriter ── */
function VoteFeedTypewriter() {
  const MSGS = ["Fan #4,812 just picked 미나", "New tournament: Idol of the Decade", "Fans are making their voice heard", "ROUND OF 24 begins for a Voter", "Fan #7,301 claimed their Crown Card", "48 Contestants. One Crown."];
  const [txt, setTxt] = useState("");
  const [mi, setMi] = useState(0);
  const [ci, setCi] = useState(0);
  useEffect(() => {
    const cur = MSGS[mi];
    let t;
    if (ci < cur.length) {
      t = setTimeout(() => {
        setTxt(cur.slice(0, ci + 1));
        setCi(c => c + 1);
      }, 38);
    } else {
      t = setTimeout(() => {
        setMi(m => (m + 1) % MSGS.length);
        setCi(0);
        setTxt("");
      }, 2000);
    }
    return () => clearTimeout(t);
  }, [ci, mi]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 22px",
      background: "var(--color-bg-elevated)",
      borderRadius: "var(--radius-border)",
      border: "1px solid var(--color-border)",
      minHeight: 130
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: "var(--color-turquoise)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 9.5,
      color: "var(--color-text-muted)",
      letterSpacing: "0.22em"
    }
  }, "VOTE FEED")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 14,
      color: "var(--color-text)",
      lineHeight: 1.5
    }
  }, txt, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      width: 2,
      height: "1em",
      background: "var(--color-gold)",
      marginLeft: 2,
      verticalAlign: "text-bottom",
      animation: "wc-blink 1s step-end infinite"
    }
  })));
}

/* ── Card 3: Match Scheduler (journey) ── */
function MatchScheduler() {
  const ROUNDS = [["ROUND OF 48", 24], ["ROUND OF 24", 12], ["ROUND OF 12", 6], ["ROUND OF 6", 3], ["THE FINAL", 1]];
  const [hot, setHot] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHot(h => (h + 1) % ROUNDS.length), 1100);
    return () => clearInterval(id);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 22px",
      background: "var(--color-bg-elevated)",
      borderRadius: "var(--radius-border)",
      border: "1px solid var(--color-border)"
    }
  }, ROUNDS.map(([name, m], i) => /*#__PURE__*/React.createElement("div", {
    key: name,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "9px 13px",
      borderRadius: 6,
      marginBottom: 6,
      border: "1px solid " + (hot === i ? "rgba(252,208,6,0.5)" : "rgba(252,208,6,0.12)"),
      background: hot === i ? "rgba(252,208,6,0.14)" : "transparent",
      transition: "all 300ms ease"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: hot === i ? "var(--color-gold)" : "var(--color-text-muted)",
      transform: hot === i ? "scale(1.4)" : "scale(1)",
      transition: "all 300ms ease",
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 13,
      color: "var(--color-text)",
      flex: 1,
      letterSpacing: "0.04em"
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--color-text-sub)"
    }
  }, m, " ", m === 1 ? "Match" : "Matches"))));
}
function SecCinematic() {
  const steps = [{
    num: "01",
    title: "Enter the Arena",
    desc: "48 Contestants. Your tournament. Your rules.",
    bg: "var(--color-bg-elevated)"
  }, {
    num: "02",
    title: "Vote your Champion",
    desc: "One Match at a time. No predictions. Pure fan choice.",
    bg: "var(--color-bg-deep)"
  }, {
    num: "03",
    title: "Claim your Crown",
    desc: "Your Champion is crowned. Share your Crown Card with the world.",
    bg: "var(--color-bg-deep)"
  }];
  return /*#__PURE__*/React.createElement(Section, {
    id: "cinematic",
    num: "04 \u2014 CINEMATIC",
    title: "Cinematic patterns",
    desc: "The motion language that keeps WC48 from reading as a flat AI template. Measured, percussive, theatrical \u2014 never cute. These are the Launch Pad and The Pitch signature moments."
  }, /*#__PURE__*/React.createElement(Block, {
    label: "Manifesto"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: "var(--color-bg-deep)",
      borderRadius: "var(--radius-border)",
      border: "1px solid var(--color-border)",
      padding: "72px 24px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(252,208,6,0.08), transparent 70%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: 640,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 17,
      color: "var(--color-text-muted)",
      margin: 0
    }
  }, "Most platforms focus on"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 21,
      color: "var(--color-text)",
      opacity: 0.6,
      marginTop: 8
    }
  }, "predicting the winner."), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 60,
      height: 1,
      background: "var(--color-gold)",
      margin: "30px auto"
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontSize: "clamp(36px,6vw,64px)",
      color: "var(--color-text)",
      margin: 0,
      lineHeight: 1.1
    }
  }, "We let fans"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 900,
      fontSize: "clamp(52px,8vw,88px)",
      color: "var(--color-gold)",
      margin: "6px 0 0",
      letterSpacing: "-0.02em",
      lineHeight: 1
    }
  }, "DECIDE.")))), /*#__PURE__*/React.createElement(Block, {
    label: "Interactive feature cards",
    note: "Three live micro-UIs for the Features section: Tournament Shuffler, Vote Feed Typewriter, Match Scheduler."
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-grid ds-grid--3"
  }, /*#__PURE__*/React.createElement(Stage, {
    className: "stage--col",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement(TournamentShuffler, null)), /*#__PURE__*/React.createElement(Stage, {
    className: "stage--col",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement(VoteFeedTypewriter, null)), /*#__PURE__*/React.createElement(Stage, {
    className: "stage--col",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement(MatchScheduler, null)))), /*#__PURE__*/React.createElement(Block, {
    label: "Three-step archive",
    note: "Launch \u2192 Vote \u2192 Crown. On the live site these pin and stack on scroll; here is the storytelling sequence."
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-grid ds-grid--3"
  }, steps.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.num,
    style: {
      background: s.bg,
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-border)",
      padding: "26px 22px",
      minHeight: 188,
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--color-gold)",
      letterSpacing: "0.3em",
      marginBottom: 18
    }
  }, s.num), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 800,
      fontSize: 22,
      color: "var(--color-text)",
      margin: "0 0 12px"
    }
  }, s.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      lineHeight: 1.6,
      color: "var(--color-text-sub)",
      margin: 0
    }
  }, s.desc))))));
}
window.SecCinematic = SecCinematic;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds/sec-cinematic.jsx", error: String((e && e.message) || e) }); }

// ds/sec-components.jsx
try { (() => {
/* WorldCrown48 DS — Components: buttons · status pills · TournamentCard ·
   VS Battle (interactive) · Crown Card · Floating Island GNB · forms ·
   AI-Report footer (the single allowed AI surface). */

function StatusPill({
  status
}) {
  const map = {
    draft: {
      c: "",
      label: "draft"
    },
    published: {
      c: "",
      label: "published"
    },
    active: {
      c: "is-gold",
      label: "active",
      dot: true
    },
    closed: {
      c: "is-crimson",
      label: "closed"
    },
    completed: {
      c: "is-turq",
      label: "completed"
    }
  };
  const s = map[status] || map.draft;
  return /*#__PURE__*/React.createElement("span", {
    className: "pill " + s.c
  }, s.dot ? /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }) : null, s.label);
}

/* ── Tournament card (The Pitch) ── */
function TournamentCard({
  cat,
  title,
  count,
  deadline,
  status
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-border)",
      overflow: "hidden",
      background: "var(--color-bg-soft)",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 116,
      background: "linear-gradient(135deg, rgba(252,208,6,0.18), rgba(54,34,97,0.6))",
      position: "relative",
      display: "flex",
      alignItems: "flex-end",
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "pill is-aura",
    style: {
      fontSize: 9.5,
      padding: "3px 9px"
    }
  }, cat)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 16px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      color: "var(--color-text)",
      lineHeight: 1.2
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--color-text-sub)",
      letterSpacing: "0.04em"
    }
  }, count, " Contestants ", /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.4
    }
  }, "\xB7"), " Closes ", deadline), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "auto",
      paddingTop: 12,
      borderTop: "1px solid var(--color-border)"
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: status
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--color-gold)",
      letterSpacing: "0.06em"
    }
  }, "ENTER \u2192"))));
}

/* ── VS Battle (interactive) — mirrors preview/43-vs-battle.html ── */
function VSBattle() {
  const [won, setWon] = useState(null);
  const left = {
    name: "슬기",
    meta: "KR · VOCAL · MAIN",
    initial: "SG",
    short: "슬기",
    tint: "0,163,183"
  };
  const right = {
    name: "미나",
    meta: "JP · DANCE · MAIN",
    initial: "MN",
    short: "미나",
    tint: "215,6,58"
  };
  const Card = ({
    side,
    data
  }) => {
    const isWon = won === side;
    const isLost = won && won !== side;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
        opacity: isLost ? 0.45 : 1,
        transform: isWon ? "scale(1.03)" : "scale(1)",
        transition: "all 220ms cubic-bezier(0.2,0.8,0.2,1)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        aspectRatio: "4 / 5",
        borderRadius: "var(--radius-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display)",
        fontStyle: "italic",
        fontWeight: 900,
        fontSize: 52,
        background: `linear-gradient(180deg, rgba(${data.tint},0.28), rgba(36,23,84,0.65))`,
        border: isWon ? "2px solid var(--color-gold)" : `1px solid rgba(${data.tint},0.45)`,
        color: `rgb(${data.tint})`,
        boxShadow: isWon ? "var(--shadow-gold)" : "none"
      }
    }, data.initial), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: 17,
        letterSpacing: "-0.015em",
        color: "var(--color-text)",
        textAlign: side === "right" ? "right" : "left"
      }
    }, data.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--color-text-sub)",
        letterSpacing: "0.1em",
        textAlign: side === "right" ? "right" : "left"
      }
    }, data.meta), !won ? /*#__PURE__*/React.createElement("button", {
      onClick: () => setWon(side),
      style: {
        marginTop: 4,
        minHeight: 44,
        padding: "9px 14px",
        border: 0,
        borderRadius: "var(--radius-border)",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: 13,
        display: "flex",
        flexDirection: "column",
        textAlign: "left",
        background: side === "left" ? "var(--color-turquoise)" : "var(--color-crimson)",
        color: side === "left" ? "#00181B" : "#fff",
        boxShadow: side === "left" ? "var(--shadow-turquoise)" : "none"
      }
    }, /*#__PURE__*/React.createElement("small", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.2em",
        opacity: 0.85,
        fontWeight: 600
      }
    }, "VOTE ", side.toUpperCase()), /*#__PURE__*/React.createElement("span", {
      style: {
        marginTop: 2
      }
    }, data.short)) : /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4,
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: side === "right" ? "flex-end" : "flex-start",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.16em",
        color: isWon ? "var(--color-gold)" : "var(--color-text-muted)"
      }
    }, isWon ? "✓ CROWNED" : ""));
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      overflow: "hidden",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-border)",
      background: "var(--color-bg-default)",
      padding: "20px 22px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background: "radial-gradient(ellipse 50% 60% at 12% 50%, rgba(0,163,183,0.20), transparent 55%), radial-gradient(ellipse 50% 60% at 88% 50%, rgba(215,6,58,0.20), transparent 55%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      textAlign: "center",
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontWeight: 700,
      fontSize: 19,
      lineHeight: 1,
      color: "var(--color-gold)",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 1,
      background: "linear-gradient(90deg, transparent, var(--color-gold))"
    }
  }), "The Arena", /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 1,
      background: "linear-gradient(90deg, var(--color-gold), transparent)"
    }
  })), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 800,
      fontSize: 32,
      lineHeight: 1.04,
      letterSpacing: "-0.02em",
      color: "var(--color-text)",
      margin: 0
    }
  }, "\uCD5C\uACE0\uC758 \uD37C\uD3EC\uBA3C\uC2A4 \uBB34\uB300", /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      marginTop: 8,
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: "0.28em",
      color: "var(--color-text-sub)"
    }
  }, "2026"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "grid",
      gridTemplateColumns: "1fr auto 1fr",
      gap: 16,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    side: "left",
    data: left
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontWeight: 900,
      fontSize: 66,
      lineHeight: 1,
      color: "var(--color-gold)",
      textShadow: "0 2px 18px rgba(252,208,6,0.45)"
    }
  }, "vs"), /*#__PURE__*/React.createElement(Card, {
    side: "right",
    data: right
  })), won ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      textAlign: "center",
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--color-gold)",
      letterSpacing: "0.06em"
    }
  }, "Crown cast \u2014 the system advances to the next Match. "), /*#__PURE__*/React.createElement("button", {
    onClick: () => setWon(null),
    style: {
      background: "none",
      border: 0,
      color: "var(--color-text-sub)",
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      letterSpacing: "0.06em",
      textDecoration: "underline",
      cursor: "pointer"
    }
  }, "reset")) : null);
}

/* ── Crown Card (Instagram Story share artifact) ── */
function CrownCard() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: "1080/1920",
      height: 440,
      margin: "0 auto",
      background: "var(--color-bg-deep)",
      border: "2px solid var(--color-gold)",
      borderRadius: 6,
      position: "relative",
      overflow: "hidden",
      boxShadow: "var(--shadow-gold)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "linear-gradient(180deg, rgba(252,208,6,0.30), rgba(36,23,84,0.78))",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontWeight: 900,
      fontSize: 96,
      color: "var(--color-gold)",
      paddingBottom: "22%"
    }
  }, "MN"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "5%",
      left: 0,
      right: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      width: 110,
      height: 110,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(252,208,6,0.5) 0%, transparent 70%)"
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: "assets/wc48-crown-filled.svg",
    style: {
      position: "relative",
      width: 56,
      height: 56,
      filter: "drop-shadow(0 0 12px rgba(252,208,6,0.9))"
    },
    alt: ""
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      letterSpacing: "0.3em",
      color: "var(--color-gold)"
    }
  }, "WORLDCROWN48 \xB7 CHAMPION")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      padding: "24% 8% 7%",
      textAlign: "center",
      background: "linear-gradient(180deg, transparent, rgba(0,0,58,0.6) 42%, rgba(0,0,58,0.94))"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 800,
      fontSize: 38,
      color: "var(--color-gold)",
      lineHeight: 1.05,
      letterSpacing: "-0.02em"
    }
  }, "\uBBF8\uB098"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 11,
      color: "#F2F2F5",
      marginTop: "4%"
    }
  }, "\uCD5C\uACE0\uC758 \uD37C\uD3EC\uBA3C\uC2A4 \uBB34\uB300 \xB7 2026")));
}

/* ── Floating Island GNB ── */
function GNBIsland() {
  const [active, setActive] = useState("Pitch");
  const links = ["Pitch", "Arena", "Newsroom"];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      padding: "5px 8px",
      background: "var(--color-bg-elevated)",
      border: "1px solid rgba(252,208,6,0.16)",
      borderRadius: "var(--radius-border)",
      boxShadow: "var(--shadow-gnb)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "3px 10px"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/wc48-crown-filled.svg",
    style: {
      width: 17,
      height: 17
    },
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      letterSpacing: "0.14em",
      color: "var(--color-gold)",
      fontWeight: 700
    }
  }, "WorldCrown48")), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 16,
      background: "rgba(255,255,255,0.1)"
    }
  }), links.map(l => /*#__PURE__*/React.createElement("span", {
    key: l,
    onClick: () => setActive(l),
    style: {
      padding: "4px 12px",
      borderRadius: "var(--radius-border)",
      fontSize: 13,
      fontWeight: 500,
      cursor: "pointer",
      color: active === l ? "var(--color-gold)" : "var(--color-text-sub)",
      background: active === l ? "var(--color-gold-subtle)" : "transparent"
    }
  }, l)), /*#__PURE__*/React.createElement("button", {
    className: "btn btn--gold btn--sm",
    style: {
      marginLeft: 4
    }
  }, "Sign in"));
}
function SecComponents() {
  return /*#__PURE__*/React.createElement(Section, {
    id: "components",
    num: "03 \u2014 COMPONENTS",
    title: "Components",
    desc: "The production kit. Buttons are magnetic, the GNB is a Floating Island, and the VS Battle is the heart of the Arena. Every component obeys the contract \u2014 no LIVE, no Round HUD, no Vote Rate during voting, no AI-Report on cards."
  }, /*#__PURE__*/React.createElement(Block, {
    label: "Buttons \u2014 magnetic",
    note: "Hover to feel the cursor-tracking pull. Gold is primary; ghost and quiet are secondary. Hit target \u2265 44px."
  }, /*#__PURE__*/React.createElement(Stage, {
    cap: "Hover me"
  }, /*#__PURE__*/React.createElement(MagneticButton, {
    variant: "gold",
    size: "lg"
  }, "Vote your Champion"), /*#__PURE__*/React.createElement(MagneticButton, {
    variant: "ghost"
  }, "Explore Tournaments"), /*#__PURE__*/React.createElement(MagneticButton, {
    variant: "quiet",
    size: "sm"
  }, "Learn more"))), /*#__PURE__*/React.createElement(Block, {
    label: "Status pills \u2014 the only Tournament states",
    note: /*#__PURE__*/React.createElement(React.Fragment, null, "Use one of five: ", /*#__PURE__*/React.createElement("span", {
      className: "ds-inline-code"
    }, "draft \xB7 published \xB7 active \xB7 closed \xB7 completed"), ". Never ", /*#__PURE__*/React.createElement("span", {
      className: "ds-inline-code"
    }, "In Progress"), ". Never a LIVE pill \u2014 WC48 does not live-stream.")
  }, /*#__PURE__*/React.createElement(Stage, null, /*#__PURE__*/React.createElement(StatusPill, {
    status: "draft"
  }), /*#__PURE__*/React.createElement(StatusPill, {
    status: "published"
  }), /*#__PURE__*/React.createElement(StatusPill, {
    status: "active"
  }), /*#__PURE__*/React.createElement(StatusPill, {
    status: "closed"
  }), /*#__PURE__*/React.createElement(StatusPill, {
    status: "completed"
  }), /*#__PURE__*/React.createElement("span", {
    className: "pill is-aura"
  }, "K-POP"), /*#__PURE__*/React.createElement("span", {
    className: "pill is-aura"
  }, "OTHER"))), /*#__PURE__*/React.createElement(Block, {
    label: "Tournament card \xB7 The Pitch",
    note: "Category \xB7 title \xB7 {N} Contestants \xB7 Tournament Deadline \xB7 status. No Round progress, no vote count, no LIVE, no AI-Report."
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-grid ds-grid--3"
  }, /*#__PURE__*/React.createElement(TournamentCard, {
    cat: "K-POP",
    title: "\uCD5C\uACE0\uC758 \uD37C\uD3EC\uBA3C\uC2A4 \uBB34\uB300",
    count: "48",
    deadline: "May 31",
    status: "active"
  }), /*#__PURE__*/React.createElement(TournamentCard, {
    cat: "K-POP",
    title: "Idol of the Decade",
    count: "48",
    deadline: "Jun 14",
    status: "published"
  }), /*#__PURE__*/React.createElement(TournamentCard, {
    cat: "OTHER",
    title: "\uC62C\uD574\uC758 \uBB34\uB300",
    count: "48",
    deadline: "Jun 30",
    status: "completed"
  }))), /*#__PURE__*/React.createElement(Block, {
    label: "VS Battle \xB7 The Arena \u2014 interactive",
    note: "Pick a Contestant. The system advances to the next Match automatically. No Round/Match HUD, no timer, no Vote Rate, no timestamp \u2014 the Voter is a player, not a spectator."
  }, /*#__PURE__*/React.createElement(VSBattle, null)), /*#__PURE__*/React.createElement("div", {
    className: "ds-grid ds-grid--2",
    style: {
      marginTop: 44,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement(Block, {
    label: "Crown Card \xB7 share artifact"
  }, /*#__PURE__*/React.createElement(CrownCard, null)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Block, {
    label: "Floating Island GNB"
  }, /*#__PURE__*/React.createElement(Stage, {
    className: "stage--center stage--deep"
  }, /*#__PURE__*/React.createElement(GNBIsland, null))), /*#__PURE__*/React.createElement(Block, {
    label: "Form controls"
  }, /*#__PURE__*/React.createElement(Stage, {
    className: "stage--col"
  }, /*#__PURE__*/React.createElement("input", {
    placeholder: "you@email.com",
    style: {
      width: "100%",
      padding: "12px 14px",
      background: "var(--color-bg-default)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-border)",
      color: "var(--color-text)",
      fontFamily: "var(--font-sans)",
      fontSize: 14
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement(MagneticButton, {
    variant: "gold",
    style: {
      flex: 1
    }
  }, "Join the waitlist")), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      fontSize: 13,
      color: "var(--color-text-sub)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      borderRadius: 4,
      border: "1px solid var(--color-border-gold)",
      background: "var(--color-gold-subtle)",
      display: "inline-block"
    }
  }), "I accept the Policy Hub terms"))))), /*#__PURE__*/React.createElement(Block, {
    label: "AI-Report \u2014 the single allowed surface",
    note: "\u2726 AI-Report appears only as the footer of a news article (12px gold mono). It never appears on a card, banner, box, or list item. \u201CAI GENERATED\u201D and the old \u25CF AI-Report card byline are permanently retired."
  }, /*#__PURE__*/React.createElement(Stage, {
    className: "stage--col",
    style: {
      background: "var(--color-bg-default)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 560
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 22,
      color: "var(--color-text)",
      lineHeight: 1.25
    }
  }, "Fan sentiment surges as the 24\uAC15 bracket tightens"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      lineHeight: 1.65,
      color: "var(--color-text-sub)",
      marginTop: 12
    }
  }, "Across the past day, voter momentum shifted decisively toward the top seed, with the gap widening to a commanding margin. Fans are making their voice heard across every region."), /*#__PURE__*/React.createElement("span", {
    className: "ai-report-footer"
  }, "\u2726 AI-Report")))));
}
window.SecComponents = SecComponents;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds/sec-components.jsx", error: String((e && e.message) || e) }); }

// ds/sec-foundation.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* WorldCrown48 DS — Foundation: color · type · spacing · radii · shadow · noise */

function SecFoundation() {
  const darkBg = [{
    fill: "#00001F",
    tag: "VOID",
    name: "Stadium Void",
    value: "#00001F",
    role: "Deepest layer · letterbox",
    tagColor: "#FCD006"
  }, {
    fill: "#00003A",
    tag: "DEEP",
    name: "Deep Osidian",
    value: "#00003A",
    role: "Arena hero · section base"
  }, {
    fill: "#0E0944",
    tag: "BG",
    name: "Deep Twilight",
    value: "#0E0944",
    role: "Default dark background"
  }, {
    fill: "#241754",
    tag: "SOFT",
    name: "Twilight Soft",
    value: "#241754",
    role: "Cards · panels"
  }, {
    fill: "#362261",
    tag: "ELEV",
    name: "Twilight Indigo",
    value: "#362261",
    role: "Modals · dropdowns"
  }, {
    fill: "#1E1E24",
    tag: "GNB",
    name: "GNB Charcoal",
    value: "#1E1E24",
    role: "Floating Island GNB"
  }];
  const gold = [{
    fill: "#FCD006",
    tag: "POINT",
    name: "Crown Gold",
    value: "#FCD006",
    role: "The only point color",
    tagColor: "#1A1205"
  }, {
    fill: "#FBB03B",
    tag: "ACCENT",
    name: "Sunburst",
    value: "#FBB03B",
    role: "Warm accent",
    tagColor: "#1A1205"
  }, {
    fill: "#E3BB05",
    tag: "HOVER",
    name: "Gold Hover",
    value: "#E3BB05",
    role: "CTA hover state",
    tagColor: "#1A1205"
  }, {
    fill: "#EEDA7D",
    tag: "AURA",
    name: "Aura Yellow",
    value: "#EEDA7D",
    role: "Soft emphasis only",
    tagColor: "#1A1205"
  }];
  const accent = [{
    fill: "#D7063A",
    tag: "STATE",
    name: "Royal Crimson",
    value: "#D7063A",
    role: "VS-right · error — never decorative"
  }, {
    fill: "#00A3B7",
    tag: "STATE",
    name: "Turquoise",
    value: "#00A3B7",
    role: "VS-left · success · complete"
  }, {
    fill: "#B1B5C4",
    tag: "TEXT",
    name: "Powder Blue",
    value: "#B1B5C4",
    role: "Secondary text",
    tagColor: "#1A1205"
  }];
  const lightTheme = [{
    fill: "#F2F2F5",
    tag: "BG",
    name: "Light BG",
    value: "#F2F2F5",
    role: "Domain 4–6 page",
    tagColor: "#0E0944"
  }, {
    fill: "#FFFFFF",
    tag: "SURFACE",
    name: "Surface",
    value: "#FFFFFF",
    role: "Cards on light",
    tagColor: "#0E0944"
  }, {
    fill: "#0E0944",
    tag: "TEXT",
    name: "Text",
    value: "#0E0944",
    role: "Body text on light"
  }, {
    fill: "#3A4570",
    tag: "SUB",
    name: "Text Sub",
    value: "#3A4570",
    role: "Secondary on light"
  }, {
    fill: "#8C99B3",
    tag: "MUTED",
    name: "Text Muted",
    value: "#8C99B3",
    role: "Labels · placeholder (AA Large)",
    tagColor: "#0E0944"
  }, {
    fill: "#D4DCE3",
    tag: "BORDER",
    name: "Border",
    value: "#D4DCE3",
    role: "Hairlines on light",
    tagColor: "#0E0944"
  }];
  return /*#__PURE__*/React.createElement(Section, {
    id: "foundation",
    num: "01 \u2014 FOUNDATION",
    title: "Foundation",
    desc: "Color, type, spacing, radii and shadow. Every value below resolves from colors_and_type.css \u2014 the single source of truth. Click any swatch or token to copy."
  }, /*#__PURE__*/React.createElement(Block, {
    label: "Dark theme \xB7 Domain 0\u20133 \xB7 Twilight Stadium",
    note: /*#__PURE__*/React.createElement(React.Fragment, null, "Pure black ", /*#__PURE__*/React.createElement("span", {
      className: "ds-inline-code"
    }, "#000000"), " is banned. The darkest surface is Stadium Void ", /*#__PURE__*/React.createElement("span", {
      className: "ds-inline-code"
    }, "#00001F"), ".")
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-grid ds-grid--6"
  }, darkBg.map((s, i) => /*#__PURE__*/React.createElement(Swatch, _extends({
    key: i
  }, s))))), /*#__PURE__*/React.createElement(Block, {
    label: "Crown Gold + warm accents \u2014 the point color"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-grid ds-grid--4"
  }, gold.map((s, i) => /*#__PURE__*/React.createElement(Swatch, _extends({
    key: i
  }, s))))), /*#__PURE__*/React.createElement(Block, {
    label: "State accents \u2014 never decorative",
    note: "Crimson and Turquoise carry meaning only: VS sides, success, error. Never use them as background fills or brand flourish."
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-grid ds-grid--3"
  }, accent.map((s, i) => /*#__PURE__*/React.createElement(Swatch, _extends({
    key: i
  }, s))))), /*#__PURE__*/React.createElement(Block, {
    label: "Light theme \xB7 Domain 4\u20136 \xB7 Locker Room \xB7 Policy \xB7 Admin",
    note: "Never mix dark and light on a single screen. Gold remains the only point color across both themes."
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-grid ds-grid--6"
  }, lightTheme.map((s, i) => /*#__PURE__*/React.createElement(Swatch, _extends({
    key: i
  }, s))))), /*#__PURE__*/React.createElement(Block, {
    label: "Type \u2014 three families + Korean fallback"
  }, /*#__PURE__*/React.createElement(Stage, {
    className: "stage--col",
    cap: "Specimens"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontWeight: 900,
      fontSize: 52,
      lineHeight: 1,
      letterSpacing: "-0.02em",
      color: "var(--text)"
    }
  }, "Champion"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      letterSpacing: "0.18em",
      color: "var(--color-gold)",
      marginTop: 8
    }
  }, "PLAYFAIR DISPLAY \xB7 ITALIC \xB7 DISPLAY & CHAMPION NAMES (LATIN ONLY)")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      borderTop: "1px solid var(--color-border)",
      paddingTop: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 800,
      fontSize: 30,
      letterSpacing: "-0.01em",
      color: "var(--text)"
    }
  }, "Vote your Champion \xB7 \uB204\uAC00 \uC655\uAD00\uC744 \uC4F8\uAE4C"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      letterSpacing: "0.18em",
      color: "var(--color-gold)",
      marginTop: 8
    }
  }, "INTER 800 \xB7 UI HEADINGS \xB7 PRETENDARD AUTO-RESOLVES KOREAN")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      borderTop: "1px solid var(--color-border)",
      paddingTop: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 16,
      lineHeight: 1.6,
      color: "var(--text-sub)"
    }
  }, "Fans decide, not algorithms. 48 Contestants enter; one Crown is claimed. Body copy sets in Inter with Pretendard resolving Hangul at equal weight."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      letterSpacing: "0.18em",
      color: "var(--color-gold)",
      marginTop: 8
    }
  }, "INTER 400/500 \xB7 BODY \xB7 16/1.6")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      borderTop: "1px solid var(--color-border)",
      paddingTop: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 18,
      letterSpacing: "0.12em",
      color: "var(--text)"
    }
  }, "ROUND OF 48 \xB7 34.5% \xB7 VOTE RATE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      letterSpacing: "0.18em",
      color: "var(--color-gold)",
      marginTop: 8
    }
  }, "JETBRAINS MONO \xB7 NUMERALS \xB7 TAGS \xB7 METADATA")))), /*#__PURE__*/React.createElement(Block, {
    label: "Spacing \u2014 8-grid",
    note: "Scale tokens space-1 \u2192 space-32. Compose layouts on the grid; lean on flex/grid gap rather than per-element margins."
  }, /*#__PURE__*/React.createElement(Stage, {
    className: "stage--col"
  }, [["space-1", 4], ["space-2", 8], ["space-3", 12], ["space-4", 16], ["space-6", 24], ["space-8", 32], ["space-12", 48], ["space-16", 64], ["space-24", 96]].map(([t, v]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--color-gold)",
      width: 96
    }
  }, "--", t), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 14,
      width: v,
      background: "var(--color-gold)",
      borderRadius: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--text-sub)"
    }
  }, v, "px"))))), /*#__PURE__*/React.createElement(Block, {
    label: "Radii \u2014 angular system, three values only",
    note: /*#__PURE__*/React.createElement(React.Fragment, null, "Nothing between. Rectangle ", /*#__PURE__*/React.createElement("span", {
      className: "ds-inline-code"
    }, "0"), ", Border ", /*#__PURE__*/React.createElement("span", {
      className: "ds-inline-code"
    }, "5px"), ", Pill ", /*#__PURE__*/React.createElement("span", {
      className: "ds-inline-code"
    }, "999px"), ".")
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-grid ds-grid--3"
  }, [["Rectangle", "0", "0"], ["Border", "5px", "5px"], ["Pill / chip", "999px", "999px"]].map(([name, r, val]) => /*#__PURE__*/React.createElement(Stage, {
    key: name,
    className: "stage--center",
    style: {
      padding: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 96,
      height: 56,
      background: "var(--color-gold-subtle)",
      border: "1px solid var(--color-border-gold)",
      borderRadius: r
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 600,
      color: "var(--text)"
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      color: "var(--text-sub)"
    }
  }, val))))))), /*#__PURE__*/React.createElement(Block, {
    label: "Shadow \u2014 colored elevation"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-grid ds-grid--3"
  }, [["--shadow-card", "var(--shadow-card)"], ["--shadow-gold", "var(--shadow-gold)"], ["--shadow-gnb", "var(--shadow-gnb)"], ["--shadow-crimson", "var(--shadow-crimson)"], ["--shadow-turquoise", "var(--shadow-turquoise)"], ["--shadow-light", "var(--shadow-light)"]].map(([name, val]) => /*#__PURE__*/React.createElement(Stage, {
    key: name,
    className: "stage--center stage--deep",
    style: {
      padding: 30
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 92,
      height: 60,
      background: "var(--color-bg-soft)",
      borderRadius: "var(--radius-border)",
      boxShadow: val,
      border: "1px solid var(--color-border)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      color: "var(--color-gold)"
    }
  }, name)))))), /*#__PURE__*/React.createElement(Block, {
    label: "Token reference"
  }, /*#__PURE__*/React.createElement(SpecTable, {
    rows: [{
      token: "--font-sans",
      value: "Inter · Pretendard",
      desc: "UI · body · headings"
    }, {
      token: "--font-display",
      value: "Playfair Display",
      desc: "Italic display · Champion names (Latin)"
    }, {
      token: "--font-mono",
      value: "JetBrains Mono",
      desc: "Numerals · tags · metadata"
    }, {
      token: "--radius-border",
      value: "5px",
      desc: "Default surface radius"
    }, {
      token: "--color-gold",
      value: "#FCD006",
      desc: "The only point color"
    }, {
      token: "--shadow-gold",
      value: "0 0 32px …",
      desc: "CTA glow"
    }]
  })));
}
window.SecFoundation = SecFoundation;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds/sec-foundation.jsx", error: String((e && e.message) || e) }); }

// ds/sec-rules.jsx
try { (() => {
/* WorldCrown48 DS — Rules: the v2.4 contract · terminology · do/don't · glossary */

function SecRules() {
  const rules = ["Crown Gold #FCD006 is the only point color. Crimson & Turquoise are state-only. Pure black is banned.", "Dark theme for Domain 0–3, light for Domain 4–6. Never mix on one screen.", "Radii are angular — 0, 5px, 999px. Nothing between.", "Three families: Inter (UI), Playfair Display (italic display, Latin only), JetBrains Mono (numerals/tags). Pretendard resolves Korean.", "✦ AI-Report appears only as a news-article footer. AI GENERATED and the ● AI-Report card byline are retired.", "Round labels appear only in the round-transition announcement — never on the Match VS surface, TournamentCard, GNB, or footers.", "Round names: ROUND OF 48 / 24 / 12 / 6 + THE FINAL. FIFA terms (QUARTERFINAL, SEMIFINAL, ROUND OF 16) are banned.", "No LIVE badge anywhere. WC48 does not live-stream.", "No Vote Rate (%) on the Match VS screen — it biases the next Voter. Vote Rate is for the Ranking surface only.", "Only Tournament Deadline exists. No Match or Round deadline. No “ENDS IN”.", "No emoji. No predictions / odds / betting language. No “FIFA” / “Official” text.", "Use registered SVG brand assets only. Never redraw the crown."];
  const terms = [["Tournament", "이상형 월드컵 event of 48 Contestants", "event · contest · game"], ["Contestant", "the voted entity — person, team, song, anything", "candidate · participant"], ["Match", "one 1:1 vote within a Round", "battle · round"], ["Voter", "the participant casting votes", "user · fan"], ["Champion", "the final pick after THE FINAL", "winner · #1"], ["Crown Card", "the shareable result artifact", "result image"], ["Tournament Deadline", "the only deadline that exists", "Round Deadline (n/a)"], ["Vote Rate (%)", "the only vote figure shown in UI", "Vote Count (absolute)"], ["active", "the live tournament status", "In Progress"]];
  return /*#__PURE__*/React.createElement(Section, {
    id: "rules",
    num: "05 \u2014 CONTRACT",
    title: "Rules & terminology",
    desc: "The v2.4 contract is binding. Where the cinematic spec and the contract conflicted, the contract wins \u2014 that is why the vote feed is never labelled LIVE."
  }, /*#__PURE__*/React.createElement(Block, {
    label: "Twelve inviolable rules"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stage stage--col",
    style: {
      padding: 0,
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "spec"
  }, /*#__PURE__*/React.createElement("tbody", null, rules.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    className: "spec__token",
    style: {
      width: 36,
      textAlign: "right",
      color: "var(--color-gold)"
    }
  }, String(i + 1).padStart(2, "0")), /*#__PURE__*/React.createElement("td", {
    className: "spec__desc"
  }, r))))))), /*#__PURE__*/React.createElement(Block, {
    label: "Do / Don't"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-grid ds-grid--2"
  }, /*#__PURE__*/React.createElement(Rule, {
    kind: "do",
    title: "Round in its place"
  }, "Show the round name only on the full-screen round-transition announcement between rounds \u2014 \u201C\uD83D\uDEA9 ROUND OF 24\u201D. (No emoji in production copy.)"), /*#__PURE__*/React.createElement(Rule, {
    kind: "dont",
    title: "Round HUD on the Match"
  }, "Never put ", /*#__PURE__*/React.createElement("code", null, "ROUND OF 48 \xB7 MATCH 7/24"), " or a progress bar on the VS surface. The Voter is a player, not a spectator."), /*#__PURE__*/React.createElement(Rule, {
    kind: "do",
    title: "Tournament Deadline only"
  }, "Surface ", /*#__PURE__*/React.createElement("code", null, "Tournament ends \xB7 May 31"), " where a date is needed."), /*#__PURE__*/React.createElement(Rule, {
    kind: "dont",
    title: "Match timers"
  }, "Never render ", /*#__PURE__*/React.createElement("code", null, "ENDS IN 03:14:22"), " \u2014 Matches and Rounds have no time."), /*#__PURE__*/React.createElement(Rule, {
    kind: "do",
    title: "Vote Rate on Ranking"
  }, "Show ", /*#__PURE__*/React.createElement("code", null, "34.5%"), " only after voting, on the Ranking surface."), /*#__PURE__*/React.createElement(Rule, {
    kind: "dont",
    title: "Vote Count anywhere"
  }, "Never show ", /*#__PURE__*/React.createElement("code", null, "1,234 votes"), " or live rates during a Match."), /*#__PURE__*/React.createElement(Rule, {
    kind: "do",
    title: "\u2726 AI-Report footer"
  }, "Place the badge once, at the bottom of a news article."), /*#__PURE__*/React.createElement(Rule, {
    kind: "dont",
    title: "AI badges on cards"
  }, "Never put ", /*#__PURE__*/React.createElement("code", null, "\u25CF AI-Report"), ", ", /*#__PURE__*/React.createElement("code", null, "AI GENERATED"), ", or a LIVE pill on a card, banner, or box."))), /*#__PURE__*/React.createElement(Block, {
    label: "Terminology \u2014 immutable"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gloss"
  }, terms.map(([term, def, banned]) => /*#__PURE__*/React.createElement("div", {
    className: "gloss__row",
    key: term
  }, /*#__PURE__*/React.createElement("div", {
    className: "gloss__term"
  }, term, /*#__PURE__*/React.createElement("span", null, "\u2717 ", banned)), /*#__PURE__*/React.createElement("div", {
    className: "gloss__def"
  }, def))))), /*#__PURE__*/React.createElement(Block, {
    label: "Sources",
    note: "This system reconciles the card gallery and the integrated app against CLAUDE.md, DESIGN_BRIEF.md, WC48_DESIGN_SYSTEM_v2.4.md and WorldCrown48 strategy v4.9. Tokens resolve from colors_and_type.css."
  }));
}
window.SecRules = SecRules;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds/sec-rules.jsx", error: String((e && e.message) || e) }); }

// ds/widgets.jsx
try { (() => {
/* WorldCrown48 DS — shared showcase widgets.
   Exports to window for cross-file (Babel scope) use. */

const {
  useState,
  useEffect,
  useRef,
  useCallback
} = React;

/* ── copy helper + toast bus ── */
function fireToast(msg) {
  window.dispatchEvent(new CustomEvent("ds-toast", {
    detail: msg
  }));
}
function copyText(text, label) {
  try {
    navigator.clipboard.writeText(text);
    fireToast((label || "Copied") + " · " + text);
  } catch (e) {
    fireToast("Copy blocked by browser");
  }
}

/* ── Section wrapper ── */
function Section({
  id,
  num,
  title,
  desc,
  children
}) {
  return /*#__PURE__*/React.createElement("section", {
    id: id,
    className: "ds-section",
    "data-screen-label": title
  }, /*#__PURE__*/React.createElement("div", {
    className: "ds-section__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ds-section__num"
  }, num), /*#__PURE__*/React.createElement("h2", {
    className: "ds-section__title"
  }, title), desc ? /*#__PURE__*/React.createElement("p", {
    className: "ds-section__desc"
  }, desc) : null), children);
}

/* ── Block (labelled sub-group) ── */
function Block({
  label,
  note,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ds-block"
  }, label ? /*#__PURE__*/React.createElement("div", {
    className: "ds-block__label"
  }, label) : null, children, note ? /*#__PURE__*/React.createElement("p", {
    className: "ds-block__note"
  }, note) : null);
}

/* ── Color swatch (click to copy) ── */
function Swatch({
  fill,
  tag,
  name,
  value,
  role,
  tagColor
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "sw",
    onClick: () => copyText(value, name),
    title: "Copy " + value
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__fill",
    style: {
      background: fill
    }
  }, tag ? /*#__PURE__*/React.createElement("span", {
    className: "sw__tag",
    style: tagColor ? {
      color: tagColor
    } : null
  }, tag) : null), /*#__PURE__*/React.createElement("div", {
    className: "sw__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sw__name"
  }, name), /*#__PURE__*/React.createElement("div", {
    className: "sw__meta"
  }, value), role ? /*#__PURE__*/React.createElement("div", {
    className: "sw__role"
  }, role) : null));
}

/* ── Spec table ── */
function SpecTable({
  rows
}) {
  // rows: [{ token, value, desc }]
  return /*#__PURE__*/React.createElement("div", {
    className: "stage stage--col",
    style: {
      padding: 0,
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "spec"
  }, /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    className: "spec__token",
    onClick: () => r.token && copyText(r.token, "Token"),
    style: r.token ? {
      cursor: "pointer"
    } : null
  }, r.token), r.value !== undefined ? /*#__PURE__*/React.createElement("td", {
    className: "spec__val"
  }, r.value) : null, /*#__PURE__*/React.createElement("td", {
    className: "spec__desc",
    colSpan: r.value === undefined ? 2 : 1
  }, r.desc))))));
}

/* ── Stage (component canvas) ── */
function Stage({
  cap,
  children,
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "stage " + (className || ""),
    style: style
  }, cap ? /*#__PURE__*/React.createElement("span", {
    className: "stage__cap"
  }, cap) : null, children);
}

/* ── Rule card ── */
function Rule({
  kind,
  title,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "rule is-" + kind
  }, /*#__PURE__*/React.createElement("span", {
    className: "rule__flag"
  }, kind === "do" ? "DO" : "DON'T"), /*#__PURE__*/React.createElement("h4", null, title), /*#__PURE__*/React.createElement("p", null, children));
}

/* ── Magnetic button (cursor-tracking hover) ── */
function MagneticButton({
  children,
  variant = "gold",
  size,
  onClick,
  style
}) {
  const ref = useRef(null);
  const onMove = useCallback(e => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = e.clientX - r.left - r.width / 2;
    const my = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${mx * 0.22}px, ${my * 0.3}px)`;
  }, []);
  const reset = useCallback(() => {
    if (ref.current) ref.current.style.transform = "translate(0,0)";
  }, []);
  const cls = ["btn", "btn--" + variant, size ? "btn--" + size : ""].join(" ");
  return /*#__PURE__*/React.createElement("button", {
    ref: ref,
    className: cls,
    onMouseMove: onMove,
    onMouseLeave: reset,
    onClick: onClick,
    style: style
  }, children);
}
Object.assign(window, {
  fireToast,
  copyText,
  Section,
  Block,
  Swatch,
  SpecTable,
  Stage,
  Rule,
  MagneticButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds/widgets.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/App.jsx
try { (() => {
/* App — router for the WC48 demo SPA. */

function App() {
  const [tab, setTab] = useState("launch");
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement(Nav, {
    tab: tab,
    setTab: setTab
  }), tab === "launch" && /*#__PURE__*/React.createElement(LaunchPad, {
    setTab: setTab
  }), tab === "pitch" && /*#__PURE__*/React.createElement(Pitch, {
    setTab: setTab
  }), tab === "arena" && /*#__PURE__*/React.createElement(Arena, {
    setTab: setTab
  }), tab === "crown" && /*#__PURE__*/React.createElement(CrownReveal, {
    setTab: setTab
  }), /*#__PURE__*/React.createElement(Footer, null));
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Arena.jsx
try { (() => {
/* The Arena — Domain 3 · VS Battle voting.
   Strictly v2.3 compliant:
   - NO Round/Match counter, NO daily vote quota — don't fit the Arena concept
   - NO Vote Rate (%) during voting — bandwagon bias
   - NO "ENDS IN" timer
   - NO LIVE pill anywhere — WC48 does not live-stream
   - NO AI-Report on cards/banners — article footers only
*/

function Contestant({
  data,
  side,
  state,
  onPick
}) {
  const won = state.won === side;
  const lost = state.won && state.won !== side;
  const cls = ["contestant", `contestant--${side}`];
  if (won) cls.push("is-won");
  if (lost) cls.push("is-lost");
  return /*#__PURE__*/React.createElement("div", {
    className: cls.join(" "),
    onClick: () => !state.won && onPick(side)
  }, /*#__PURE__*/React.createElement("div", {
    className: "contestant__portrait"
  }, data.initial), /*#__PURE__*/React.createElement("div", {
    className: "contestant__name"
  }, data.name), /*#__PURE__*/React.createElement("div", {
    className: "contestant__meta"
  }, data.meta));
}
function Arena({
  setTab
}) {
  const list = window.WC_DATA.CONTESTANTS;
  const [pairIdx, setPairIdx] = useState(0);
  const [state, setState] = useState({
    won: null
  });
  const a = list[pairIdx * 2 % list.length];
  const b = list[(pairIdx * 2 + 1) % list.length];
  function pick(side) {
    if (state.won) return;
    setState({
      won: side
    });
  }
  function next() {
    setState({
      won: null
    });
    setPairIdx(i => (i + 1) % Math.floor(list.length / 2));
  }
  function finishToCrown() {
    setTab("crown");
  }
  return /*#__PURE__*/React.createElement("main", {
    className: "container",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("section", {
    className: "arena"
  }, /*#__PURE__*/React.createElement("div", {
    className: "arena__head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "arena__eyebrow"
  }, "The Arena"), /*#__PURE__*/React.createElement("h2", {
    className: "arena__title"
  }, "\uCD5C\uACE0\uC758 \uD37C\uD3EC\uBA3C\uC2A4 \uBB34\uB300 \xB7 2026"))), /*#__PURE__*/React.createElement("div", {
    className: "vs-stage"
  }, /*#__PURE__*/React.createElement("div", {
    className: "vs-stage__header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "vs-stage__tour"
  }, state.won ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--color-gold)"
    }
  }, "Crown cast \u2014 advance to next Match") : /*#__PURE__*/React.createElement("span", null, "Pick a Contestant. The system advances automatically.")))), /*#__PURE__*/React.createElement("div", {
    className: "vs-stage__body"
  }, /*#__PURE__*/React.createElement(Contestant, {
    data: a,
    side: "left",
    state: state,
    onPick: pick
  }), /*#__PURE__*/React.createElement("div", {
    className: "vs-stage__glyph"
  }, "vs"), /*#__PURE__*/React.createElement(Contestant, {
    data: b,
    side: "right",
    state: state,
    onPick: pick
  })), !state.won && /*#__PURE__*/React.createElement("div", {
    className: "vote-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "vote-btn vote-btn--left",
    onClick: () => pick("left")
  }, /*#__PURE__*/React.createElement("small", null, "VOTE LEFT"), /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, a.name)), /*#__PURE__*/React.createElement("button", {
    className: "vote-btn vote-btn--right",
    onClick: () => pick("right")
  }, /*#__PURE__*/React.createElement("small", null, "VOTE RIGHT"), /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, b.name)))), /*#__PURE__*/React.createElement("div", {
    className: "arena__below"
  }, state.won ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MagneticButton, {
    size: "lg",
    onClick: next
  }, "Next Match \xB7 \uB2E4\uC74C \uB9E4\uCE58 \u2192"), /*#__PURE__*/React.createElement(MagneticButton, {
    variant: "ghost",
    size: "lg",
    onClick: finishToCrown
  }, "Jump to Crown Reveal")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MagneticButton, {
    variant: "ghost",
    size: "lg"
  }, "Share this Match"), /*#__PURE__*/React.createElement(MagneticButton, {
    variant: "secondary",
    size: "lg",
    onClick: () => setTab("pitch")
  }, "Back to Pitch")))));
}
Object.assign(window, {
  Arena
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Arena.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/CrownReveal.jsx
try { (() => {
/* Crown Reveal — final ceremony screen + Crown Card share artifact. */

function CrownReveal({
  setTab
}) {
  const champion = {
    name: "미나",
    initial: "MN"
  };
  return /*#__PURE__*/React.createElement("main", {
    className: "container",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("section", {
    className: "crown-stage"
  }, /*#__PURE__*/React.createElement("div", {
    className: "crown-stage__kicker"
  }, "THE CROWN GOES TO"), /*#__PURE__*/React.createElement("div", {
    className: "crown-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "crown-card__photo"
  }, champion.initial), /*#__PURE__*/React.createElement("div", {
    className: "crown-card__top"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/wc48-crown-filled.svg",
    alt: ""
  }), /*#__PURE__*/React.createElement("div", {
    className: "crown-card__label"
  }, "WORLDCROWN48 \xB7 CHAMPION")), /*#__PURE__*/React.createElement("div", {
    className: "crown-card__text"
  }, /*#__PURE__*/React.createElement("div", {
    className: "crown-card__name"
  }, champion.name.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "crown-card__tour"
  }, "\uCD5C\uACE0\uC758 \uD37C\uD3EC\uBA3C\uC2A4 \uBB34\uB300 \xB7 2026"), /*#__PURE__*/React.createElement("div", {
    className: "crown-card__bracket"
  }, "48 \u2192 24 \u2192 12 \u2192 6 \u2192 THE FINAL"), /*#__PURE__*/React.createElement("div", {
    className: "crown-card__sig"
  }, /*#__PURE__*/React.createElement("span", null), "WorldCrown48 \xB7 2026-05-26 KST", /*#__PURE__*/React.createElement("span", null)))), /*#__PURE__*/React.createElement("div", {
    className: "crown-actions"
  }, /*#__PURE__*/React.createElement(MagneticButton, {
    size: "xl"
  }, "Share My Crown"), /*#__PURE__*/React.createElement(MagneticButton, {
    variant: "secondary",
    size: "xl",
    onClick: () => setTab("pitch")
  }, "Open another Tournament")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 48,
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--color-text-muted)",
      letterSpacing: "0.2em",
      textAlign: "center"
    }
  }, "1080 \xD7 1350 \xB7 4:5 Instagram feed \xB7 framed in Crown Gold")));
}
Object.assign(window, {
  CrownReveal
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/CrownReveal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/LaunchPad.jsx
try { (() => {
/* Launch Pad — Domain 0 · pre-launch landing + email waitlist + manifesto */

function LaunchPad({
  setTab
}) {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  function onJoin(e) {
    e.preventDefault();
    if (!email) return;
    setJoined(true);
    setTimeout(() => setJoined(false), 2400);
  }
  return /*#__PURE__*/React.createElement("main", {
    className: "container",
    style: {
      position: "relative",
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("section", {
    className: "lp-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-kicker"
  }, "WORLDCROWN48 \xB7 GLOBAL FAN VOTING \xB7 LAUNCHING 2026"), /*#__PURE__*/React.createElement("h1", {
    className: "lp-title"
  }, "48 Contestants.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("em", null, "One Crown.")), /*#__PURE__*/React.createElement("p", {
    className: "lp-sub"
  }, "Most platforms predict winners. WorldCrown48 lets fans decide \u2014 one Match at a time. No odds. No betting. Pure fan choice."), /*#__PURE__*/React.createElement("form", {
    className: "lp-waitlist",
    onSubmit: onJoin
  }, /*#__PURE__*/React.createElement("input", {
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    placeholder: "you@worldcrown48.com",
    disabled: joined
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: joined
  }, joined ? "✓ Joined" : "Join the waitlist")), /*#__PURE__*/React.createElement("div", {
    className: "lp-stats"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "lp-stat__num"
  }, "48"), /*#__PURE__*/React.createElement("div", {
    className: "lp-stat__lbl"
  }, "Contestants per Tournament")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "lp-stat__num"
  }, "5"), /*#__PURE__*/React.createElement("div", {
    className: "lp-stat__lbl"
  }, "Rounds \xB7 48\u219224\u219212\u21926\u2192FINAL")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "lp-stat__num"
  }, "2026"), /*#__PURE__*/React.createElement("div", {
    className: "lp-stat__lbl"
  }, "North American Season")))), /*#__PURE__*/React.createElement("section", {
    className: "manifesto"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      color: "var(--color-text-muted)",
      fontWeight: 400
    }
  }, "Most platforms focus on:"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 26,
      color: "var(--color-text-sub)",
      marginTop: 8,
      opacity: 0.7,
      fontWeight: 400
    }
  }, "Predicting the winner."), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 60,
      height: 1,
      background: "var(--color-gold)",
      margin: "40px auto"
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontSize: "clamp(40px, 6vw, 84px)",
      color: "var(--color-text)",
      lineHeight: 1,
      letterSpacing: "-0.025em",
      fontWeight: 400
    }
  }, "We let fans"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "clamp(72px, 11vw, 144px)",
      color: "var(--color-gold)",
      marginTop: 4,
      lineHeight: 0.95,
      letterSpacing: "-0.045em",
      fontWeight: 900,
      textShadow: "0 0 60px rgba(252,208,6,0.25)"
    }
  }, "DECIDE.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      justifyContent: "center",
      marginBottom: 64
    }
  }, /*#__PURE__*/React.createElement(MagneticButton, {
    size: "lg",
    onClick: () => setTab("pitch")
  }, "Open the Pitch"), /*#__PURE__*/React.createElement(MagneticButton, {
    variant: "secondary",
    size: "lg",
    onClick: () => setTab("arena")
  }, "Try a Match")));
}
Object.assign(window, {
  LaunchPad
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/LaunchPad.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Pitch.jsx
try { (() => {
/* The Pitch — Domain 1 · trending Tournament grid. Strictly v2.3 compliant:
   - NO LIVE badge anywhere — WC48 does not live-stream
   - NO Round progress
   - NO AI-Report on cards — article footers only
   - {N} Contestants + Tournament Deadline meta only
*/

function TournamentCard({
  t,
  onOpen
}) {
  return /*#__PURE__*/React.createElement("article", {
    className: "tcard",
    onClick: onOpen
  }, /*#__PURE__*/React.createElement("div", {
    className: "tcard__cover",
    style: {
      background: `linear-gradient(135deg, ${t.coverA[0]}, ${t.coverA[1]} 60%, var(--color-bg-soft))`
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tcard__cover-vs"
  }, "48"), /*#__PURE__*/React.createElement("div", {
    className: "tcard__chips"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tcard__cat"
  }, t.cat), /*#__PURE__*/React.createElement(StatusPill, {
    status: t.status
  }))), /*#__PURE__*/React.createElement("div", {
    className: "tcard__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tcard__title"
  }, t.title), /*#__PURE__*/React.createElement("div", {
    className: "tcard__meta"
  }, /*#__PURE__*/React.createElement("span", null, t.contestants, " Contestants"), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", null, "Closes ", t.deadline)), /*#__PURE__*/React.createElement("div", {
    className: "tcard__foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "tcard__enter"
  }, "ENTER ", /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "4",
    y1: "12",
    x2: "19",
    y2: "12"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "13 6 19 12 13 18"
  }))))));
}
function Pitch({
  setTab
}) {
  const ts = window.WC_DATA.TOURNAMENTS;
  const featured = ts[0];
  const live = ts.filter(t => t.status === "active");
  const pub = ts.filter(t => t.status === "published");
  return /*#__PURE__*/React.createElement("main", {
    className: "container",
    style: {
      flex: 1,
      paddingBottom: 64
    }
  }, /*#__PURE__*/React.createElement("section", {
    style: {
      marginTop: 32,
      position: "relative",
      overflow: "hidden",
      border: "1px solid var(--color-border)",
      borderRadius: 5,
      padding: 48,
      background: "var(--color-bg-default)",
      boxShadow: "var(--shadow-card)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background: "radial-gradient(ellipse 50% 80% at 90% 50%, rgba(252,208,6,0.18), transparent 60%), radial-gradient(ellipse 40% 60% at 10% 80%, rgba(215,6,58,0.16), transparent 65%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: 720
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "kicker"
  }, featured.cat, " \xB7 TOURNAMENT OF THE WEEK"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontWeight: 900,
      fontSize: "clamp(40px, 5vw, 64px)",
      lineHeight: 1.02,
      letterSpacing: "-0.025em",
      margin: "12px 0 14px",
      color: "var(--color-text)"
    }
  }, featured.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      color: "var(--color-text-sub)",
      lineHeight: 1.55,
      maxWidth: 560,
      marginBottom: 24
    }
  }, "48 Contestants. Five Rounds. The Voter advances Match by Match until one Crown remains."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(MagneticButton, {
    size: "lg",
    onClick: () => setTab("arena")
  }, "Vote Now"), /*#__PURE__*/React.createElement(MagneticButton, {
    size: "lg",
    variant: "secondary"
  }, "View Contestants")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 16,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: featured.status
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--color-text-sub)",
      letterSpacing: "0.06em"
    }
  }, "48 Contestants \xB7 Closes ", featured.deadline)))), /*#__PURE__*/React.createElement("div", {
    className: "section-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "kicker"
  }, "\uC9C4\uD589 \uC911 \xB7 The Pitch"), /*#__PURE__*/React.createElement("h2", {
    className: "section-head__title"
  }, "Active Tournaments")), /*#__PURE__*/React.createElement("span", {
    className: "section-head__sub"
  }, live.length, " active \xB7 ", pub.length, " publishing soon")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 20
    }
  }, live.map(t => /*#__PURE__*/React.createElement(TournamentCard, {
    key: t.id,
    t: t,
    onOpen: () => setTab("arena")
  }))), /*#__PURE__*/React.createElement("div", {
    className: "section-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "kicker"
  }, "\uB300\uAE30 \uC911 \xB7 Tuning"), /*#__PURE__*/React.createElement("h2", {
    className: "section-head__title"
  }, "Publishing soon"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 20
    }
  }, pub.map(t => /*#__PURE__*/React.createElement(TournamentCard, {
    key: t.id,
    t: t,
    onOpen: () => setTab("arena")
  }))));
}
Object.assign(window, {
  Pitch,
  TournamentCard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Pitch.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/components.jsx
try { (() => {
/* Shared components — Nav, Footer, ArticleAIByline, etc.
   v2.3: AI-Report appears ONLY on the footer of a news article.
   Never on cards, banners, or boxes. */

const {
  useState,
  useEffect,
  useRef,
  useCallback
} = React;
function Nav({
  tab,
  setTab
}) {
  const links = [{
    id: "pitch",
    label: "Pitch"
  }, {
    id: "arena",
    label: "The Arena"
  }, {
    id: "crown",
    label: "Crown"
  }, {
    id: "launch",
    label: "Launch Pad"
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "gnb-wrap"
  }, /*#__PURE__*/React.createElement("nav", {
    className: "gnb"
  }, /*#__PURE__*/React.createElement("button", {
    className: "gnb__brand",
    onClick: () => setTab("launch")
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/wc48-crown-filled.svg",
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    className: "gnb__wm"
  }, "WorldCrown48")), /*#__PURE__*/React.createElement("div", {
    className: "gnb__sep"
  }), links.map(l => /*#__PURE__*/React.createElement("button", {
    key: l.id,
    className: `gnb__link ${tab === l.id ? "is-active" : ""}`,
    onClick: () => setTab(l.id)
  }, l.label)), /*#__PURE__*/React.createElement("div", {
    className: "gnb__sep"
  }), /*#__PURE__*/React.createElement("button", {
    className: "gnb__cta",
    onClick: () => setTab("arena")
  }, "Vote Now")));
}
function MagneticButton({
  children,
  variant = "primary",
  size,
  fullWidth,
  onClick,
  disabled,
  style
}) {
  const ref = useRef(null);
  const [t, setT] = useState({
    x: 0,
    y: 0
  });
  const onMove = e => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.06;
    const y = (e.clientY - r.top - r.height / 2) * 0.06;
    setT({
      x,
      y
    });
  };
  const reset = () => setT({
    x: 0,
    y: 0
  });
  const cls = ["btn"];
  if (variant === "secondary") cls.push("btn--secondary");
  if (variant === "ghost") cls.push("btn--ghost");
  if (variant === "crimson") cls.push("btn--crimson");
  if (size === "lg") cls.push("btn--lg");
  if (size === "xl") cls.push("btn--xl");
  return /*#__PURE__*/React.createElement("button", {
    ref: ref,
    className: cls.join(" "),
    onClick: onClick,
    disabled: disabled,
    onMouseMove: onMove,
    onMouseLeave: reset,
    style: {
      transform: `translate(${t.x}px, ${t.y}px)`,
      width: fullWidth ? "100%" : undefined,
      ...style
    }
  }, children);
}
function StatusPill({
  status
}) {
  if (status === "active") return /*#__PURE__*/React.createElement("span", {
    className: "pill is-gold"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "active");
  if (status === "published") return /*#__PURE__*/React.createElement("span", {
    className: "pill"
  }, "published");
  if (status === "draft") return /*#__PURE__*/React.createElement("span", {
    className: "pill"
  }, "draft");
  if (status === "closed") return /*#__PURE__*/React.createElement("span", {
    className: "pill is-warn"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "closed");
  if (status === "completed") return /*#__PURE__*/React.createElement("span", {
    className: "pill is-ok"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "completed");
  return null;
}
function ArticleAIByline({
  timestamp
}) {
  // ✦ AI-Report — ONLY allowed on the footer of a news article. Never on cards/banners/boxes.
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--color-gold)",
      borderTop: "1px solid rgba(252,208,6,0.2)",
      paddingTop: 8,
      letterSpacing: "0.18em"
    }
  }, "\u2726 AI-Report", timestamp ? ` · ${timestamp}` : "");
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    className: "foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container foot__row"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/wc48-crown-circle-outline.svg",
    alt: ""
  }), /*#__PURE__*/React.createElement("span", null, "WorldCrown48 \xB7 \uC6D4\uD06C48"), /*#__PURE__*/React.createElement("span", {
    className: "foot__sep"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", null, "worldcrown48.com"), /*#__PURE__*/React.createElement("span", {
    className: "foot__sep"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "foot__status"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "SYSTEM OPERATIONAL"), /*#__PURE__*/React.createElement("span", {
    className: "spacer-grow",
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", null, "\xA9 2026 \xB7 v2.3 Twilight Stadium")));
}
Object.assign(window, {
  Nav,
  MagneticButton,
  StatusPill,
  ArticleAIByline,
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/components.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/data.jsx
try { (() => {
/* Mock data — strictly v2.3 compliant. */

const TOURNAMENTS = [{
  id: "t1",
  cat: "K-POP",
  title: "최고의 퍼포먼스 무대 · 2026",
  titleKo: "최고의 퍼포먼스 무대",
  contestants: 48,
  deadline: "Jun 30",
  status: "active",
  coverA: ["rgba(252,208,6,0.22)", "rgba(215,6,58,0.14)"]
}, {
  id: "t2",
  cat: "K-POP",
  title: "Idol of the Decade",
  titleKo: "케이팝 아이돌 어브 더 디케이드",
  contestants: 48,
  deadline: "Jul 04",
  status: "active",
  coverA: ["rgba(0,163,183,0.22)", "rgba(238,218,125,0.10)"]
}, {
  id: "t3",
  cat: "OTHER",
  title: "올해의 무대",
  titleKo: "올해의 무대",
  contestants: 48,
  deadline: "Jul 11",
  status: "published",
  coverA: ["rgba(54,34,97,0.7)", "rgba(0,0,58,0.4)"]
}, {
  id: "t4",
  cat: "OTHER",
  title: "레전드 콘서트",
  titleKo: "레전드 콘서트",
  contestants: 48,
  deadline: "Aug 02",
  status: "active",
  coverA: ["rgba(0,163,183,0.18)", "rgba(215,6,58,0.10)"]
}, {
  id: "t5",
  cat: "K-POP",
  title: "베스트 보컬 라인",
  titleKo: "베스트 보컬 라인",
  contestants: 48,
  deadline: "Aug 15",
  status: "published",
  coverA: ["rgba(238,218,125,0.18)", "rgba(54,34,97,0.5)"]
}, {
  id: "t6",
  cat: "K-POP",
  title: "Producers of the Year",
  titleKo: "프로듀서 어브 더 이어",
  contestants: 48,
  deadline: "Aug 30",
  status: "published",
  coverA: ["rgba(215,6,58,0.18)", "rgba(0,0,58,0.4)"]
}];
const CONTESTANTS = [
// pairings — 24 matches in ROUND OF 48
{
  id: "c01",
  name: "슬기",
  meta: "KR · VOCAL · MAIN",
  initial: "SG",
  side: "left"
}, {
  id: "c02",
  name: "미나",
  meta: "JP · DANCE · MAIN",
  initial: "MN",
  side: "right"
}, {
  id: "c03",
  name: "카리나",
  meta: "KR · RAP · LEAD",
  initial: "KA",
  side: "left"
}, {
  id: "c04",
  name: "윈터",
  meta: "KR · VOCAL · MAIN",
  initial: "WT",
  side: "right"
}, {
  id: "c05",
  name: "제니",
  meta: "KR · DANCE · LEAD",
  initial: "JN",
  side: "left"
}, {
  id: "c06",
  name: "태연",
  meta: "KR · VOCAL · LEAD",
  initial: "TY",
  side: "right"
}, {
  id: "c07",
  name: "리사",
  meta: "TH · DANCE · MAIN",
  initial: "LS",
  side: "left"
}, {
  id: "c08",
  name: "민지",
  meta: "KR · RAP · MAIN",
  initial: "MJ",
  side: "right"
}];
window.WC_DATA = {
  TOURNAMENTS,
  CONTESTANTS
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/data.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AIReportFooter = __ds_scope.AIReportFooter;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.StatusPill = __ds_scope.StatusPill;

__ds_ns.TournamentCard = __ds_scope.TournamentCard;

__ds_ns.VSBattle = __ds_scope.VSBattle;

})();


/* --- BannerSlot (appended) — 970x90 desktop / 320x100 mobile portrait --- */
(() => {
  const ns = (window.WorldCrown48DesignSystem_ea92b8 = window.WorldCrown48DesignSystem_ea92b8 || {});
  const COPY = {"ko":{"out":"로그인하면 크라운 카드를 간직하고, 대회마다 하루 5번 참여할 수 있어요","in":"대회를 마치면 크라운 카드가 생겨요 — 친구에게 공유해 보세요"},"en":{"out":"Sign in to keep your Crown Card and pick 5 times a day in every Tournament","in":"Finish the Tournament and your Crown Card appears — share it with a friend"},"es":{"out":"Inicia sesión para guardar tu Crown Card y elegir 5 veces al día en cada Tournament","in":"Al terminar el Tournament aparece tu Crown Card — compártela con alguien"}};
  ns.BannerSlot = function BannerSlot(props) {
    const p = props || {};
    const mobile = p.variant === "mobile";
    const copy = (COPY[p.lang] || COPY.ko)[p.state === "signed-in" ? "in" : "out"];
    const rest = Object.assign({}, p);
    delete rest.variant; delete rest.state; delete rest.lang; delete rest.children; delete rest.style;
    return React.createElement("div", Object.assign({}, rest, {
      style: Object.assign({
        width: mobile ? 320 : 970,
        height: mobile ? 100 : 90,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: mobile ? "0 18px" : "0 28px",
        border: "1px dashed rgba(255,255,255,.16)",
        background: "rgba(36,23,84,.4)"
      }, p.style)
    }), React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: mobile ? 13 : 14,
        lineHeight: 1.5,
        color: "var(--color-text-sub, #DDDDEA)",
        textAlign: "center"
      }
    }, p.children || copy));
  };
})();
