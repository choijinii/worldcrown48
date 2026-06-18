/**
 * Shared CORS allowlist for every Functions v2 callable.
 *
 * Single source of truth — replaces three identical copies that previously
 * lived in onUserDelete.ts / linkSessionVote.ts / index.ts (hashIp). The
 * copy-paste version drifted: only the apex `worldcrown48.com` was matched,
 * `www.worldcrown48.com` (where the production CDN actually serves) was
 * silently rejected at the CORS preflight, manifesting as
 *   "Response to preflight request doesn't pass access control check:
 *    No 'Access-Control-Allow-Origin' header is present on the requested
 *    resource"
 * on every callable invocation from production.
 *
 * Add any new allowed origin here and every callable picks it up on the
 * next deploy — no per-function edits.
 */
export const ALLOWED_ORIGINS = [
  // Production — both apex and www. The site redirects apex → www today,
  // but apex stays in the list so a future config change doesn't reopen
  // this bug.
  /^https:\/\/(www\.)?worldcrown48\.com$/,
  // Every Vercel preview. Wildcard subdomain only — never bare vercel.app.
  /^https:\/\/[^.]+(\.[^.]+)*\.vercel\.app$/,
  // Local dev — `next dev` on any port.
  /^http:\/\/localhost:\d+$/,
];
