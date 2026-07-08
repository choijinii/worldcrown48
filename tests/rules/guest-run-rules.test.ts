/**
 * Firestore Rules — HF-3 Guest Run (§확인 필요 1).
 *
 * QUESTION (handoff §3 §확인 필요 1, 추정 금지 — 코드로 검증): can a client
 * (anonymous uid) DISCOVER which Tournament(s) it entered by LISTing its own
 * `bracket_seeds` / `roundProgress` docs via a `documentId()` prefix range
 * query, under the current doc-id prefix read rules
 * (`seedId.split('_')[0] == request.auth.uid`)?
 *
 * "Rules are not filters": a list succeeds only if EVERY doc it could return
 * passes the rule. So we test:
 *   - constrained prefix list of OWN docs → should SUCCEED and RETURN them
 *   - UNconstrained collection list → must FAIL (sanity: rule can't be a filter)
 *   - prefix list scoped to ANOTHER uid's range → must FAIL
 *
 * The outcome picks W2's truth source: prefix-list-allowed → client reads its
 * guest tournament set directly; prefix-list-denied → fall back (server judgment
 * / sessionStorage marker) and record the reason in ADR-0008.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import {
  collection,
  documentId,
  getDoc,
  getDocs,
  query,
  setDoc,
  doc,
  where,
} from "firebase/firestore";

const GUEST = "guestuid";
const OTHER = "otheruid";
// High sentinel: `${uid}_` .. `${uid}_` brackets exactly `${uid}_*` docs
// and excludes any other uid's docs (documentId order is UTF-8 lexicographic).
const lo = (uid: string) => `${uid}_`;
const hi = (uid: string) => `${uid}_`;

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-guest-run-rules",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});
afterAll(async () => testEnv.cleanup());
beforeEach(async () => testEnv.clearFirestore());

describe("bracket_seeds — guest self-discovery via documentId prefix list", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      const db = c.firestore();
      await setDoc(doc(db, `bracket_seeds/${GUEST}_t1`), { seed: 1, createdAt: new Date() });
      await setDoc(doc(db, `bracket_seeds/${GUEST}_t2`), { seed: 2, createdAt: new Date() });
      await setDoc(doc(db, `bracket_seeds/${OTHER}_t9`), { seed: 9, createdAt: new Date() });
    });
  });

  // VERIFIED 2026-07-08 (emulator): DENIED. For a `list` op the doc-id wildcard
  // (`seedId`) is null, so `seedId.split('_')[0]` throws ("Null value error for
  // 'list' @ L230") and the read rule denies. Doc-id-prefix rules authorize
  // `get` (single doc, wildcard bound) but NOT `list`. => W2 cannot self-discover
  // the guest's tournament set via a client prefix list (ADR-0008).
  it("DENIES a guest self-discovering its seeds via a documentId prefix list", async () => {
    const db = testEnv.authenticatedContext(GUEST).firestore();
    await assertFails(
      getDocs(
        query(
          collection(db, "bracket_seeds"),
          where(documentId(), ">=", lo(GUEST)),
          where(documentId(), "<", hi(GUEST)),
        ),
      ),
    );
  });

  // Control: a DIRECT get of the current-tournament seed (single doc, wildcard
  // bound) IS allowed — this is the rules-compatible truth W2 relies on.
  it("ALLOWS a direct get of the guest's own current-tournament seed", async () => {
    const db = testEnv.authenticatedContext(GUEST).firestore();
    await assertSucceeds(getDoc(doc(db, `bracket_seeds/${GUEST}_t1`)));
  });

  it("FAILS an unconstrained list of the whole collection (rules are not filters)", async () => {
    const db = testEnv.authenticatedContext(GUEST).firestore();
    await assertFails(getDocs(collection(db, "bracket_seeds")));
  });

  it("FAILS a prefix list scoped to ANOTHER uid's range", async () => {
    const db = testEnv.authenticatedContext(GUEST).firestore();
    await assertFails(
      getDocs(
        query(
          collection(db, "bracket_seeds"),
          where(documentId(), ">=", lo(OTHER)),
          where(documentId(), "<", hi(OTHER)),
        ),
      ),
    );
  });
});

describe("roundProgress — guest completion discovery via documentId prefix list", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      const db = c.firestore();
      await setDoc(doc(db, `roundProgress/${GUEST}_t1`), {
        userId: GUEST,
        tournamentId: "t1",
        complete: true,
        championId: "c7",
      });
    });
  });

  // Same verified constraint on roundProgress ("Null value error for 'list' @
  // L189"): the client cannot enumerate completion across tournaments by list.
  it("DENIES a guest self-discovering completion via a documentId prefix list", async () => {
    const db = testEnv.authenticatedContext(GUEST).firestore();
    await assertFails(
      getDocs(
        query(
          collection(db, "roundProgress"),
          where(documentId(), ">=", lo(GUEST)),
          where(documentId(), "<", hi(GUEST)),
        ),
      ),
    );
  });

  // Control: a DIRECT get of the current-tournament roundProgress IS allowed —
  // this is how W2 reads `guestCompleted` for the tournament in view.
  it("ALLOWS a direct get of the guest's own current-tournament roundProgress", async () => {
    const db = testEnv.authenticatedContext(GUEST).firestore();
    await assertSucceeds(getDoc(doc(db, `roundProgress/${GUEST}_t1`)));
  });
});
