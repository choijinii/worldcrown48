/**
 * voteStore (Domain 3 · The Arena) — Zustand.
 *
 * Holds ONLY the votes cache + the loaded tournament/contestants (ADR-0001).
 * The bracket and all progress are NOT stored — they're recomputed from
 * `votes` on every render via the pure selectors below (matches/roundProgress).
 * This keeps the store a thin Firestore-backed cache and makes the whole flow
 * refresh-safe.
 *
 * Firestore I/O (loadTournament) is glue, covered by E2E; the pure selectors
 * and the dedupe in addVote are unit-tested.
 */
import { create } from "zustand";
import {
  collection,
  getDoc,
  getDocs,
  doc,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Contestant, Tournament } from "@/lib/types/tournament";
import {
  matchesForRound,
  type ArenaMatch,
  type ArenaVote,
} from "./matches";
import {
  currentMatchIndex,
  currentRound,
  isTournamentComplete,
} from "./roundProgress";

export interface VoteSlice {
  tournament: Tournament | null;
  contestants: Contestant[];
  votes: ArenaVote[];
}

interface VoteState extends VoteSlice {
  loading: boolean;
  error: string | null;

  setData: (
    tournament: Tournament,
    contestants: Contestant[],
    votes: ArenaVote[],
  ) => void;
  addVote: (vote: ArenaVote) => void;
  reset: () => void;

  loadTournament: (tournamentId: string, userId: string) => Promise<void>;
}

const EMPTY: VoteSlice & { loading: boolean; error: string | null } = {
  tournament: null,
  contestants: [],
  votes: [],
  loading: false,
  error: null,
};

export const useVoteStore = create<VoteState>((set, get) => ({
  ...EMPTY,

  setData: (tournament, contestants, votes) =>
    set({ tournament, contestants, votes, loading: false, error: null }),

  addVote: (vote) =>
    set((s) =>
      s.votes.some((v) => v.matchId === vote.matchId)
        ? s // dedupe — one vote per match (no skip / no double)
        : { votes: [...s.votes, vote] },
    ),

  reset: () => set({ ...EMPTY }),

  loadTournament: async (tournamentId, userId) => {
    // ── DIAG (temporary): trace loadTournament phases via globalThis (console
    // is stripped in prod, globalThis is not). Read by the E2E via evaluate. ──
    const diag = (p: Record<string, unknown>) => {
      const g = globalThis as { __loadDiag?: unknown[] };
      (g.__loadDiag ??= []).push({ t: Date.now(), ...p });
    };
    diag({ phase: "start", tournamentId, userId });
    set({ loading: true, error: null });
    try {
      const db = getDb();
      const tSnap = await getDoc(doc(db, "tournaments", tournamentId));
      diag({ phase: "t-read", exists: tSnap.exists() });
      if (!tSnap.exists()) {
        set({ loading: false, error: "not-found" });
        return;
      }
      const tournament = { id: tSnap.id, ...tSnap.data() } as Tournament;

      const cSnap = await getDocs(
        query(
          collection(db, "contestants"),
          where("tournamentId", "==", tournamentId),
          orderBy("order"),
        ),
      );
      const contestants = cSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Contestant,
      );
      diag({ phase: "contestants-read", count: contestants.length });

      const vSnap = await getDocs(
        query(
          collection(db, "votes"),
          where("userId", "==", userId),
          where("tournamentId", "==", tournamentId),
        ),
      );
      const votes: ArenaVote[] = vSnap.docs.map((d) => {
        const data = d.data() as {
          round: number;
          matchId: string;
          contestantId: string;
        };
        return {
          round: data.round,
          matchId: data.matchId,
          contestantId: data.contestantId,
        };
      });

      diag({ phase: "votes-read", count: votes.length });
      set({ tournament, contestants, votes, loading: false, error: null });
      diag({ phase: "done" });
    } catch (e) {
      diag({
        phase: "error",
        message: String((e as Error)?.message ?? e),
        code: (e as { code?: string })?.code ?? null,
      });
      set({ loading: false, error: "load-failed" });
    }
  },
}));

// ── Pure selectors (recompute the bracket from votes each call) ──────────

export function selectCurrentRound(s: VoteSlice) {
  return currentRound(s.votes);
}

export function selectIsComplete(s: VoteSlice): boolean {
  return isTournamentComplete(s.votes);
}

/** The match the Voter should see now — null when the run is complete. */
export function selectCurrentMatch(s: VoteSlice): ArenaMatch | null {
  if (!s.tournament || s.contestants.length === 0) return null;
  if (isTournamentComplete(s.votes)) return null;
  const round = currentRound(s.votes);
  const matches = matchesForRound(
    s.tournament.id,
    s.contestants,
    s.votes,
    round,
  );
  return matches[currentMatchIndex(s.votes, round)] ?? null;
}
