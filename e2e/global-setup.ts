/**
 * Playwright global setup — produce `tests/.auth/user.json`.
 *
 * D-1.1 specs assume a signed-in voter. We avoid driving the Google OAuth
 * popup (impractical in CI) by minting a custom token from a service-account
 * JSON, signing in once via `signInWithCustomToken`, then saving the
 * resulting storage state.
 *
 * Required env (CI uses repo secrets):
 *   - PREVIEW_URL                    — base URL (defaults to localhost:3000)
 *   - TEST_UID                       — uid the test voter will own
 *   - FIREBASE_ADMIN_SDK_KEY         — base64 OR raw JSON service-account key
 *   - NEXT_PUBLIC_FIREBASE_API_KEY   — same value as `.env.local`
 *   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   - NEXT_PUBLIC_FIREBASE_APP_ID
 *
 * If any are missing we still prime the Vercel bypass cookie (signed-out) via
 * primeBypassOnly so PUBLIC-page specs can reach a Protected preview; auth-gated
 * specs then fail loudly (signed out), which is the right signal. With no bypass
 * secret (local/unprotected) we write an empty state.
 */
import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import * as admin from "firebase-admin";

const STORAGE_STATE_PATH = "tests/.auth/user.json";

// Firebase Web SDK is loaded inside the page via gstatic CDN because
// page.evaluate() runs in a plain browser context with no bundler — bare
// specifiers like "firebase/app" can't be resolved there. Keep this in
// sync with the "firebase" version in package.json.
const FIREBASE_CDN_VERSION = "12.14.0";

interface PublicFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

function loadServiceAccount(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded) as admin.ServiceAccount;
}

function loadPublicConfig(): PublicFirebaseConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return { apiKey, authDomain, projectId, appId };
}

function writeEmptyState(reason: string): void {
  mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true });
  writeFileSync(
    STORAGE_STATE_PATH,
    JSON.stringify({ cookies: [], origins: [] }),
  );
  console.warn(
    `[global-setup] ${reason} — wrote empty storage state. Auth-gated specs will fail.`,
  );
}

/**
 * Prime ONLY the Vercel Preview Protection bypass cookie (no auth), then save a
 * signed-out storageState. Lets a PUBLIC spec reach a Protected preview when the
 * auth secrets are absent. Falls back to an empty state when there is no bypass
 * secret (local/unprotected) or priming fails, so the storageState file always
 * exists for the runner. The query-param form issues an origin-scoped
 * `_vercel_jwt` cookie + 307 to the clean URL (same mechanism as the auth path)
 * without leaking the secret cross-origin.
 */
async function primeBypassOnly(
  previewUrl: string,
  bypassSecret: string | undefined,
): Promise<void> {
  if (!bypassSecret) {
    writeEmptyState(
      "auth secrets absent and no VERCEL_AUTOMATION_BYPASS_SECRET — nothing to prime",
    );
    return;
  }
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const primedUrl = `${previewUrl}?x-vercel-protection-bypass=${encodeURIComponent(
      bypassSecret,
    )}&x-vercel-set-bypass-cookie=true`;
    await page.goto(primedUrl);
    mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true });
    await context.storageState({ path: STORAGE_STATE_PATH });
    console.log(
      "[global-setup] auth secrets absent — primed Vercel bypass cookie only (signed-out storageState for public specs).",
    );
  } catch (err) {
    writeEmptyState(`bypass-only priming failed: ${(err as Error).message}`);
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const previewUrl = process.env.PREVIEW_URL ?? "http://localhost:3000";
  const testUid = process.env.TEST_UID;
  const serviceAccount = loadServiceAccount();
  const publicConfig = loadPublicConfig();
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  // Auth-less path: without the auth secrets we can't sign a test user in, but
  // PUBLIC-page specs (e.g. A-1 The Pitch) still must get past Vercel Preview
  // Protection. Prime ONLY the bypass cookie and save a signed-out storageState
  // — instead of bailing with no cookie, which left public specs staring at the
  // "Log in to Vercel" 401 wall (a1-pitch AC-1/AC-2/AC-11). Auth-gated specs
  // still fail loudly (signed out), which is the right signal.
  if (!serviceAccount || !testUid || !publicConfig) {
    await primeBypassOnly(previewUrl, bypassSecret);
    return;
  }

  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const customToken = await admin.auth().createCustomToken(testUid);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Block the identitytoolkit anonymous-signup endpoint for the duration of
  // setup. The bundled app's CookieConsentProvider calls ensureAnonymousUid
  // on mount, which fires signInAnonymously in parallel with our CDN-side
  // signInWithCustomToken below. Whichever REST call returns LAST wins the
  // localStorage write, so this race produced a non-deterministic
  // storageState (sometimes anonymous, sometimes custom). Blocking
  // accounts:signUp makes signInAnonymously fail fast; signInWithCustomToken
  // uses a different endpoint (accounts:signInWithCustomToken) and proceeds.
  await page.route(
    /identitytoolkit\.googleapis\.com\/v1\/accounts:signUp/,
    (route) => route.abort(),
  );

  // Prime the Vercel Preview Protection bypass cookie before the dynamic
  // import below. Sending bypass via headers (extraHTTPHeaders) would attach
  // them to the cross-origin gstatic fetch too, triggering a CORS preflight
  // that gstatic doesn't satisfy (no Access-Control-Allow-Headers for
  // x-vercel-protection-bypass). The query-param form makes Vercel issue an
  // origin-scoped `_vercel_jwt` cookie and 307 to the clean URL — the cookie
  // covers all same-origin requests after that and never leaks cross-origin.
  const primedUrl = bypassSecret
    ? `${previewUrl}?x-vercel-protection-bypass=${encodeURIComponent(bypassSecret)}&x-vercel-set-bypass-cookie=true`
    : previewUrl;
  await page.goto(primedUrl);
  const signInResult = await page.evaluate(
    async ({ token, config, cdnVersion }) => {
      const { initializeApp, getApps, getApp } = await import(
        `https://www.gstatic.com/firebasejs/${cdnVersion}/firebase-app.js`
      );
      const {
        browserLocalPersistence,
        getAuth,
        setPersistence,
        signInWithCustomToken,
      } = await import(
        `https://www.gstatic.com/firebasejs/${cdnVersion}/firebase-auth.js`
      );
      const app = getApps().length ? getApp() : initializeApp(config);
      const auth = getAuth(app);
      await setPersistence(auth, browserLocalPersistence);
      const cred = await signInWithCustomToken(auth, token);
      // Confirm the localStorage write landed under the expected key — the
      // bundled app's SDK reads from this exact key on the next page load.
      const expectedKey = `firebase:authUser:${config.apiKey}:[DEFAULT]`;
      const persisted = window.localStorage.getItem(expectedKey);
      return {
        uid: cred.user.uid,
        isAnonymous: cred.user.isAnonymous,
        persistedKeyFound: persisted !== null,
      };
    },
    {
      token: customToken,
      config: publicConfig,
      cdnVersion: FIREBASE_CDN_VERSION,
    },
  );
  console.log(
    `[global-setup] signed in via custom token uid=${signInResult.uid} isAnonymous=${signInResult.isAnonymous} persisted=${signInResult.persistedKeyFound}`,
  );
  if (!signInResult.persistedKeyFound || signInResult.isAnonymous) {
    throw new Error(
      "[global-setup] custom-token sign-in did not persist a non-anonymous user — refusing to write a storageState that would silently produce signed-out specs.",
    );
  }

  mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true });
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}
