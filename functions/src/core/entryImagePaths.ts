/**
 * entryImagePaths — 엔트리 그림 폴더 이름 (IMAGE-1 PR 2). 캔버스를 부르지 않는 순수 파일이다.
 */
/** 발행 복사가 대회 그림 파일에 남기는 메타데이터 — 그 그림이 온 초안 폴더(삭제 때 함께 지운다). */
export const DRAFT_DIR_META = "draftDir";

export const tournamentImageDir = (tournamentId: string) => `entry-images/tournaments/${tournamentId}/`;

/** uid 는 Firebase 가 정한다(영숫자 · 시험 uid 는 '-' 포함). 초안 id 는 Firestore 자동 id. */
const DRAFT_DIR_RE = /^entry-images\/drafts\/[A-Za-z0-9_-]{1,128}\/[A-Za-z0-9]{1,64}\/$/;

/**
 * 대회 [삭제](D-86) 때 지울 그림 폴더 — 그 대회 폴더 + (남아 있으면) 그 대회를 만든 초안 폴더.
 * 초안 폴더는 발행 때 남긴 메타데이터에서 오므로 꼴이 정확히 맞을 때만 받는다(다른 초안 · 상위 폴더 보호).
 */
export function entryImagePrefixesToDelete(tournamentId: string, draftDir: string | null): string[] {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(tournamentId)) throw new Error("bad tournamentId");
  const out = [tournamentImageDir(tournamentId)];
  if (draftDir && DRAFT_DIR_RE.test(draftDir)) out.push(draftDir);
  return out;
}
