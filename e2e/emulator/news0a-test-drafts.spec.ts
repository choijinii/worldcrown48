/**
 * NEWS-0a — 시험 대회는 뉴스 초안을 만들지 않는다 · 시험 정리 때 그 대회의 초안도 지운다 (에뮬레이터 · 지시서 §11 E2E).
 *
 *   ① Lab 화면으로 시험 대회를 발행한다(이름 머리 "E2E Tournament #" · b1 처럼 발행 **뒤에** 시험 표식을 단다)
 *   ② 시험 표식을 처음부터 단 대회(시드)도 만든다
 *   ③ 비교용 진짜 대회(표식 없음)를 만든다 → 개막 초안 1건이 생긴다(가짜 AI · 파이프라인이 살아 있다는 증거)
 *   ④ 진짜 대회 초안이 생긴 뒤에도 ① · ② 대회의 초안은 0건
 *   ⑤ 시험 정리(전역 마무리와 같은 함수 sweepStaleE2E) → 시험 대회와 그 대회의 **초안**은 사라지고 발행 기사는 남는다
 *
 * 함수 에뮬레이터의 뉴스 초안 AI 는 기본으로 꺼져 있다(scripts/e2e-emulator.sh). 이 시험은
 * `NEWS_DRAFT_AI=on bash scripts/e2e-emulator.sh e2e/emulator/news0a-test-drafts.spec.ts` 로만 돈다 — 가짜 AI(9313)를 띄운다.
 * 바깥 사이트 · 진짜 AI 를 부르지 않는다.
 */
import { createServer, type Server } from "node:http";
import * as admin from "firebase-admin";
import { expect, test, type Page } from "@playwright/test";
import { sweepStaleE2E } from "../global-teardown";
import { e2eMark } from "../e2eMark";
import {
  ADMIN_UID,
  DRAFT_TITLE,
  collectConsoleErrors,
  db,
  dismissConsent,
  expectNoConsoleErrors,
  resetEmulators,
  seedCategories,
  seedDraft,
  signInAsAdmin,
  stubAiCallables,
  stubYouTubeImages,
} from "./helpers";

const AI_ON = (process.env.NEWS_DRAFT_AI ?? "").trim().toLowerCase() === "on";
const AI_PORT = 9313;
const LAB_TITLE = "E2E Tournament #news0a.1.0";

let ai: Server;
const aiPrompts: string[] = [];

test.skip(!AI_ON, "뉴스 초안 AI 가 꺼진 판 — NEWS_DRAFT_AI=on 으로만 돈다");

test.beforeAll(async () => {
  if (!AI_ON) return;
  ai = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const prompt = (JSON.parse(body || "{}") as { messages?: { content: string }[] }).messages?.[0]?.content ?? "";
      aiPrompts.push(prompt);
      // 초안 단계와 번역 단계(en · es)의 답 모양 — functions 시험(newsTriggers.core)과 같은 흉내.
      const isTranslate = /번역/.test(prompt) && /\((en|es)\)/.test(prompt);
      const l = prompt.includes("(en)") ? "en" : "es";
      const text = isTranslate
        ? JSON.stringify({ title: `T-${l}`, subhead: `S-${l}`, body: [{ type: "lead", text: `l-${l}` }] })
        : JSON.stringify({ title: "개막 시험 초안", subhead: "부제", blocks: [{ type: "lead", text: "본문" }] });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "msg_e2e",
          type: "message",
          role: "assistant",
          model: "claude-haiku-4-5",
          content: [{ type: "text", text }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 10 },
        }),
      );
    });
  });
  await new Promise<void>((r) => ai.listen(AI_PORT, "127.0.0.1", r));
});

test.afterAll(async () => {
  if (ai) await new Promise<void>((r) => ai.close(() => r()));
});

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

const draftsOf = async (tid: string) =>
  (await db().collection("news").where("tournamentId", "==", tid).get()).docs.filter((d) => d.get("status") === "draft");

async function publishLabDraft(page: Page): Promise<string> {
  // 영상 대회 초안 — 대표 매치용 영상 칸 둘(20 · 21번)을 넣고, 이름을 Lab 시험 이름 머리로 바꾼다.
  const draftId = await seedDraft("news0aDraft", "video");
  const ref = db().collection("tournamentDrafts").doc(draftId);
  const cs = (await ref.get()).get("contestants") as Record<string, unknown>[];
  for (const [i, vid] of [[20, "9bZkp7q19f0"], [21, "kJQP7kiw5Fk"]] as const) {
    cs[i] = { ...cs[i], videoId: vid, videoStartSec: 0, videoEndSec: 15, videoSourceUrl: `https://www.youtube.com/watch?v=${vid}`, videoTitle: `엔트리${i + 1} MV`, videoChannel: `그룹${i + 1}` };
  }
  await ref.update({ contestants: cs, title: LAB_TITLE });

  await page.goto("/admin/lab?lang=ko");
  await signInAsAdmin(page);
  await dismissConsent(page);
  await expect(page.getByTestId("draft-picker")).toBeVisible();
  await page.getByTestId("draft-row").filter({ hasText: LAB_TITLE }).getByTestId("draft-open").click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();
  await page.getByTestId("contestant-pick-20").click();
  await page.getByTestId("contestant-pick-21").click();
  await page.getByTestId("publish-button").click();
  await page.getByTestId("confirm-check-1").check();
  await page.getByTestId("confirm-check-2").check();
  await page.getByTestId("confirm-check-3").check();
  await page.getByTestId("confirm-publish").click();
  await expect(page.getByText("✓ 토너먼트 생성 완료")).toBeVisible({ timeout: 60_000 });

  const t = (await db().collection("tournaments").where("title", "==", LAB_TITLE).get()).docs;
  expect(t).toHaveLength(1);
  // b1-admin-lab 처럼 발행 **뒤에** 시험 표식을 단다 — 개막 신호가 울린 순간에는 표식이 없었다.
  await t[0].ref.update(e2eMark());
  return t[0].id;
}

