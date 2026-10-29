/**
 * tournamentDrafts — 규칙 + 에뮬레이터 통합 (EDITOR-FIX-1).
 *
 * 규칙: 주인(hostUid)만 읽기·쓰기·삭제 · 로그인 안 함/익명 거부 · 칸 목록·자료형 검사.
 * 앱 코드 없이 문서 모양만으로 시험한다 — 저장소·발행 배치 통합은
 * tournament-drafts.store.test.ts.
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
import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  collection,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

let testEnv: RulesTestEnvironment;

/** 앱이 쓰는 초안 문서 모양 그대로 (lib/lab/tournamentDraft.ts toDraftFields). */
function rawDraft(uid: string, overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    step: 1,
    title: "최고의 보컬",
    category: "kpop",
    description: "설명",
    keywords: ["보컬"],
    campaignSlug: "",
    deadlineMs: 1_900_000_000_000,
    contestants: [
      { name: "Entry 1", nationality: "KR", affiliation: "", imageSearchKeyword: "", videoId: "dQw4w9WgXcQ" },
    ],
    hostUid: uid,
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

const ownerDb = (uid = "host-1") =>
  testEnv
    .authenticatedContext(uid, { firebase: { sign_in_provider: "google.com" } })
    .firestore();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-rules-tournament-drafts",
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

async function seedDraft(id: string, uid: string) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "tournamentDrafts", id), rawDraft(uid));
  });
}

describe("tournamentDrafts — 주인만", () => {
  it("ALLOWS the owner to create, read, update and delete their draft", async () => {
    const db = ownerDb();
    const ref = doc(db, "tournamentDrafts/d1");
    await assertSucceeds(setDoc(ref, rawDraft("host-1")));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(setDoc(ref, rawDraft("host-1", { title: "바뀜" })));
    await assertSucceeds(deleteDoc(ref));
  });

  it("ALLOWS listing my own drafts (where hostUid == me)", async () => {
    await seedDraft("d1", "host-1");
    const db = ownerDb();
    await assertSucceeds(
      getDocs(query(collection(db, "tournamentDrafts"), where("hostUid", "==", "host-1"))),
    );
  });

  it("DENIES reading someone else's draft", async () => {
    await seedDraft("d1", "host-1");
    await assertFails(getDoc(doc(ownerDb("intruder"), "tournamentDrafts/d1")));
  });

  it("DENIES listing without the owner filter", async () => {
    await seedDraft("d1", "host-1");
    await assertFails(getDocs(collection(ownerDb("intruder"), "tournamentDrafts")));
  });

  it("DENIES overwriting someone else's draft (even claiming it as mine)", async () => {
    await seedDraft("d1", "host-1");
    await assertFails(
      setDoc(doc(ownerDb("intruder"), "tournamentDrafts/d1"), rawDraft("intruder")),
    );
  });

  it("DENIES deleting someone else's draft", async () => {
    await seedDraft("d1", "host-1");
    await assertFails(deleteDoc(doc(ownerDb("intruder"), "tournamentDrafts/d1")));
  });

  it("DENIES creating a draft for another host", async () => {
    await assertFails(setDoc(doc(ownerDb(), "tournamentDrafts/d1"), rawDraft("host-2")));
  });

  it("DENIES signed-out access", async () => {
    await seedDraft("d1", "host-1");
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "tournamentDrafts/d1")));
    await assertFails(setDoc(doc(db, "tournamentDrafts/d2"), rawDraft("host-1")));
  });

  it("DENIES anonymous (guest) accounts", async () => {
    const db = testEnv
      .authenticatedContext("anon-1", { firebase: { sign_in_provider: "anonymous" } })
      .firestore();
    await assertFails(setDoc(doc(db, "tournamentDrafts/d1"), rawDraft("anon-1")));
  });
});

