export function StatusPill({ status = "active" }) {
  const map = {
    draft: { color: "var(--color-text-sub)", border: "var(--color-border)", bg: "var(--color-bg-soft)" },
    published: { color: "var(--color-text-sub)", border: "var(--color-border)", bg: "var(--color-bg-soft)" },
    active: { color: "var(--color-gold)", border: "var(--color-border-gold)", bg: "var(--color-gold-subtle)", dot: true },
    closed: { color: "var(--color-crimson)", border: "rgba(215,6,58,0.4)", bg: "rgba(215,6,58,0.08)" },
    completed: { color: "var(--color-turquoise)", border: "rgba(0,163,183,0.4)", bg: "rgba(0,163,183,0.08)" },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 11px",
      borderRadius: "var(--radius-chip)", fontFamily: "var(--font-mono)", fontSize: 10.5,
      letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase",
      color: s.color, border: "1px solid " + s.border, background: s.bg,
    }}>
      {s.dot ? <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} /> : null}
      {status}
    </span>
  );
}
