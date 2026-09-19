export function Button({ children, variant = "gold", size = "md", onClick, style }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
    fontFamily: "var(--font-sans)", fontWeight: 700, letterSpacing: "0.01em",
    borderRadius: "var(--radius-border)", border: "1px solid transparent",
    cursor: "pointer", transition: "background 160ms ease, box-shadow 200ms ease",
  };
  const sizes = {
    sm: { padding: "8px 14px", fontSize: 12.5, minHeight: 36 },
    md: { padding: "12px 22px", fontSize: 14, minHeight: 44 },
    lg: { padding: "15px 30px", fontSize: 15, minHeight: 48 },
  };
  const variants = {
    gold: { background: "var(--color-gold)", color: "#1A1205" },
    ghost: { background: "transparent", color: "var(--color-text)", borderColor: "var(--color-border-gold)" },
    quiet: { background: "var(--color-bg-elevated)", color: "var(--color-text)", borderColor: "var(--color-border)" },
  };
  return (
    <button onClick={onClick} style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  );
}
