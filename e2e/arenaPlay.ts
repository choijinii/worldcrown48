/**
 * 매치 무대를 사람처럼 끝까지 고르는 공용 손잡이 (RUN-FIX-1 · 2026-11-25).
 * 에뮬레이터 시험(e2e/emulator/run-fix1-round-transition.spec.ts)과 미리보기 시험
 * (run1-daily-run-limit · hf3-guest-run)이 함께 쓴다. 새로고침 없이 판을 넘겨야 2판째 안내 결함이 드러난다.
 */
import { expect, type Page } from "@playwright/test";

const PICK_GAP_MS = 1600; // onVote 분당 40 — 사람처럼 천천히
export const ALL_ROUNDS = ["ROUND OF 24", "ROUND OF 12", "ROUND OF 6", "THE FINAL"];

/** 판 하나를 끝까지 고른다. 이 판에서 본 라운드 전환 안내의 다음 라운드 이름을 순서대로 돌려준다. */
export async function playRun(
  page: Page,
  run: number,
  opts: { shot?: (name: string) => string; stopAfterFirstTransition?: boolean } = {},
): Promise<string[]> {
  const seen: string[] = [];
  let picks = 0;
  let lastPick = 0;
  for (let guard = 0; guard < 200; guard++) {
    if (await page.getByTestId("crown-modal").isVisible()) break;
    const transition = page.getByTestId("round-transition");
    if (await transition.isVisible()) {
      const next = (await page.getByTestId("round-next").innerText()).trim();
      if (seen[seen.length - 1] !== next) {
        seen.push(next);
        console.log(`[arenaPlay] ${run}판째 · 선택 ${picks}번 뒤 안내 ${next}`);
        if (next === "ROUND OF 24" && opts.shot) await page.screenshot({ path: opts.shot(`run${run}-round24.png`) });
        if (opts.stopAfterFirstTransition) return seen;
      }
      const advance = page.getByTestId("round-advance");
      if (await advance.isVisible()) await advance.click().catch(() => undefined);
      else await transition.click({ force: true, timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(250);
      continue;
    }
    const left = page.getByTestId("vote-left");
    if (!(await left.isVisible())) {
      await page.waitForTimeout(250);
      continue;
    }
    const sides = (await page.getByTestId("vote-mid").count()) > 0 ? 3 : 2;
    const before = (await left.innerText()).trim();
    const wait = lastPick + PICK_GAP_MS - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
    lastPick = Date.now();
    await page.getByTestId(sides === 3 ? "vote-mid" : "vote-left").click();
    picks++;
    await expect
      .poll(
        async () => {
          if (await page.getByTestId("crown-modal").isVisible()) return "done";
          if (await page.getByTestId("round-transition").isVisible()) return "transition";
          const now = (await page.getByTestId("vote-left").innerText().catch(() => "")).trim();
          return now && now !== before ? "next" : "wait";
        },
        { timeout: 30_000, message: `${run}판째 ${picks}번째 선택 뒤 화면이 넘어가지 않음` },
      )
      .not.toBe("wait");
  }
  console.log(`[arenaPlay] ${run}판째 끝 · 선택 ${picks}번 · 안내 ${JSON.stringify(seen)}`);
  expect(picks, `${run}판째 선택 수`).toBe(46); // 24 + 12 + 6 + 3 + 결승 1
  await expect(page.getByTestId("crown-modal")).toBeVisible();
  return seen;
}

/**
 * [다시 참여]를 누르고, 누른 직후 두 프레임 안에 1판째 완주 화면(크라운 카드 창)이 사라지는지 잰다.
 * 남아 있으면 새 판 문서의 첫 스냅숏이 오기 전까지 지난 판의 완주 이벤트가 새는 것이다.
 */
export async function playAgain(page: Page, nextRun: number): Promise<void> {
  const btn = page.getByRole("button", { name: /다시 참여/ });
  await expect(btn).toBeEnabled({ timeout: 30_000 });
  await page.evaluate(() => {
    const w = window as unknown as { __crownAfterClick?: boolean[] };
    w.__crownAfterClick = [];
    document.addEventListener(
      "click",
      () => {
        const probe = () => w.__crownAfterClick!.push(!!document.querySelector('[data-testid="crown-modal"]'));
        requestAnimationFrame(() => {
          probe();
          requestAnimationFrame(probe);
        });
      },
      { capture: true, once: true },
    );
  });
  console.log(`[arenaPlay] [다시 참여] → ${nextRun}판째`);
  await btn.click();
  await expect(page.getByTestId("vote-left")).toBeVisible({ timeout: 30_000 });
  const frames = await page.evaluate(() => (window as unknown as { __crownAfterClick?: boolean[] }).__crownAfterClick);
  expect(frames?.[1], `${nextRun}판째 시작 직후 지난 판 완주 화면이 남음 (프레임: ${JSON.stringify(frames)})`).toBe(false);
}
