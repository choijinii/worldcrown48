/**
 * articleViews — 기사 조회 기록 · 급등 계약 (PITCH-2 PR B · 원장 D-78 후보).
 *
 * 우리 기사 `news/{slug}` 에는 조회 칸 `views` 가 붙는다:
 *   views.total        누적 조회
 *   views.d<YYYYMMDD>  KST 날짜별 조회 — 오늘·어제 두 칸만 남기고 옛 칸은 지운다
 *
 * **급등 = 최근 24시간 조회 증가 = KST 오늘 칸 + 어제 칸의 합.** 0건·동점은 최신 발행순.
 * 누적 조회수 순이 아니다(오래된 기사가 늘 위에 남는다).
 *
 * 쓰기는 콜러블 `recordArticleView` 하나(브라우저는 `news` 에 못 쓴다). 읽기·정렬은 홈(PR A).
 *
 * ⚠️ 이 파일은 `functions/src/_news/` 로 복사되므로(copy-news) import 를 가지지 않는다.
 *    날짜는 늘 KST `YYYY-MM-DD` 글자로 받는다 — 시계는 `lib/run/kstReset` 의 `todayKST` 하나.
 */

export interface ArticleViews {
  total?: number;
  [dayKey: string]: number | undefined;
}

/** KST 날짜(YYYY-MM-DD) → 날짜 칸 이름 `d<YYYYMMDD>`. */
export function viewDayKey(kstDate: string): string {
  return `d${kstDate.replace(/-/g, "")}`;
}

/** KST 날짜 글자의 하루 전 — 날짜 글자만 다루므로 시간대가 끼지 않는다. */
export function previousKstDate(kstDate: string): string {
  const [y, m, d] = kstDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** 급등 점수 = 오늘 칸 + 어제 칸(KST). */
export function trendScore(views: ArticleViews | undefined | null, todayKst: string): number {
  if (!views) return 0;
  return num(views[viewDayKey(todayKst)]) + num(views[viewDayKey(previousKstDate(todayKst))]);
}

/** 오늘·어제가 아닌 날짜 칸 이름들(지울 것). `total` 은 남긴다. */
export function bucketsToPrune(views: ArticleViews | undefined | null, todayKst: string): string[] {
  if (!views) return [];
  const keep = new Set([viewDayKey(todayKst), viewDayKey(previousKstDate(todayKst))]);
  return Object.keys(views).filter((k) => /^d\d{8}$/.test(k) && !keep.has(k));
}

export interface TrendingCandidate {
  publishedAtMs: number | null;
  views?: ArticleViews | null;
}

/** 급등 순 정렬(새 배열). 점수가 같거나 0이면 최신 발행 먼저. */
export function sortTrending<T extends TrendingCandidate>(list: readonly T[], todayKst: string): T[] {
  return [...list].sort(
    (a, b) =>
      trendScore(b.views, todayKst) - trendScore(a.views, todayKst) ||
      (b.publishedAtMs ?? 0) - (a.publishedAtMs ?? 0),
  );
}

/** 콜러블이 받는 기사 주소 이름 — 문서 id 로 쓸 수 있는 짧은 글자만. */
export function isValidArticleSlug(slug: unknown): slug is string {
  return typeof slug === "string" && /^[A-Za-z0-9_-]{1,120}$/.test(slug);
}
