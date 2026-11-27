/**
 * NEWS-2 — 결정 J(경고가 남은 초안은 발행 못함 · 저장 때 서버 재검사 · [경고 풀기]) · 주간 초안 대회 세기 · Share/Cuota
 * (에뮬레이터 · AI 가짜 127.0.0.1:9313 · 바깥 사이트를 부르지 않는다).
 *
 *   ① 숨김 · 시드 · 문서 없는 대회가 섞인 순위 기록 → 손 주간 초안의 근거 = ACTIVE TOURNAMENTS 1 · 숨김 대회 선두 없음
 *   ② 틀린 가짜 응답(「전쟁」) → 초안 잠김(checkBlocked) → 뉴스데스크 [발행] 눌러도 초안 그대로
 *   ③ clearNewsCheckWarnings → 풀림 · 기록(news_check_clears) → [발행] → 발행됨
 *   ④ 발행된 기사를 고쳐 새 경고(「투표」) → 다시 검사돼 잠김 표시 · 상태는 발행 그대로(내리지 않음)
 *   ⑤ 차트 설명창 셋째 줄 en = Share · es = Cuota
 */
import { createServer, type Server } from "node:http";
import * as admin from "firebase-admin";
import { expect, test, type Page } from "@playwright/test";
import {
  ADMIN_UID,
  PROJECT_ID,
  adminApp,
  collectConsoleErrors,
  db,
  dismissConsent,
  resetEmulators,
  seedCategories,
  seedImageTournament,
  signInAsAdmin,
} from "./helpers";

const AI_PORT = 9313;
let ai: Server;
const prompts: string[] = [];

test.beforeAll(async () => {
  ai = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const prompt = (JSON.parse(body || "{}") as { messages?: { content: string }[] }).messages?.[0]?.content ?? "";
      prompts.push(prompt);
      const isTranslate = /번역/.test(prompt) && /\((en|es)\)/.test(prompt);
      const blocks = [
        { type: "lead", text: "애정 전쟁이 이번 주를 달궜다." },
        { type: "closer", text: "다음 주가 기다려진다." },
      ];
      const text = isTranslate
        ? JSON.stringify({ title: "Weekly", subhead: "", body: [{ type: "lead", text: "fans" }, { type: "closer", text: "next" }] })
        : JSON.stringify({ title: "이번 주의 설렘", subhead: "주간", blocks });
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
  prompts.length = 0;
});

async function idToken(): Promise<string> {
  const custom = await adminApp().auth().createCustomToken(ADMIN_UID, { admin: true });
  const r = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-api-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: custom, returnSecureToken: true }),
  });
  return ((await r.json()) as { idToken: string }).idToken;
}

async function callFn<T>(name: string, data: unknown): Promise<T> {
  const r = await fetch(`http://127.0.0.1:5001/${PROJECT_ID}/asia-northeast3/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await idToken()}` },
    body: JSON.stringify({ data }),
  });
  const j = (await r.json()) as { result?: T; error?: unknown };
  if (!r.ok || j.error) throw new Error(`${name} ${r.status} ${JSON.stringify(j.error)}`);
  return j.result as T;
}

const row = (name: string) => ({ rankings: [{ rank: 1, contestantId: "c1", name, crownScore: 700, winRate: 0.3, shareRate: 0.4 }], runsTotal: 20 });

async function seedWeekly() {
  const t = db().collection("tournaments");
  const c = db().collection("ranking_cache");
  const base = { category: "KPOP", hostUid: ADMIN_UID, totalContestants: 48 };
  await t.doc("n2-live").set({ ...base, title: "진행 중 대회", status: "active" });
  await t.doc("n2-hidden").set({ ...base, title: "숨김 대회", status: "hidden" });
  await t.doc("n2-seed").set({ ...base, title: "Admin Preview", status: "active", hostUid: "seed-operator" });
  await c.doc("n2-live").set(row("진행 중 선두"));
  await c.doc("n2-hidden").set(row("숨김 선두"));
  await c.doc("n2-seed").set(row("시드 선두"));
  await c.doc("n2-gone").set(row("없는 대회 선두"));
}

const news = (slug: string) => db().collection("news").doc(slug);

async function openDraftInDesk(page: Page, title: string) {
  await page.goto("/admin/newsdesk?lang=ko");
  await signInAsAdmin(page);
  await dismissConsent(page);
  await page.getByTestId("draft-queue-item").filter({ hasText: title }).first().click();
  await expect(page.getByTestId("publish-article")).toBeVisible();
}

