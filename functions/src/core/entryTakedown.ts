/**
 * 엔트리 내리기 판정 — IMAGE-1 PR 3 (원장 D-77 · D-83 · D-93). 순수 · import 없음.
 *
 * 내리기 스위치 하나가 대회 종류(D-90 · 발행 문서 `mediaKind`, 없으면 영상 대회)를 따른다:
 *   · 이미지 대회 — 그 엔트리의 그림 두 장(1600 · 600)을 지우고 `media.image` 를 없앤다
 *   · 영상 대회 — 그 엔트리의 영상 정보를 없앤다(무대 재생 · 유튜브 썸네일 모두 사라진다)
 * 두 경우 모두 엔트리는 대회에 남고 `media = { type, takedown: { at } }` 로 이름 첫 글자 칸이 된다. 되돌리기 없음.
 *
 * 기록(이용약관 5.4 "기록 보관")은 공개 문서가 아니라 관리자 전용 `entry_takedowns/{contestantId}` 에 둔다 —
 * contestants 는 누구나 읽으므로 사유 · 내린 관리자 uid · 출처 주소를 거기 두면 공개된다.
 *
 * 순서(반쪽 상태 없음): 한 트랜잭션에서 기록 + 엔트리 + 대회 신호를 쓰고, 그 뒤 Storage 파일을 지운다.
 * 파일 삭제가 실패해도 화면은 이미 이니셜이고, 다시 부르면 기록의 경로로 마저 지운다(already).
 */

export const ENTRY_TAKEDOWN_ERROR_CODES = {
  NOT_FOUND: "not_found",
  WRONG_TOURNAMENT: "wrong_tournament",
  REASON_REQUIRED: "reason_required",
} as const;
export type EntryTakedownErrorCode = (typeof ENTRY_TAKEDOWN_ERROR_CODES)[keyof typeof ENTRY_TAKEDOWN_ERROR_CODES];
const CODES = ENTRY_TAKEDOWN_ERROR_CODES;

/** 사유 글자 수 상한(기록용 · 화면 칸과 같은 값). */
export const MAX_REASON_LENGTH = 300;

export interface TakedownRecordData {
  tournamentId: string;
  contestantId: string;
  name: string;
  mediaKind: "image" | "video";
  atMs: number;
  reason: string;
  byUid: string;
  /** 그림 대회 — 내부 대응용으로만 보관(화면에 쓰지 않음). */
  sourceUrl?: string;
  sourcePage?: string;
  storagePath?: string;
  /** 영상 대회 — 내린 영상. */
  videoId?: string;
  videoSourceUrl?: string;
}

export type TakedownPlan =
  | { ok: false; code: EntryTakedownErrorCode }
  | { ok: true; already: true; storagePaths: string[] }
  | {
      ok: true;
      already: false;
      media: { type: string; takedown: { at: number } };
      record: TakedownRecordData;
      storagePaths: string[];
    };

type Data = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** 지울 파일 — 그 대회 폴더 바로 아래의 `{n}.jpg` 와 600 사본뿐. 그 밖의 경로는 빈 목록. */
export function takedownStoragePaths(tournamentId: string, storagePath: unknown): string[] {
  const p = str(storagePath);
  const prefix = `entry-images/tournaments/${tournamentId}/`;
  if (!p.startsWith(prefix)) return [];
  const file = p.slice(prefix.length);
  if (!/^[A-Za-z0-9_-]+\.jpg$/.test(file) || /_600\.jpg$/.test(file)) return [];
  return [p, p.replace(/\.jpg$/, "_600.jpg")];
}

export function planTakedown(input: {
  tournamentId: string;
  contestantId: string;
  reason: unknown;
  byUid: string;
  nowMs: number;
  tournament: Data | null;
  contestant: Data | null;
  existingRecord: Data | null;
}): TakedownPlan {
  const { tournamentId, contestantId, tournament, contestant } = input;
  if (!tournament || !contestant) return { ok: false, code: CODES.NOT_FOUND };
  if (str(contestant.tournamentId) !== tournamentId) return { ok: false, code: CODES.WRONG_TOURNAMENT };

  const media = (contestant.media ?? null) as Data | null;
  if (media?.takedown) {
    return {
      ok: true,
      already: true,
      storagePaths: takedownStoragePaths(tournamentId, input.existingRecord?.storagePath),
    };
  }

  const reason = str(input.reason).trim();
  if (!reason || reason.length > MAX_REASON_LENGTH) return { ok: false, code: CODES.REASON_REQUIRED };

  const mediaKind = tournament.mediaKind === "image" ? "image" : "video";
  const image = (media?.image ?? null) as Data | null;
  const embed = (media?.embed ?? null) as Data | null;
  const record: TakedownRecordData = {
    tournamentId,
    contestantId,
    name: str(contestant.name),
    mediaKind,
    atMs: input.nowMs,
    reason,
    byUid: input.byUid,
  };
  if (image) {
    if (str(image.sourceUrl)) record.sourceUrl = str(image.sourceUrl);
    if (str(image.sourcePage)) record.sourcePage = str(image.sourcePage);
    if (str(image.storagePath)) record.storagePath = str(image.storagePath);
  }
  if (embed) {
    if (str(embed.videoId)) record.videoId = str(embed.videoId);
    if (str(embed.sourceUrl)) record.videoSourceUrl = str(embed.sourceUrl);
  }
  const type = str(media?.type) || (mediaKind === "image" ? "image" : "embed");
  return {
    ok: true,
    already: false,
    media: { type, takedown: { at: input.nowMs } },
    record,
    storagePaths: takedownStoragePaths(tournamentId, image?.storagePath),
  };
}