describe("tournamentDrafts — 칸 검사", () => {
  const ref = () => doc(ownerDb(), "tournamentDrafts/d1");

  it("DENIES an unknown field", async () => {
    await assertFails(setDoc(ref(), rawDraft("host-1", { status: "active" })));
  });

  it("DENIES a missing field", async () => {
    const d = rawDraft("host-1") as Record<string, unknown>;
    delete d.contestants;
    await assertFails(setDoc(ref(), d));
  });

  it("DENIES more than 48 slots", async () => {
    await assertFails(
      setDoc(ref(), rawDraft("host-1", { contestants: Array.from({ length: 49 }, () => ({})) })),
    );
  });

  it("DENIES a client-chosen updatedAt (must be server time)", async () => {
    await assertFails(setDoc(ref(), rawDraft("host-1", { updatedAt: new Date(0) })));
  });

  it("DENIES wrong types", async () => {
    await assertFails(setDoc(ref(), rawDraft("host-1", { title: 5 })));
    await assertFails(setDoc(ref(), rawDraft("host-1", { keywords: "a,b" })));
    await assertFails(setDoc(ref(), rawDraft("host-1", { deadlineMs: "soon" })));
    await assertFails(setDoc(ref(), rawDraft("host-1", { step: 3 })));
    await assertFails(setDoc(ref(), rawDraft("host-1", { schemaVersion: 2 })));
  });

  it("DENIES an oversized title", async () => {
    await assertFails(setDoc(ref(), rawDraft("host-1", { title: "x".repeat(201) })));
  });

  it("DENIES changing the owner on update", async () => {
    await seedDraft("d1", "host-1");
    await assertFails(updateDoc(ref(), { hostUid: "host-2", updatedAt: serverTimestamp() }));
  });
});

// THUMB-1: 초안의 대표 매치(그리드 칸 0~47 · 위치 0~100 또는 null). 없는 초안(옛 화면)도 통과.
describe("tournamentDrafts — 대표 매치(thumbnailPair)", () => {
  const ref = () => doc(ownerDb(), "tournamentDrafts/d1");
  const pick = { a: 3, b: 17, aPos: 22, bPos: null, next: "a" };

  it("ALLOWS a draft with a pair, and one without (older screens)", async () => {
    await assertSucceeds(setDoc(ref(), rawDraft("host-1", { thumbnailPair: pick })));
    await assertSucceeds(setDoc(ref(), rawDraft("host-1")));
  });

  it("ALLOWS switching between older and newer screens on the same draft", async () => {
    // 새 화면이 대표 매치를 넣어 저장 → 옛 화면(칸을 모름)이 통째로 덮어씀 → 새 화면이 다시 넣음.
    await assertSucceeds(setDoc(ref(), rawDraft("host-1", { thumbnailPair: pick })));
    await assertSucceeds(setDoc(ref(), rawDraft("host-1")));
    await assertSucceeds(setDoc(ref(), rawDraft("host-1", { thumbnailPair: pick })));
  });

  it("ALLOWS an empty pick", async () => {
    await assertSucceeds(
      setDoc(ref(), rawDraft("host-1", {
        thumbnailPair: { a: null, b: null, aPos: null, bPos: null, next: "a" },
      })),
    );
  });

  it("DENIES a malformed pair", async () => {
    const bad = (o: Record<string, unknown>) =>
      setDoc(ref(), rawDraft("host-1", { thumbnailPair: { ...pick, ...o } }));
    await assertFails(bad({ a: 48 }));
    await assertFails(bad({ b: -1 }));
    await assertFails(bad({ a: "c1" }));
    await assertFails(bad({ aPos: 101 }));
    await assertFails(bad({ bPos: "x" }));
    await assertFails(bad({ next: "c" }));
    await assertFails(bad({ extra: 1 }));
    await assertFails(setDoc(ref(), rawDraft("host-1", { thumbnailPair: "c1,c2" })));
  });
});

// ENTRY-UNIT-1(원장 D-73): 초안의 엔트리 단위. 없는 초안(옛 화면)도 통과.
describe("tournamentDrafts — 엔트리 단위(entryUnit)", () => {
  const ref = () => doc(ownerDb(), "tournamentDrafts/d1");

  it("ALLOWS individual, group, and no unit at all (older screens)", async () => {
    await assertSucceeds(setDoc(ref(), rawDraft("host-1", { entryUnit: "group" })));
    await assertSucceeds(setDoc(ref(), rawDraft("host-1", { entryUnit: "individual" })));
    await assertSucceeds(setDoc(ref(), rawDraft("host-1")));
  });

  it("DENIES an unknown unit", async () => {
    await assertFails(setDoc(ref(), rawDraft("host-1", { entryUnit: "team" })));
    await assertFails(setDoc(ref(), rawDraft("host-1", { entryUnit: 1 })));
  });
});
