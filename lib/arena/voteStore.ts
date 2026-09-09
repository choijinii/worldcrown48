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
import { resolveActiveRun, type ActiveRunState } from "@/lib/run/activeRun";
import { isDeadlinePassed, toDeadlineMs } from "@/lib/run/deadline";
import { todayKST } from "@/lib/run/kstReset";
import { runDocId, tournamentRunsDocId } from "@/lib/run/runDocId";

export interface VoteSlice {
  tournament: Tournament | null;
  contestants: Contestant[];
  votes: ArenaVote[];
  /** Per-Voter, per-Tournament bracket seed (ADR-0007). 0 until loaded. */
  seed: number;
  /**
   * 이 아레나의 판 상태 — **회차를 아는 유일한 곳** (RUN-1).
   *
   * 게이트·화면·구독·씨앗이 전부 회차를 필요로 하는데 각자 판정하면 §9 함정 5가 클라이언트
   * 안에서 재현된다. 그래서 `loadTournament` 가 한 번 읽어 `resolveActiveRun` 을 돌리고,
   * 나머지는 이 값을 읽기만 한다. 로드 전에는 null 이다.
   */
  run: ActiveRunState | null;
}

interface VoteState extends VoteSlice {
  loading: boolean;
  error: string | null;

  setData: (
    tournament: Tournament,
    contestants: Contestant[],
    votes: ArenaVote[],
    seed: number,
    run?: ActiveRunState | null,
  ) => void;
  addVote: (vote: ArenaVote) => void;
  reset: () => void;
  /** [다시 참여] — 다음 회차로 화면을 옮긴다. */
  startNextRun: () => void;

  loadTournament: (
    tournamentId: string,
    userId: string,
    isAnonymous: boolean,
  ) => Promise<void>;
}

const EMPTY: VoteSlice & { loading: boolean; error: string | null } = {
  tournament: null,
  contestants: [],
  votes: [],
  seed: 0,
  run: null,
  loading: false,
  error: null,
};

