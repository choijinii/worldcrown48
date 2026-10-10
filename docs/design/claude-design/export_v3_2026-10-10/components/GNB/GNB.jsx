/* GNB — NAV-1 (2026-10-10). Dark on every screen, light pages included.
   Menubar (desktop): The Pitch · The Arena ▾ · [The Lab — admin only, after The Arena] · Record Room ▾ · Newsroom ▾ · Locker Room
   ▾ only on the three items that own a dropdown. Dropdown shows sub-menus ONLY (no categories):
     The Arena ▾   → Arena Home
     Record Room ▾ → Charts · Hall of Fame (dim)
     Newsroom ▾    → All Articles
   Drawer (all breakpoints): full tree incl. categories; rows with no page yet are dimmed (opacity .45, no tag text).
   Admin group under a divider: The Lab · Admin Dashboard · News Desk.
   No dropdown on mobile — drawer only. */

const NAV = [
  { label: "The Pitch" },
  { label: "The Arena", children: ["Arena Home", "K-POP", "CREATOR"], menu: ["Arena Home"] },
  { label: "Record Room", children: ["Charts", "Hall of Fame"], menu: ["Charts", "Hall of Fame"] },
  { label: "Newsroom", children: ["All Articles", "Rankings", "Records", "Stars", "Tournaments", "World Press"], menu: ["All Articles"] },
  { label: "Locker Room" },
  { label: "Policy Hub", drawerOnly: true, children: ["개인정보처리방침", "이용약관", "커뮤니티 가이드", "쿠키 정책"] }
];
const DIM = ["K-POP", "CREATOR", "Hall of Fame", "Rankings", "Records", "Stars", "Tournaments", "World Press"];
const DIM_OPACITY = 0.45;
const ADMIN = ["The Lab", "Admin Dashboard", "News Desk"];

function Caret({ color }) {
  return <span style={{ fontSize: 9, lineHeight: 1, color }}>▾</span>;
}

