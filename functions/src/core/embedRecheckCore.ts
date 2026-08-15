/**
 * embedRecheckCore — 주간 임베드 재검증의 순수 판정 (LAB-EV-1 W7).
 *
 * 링크는 **썩는다**: 권리자가 임베드를 끄고, 영상이 내려가고, 지역 차단이 붙는다.
 * 발행 당시 통과였다는 사실은 다음 주의 재생을 보장하지 않으므로, 살아 있는
 * Tournament의 영상을 주 1회 전수 재검증하고 문제를 문서에 남긴다.
 *
 * 쓰기는 아낀다 — 48칸 × 라이브 대회 수만큼 매주 갱신하면 의미 없는 쓰기가 쌓인다.
 * "지금 문제거나, 문제였다가 나은" 칸만 쓴다(그 외는 상태가 그대로다).
 */
import type { LinkStatus, LinkVerdict, VerdictReason } from "../_embed/verdict";

export interface ContestantEmbedLike {
  id: string;
  tournamentId: string;
  videoId: string;
  /** 문서에 이미 저장된 판정(media.embed.status). 없으면 미검증. */
  storedEmbeddable?: boolean;
}

export interface EmbedStatusUpdate {
  contestantId: string;
  tournamentId: string;
  status: {
    embeddable: boolean;
    status: LinkStatus;
    reasons: VerdictReason[];
    checkedAt: number;
  };
}

export interface TournamentAlert {
  tournamentId: string;
  /** 재생 불가로 판정된 Contestant 수 — Lab 목록의 ⚠️ 배지 근거. */
  failed: number;
  /** 경고(지역·연령·라이브·길이) 수. */
  warned: number;
  checkedAt: number;
}

/** 재검증 대상 id — 중복은 한 번만 묻는다(여러 Contestant가 같은 영상일 수 있다). */
export function collectVideoIds(contestants: ContestantEmbedLike[]): string[] {
  return [...new Set(contestants.map((c) => c.videoId).filter(Boolean))];
}

/**
 * 판정 → 써야 할 갱신 목록. 판정이 없는 Contestant(응답 누락)는 건드리지 않는다 —
 * API 한 번 흔들렸다고 멀쩡한 카드를 차단으로 낙인찍지 않기 위해서다.
 */
export function planRecheckUpdates(
  contestants: ContestantEmbedLike[],
  verdicts: LinkVerdict[],
  checkedAtMs: number,
): EmbedStatusUpdate[] {
  const byId = new Map(verdicts.map((v) => [v.videoId, v]));
  const updates: EmbedStatusUpdate[] = [];

  for (const c of contestants) {
    const verdict = byId.get(c.videoId);
    if (!verdict) continue;

    const embeddable = verdict.status !== "blocked";
    const wasBroken = c.storedEmbeddable === false;
    // 지금 문제이거나, 문제였다가 나은 칸만 쓴다.
    if (embeddable && !wasBroken && verdict.status === "pass") continue;

    updates.push({
      contestantId: c.id,
      tournamentId: c.tournamentId,
      status: {
        embeddable,
        status: verdict.status,
        reasons: verdict.reasons,
        checkedAt: checkedAtMs,
      },
    });
  }

  return updates;
}

/**
 * Tournament별 요약. Lab 목록이 Contestant 48개를 읽지 않고도 ⚠️를 띄우게 하려면
 * 요약이 Tournament 문서에 있어야 한다 — 목록 화면에서의 N+1 읽기를 없애는 값이다.
 */
export function summarizeAlerts(
  contestants: ContestantEmbedLike[],
  verdicts: LinkVerdict[],
  checkedAtMs: number,
): TournamentAlert[] {
  const byId = new Map(verdicts.map((v) => [v.videoId, v]));
  const perTournament = new Map<string, { failed: number; warned: number }>();

  for (const c of contestants) {
    const entry = perTournament.get(c.tournamentId) ?? { failed: 0, warned: 0 };
    const status = byId.get(c.videoId)?.status;
    if (status === "blocked") entry.failed += 1;
    else if (status === "warn") entry.warned += 1;
    perTournament.set(c.tournamentId, entry);
  }

  return [...perTournament.entries()].map(([tournamentId, counts]) => ({
    tournamentId,
    failed: counts.failed,
    warned: counts.warned,
    checkedAt: checkedAtMs,
  }));
}
