/**
 * T5 차트 증분 집계 PR 1 — 끝에서 끝까지 증거 (에뮬레이터).
 *
 * 영상 대회 하나(마감 +30일 · 엔트리 48)에 기록을 두 묶음으로 심고 발표 흐름
 * (`publishTournament`)을 **두 번** 돌린다. 첫 발표는 누적이 없어 처음부터 세고(recount),
 * 두 번째는 그 사이 구간만 읽는다(increment). 그 뒤 진짜 차트 화면을 연다.
 *
 * 지키는 것:
 *   · 두 번째 발표 = 증분 · 그림자 비교 일치 · 캐시 씀 — 읽은 건수는 증거 파일로 남긴다
 *   · 캐시의 엔트리 순서 = 옛 전량 방식(tallyVotes + tallyRuns + buildTallies + buildRankingUpdate) 순서
 *   · 게스트 판(2개)은 판 집계에서 빠지고, 경계(첫 구간 끝)에 걸친 판은 두 번째 발표에서 한 번만 세어진다
 *   · 화면: Crown Score 줄 · 선택 수 숫자 없음(c3-ranking 단언 방식) · 콘솔 오류 0 · 1440 · 390 캡처
 *   · PR 2: 공개 캐시에 `totalVotes` 없음 · 행에 `voteCount`·`rate` 없음(행 = 옛 행의 공개 모양) ·
 *     차트 사진 `ranking_archive/{tid}/gens` 문서 2개(발표마다 하나) · 캡처 `t5-chart-pr2-{폭}.png`
 *
 * 발표 함수는 functions 코드를 그대로 부른다. 루트와 functions 는 firebase-admin 이 서로 다른
 * 꾸러미라 시각 값(Timestamp)을 섞으면 직렬화가 거절된다 → 루트 쪽 `toTimestamp` 를 넘긴다.
 */
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import * as admin from "firebase-admin";
import { publishTournament, type PublishLog } from "../../functions/src/core/rankingAccumStore";
import { RUN_VOTES } from "../../functions/src/core/incrementalTally";
import { buildTallies, contestantMetaOf, tallyVotes } from "../../functions/src/core/rankingAggregator";
import { buildRankingUpdate } from "../../functions/src/core/scheduleRankingCacheCore";
import { tallyRuns, type RunVote } from "../../lib/ranking/tallyRuns";
import { toPublicEntry } from "../../lib/ranking/publicEntry";
import {
  collectConsoleErrors,
  db,
  expectNoConsoleErrors,
  expectNoForbiddenWords,
  resetEmulators,
  seedCategories,
  seedVideoTournament,
  stubYouTubeImages,
} from "./helpers";

const EVIDENCE = join(__dirname, "..", "..", "outputs", "t5-evidence");
mkdirSync(EVIDENCE, { recursive: true });

const TID = "t5T1";
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const LAG = 2 * MIN; // PUBLISH_LAG_MS — 구간 끝 = 발표 시각 − 2분

/** 루트 firebase-admin 의 Timestamp (functions 쪽 클래스는 이 db 가 직렬화하지 못한다). */
const toTimestamp = (ms: number) => admin.firestore.Timestamp.fromMillis(ms);

/** 결정적 난수(mulberry32) — 같은 시드면 같은 대진. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SeedVote {
  id: string;
  userId: string;
  runIndex: number;
  isGuest: boolean;
  round: number;
  matchId: string;
  contestantId: string;
  createdAtMs: number;
}

/**
 * 한 판 = 라운드 1~5(24·12·6·3·1 = 46건). 앞쪽 엔트리가 조금 더 자주 이기게 기울여
 * Crown Score 순서가 뚜렷하게 갈리게 한다(동점만 잔뜩이면 순서 비교가 약해진다).
 */
function makeRun(contestantIds: string[], userId: string, runIndex: number, isGuest: boolean, startMs: number, seed: number): SeedVote[] {
  const r = rng(seed);
  const field = contestantIds.slice();
  for (let i = field.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [field[i], field[j]] = [field[j], field[i]];
  }
  const order = (c: string) => contestantIds.indexOf(c);
  const out: SeedVote[] = [];
  let t = startMs;
  const push = (round: number, m: number, contestantId: string) => {
    out.push({
      id: `${TID}_${userId}_${runIndex}_r${round}m${m}`,
      userId,
      runIndex,
      isGuest,
      round,
      matchId: `${TID}:r${round}:m${m}`,
      contestantId,
      createdAtMs: t,
    });
    t += MIN;
  };
  let cur = field;
  for (let round = 1; round <= 4; round++) {
    const winners: string[] = [];
    for (let m = 0; m < cur.length / 2; m++) {
      const [a, b] = [cur[2 * m], cur[2 * m + 1]];
      const favored = order(a) < order(b) ? a : b;
      const other = favored === a ? b : a;
      const w = r() < 0.7 ? favored : other;
      winners.push(w);
      push(round, m, w);
    }
    cur = winners;
  }
  const final3 = cur.slice().sort((x, y) => order(x) - order(y));
  push(5, 0, r() < 0.6 ? final3[0] : final3[Math.floor(r() * 3)]);
  expect(out).toHaveLength(RUN_VOTES);
  return out;
}

