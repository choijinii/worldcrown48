/**
 * lib/ranking — type contract for the C-3 ranking cache + anomaly detection.
 *
 * IMPORT-FREE BY DESIGN: this module references neither the firebase client SDK
 * nor firebase-admin. The pure rank/anomaly logic is mirrored into
 * `functions/src/_ranking` by `functions/scripts/copy-ranking.mjs` at build time
 * (same single-source pattern as copy-crown — handoff §3 "중복 구현 금지"), and
 * the functions package cannot import the `firebase/firestore` client `Timestamp`.
 * So persisted timestamp fields use the structural {@link TimestampLike} below,
 * which BOTH the admin and client `Timestamp` satisfy structurally.
 *
 * Vote Count rule (CLAUDE.md 원칙 #8): `voteCount` is INTERNAL only. It feeds the
 * cron's rate math / T-3 growth / admin alert detail — it is NEVER rendered.
 */

export type AnomalyTag = "T-1" | "T-2" | "T-3" | "T-4";

/** A single contestant's ranking row (denormalized — no contestants join at UI). */
export interface RankingEntry {
  /** 1-based rank. Ties share a rank, the next rank is skipped (1·1·3). */
  rank: number;
  contestantId: string;
  /** Tournament-time denormalization so the UI needs no contestants read. */
  name: string;
  /**
   * 아바타의 재료 — 유튜브 videoId. 완성된 URL이 아니라 id를 싣는다: 썸네일 주소
   * 템플릿이 한 곳(buildThumbnailUrl)에만 있어야 캐시와 화면이 갈라지지 않는다.
   * LAB-UX-1 PR-2에서 `imageUrl`을 대체했다(실데이터 0건이라 마이그레이션 없음).
   */
  videoId: string | null;
  /**
   * INTERNAL ONLY — NEVER render (Vote Count 금지). Used by the cron for rate
   * math, T-3 growth, and admin_alerts detail.
   */
  voteCount: number;
  /** 1-decimal percent share of totalVotes. e.g. 33.3 → rendered "33.3%". */
  rate: number;
}

/**
 * 차트 한 줄 — Crown Score v1.0 (정본 `marketing/00_strategy/CROWN_SCORE_v1.0.md`).
 *
 * 화면은 `crownScore` 정수 하나만 그린다(대표 2026-09-24). 세 비율은 **저장만** 한다 —
 * 런칭 후 세부 분석 페이지의 재료다. `voteCount`·`rate` 는 옛 필드 그대로 남는데, 지워서는
 * 안 된다: 이상 징후(T-1~T-4)가 지금처럼 **rate 순 목록**으로 판정하는 근거가 이 둘이다.
 */
export interface CrownRankingEntry extends RankingEntry {
  /** 0~1000 정수. 차트 정렬 기준이자 화면에 나가는 유일한 수치. */
  crownScore: number;
  /** 순위점수율 (0~1) — 저장 전용. */
  placementRate: number;
  /** 우승율 (0~1) — 저장 전용. */
  winRate: number;
  /** 점유율 (0~1) — 저장 전용. 정본의 점유율은 옛 `rate` 와 **분모가 다르다.** */
  shareRate: number;
}

/**
 * Timestamp-free core shape consumed by the pure rank/anomaly functions.
 * `RankingCache` extends it with the persisted timestamps; the pure logic only
 * touches `rankings` / `generationSequence`, so it operates on this narrow type.
 */
export interface RankingSnapshot {
  tournamentId: string;
  /** 1위~N위. voteCount === 0 contestants are EXCLUDED. */
  rankings: RankingEntry[];
  /** INTERNAL ONLY — UI never renders. T-1/T-2 rate-share verification. */
  totalVotes: number;
  /** 0-based, +1 per cron run. T-24 compares (seq-24), T-1h compares (seq-1). */
  generationSequence: number;
}

/**
 * Structural timestamp — satisfied by firebase-admin AND firebase client
 * `Timestamp` alike. Keeps shared pure code free of any SDK import.
 */
export interface TimestampLike {
  toMillis(): number;
  toDate(): Date;
}

/**
 * Persisted `ranking_cache/{tournamentId}` document (UI subscribes via onSnapshot).
 *
 * PURE VOTER DATA ONLY (ADR-0006 amendment, 2026-06-26 / W-2): rankings + meta.
 * It carries NO anomaly signal — a legitimate ≥60% popular #1 must never read as
 * an "이상 징후" on the Voter surface. Anomaly tags/details live ONLY in the
 * admin-only `admin_alerts` collection ({@link AdminAlert}).
 */
export interface RankingCache extends RankingSnapshot {
  /** 차트 목록 — Crown Score 순 (정본 §0). */
  rankings: CrownRankingEntry[];
  /**
   * 대회 전체 완주 판수(게스트 판 제외) — 10판 기준이 읽는 값 (정본 §5).
   *
   * **판수 자체는 화면에 그리지 않는다.** 화면은 이 값으로 "점수를 보여 줄 때가 됐는가"만
   * 판정한다. ARENA-1 PR 3 이전에 쓰인 문서에는 이 필드가 없다 → 화면은 `?? 0` 으로 읽어
   * 기다림 안내를 보여 준다(다음 발표가 채운다).
   */
  runsTotal: number;
  generatedAt: TimestampLike;
  /** Previous generation time. First run is null. */
  previousGeneratedAt: TimestampLike | null;
}

/** Per-contestant tally fed into {@link computeRankings} (one per >0-vote contestant). */
export interface ContestantTally {
  contestantId: string;
  name: string;
  videoId: string | null;
  voteCount: number;
}

/** `admin_alerts/{alertId}` — created by the cron when an anomaly fires. */
export interface AdminAlert {
  type: AnomalyTag;
  tournamentId: string;
  /** One-line for the Admin Dashboard — wireframe line 767 pattern. */
  detail: string;
  createdAt: TimestampLike;
  /** Set true once the operator handles it. */
  resolved: boolean;
}
