/**
 * RankingView — 차트 화면 (wireframe `sf-ranking` · Domain 3 dark).
 *
 * 표시만 한다. 페이지가 `ranking_cache` 를 구독해 **세 가지** `data-rank` 상태로
 * 옮긴다: loading · waiting · loaded.
 *
 * ⚠️ `locked` 상태는 없어졌다 — 마감 전 잠금(W-7)은 **D-30으로 폐기**됐다. 차트는
 * 마감 전에도, 로그인하지 않아도 열린다. 대신 `waiting` 이 생겼다(완주 판수 10 미만 ·
 * 정본 §5). 판정은 `lib/ranking/rankState` 에 있다.
 *
 * 이상 징후는 이 화면에 절대 닿지 않는다 (W-2, ADR-0006 amendment) — admin_alerts 전용.
 * The CSS below is
 * PORTED VERBATIM from `docs/design/wireframes/Domain 3 · The Arena.html`
 * (lines 119~131 t-deadline, 372~404 rank-*, plus the narrow-viewport rule) so
 * the rendered surface matches the wireframe ±2px. All tokens resolve from
 * app/globals.css :root.
 *
 * Round Scope Lock (§9 trap #11): import ONLY from app/arena/[id]/ranking/.
 * Never render this on the Match VS surface (Vote Rate is ranking-only).
 */
import type { CrownRankingEntry } from "@/lib/ranking/rankingTypes";
import type { RankState } from "@/lib/ranking/rankState";
import { RankingHeader } from "./RankingHeader";
import { RankList } from "./RankList";
import { RankSkeleton } from "./RankSkeleton";
import { RankWaiting } from "./RankWaiting";

export type { RankState };

export interface RankingViewLabels {
  kicker: string;
  note: string;
  /** Crown Score 설명창(?) 줄 배열. `null` 이면 물음표를 그리지 않는다. */
  helpLines?: string[] | null;
  deadlineLabel: string;
  /** 판수가 10에 닿기 전 · 캐시가 없을 때의 한 문장 (정본 §5 · 대표 승인 A8). */
  waitingTitle: string;
}

export interface RankingViewProps {
  state: RankState;
  title: string;
  deadlineText: string | null;
  entries: CrownRankingEntry[];
  labels: RankingViewLabels;
  /**
   * RUN-1 PR 3 (AC 15) — "다음 발표" 한 줄. `labels` 와 달리 이 문구는 3언어 카탈로그
   * (`lib/i18n/messages.ts`)에서 오므로 따로 받는다. `null` 이면 줄을 감춘다.
   */
  nextUpdateText?: string | null;
  /** CHART-HEAD — 발표 시각 알약 앞부분 "지난 발표: …". `null` 이면 감춘다. */
  updatedText?: string | null;
}

