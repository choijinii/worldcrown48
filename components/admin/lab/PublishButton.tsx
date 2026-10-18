/**
 * PublishButton — commits the Tournament + 48 Contestants (AC Step2 #8 / Step3).
 *
 * Disabled until exactly 48 are named (tested isPublishReady). Shows the live
 * filled count so the operator knows how many remain. Crown Gold; busy state
 * locks the button during the writeBatch commit.
 */
"use client";

import {
  isPublishReady,
  countFilledContestants,
} from "@/lib/lab/publishReady";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import { TOTAL_CONTESTANTS } from "@/lib/types/tournament";
import { useT } from "@/lib/i18n/useT";
import { lab } from "./theme";

interface PublishButtonProps {
  contestants: ContestantDraft[];
  busy: boolean;
  onClick: () => void;
  /** THUMB-1: 대표 매치 A·B 를 둘 다 골랐는지 — 아니면 잠근다(원장 D-35). */
  pairReady?: boolean;
}

export function PublishButton({
  contestants,
  busy,
  onClick,
  pairReady = true,
}: PublishButtonProps): JSX.Element {
  const { t } = useT();
  const ready = isPublishReady(contestants) && pairReady && !busy;
  const filled = countFilledContestants(contestants);

  return (
    <button
      type="button"
      data-testid="publish-button"
      onClick={onClick}
      disabled={!ready}
      style={{
        padding: "14px 28px",
        borderRadius: 12,
        border: "none",
        background: ready ? lab.gold : lab.surfaceElev,
        color: ready ? "var(--color-bg-default)" : lab.textMuted,
        fontWeight: 800,
        fontSize: 15,
        fontFamily: lab.font,
        cursor: ready ? "pointer" : "not-allowed",
      }}
    >
      {busy
        ? t("lab.publish.busy")
        : t("lab.publish.ready", { filled, total: TOTAL_CONTESTANTS })}
    </button>
  );
}