async function seedVotes(votes: SeedVote[]): Promise<void> {
  for (let i = 0; i < votes.length; i += 400) {
    const batch = db().batch();
    for (const v of votes.slice(i, i + 400)) {
      batch.set(db().collection("votes").doc(v.id), {
        tournamentId: TID,
        userId: v.userId,
        runIndex: v.runIndex,
        isGuest: v.isGuest,
        round: v.round,
        matchId: v.matchId,
        contestantId: v.contestantId,
        createdAt: toTimestamp(v.createdAtMs),
      });
    }
    await batch.commit();
  }
}

/** 옛 전량 방식이 만드는 rankings — 대회 기록 전부를 한 번에 센다. */
async function legacyRankings() {
  const [votes, contestants] = await Promise.all([
    db().collection("votes").where("tournamentId", "==", TID).get(),
    db().collection("contestants").where("tournamentId", "==", TID).get(),
  ]);
  const rows = votes.docs.map((d) => d.data() as RunVote);
  const tallies = buildTallies(
    tallyVotes(rows),
    contestants.docs.map((d) => contestantMetaOf(d.id, d.data())),
  );
  return {
    voteRows: votes.size,
    update: buildRankingUpdate({
      tournamentId: TID,
      tallies,
      runs: tallyRuns(rows),
      prevCache: null,
      history24: null,
      existingUnresolvedTags: [],
    }),
  };
}

test.beforeEach(async () => {
  await resetEmulators();
  await seedCategories();
});

