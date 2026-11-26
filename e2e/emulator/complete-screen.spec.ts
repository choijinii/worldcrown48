/**
 * 완주 화면 (지시서 RUN-FIX-2 완주화면 v1.0 · 2026-11-25) — 에뮬레이터 E2E.
 *
 * 대표 지적: ① [다시 참여] 버튼이 스크롤을 내려야만 보인다 ② "오늘 남은 참여 가능 횟수는 …" 글씨가 작고 어둡다.
 * 1판을 완주한 상태(진행 문서 complete)를 관리자 시드로 만들고 완주 화면을 연다 — 세 화면 크기 × 로그인 · 게스트.
 *  - [다시 참여] 버튼이 스크롤 없이 첫 화면 안에 통째로 있다(toBeInViewport ratio 1).
 *  - 게스트는 남은 판 안내 줄도 첫 화면 안에 통째로 있다 · 글씨 15px 안팎 · 본문 글자색 토큰.
 *  - 공유 메뉴를 연 상태(data-crown="menu")와 게스트 잠금 줄(로그인 안내)이 깨지지 않는다.
 */
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import * as admin from "firebase-admin";
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

const EVIDENCE = join(__dirname, "..", "..", "outputs", "complete-screen-evidence");
mkdirSync(EVIDENCE, { recursive: true });
const STAGE = process.env.COMPLETE_SCREEN_STAGE ?? "after"; // 전·후 캡처 이름
const shot = (name: string) => join(EVIDENCE, `${STAGE}-${name}.png`);

const SIZES = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "390x844", width: 390, height: 844 },
] as const;

function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** 1판을 완주한 상태 — 판 원장 1/한도 · 1판 진행 문서 complete. 게스트는 게스트 원장도 1판. */
async function seedCompletedRun(uid: string, tid: string, champion: string, guest: boolean): Promise<void> {
  const batch = db().batch();
  const now = admin.firestore.FieldValue.serverTimestamp();
  batch.set(db().doc(`tournament_runs/${uid}_${tid}`), { runIndex: 1, runsToday: 1, lastRunDate: kstToday(), updatedAt: now });
  batch.set(db().doc(`roundProgress/${uid}_${tid}`), { userId: uid, tournamentId: tid, runIndex: 1, complete: true, championId: champion, updatedAt: now });
  if (guest) batch.set(db().doc(`guest_runs/${uid}`), { runsToday: 1, lastRunDate: kstToday(), updatedAt: now });
  await batch.commit();
}

async function signInFan(page: Page, uid: string): Promise<void> {
  const token = await adminApp().auth().createCustomToken(uid);
  await page.waitForFunction(() => typeof (window as unknown as { __wc48SignIn?: unknown }).__wc48SignIn === "function");
  await page.evaluate(async (t) => {
    await (window as unknown as { __wc48SignIn: (x: string) => Promise<unknown> }).__wc48SignIn(t);
  }, token);
}

/** 게스트 uid — 앱이 아레나 입장 때 만든 익명 계정(D-41)을 브라우저 저장소에서 읽는다. */
async function anonUid(page: Page): Promise<string> {
  let uid = "";
  await expect
    .poll(
      async () =>
        (uid = await page.evaluate(() => {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)!;
            if (k.startsWith("firebase:authUser:")) return (JSON.parse(localStorage.getItem(k)!).uid as string) ?? "";
          }
          return "";
        })),
      { timeout: 15_000 },
    )
    .toBeTruthy();
  return uid;
}

