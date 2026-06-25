/**
 * Firebase Admin SDK — initialised once per cold start.
 *
 * Both onUserDelete and linkSessionVote need admin auth and Firestore.
 * Calling `admin.initializeApp()` twice from different modules throws —
 * the lazy `getApp()` pattern guards against that and lets callers `import`
 * the SDK clients with no order-of-initialisation contract.
 *
 * Region and other deploy-time options live in src/index.ts via
 * `setGlobalOptions`, so this file stays plain.
 */
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
// C-2: onChampionConfirmed uploads the 1.91:1 Crown Card PNG to Storage.
export const adminStorage = admin.storage();
export { admin };