export const useVoteStore = create<VoteState>((set, get) => ({
  ...EMPTY,

  setData: (tournament, contestants, votes, seed, run = null) =>
    set({ tournament, contestants, votes, seed, run, loading: false, error: null }),

  addVote: (vote) =>
    set((s) =>
      s.votes.some((v) => v.matchId === vote.matchId)
        ? s // dedupe — one vote per match (no skip / no double)
        : { votes: [...s.votes, vote] },
    ),

  reset: () => set({ ...EMPTY }),

  /**
   * [다시 참여] — 다음 회차로 화면을 옮긴다.
   *
   * 서버는 아직 아무것도 모른다. 회차 카운트는 **그 판의 첫 선택** 때 `onVote` 가 한다
   * (§5 DO 4의 구현 정의) — 들어왔다 한 번도 안 고르고 나가면 한도가 깎이지 않는다.
   * 그래서 여기서는 표시 회차만 올리고 선택 기록을 비운다.
   *
   * 씨앗을 0으로 되돌리는 것이 중요하다: 새 회차는 **새 문서 id**(`_r{n+1}`)에서 씨앗을
   * 다시 받아야 대진표가 달라진다(AC 3). 페이지의 effect가 seed === 0 을 보고 받아온다.
   */
  startNextRun: () =>
    set((s) => {
      if (!s.run?.canPlayAgain) return s;
      return {
        votes: [],
        seed: 0,
        run: {
          ...s.run,
          displayRunIndex: s.run.nextRunIndex,
          screen: "play",
          canPlayAgain: false,
        },
      };
    }),

  loadTournament: async (tournamentId, userId, isAnonymous) => {
    set({ loading: true, error: null });
    try {
      // Hard ceiling on the whole load. Firestore reads resolve when the
      // backend answers; with no answer they simply stay pending, which is how
      // the Arena ended up stuck on "불러오는 중…" forever (verdict §4). A
      // bounded failure the Voter can retry beats an indefinite spinner.
      await withTimeout(
        loadInto(tournamentId, userId, isAnonymous, set),
        ARENA_LOAD_TIMEOUT_MS,
      );
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
  isAnonymous: boolean,
  set: (partial: Partial<VoteState>) => void,
): Promise<void> {
  const db = getDb();
  const today = todayKST();

  // ── 1단계: 회차를 정하는 데 필요한 사실들 (병렬) ────────────────────────
  // votes 쿼리에 회차 필터를 걸려면 **먼저** 회차를 알아야 한다 — 그래서 두 단계다.
  // 한 단계로 합치면 그 대회의 모든 판의 선택을 통째로 불러오게 되고, 그게 §9 함정 9다.
  const [tSnap, cSnap, runsSnap, guestSnap, legacySnap] = await Promise.all([
    getDoc(doc(db, "tournaments", tournamentId)),
    getDocs(
      query(
        collection(db, "contestants"),
        where("tournamentId", "==", tournamentId),
        orderBy("order"),
      ),
    ),
    getDoc(doc(db, "tournament_runs", tournamentRunsDocId(userId, tournamentId))),
    getDoc(doc(db, "guest_runs", userId)),
    // 접미사 없는 옛 진행 문서 = 회차 도입 전의 1회차 판 (§3.0 B안 · AC 11).
    getDoc(doc(db, "roundProgress", runDocId(userId, tournamentId, 1))),
  ]);

  if (!tSnap.exists()) throw NOT_FOUND;
  const tournament = { id: tSnap.id, ...tSnap.data() } as Tournament;

  const contestants = cSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Contestant,
  );

  const stored = runsSnap.exists() ? runsSnap.data() : {};
  const guest = guestSnap.exists() ? guestSnap.data() : {};
  const storedRunIndex = Number(stored.runIndex ?? 0);

  // 현재 회차의 완주 여부 — 이어하기와 새 판을 가르는 유일한 사실. 회차가 1 이하면
  // 접미사 없는 문서가 곧 그 판이므로 위에서 이미 읽은 스냅샷을 그대로 쓴다.
  const currentSnap =
    storedRunIndex > 1
      ? await getDoc(
          doc(db, "roundProgress", runDocId(userId, tournamentId, storedRunIndex)),
        )
      : legacySnap;

  const run = resolveActiveRun({
    runIndex: storedRunIndex,
    legacyRunExists: legacySnap.exists(),
    lastRunDate: (stored.lastRunDate as string | undefined) ?? null,
    runsToday: Number(stored.runsToday ?? 0),
    currentRunComplete:
      currentSnap.exists() && currentSnap.data()?.complete === true,
    deadlinePassed: isDeadlinePassed(
      toDeadlineMs(tournament.tournamentDeadline),
      Date.now(),
    ),
    todayKST: today,
    isAnonymous,
    guestLastRunDate: (guest.lastRunDate as string | undefined) ?? null,
    guestRunsToday: Number(guest.runsToday ?? 0),
  });

  // ── 2단계: 그 회차의 선택 기록과 씨앗 (병렬) ────────────────────────────
  // 🔴 §9 함정 9: 회차 필터가 없으면 2판째가 1판째 24건을 물려받아 시작하자마자 완주된다.
  // 옛 votes 에는 runIndex 필드가 없어 이 필터에 안 걸린다 — 배포 시점에 진행 중인 판이
  // 0건임을 실측으로 확인했고(0단계), 완주 기록·Crown Card는 roundProgress·crown_cards 에
  // 있어 무사하다. linkSessionVote 는 이관 중 그 필드를 채운다.
  const [vSnap, seed] = await Promise.all([
    getDocs(
      query(
        collection(db, "votes"),
        where("userId", "==", userId),
        where("tournamentId", "==", tournamentId),
        where("runIndex", "==", run.displayRunIndex),
      ),
    ),
    loadOrCreateBracketSeed(db, userId, tournamentId, run.displayRunIndex),
  ]);

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

  set({ tournament, contestants, votes, seed, run, loading: false, error: null });
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
