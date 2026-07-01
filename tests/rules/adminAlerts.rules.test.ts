/**
 * admin_alerts Firestore rules — integration tier (handoff §11.4, §9 trap #3).
 *
 * Proves the security boundary G-1 relies on: the `admin_alerts` collection
 * requires the `admin` custom claim. The G-1 client uses the NEXT_PUBLIC_ADMIN_UID
 * pattern and has NO custom claim, so it can never read admin_alerts directly —
 * it MUST go through the listAdminAlerts callable (admin SDK bypasses rules).
 * A signed-in Voter is likewise denied.
 *
 * Emulator-backed: run via `npm run test:rules` (wraps firebase emulators:exec).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-rules-admin-alerts",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
  // Seed one alert with rules disabled (mirrors the admin-SDK cron write).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "admin_alerts/seed-1"), {
      type: "T-1",
      tournamentId: "t-1",
      detail: "seed",
      resolved: false,
    });
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("admin_alerts rules", () => {
  it("denies an unauthenticated read", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "admin_alerts/seed-1")));
  });

  it("denies a signed-in Voter (no admin claim) — G-1 must use the callable", async () => {
    const db = testEnv.authenticatedContext("voter-uid").firestore();
    await assertFails(getDoc(doc(db, "admin_alerts/seed-1")));
  });

  it("denies a forged client write", async () => {
    const db = testEnv.authenticatedContext("voter-uid").firestore();
    await assertFails(
      setDoc(doc(db, "admin_alerts/forged"), { type: "T-1", resolved: false }),
    );
  });

  it("allows a user holding the admin custom claim", async () => {
    const db = testEnv.authenticatedContext("op-uid", { admin: true }).firestore();
    await assertSucceeds(getDoc(doc(db, "admin_alerts/seed-1")));
  });
});
