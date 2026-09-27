/**
 * RankingHeader — 차트 화면의 머리 부분 (wireframe `.rank-head`). Round info (N강·X/Y)
 * is NEVER shown here — Round Scope Lock (CLAUDE.md 대진 흐름 #5); only the
 * Tournament-wide deadline.
 *
 * ## 배치 — CHART-HEAD (2026-09-27 대표 판정 · 승인표)
 *
 * ```
 * CHART                                  ← 눈썹 글자 (예전의 2배)
 * 대회 제목
 * Tournament deadline 2026·11·30         ← 알약 없는 평범한 한 줄
 * CROWN SCORE ?      [Updated … · Next update …]   ← 목록 바로 위 줄
 * ```
 *
 * 대표 판단: **발표 시각이 마감일보다 중요하다.** 그래서 예전의 마감 알약 스타일을 발표 시각
 * 알약으로 옮기고, 마감은 제목 밑 평범한 글자로 내렸다. 예전 제목 밑 "다음 발표" 한 줄은
 * 알약으로 옮겼으므로 없앴다(중복 금지).
 *
 * 목록 위 줄은 flex-wrap 이다. 좁은 화면에서는 알약이 다음 줄로 내려가 **왼쪽 끝**(목록
 * 왼쪽 끝선)에 붙고, 넓은 화면에서는 오른쪽 끝(목록 오른쪽 끝선)에 붙는다. 휴대폰에서도
 * 눈썹·제목·마감 줄은 그대로 나온다.
 *
 * ## 설명창(?) — ARENA-1 PR 3
 *
 * Crown Score 옆 물음표는 계산식을 쉬운 말로 알려 주는 **공통 문구 하나**다(모든
 * Contestant에게 같다 · 링크 없음 · 정본 v1.1 §6-2). `helpLines` 가 `null` 이면 물음표
 * 자체를 그리지 않는다 — 문안이 없을 때 임시 문구를 지어 넣지 않기 위한 장치다.
 * 열고 닫기는 **클릭**이다. 호버 툴팁(`title` 속성)은 네 줄이 한 줄로 뭉치고 터치
 * 기기에서 열리지 않는다.
 */
"use client";

import { useState } from "react";
export function RankingHeader({
  kicker,
  title,
  note,
  helpLines,
  updatedText,
  nextUpdateText,
  deadlineLabel,
  deadlineText,
}: {
  kicker: string;
  title: string;
  /** 목록 위 줄 왼쪽 제목 — 3언어 모두 "Crown Score" (정본 v1.1 §6-1). */
  note: string;
  /** Crown Score 계산식 안내 — 요약 1줄 + 항목 3줄. `null` 이면 물음표를 그리지 않는다. */
  helpLines?: string[] | null;
  /** 알약 앞부분 "지난 발표: …". `null` 이면 감춘다(아직 발표된 캐시가 없음). */
  updatedText?: string | null;
  /** 알약 뒷부분 "다음 발표: …". `null` 이면 감춘다(새벽 구간 · 마감 후). */
  nextUpdateText?: string | null;
  deadlineLabel: string;
  deadlineText: string | null;
}): JSX.Element {
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <div className="rank-head">
      <div className="rank-kicker">{kicker}</div>
      <h2 className="rank-title">{title}</h2>
      {deadlineText ? (
        <div className="rank-deadline" data-testid="tournament-deadline">
          <span className="td-l">{deadlineLabel}</span>{" "}
          <span className="td-v">{deadlineText}</span>
        </div>
      ) : null}
      <div className="rank-bar">
        <h3 className="rank-score-title" data-testid="chart-score-title">
          {note}
          {helpLines && helpLines.length > 0 ? (
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
          ) : null}
        </h3>
        {updatedText || nextUpdateText ? (
          <div className="rank-pill" data-testid="ranking-update-pill">
            {/* 두 부분은 각각 한 덩어리(inline-block)라 좁은 화면에서도 문구 중간이 아니라
                가운뎃점 뒤에서만 줄이 바뀐다. 점 앞은 줄바꿈 없는 공백이라 점이 다음 줄
                머리로 넘어가지 않는다. */}
            {updatedText ? (
              <span className="rp-part" data-testid="ranking-updated">
                {updatedText}
              </span>
            ) : null}
            {updatedText && nextUpdateText ? (
              <span aria-hidden="true">{"\u00a0· "}</span>
            ) : null}
            {nextUpdateText ? (
              <span className="rp-part" data-testid="ranking-next-update">
                {nextUpdateText}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {helpLines && helpLines.length > 0 && helpOpen ? (
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
    </div>
  );
}
