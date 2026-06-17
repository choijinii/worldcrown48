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
  const context = await browser.newContext({
    extraHTTPHeaders: bypassSecret
      ? {
          "x-vercel-protection-bypass": bypassSecret,
          "x-vercel-set-bypass-cookie": "true",
        }
      : undefined,
  });
  const page = await context.newPage();
  await page.goto(previewUrl);
  await page.evaluate(
    async ({ token, config }) => {
      const { initializeApp, getApps, getApp } = await import("firebase/app");
      const {
        browserLocalPersistence,
        getAuth,
        setPersistence,
        signInWithCustomToken,
      } = await import("firebase/auth");
      const app = getApps().length ? getApp() : initializeApp(config);
      const auth = getAuth(app);
      await setPersistence(auth, browserLocalPersistence);
      await signInWithCustomToken(auth, token);
    },
    { token: customToken, config: publicConfig },
  );

  await page.waitForTimeout(1500);
  mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true });
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}
