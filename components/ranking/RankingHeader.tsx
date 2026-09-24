/**
 * RankingHeader — wireframe `.rank-head` (kicker + title + note + Tournament
 * Deadline chip, line 755~764). Round info (N강·X/Y) is NEVER shown here —
 * Round Scope Lock (CLAUDE.md 대진 흐름 #5); only the Tournament-wide deadline.
 *
 * RUN-1 PR 3 (AC 15): note 아래에 "다음 발표" 한 줄이 붙는다. 차트가 하루 두 번만 갱신되므로
 * 이 줄이 없으면 팬이 12시간 멈춘 숫자를 "고장"으로 읽는다. **새 색·새 컴포넌트를 만들지
 * 않는다**(§5 DON'T 7) — 기존 `.rank-note` 텍스트 스타일을 그대로 쓴다.
 *
 * ARENA-1 PR 3: note("Crown Score") 옆에 **설명창(?)** 이 붙는다. 계산식을 쉬운 말로
 * 알려 주는 **공통 문구 하나**이고(모든 Contestant에게 같다), 요약 한 줄 + 항목 세 줄로
 * 온다(마케팅 2026-09-24 승인본). `helpLines` 가 `null` 이면 물음표 자체를 그리지
 * 않는다 — 문안이 없을 때 임시 문구를 지어 넣지 않기 위한 장치다(킥 §4).
 *
 * 열고 닫기는 **클릭**이다. 호버 툴팁(`title` 속성)으로 두지 않은 이유: 네 줄이 한 줄로
 * 뭉쳐 보이고, 터치 기기에서는 아예 열리지 않는다.
 */
"use client";

import { useState } from "react";
export function RankingHeader({
  kicker,
  title,
  note,
  helpLines,
  nextUpdateText,
  deadlineLabel,
  deadlineText,
}: {
  kicker: string;
  title: string;
  note: string;
  /** Crown Score 계산식 안내 — 요약 1줄 + 항목 3줄. `null` 이면 물음표를 그리지 않는다. */
  helpLines?: string[] | null;
  /** "다음 발표: …" 한 줄. `null` 이면 줄을 감춘다(승인 문구가 없는 새벽 구간). */
  nextUpdateText?: string | null;
  deadlineLabel: string;
  deadlineText: string | null;
}): JSX.Element {
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <div className="rank-head">
      <div className="rank-kicker">{kicker}</div>
      <h2 className="rank-title">{title}</h2>
      <div className="rank-note">
        {note}
        {helpLines && helpLines.length > 0 ? (
          <>
            <button
              type="button"
              className="rank-help"
              aria-expanded={helpOpen}
              aria-controls="chart-score-help-panel"
              /* 첫 줄이 요약이라 접힌 상태의 이름표로 쓴다. */
              aria-label={helpLines[0]}
              onClick={() => setHelpOpen((open) => !open)}
              data-testid="chart-score-help"
            >
              ?
            </button>
            {helpOpen ? (
              <div
                id="chart-score-help-panel"
                className="rank-help-panel"
                role="note"
                data-testid="chart-score-help-panel"
              >
                {helpLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}
          </>
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