test("① 주간 대회 세기 · ② 잠긴 초안 발행 막힘 · ③ [경고 풀기] 뒤 발행 · ④ 발행 뒤 새 경고는 표시만", async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectConsoleErrors(page);
  await seedWeekly();

  // ① 손 주간 초안 — 근거 · 지시문
  const { slug } = await callFn<{ slug: string }>("generateNewsDraft", { template: "weekly", sourceLang: "ko" });
  const draftPrompt = prompts.find((p) => p.includes("[3층 · 주간 랭킹 동향]"))!;
  expect(draftPrompt).toContain("ACTIVE TOURNAMENTS: 1");
  expect(draftPrompt).toContain("[진행 중 대회]");
  for (const no of ["숨김 선두", "시드 선두", "없는 대회 선두"]) expect(draftPrompt).not.toContain(no);

  // ② 잠김 — 뉴스데스크 [발행]을 눌러도 초안 그대로
  const d0 = (await news(slug).get()).data()!;
  expect(d0.status).toBe("draft");
  expect(d0.checkBlocked).toBe(true);
  expect(d0.checkWarnings).toEqual(expect.arrayContaining([{ rule: "forbidden_word", lang: "ko", field: "body.0", match: "전쟁" }]));
  await openDraftInDesk(page, "이번 주의 설렘");
  await page.getByTestId("publish-article").click();
  await page.waitForTimeout(3_000);
  expect((await news(slug).get()).get("status")).toBe("draft");
  await page.screenshot({ path: "test-results-emulator/news2-publish-blocked.png" });

  // ③ [경고 풀기] → 기록 → [발행]
  const res = await callFn<{ slug: string; cleared: { match: string }[]; checkBlocked: boolean }>("clearNewsCheckWarnings", { slug });
  expect(res.checkBlocked).toBe(false);
  expect(res.cleared.map((w) => w.match)).toContain("전쟁");
  const log = await db().collection("news_check_clears").where("slug", "==", slug).get();
  expect(log.size).toBe(1);
  expect(log.docs[0].get("by")).toBe(ADMIN_UID);
  // 두 번 눌러도 기록은 한 줄(이미 푼 경고)
  expect((await callFn<{ cleared: unknown[] }>("clearNewsCheckWarnings", { slug })).cleared).toEqual([]);

  await openDraftInDesk(page, "이번 주의 설렘");
  await page.getByTestId("publish-article").click();
  await expect.poll(async () => (await news(slug).get()).get("status"), { timeout: 20_000 }).toBe("published");
  await page.screenshot({ path: "test-results-emulator/news2-published-after-clear.png" });

  // ④ 발행된 기사를 고쳐 새 경고 → 다시 잠김 표시 · 발행 그대로
  const body = (await news(slug).get()).get("body") as { ko: { type: string; text: string }[] };
  body.ko[1] = { type: "closer", text: "팬들의 투표가 몰렸다." };
  await news(slug).update({ body });
  await expect.poll(async () => (await news(slug).get()).get("checkBlocked"), { timeout: 30_000 }).toBe(true);
  const d4 = (await news(slug).get()).data()!;
  expect(d4.status).toBe("published");
  expect((d4.checkWarnings as { match: string }[]).map((w) => w.match)).toEqual(expect.arrayContaining(["전쟁", "투표"]));
  expect(errors.filter((e) => !/permission|PERMISSION_DENIED|Missing or insufficient/i.test(e))).toEqual([]);
});

test("⑤ 차트 설명창 셋째 줄 — en Share · es Cuota", async ({ page }) => {
  const { id, contestantIds } = await seedImageTournament();
  const r = (i: number, score: number) => ({ rank: i + 1, contestantId: contestantIds[i], name: `엔트리${i + 1}`, videoId: null, crownScore: score, placementRate: 0.5, winRate: 0.5, shareRate: 0.5 });
  await db().collection("ranking_cache").doc(id).set({ tournamentId: id, rankings: [r(0, 800), r(1, 600)], generationSequence: 0, runsTotal: 20, generatedAt: admin.firestore.Timestamp.now(), previousGeneratedAt: null });
  for (const [lang, line] of [
    ["en", "· Share 30% — how often they're chosen in each Match"],
    ["es", "· Cuota 30 % — cuántas veces lo eligen en cada Match"],
  ] as const) {
    await page.goto(`/arena/${id}/ranking?lang=${lang}`);
    await dismissConsent(page);
    await page.getByTestId("chart-score-help").click();
    const panel = page.getByTestId("chart-score-help-panel");
    await expect(panel.locator("p").nth(3)).toHaveText(line);
    await panel.screenshot({ path: `test-results-emulator/news2-chart-help-${lang}.png` });
  }
});
