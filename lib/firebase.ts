/**
 * Firebase initialisation — single source of truth.
 *
 * Reads `NEXT_PUBLIC_FIREBASE_*` env vars and initialises once (singleton).
 * Used by:
 *   - components/launch/FeaturedTournament — Firestore read (`tournaments` where featured==true)
 *   - components/launch/WaitlistForm       — Firestore write (`waitlist` create)
 *   - lib/analytics                        — getAnalytics on the client
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
import { getFirestore, type Firestore } from "firebase/firestore";

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
