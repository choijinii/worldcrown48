/**
 * useRoundTransition — subscribe to the Voter's roundProgress doc (ADR-0001).
 *
 * Firestore-only (no RTDB): advanceRound writes roundProgress/{uid}_{tid} when
 * the Voter completes a round; this hook surfaces it via onSnapshot so the page
 * can play the RoundTransition and, at THE FINAL, show the Champion.
 */
"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

export interface RoundProgressEvent {
  fromRound?: number;
  toRound?: number;
  complete?: boolean;
  championId?: string | null;
}

export function useRoundTransition(
  userId: string | undefined,
  tournamentId: string | undefined,
): RoundProgressEvent | null {
  const [event, setEvent] = useState<RoundProgressEvent | null>(null);

  useEffect(() => {
    if (!userId || !tournamentId) return;
    const ref = doc(getDb(), "roundProgress", `${userId}_${tournamentId}`);
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
  }, [userId, tournamentId]);

  return event;
}
