/**
 * LAB-FIX-5 3-3 — 조건 확인 때 웹 검색 근거 (에뮬레이터 · 관리자 로그인 · 진짜 함수 checkEntryRules).
 *
 * 바깥을 부르지 않는다: 시험이 가짜 Brave(9311 · /res/v1/web/search)와 가짜 AI(9313 · /v1/messages)를 띄우고,
 * 함수 에뮬레이터는 scripts/e2e-emulator.sh 가 넣은 BRAVE_API_BASE · ANTHROPIC_BASE_URL 로 그 서버를 부른다.
 * 명단 채우기 · 이미지 찾기만 화면에서 가짜 응답으로 막는다 — 조건 확인은 함수가 실제로 돈다.
 *
 *   ① 검색 결과가 AI 에게 전달된다 → AI 가 근거로 쓴 사유가 칸에 보인다 · 검색 글은 Firestore 어디에도 없다
 *   ② Brave 가 실패(500)해도 조건 확인은 끝난다(근거 없이 AI 기억만 · 지시문에 "검색:" 없음)
 */
import { createServer, type Server } from "node:http";
import * as admin from "firebase-admin";
import { expect, test, type Page } from "@playwright/test";
import { collectConsoleErrors, db, dismissConsent, expectNoConsoleErrors, resetEmulators, seedCategories, seedDraft, signInAsAdmin, stubAiCallables } from "./helpers";

const BRAVE_PORT = 9311;
const AI_PORT = 9313;
const FLAGGED = 1;
const names = Array.from({ length: 48 }, (_, i) => (i === 0 ? "Lisa Eldridge" : i === FLAGGED ? "James Charles" : `Creator${String(i + 1).padStart(2, "0")}`));
const RULES = "2026년에 활동한 여성만. 한 사람은 한 번만 넣는다.";
/** 가짜 검색 결과에만 들어 있는 글 — 저장되면 안 된다. */
const MARK = "WEBMARK";

let brave: Server;
let ai: Server;
let braveDown = false;
const braveQueries: string[] = [];
const aiPrompts: string[] = [];

test.beforeAll(async () => {
  brave = createServer((req, res) => {
    const u = new URL(req.url ?? "/", `http://127.0.0.1:${BRAVE_PORT}`);
    if (u.pathname !== "/res/v1/web/search" || req.headers["x-subscription-token"] !== "e2e-dummy") {
      res.writeHead(404);
      res.end();
      return;
    }
    const q = u.searchParams.get("q") ?? "";
    braveQueries.push(q);
    if (braveDown) {
      res.writeHead(500);
      res.end();
      return;
    }
    const about = q.startsWith("James Charles") ? `${MARK}-male He is an American beauty YouTuber` : `${MARK}-other beauty creator`;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ web: { results: [{ title: `${q.split(" ")[0]} - <strong>Wiki</strong>`, description: about, url: "https://example.test" }] } }));
  });
  ai = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const prompt = (JSON.parse(body || "{}") as { messages?: { content: string }[] }).messages?.[0]?.content ?? "";
      aiPrompts.push(prompt);
      // 근거가 왔으면 근거로, 아니면 기억으로 판단한 척 — 화면에 보이는 사유로 어느 쪽인지 가른다.
      const reason = prompt.includes(`${MARK}-male`) ? "검색에서 남성으로 확인됨" : "기억으로 판단";
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "msg_e2e",
          type: "message",
          role: "assistant",
          model: "claude-sonnet-5",
          content: [{ type: "text", text: JSON.stringify({ rows: [{ i: FLAGGED + 1, ok: false, reason }] }) }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 10 },
        }),
      );
    });
  });
  await Promise.all([
    new Promise<void>((r) => brave.listen(BRAVE_PORT, "127.0.0.1", r)),
    new Promise<void>((r) => ai.listen(AI_PORT, "127.0.0.1", r)),
  ]);
});

test.afterAll(async () => {
  await Promise.all([new Promise((r) => brave.close(r)), new Promise((r) => ai.close(r))]);
});

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
  braveQueries.length = 0;
  aiPrompts.length = 0;
  braveDown = false;
});

async function stubFill(page: Page) {
  await stubAiCallables(page);
  await page.route(/\/aiFillContestants$/, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ result: { contestants: names.map((name) => ({ name, nationality: "US", affiliation: "", imageSearchKeyword: "" })) } }),
    }),
  );
  await page.route(/\/autoSourceImages$/, async (route) => {
    const slots = (JSON.parse(route.request().postData() ?? "{}") as { data: { slots: { slot: number }[] } }).data.slots;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ result: { ok: true, results: slots.map((s) => ({ slot: s.slot, ok: false, reason: "not-found" })) } }),
    });
  });
}

