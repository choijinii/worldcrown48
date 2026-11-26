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
 * 쓰는 순서(`rankingCacheWrite.writeCacheFromAccum`): 서버 전용 기준선 → 이 사진 → 공개 캐시. 사진 쓰기가
 * 실패하면 캐시 세대 번호가 오르지 않아 다음 실행이 같은 번호로 다시 쓴다(빈 번호 없음).
 *
 * ⚠️ **공개 캐시 문서 `ranking_cache/{tid}` 를 지우면 안 된다.** 세대 번호(seq)는 그 문서의
 * `generationSequence` + 1 로 정해진다. 문서가 없어지면 seq 가 0 부터 다시 시작하고, 이미 있는
 * `gens/0`, `gens/1` … 이 새 값으로 **조용히 덮여** 영구 보관본이 사라진다. 지금 실서비스 코드에는
 * 대회가 살아 있는 채 공개 캐시를 지우는 길이 없다(시드 · e2e 스크립트만 지운다). 새로 만들지 말 것.
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