test("T5 · 발표 두 번(처음부터 → 증분) · 캐시 순서 = 옛 전량 방식 · 차트 화면 1440 · 390", async ({ page }) => {
  test.setTimeout(240_000);
  const { contestantIds } = await seedVideoTournament(TID);
  // 마감 +30일 — 창 안 마지막 발표가 아니다(마지막 확정 없이 증분 경로를 탄다).
  const deadlineMs = Date.now() + 30 * DAY;
  const title = "T5 증분 집계 시험 대회";
  await db()
    .collection("tournaments")
    .doc(TID)
    .update({ tournamentDeadline: toTimestamp(deadlineMs), title, titleI18n: { ko: title, en: "T5 Incremental Chart Test", es: "T5 Incremental Chart Test" } });

  // 두 발표 시각 — 지금과 12시간 전(09:00 · 21:00 간격과 같은 폭). 정수 분으로 맞춘다.
  const T2 = Math.floor(Date.now() / MIN) * MIN;
  const T1 = T2 - 12 * HOUR;
  const end1 = T1 - LAG;
  const end2 = T2 - LAG;

  // ── 묶음 1: 로그인 판 6개(첫 구간 안) + 경계에 걸친 판의 앞 20건 ───────────
  const batch1: SeedVote[] = [];
  for (let i = 0; i < 6; i++) {
    batch1.push(...makeRun(contestantIds, `u${i}`, 1, false, T1 - 11 * HOUR + i * HOUR, 100 + i));
  }
  const cross = makeRun(contestantIds, "cross", 2, false, end1 - 20 * MIN, 999);
  const crossBefore = cross.filter((v) => v.createdAtMs < end1);
  const crossAfter = cross.filter((v) => v.createdAtMs >= end1);
  expect(crossBefore).toHaveLength(20);
  await seedVotes(batch1.concat(crossBefore));

  const log1: PublishLog = await publishTournament(db() as never, TID, deadlineMs, T1, { toTimestamp });
  expect(log1.mode).toBe("recount");
  expect(log1.cacheWritten).toBe(true);
  expect(log1.endMs).toBe(end1);
  const cache1 = (await db().collection("ranking_cache").doc(TID).get()).data()!;
  // 경계 판은 아직 끝나지 않았다 → 묶음 1 의 완주 판 6개만.
  expect(cache1.runsTotal).toBe(6);

  // ── 묶음 2: 로그인 판 6개 + 게스트 판 2개 + 경계 판의 나머지 26건 ─────────
  const batch2: SeedVote[] = [];
  for (let i = 0; i < 6; i++) {
    batch2.push(...makeRun(contestantIds, `u${6 + i}`, 1, false, T1 + i * HOUR, 200 + i));
  }
  for (let i = 0; i < 2; i++) {
    batch2.push(...makeRun(contestantIds, `guest${i}`, 1, true, T1 + 7 * HOUR + i * HOUR, 300 + i));
  }
  const all = batch1.concat(cross, batch2);
  expect(Math.max(...all.map((v) => v.createdAtMs))).toBeLessThan(end2);
  await seedVotes(batch2.concat(crossAfter));

  const log2: PublishLog = await publishTournament(db() as never, TID, deadlineMs, T2, { toTimestamp });
  writeFileSync(
    join(EVIDENCE, "publish-log-pr2.json"),
    JSON.stringify({ seededVotes: all.length, first: log1, second: log2 }, null, 2) + "\n",
  );
  expect(log2.mode).toBe("increment");
  expect(log2.shadow).toBe("match");
  expect(log2.cacheWritten).toBe(true);
  expect(log2.endMs).toBe(end2);
  // 증분은 그 사이 구간에 만들어진 기록만 읽는다 — 묶음 2 + 경계 판 나머지(판 따로 읽기는 runFetch 칸).
  expect(log2.reads.created).toBe(batch2.length + crossAfter.length);
  expect(log2.reads.created).toBeLessThan(all.length);

  // ── 캐시 = 옛 전량 방식 ──────────────────────────────────────────────────
  const cache = (await db().collection("ranking_cache").doc(TID).get()).data()!;
  const legacy = await legacyRankings();
  expect(legacy.voteRows).toBe(all.length);
  expect(cache.runsTotal).toBe(13); // 로그인 12 + 경계 판 1 · 게스트 2 판 제외
  expect(cache.runsTotal).toBe(legacy.update.runsTotal);
  const ids = (cache.rankings as { contestantId: string }[]).map((r) => r.contestantId);
  expect(ids.length).toBeGreaterThan(0);
  expect(ids).toEqual(legacy.update.rankings.map((r) => r.contestantId));
  // 공개 캐시 = 옛 행의 공개 모양(선택 수 · 비율만 빠지고 나머지 키 · 값은 같다 · T5 PR 2).
  expect(cache.rankings).toEqual(legacy.update.rankings.map(toPublicEntry));
  expect(cache.generationSequence).toBe(1);
  expect(Object.keys(cache)).not.toContain("totalVotes");
  for (const row of cache.rankings as Record<string, unknown>[]) {
    expect(Object.keys(row)).not.toContain("voteCount");
    expect(Object.keys(row)).not.toContain("rate");
  }
  // 옛 전량 방식의 합계는 서버 안에서만 있다 — 화면 단언에 쓴다(0이면 단언이 약해진다).
  expect(legacy.update.totalVotes).toBeGreaterThan(0);

  // ── 차트 사진: 발표마다 한 장 · 영구 ────────────────────────────────────
  const gens = await db().collection("ranking_archive").doc(TID).collection("gens").get();
  expect(gens.size).toBe(2);
  for (const g of gens.docs) {
    const rows = g.get("rows") as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      for (const k of ["voteCount", "rate", "videoId", "imageUrl"]) expect(Object.keys(row)).not.toContain(k);
    }
  }

  // ── 차트 화면 ───────────────────────────────────────────────────────────
  await stubYouTubeImages(page);
  const errors = collectConsoleErrors(page);
  const totalVotes = String(legacy.update.totalVotes);
  for (const width of [1440, 390] as const) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto(`/arena/${TID}/ranking?lang=ko`);
    // 동의 바가 차트 아래쪽을 덮지 않게 [필수만]을 누른다(바에 testid 가 없어 글자로 찾는다 · 두 번째 폭에서는 이미 없다).
    const reject = page.getByRole("button", { name: /필수만/ });
    if (await reject.isVisible().catch(() => false)) await reject.click();
    await expect(reject).toHaveCount(0);
    const view = page.getByTestId("ranking-view");
    await expect(view).toHaveAttribute("data-rank", "loaded", { timeout: 30_000 });
    await expect(page.getByTestId("rank-row")).toHaveCount(ids.length);
    await expect(page.getByTestId("rank-score").first()).toHaveText(String(cache.rankings[0].crownScore));
    // 선택 수 숫자는 화면 어디에도 없다 (c3-ranking 단언 방식).
    await expect(page.getByTestId("rank-rate")).toHaveCount(0);
    await expect(page.locator("text=/^\\d+표$/")).toHaveCount(0);
    await expect(page.locator("text=/Total Votes/i")).toHaveCount(0);
    await expect(page.locator("text=/Vote Rate/i")).toHaveCount(0);
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toMatch(new RegExp(`(^|\\D)${totalVotes}(\\D|$)`));
    expect(body).not.toContain("votecount");
    await expect(page.getByTestId("anomaly-badge")).toHaveCount(0);
    await expectNoForbiddenWords(page);
    await page.screenshot({ path: join(EVIDENCE, `t5-chart-pr2-${width}.png`) });
  }
  await expectNoConsoleErrors(errors);
});
