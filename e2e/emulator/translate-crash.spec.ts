/**
 * 팬 화면 번역 멈춤 (2026-11-20 대표 승인 B 방법) — 에뮬레이터 E2E.
 *
 * 크롬 번역을 흉내 낸 채로(글자 마디를 <font> 로 바꿔 끼움 · translateSim.ts) 팬이 하는 일을 끝까지 한다:
 *  ① 매치 무대 — 판을 끝까지(라운드 전환 · 결승 · 크라운 카드 창) 고르고, 중간에 언어를 두 번 바꾼다.
 *     매번 이름 버튼 글자가 **지금 매치의 엔트리**(그 칸 그림 번호)와 같은지 본다 — 옛 이름이 남으면 실패.
 *  ② 차트 · ③ 피치 · 아레나 홈 — 언어를 ko → en → es 로 바꾼다.
 * 어디서도 화면이 멈추지 않고(페이지 오류 · 콘솔 오류 0) "번역하지 마세요" 표시(translate="no")가 팬 화면에 없어야 한다.
 */
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import * as admin from "firebase-admin";
import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  collectConsoleErrors,
  db,
  dismissConsent,
  expectNoConsoleErrors,
  resetEmulators,
  seedCategories,
  seedImageTournament,
} from "./helpers";
import { enableTranslateSim, installTranslateSim } from "./translateSim";

const EVIDENCE = join(__dirname, "..", "..", "outputs", "translate-crash-evidence");
mkdirSync(EVIDENCE, { recursive: true });
const shot = (name: string) => join(EVIDENCE, name);

type Lang = "ko" | "en" | "es";
const pad = (n: number) => String(n).padStart(2, "0");
const NAME: Record<Lang, (n: number) => string> = {
  ko: (n) => `엔트리${pad(n)}`,
  en: (n) => `Entry${pad(n)}`,
  es: (n) => `Entrada${pad(n)}`,
};
const PICK_GAP_MS = 1800; // onVote 분당 40 — 사람처럼 1.8초에 한 번

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

/** 그림 대회 + 엔트리 이름 3언어(언어를 바꾸면 이름 글자가 바뀌게). */
async function seed(): Promise<{ id: string; contestantIds: string[] }> {
  const t = await seedImageTournament();
  const batch = db().batch();
  t.contestantIds.forEach((cid, i) =>
    batch.update(db().collection("contestants").doc(cid), {
      nameI18n: { ko: NAME.ko(i + 1), en: NAME.en(i + 1), es: NAME.es(i + 1) },
    }),
  );
  await batch.commit();
  return t;
}

async function newPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await installTranslateSim(p);
  return p;
}

async function switchLang(page: Page, to: Lang): Promise<void> {
  await page.getByTestId("lang-toggle").locator("button").first().click();
  await page.getByTestId(`lang-option-${to}`).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(to);
}

const SIDE_IDS = [
  ["L", "vote-left"],
  ["R", "vote-right"],
  ["M", "vote-mid"],
] as const;

/** 이름 버튼 글자 = 그 칸 그림의 엔트리(그림 파일 번호 i → 엔트리 i+1). 옛 이름 · 다른 언어 글자가 남으면 실패. */
async function expectNamesMatch(page: Page, lang: Lang): Promise<number> {
  let checked = 0;
  for (const [side, id] of SIDE_IDS) {
    const btn = page.getByTestId(id);
    if (!(await btn.count())) continue;
    const src = (await page.getByTestId(`stage-box-${side}`).getByTestId("stage-still").getAttribute("src")) ?? "";
    const n = Number(/imgT1%2F(\d+)(?:_600)?\.jpg/.exec(src)?.[1]) + 1;
    expect(n, `${side} 칸 그림 번호`).toBeGreaterThan(0);
    await expect(btn, `${side} 칸 이름(${lang})`).toContainText(NAME[lang](n), { timeout: 10_000 });
    const text = await btn.innerText();
    if (lang !== "ko") expect(text, `${side} 칸에 한국어 글자가 남음`).not.toMatch(/[가-힣]/);
    for (const other of ["ko", "en", "es"] as const) {
      if (other !== lang) expect(text).not.toContain(NAME[other](n));
    }
    checked++;
  }
  return checked;
}

