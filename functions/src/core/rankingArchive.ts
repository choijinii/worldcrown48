/**
 * rankingArchive — 차트 사진 영구 보관 (T5 PR 2 · 대표 확정 2026-11-25).
 *
 * 발표마다 그 순간의 차트를 `ranking_archive/{tid}/gens/{seq}` 한 문서로 남긴다. 같은 번호를 다시 쓰면
 * 덮어쓴다(다시 돌려도 같다). **지우는 코드는 어디에도 없다** — 대회 삭제(`removeTournament`)도 건드리지
 * 않는다. 규칙은 읽기 · 쓰기 모두 막는다(Admin SDK 만).
 *
 * 행은 공개 차트 행에서 **정해 둔 키만** 옮긴다. 영상 · 그림 주소(videoId · imageUrl)는 싣지 않는다 —
 * 내리기 스위치(D-93)로 화면에서 내린 미디어가 영구 보관본에 남으면 안 된다. 선택 수 · 비율도 싣지 않는다.
 *
 * 이 파일은 타입만 가져온다(firebase-functions 를 끌어오지 않는다).
 */
import type { PublicRankingEntry } from "../_ranking/publicEntry";
import type { NameI18n } from "../_ranking/rankingTypes";

export const ARCHIVE = "ranking_archive";

export interface ArchiveRow {
  rank: number;
  contestantId: string;
  name: string;
  nameI18n?: NameI18n;
  crownScore: number;
  placementRate: number;
  winRate: number;
  shareRate: number;
}

export interface ArchiveDoc {
  tournamentId: string;
  seq: number;
  generatedAtMs: number;
  runsTotal: number;
  rows: ArchiveRow[];
}

function toArchiveRow(e: PublicRankingEntry): ArchiveRow {
  const row: ArchiveRow = {
    rank: e.rank,
    contestantId: e.contestantId,
    name: e.name,
    crownScore: e.crownScore,
    placementRate: e.placementRate,
    winRate: e.winRate,
    shareRate: e.shareRate,
  };
  if (e.nameI18n) row.nameI18n = e.nameI18n;
  return row;
}

export function toArchiveDoc(
  cache: { tournamentId: string; generationSequence: number; runsTotal: number; rankings: PublicRankingEntry[] },
  generatedAtMs: number,
): ArchiveDoc {
  return {
    tournamentId: cache.tournamentId,
    seq: cache.generationSequence,
    generatedAtMs,
    runsTotal: cache.runsTotal,
    rows: cache.rankings.map(toArchiveRow),
  };
}
