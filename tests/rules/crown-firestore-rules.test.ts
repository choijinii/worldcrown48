/**
 * Firestore Rules — C-2 Crown Card (crown_cards collection).
 *
 * Runs against the emulator (CI: firebase emulators:exec; locally needs Java 21).
 * Posture (handoff 부록 B): crown_cards are written ONLY by onChampionConfirmed
 * (admin SDK). A Voter may read their OWN card and any `featured == true` card
 * (MVP-2 Hall of Fame); every client write is denied so a Champion can't be forged.
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, getDoc, setDoc } from "firebase/firestore";

const VOTER = "voter-uid";
const OTHER = "other-uid";

let testEnv: RulesTestEnvironment;

function card(voterUid = VOTER, featured = false) {
  return {
    id: `${voterUid}_t1`,
    voterUid,
    tournamentId: "t1",
    championContestantId: "c7",
    tournamentTitle: "Strikers of the Century",
    tournamentCategory: "FOOTBALL",
    imageUrl: "https://storage.example/crown-cards/t1/" + voterUid + ".png",
    format: "link",
    featured,
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-crown-rules",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});
afterAll(async () => testEnv.cleanup());
beforeEach(async () => testEnv.clearFirestore());

describe("crown_cards — owner/featured read", () => {
  it("lets a Voter read their OWN Crown Card", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `crown_cards/${VOTER}_t1`), card(VOTER));
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertSucceeds(getDoc(doc(db, `crown_cards/${VOTER}_t1`)));
  });

  it("DENIES reading another Voter's (non-featured) Crown Card", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `crown_cards/${OTHER}_t1`), card(OTHER));
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(getDoc(doc(db, `crown_cards/${OTHER}_t1`)));
  });

  it("lets anyone signed-in read a featured Crown Card (Hall of Fame)", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `crown_cards/${OTHER}_t1`), card(OTHER, true));
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertSucceeds(getDoc(doc(db, `crown_cards/${OTHER}_t1`)));
  });

  it("DENIES an unauthenticated read", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `crown_cards/${VOTER}_t1`), card(VOTER));
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, `crown_cards/${VOTER}_t1`)));
  });
});

describe("crown_cards — no client write (admin SDK only)", () => {
  it("DENIES a Voter creating their own Crown Card (forgery block)", async () => {
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(setDoc(doc(db, `crown_cards/${VOTER}_t1`), card(VOTER)));
  });

  it("DENIES a Voter overwriting an existing Crown Card", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `crown_cards/${VOTER}_t1`), card(VOTER));
    });
    const db = testEnv.authenticatedContext(VOTER).firestore();
    await assertFails(
      setDoc(doc(db, `crown_cards/${VOTER}_t1`), { ...card(VOTER), tournamentTitle: "hacked" }),
    );
  });
});
