import { StatusPill } from "../StatusPill/StatusPill.jsx";

export function TournamentCard({ category = "K-POP", title, contestants = 48, deadline, status = "active", cover }) {
  return (
    <article style={{
      border: "1px solid var(--color-border)", borderRadius: "var(--radius-border)",
      overflow: "hidden", background: "var(--color-bg-default)", display: "flex", flexDirection: "column",
    }}>
      <div style={{
        height: 130, position: "relative", overflow: "hidden",
        background: cover || "linear-gradient(135deg, rgba(0,163,183,0.20), rgba(238,218,125,0.10) 60%, var(--color-bg-soft))",
      }}>
        <span style={{
          position: "absolute", right: 14, bottom: 4, fontFamily: "var(--font-display)",
          fontStyle: "italic", fontWeight: 900, fontSize: 84, lineHeight: 0.8, color: "rgba(255,255,255,0.06)",
        }}>48</span>
        <span style={{
          position: "absolute", top: 10, left: 10, padding: "3px 8px", background: "rgba(0,0,0,0.4)",
          border: "1px solid var(--color-border-gold)", color: "var(--color-gold)",
          borderRadius: "var(--radius-border)", fontFamily: "var(--font-mono)", fontSize: 9,
          letterSpacing: "0.22em", fontWeight: 600,
        }}>{category}</span>
      </div>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.01em", color: "var(--color-text)" }}>{title}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-sub)" }}>
          <span>{contestants} Contestants</span><span style={{ opacity: 0.3 }}>·</span><span>Closes {deadline}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <StatusPill status={status} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.18em", fontWeight: 700, color: "var(--color-gold)" }}>ENTER →</span>
        </div>
      </div>
    </article>
  );
}
