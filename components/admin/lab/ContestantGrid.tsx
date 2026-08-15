/**
 * ContestantGrid — the 6×8 = 48-node editing surface (AC Step2 #1).
 *
 * Always renders exactly 48 slots so empty nodes show as dashed placeholders
 * (the operator can see how many remain). Desktop-only sizing (min-width
 * 1440px) is enforced one level up by DesktopOnly.
 */
"use client";

import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import { TOTAL_CONTESTANTS } from "@/lib/types/tournament";
import { ContestantEditor } from "./ContestantEditor";

interface ContestantGridProps {
  contestants: ContestantDraft[];
  onChange: (index: number, patch: Partial<ContestantDraft>) => void;
  /** LAB-EV-1 W5 — 영상이 붙은 슬롯의 미세조정 열기. */
  onTune?: (index: number) => void;
}

export function ContestantGrid({
  contestants,
  onChange,
  onTune,
}: ContestantGridProps): JSX.Element {
  return (
    <div
      data-testid="contestant-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 16,
        minWidth: 1440,
      }}
    >
      {Array.from({ length: TOTAL_CONTESTANTS }, (_, i) => (
        <ContestantEditor
          key={i}
          index={i}
          contestant={
            contestants[i] ?? {
              name: "",
              nationality: "",
              position: "",
              imageUrl: "",
              imageSearchKeyword: "",
            }
          }
          onChange={onChange}
          onTune={onTune}
        />
      ))}
    </div>
  );
}
