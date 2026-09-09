/**
 * useRoundTransition — subscribe to the Voter's roundProgress doc (ADR-0001).
 *
 * Firestore-only (no RTDB): advanceRound writes roundProgress/{uid}_{tid}[_r{n}] when
 * the Voter completes a round; this hook surfaces it via onSnapshot so the page
 * can play the RoundTransition and, at THE FINAL, show the Champion.
 *
 * RUN-1: 회차마다 진행 문서가 다르다. 1회차에 고정하면 2판째의 라운드 전환 안내가 영영
 * 안 뜨고 THE FINAL에서 멈춘다 — 2026-07-06 HF-1.6과 **정확히 같은 유형**의 P0다.
 * 회차는 `voteStore.run.displayRunIndex` 가 정본이고 이 훅은 받아 쓰기만 한다.
 */
"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { runDocId } from "@/lib/run/runDocId";

export interface RoundProgressEvent {
  fromRound?: number;
  toRound?: number;
  complete?: boolean;
  championId?: string | null;
}

export function useRoundTransition(
  userId: string | undefined,
  tournamentId: string | undefined,
  runIndex: number | undefined,
): RoundProgressEvent | null {
  const [event, setEvent] = useState<RoundProgressEvent | null>(null);

  useEffect(() => {
    // 회차를 모르는 동안(로드 전)에는 구독하지 않는다 — 1회차로 넘겨짚으면 2판째를 돌던
    // 팬이 1판째 완주 이벤트를 받아 화면이 곧바로 완주로 튄다.
    if (!userId || !tournamentId || !runIndex) return;
    const ref = doc(getDb(), "roundProgress", runDocId(userId, tournamentId, runIndex));
    const unsub = onSnapshot(
      ref,
      (snap) =>
        setEvent(snap.exists() ? (snap.data() as RoundProgressEvent) : null),
      (err) => {
        // HF-1.6: never swallow silently — a permission-denied here (e.g. a
        // rule that rejects the not-yet-existing doc) terminates the listener,
        // so the round-transition overlay never fires and THE FINAL hangs.
        console.error("[useRoundTransition] onSnapshot error", err);
        setEvent(null);
      },
    );
    return unsub;
  }, [userId, tournamentId, runIndex]);

  return event;
}
