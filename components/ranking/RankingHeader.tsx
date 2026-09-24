/**
 * RankingHeader — wireframe `.rank-head` (kicker + title + note + Tournament
 * Deadline chip, line 755~764). Round info (N강·X/Y) is NEVER shown here —
 * Round Scope Lock (CLAUDE.md 대진 흐름 #5); only the Tournament-wide deadline.
 *
 * RUN-1 PR 3 (AC 15): note 아래에 "다음 발표" 한 줄이 붙는다. 차트가 하루 두 번만 갱신되므로
 * 이 줄이 없으면 팬이 12시간 멈춘 숫자를 "고장"으로 읽는다. **새 색·새 컴포넌트를 만들지
 * 않는다**(§5 DON'T 7) — 기존 `.rank-note` 텍스트 스타일을 그대로 쓴다.
 *
 * ARENA-1 PR 3: note("Crown Score") 옆에 **설명창(?) 자리**가 생겼다. 문구는 마케팅이
 * 정본 §6을 근거로 따로 짓는다 — `helpText` 가 `null` 이면 물음표 자체를 그리지 않는다
 * (임시 문구를 지어 넣지 않는다 · 킥 §4). 문구는 모든 Contestant에게 같은 한 가지다.
 */
export function RankingHeader({
  kicker,
  title,
  note,
  helpText,
  nextUpdateText,
  deadlineLabel,
  deadlineText,
}: {
  kicker: string;
  title: string;
  note: string;
  /** Crown Score 계산식 안내. `null` 이면 물음표를 그리지 않는다(문안 대기). */
  helpText?: string | null;
  /** "다음 발표: …" 한 줄. `null` 이면 줄을 감춘다(승인 문구가 없는 새벽 구간). */
  nextUpdateText?: string | null;
  deadlineLabel: string;
  deadlineText: string | null;
}): JSX.Element {
  return (
    <div className="rank-head">
      <div className="rank-kicker">{kicker}</div>
      <h2 className="rank-title">{title}</h2>
      <div className="rank-note">
        {note}
        {helpText ? (
          <button
            type="button"
            className="rank-help"
            aria-label={helpText}
            title={helpText}
            data-testid="chart-score-help"
          >
            ?
          </button>
        ) : null}
      </div>
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
