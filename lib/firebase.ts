/**
 * Firebase initialisation — single source of truth.
 *
 * Reads `NEXT_PUBLIC_FIREBASE_*` env vars and initialises once (singleton).
 * Used by:
 *   - components/launch/FeaturedTournament   — Firestore read (`tournaments` where featured==true)
 *   - components/launch/WaitlistForm         — Firestore write (`waitlist` create)
 *   - components/policy/CookieConsentProvider — Anonymous Auth uid + Firestore I/O
 *   - lib/cookieConsent                       — Firestore reads/writes on cookieConsents
 *   - lib/analytics                           — getAnalytics on the client
 *
 * Required env vars (set in `.env.local` / Vercel project):
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 *   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *   NEXT_PUBLIC_FIREBASE_APP_ID
 *   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID   (optional — only needed for Analytics)
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApp();
    return app;
  }
  if (!config.apiKey || !config.projectId) {
    throw new Error(
      "Firebase env vars missing. Set NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID at minimum (see lib/firebase.ts)."
    );
  }
  app = initializeApp(config);
  return app;
}

let db: Firestore | null = null;

export function getDb(): Firestore {
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  return db;
}

let auth: Auth | null = null;
let persistenceReady: Promise<void> | null = null;

export function getAuthInstance(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  // Handoff §9 trap 7 — persistence must be applied to the Auth instance
  // BEFORE signInWithPopup so the resulting session survives a tab close.
  // We fire-and-cache here so it's idempotent across the app and any caller
  // that needs to gate on completion can await ensureAuthReady().
  if (typeof window !== "undefined" && !persistenceReady) {
    persistenceReady = setPersistence(auth, browserLocalPersistence).catch(
      (err) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Auth] setPersistence failed:", err);
        }
      },
    );
  }
  return auth;
}

export function ensureAuthReady(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  getAuthInstance();
  return persistenceReady ?? Promise.resolve();
}

let functions: Functions | null = null;

/**
 * Functions client for callable hashIp().
 *
 * Region defaults to `asia-northeast3` (Seoul) to match the
 * `setGlobalOptions({ region: 'asia-northeast3' })` in functions/src/index.ts.
 * Override with NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION if the deployment
 * region changes.
 */
export function getFunctionsInstance(): Functions {
  if (functions) return functions;
  const region = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "asia-northeast3";
  functions = getFunctions(getFirebaseApp(), region);
  return functions;
}

/**
 * Resolve a uid for the current visitor, signing in anonymously if needed.
 *
 * Handoff §9 trap 9: the consent record needs a uid even before the visitor
 * has logged in. Firebase Anonymous Auth gives us a stable per-device uid
 * that can later be linked to a real account if the user signs up.
 *
 * Returns a Promise that resolves with the User once Auth is ready. On the
 * server (no window) this returns null — callers must guard.
 */
export function ensureAnonymousUid(): Promise<User | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const a = getAuthInstance();
  if (a.currentUser) return Promise.resolve(a.currentUser);

  return new Promise<User | null>((resolve, reject) => {
    // Race: onAuthStateChanged may fire before signInAnonymously resolves
    // (cached session) or after (cold start). We listen first so we never
    // miss the cached case, then attempt sign-in for cold starts.
    let settled = false;
    const unsub = onAuthStateChanged(
      a,
      (user) => {
        if (settled) return;
        if (user) {
          settled = true;
          unsub();
          resolve(user);
        }
      },
      (err) => {
        if (settled) return;
        settled = true;
        unsub();
        reject(err);
      },
    );

    signInAnonymously(a).catch((err) => {
      if (settled) return;
      settled = true;
      unsub();
      reject(err);
    });
  });
}
