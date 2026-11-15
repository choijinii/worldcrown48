/**
 * 편집기 그림 확인 창 — 링크 버튼 숨김 규칙 (IMAGE-1 PR 3 · 원장 D-92). 순수.
 *
 * 운영자가 그림이 그 엔트리가 맞는지 출처에서 바로 확인하는 창이다. 관리자 편집기 안이라 링크를 둔다 —
 * D-77 "출처는 무대에 도메인 글자만(링크 없음)"은 팬이 보는 매치 무대 규칙이고, 무대는 바꾸지 않는다.
 */
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

function httpUrl(v: string | undefined): string | undefined {
  if (!v) return undefined;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? v : undefined;
  } catch {
    return undefined;
  }
}

/** [출처 페이지 열기 ↗] = sourcePage · [원본 그림 열기 ↗] = sourceUrl — 없으면 그 버튼을 숨긴다. */
export function imageCheckLinks(c: Pick<ContestantDraft, "imageSource">): { sourcePage?: string; sourceUrl?: string } {
  const page = httpUrl(c.imageSource?.sourcePage);
  const url = httpUrl(c.imageSource?.sourceUrl);
  return { ...(page ? { sourcePage: page } : {}), ...(url ? { sourceUrl: url } : {}) };
}
