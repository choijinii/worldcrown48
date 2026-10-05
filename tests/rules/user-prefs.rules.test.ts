/**
 * userPrefs Firestore rules — COOKIE-1 Phase G.
 *
 * 지금 userPrefs 를 쓰는 코드는 없다. 그래도 규칙이 ko·en 만 허용하면 나중에 쓰는 순간
 * es 팬만 저장이 막힌다(cookieConsents 와 같은 결함) — es 를 **추가**만 한다(R3).
 *
 * Emulator-backed: run via `npm run test:rules` (wraps firebase emulators:exec).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { Timestamp, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

function prefsDoc(uid: string, overrides: Record<string, unknown> = {}) {
  return { uid, lang: "ko", theme: "auto", updatedAt: serverTimestamp(), ...overrides };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-rules-user-prefs",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});
afterAll(async () => testEnv?.cleanup());
beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("userPrefs — 언어 (ko · en · es)", () => {
  for (const lang of ["ko", "en", "es"]) {
    it(`ALLOWS the owner to save lang '${lang}'`, async () => {
      const db = testEnv.authenticatedContext("fan-1").firestore();
      await assertSucceeds(setDoc(doc(db, "userPrefs/fan-1"), prefsDoc("fan-1", { lang })));
    });
  }

  it("DENIES an unknown lang", async () => {
    const db = testEnv.authenticatedContext("fan-1").firestore();
    await assertFails(setDoc(doc(db, "userPrefs/fan-1"), prefsDoc("fan-1", { lang: "fr" })));
  });
});

describe("userPrefs — theme 검증 유지", () => {
  it("ALLOWS omitting theme", async () => {
    const db = testEnv.authenticatedContext("fan-1").firestore();
    await assertSucceeds(
      setDoc(doc(db, "userPrefs/fan-1"), { uid: "fan-1", lang: "es", updatedAt: serverTimestamp() }),
    );
  });

  for (const theme of ["auto", "dark", "light"]) {
    it(`ALLOWS theme '${theme}'`, async () => {
      const db = testEnv.authenticatedContext("fan-1").firestore();
      await assertSucceeds(setDoc(doc(db, "userPrefs/fan-1"), prefsDoc("fan-1", { theme })));
    });
  }

  it("DENIES an unknown theme", async () => {
    const db = testEnv.authenticatedContext("fan-1").firestore();
    await assertFails(setDoc(doc(db, "userPrefs/fan-1"), prefsDoc("fan-1", { theme: "neon" })));
  });
});

describe("userPrefs — 소유자만", () => {
  it("DENIES writing someone else's prefs", async () => {
    const db = testEnv.authenticatedContext("fan-1").firestore();
    await assertFails(setDoc(doc(db, "userPrefs/fan-2"), prefsDoc("fan-2")));
  });

  it("DENIES an unauthenticated write", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, "userPrefs/fan-1"), prefsDoc("fan-1")));
  });

  it("ALLOWS the owner to read and DENIES another fan", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "userPrefs/fan-1"), {
        ...prefsDoc("fan-1"),
        updatedAt: Timestamp.now(),
      });
    });
    await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("fan-1").firestore(), "userPrefs/fan-1")));
    await assertFails(getDoc(doc(testEnv.authenticatedContext("fan-2").firestore(), "userPrefs/fan-1")));
  });
});