function Dropdown({ items, current }) {
  return (
    <div style={{ position: "absolute", left: 0, top: "calc(100% + 24px)", width: 240, padding: "8px 0", boxSizing: "border-box", background: "#0E0944", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 20px 48px rgba(0,0,0,.5)", zIndex: 20, display: "flex", flexDirection: "column" }}>
      {items.map(label => {
        const dim = DIM.includes(label);
        const cur = label === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", height: 34, padding: "0 16px", boxSizing: "border-box", borderLeft: cur ? "2px solid rgba(255,255,255,.55)" : "2px solid transparent", opacity: dim ? DIM_OPACITY : 1, cursor: dim ? "default" : "pointer" }}>
            <span style={{ fontSize: 13, fontWeight: cur ? 700 : 500, color: cur ? "#fff" : "#B1B5C4" }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Desktop menubar. open = label of the item whose dropdown is shown; currentSub = highlighted sub-menu row. */
function Menubar({ current = "The Arena", admin = false, open = null, currentSub = null, lang = "KO", avatar = "MJ", signInLabel = null, style }) {
  const items = NAV.filter(n => !n.drawerOnly).flatMap(n => (admin && n.label === "The Arena" ? [n, { label: "The Lab" }] : [n]));
  return (
    <div style={{ width: 1320, height: 64, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 26, padding: "0 10px 0 14px", border: "1px solid rgba(255,255,255,.08)", borderRadius: 2, background: "linear-gradient(90deg, #0F0F1D, #171740)", color: "#F2F2F5", fontFamily: "var(--font-sans)", ...style }}>
      <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, cursor: "pointer" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, width: 18 }}>
          {[0, 1, 2].map(i => <span key={i} style={{ display: "block", height: 1.75, background: "#EAEAF2" }} />)}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src="../../assets/wc48-crown-filled.svg" alt="" style={{ width: 26, height: 26, display: "block" }} />
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.01em" }}>WorldCrown48</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 26, fontSize: 14, color: "#B1B5C4" }}>
        {items.map(n => {
          const cur = n.label === current;
          const c = cur ? "#fff" : "#B1B5C4";
          return (
            <span key={n.label} style={{ position: "relative", display: "flex", alignItems: "center", gap: 5, color: c, fontWeight: cur ? 600 : 400, cursor: "pointer" }}>
              {n.label}
              {n.menu && <Caret color={c} />}
              {n.menu && open === n.label && <Dropdown items={n.menu} current={currentSub} />}
            </span>
          );
        })}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".14em", color: "#B1B5C4", padding: "7px 14px", border: "1px solid #FFFFFF38", borderRadius: 999, position: "relative", right: 20, transform: "scale(1.2)", transformOrigin: "right center" }}>{lang}</span>
        {signInLabel ? (
          <span style={{ height: 36, display: "flex", alignItems: "center", padding: "0 18px", border: "1px solid rgba(255,255,255,.28)", borderRadius: 999, fontSize: 14, fontWeight: 600, color: "#EAEAF2" }}>{signInLabel}</span>
        ) : (
          <span style={{ width: 32, height: 32, borderRadius: 999, background: "linear-gradient(180deg,#362261,#241754)", border: "1px solid rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "#EAEAF2", position: "relative", right: 15, transform: "scale(1.2)", transformOrigin: "right center", flex: "none" }}>{avatar}</span>
        )}
      </div>
    </div>
  );
}

/** Drawer. expanded = { "Record Room": true, ... }. */
function Drawer({ current = "The Arena", expanded = {}, admin = false, width = 320, height = 1160, lang = "KO", style }) {
  const rows = [];
  NAV.forEach(n => {
    const open = !!expanded[n.label];
    const cur = n.label === current;
    rows.push({ label: n.label, h: 44, padL: 16, fs: 15, fw: cur ? 700 : 500, color: cur ? "#fff" : "#D8D9E4", mark: cur ? "2px solid rgba(255,255,255,.55)" : "2px solid transparent", toggle: !!n.children, open, op: 1, cur: "pointer" });
    if (open && n.children) n.children.forEach(c => rows.push({ label: c, h: 34, padL: 64, fs: 13, fw: 500, color: "#B1B5C4", mark: "2px solid transparent", op: DIM.includes(c) ? DIM_OPACITY : 1, cur: DIM.includes(c) ? "default" : "pointer" }));
  });
  return (
    <div style={{ width, height, boxSizing: "border-box", background: "#0E0944", borderRight: "1px solid rgba(255,255,255,.10)", boxShadow: "24px 0 64px rgba(0,0,0,.5)", display: "flex", flexDirection: "column", color: "#F2F2F5", fontFamily: "var(--font-sans)", ...style }}>
      <div style={{ height: 64, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, color: "#EAEAF2", cursor: "pointer" }}>×</div>
        <img src="../../assets/wc48-crown-filled.svg" alt="" style={{ width: 22, height: 22, display: "block" }} />
        <span style={{ fontSize: 14, fontWeight: 800 }}>WorldCrown48</span>
      </div>
      <div style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", height: r.h, padding: `0 16px 0 ${r.padL}px`, cursor: r.cur, opacity: r.op, borderLeft: r.mark, boxSizing: "border-box" }}>
            <span style={{ fontSize: r.fs, fontWeight: r.fw, color: r.color }}>{r.label}</span>
            {r.toggle && <span style={{ marginLeft: "auto", fontSize: 10, color: "#8E90A6", transform: r.open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 160ms ease" }}>▸</span>}
          </div>
        ))}
        {admin && (
          <>
            <div style={{ margin: "10px 16px", height: 1, background: "rgba(255,255,255,.10)" }} />
            {ADMIN.map(a => <div key={a} style={{ display: "flex", alignItems: "center", height: 44, padding: "0 16px" }}><span style={{ fontSize: 15, color: "#D8D9E4" }}>{a}</span></div>)}
          </>
        )}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#B1B5C4" }}>언어</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".12em" }}>
            {["KO", "EN", "ES"].map(l => <span key={l} style={{ padding: "5px 9px", border: "1px solid rgba(255,255,255,.14)", background: l === lang ? "rgba(255,255,255,.16)" : "transparent", color: l === lang ? "#fff" : "#8E90A6" }}>{l}</span>)}
          </div>
        </div>
        <span style={{ fontSize: 14, color: "#D8D9E4" }}>로그아웃</span>
      </div>
    </div>
  );
}

module.exports = { GNB: { Menubar, Drawer, Dropdown, NAV, DIM, DIM_OPACITY, ADMIN }, Menubar, Drawer };
