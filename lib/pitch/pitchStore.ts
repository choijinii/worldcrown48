/**
 * pitchStore (Domain 1 · The Pitch) — Zustand.
 *
 * Thin Firestore-backed cache of the trending feed. `subscribeToTrending()`
 * opens a live `onSnapshot` on the handoff §5 query and returns its unsubscribe
 * so the component can clean up on unmount. The Firestore I/O is glue (covered
 * by E2E, per the voteStore precedent); the pure pieces (sort/limit/empty/meta)
 * live in lib/pitch/trending.ts and are unit-tested.
 *
 * Query (handoff §5, product-owner decision 2026-06-29 — published → active):
 *   where status == 'active'  orderBy createdAt desc  limit 12
 * Only `active` Tournaments surface on The Pitch; drafts live in the Host's Lab.
 * This where+orderBy needs the composite index added in Phase C
 * (firestore.indexes.json) — see [[feedback-firestore-composite-index]].
 */
import { create } from "zustand";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Tournament } from "@/lib/types/tournament";
import { TRENDING_LIMIT } from "./trending";

interface PitchState {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
  /** Synchronous setter — exposed for tests / SSR seeding. */
  setTournaments: (tournaments: Tournament[]) => void;
  /** Open the live trending subscription; returns the unsubscribe fn. */
  subscribeToTrending: () => () => void;
}

export const usePitchStore = create<PitchState>((set) => ({
  tournaments: [],
  loading: true,
  error: null,

  setTournaments: (tournaments) =>
    set({ tournaments, loading: false, error: null }),

  subscribeToTrending: () => {
    try {
      const db = getDb();
      const q = query(
        collection(db, "tournaments"),
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        limit(TRENDING_LIMIT),
      );
      return onSnapshot(
        q,
        (snap) => {
          const tournaments = snap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as Tournament,
          );
          set({ tournaments, loading: false, error: null });
        },
        () => set({ loading: false, error: "load-failed" }),
      );
    } catch {
      set({ loading: false, error: "load-failed" });
      return () => undefined;
    }
  },
}));
