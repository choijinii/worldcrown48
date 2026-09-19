export function VSBattle({ tournament = "최고의 퍼포먼스 무대", year = "2026", left, right, onVote }) {
  const L = left || { name: "슬기", meta: "KR · VOCAL · MAIN", initial: "SG", tint: "0,163,183" };
  const R = right || { name: "미나", meta: "JP · DANCE · MAIN", initial: "MN", tint: "215,6,58" };

  const Side = ({ side, data }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{
        aspectRatio: "4 / 5", borderRadius: "var(--radius-border)", display: "flex",
        alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)",
        fontStyle: "italic", fontWeight: 900, fontSize: 52,
        background: "linear-gradient(180deg, rgba(" + data.tint + ",0.28), rgba(36,23,84,0.65))",
        border: "1px solid rgba(" + data.tint + ",0.45)", color: "rgb(" + data.tint + ")",
      }}>{data.initial}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 17, color: "var(--color-text)", textAlign: side === "right" ? "right" : "left" }}>{data.name}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-sub)", letterSpacing: "0.1em", textAlign: side === "right" ? "right" : "left" }}>{data.meta}</div>
      <button onClick={() => onVote && onVote(side)} style={{
        marginTop: 4, minHeight: 44, padding: "9px 14px", border: 0, cursor: "pointer",
        borderRadius: "var(--radius-border)", fontFamily: "var(--font-sans)", fontWeight: 700,
        fontSize: 13, display: "flex", flexDirection: "column", textAlign: "left",
        background: side === "left" ? "var(--color-turquoise)" : "var(--color-crimson)",
        color: side === "left" ? "#00181B" : "#fff",
      }}>
        <small style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", opacity: 0.85, fontWeight: 600 }}>PICK {side.toUpperCase()}</small>
        <span style={{ marginTop: 2 }}>{data.name}</span>
      </button>
    </div>
  );

  return (
    <div style={{ position: "relative", overflow: "hidden", border: "1px solid var(--color-border)", borderRadius: "var(--radius-border)", background: "var(--color-bg-default)", padding: "20px 22px" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 50% 60% at 12% 50%, rgba(0,163,183,0.20), transparent 55%), radial-gradient(ellipse 50% 60% at 88% 50%, rgba(215,6,58,0.20), transparent 55%)" }} />
      <div style={{ position: "relative", textAlign: "center", marginBottom: 22 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 700, fontSize: 19, color: "var(--color-gold)", marginBottom: 10 }}>
          <span style={{ width: 26, height: 1, background: "linear-gradient(90deg, transparent, var(--color-gold))" }} />
          The Arena
          <span style={{ width: 26, height: 1, background: "linear-gradient(90deg, var(--color-gold), transparent)" }} />
        </div>
        <h2 style={{ fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 32, lineHeight: 1.04, letterSpacing: "-0.02em", color: "var(--color-text)", margin: 0 }}>{tournament}
          <span style={{ display: "block", marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, letterSpacing: "0.28em", color: "var(--color-text-sub)" }}>{year}</span>
        </h2>
      </div>
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "center" }}>
        <Side side="left" data={L} />
        <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 900, fontSize: 66, lineHeight: 1, color: "var(--color-gold)", textShadow: "0 2px 18px rgba(252,208,6,0.45)" }}>vs</div>
        <Side side="right" data={R} />
      </div>
    </div>
  );
}
