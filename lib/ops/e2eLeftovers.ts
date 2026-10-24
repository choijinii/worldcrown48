/**
 * e2eLeftovers — 실서비스 Firestore 에 남은 E2E 시험 대회를 고르는 규칙 (OPS-FIX-1 · 원장 D-66).
 *
 * 쓰는 곳 둘: 정리 스크립트 `functions/scripts/clear-e2e-leftovers.mjs`(대표 실행 · 기본 dry-run)
 * 와 Playwright 전역 마무리 `e2e/global-teardown.ts`(CI 가 끝날 때 오래된 시험 대회만).
 *
 * **import 없는 순수 TS** 로 둔다 — 스크립트(.mjs)가 Node 의 타입 지우기로 이 파일을 그대로
 * 불러 쓰기 때문이다(경로 별칭 `@/`·enum 금지). 규칙이 한 곳에 있어야 둘이 어긋나지 않는다.
 *
 * 진짜 대회를 지우면 되돌릴 수 없다. 그래서 "확실한 신호"(시험 표시 · seed- 주인 · 시험 파일의
 * 고정 id · 고정 제목)가 있을 때만 test 로 고르고, 이름에 e2e·test 가 든 것만으로는 suspect
 * (확인 필요 · 지우지 않음)로 남긴다. 익명·사용자 계정은 이 규칙의 대상이 아니다(2026-10-18).
 */

/** 이 시간보다 오래 전에 심은 시험 대회만 전역 마무리가 쓸어 낸다 — 동시에 도는 CI 실행 보호. */
export const E2E_STALE_AFTER_MS = 2 * 60 * 60 * 1000;

/** 시험이 심는 대회의 주인 접두어 (seed-operator · seed-chart-preview …). */
const SEED_HOST_PREFIX = "seed-";

/** e2e/ 시험 파일이 쓰는 고정 대회 id (2026-10-24 실측). */
export const KNOWN_TEST_TOURNAMENT_IDS: readonly string[] = [
  "arena1-e2e-tournament", // arena1-split-stage
  "c1-e2e-tournament", // c1-arena-flow
  "c2-e2e-tournament", // c2-crown-card-flow
  "c2-e2e-mobile-tournament", // c2-crown-mobile-320
  "run1-daily-limit-e2e-tournament", // run1-daily-run-limit
  "hf3-guest-e2e-a", // hf3-guest-run
  "hf3-guest-e2e-b",
];

/** 고정 id 접두어 — c3-ranking 은 `c3-e2e-{loaded,empty,many,open,few}`. */
export const KNOWN_TEST_ID_PREFIXES: readonly string[] = ["c3-e2e-"];

/**
 * 고정 제목 — 주인이 사람 계정이라 seed- 로 못 거르는 시험.
 * thumb1-pitch(대표 계정 TEST_UID · 자동 id) · b1-admin-lab(Lab 화면으로 발행).
 */
export const KNOWN_TEST_TITLES: readonly string[] = ["THUMB-1 E2E Pitch", "E2E Tournament"];

export type LeftoverVerdict = "test" | "suspect" | "real";

export interface TournamentLike {
  e2e?: unknown;
  e2eSeededAt?: unknown;
  hostUid?: unknown;
  title?: unknown;
  titleI18n?: unknown;
}

function titlesOf(d: TournamentLike): string[] {
  const out: string[] = [];
  if (typeof d.title === "string") out.push(d.title);
  if (d.titleI18n && typeof d.titleI18n === "object") {
    for (const v of Object.values(d.titleI18n as Record<string, unknown>)) {
      if (typeof v === "string" && v) out.push(v);
    }
  }
  return out;
}

export function classifyTournament(
  id: string,
  d: TournamentLike,
): { verdict: LeftoverVerdict; reasons: string[] } {
  const reasons: string[] = [];
  if (d.e2e === true) reasons.push("e2e 표시");
  if (typeof d.hostUid === "string" && d.hostUid.startsWith(SEED_HOST_PREFIX)) reasons.push("주인 seed-");
  if (KNOWN_TEST_TOURNAMENT_IDS.includes(id) || KNOWN_TEST_ID_PREFIXES.some((p) => id.startsWith(p))) {
    reasons.push("시험 id");
  }
  const titles = titlesOf(d);
  if (titles.some((t) => KNOWN_TEST_TITLES.includes(t.trim()))) reasons.push("시험 제목");
  if (reasons.length > 0) return { verdict: "test", reasons };

  if ([id, ...titles].some((s) => /e2e|test/i.test(s))) {
    return { verdict: "suspect", reasons: ["이름에 e2e·test"] };
  }
  return { verdict: "real", reasons: [] };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 판 단위 문서(`roundProgress` · `bracket_seeds` · `crown_cards` · `tournament_runs`)의 id 는
 * `{uid}_{tid}` (첫 판) 또는 `{uid}_{tid}_r{N}` (2판부터). 그 대회 것인지.
 */
export function isRunScopedDocOf(docId: string, tid: string): boolean {
  return new RegExp(`^[^_]+_${escapeRe(tid)}(_r\\d+)?$`).test(docId);
}

function toMillis(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v instanceof Date) return v.getTime();
  if (v && typeof (v as { toMillis?: unknown }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return null;
}

/** 전역 마무리가 쓸어 낼 대회 — 시험 표시가 있고, 심은 시각을 알고, 2시간이 넘었다. */
export function isStaleE2ETournament(d: TournamentLike, nowMs: number): boolean {
  if (d.e2e !== true) return false;
  const seeded = toMillis(d.e2eSeededAt);
  return seeded !== null && nowMs - seeded > E2E_STALE_AFTER_MS;
}

/** 대회에 딸린 문서 — `tournamentId` 칸으로 찾는 컬렉션. */
export const RELATED_BY_FIELD: readonly string[] = ["contestants", "votes", "roundProgress", "crown_cards"];
/** 대회에 딸린 문서 — 문서 id(`{uid}_{tid}[_rN]`)로 찾는 컬렉션. */
export const RELATED_BY_RUN_ID: readonly string[] = ["roundProgress", "bracket_seeds", "crown_cards", "tournament_runs"];
/** 대회 id 가 곧 문서 id 인 컬렉션. */
export const RELATED_BY_TOURNAMENT_ID: readonly string[] = ["ranking_cache"];

export interface LeftoverRow {
  id: string;
  title: string;
  hostUid: string;
  reasons: string[];
}

/** 정리 스크립트의 표 — 지울 것(test) · 확인할 것(suspect) · 진짜 개수. 진짜 대회는 목록에 싣지 않는다. */
export function planLeftovers(tournaments: { id: string; data: TournamentLike }[]): {
  toDelete: LeftoverRow[];
  toReview: LeftoverRow[];
  realCount: number;
} {
  const toDelete: LeftoverRow[] = [];
  const toReview: LeftoverRow[] = [];
  let realCount = 0;
  for (const { id, data } of tournaments) {
    const { verdict, reasons } = classifyTournament(id, data);
    if (verdict === "real") {
      realCount += 1;
      continue;
    }
    const i18n = (data.titleI18n ?? {}) as Record<string, unknown>;
    const title = typeof data.title === "string" && data.title ? data.title : typeof i18n.ko === "string" ? i18n.ko : "";
    const row = { id, title, hostUid: typeof data.hostUid === "string" ? data.hostUid : "", reasons };
    (verdict === "test" ? toDelete : toReview).push(row);
  }
  return { toDelete, toReview, realCount };
}