/**
 * 영어 · 스페인어로 바꾼 뒤 화면에 한국어 글자가 남았는지 — 번역기가 바꿔 끼운 마디는 React 가 고쳐도 화면에 안 나오므로
 * 옛 언어 글자가 남으면 여기서 걸린다. 차트 캐시의 엔트리 이름(엔트리NN · 한 언어만 있음)은 뺀다.
 */
async function expectNoStaleKorean(page: Page, scope = "body"): Promise<void> {
  await expect
    .poll(async () => {
      // 쿠키 동의 바는 번역이 없어도 언어를 바꾸면 한국어로 남는다(원래 동작 · 대조군 SIM_OFF=1 에서 확인) — 이번 범위 밖이라 뺀다.
      const text = await page.locator(scope).first().evaluate((el) => {
        const consent = document.querySelector('[aria-label="Cookie consent"]') as HTMLElement | null;
        const skip = new Set((consent?.innerText ?? "").split("\n").map((l) => l.trim()).filter(Boolean));
        return (el as HTMLElement).innerText.split("\n").filter((l) => !skip.has(l.trim())).join("\n");
      });
      // 차트 아바타의 이니셜 한 글자(캐시 이름 첫 글자)도 뺀다.
      return (text.replace(/엔트리\d\d/g, "").match(/[^\n]*[가-힣][^\n]*/g) ?? []).filter((l) => !/^\s*[가-힣]\s*$/.test(l));
    }, { timeout: 10_000, message: "언어를 바꾼 뒤 한국어 글자가 남음" })
    .toEqual([]);
}

async function expectNoNoTranslateMark(page: Page): Promise<void> {
  expect(await page.locator('body [translate="no"], body .notranslate').count()).toBe(0);
}

test("① 매치 무대 — 번역 흉내를 켠 채 판을 끝까지 · 중간에 언어 두 번 바꿈 · 이름은 늘 지금 매치", async ({ browser }) => {
  test.setTimeout(400_000);
  const { id } = await seed();
  const fan = await newPage(browser);
  const errors = collectConsoleErrors(fan);
  await fan.goto(`/arena/${id}?lang=ko`);
  await dismissConsent(fan);
  await expect(fan.getByTestId("vote-left")).toBeVisible({ timeout: 30_000 });
  const intro = fan.getByTestId("arena-intro");
  if (await intro.isVisible()) await fan.getByTestId("arena-intro-start").click();
  await expect(intro).toHaveCount(0);
  await enableTranslateSim(fan);
  await expectNoNoTranslateMark(fan);

  let lang: Lang = "ko";
  await expectNamesMatch(fan, lang);
  let picks = 0;
  let lastPick = 0;
  let transitions = 0;
  for (let guard = 0; guard < 120; guard++) {
    if (await fan.getByTestId("crown-modal").isVisible()) break;
    const advance = fan.getByTestId("round-advance");
    if (await advance.isVisible()) {
      await advance.click();
      continue;
    }
    if (await fan.getByTestId("round-transition").isVisible()) {
      transitions++;
      // 라운드 전환 안내가 떠 있는 동안 언어를 바꾼다(첫 전환 때 한 번)
      if (transitions === 1 && lang === "en") {
        lang = "es";
        await switchLang(fan, lang);
        await expectNoStaleKorean(fan);
      }
      await fan.getByTestId("round-transition").click({ force: true, timeout: 2000 }).catch(() => undefined);
      await fan.waitForTimeout(300);
      if (transitions > 40) {
        const dump = await fan.evaluate(() =>
          [...document.querySelectorAll('[data-testid="round-transition"]')].map((el) => ({
            parent: el.parentElement?.outerHTML.slice(0, 200),
            style: getComputedStyle(el).opacity + "/" + getComputedStyle(el).display,
            rect: JSON.stringify(el.getBoundingClientRect()),
            text: (el as HTMLElement).innerText.slice(0, 120),
          })),
        );
        throw new Error(`라운드 전환 안내가 사라지지 않음 ${JSON.stringify(dump)}`);
      }
      continue;
    }
    const left = fan.getByTestId("vote-left");
    if (!(await left.isVisible())) {
      await fan.waitForTimeout(300);
      continue;
    }
    const sides = await expectNamesMatch(fan, lang);
    if (picks === 3 && lang === "ko") {
      lang = "en";
      await switchLang(fan, lang);
      await expectNamesMatch(fan, lang);
      await expectNoStaleKorean(fan);
      await fan.screenshot({ path: shot("stage-after-switch-en.png") });
    }
    const before = (await left.innerText()).trim();
    const wait = lastPick + PICK_GAP_MS - Date.now();
    if (wait > 0) await fan.waitForTimeout(wait);
    lastPick = Date.now();
    await fan.getByTestId(sides === 3 ? "vote-mid" : "vote-left").click();
    picks++;
    await expect
      .poll(
        async () => {
          if (await fan.getByTestId("crown-modal").isVisible()) return "done";
          if (await fan.getByTestId("round-transition").isVisible()) return "transition";
          if (await fan.getByTestId("round-advance").isVisible()) return "advance";
          const now = (await fan.getByTestId("vote-left").innerText().catch(() => "")).trim();
          return now && now !== before ? "next" : "wait";
        },
        { timeout: 30_000, message: `${picks}번째 선택 뒤 다음 매치 이름이 바뀌지 않음(옛 이름이 남음)` },
      )
      .not.toBe("wait");
  }
  expect(picks).toBe(46); // 24 + 12 + 6 + 3 + 결승 1
  expect(transitions).toBeGreaterThan(0);
  await expect(fan.getByTestId("crown-modal")).toBeVisible();
  // 크라운 카드 창이 열린 채로도 언어를 바꾼다
  await switchLang(fan, "ko");
  await expect(fan.getByTestId("crown-modal")).toBeVisible();
  await fan.screenshot({ path: shot("crown-modal-after-switch-ko.png") });
  await expectNoNoTranslateMark(fan);
  await expectNoConsoleErrors(errors);
});

