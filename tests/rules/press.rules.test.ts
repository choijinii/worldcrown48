/**
 * PRESS-1 PR 1 — TIO 외신 초안의 규칙.
 *   press_usage/{YYYY-MM}: 이번 달 쓴 금액 — 관리자만 읽는다(PR 2 한도 알림 · 금액) · 브라우저 쓰기는 아무도 못 함(크론이 관리 SDK 로 씀)
 *   press_runs/{id}: 그날 표지 — 아무도 읽지도 쓰지도 못함
 *   news: 외신 종합 칸(category · sources · photo …)이 든 초안 — 관리자만 쓰고 · 팬은 초안을 못 읽고 · 발행본은 읽음
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
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

const pressDraft = (status: "draft" | "published") => ({
  slug: "20261127-a1b2c3",
  template: "column",
  status,
  origin: "cron_press",
  title: { ko: "제목", en: "Title", es: "Título" },
  subhead: { ko: "", en: "", es: "" },
  body: { ko: [{ type: "lead", text: "x" }], en: [], es: [] },
  evidence: { asOf: "now", stats: [] },
  category: "kpop",
  sources: [{ outlet: "Billboard", title: "Hot 100", url: "https://www.billboard.com/a", readAt: "2026-11-27" }],
  photoKeyword: "chart",
  rewriteCount: 0,
  publishedAt: null,
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-rules-press",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => testEnv?.cleanup());
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "press_usage/2026-11"), { usd: 1.23, searches: 40 });
    await setDoc(doc(db, "press_runs/2026-11-27_kpop"), { at: 1 });
    await setDoc(doc(db, "news/20261127-a1b2c3"), pressDraft("draft"));
    await setDoc(doc(db, "news/20261127-pub001"), { ...pressDraft("published"), slug: "20261127-pub001" });
  });
});

const guest = () => testEnv.unauthenticatedContext().firestore();
const fan = () => testEnv.authenticatedContext("fan").firestore();
const admin = () => testEnv.authenticatedContext("op", { admin: true }).firestore();

describe("press_usage — 이번 달 쓴 금액", () => {
  it("관리자는 읽는다", async () => {
    await assertSucceeds(getDoc(doc(admin(), "press_usage/2026-11")));
  });
  it("손님 · 팬은 읽지 못한다", async () => {
    await assertFails(getDoc(doc(guest(), "press_usage/2026-11")));
    await assertFails(getDoc(doc(fan(), "press_usage/2026-11")));
  });
  it("관리자도 브라우저로는 쓰거나 지우지 못한다(금액을 0 으로 돌려 한도를 피하지 못하게)", async () => {
    await assertFails(setDoc(doc(admin(), "press_usage/2026-11"), { usd: 0 }));
    await assertFails(updateDoc(doc(admin(), "press_usage/2026-11"), { usd: 0 }));
    await assertFails(deleteDoc(doc(admin(), "press_usage/2026-11")));
    await assertFails(setDoc(doc(fan(), "press_usage/2026-12"), { usd: 0 }));
  });
});

describe("press_runs — 그날 표지", () => {
  it("아무도 읽지도 쓰지도 못한다", async () => {
    for (const db of [guest(), fan(), admin()]) {
      await assertFails(getDoc(doc(db, "press_runs/2026-11-27_kpop")));
      await assertFails(deleteDoc(doc(db, "press_runs/2026-11-27_kpop")));
      await assertFails(setDoc(doc(db, "press_runs/2026-11-28_kpop"), { at: 1 }));
    }
  });
});

describe("news — 외신 종합 칸이 든 기사", () => {
  it("팬 · 손님은 외신 종합 초안을 못 읽고 발행본은 읽는다", async () => {
    await assertFails(getDoc(doc(fan(), "news/20261127-a1b2c3")));
    await assertFails(getDoc(doc(guest(), "news/20261127-a1b2c3")));
    await assertSucceeds(getDoc(doc(guest(), "news/20261127-pub001")));
  });
  it("관리자는 칸을 더한 초안을 쓰고(사진 칸 포함) · 팬은 못 쓴다", async () => {
    const photo = {
      url: "https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg",
      author: "Jane",
      licenseName: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
      sourcePageUrl: "https://www.flickr.com/photos/jane/1",
      isDefault: false,
    };
    await assertSucceeds(updateDoc(doc(admin(), "news/20261127-a1b2c3"), { photo }));
    await assertFails(updateDoc(doc(fan(), "news/20261127-a1b2c3"), { photo }));
    await assertFails(setDoc(doc(fan(), "news/20261127-zzzzzz"), pressDraft("published")));
  });
});