// ⚠️ STYLE 문자열 안에는 따옴표·꺾쇠·앰퍼샌드를 쓰지 않는다(주석 포함). React 18은 서버 렌더에서
// <style> 속 이 글자들을 HTML 엔티티로 바꾸고, 브라우저는 그 내용을 날 텍스트로 읽는다 → 서버와
// 클라이언트의 글자가 달라 하이드레이션이 어긋난다. 속성 선택자는 따옴표 없이 쓴다
// (`[aria-expanded=true]` — 유효한 CSS). CHART-HEAD 승인표 결정 7 · 2026-09-27.
const STYLE = `
.sf-ranking { color: var(--color-text); }
.rank-wrap { padding: var(--space-16) var(--space-8) var(--space-12); max-width: 820px; margin: 0 auto; }
.rank-head { margin-bottom: var(--space-4); }
.rank-kicker { font-family: var(--font-mono); font-size: 22px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-gold); }
.rank-title { font-weight: 700; font-size: 26px; letter-spacing: -0.015em; margin: var(--space-1) 0 0; }
/* CHART-HEAD: 마감은 제목 밑 평범한 한 줄 (예전 알약 스타일은 발표 시각 알약으로 옮겼다). */
.rank-deadline { font-family: var(--font-mono); font-size: 11px; color: var(--color-text-muted); letter-spacing: 0.04em; margin-top: var(--space-2); }
.rank-deadline .td-v { color: var(--color-text-sub); font-weight: 700; }
/* 목록 바로 위 줄: 왼쪽 Crown Score 제목 · 오른쪽 발표 시각 알약. 좁으면 알약이 다음 줄 왼쪽 끝으로 내려간다. */
.rank-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2) var(--space-4); margin-top: var(--space-6); }
.rank-score-title { display: inline-flex; align-items: center; margin: 0; font-family: var(--font-mono); font-size: 18px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-gold); }
.rank-help { margin-left: var(--space-2); width: 20px; height: 20px; line-height: 1; padding: 0; border-radius: 50%; border: 1px solid var(--color-border-gold); background: transparent; color: var(--color-gold); font-family: var(--font-mono); font-size: 12px; cursor: pointer; }
.rank-help[aria-expanded=true] { background: var(--color-gold-subtle); }
.rank-pill { display: inline-block; max-width: 100%; text-align: left; font-family: var(--font-mono); font-size: 11px; line-height: 1.6; letter-spacing: 0.06em; padding: 4px var(--space-3); border: 1px solid var(--color-border-gold); background: var(--color-gold-subtle); border-radius: var(--radius-chip); color: var(--color-gold); }
.rank-pill .rp-part { display: inline-block; }
.rank-help-panel { margin-top: var(--space-3); max-width: 520px; padding: var(--space-4); border: 1px solid var(--color-border-gold); border-radius: var(--radius-border); background: var(--color-bg-soft); }
.rank-help-panel p { margin: 0; font-size: 12px; line-height: 1.7; color: var(--color-text-sub); letter-spacing: normal; }
.rank-help-panel p:first-child { color: var(--color-text); margin-bottom: var(--space-2); }
.rank-list { display: flex; flex-direction: column; gap: var(--space-2); }
.rank-row { display: grid; grid-template-columns: 36px 44px 1fr 96px; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); background: var(--color-bg-soft); border: 1px solid var(--color-border); border-radius: var(--radius-border); }
.rank-row.top { border: 2px solid var(--color-gold-bright); background: linear-gradient(90deg, var(--color-gold-subtle), transparent 60%); box-shadow: 0 0 24px rgba(252, 208, 6, 0.25); }
.rank-row.flag { border-color: color-mix(in srgb, var(--color-crimson) 45%, transparent); }
.rank-no { font-family: var(--font-mono); font-size: 15px; font-weight: 700; color: var(--color-text-sub); text-align: center; }
.rank-row.top .rank-no { color: var(--color-gold); }
.rank-av { width: 40px; height: 40px; border-radius: var(--radius-chip); background: linear-gradient(135deg, var(--color-bg-elevated), var(--color-bg-soft)); border: 1px solid var(--color-border-gold); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-style: italic; font-weight: 700; color: var(--color-gold); font-size: 16px; overflow: hidden; }
.rank-av img { width: 100%; height: 100%; object-fit: cover; }
.rank-info .rn { font-weight: 600; font-size: 15px; }
.rank-rate { text-align: right; }
.rank-rate .rv { font-family: var(--font-mono); font-weight: 700; font-size: 18px; color: var(--color-gold); }
.rank-rate .rbar { height: 4px; border-radius: var(--radius-chip); background: var(--color-bg-elevated); margin-top: 4px; overflow: hidden; }
.rank-rate .rbar i { display: block; height: 100%; background: var(--color-gold); border-radius: var(--radius-chip); }
.rank-row.flag .rank-rate .rv { color: var(--color-crimson); }
.rank-row.flag .rbar i { background: var(--color-crimson); }
.rank-skel { display: flex; flex-direction: column; gap: var(--space-2); }
.rskel { height: 64px; border-radius: var(--radius-border); background: linear-gradient(90deg, var(--color-bg-soft) 0%, var(--color-bg-elevated) 50%, var(--color-bg-soft) 100%); background-size: 200% 100%; animation: rankShimmer 1400ms ease infinite; }
@keyframes rankShimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.rank-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-3); padding: var(--space-20) var(--space-6); border: 1px dashed var(--color-border); border-radius: var(--radius-border); }
.rank-empty img { width: 64px; opacity: 0.85; filter: drop-shadow(0 0 12px rgba(252, 208, 6, 0.18)); }
.rank-empty .et { font-weight: 600; font-size: 16px; }
.rank-empty .es { font-size: 13px; color: var(--color-text-sub); }
@media (max-width: 520px) { .rank-row { grid-template-columns: 28px 36px 1fr 80px; } }
/* Mobile shows top 12 only (W-3, 대표 결정 2026-06-26) — desktop keeps all active
   rows so a Voter can find their own Contestant. Rows are direct .rank-list
   children, so nth-child(n+13) targets the 13th+. */
@media (max-width: 520px) { .rank-row:nth-child(n+13) { display: none; } }
@media (prefers-reduced-motion: reduce) { .rskel { animation: none; } }
`;

export function RankingView({
  state,
  title,
  deadlineText,
  entries,
  labels,
  nextUpdateText,
  updatedText,
}: RankingViewProps): JSX.Element {
  return (
    <section className="sf-ranking" data-rank={state} data-testid="ranking-view">
      <style>{STYLE}</style>
      <div className="rank-wrap">
        <RankingHeader
          kicker={labels.kicker}
          title={title}
          note={labels.note}
          helpLines={labels.helpLines}
          updatedText={updatedText}
          nextUpdateText={nextUpdateText}
          deadlineLabel={labels.deadlineLabel}
          deadlineText={deadlineText}
        />

        {state === "loading" ? <RankSkeleton /> : null}

        {state === "waiting" ? (
          <RankWaiting title={labels.waitingTitle} />
        ) : null}

        {state === "loaded" ? (
          <RankList entries={entries} flagFirst={false} />
        ) : null}
      </div>
    </section>
  );
}
