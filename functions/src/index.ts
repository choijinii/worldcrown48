/**
 * WorldCrown48 — Firebase Cloud Functions entry point.
 *
 * Currently exported:
 *   hashIp — server-side SHA-256 of the calling client's IP. Used by the
 *            E-1 Policy Hub consent flow so the plaintext IP never reaches
 *            the browser (handoff §9 trap 8 — GDPR exposure).
 *
 * Future functions land here (Functions v2 callable pattern).
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as crypto from "node:crypto";

// Secret containing the IP-hash salt. Set with:
//   firebase functions:secrets:set IP_HASH_SALT
// The salt prevents rainbow-table reversal of the hash (~4B IPv4 space).
const IP_HASH_SALT = defineSecret("IP_HASH_SALT");

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
 *   - On any failure we throw an HttpsError so the client falls back to
 *     `ipHash: ""` (still legally valid consent — IP hash is for fraud
 *     pattern detection, not for the consent itself).
 */
export const hashIp = onCall(
  {
    region: "us-central1",
    secrets: [IP_HASH_SALT],
    // CORS — the function is called from the Next.js client on
    // worldcrown48.com and Vercel preview domains. Functions v2 reads
    // these from this option.
    cors: [
      /^https:\/\/worldcrown48\.com$/,
      /^https:\/\/.*\.vercel\.app$/,
      /^http:\/\/localhost:\d+$/,
    ],
  },
  async (req): Promise<{ ipHash: string }> => {
    const ip = req.rawRequest?.ip ?? "";
    if (!ip) {
      // No IP available — return empty hash rather than crashing the
      // consent save. The client treats "" as "no fraud-detection data".
      return { ipHash: "" };
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
