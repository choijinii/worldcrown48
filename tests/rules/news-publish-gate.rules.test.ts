/**
 * news — NEWS-2 결정 J(대표 2026-11-27): 경고가 남은 초안은 발행하지 못한다.
 *
 * 서버만 쓰는 칸 넷(checkWarnings · checkedText · checkBlocked · clearedWarnings)은 관리자도 브라우저로 못 바꾼다.
 * 초안 → 발행은 checkBlocked == false 이고 발행하는 글 == checkedText 일 때만. 발행된 기사 고치기 · 내리기는 그대로.
 * news_check_clears(경고 풀기 기록)는 관리자만 읽고, 쓰기는 콜러블(admin SDK)만.
 *
 * Emulator-backed: run via `npm run test:rules` (wraps firebase emulators:exec).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

let testEnv: RulesTestEnvironment;
const L = (ko: string) => ({ ko, en: "", es: "" });
const text = (lead: string) => ({ title: L("제목"), subhead: L(""), body: { ko: [{ type: "lead", text: lead }], en: [], es: [] } });
const base = (lead: string, extra: Record<string, unknown> = {}) => ({
  slug: "s", template: "weekly", origin: "manual_ai", status: "draft", publishedAt: null, evidence: { asOf: "", stats: [] },
  ...text(lead), ...extra,
});
const W = [{ rule: "forbidden_word", lang: "ko", field: "body.0", match: "전쟁" }];

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wc48-rules-news-gate",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => testEnv?.cleanup());
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "news/ok"), base("설렘", { checkWarnings: [], checkedText: text("설렘"), checkBlocked: false }));
    await setDoc(doc(db, "news/warn"), base("애정 전쟁", { checkWarnings: W, checkedText: text("애정 전쟁"), checkBlocked: true }));
    await setDoc(doc(db, "news/cleared"), base("애정 전쟁", { checkWarnings: W, checkedText: text("애정 전쟁"), checkBlocked: false, clearedWarnings: [{ ...W[0], by: "op", at: 1 }] }));
    await setDoc(doc(db, "news/legacy"), base("옛 초안"));
    await setDoc(doc(db, "news/pub"), base("설렘", { status: "published", checkWarnings: [], checkedText: text("설렘"), checkBlocked: false }));
    await setDoc(doc(db, "news_check_clears/c1"), { slug: "cleared", by: "op", warnings: W });
  });
});

const admin = () => testEnv.authenticatedContext("op", { admin: true }).firestore();
const publish = (slug: string) => updateDoc(doc(admin(), `news/${slug}`), { status: "published", publishedAt: serverTimestamp() });

describe("결정 J — 초안 → 발행", () => {
  it("경고 없음 · 검사한 글 그대로 → 발행된다", async () => {
    await assertSucceeds(publish("ok"));
  });
  it("풀리지 않은 경고 → 막힌다", async () => {
    await assertFails(publish("warn"));
  });
  it("경고를 모두 풀었으면 → 발행된다", async () => {
    await assertSucceeds(publish("cleared"));
  });
  it("검사 기록이 없는 옛 초안 → 막힌다(서버가 검사한 뒤에만)", async () => {
    await assertFails(publish("legacy"));
  });
  it("글을 고치면서 한 번에 발행 → 막힌다(검사하지 않은 글)", async () => {
    await assertFails(updateDoc(doc(admin(), "news/ok"), { status: "published", publishedAt: serverTimestamp(), ...text("투표 몰림") }));
  });
  it("발행된 상태로 바로 만들기 → 막힌다", async () => {
    await assertFails(setDoc(doc(admin(), "news/new"), base("설렘", { status: "published" })));
  });
});

describe("서버만 쓰는 칸", () => {
  it("관리자도 checkBlocked · checkWarnings · checkedText · clearedWarnings 를 못 바꾼다", async () => {
    await assertFails(updateDoc(doc(admin(), "news/warn"), { checkBlocked: false }));
    await assertFails(updateDoc(doc(admin(), "news/warn"), { checkWarnings: [] }));
    await assertFails(updateDoc(doc(admin(), "news/legacy"), { checkedText: text("옛 초안"), checkBlocked: false }));
    await assertFails(updateDoc(doc(admin(), "news/warn"), { clearedWarnings: [{ ...W[0], by: "op", at: 1 }] }));
  });
  it("만들 때 그 칸을 넣을 수 없다(백지 초안은 그대로 된다)", async () => {
    await assertFails(setDoc(doc(admin(), "news/new"), base("설렘", { checkBlocked: false })));
    await assertSucceeds(setDoc(doc(admin(), "news/blank"), base("…", { origin: "manual_blank" })));
  });
});

describe("지금처럼 되는 것", () => {
  it("관리자는 초안 글을 저장한다(경고가 있어도)", async () => {
    await assertSucceeds(updateDoc(doc(admin(), "news/warn"), text("애정이 모이는 자리")));
  });
  it("발행된 기사를 고쳐 저장한다 · 내린다", async () => {
    await assertSucceeds(updateDoc(doc(admin(), "news/pub"), text("투표 몰림")));
    await assertSucceeds(updateDoc(doc(admin(), "news/pub"), { status: "archived" }));
  });
  it("팬 · 손님은 쓰지 못한다 · 발행된 기사는 누구나 읽는다", async () => {
    await assertFails(updateDoc(doc(testEnv.authenticatedContext("fan").firestore(), "news/ok"), { status: "published" }));
    await assertSucceeds(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "news/pub")));
  });
});

describe("news_check_clears — 경고 풀기 기록", () => {
  it("관리자만 읽는다 · 아무도 브라우저로 쓰지 못한다", async () => {
    await assertSucceeds(getDoc(doc(admin(), "news_check_clears/c1")));
    await assertFails(getDoc(doc(testEnv.authenticatedContext("fan").firestore(), "news_check_clears/c1")));
    await assertFails(setDoc(doc(admin(), "news_check_clears/c2"), { slug: "x" }));
  });
});
