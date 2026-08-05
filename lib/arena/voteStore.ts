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
import { loadOrCreateBracketSeed } from "./bracketSeed";
import {
  currentMatchIndex,
  currentRound,
  isTournamentComplete,
} from "./roundProgress";

export interface VoteSlice {
  tournament: Tournament | null;
  contestants: Contestant[];
  votes: ArenaVote[];
  /** Per-Voter, per-Tournament bracket seed (ADR-0007). 0 until loaded. */
  seed: number;
}

interface VoteState extends VoteSlice {
  loading: boolean;
  error: string | null;

  setData: (
    tournament: Tournament,
    contestants: Contestant[],
    votes: ArenaVote[],
    seed: number,
  ) => void;
  addVote: (vote: ArenaVote) => void;
  reset: () => void;

  loadTournament: (tournamentId: string, userId: string) => Promise<void>;
}

const EMPTY: VoteSlice & { loading: boolean; error: string | null } = {
  tournament: null,
  contestants: [],
  votes: [],
  seed: 0,
  loading: false,
  error: null,
};

export const useVoteStore = create<VoteState>((set, get) => ({
  ...EMPTY,

  setData: (tournament, contestants, votes, seed) =>
    set({ tournament, contestants, votes, seed, loading: false, error: null }),

  addVote: (vote) =>
    set((s) =>
      s.votes.some((v) => v.matchId === vote.matchId)
        ? s // dedupe — one vote per match (no skip / no double)
        : { votes: [...s.votes, vote] },
    ),

  reset: () => set({ ...EMPTY }),

  loadTournament: async (tournamentId, userId) => {
    set({ loading: true, error: null });
    try {
      // Hard ceiling on the whole load. Firestore reads resolve when the
      // backend answers; with no answer they simply stay pending, which is how
      // the Arena ended up stuck on "불러오는 중…" forever (verdict §4). A
      // bounded failure the Voter can retry beats an indefinite spinner.
      await withTimeout(loadInto(tournamentId, userId, set), ARENA_LOAD_TIMEOUT_MS);
    } catch (e) {
      set({
        loading: false,
        error: e === NOT_FOUND ? "not-found" : "load-failed",
      });
    }
  },
}));

/** Sentinel so the "no such tournament" case survives the timeout wrapper. */
const NOT_FOUND = Symbol("not-found");

/** Whole-load ceiling — see loadTournament. */
export const ARENA_LOAD_TIMEOUT_MS = 15_000;

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, rej) => {
        timer = setTimeout(() => rej(new Error("arena load timed out")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function loadInto(
  tournamentId: string,
  userId: string,
  set: (partial: Partial<VoteState>) => void,
): Promise<void> {
  const db = getDb();

  // The three reads are independent, so issue them together instead of
  // serially. They were sequential, which stacked three round trips before the
  // Arena could paint — ~4.3s on a CI runner. Only the tournament read decides
  // not-found; the other two are simply discarded in that case.
  const [tSnap, cSnap, vSnap] = await Promise.all([
    getDoc(doc(db, "tournaments", tournamentId)),
    getDocs(
      query(
        collection(db, "contestants"),
        where("tournamentId", "==", tournamentId),
        orderBy("order"),
      ),
    ),
    getDocs(
      query(
        collection(db, "votes"),
        where("userId", "==", userId),
        where("tournamentId", "==", tournamentId),
      ),
    ),
  ]);

  if (!tSnap.exists()) throw NOT_FOUND;
  const tournament = { id: tSnap.id, ...tSnap.data() } as Tournament;

  const contestants = cSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Contestant,
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

  // Per-Voter bracket seed (ADR-0007): created once on first entry, then
  // immutable. linkSessionVote carries it across a guest→login so the bracket
  // never reshuffles (§8 Edge #1). No longer blocks first render on the
  // backend ack — see bracketSeed.resolveBracketSeed.
  const seed = await loadOrCreateBracketSeed(db, userId, tournamentId);

  set({ tournament, contestants, votes, seed, loading: false, error: null });
}

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
    s.seed,
  );
  return matches[currentMatchIndex(s.votes, round)] ?? null;
}