async function openComplete(page: Page, who: "login" | "guest", tid: string, champion: string): Promise<void> {
  await page.goto("/?lang=ko");
  await dismissConsent(page);
  let uid: string;
  if (who === "login") {
    uid = `e2e-cs-fan-${tid}`;
    await signInFan(page, uid);
  } else {
    await page.goto(`/arena/${tid}?lang=ko`);
    uid = await anonUid(page);
  }
  await seedCompletedRun(uid, tid, champion, who === "guest");
  await page.goto(`/arena/${tid}?lang=ko`);
  await expect(page.getByTestId("crown-modal")).toBeVisible({ timeout: 30_000 });
  const btn = page.getByRole("button", { name: /다시 참여/ });
  await expect(btn).toContainText("(1/", { timeout: 30_000 });
  // 완주 뒤 판 숫자 다시 읽기가 끝나야 켜진다(느린 망 고침) — 켜진 모습으로 캡처한다.
  await expect(btn).toBeEnabled({ timeout: 30_000 });
  // 쿠키 동의 바는 첫 방문 한 번만 뜬다 — 동의를 마친 팬이 보는 화면으로 캡처한다.
  const reject = page.getByRole("button", { name: /Reject non-essential/ });
  if (await reject.isVisible()) {
    await reject.click();
    await expect(reject).toHaveCount(0, { timeout: 10_000 });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

test.beforeAll(async () => {
  await resetEmulators();
  await seedCategories();
});

for (const size of SIZES) {
  for (const who of ["login", "guest"] as const) {
    test(`${size.name} · ${who === "login" ? "로그인" : "게스트"} — 완주 첫 화면에 [다시 참여]${who === "guest" ? " · 남은 판 안내" : ""}`, async ({ page }) => {
      test.setTimeout(120_000);
      const tid = `cs-${size.width}-${who}`;
      const { contestantIds } = await seedImageTournament(tid);
      const errors = collectConsoleErrors(page);
      await page.setViewportSize({ width: size.width, height: size.height });
      await openComplete(page, who, tid, contestantIds[0]);
      await page.screenshot({ path: shot(`${size.name}-${who}`) });

      const btn = page.getByRole("button", { name: /다시 참여/ });
      await expect(btn, "[다시 참여]가 스크롤 없이 첫 화면에 통째로 보여야 한다").toBeInViewport({ ratio: 1 });
      if (who === "guest") {
        const line = page.getByText(/오늘 남은 참여 가능 횟수는/);
        await expect(line, "남은 판 안내가 스크롤 없이 첫 화면에 통째로 보여야 한다").toBeInViewport({ ratio: 1 });
        const style = await line.evaluate((el) => {
          const cs = getComputedStyle(el);
          const probe = document.createElement("span");
          probe.style.color = "var(--color-text)";
          el.appendChild(probe);
          const text = getComputedStyle(probe).color;
          probe.remove();
          return { fontSize: parseFloat(cs.fontSize), color: cs.color, text };
        });
        expect(style.fontSize).toBeGreaterThanOrEqual(14);
        expect(style.fontSize).toBeLessThanOrEqual(16);
        expect(style.color, "안내 글씨 = 본문 글자색 토큰").toBe(style.text);
        // 게스트 잠금 줄(크라운 카드 안 로그인 안내)이 그대로 보인다
        await expect(page.locator('[data-crown="unauth"]')).toBeVisible();
      }
      await expectNoConsoleErrors(errors);
    });
  }
}

test("공유 메뉴 열림(data-crown=menu) — 메뉴가 보이고 [다시 참여]와 겹치지 않는다", async ({ page }) => {
  test.setTimeout(120_000);
  const tid = "cs-menu";
  const { contestantIds } = await seedImageTournament(tid);
  await page.setViewportSize({ width: 1280, height: 720 });
  await openComplete(page, "login", tid, contestantIds[0]);
  await page.getByRole("button", { name: "Open share menu" }).click();
  await expect(page.locator('[data-crown="menu"]')).toBeVisible();
  await page.screenshot({ path: shot("1280x720-login-menu") });
  const menu = await page.locator('[data-crown="menu"] [role="dialog"]').boundingBox();
  const btn = await page.getByRole("button", { name: /다시 참여/ }).boundingBox();
  expect(menu && btn, "메뉴와 버튼이 모두 그려져야 한다").toBeTruthy();
  const overlap = !(btn!.y >= menu!.y + menu!.height || btn!.y + btn!.height <= menu!.y);
  expect(overlap, `메뉴(${JSON.stringify(menu)})와 버튼(${JSON.stringify(btn)})이 겹침`).toBe(false);
});
