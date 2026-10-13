/* GNB — NAV-2 (v1.9 · 2026-10-13). Dark on every screen. One source for menubar + drawer.
   Menubar: full-bleed (desktop left/right 0 · top 20 · h 64 — mobile left/right 12 · top 10 · h 48). Items: The Pitch · The Arena · [The Lab, admin only] · Record Room ▾ · Newsroom · Locker Room. ▾ only on Record Room.
   Drawer: width 300 (mobile 230). ✕ sits exactly on ☰ (desktop x 10–54 · y 20–84 — mobile x 17–57 · y 10–50); brand sits exactly on the menubar brand (desktop x 55 · mobile x 65) — same Brand part.
   Rows: top-level icon start x 36 (text 66) · sub rows 84 · language/logout 36. Icons: Lucide 20px / 1.75, text color, dim rows .45 — no tag text.
   Motion: open 220ms · close 180ms · cubic-bezier(.2,.8,.2,1) · scrim on the same clock · prefers-reduced-motion → none.
   Close ONLY via scrim · ✕ · Esc. Rows with children toggle; leaf + admin rows move the current mark and keep the drawer open. */
const h = React.createElement;
  const NAV = [
    { label: "The Pitch" },
    { label: "The Arena", children: ["Arena Home", "K-POP", "CREATOR"] },
    { label: "Record Room", children: ["Charts", "Hall of Fame"], menu: ["Charts", "Hall of Fame"] },
    { label: "Newsroom", children: ["All Articles", "Rankings", "Records", "Stars", "Tournaments", "World Press"] },
    { label: "Locker Room" },
    { label: "Policy Hub", drawerOnly: true, children: ["개인정보처리방침", "이용약관", "커뮤니티 가이드", "쿠키 정책"] }
  ];
  const NEWS = {
    en: ["All Articles", "Rankings", "Records", "Stars", "Tournaments", "World Press"],
    ko: ["전체 기사", "랭킹", "기록", "스타", "토너먼트", "외신"],
    es: ["Todos los artículos", "Clasificación", "Registros", "Estrellas", "Tournaments", "Prensa internacional"]
  };
  const DIM = ["K-POP", "CREATOR", "Hall of Fame", "Rankings", "Records", "Stars", "Tournaments", "World Press", "랭킹", "기록", "스타", "토너먼트", "외신", "Clasificación", "Registros", "Estrellas", "Prensa internacional"];
  const DIM_OPACITY = 0.45;
  const ADMIN = ["The Lab", "Admin Dashboard", "News Desk"];
  const ICONS = {
    "The Pitch": ["layout-grid", "M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"],
    "The Arena": ["square-split-horizontal", "M8 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3", "M16 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3", "M12 4v16"],
    "Record Room": ["bar-chart-3", "M3 3v18h18", "M18 17V9", "M13 17V5", "M8 17v-3"],
    "Newsroom": ["newspaper", "M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2", "M18 14h-8", "M15 18h-5", "M10 6h8v4h-8V6Z"],
    "Locker Room": ["user", "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"],
    "Policy Hub": ["shield-check", "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z", "m9 12 2 2 4-4"],
    "The Lab": ["flask-conical", "M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2", "M8.5 2h7", "M7 16h10"],
    "Admin Dashboard": ["layout-dashboard", "M3 3h7v9H3z", "M14 3h7v5h-7z", "M14 12h7v9h-7z", "M3 16h7v5H3z"],
    "News Desk": ["pen-line", "M12 20h9", "M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"]
  };
  const EASE = "cubic-bezier(.2,.8,.2,1)", OPEN_MS = 220, CLOSE_MS = 180;
  const M = {
    desktop: { top: 20, barH: 64, gapBar: 26, burger: 44, line: 18, lineGap: 5, crown: 26, word: 15, brandGap: 10, brandPull: -25, drawerW: 300, headH: 84, headPadL: 10, headGap: 26, xSize: 44, xFont: 22, rowPad: 36, subPad: 84, rowPadR: 16, footPad: "14px 16px 14px 36px", langFont: 11, langPad: "7px 14px" },
    mobile:  { top: 10, barH: 48, gapBar: 8, burger: 40, line: 16, lineGap: 4, crown: 20, word: 13, brandGap: 8, brandPull: 0, drawerW: 230, headH: 58, headPadL: 17, headGap: 8, xSize: 40, xFont: 20, rowPad: 36, subPad: 84, rowPadR: 14, footPad: "14px 14px 14px 36px", langFont: 10, langPad: "5px 8px" }
  };
  const reduced = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CROWN = "assets/wc48-crown-filled.svg";
  function Icon(p) {
    const d = ICONS[p.name]; if (!d) return null;
    return h("svg", { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: p.color, strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round", style: { flex: "none", display: "block" }, "aria-hidden": "true" }, d.slice(1).map((x, i) => h("path", { key: i, d: x })));
  }
  function Brand(p) {
    const m = M[p.variant || "desktop"];
    return h("div", { style: { display: "flex", alignItems: "center", gap: m.brandGap, marginLeft: m.brandPull } },
      h("img", { src: p.crownSrc || CROWN, alt: "", style: { width: m.crown, height: m.crown, display: "block" } }),
      h("span", { style: { fontSize: m.word, fontWeight: 800, letterSpacing: "-.01em", color: "#F2F2F5", whiteSpace: "nowrap" } }, "WorldCrown48"));
  }
  function Dropdown(p) {
    return h("div", { style: { position: "absolute", left: 0, top: "calc(100% + 24px)", width: 240, padding: "8px 0", boxSizing: "border-box", background: "#0E0944", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 20px 48px rgba(0,0,0,.5)", zIndex: 20, display: "flex", flexDirection: "column" } },
      p.items.map(label => { const dim = DIM.indexOf(label) >= 0, cur = label === p.current;
        return h("div", { key: label, style: { display: "flex", alignItems: "center", height: 34, padding: "0 16px", boxSizing: "border-box", borderLeft: cur ? "2px solid rgba(255,255,255,.55)" : "2px solid transparent", opacity: dim ? DIM_OPACITY : 1, cursor: dim ? "default" : "pointer" } },
          h("span", { style: { fontSize: 13, fontWeight: cur ? 700 : 500, color: cur ? "#fff" : "#B1B5C4" } }, label)); }));
  }
  function Menubar(p) {
    p = p || {}; const v = p.variant === "mobile" ? "mobile" : "desktop"; const m = M[v]; const mob = v === "mobile";
    const current = p.current || "The Arena"; const open = !!p.open;
    const items = NAV.filter(n => !n.drawerOnly).reduce((a, n) => (a.push(n), p.admin && n.label === "The Arena" && a.push({ label: "The Lab" }), a), []);
    const burger = h("div", { onClick: p.onMenu, style: { width: m.burger, height: m.burger, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, background: open ? "rgba(255,255,255,.10)" : "transparent", cursor: "pointer" } },
      h("div", { style: { display: "flex", flexDirection: "column", gap: m.lineGap, width: m.line } }, [0, 1, 2].map(i => h("span", { key: i, style: { display: "block", height: 1.75, background: "#EAEAF2" } }))));
    const right = h("div", { style: { marginLeft: "auto", display: "flex", alignItems: "center", gap: mob ? 8 : 12 } },
      h("span", { style: { fontFamily: "'JetBrains Mono',monospace", fontSize: m.langFont, letterSpacing: ".14em", color: "#B1B5C4", padding: m.langPad, border: mob ? "1px solid rgba(255,255,255,.14)" : "1px solid #FFFFFF38", borderRadius: 999, position: "relative", right: mob ? 0 : 20, transform: mob ? "none" : "scale(1.2)", transformOrigin: "right center" } }, p.lang || "KO"),
      p.signInLabel
        ? h("span", { style: { height: mob ? 30 : 36, display: "flex", alignItems: "center", padding: mob ? "0 12px" : "0 18px", border: "1px solid rgba(255,255,255,.28)", borderRadius: 999, fontSize: mob ? 12 : 14, fontWeight: 600, color: "#EAEAF2", whiteSpace: "nowrap" } }, p.signInLabel)
        : h("span", { style: { width: 32, height: 32, borderRadius: 999, background: "linear-gradient(180deg,#362261,#241754)", border: "1px solid rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: mob ? 10 : 11, fontWeight: 600, color: "#EAEAF2", position: "relative", right: mob ? 0 : 15, transform: mob ? "none" : "scale(1.2)", transformOrigin: "right center", flex: "none" } }, p.avatar || "MJ"));
    const nav = mob ? null : h("div", { style: { display: "flex", alignItems: "center", gap: 26, fontSize: 14, color: "#B1B5C4" } }, items.map(n => {
      const cur = n.label === current, c = cur ? "#fff" : "#B1B5C4";
      return h("span", { key: n.label, style: { position: "relative", display: "flex", alignItems: "center", gap: 5, color: c, fontWeight: cur ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap" } }, n.label,
        n.menu ? h("span", { style: { fontSize: 9, lineHeight: 1, color: c } }, "▾") : null,
        n.menu && p.dropdown === n.label ? h(Dropdown, { items: n.menu, current: p.currentSub }) : null);
    }));
    return h("div", { style: Object.assign({ position: "absolute", left: mob ? 12 : 0, right: mob ? 12 : 0, top: m.top, height: m.barH, boxSizing: "border-box", display: "flex", alignItems: "center", gap: m.gapBar, padding: mob ? "0 6px 0 4px" : "0 10px 0 9px", border: "1px solid rgba(255,255,255,.08)", borderRadius: 2, background: mob ? "linear-gradient(90deg, #171740, #16163C)" : "linear-gradient(90deg, #0F0F1D, #171740)", color: "#F2F2F5", fontFamily: "Inter,Pretendard,'Apple SD Gothic Neo',sans-serif", zIndex: 10 }, p.style) },
      burger, h(Brand, { variant: v, crownSrc: p.crownSrc }), nav, right);
  }
  function Drawer(p) {
    p = p || {}; const v = p.variant === "mobile" ? "mobile" : "desktop"; const m = M[v];
    const lang = (p.lang || "ko").toLowerCase();
    const useState = React.useState, useEffect = React.useEffect;
    const [ex, setEx] = useState(Object.assign({}, p.expanded || {}));
    const [pg, setPg] = useState(p.current || "The Arena");
    const open = !!p.open;
    useEffect(() => {
      if (!open) return;
      const k = e => { if (e.key === "Escape" && p.onClose) p.onClose(); };
      window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
    }, [open]);
    const ms = open ? OPEN_MS : CLOSE_MS, tr = reduced() ? null : (ms + "ms " + EASE);
    const kids = n => n.label === "Newsroom" ? (NEWS[lang] || NEWS.en) : n.children;
    const rows = [];
    NAV.forEach(n => {
      const isOpen = !!ex[n.label], cur = n.label === pg, col = cur ? "#FFFFFF" : "#D8D9E4";
      rows.push({ label: n.label, toggle: !!n.children, isOpen, hgt: 44, padL: m.rowPad, fs: 15, fw: cur ? 700 : 500, color: col, mark: cur, op: 1, cursor: "pointer", icon: true,
        onClick: n.children ? () => setEx(s => Object.assign({}, s, { [n.label]: !s[n.label] })) : () => { setPg(n.label); p.onNavigate && p.onNavigate(n.label); } });
      if (isOpen && n.children) kids(n).forEach(c => { const dim = DIM.indexOf(c) >= 0, cc = c === pg;
        rows.push({ label: c, toggle: false, hgt: 34, padL: m.subPad, fs: 13, fw: cc ? 700 : 500, color: cc ? "#FFFFFF" : "#B1B5C4", mark: cc, op: dim ? DIM_OPACITY : 1, cursor: dim ? "default" : "pointer", icon: false,
          onClick: dim ? null : () => { setPg(c); p.onNavigate && p.onNavigate(c); } }); });
    });
    const row = (r, i) => h("div", { key: i, onClick: r.onClick, style: { display: "flex", alignItems: "center", gap: 10, height: r.hgt, padding: "0 " + m.rowPadR + "px 0 " + r.padL + "px", cursor: r.cursor, opacity: r.op, borderLeft: r.mark ? "2px solid rgba(255,255,255,.55)" : "2px solid transparent", boxSizing: "border-box" } },
      r.icon ? h(Icon, { name: r.label, color: r.color }) : null,
      h("span", { style: { fontSize: r.fs, fontWeight: r.fw, color: r.color } }, r.label),
      r.toggle ? h("span", { style: { marginLeft: "auto", fontSize: 10, color: "#8E90A6", transform: r.isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 160ms ease" } }, "▸") : null);
    const adminRows = p.admin ? ADMIN.map(l => { const cur = l === pg; return { label: l, toggle: false, hgt: 44, padL: m.rowPad, fs: 15, fw: cur ? 700 : 500, color: cur ? "#FFFFFF" : "#D8D9E4", mark: cur, op: 1, cursor: "pointer", icon: true, onClick: () => { setPg(l); p.onNavigate && p.onNavigate(l); } }; }) : [];
    const chip = l => h("span", { key: l, onClick: () => p.onLang && p.onLang(l.toLowerCase()), style: { padding: "5px 9px", border: "1px solid rgba(255,255,255,.14)", background: l.toLowerCase() === lang ? "rgba(255,255,255,.16)" : "transparent", color: l.toLowerCase() === lang ? "#fff" : "#8E90A6", cursor: "pointer" } }, l);
    return h("div", { style: Object.assign({ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 29 }, p.style) },
      h("div", { "data-wc-scrim": "1", onClick: p.onClose, style: { position: "absolute", inset: 0, background: "rgba(11,16,32,.72)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: tr ? "opacity " + tr : "none" } }),
      h("div", { "data-wc-drawer": "1", style: { position: "absolute", left: 0, top: 0, bottom: 0, width: m.drawerW, boxSizing: "border-box", borderRight: "1px solid rgba(255,255,255,.10)", boxShadow: "24px 0 64px rgba(0,0,0,.5)", display: "flex", flexDirection: "column", backgroundColor: "#080823", color: "#F2F2F5", fontFamily: "Inter,Pretendard,'Apple SD Gothic Neo',sans-serif", pointerEvents: open ? "auto" : "none", transform: open ? "translateX(0)" : "translateX(-100%)", transition: tr ? "transform " + tr : "none" } },
        h("div", { style: { height: m.headH, flex: "none", display: "flex", alignItems: "center", gap: m.headGap, padding: (m.top + 1) + "px 0 0 " + m.headPadL + "px", boxSizing: "border-box", borderBottom: "1px solid rgba(255,255,255,.08)" } },
          h("div", { onClick: p.onClose, style: { width: m.xSize, height: m.xSize, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, fontSize: m.xFont, lineHeight: 1, color: "#EAEAF2", cursor: "pointer" } }, "×"),
          h(Brand, { variant: v, crownSrc: p.crownSrc })),
        h("div", { style: { flex: 1, padding: "10px 0", overflowY: "auto" } },
          rows.map(row),
          p.admin ? h("div", { style: { margin: "10px 16px 10px " + m.rowPad + "px", height: 1, background: "rgba(255,255,255,.10)" } }) : null,
          adminRows.map((r, i) => row(r, "a" + i))),
        h("div", { style: { borderTop: "1px solid rgba(255,255,255,.08)", padding: m.footPad, display: "flex", flexDirection: "column", gap: 12 } },
          h("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, h("span", { style: { fontSize: 13, color: "#B1B5C4" } }, "언어"),
            h("div", { style: { marginLeft: "auto", display: "flex", gap: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".12em" } }, ["KO", "EN", "ES"].map(chip))),
          h("span", { style: { fontSize: 14, color: "#D8D9E4" } }, "로그아웃"))));
  }

module.exports = { GNB: { Menubar, Drawer, Dropdown, Brand, Icon, NAV, NEWS, DIM, DIM_OPACITY, ADMIN, ICONS, METRICS: M, MOTION: { open: OPEN_MS, close: CLOSE_MS, ease: EASE } }, Menubar, Drawer };
