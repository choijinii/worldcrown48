/**
 * NEWS-1 — TIO 기본 지식 다섯 층 · 생성 뒤 검사 · 점유율 이름 (에뮬레이터 · AI 가짜 · 지시서 §11 E2E).
 *
 *   ① 관리자가 편집 방침 줄을 저장(saveNewsPolicy 콜러블) → 다음 주간 초안 생성(generateNewsDraft)의 지시문에 그 줄이 들어간다
 *      · 지시문은 사실표로 시작한다 · 31줄 · 이유 없는 줄은 서버가 거절한다
 *   ② 틀린 가짜 응답(「16경기」 · 「애정 전쟁」 · 「투표」)으로 만든 초안 문서에 checkWarnings 가 있다 · 상태는 draft
 *   ③ 차트 화면 "?" 설명창의 한국어 세 줄 = 세 비율 정본 이름(원장 D-108 · 2026-11-28 — 옛 "점유율")
 *
 * 가짜 AI 는 127.0.0.1:9313(scripts/e2e-emulator.sh 의 ANTHROPIC_BASE_URL). 바깥 사이트 · 진짜 AI 를 부르지 않는다.
 * generateNewsDraft 는 관리자 콜러블이라 뉴스 AI 스위치(NEWS_DRAFT_AI)와 상관없이 돈다.
 */
import { createServer, type Server } from "node:http";
import * as admin from "firebase-admin";
import { expect, test } from "@playwright/test";
import {
  ADMIN_UID,
  PROJECT_ID,
  adminApp,
  collectConsoleErrors,
  db,
  dismissConsent,
  expectNoConsoleErrors,
  resetEmulators,
  seedCategories,
  seedImageTournament,
} from "./helpers";

const AI_PORT = 9313;
const POLICY_TEXT = "[E2E 편집 방침] 주간 기사는 이번 주에 새로 열린 대회부터 소개한다.";
const FACT_FIRST = "[1층 · WorldCrown48 기본 사실표";

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
      const l = prompt.includes("(en)") ? "en" : "es";
      // 틀린 응답(번역도 블록 수를 원문과 같게 — 다르면 원문으로 대신 채운다) — 초안 단계에 「16경기」 · 「애정 전쟁」 · 「투표」, 번역 단계에도 war · guerra.
      const text = isTranslate
        ? JSON.stringify({ title: l === "en" ? "A love war" : "Una guerra", subhead: "", body: [{ type: "lead", text: "fans" }, { type: "closer", text: "next week" }] })
        : JSON.stringify({
            title: "48개 팀의 애정 전쟁 시작",
            subhead: "팬들의 투표가 몰린다",
            blocks: [
              { type: "lead", text: "첫 라운드는 48개 팀이 16경기로 나뉘어 맞붙는다." },
              { type: "closer", text: "다음 주가 기다려진다." },
            ],
          });
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

async function callFn(name: string, data: unknown): Promise<{ ok: boolean; result?: unknown; error?: { details?: { code?: string } } }> {
  const r = await fetch(`http://127.0.0.1:5001/${PROJECT_ID}/asia-northeast3/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await idToken()}` },
    body: JSON.stringify({ data }),
  });
  const j = (await r.json()) as { result?: unknown; error?: { details?: { code?: string } } };
  return { ok: r.ok && !j.error, ...j };
}

