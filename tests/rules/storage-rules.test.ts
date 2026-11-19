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
import { ref, uploadBytes, getBytes, deleteObject } from "firebase/storage";

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

// ─── IMAGE-1 PR 1 (원장 D-77) — 엔트리 그림 ───────────────────────────────
// drafts: 읽기 공개 · 쓰기/삭제 = 로그인(익명 아님) + 경로 uid == 나 + image/* + 10MB 이하
// tournaments: 읽기 공개 · 쓰기 금지(서버 함수 finalizeEntryImages 만)
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const DRAFT_IMG = "entry-images/drafts/host-1/d1/0.jpg";
const TOUR_IMG = "entry-images/tournaments/t1/0.jpg";
const google = (uid = "host-1") =>
  testEnv.authenticatedContext(uid, { firebase: { sign_in_provider: "google.com" } }).storage();
const jpeg = { contentType: "image/jpeg" };
/** 관리자 표시(custom claim admin: true)가 있는 구글 로그인 — firestore.rules 배너·운영자 알림과 같은 표시. */
const adminGoogle = (uid = "host-1") =>
  testEnv
    .authenticatedContext(uid, { admin: true, firebase: { sign_in_provider: "google.com" } })
    .storage();

async function seed(path: string): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (c) => {
    await uploadBytes(ref(c.storage(), path), JPG, jpeg);
  });
}

// D-77 보충(대표 2026-11-08): 그림 저장소 쓰기는 관리자만. MVP 1.5 때 일반 사용자에게 다시 연다.
describe("entry-images/drafts — 관리자 + 자기 uid 경로만", () => {
  it("① ALLOWS an admin uploading into their own uid path", async () => {
    await assertSucceeds(uploadBytes(ref(adminGoogle(), DRAFT_IMG), JPG, jpeg));
  });
  it("② DENIES a signed-in non-admin even in their own uid path (upload and delete)", async () => {
    await assertFails(uploadBytes(ref(google(), DRAFT_IMG), JPG, jpeg));
    await seed(DRAFT_IMG);
    await assertFails(deleteObject(ref(google(), DRAFT_IMG)));
  });
  it("③ DENIES an admin writing into someone else's uid path", async () => {
    await assertFails(uploadBytes(ref(adminGoogle("other"), DRAFT_IMG), JPG, jpeg));
  });
  it("DENIES uploading into someone else's uid path", async () => {
    await assertFails(uploadBytes(ref(google("other"), DRAFT_IMG), JPG, jpeg));
  });
  it("④ DENIES anonymous (guest) accounts — even with an admin flag", async () => {
    const anon = testEnv
      .authenticatedContext("host-1", { admin: true, firebase: { sign_in_provider: "anonymous" } })
      .storage();
    await assertFails(uploadBytes(ref(anon, DRAFT_IMG), JPG, jpeg));
  });
  it("DENIES signed-out upload", async () => {
    await assertFails(uploadBytes(ref(testEnv.unauthenticatedContext().storage(), DRAFT_IMG), JPG, jpeg));
  });
  it("DENIES a file over 10MB", async () => {
    const big = new Uint8Array(11 * 1024 * 1024);
    await assertFails(uploadBytes(ref(adminGoogle(), DRAFT_IMG), big, jpeg));
  });
  it("ALLOWS exactly 10MB", async () => {
    const ok = new Uint8Array(10 * 1024 * 1024);
    await assertSucceeds(uploadBytes(ref(adminGoogle(), DRAFT_IMG), ok, jpeg));
  });
  it("DENIES text/plain", async () => {
    await assertFails(uploadBytes(ref(adminGoogle(), DRAFT_IMG), JPG, { contentType: "text/plain" }));
  });
  it("ALLOWS the admin owner to delete; DENIES another admin's uid", async () => {
    await seed(DRAFT_IMG);
    await assertFails(deleteObject(ref(adminGoogle("other"), DRAFT_IMG)));
    await assertSucceeds(deleteObject(ref(adminGoogle(), DRAFT_IMG)));
  });
  it("⑤ ALLOWS public read (signed out)", async () => {
    await seed(DRAFT_IMG);
    await assertSucceeds(getBytes(ref(testEnv.unauthenticatedContext().storage(), DRAFT_IMG)));
  });
});

