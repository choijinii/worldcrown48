/**
 * WorldCrown48 — Firebase Cloud Functions entry point.
 *
 * Currently exported:
 *   hashIp           — server-side SHA-256 of the calling client's IP.
 *                      Used by E-1 Policy Hub consent so the plaintext IP
 *                      never reaches the browser (handoff §9 trap 8).
 *   onUserDelete     — GDPR Art. 17 erasure (D-1 §3-4).
 *   linkSessionVote  — re-parent the guest vote after Google sign-in (D-1 §3-4).
 *
 * Future functions land here (Functions v2 callable pattern).
 *
 * Global safety options (CEO requirement):
 *   - maxInstances: 10  — caps concurrent execution to defuse runaway
 *                          billing if the endpoint is abused or hits an
 *                          autoscale spiral
 *   - region: 'asia-northeast3' — Seoul, lowest latency for KR users (the
 *                          MVP1 audience) and well-supported for Functions v2
 *
 * These apply to every function defined in this codebase unless a
 * per-function override (`onCall({ region: ... })`) is specified.
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as crypto from "node:crypto";
import { ALLOWED_ORIGINS } from "./cors";

setGlobalOptions({
  maxInstances: 10,
  region: "asia-northeast3",
});

// Secret containing the IP-hash salt. Set with:
//   firebase functions:secrets:set IP_HASH_SALT
// The salt prevents rainbow-table reversal of the hash (~4B IPv4 space).
const IP_HASH_SALT = defineSecret("IP_HASH_SALT");

// ── Rate limiter ──────────────────────────────────────────────────────
//
// Best-effort in-memory token bucket: 10 calls / IP / minute / instance.
//
// With maxInstances=10, an attacker hitting a single IP could in the
// worst case land 100 calls/min if every call hit a different instance.
// In practice instances stick to client connections, so the effective
// rate is much closer to 10/min for a determined attacker from one IP.
//
// State is per-instance memory only — no Firestore writes (which would
// invert the cost defense). Cleared on cold start, which is fine because
// the legitimate use is 1-3 calls per visitor per ~12 months.

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const PRUNE_AFTER_MS = 5 * 60_000;

interface IpBucket {
  count: number;
  windowStart: number;
}

const ipBuckets = new Map<string, IpBucket>();

function checkRateLimit(ip: string, now: number): boolean {
  const bucket = ipBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
    ipBuckets.set(ip, { count: 1, windowStart: now });
    pruneIpBuckets(now);
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT;
}

function pruneIpBuckets(now: number): void {
  // Opportunistic cleanup — only walk the map when it has grown large
  // enough to matter. Keeps the rate-limit check O(1) amortized.
  if (ipBuckets.size < 1000) return;
  for (const [ip, bucket] of ipBuckets) {
    if (now - bucket.windowStart > PRUNE_AFTER_MS) {
      ipBuckets.delete(ip);
    }
  }
}

/**
 * hashIp — callable Cloud Function.
 *
 * Returns: `{ ipHash: string }` — 64-char lowercase hex.
 *
 * Implementation notes:
 *   - We deliberately do NOT require auth here. The function can run with
 *     an anonymous Firebase Auth uid (handoff §9 trap 9) or even without
 *     one — the IP itself is what we hash, no user context needed.
 *   - The caller's IP arrives via `req.rawRequest.ip`. On a Functions v2
 *     deployment behind Google Front End, this is the de-facto client IP
 *     after standard X-Forwarded-For trimming.
 *   - We salt with a project secret so two visitors with the same IP get
 *     different hashes per deployment (defeats rainbow tables).
 *   - Rate-limited at 10 calls / IP / minute (see checkRateLimit above).
 *     Throws `resource-exhausted` (HTTP 429) on exceed — the client
 *     handles this as a transient failure and falls back to `ipHash: ""`,
 *     so the consent save still succeeds without fraud-detection data.
 *   - On other failures (no IP, no salt) we either return an empty hash
 *     or throw `failed-precondition` so the misconfiguration is visible
 *     in logs without breaking the consent save for legitimate users.
 */
export const hashIp = onCall(
  {
    secrets: [IP_HASH_SALT],
    cors: ALLOWED_ORIGINS,
  },
  async (req): Promise<{ ipHash: string }> => {
    const ip = req.rawRequest?.ip ?? "";
    if (!ip) {
      // No IP available — return empty hash rather than crashing the
      // consent save. The client treats "" as "no fraud-detection data".
      return { ipHash: "" };
    }

    // Rate limit BEFORE secret access so a flood doesn't even read the
    // secret (which counts toward Secret Manager quota).
    if (!checkRateLimit(ip, Date.now())) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many requests from this IP. Please try again in a minute.",
      );
    }

    const salt = IP_HASH_SALT.value();
    if (!salt) {
      // Misconfiguration — throw so the maintainer sees it in logs.
      throw new HttpsError(
        "failed-precondition",
        "IP_HASH_SALT secret is not set. Run `firebase functions:secrets:set IP_HASH_SALT`.",
      );
    }

    const hash = crypto
      .createHash("sha256")
      .update(salt)
      .update(ip)
      .digest("hex");

    return { ipHash: hash };
  },
);

// D-1 Locker Room callables.
export { onUserDelete } from "./onUserDelete";
export { linkSessionVote } from "./linkSessionVote";

// B-1 The Lab — AI Fill (operator-only Tournament seeding).
export { aiFillContestants } from "./aiFillContestants";

// C-1 The Arena — vote engine.
export { onVote } from "./onVote";
export { advanceRound } from "./advanceRound";

// C-2 The Arena — Crown Card generation (roundProgress.complete → Storage PNG + doc).
export { onChampionConfirmed } from "./onChampionConfirmed";

// C-3 The Arena — ranking cache + anomaly detection (1h cron, asia-northeast3).
export { scheduleRankingCache } from "./scheduleRankingCache";

// G-1 Admin Dashboard — operator-only KPI snapshot + abuse-alert feed.
// Both re-verify ADMIN_UID server-side (defense-in-depth — handoff §9 trap #5).
export { getAdminKpis } from "./getAdminKpis";
export { listAdminAlerts } from "./listAdminAlerts";
