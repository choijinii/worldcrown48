/**
 * splitAround — 번역문 한가운데의 한 조각만 다르게 그리기 위한 자리 가르기 (ARENA-1 PR 2a).
 *
 * 라운드 전환의 "방금 마친 라운드 **ROUND OF 24**" 처럼, 문장은 3언어 키에 통째로 두고
 * (승인 문구를 한 곳에 박제) 라운드 이름만 굵게 그려야 하는 자리가 있다. 문장을 조각으로
 * 쪼개 키를 여러 개 만들면 승인본이 흩어지고 어순이 다른 언어에서 깨진다.
 *
 * 그래서 번역을 한 번 그린 뒤(자리표시자에 절대 안 쓰는 글자를 넣고) 그 글자로 가른다.
 * 자리표시자가 없으면 문장 전체를 앞조각으로 돌려준다 — 굵은 조각만 사라지고 문장은 산다.
 */

/** 어떤 문구에도 등장하지 않는 제어문자. 번역문에 섞일 수 없어 가르는 표시로 안전하다. */
export const SPLIT_SENTINEL = "\u0000";

export function splitAround(rendered: string, sentinel: string = SPLIT_SENTINEL): [string, string] {
  const at = rendered.indexOf(sentinel);
  if (at === -1) return [rendered, ""];
  return [rendered.slice(0, at), rendered.slice(at + sentinel.length)];
}
