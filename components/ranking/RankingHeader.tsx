/**
 * RankingHeader — wireframe `.rank-head` (kicker + title + note + Tournament
 * Deadline chip, line 755~764). Round info (N강·X/Y) is NEVER shown here —
 * Round Scope Lock (CLAUDE.md 대진 흐름 #5); only the Tournament-wide deadline.
 *
 * RUN-1 PR 3 (AC 15): note 아래에 "다음 발표" 한 줄이 붙는다. 랭킹이 하루 두 번만 갱신되므로
 * 이 줄이 없으면 팬이 12시간 멈춘 숫자를 "고장"으로 읽는다. **새 색·새 컴포넌트를 만들지
 * 않는다**(§5 DON'T 7) — 기존 `.rank-note` 텍스트 스타일을 그대로 쓴다.
 */
export function RankingHeader({
  kicker,
  title,
  note,
  nextUpdateText,
  deadlineLabel,
  deadlineText,
}: {
  kicker: string;
  title: string;
  note: string;
  /** "다음 발표: …" 한 줄. `null` 이면 줄을 감춘다(승인 문구가 없는 새벽 구간). */
  nextUpdateText?: string | null;
  deadlineLabel: string;
  deadlineText: string | null;
}): JSX.Element {
  return (
    <div className="rank-head">
      <div className="rank-kicker">{kicker}</div>
      <h2 className="rank-title">{title}</h2>
      <div className="rank-note">{note}</div>
      {nextUpdateText ? (
        <div className="rank-note" data-testid="ranking-next-update">
          {nextUpdateText}
        </div>
      ) : null}
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