async function seedRulesDraft(id: string) {
  await seedDraft(id, "image");
  await db()
    .collection("tournamentDrafts")
    .doc(id)
    .update({
      contestants: [],
      mediaKind: admin.firestore.FieldValue.delete(),
      aiBrief: { entry: "여성 뷰티 크리에이터 (활동명)", extra: "", rules: RULES },
    });
}

async function openAndGenerate(page: Page) {
  await page.goto("/admin/lab?lang=ko");
  await signInAsAdmin(page);
  await dismissConsent(page);
  await expect(page.getByTestId("draft-picker")).toBeVisible();
  await page.getByTestId("draft-open").first().click();
  await expect(page.getByTestId("contestant-grid")).toBeVisible();
  await page.getByTestId("lab-generate-images").click();
}

/** Firestore 의 모든 문서(맨 위 모음 + 한 단계 아래 모음)를 글로 — 검색 글이 어디에도 저장되지 않았는지 본다. */
async function dumpFirestore(): Promise<string> {
  const out: string[] = [];
  for (const col of await db().listCollections()) {
    for (const doc of (await col.get()).docs) {
      out.push(JSON.stringify(doc.data()));
      for (const sub of await doc.ref.listCollections()) for (const d of (await sub.get()).docs) out.push(JSON.stringify(d.data()));
    }
  }
  return out.join("\n");
}

test("① 검색 결과가 AI 에게 전달되고 · 그 사유가 칸에 보이고 · 검색 글은 저장되지 않는다", async ({ page }) => {
  test.setTimeout(240_000);
  await seedRulesDraft("lfWeb1");
  const errors = collectConsoleErrors(page);
  await stubFill(page);
  await openAndGenerate(page);

  await expect(page.getByTestId(`contestant-rule-reason-${FLAGGED}`)).toHaveText("검색에서 남성으로 확인됨", { timeout: 120_000 });
  await expect(page.getByTestId(`contestant-rule-badge-${FLAGGED}`)).toHaveText("조건 확인 필요");
  await expect(page.getByTestId("lab-rules-status")).toHaveText("조건을 확인할 칸 1개를 표시했습니다.");
  await page.getByTestId(`contestant-node-${FLAGGED}`).screenshot({ path: "test-results-emulator/lab-websearch-flag.png" });

  // 칸마다 1번 · 검색어 = 이름 + 엔트리 정의(괄호 풀이 뺌)
  expect(braveQueries).toHaveLength(48);
  expect(braveQueries).toContain("James Charles 여성 뷰티 크리에이터");
  expect(aiPrompts).toHaveLength(1);
  expect(aiPrompts[0]).toContain(`2. James Charles\n   검색: James - Wiki — ${MARK}-male He is an American beauty YouTuber`);
  expect(aiPrompts[0]).toContain("검색 결과를 먼저 근거로");

  // 자동 저장이 표시를 남긴 뒤 — 표시 · 사유는 저장되지만 검색 글은 어디에도 없다
  await expect
    .poll(async () => ((await db().collection("tournamentDrafts").doc("lfWeb1").get()).data()?.ruleFlags ?? []).length, { timeout: 30_000 })
    .toBe(1);
  const dump = await dumpFirestore();
  expect(dump).toContain("검색에서 남성으로 확인됨");
  expect(dump).not.toContain(MARK);
  await expectNoConsoleErrors(errors);
});

test("② Brave 가 실패(500)해도 조건 확인은 끝난다 — 근거 없이 AI 기억만", async ({ page }) => {
  test.setTimeout(240_000);
  braveDown = true;
  await seedRulesDraft("lfWeb2");
  await stubFill(page);
  await openAndGenerate(page);

  await expect(page.getByTestId(`contestant-rule-reason-${FLAGGED}`)).toHaveText("기억으로 판단", { timeout: 120_000 });
  await expect(page.getByTestId("lab-rules-status")).toHaveText("조건을 확인할 칸 1개를 표시했습니다.");
  expect(braveQueries.length).toBeGreaterThanOrEqual(48);
  expect(aiPrompts).toHaveLength(1);
  expect(aiPrompts[0]).not.toContain("검색:");
});