test("① 편집 방침 저장 → 주간 초안 지시문에 그 줄 · ② 틀린 응답 → checkWarnings", async () => {
  test.setTimeout(180_000);

  // 서버가 거절하는 줄 — 31줄 · 이유 없음
  const tooMany = await callFn("saveNewsPolicy", { lines: Array.from({ length: 31 }, (_, i) => ({ text: `줄 ${i}`, reason: "r" })) });
  expect(tooMany.ok).toBe(false);
  expect(tooMany.error?.details?.code).toBe("too-many-lines");
  const noReason = await callFn("saveNewsPolicy", { lines: [{ text: "이유 없는 줄" }] });
  expect(noReason.error?.details?.code).toBe("reason-required");

  // ① 저장 → 읽기
  const saved = await callFn("saveNewsPolicy", { lines: [{ text: POLICY_TEXT, reason: "E2E 시험", kinds: ["weekly"] }] });
  expect(saved.ok).toBe(true);
  const read = (await callFn("getNewsPolicy", {})).result as { lines: { text: string; reason: string; addedAt: string; kinds?: string[] }[] };
  expect(read.lines).toEqual([{ text: POLICY_TEXT, reason: "E2E 시험", addedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), kinds: ["weekly"] }]);

  // 다음 주간 초안 생성
  const gen = await callFn("generateNewsDraft", { template: "weekly", sourceLang: "ko" });
  expect(gen.ok, JSON.stringify(gen.error)).toBe(true);
  const slug = (gen.result as { slug: string }).slug;

  const draftPrompt = prompts.find((p) => p.includes("[3층 · 주간 랭킹 동향]"));
  expect(draftPrompt, "주간 초안 지시문").toBeTruthy();
  expect(draftPrompt!.startsWith(FACT_FIRST)).toBe(true);
  expect(draftPrompt).toContain("35. 시험 대회(이름에 E2E 등)는 기사로 쓰지 않는다.");
  expect(draftPrompt).toContain(`- ${POLICY_TEXT}`);

  // ② 초안 문서 — 상태 draft · checkWarnings 에 셋 다
  const doc = (await db().collection("news").doc(slug).get()).data() as {
    status: string;
    checkWarnings: { rule: string; lang: string; field: string; match: string }[];
  };
  expect(doc.status).toBe("draft");
  const keys = doc.checkWarnings.map((w) => `${w.rule}:${w.lang}:${w.field}:${w.match}`);
  expect(keys).toEqual(expect.arrayContaining(["forbidden_word:ko:title:전쟁", "forbidden_word:ko:subhead:투표", "forbidden_word:en:title:war"]));
  expect(doc.checkWarnings.some((w) => w.rule === "wrong_number" && w.match.includes("16"))).toBe(true);
});

test("③ 차트 설명창 한국어 세 줄 = 순위점수율 · 우승율 · 선택율(D-108)", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const { id, contestantIds } = await seedImageTournament();
  const row = (i: number, score: number) => ({
    rank: i + 1,
    contestantId: contestantIds[i],
    name: `엔트리${String(i + 1).padStart(2, "0")}`,
    videoId: null,
    crownScore: score,
    placementRate: 0.5,
    winRate: 0.5,
    shareRate: 0.5,
  });
  await db().collection("ranking_cache").doc(id).set({
    tournamentId: id,
    rankings: [row(0, 800), row(1, 600)],
    generationSequence: 0,
    runsTotal: 20,
    generatedAt: admin.firestore.Timestamp.now(),
    previousGeneratedAt: null,
  });
  await page.goto(`/arena/${id}/ranking?lang=ko`);
  await dismissConsent(page);
  await page.getByTestId("chart-score-help").click();
  const panel = page.getByTestId("chart-score-help-panel");
  await expect(panel.locator("p").nth(1)).toHaveText("· 순위점수율 40% — 참여마다 결승에 얼마나 가까이 올랐는지");
  await expect(panel.locator("p").nth(2)).toHaveText("· 우승율 30% — 결승에서 선택받아 1등이 된 비율");
  await expect(panel.locator("p").nth(3)).toHaveText("· 선택율 30% — Match마다 선택받은 비율");
  for (const old of ["선택 비율", "점유율", "1등 비율", "오른 순위"]) await expect(panel).not.toContainText(old);
  await panel.screenshot({ path: "test-results-emulator/news1-chart-help-ko.png" });
  await expectNoConsoleErrors(errors);
});
