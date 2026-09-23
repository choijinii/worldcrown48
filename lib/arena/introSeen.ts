/**
 * introSeen — 첫 입장 안내 팝업을 이 기기에서 이미 봤는가 (ARENA-1 PR 2b · 원장 D-13).
 *
 * *기기당 1회* — 매 입장마다 뜨면 선택의 흐름을 해치므로 기기가 기억한다.
 *
 * 저장소를 못 쓰는 환경(사생활 보호 모드·차단·서버 렌더)에서는 **보여 주지 않는다.**
 * 기억할 수 없는 곳에서 계속 띄우면 팬은 매번 팝업을 닫아야 한다 — 한 번 못 보는 쪽이 낫다.
 */

/** 킥 §5 G 에 적힌 키 이름 그대로. */
export const INTRO_SEEN_KEY = "wc48:arena:intro:v1";

/** localStorage 와 같은 모양이면 무엇이든(테스트용 가짜 포함). */
export interface SeenStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export function shouldShowIntro(storage: SeenStorage | null | undefined): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(INTRO_SEEN_KEY) === null;
  } catch {
    return false;
  }
}

export function markIntroSeen(storage: SeenStorage | null | undefined): void {
  if (!storage) return;
  try {
    storage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // 저장이 막힌 기기 — 이번 방문에만 안 뜬 것으로 족하다.
  }
}
