export function AIReportFooter({ timestamp }) {
  return (
    <span style={{
      display: "inline-block", fontFamily: "var(--font-mono)", fontSize: 12,
      color: "var(--color-gold)", borderTop: "1px solid rgba(252,208,6,0.2)",
      paddingTop: 8, marginTop: 16, letterSpacing: "0.04em",
    }}>
      ✦ AI-Report{timestamp ? " · " + timestamp : ""}
    </span>
  );
}