test("① Lab 발행 시험 대회 · ② 시드 시험 대회 → 초안 0 · ③ 진짜 대회 → 초안 1 · ⑤ 시험 정리 → 초안 0 · 발행 기사는 남음", async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectConsoleErrors(page);
  await stubAiCallables(page);
  await stubYouTubeImages(page);
  expect(DRAFT_TITLE).not.toBe(LAB_TITLE);

  // ① Lab 화면으로 발행(표식은 발행 뒤)
  const labId = await publishLabDraft(page);
  expect(labId).toBeTruthy();

  // ② 처음부터 시험 표식을 단 대회(시험 시드와 같은 모양)
  const seededRef = db().collection("tournaments").doc("news0a-seeded-e2e");
  await seededRef.set({ title: "WorldCrown48 KPOP Tournament", category: "KPOP", status: "active", hostUid: ADMIN_UID, totalContestants: 48, ...e2eMark() });

  // ③ 비교용 진짜 대회(표식 없음) — 함수가 실제로 초안을 쓰는지 본다. 이것이 생긴 뒤 ① · ② 를 센다.
  const realRef = db().collection("tournaments").doc("news0a-real");
  await realRef.set({ title: "올해의 노래", category: "KPOP", status: "active", hostUid: ADMIN_UID, totalContestants: 48 });
  await expect.poll(async () => (await draftsOf("news0a-real")).length, { timeout: 90_000 }).toBe(1);

  // ④ 시험 대회 둘은 초안 0 — 진짜 대회 초안이 나온 뒤에도 몇 초 더 지켜본다
  await page.waitForTimeout(5_000);
  expect((await draftsOf(labId)).length).toBe(0);
  expect((await draftsOf("news0a-seeded-e2e")).length).toBe(0);
  const totalDrafts = (await db().collection("news").where("status", "==", "draft").get()).size;
  expect(totalDrafts).toBe(1);
  // 가짜 AI 는 진짜 대회 몫(초안 1 + 번역 2)만 불렸다 — 시험 대회 몫으로는 부르지 않았다.
  expect(aiPrompts.some((p) => p.includes(LAB_TITLE))).toBe(false);
  expect(aiPrompts.some((p) => p.includes("올해의 노래"))).toBe(true);

  // ⑤ 시험 정리 — 예전 신호가 남긴 초안 · 손으로 발행한 기사가 시험 대회에 딸려 있다고 치고, 심은 지 3시간 지난 것으로 만든다
  const old = admin.firestore.Timestamp.fromMillis(Date.now() - 3 * 60 * 60 * 1000);
  await db().collection("tournaments").doc(labId).update({ e2eSeededAt: old });
  await seededRef.update({ e2eSeededAt: old });
  const base = { template: "open", origin: "event_open", title: { ko: "옛 시험 초안", en: "", es: "" }, tournamentId: labId };
  await db().collection("news").doc("news0a-old-draft").set({ ...base, slug: "news0a-old-draft", status: "draft" });
  await db().collection("news").doc("news0a-published").set({ ...base, slug: "news0a-published", status: "published" });
  await db().collection("news").doc("news0a-seed-draft").set({ ...base, slug: "news0a-seed-draft", status: "draft", tournamentId: "news0a-seeded-e2e" });

  const swept = await sweepStaleE2E(db(), Date.now());
  expect(swept.sort()).toEqual([labId, "news0a-seeded-e2e"].sort());
  expect((await draftsOf(labId)).length).toBe(0);
  expect((await draftsOf("news0a-seeded-e2e")).length).toBe(0);
  expect((await db().collection("news").doc("news0a-published").get()).exists).toBe(true);
  expect((await db().collection("tournaments").doc(labId).get()).exists).toBe(false);
  // 진짜 대회와 그 초안은 그대로
  expect((await realRef.get()).exists).toBe(true);
  expect((await draftsOf("news0a-real")).length).toBe(1);
  await expectNoConsoleErrors(errors);
});
