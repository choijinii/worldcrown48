/**
 * bracket_seeds — the per-Voter, per-Tournament random seed (ADR-0007).
 *
 * doc id = `${uid}_${tournamentId}`, shape `{ seed: number, createdAt }`.
 * The seed is created ONCE on first Arena entry and is then immutable
 * (firestore.rules: owner read via doc-id prefix + create-once, no update/
 * delete). It is the third input to the pure bracket (contestants, votes,
 * seed) — making each Voter's pairing random yet refresh-stable, and letting
 * linkSessionVote carry it across a guest→login so the bracket never
 * reshuffles (§8 Edge #1).
 *
 * HARDENING (2026-08-05, verdict §4/§8). This used to `await setDoc(...)`
 * before the Arena could render. `setDoc` resolves only when the backend acks,
 * so a stalled Write channel left `loadTournament` pending forever and the
 * Arena stuck on "불러오는 중…" with no error surface — reproduced in CI on
 * every run since HF-2 (4 failing C-1 tests, 14 attempts, zero flakes).
 *
 * Now the write is raced against a timeout and the seed is returned either way.
 * Correctness is preserved by caching the seed locally BEFORE the race: a
 * refresh during the pending window reuses the same value instead of
 * reshuffling an in-flight bracket, and whenever the server does hold a seed it
 * always wins. The create-once rule still guarantees a single authoritative
 * value across tabs and retries.
 *
 * The Firestore/Storage binding below is glue (covered by E2E); the decision
 * logic is `resolveBracketSeed`, unit-tested in __tests__/arena/bracketSeed.
 */
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

/**
 * How long first render waits for the create to ack before proceeding.
 *
 * Deliberately short. The Arena only needs to KNOW the seed to render — it does
 * not need it persisted, and the local cache below already makes an unconfirmed
 * seed refresh-stable. The only thing this window buys is adopting the winner
 * of a two-tab create race one render earlier; a rules/create-once rejection
 * comes back within a single round trip, so a few hundred ms covers it.
 *
 * A first cut used 3s and it was plainly too long: with CI's slower reads the
 * Arena still had not rendered inside the E2E's 5s budget (375/414px stayed on
 * "Loading…"). Blocking a Voter's first paint on a write they do not need is
 * the same mistake in miniature.
 */
export const SEED_PERSIST_TIMEOUT_MS = 400;

export function bracketSeedDocId(uid: string, tournamentId: string): string {
  return `${uid}_${tournamentId}`;
}

/** A fresh unsigned 32-bit seed from the CSPRNG (mulberry32 masks with >>>0). */
export function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}

/** Injected I/O so the decision logic stays pure and testable. */
export interface SeedIO {
  /** The authoritative server value, or null when the doc does not exist. */
  read: () => Promise<number | null>;
  /** Create-once write. Rejects if another writer won the race. */
  create: (seed: number) => Promise<void>;
  cacheGet: () => number | null;
  cacheSet: (seed: number) => void;
  cacheClear: () => void;
  newSeed: () => number;
  timeoutMs: number;
}

export interface SeedResult {
  seed: number;
  /** `pending-local` = usable now, not yet confirmed by the backend. */
  source: "server" | "created" | "pending-local";
}

/**
 * Resolve the Voter's seed without ever blocking indefinitely.
 *
 * A `read` rejection propagates — that IS a load failure and the caller
 * surfaces it. A `create` that stalls or fails does not: the locally cached
 * seed is already refresh-stable, and the server reconciles on a later entry.
 */
export async function resolveBracketSeed(io: SeedIO): Promise<SeedResult> {
  const existing = await io.read();
  if (existing !== null) {
    io.cacheClear();
    return { seed: existing, source: "server" };
  }

  // Cache BEFORE the race — this is what keeps the bracket refresh-stable if
  // the ack never arrives. Reuse a pending seed rather than minting a new one.
  const seed = io.cacheGet() ?? io.newSeed();
  io.cacheSet(seed);

  const TIMEOUT = Symbol("timeout");
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Keep a handle on the write so a late rejection is never unhandled — the
  // background write outlives this function by design.
  const write = io.create(seed).then(
    () => null,
    (e: unknown) => e ?? new Error("create failed"),
  );

  const outcome = await Promise.race([
    write,
    new Promise<typeof TIMEOUT>((r) => {
      timer = setTimeout(() => r(TIMEOUT), io.timeoutMs);
    }),
  ]);
  if (timer) clearTimeout(timer);

  // Still in flight: usable now, reconciled later.
  if (outcome === TIMEOUT) return { seed, source: "pending-local" };

  // Acked.
  if (outcome === null) {
    io.cacheClear();
    return { seed, source: "created" };
  }

  // Rejected — most often the create-once rule rejecting the loser of a
  // two-tab race. Adopt the winner's value if it is there.
  const winner = await io.read().catch(() => null);
  if (winner !== null) {
    io.cacheClear();
    return { seed: winner, source: "server" };
  }
  return { seed, source: "pending-local" };
}

/**
 * localStorage key for a seed that has not been confirmed by the backend yet.
 *
 * Handoff §5 forbids localStorage for AUTH/SESSION markers; a bracket seed is
 * neither — it is per-Tournament game state, and it needs to be shared across
 * tabs precisely so a stalled write cannot hand two tabs different brackets
 * (the duplicate-winner hazard ADR-0007 exists to prevent). It is cleared the
 * moment the server holds the value.
 */
function cacheKey(uid: string, tournamentId: string): string {
  return `wc48_bracket_seed_${bracketSeedDocId(uid, tournamentId)}`;
}

function browserCache(uid: string, tournamentId: string) {
  const key = cacheKey(uid, tournamentId);
  const ls = (): Storage | null => {
    try {
      return typeof window === "undefined" ? null : window.localStorage;
    } catch {
      return null; // Safari private mode / storage disabled
    }
  };
  return {
    cacheGet: (): number | null => {
      const raw = ls()?.getItem(key);
      if (!raw) return null;
      const n = Number(raw);
      return Number.isSafeInteger(n) ? n : null;
    },
    cacheSet: (seed: number): void => {
      try {
        ls()?.setItem(key, String(seed));
      } catch {
        // Quota/private mode — the seed is still returned, just not cached.
      }
    },
    cacheClear: (): void => {
      try {
        ls()?.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * Read the Voter's seed for this Tournament; create it once if absent.
 * Never blocks first render on the backend ack — see resolveBracketSeed.
 */
export async function loadOrCreateBracketSeed(
  db: Firestore,
  uid: string,
  tournamentId: string,
  timeoutMs: number = SEED_PERSIST_TIMEOUT_MS,
): Promise<number> {
  const ref = doc(db, "bracket_seeds", bracketSeedDocId(uid, tournamentId));
  const result = await resolveBracketSeed({
    read: async () => {
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data().seed as number) : null;
    },
    create: (seed) => setDoc(ref, { seed, createdAt: serverTimestamp() }),
    newSeed: randomSeed,
    timeoutMs,
    ...browserCache(uid, tournamentId),
  });
  return result.seed;
}
