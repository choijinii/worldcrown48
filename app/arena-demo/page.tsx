/**
 * /arena-demo — visual-parity harness (NOT shipped to Voters; dev/QA only).
 *
 * Renders the C-1 surfaces with mock data so they can be screenshotted next to
 * the wireframe (handoff visual-compare obligation). `?surface=vs|transition|final`.
 */
"use client";

import { useSearchParams } from "next/navigation";
import type { Contestant } from "@/lib/types/tournament";
import styles from "@/components/arena/arena.module.css";
import { MatchView } from "@/components/arena/MatchView";
import { RoundTransition } from "@/components/arena/RoundTransition";
import { FinalPickView } from "@/components/arena/FinalPickView";

function c(id: string, name: string, nat: string, pos: string): Contestant {
  return { id, name, nationality: nat, position: pos, imageUrl: "" } as Contestant;
}

export default function ArenaDemo(): JSX.Element {
  const surface = useSearchParams().get("surface") ?? "vs";
  return (
    <div className={styles.arena} data-demo-surface={surface}>
      {surface === "vs" && (
        <MatchView
          title="“Strikers of the Century”"
          left={c("a", "M. Adeyemi", "BR", "FORWARD · #9")}
          right={c("b", "K. Sato", "JP", "WINGER · #7")}
          onVote={() => {}}
        />
      )}
      {surface === "transition" && (
        <RoundTransition
          fromRound={1}
          toRound={2}
          meta="24 Contestants · 12 Matches ahead · 곧 시작합니다"
        />
      )}
      {surface === "final" && (
        <FinalPickView
          finalists={[
            c("a", "M. Adeyemi", "BR", "FORWARD · #9"),
            c("b", "L. Marchetti", "IT", "STRIKER · #11"),
            c("d", "J. Park", "KR", "PLAYMAKER · #10"),
          ]}
          onPick={() => {}}
        />
      )}
    </div>
  );
}
