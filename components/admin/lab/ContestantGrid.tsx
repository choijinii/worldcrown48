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
import type { SourcingStates } from "@/lib/lab/sourcingDraft";
import { ContestantEditor } from "./ContestantEditor";

interface ContestantGridProps {
  contestants: ContestantDraft[];
  onChange: (index: number, patch: Partial<ContestantDraft>) => void;
  /** LAB-EV-1 W5 — 영상이 붙은 슬롯의 미세조정 열기. */
  onTune?: (index: number) => void;
  /** LAB-EV-2 — index → 소싱 배지 상태. 소싱을 돌린 적 없으면 빈 객체. */
  sourcing?: SourcingStates;
  /** LAB-EV-2 — 슬롯 1개 캐시 우회 재검색. */
  onRefreshVideo?: (index: number) => void;
  /** 지금 재검색 중인 슬롯 index (없으면 null). */
  refreshingIndex?: number | null;
}

export function ContestantGrid({
  contestants,
  onChange,
  onTune,
  sourcing,
  onRefreshVideo,
  refreshingIndex = null,
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
          sourcing={sourcing?.[i]}
          // 소싱을 한 번도 안 돌린 칸에는 [새 영상 찾기]가 뜨지 않는다 —
          // 검색 콜을 쓰는 버튼이라 배지와 함께만 노출한다.
          onRefreshVideo={sourcing?.[i] ? onRefreshVideo : undefined}
          refreshing={refreshingIndex === i}
        />
      ))}
    </div>
  );
}