test("② 차트 — 번역 흉내 · 언어 ko → en → es · 멈추지 않음", async ({ browser }) => {
  const { id, contestantIds } = await seed();
  const row = (i: number, score: number) => ({
    rank: i + 1,
    contestantId: contestantIds[i],
    name: NAME.ko(i + 1),
    videoId: null,
    imageUrl: null,
    voteCount: 10 - i,
    rate: 50,
    crownScore: score,
    placementRate: 0.5,
    winRate: 0.5,
    shareRate: 0.5,
  });
  await db().collection("ranking_cache").doc(id).set({
    tournamentId: id,
    rankings: [row(0, 800), row(1, 600), row(2, 400)],
    totalVotes: 19,
    generationSequence: 0,
    runsTotal: 20,
    generatedAt: admin.firestore.Timestamp.now(),
    previousGeneratedAt: null,
  });
  const page = await newPage(browser);
  const errors = collectConsoleErrors(page);
  await page.goto(`/arena/${id}/ranking?lang=ko`);
  await dismissConsent(page);
  await expect(page.getByTestId("rank-row")).toHaveCount(3, { timeout: 30_000 });
  await enableTranslateSim(page);
  for (const to of ["en", "es", "ko"] as const) {
    await switchLang(page, to);
    await expect(page.getByTestId("rank-row")).toHaveCount(3);
    await expect(page.getByTestId("ranking-view")).toBeVisible();
    if (to !== "ko") await expectNoStaleKorean(page);
  }
  await page.screenshot({ path: shot("chart-after-switch.png") });
  await expectNoNoTranslateMark(page);
  await expectNoConsoleErrors(errors);
});

for (const [label, path] of [
  ["③ 피치", "/"],
  ["④ 아레나 홈", "/arena"],
] as const) {
  test(`${label} — 번역 흉내 · 언어 ko → en → es · 멈추지 않음`, async ({ browser }) => {
    await seed();
    const page = await newPage(browser);
    const errors = collectConsoleErrors(page);
    await page.goto(`${path}?lang=ko`);
    await dismissConsent(page);
    await expect(page.getByTestId("lang-toggle")).toBeVisible({ timeout: 30_000 });
    // 실시간 연결(Firestore)이 늘 열려 있어 networkidle 은 오지 않는다 — 대회 글자가 그려질 때까지만 기다린다.
    await expect(page.getByText(/IMAGE-1/).first()).toBeVisible({ timeout: 30_000 });
    await enableTranslateSim(page);
    for (const to of ["en", "es", "ko"] as const) {
      await switchLang(page, to);
      if (to !== "ko") await expectNoStaleKorean(page);
    }
    await expect(page.locator("body")).not.toContainText("Application error");
    await page.screenshot({ path: shot(`${path === "/" ? "pitch" : "arena-home"}-after-switch.png`) });
    await expectNoNoTranslateMark(page);
    await expectNoConsoleErrors(errors);
  });
}
