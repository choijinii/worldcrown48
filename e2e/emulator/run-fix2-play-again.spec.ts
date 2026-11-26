/**
 * RUN-FIX-2 (2026-11-25) — [다시 참여] 뒤 완주 화면. 에뮬레이터 E2E(실제 onVote · advanceRound).
 *
 *  ① 같은 Champion 두 판 연속: 2판째를 끝낸 뒤에도 완주 화면이 판 숫자를 다시 읽어 [다시 참여 (2/5)]가 켜진다.
 *     예전에는 "다시 읽었다" 표시를 Champion 이름으로만 기억해서, 같은 Champion이면 다시 읽지 않았다
 *     → 버튼이 "(1/5)"로 꺼진 채 남았다(3판째 불가 · 새로고침해야 풀림).
 *  ② [다시 참여]를 아주 빨리 누름: 판을 끝내자마자(버튼이 눌리는 첫 순간) 눌러도 2판째 무대로 가고 머문다.
 *     느린 망(지연 600ms)에서도 같다.
 */
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import {
  adminApp,
  collectConsoleErrors,
  db,
  dismissConsent,
  expectNoConsoleErrors,
  resetEmulators,
  seedCategories,
  seedImageTournament,
} from "./helpers";
import { playAgain, playRun } from "../arenaPlay";

const EVIDENCE = join(__dirname, "..", "..", "outputs", "run-fix-2-evidence");
mkdirSync(EVIDENCE, { recursive: true });
const shot = (name: string) => join(EVIDENCE, name);

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

async function signInFan(page: Page, uid: string): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?lang=ko");
  await dismissConsent(page);
  const token = await adminApp().auth().createCustomToken(uid);
  await page.waitForFunction(() => typeof (window as unknown as { __wc48SignIn?: unknown }).__wc48SignIn === "function");
  await page.evaluate(async (t) => {
    await (window as unknown as { __wc48SignIn: (x: string) => Promise<unknown> }).__wc48SignIn(t);
  }, token);
}

async function openStage(page: Page, tid: string): Promise<void> {
  await page.goto(`/arena/${tid}?lang=ko`);
  await expect(page.getByTestId("vote-left")).toBeVisible({ timeout: 30_000 });
  const intro = page.getByTestId("arena-intro");
  if (await intro.isVisible()) await page.getByTestId("arena-intro-start").click();
}

test("① 같은 Champion 두 판 연속 — 2판째 완주 뒤 [다시 참여 (2/5)]가 켜지고 3판째로 넘어간다", async ({ page }) => {
  test.setTimeout(600_000);
  const uid = "e2e-runfix2-fan";
  const { id } = await seedImageTournament("runfix2T1");
  const errors = collectConsoleErrors(page);
  await signInFan(page, uid);
  await openStage(page, id);

  await playRun(page, 1);
  const c1 = (await db().doc(`roundProgress/${uid}_${id}`).get()).get("championId");
  // 2판째 대진을 1판째와 똑같이 둔다 — 늘 같은 쪽을 고르므로 같은 Champion이 나온다.
  const s1 = (await db().doc(`bracket_seeds/${uid}_${id}`).get()).get("seed");
  await db().doc(`bracket_seeds/${uid}_${id}_r2`).set({ seed: s1 });
  await playAgain(page, 2);
  await playRun(page, 2);
  await expect.poll(async () => (await db().doc(`roundProgress/${uid}_${id}_r2`).get()).get("championId")).toBe(c1);

  const btn = page.getByRole("button", { name: /다시 참여/ });
  await expect(btn, "2판째 완주 뒤 판 숫자를 다시 읽어야 한다").toContainText("(2/5)", { timeout: 30_000 });
  await expect(btn).toBeEnabled();
  await page.screenshot({ path: shot("same-champion-run2-complete.png") });
  await playAgain(page, 3);
  await expect(page.getByTestId("vote-left")).toBeVisible();
  await expectNoConsoleErrors(errors);
});

/**
 * ② 완주 직후 버튼이 눌리는 첫 순간에 누른다. 누른 뒤 8초 동안 화면이 어디에 있는지 0.25초마다 적는다.
 * 기대: 2판째 무대(vote-left)로 가서 머문다 — 완주 화면(crown-modal)으로 되돌아오지 않는다.
 */
async function fastPlayAgainCase(page: Page, uid: string, tid: string, latencyMs: number): Promise<void> {
  await signInFan(page, uid);
  await openStage(page, tid);
  if (latencyMs > 0) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: latencyMs,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
  }
  await playRun(page, 1);
  const btn = page.getByRole("button", { name: /다시 참여/ });
  await expect(btn).toBeEnabled({ timeout: 60_000 });
  const label = (await btn.innerText()).trim();
  await btn.click();
  const trail: string[] = [];
  for (let i = 0; i < 32; i++) {
    const where = (await page.getByTestId("crown-modal").isVisible())
      ? "완주"
      : (await page.getByTestId("vote-left").isVisible())
        ? "무대"
        : "기타";
    if (trail[trail.length - 1] !== where) trail.push(where);
    await page.waitForTimeout(250);
  }
  console.log(`[fast-play-again] 지연 ${latencyMs}ms · 누를 때 버튼 "${label}" · 화면 흐름 ${trail.join(" → ")}`);
  await page.screenshot({ path: shot(`fast-play-again-${latencyMs}ms.png`) });
  expect(trail[trail.length - 1], `누를 때 "${label}" · 흐름 ${trail.join(" → ")}`).toBe("무대");
  expect(trail, `2판째 무대로 간 뒤 완주 화면으로 되돌아옴 · 흐름 ${trail.join(" → ")}`).not.toContain("완주");
}

test("② [다시 참여]를 완주 직후 바로 누름 — 2판째 무대로 가서 머문다", async ({ page }) => {
  test.setTimeout(400_000);
  const { id } = await seedImageTournament("runfix2T2");
  await fastPlayAgainCase(page, "e2e-runfix2-fast", id, 0);
});

// 고치기 전 코드에서 실패로 확인(2026-11-25): 판 숫자를 다시 읽기 전의 버튼 "(0/5)"가 눌리고, 누른 것이 무시된 채
// 완주 화면에 남았다. 고침(대표 지시 2026-11-26): 다시 읽는 동안에만 버튼을 꺼 둔다(isRunRefreshSettled).
test("② 느린 망(지연 600ms) — [다시 참여]를 완주 직후 바로 눌러도 2판째 무대로 가서 머문다", async ({ page }) => {
  test.setTimeout(600_000);
  const { id } = await seedImageTournament("runfix2T3");
  await fastPlayAgainCase(page, "e2e-runfix2-slow", id, 600);
});
