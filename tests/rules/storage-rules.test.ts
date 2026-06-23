/**
 * Storage Rules — C-2 Crown Card (crown-cards/ path).
 *
 * Runs against the Storage emulator (CI: firebase emulators:exec --only
 * firestore,storage; locally needs Java 21). Posture (handoff 부록 C):
 * crown-cards PNGs are publicly readable (SNS/OG crawlers) but client writes
 * are denied — only onChampionConfirmed (admin SDK) uploads. All other Storage
 * paths are denied (whitelist).
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { ref, uploadBytes, getBytes } from "firebase/storage";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // "‰PNG"
const CARD_PATH = "crown-cards/t1/voter1.png";
const OTHER_PATH = "user-uploads/voter1/avatar.png";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-crown-storage",
    storage: {
      rules: readFileSync("storage.rules", "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
});
afterAll(async () => testEnv.cleanup());
beforeEach(async () => testEnv.clearStorage());

async function seedCard(): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (c) => {
    await uploadBytes(ref(c.storage(), CARD_PATH), PNG);
  });
}

describe("crown-cards — public read", () => {
  it("lets an unauthenticated client read a Crown Card PNG (SNS/OG)", async () => {
    await seedCard();
    const storage = testEnv.unauthenticatedContext().storage();
    await assertSucceeds(getBytes(ref(storage, CARD_PATH)));
  });
});

describe("crown-cards — no client write (admin SDK only)", () => {
  it("DENIES an unauthenticated upload", async () => {
    const storage = testEnv.unauthenticatedContext().storage();
    await assertFails(uploadBytes(ref(storage, CARD_PATH), PNG));
  });

  it("DENIES an authenticated Voter upload (forgery block)", async () => {
    const storage = testEnv.authenticatedContext("voter1").storage();
    await assertFails(uploadBytes(ref(storage, CARD_PATH), PNG));
  });
});

describe("non-crown paths — denied (whitelist)", () => {
  it("DENIES reading an arbitrary non-crown path", async () => {
    const storage = testEnv.unauthenticatedContext().storage();
    await assertFails(getBytes(ref(storage, OTHER_PATH)));
  });

  it("DENIES writing an arbitrary non-crown path", async () => {
    const storage = testEnv.authenticatedContext("voter1").storage();
    await assertFails(uploadBytes(ref(storage, OTHER_PATH), PNG));
  });
});
