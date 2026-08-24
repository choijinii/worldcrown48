/**
 * ContestantGrid — 48칸 편집 판 (AC Step2 #1 · LAB-UX-1로 8열 재편).
 *
 * 언제나 정확히 48칸을 그린다 — 빈 칸이 금색 점선으로 남아야 운영자가 몇 개가
 * 남았는지 본다. 열 수는 `GRID_COLUMNS` 하나에서 나온다(6→8, 대표 확정 2026-08-23):
 * 슬롯 폼이 줄어 카드가 좁아졌고, 좁아진 만큼 세로 스크롤이 두 행 짧아진다.
 * 데스크탑 전용(≥1440px)은 한 층 위 DesktopOnly가 강제한다.
 */
"use client";

import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import { TOTAL_CONTESTANTS } from "@/lib/types/tournament";
import { GRID_COLUMNS } from "@/lib/lab/gridLayout";
import type { SourcingStates } from "@/lib/lab/sourcingDraft";
import type { ReviewFlags } from "@/lib/lab/reviewFlags";
import { ContestantEditor, slotDomId } from "./ContestantEditor";

interface ContestantGridProps {
  contestants: ContestantDraft[];
  onChange: (index: number, patch: Partial<ContestantDraft>) => void;
  /** LAB-EV-1 W5 — 영상이 붙은 슬롯의 미세조정 열기. */
  onTune?: (index: number) => void;
  /** LAB-EV-2 — index → 소싱 배지 상태. 소싱을 돌린 적 없으면 빈 객체. */
  sourcing?: SourcingStates;
  /** LAB-UX-1 — index → 검수 배지(중복 의심·이름↔힌트 불일치). 상태에서 파생된다. */
  reviewFlags?: ReviewFlags;
  /** LAB-EV-2 — 슬롯 1개 캐시 우회 재검색. */
  onRefreshVideo?: (index: number) => void;
  /** 지금 재검색 중인 슬롯 index (없으면 null). */
  refreshingIndex?: number | null;
}

/**
 * 중복 의심 배지의 [N번 보기] — 상대 칸으로 데려간다.
 *
 * 48칸 중 3번과 38번이 같은 인물이라는 걸 알아도, 38번을 손으로 찾아 스크롤하는
 * 동안 운영자는 무엇을 비교하려 했는지 잊는다. 그래서 이동은 화면이 한다.
 */
function scrollToSlot(index: number): void {
  const node = document.getElementById(slotDomId(index));
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  // 스크롤만 하면 어디에 내렸는지 모른다 — 이름 칸에 포커스를 준다(고칠 자리다).
  node.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
}

export function ContestantGrid({
  contestants,
  onChange,
  onTune,
  sourcing,
  reviewFlags,
  onRefreshVideo,
  refreshingIndex = null,
}: ContestantGridProps): JSX.Element {
  return (
    <div
      data-testid="contestant-grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
        gap: 12,
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
              affiliation: "",
              imageSearchKeyword: "",
            }
          }
          onChange={onChange}
          onTune={onTune}
          sourcing={sourcing?.[i]}
          reviewFlags={reviewFlags?.[i]}
          onGoToSlot={scrollToSlot}
          // 소싱을 한 번도 안 돌린 칸에는 [새 영상 찾기]가 뜨지 않는다 —
          // 검색 콜을 쓰는 버튼이라 배지와 함께만 노출한다.
          onRefreshVideo={sourcing?.[i] ? onRefreshVideo : undefined}
          refreshing={refreshingIndex === i}
        />
      ))}
    </div>
  );
}
