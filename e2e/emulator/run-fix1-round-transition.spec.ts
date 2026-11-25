/**
 * RUN-FIX-1 (2026-11-25) — 2판째부터 라운드 전환 안내가 안 뜨던 결함. 에뮬레이터 E2E(실제 onVote · advanceRound).
 *
 * 대표 실측: 같은 대회 1판 완주 → [다시 참여] → 2판째에서 24강으로 넘어갈 때 안내 없이 바로 다음 매치.
 * 원인: [다시 참여]는 페이지를 언마운트하지 않는데 "이미 본 안내 번호"가 숫자 하나라, 1판째에 5까지 올라간 값이
 * 2판째의 안내 2·3·4·5를 전부 막았다.
 *
 * 이 시험은 사람처럼 **새로고침 없이** 판을 끝까지 고른다(새로고침하면 화면 state 가 0으로 돌아가 결함이 숨는다).
 *  ① 로그인 팬 — 1판 · 2판 · 3판 연속: 판마다 ROUND OF 24 · 12 · 6 · THE FINAL 안내가 전부 뜬다.
 *  ② 게스트 — 1판 · 2판: 같다.
 * 함께 본다: [다시 참여]를 누른 직후 1판째 완주 화면(크라운 카드 창)이 남아 깜빡이지 않는다.
 */
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { ALL_ROUNDS, playAgain, playRun as playRunShared } from "../arenaPlay";
import {
  adminApp,
  collectConsoleErrors,
  dismissConsent,
  expectNoConsoleErrors,
  resetEmulators,
  seedCategories,
  seedImageTournament,
} from "./helpers";

const EVIDENCE = join(__dirname, "..", "..", "outputs", "run-fix-1-evidence");
mkdirSync(EVIDENCE, { recursive: true });
const shot = (name: string) => join(EVIDENCE, name);

const playRun = (page: Parameters<typeof playRunShared>[0], run: number, tag: string) =>
  playRunShared(page, run, { shot: (name) => shot(`${tag}-${name}`) });

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

test("① 로그인 팬 — 새로고침 없이 1 · 2 · 3판: 판마다 라운드 전환 안내 4번 전부", async ({ page }) => {
  test.setTimeout(900_000);
  const { id } = await seedImageTournament("runfixT1");
  const errors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?lang=ko");
  await dismissConsent(page);
  const token = await adminApp().auth().createCustomToken("e2e-runfix-fan");
  await page.waitForFunction(() => typeof (window as unknown as { __wc48SignIn?: unknown }).__wc48SignIn === "function");
  await page.evaluate(async (t) => {
    await (window as unknown as { __wc48SignIn: (x: string) => Promise<unknown> }).__wc48SignIn(t);
  }, token);
  await page.goto(`/arena/${id}?lang=ko`);
  await expect(page.getByTestId("vote-left")).toBeVisible({ timeout: 30_000 });
  const intro = page.getByTestId("arena-intro");
  if (await intro.isVisible()) await page.getByTestId("arena-intro-start").click();

  expect(await playRun(page, 1, "login")).toEqual(ALL_ROUNDS);
  await expect(page.getByRole("button", { name: /다시 참여/ })).toContainText("1/5");
  await playAgain(page, 2);
  expect(await playRun(page, 2, "login")).toEqual(ALL_ROUNDS);
  await expect(page.getByRole("button", { name: /다시 참여/ })).toContainText("2/5");
  await playAgain(page, 3);
  expect(await playRun(page, 3, "login")).toEqual(ALL_ROUNDS);
  await expect(page.getByRole("button", { name: /다시 참여/ })).toContainText("3/5");
  await page.screenshot({ path: shot("login-run3-complete.png") });
  await expectNoConsoleErrors(errors);
});

test("② 게스트 — 새로고침 없이 1 · 2판: 2판째에도 라운드 전환 안내 4번 전부", async ({ page }) => {
  test.setTimeout(600_000);
  const { id } = await seedImageTournament("runfixT2");
  const errors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/arena/${id}?lang=ko`);
  await dismissConsent(page);
  await expect(page.getByTestId("vote-left")).toBeVisible({ timeout: 30_000 });
  const intro = page.getByTestId("arena-intro");
  if (await intro.isVisible()) await page.getByTestId("arena-intro-start").click();

  expect(await playRun(page, 1, "guest")).toEqual(ALL_ROUNDS);
  await playAgain(page, 2);
  expect(await playRun(page, 2, "guest")).toEqual(ALL_ROUNDS);
  await page.screenshot({ path: shot("guest-run2-complete.png") });
  await expectNoConsoleErrors(errors);
});
