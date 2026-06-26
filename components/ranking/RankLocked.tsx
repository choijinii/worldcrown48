/**
 * RankLocked — the W-7 "locked" state: the ranking is sealed until the Tournament
 * Deadline passes (마감 전 노출은 표심 쏠림 위험 → 공정한 한 표 보존). Pure
 * presentational; the page decides locked vs loaded from the Tournament deadline,
 * and firestore.rules enforces the same gate server-side (defense in depth).
 *
 * The padlock is inlined (no design-system lock asset exists yet — handoff §2 W-7
 * sanctions an inline SVG) with a Crown Gold stroke, matching the empty-state tone.
 */
export function RankLocked({
  title,
  subtitle,
  deadlineText,
}: {
  title: string;
  subtitle: string;
  deadlineText: string | null;
}): JSX.Element {
  return (
    <div className="rank-locked" data-testid="rank-locked">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" />
        <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
        <circle cx="12" cy="15" r="1.4" />
      </svg>
      <div className="rl-title">{title}</div>
      <div className="rl-sub">
        {subtitle}
        {deadlineText ? ` · ${deadlineText}` : ""}
      </div>
    </div>
  );
}
