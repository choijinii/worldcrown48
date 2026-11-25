/**
 * 매치 무대를 사람처럼 끝까지 고르는 공용 손잡이 (RUN-FIX-1 · 2026-11-25).
 * 에뮬레이터 시험(e2e/emulator/run-fix1-round-transition.spec.ts)과 미리보기 시험
 * (run1-daily-run-limit · hf3-guest-run)이 함께 쓴다. 새로고침 없이 판을 넘겨야 2판째 안내 결함이 드러난다.
 */
import { expect, type Page } from "@playwright/test";

const PICK_GAP_MS = 1600; // onVote 분당 40 — 사람처럼 천천히
export const ALL_ROUNDS = ["ROUND OF 24", "ROUND OF 12", "ROUND OF 6", "THE FINAL"];

/** 라운드의 마지막 선택 번호 → 그 뒤에 떠야 하는 안내 (24 + 12 + 6 + 3 + 결승 1 = 46). */
const ROUND_END: Record<number, string> = { 24: "ROUND OF 24", 36: "ROUND OF 12", 42: "ROUND OF 6", 45: "THE FINAL" };
const TOTAL_PICKS = 46;

/** 떠 있는 라운드 전환 안내의 다음 라운드 이름을 읽고 닫는다(닫힐 때까지 기다림). */
async function readAndClose(page: Page): Promise<string> {
  const next = (await page.getByTestId("round-next").innerText()).trim();
  const advance = page.getByTestId("round-advance");
  if (await advance.isVisible()) await advance.click().catch(() => undefined);
  else await page.getByTestId("round-transition").click({ force: true, timeout: 2000 }).catch(() => undefined);
  await expect(page.getByTestId("round-transition")).toHaveCount(0, { timeout: 10_000 });
  return next;
}

/**
 * 판 하나를 끝까지 고른다. 이 판에서 본 라운드 전환 안내의 다음 라운드 이름을 순서대로 돌려준다.
 *
 * 라운드 마지막 선택 뒤에는 **안내가 뜰 때까지 다음 매치를 고르지 않는다.** 실서비스 함수(advanceRound)는 진행 문서를
 * 몇 초 늦게 쓸 수 있다 — 그 사이 다음 매치를 고르면 클릭이 안내가 2초 뒤 저절로 닫히길 기다렸다 눌려서, 안내를
 * 한 번도 못 본 것처럼 세어진다(2026-11-25 미리보기 CI 실측: 1판째 안내 0번 · 선택 47번).
 */
export async function playRun(
  page: Page,
  run: number,
  opts: { shot?: (name: string) => string; stopAfterFirstTransition?: boolean } = {},
): Promise<string[]> {
  const seen: string[] = [];
  let lastPick = 0;
  const transition = page.getByTestId("round-transition");
  for (let pick = 1; pick <= TOTAL_PICKS; pick++) {
    const left = page.getByTestId("vote-left");
    await expect(left).toBeVisible({ timeout: 30_000 });
    // 예정에 없던 안내가 떠 있으면 기록하고 닫는다(같은 판에서 다시 뜨는 결함도 이렇게 드러난다).
    if (await transition.isVisible()) seen.push(await readAndClose(page));
    const sides = (await page.getByTestId("vote-mid").count()) > 0 ? 3 : 2;
    const before = (await left.innerText()).trim();
    const wait = lastPick + PICK_GAP_MS - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
    lastPick = Date.now();
    await page.getByTestId(sides === 3 ? "vote-mid" : "vote-left").click();

    if (pick === TOTAL_PICKS) break;
    const expected = ROUND_END[pick];
    if (expected) {
      // 라운드 마지막 선택 — 안내가 반드시 떠야 한다.
      await expect(transition, `${run}판째 ${pick}번째 선택 뒤 ${expected} 안내가 뜨지 않음`).toBeVisible({ timeout: 60_000 });
      if (expected === "ROUND OF 24" && opts.shot) await page.screenshot({ path: opts.shot(`run${run}-round24.png`) });
      const next = await readAndClose(page);
      seen.push(next);
      console.log(`[arenaPlay] ${run}판째 · 선택 ${pick}번 뒤 안내 ${next}`);
      if (opts.stopAfterFirstTransition) return seen;
      continue;
    }
    await expect
      .poll(async () => (await left.innerText().catch(() => "")).trim(), {
        timeout: 30_000,
        message: `${run}판째 ${pick}번째 선택 뒤 다음 매치로 넘어가지 않음`,
      })
      .not.toBe(before);
  }
  await expect(page.getByTestId("crown-modal")).toBeVisible({ timeout: 60_000 });
  console.log(`[arenaPlay] ${run}판째 끝 · 안내 ${JSON.stringify(seen)}`);
  return seen;
}

/**
 * [다시 참여]를 누르고, 누른 직후 두 프레임 안에 1판째 완주 화면(크라운 카드 창)이 사라지는지 잰다.
 * 남아 있으면 새 판 문서의 첫 스냅숏이 오기 전까지 지난 판의 완주 이벤트가 새는 것이다.
 */
export async function playAgain(page: Page, nextRun: number): Promise<void> {
  const btn = page.getByRole("button", { name: /다시 참여/ });
  // 완주 직후 화면은 서버에서 판 숫자를 다시 읽는다(page.tsx loadTournament). 그 전의 버튼은 진입 때 숫자(n-2)라,
  // 그때 누르면 2판째로 넘어갔다가 늦게 온 읽기 결과가 1판째 완주 화면으로 되돌린다(2026-11-25 미리보기 CI 실측).
  // 사람이 보는 숫자 "(n-1/한도)"가 뜬 뒤에 누른다.
  await expect(btn).toContainText(`(${nextRun - 1}/`, { timeout: 30_000 });
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
  console.log(`[arenaPlay] [다시 참여] → ${nextRun}판째 · 버튼 ${(await btn.innerText()).trim()}`);
  await btn.click();
  await expect(page.getByTestId("vote-left")).toBeVisible({ timeout: 30_000 });
  const frames = await page.evaluate(() => (window as unknown as { __crownAfterClick?: boolean[] }).__crownAfterClick);
  expect(frames?.[1], `${nextRun}판째 시작 직후 지난 판 완주 화면이 남음 (프레임: ${JSON.stringify(frames)})`).toBe(false);
}
