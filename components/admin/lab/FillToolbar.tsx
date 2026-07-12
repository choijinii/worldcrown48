/**
 * FillToolbar — STEP 2 채우기 방식 (B-2). Four ways to fill the 48 grid:
 *   ✏️ 직접 입력 · 개별 수정 → the grid cells themselves (always available)
 *   ✨ AI 48명 전체 → onFillAll (replaces the roster)
 *   ✨ 빈칸만 AI → onFillBlanks (preserves filled cells, AC#3)
 *
 * AI is a HELPER (AC#1): both AI buttons can fail and the operator still fills
 * by hand. "빈칸만" disables when the grid is already full.
 */
"use client";

import { countFilledContestants } from "@/lib/lab/publishReady";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import { TOTAL_CONTESTANTS } from "@/lib/types/tournament";
import { lab } from "./theme";

interface FillToolbarProps {
  contestants: ContestantDraft[];
  busy: boolean;
  onFillAll: () => void;
  onFillBlanks: () => void;
}

export function FillToolbar({
  contestants,
  busy,
  onFillAll,
  onFillBlanks,
}: FillToolbarProps): JSX.Element {
  const filled = countFilledContestants(contestants);
  const hasBlanks = filled < TOTAL_CONTESTANTS;

  const btn = (enabled: boolean) =>
    ({
      padding: "10px 16px",
      borderRadius: 10,
      border: `2px solid ${lab.gold}`,
      background: enabled ? lab.goldSubtle : "transparent",
      color: lab.gold,
      fontWeight: 700,
      fontSize: 14,
      fontFamily: lab.font,
      cursor: enabled ? "pointer" : "not-allowed",
      opacity: enabled ? 1 : 0.45,
    }) as const;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 12,
        background: lab.surface,
        border: `1px solid ${lab.border}`,
      }}
    >
      <span style={{ fontSize: 13, color: lab.textSub, fontWeight: 600 }}>
        채우기 <span style={{ color: lab.textMuted }}>({filled}/{TOTAL_CONTESTANTS})</span>
      </span>
      <button
        type="button"
        onClick={onFillAll}
        disabled={busy}
        data-testid="fill-all-button"
        style={btn(!busy)}
      >
        {busy ? "✨ 추천 중… (약 15초)" : "✨ AI 48명 전체"}
      </button>
      <button
        type="button"
        onClick={onFillBlanks}
        disabled={busy || !hasBlanks}
        data-testid="fill-blanks-button"
        style={btn(!busy && hasBlanks)}
      >
        ✨ 빈칸만 AI
      </button>
      <span style={{ fontSize: 12, color: lab.textMuted }}>
        ✏️ 칸을 직접 클릭해 입력·수정할 수도 있어요
      </span>
    </div>
  );
}