describe("entry-images/tournaments — 서버 함수만 쓴다", () => {
  it("DENIES any client write (even the host)", async () => {
    await assertFails(uploadBytes(ref(google(), TOUR_IMG), JPG, jpeg));
    await assertFails(uploadBytes(ref(testEnv.unauthenticatedContext().storage(), TOUR_IMG), JPG, jpeg));
  });
  it("DENIES client delete", async () => {
    await seed(TOUR_IMG);
    await assertFails(deleteObject(ref(google(), TOUR_IMG)));
  });
  it("ALLOWS public read (signed out)", async () => {
    await seed(TOUR_IMG);
    await assertSucceeds(getBytes(ref(testEnv.unauthenticatedContext().storage(), TOUR_IMG)));
  });
});

// ─── PITCH-2 PR A · 추가 지시 ② — 히어로 홍보 장(우리가 만든 영상 파일 + 정지 그림) ──────────
// pitch/promo/: 읽기 공개(홈은 로그인 전에 본다) · 쓰기 = 관리자만(코티오가 올린다 · 올리는 화면 없음)
const PROMO_VIDEO = "pitch/promo/launch.mp4";
const PROMO_POSTER = "pitch/promo/launch.jpg";
const mp4 = { contentType: "video/mp4" };

describe("pitch/promo — 읽기 공개 · 쓰기 관리자만", () => {
  it("ALLOWS anyone (signed out) to read the promo video and poster", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await uploadBytes(ref(c.storage(), PROMO_VIDEO), JPG, mp4);
      await uploadBytes(ref(c.storage(), PROMO_POSTER), JPG, jpeg);
    });
    const anon = testEnv.unauthenticatedContext().storage();
    await assertSucceeds(getBytes(ref(anon, PROMO_VIDEO)));
    await assertSucceeds(getBytes(ref(anon, PROMO_POSTER)));
  });
  it("ALLOWS an admin to upload an mp4 and a poster image", async () => {
    await assertSucceeds(uploadBytes(ref(adminGoogle(), PROMO_VIDEO), JPG, mp4));
    await assertSucceeds(uploadBytes(ref(adminGoogle(), PROMO_POSTER), JPG, jpeg));
  });
  it("DENIES signed-out, a signed-in fan, and an anonymous account with an admin flag", async () => {
    await assertFails(uploadBytes(ref(testEnv.unauthenticatedContext().storage(), PROMO_VIDEO), JPG, mp4));
    await assertFails(uploadBytes(ref(google("fan"), PROMO_VIDEO), JPG, mp4));
    const anon = testEnv
      .authenticatedContext("host-1", { admin: true, firebase: { sign_in_provider: "anonymous" } })
      .storage();
    await assertFails(uploadBytes(ref(anon, PROMO_VIDEO), JPG, mp4));
  });
  it("DENIES a fan deleting a promo file; ALLOWS an admin", async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await uploadBytes(ref(c.storage(), PROMO_VIDEO), JPG, mp4);
    });
    await assertFails(deleteObject(ref(google("fan"), PROMO_VIDEO)));
    await assertSucceeds(deleteObject(ref(adminGoogle(), PROMO_VIDEO)));
  });
  it("DENIES non-video/image content types even for an admin", async () => {
    await assertFails(uploadBytes(ref(adminGoogle(), "pitch/promo/x.html"), JPG, { contentType: "text/html" }));
  });
  it("DENIES other pitch/ folders (whitelist stays closed)", async () => {
    await assertFails(uploadBytes(ref(adminGoogle(), "pitch/other/launch.mp4"), JPG, mp4));
    await assertFails(getBytes(ref(testEnv.unauthenticatedContext().storage(), "pitch/other/launch.mp4")));
  });
});
