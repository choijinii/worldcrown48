/**
 * RankingHeader — wireframe `.rank-head` (kicker + title + note + Tournament
 * Deadline chip, line 755~764). Round info (N강·X/Y) is NEVER shown here —
 * Round Scope Lock (CLAUDE.md 대진 흐름 #5); only the Tournament-wide deadline.
 */
export function RankingHeader({
  kicker,
  title,
  note,
  deadlineLabel,
  deadlineText,
}: {
  kicker: string;
  title: string;
  note: string;
  deadlineLabel: string;
  deadlineText: string | null;
}): JSX.Element {
  return (
    <div className="rank-head">
      <div className="rank-kicker">{kicker}</div>
      <h2 className="rank-title">{title}</h2>
      <div className="rank-note">{note}</div>
      {deadlineText ? (
        <span
          className="t-deadline"
          style={{ marginTop: "var(--space-3)" }}
          aria-label="Tournament Deadline"
          data-testid="tournament-deadline"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3.5" y="5" width="17" height="15" rx="2" />
            <path d="M3.5 9h17M8 3v4M16 3v4" />
          </svg>
          <span className="td-l">{deadlineLabel}</span>
          <span className="td-v">{deadlineText}</span>
        </span>
      ) : null}
    </div>
  );
}
