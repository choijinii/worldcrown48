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
 * If any are missing we write an empty storage state — auth-gated specs
 * will then fail loudly, which is the right signal locally.
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

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const previewUrl = process.env.PREVIEW_URL ?? "http://localhost:3000";
  const testUid = process.env.TEST_UID;
  const serviceAccount = loadServiceAccount();
  const publicConfig = loadPublicConfig();

  if (!serviceAccount || !testUid || !publicConfig) {
    writeEmptyState(
      "FIREBASE_ADMIN_SDK_KEY / TEST_UID / NEXT_PUBLIC_FIREBASE_* missing",
    );
    return;
  }

  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const customToken = await admin.auth().createCustomToken(testUid);

  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

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
  await page.evaluate(
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
      await signInWithCustomToken(auth, token);
    },
    {
      token: customToken,
      config: publicConfig,
      cdnVersion: FIREBASE_CDN_VERSION,
    },
  );

  await page.waitForTimeout(1500);
  mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true });
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}
