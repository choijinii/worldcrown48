/**
 * cookieConsents Firestore rules — COOKIE-1 Phase B.
 *
 * 잡으려는 사고: 클라이언트 `Lang` 타입에는 es 가 있어 es 팬은 `lang: "es"` 를 보내는데,
 * 규칙이 ko·en 만 허용해 동의 저장이 permission-denied 로 거부됐다(익명 계정은 생기고
 * 동의 문서만 못 남김). es 는 **추가**만 한다(R3) — 나머지 검증은 그대로 지킨다.
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

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** lib/cookieConsent.ts saveConsent() 가 보내는 모양 그대로. */
function consentDoc(uid: string, overrides: Record<string, unknown> = {}) {
  return {
    uid,
    essential: true,
    functional: true,
    analytics: true,
    marketing: false,
    timestamp: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + YEAR_MS),
    ipHash: "",
    lang: "ko",
    version: "1.0",
    ...overrides,
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-rules-cookie-consent",
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

describe("cookieConsents — 언어 (ko · en · es)", () => {
  for (const lang of ["ko", "en", "es"]) {
    it(`ALLOWS the owner to save with lang '${lang}'`, async () => {
      const db = testEnv.authenticatedContext("fan-1").firestore();
      await assertSucceeds(setDoc(doc(db, "cookieConsents/fan-1"), consentDoc("fan-1", { lang })));
    });
  }

  it("DENIES an unknown lang", async () => {
    const db = testEnv.authenticatedContext("fan-1").firestore();
    await assertFails(setDoc(doc(db, "cookieConsents/fan-1"), consentDoc("fan-1", { lang: "fr" })));
  });
});

describe("cookieConsents — 기존 검증 유지 (R3)", () => {
  it("DENIES essential:false", async () => {
    const db = testEnv.authenticatedContext("fan-1").firestore();
    await assertFails(
      setDoc(doc(db, "cookieConsents/fan-1"), consentDoc("fan-1", { essential: false })),
    );
  });

  it("DENIES an unknown key", async () => {
    const db = testEnv.authenticatedContext("fan-1").firestore();
    await assertFails(
      setDoc(doc(db, "cookieConsents/fan-1"), consentDoc("fan-1", { extra: "x" })),
    );
  });

  it("DENIES writing someone else's consent doc", async () => {
    const db = testEnv.authenticatedContext("fan-1").firestore();
    await assertFails(setDoc(doc(db, "cookieConsents/fan-2"), consentDoc("fan-2")));
  });

  it("DENIES a uid field that differs from the doc id", async () => {
    const db = testEnv.authenticatedContext("fan-1").firestore();
    await assertFails(setDoc(doc(db, "cookieConsents/fan-1"), consentDoc("fan-2")));
  });

  it("DENIES an unauthenticated write", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, "cookieConsents/fan-1"), consentDoc("fan-1")));
  });
});

describe("cookieConsents — 읽기는 소유자만", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "cookieConsents/fan-1"), {
        ...consentDoc("fan-1"),
        timestamp: Timestamp.now(),
      });
    });
  });

  it("ALLOWS the owner to read", async () => {
    const db = testEnv.authenticatedContext("fan-1").firestore();
    await assertSucceeds(getDoc(doc(db, "cookieConsents/fan-1")));
  });

  it("DENIES another fan reading it", async () => {
    const db = testEnv.authenticatedContext("fan-2").firestore();
    await assertFails(getDoc(doc(db, "cookieConsents/fan-1")));
  });
});
