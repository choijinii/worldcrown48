/**
 * 계측 소킥 A (2026-08-30) · 투표 퍼널 공통 헬퍼.
 *
 * marketing/00_strategy/EVENT_SPEC.md가 요구하는 4개 공통 파라미터
 * (is_guest·tournament_id·category·lang)를 이벤트마다 손으로 반복 조립하지
 * 않도록 한곳에 모았다. 이 모듈 자체는 track()/trackWithConsent()를 호출하지
 * 않는다 — 각 호출부가 `trackWithConsent(event, { ...commonEventParams(...), 그
 * 이벤트만의 파라미터 })` 형태로 직접 보낸다.
 */
import type { Tournament } from "@/lib/types/tournament";
import type { RoundIndex } from "@/lib/arena/roundConfig";

export interface CommonEventParams {
  is_guest: boolean;
  tournament_id: string;
  category: string;
  lang: string;
}

/**
 * 4개 공통 파라미터를 한 번에 조립한다.
 * `category`는 TX-0 규칙상 코드에서 "KPOP" 같은 UPPER_SNAKE 문자열이라, 문서
 * 표기(kpop/creator)에 맞춰 소문자로만 바꾼다 — 카테고리 목록 자체를 새로
 * 정의하지 않는다.
 */
export function commonEventParams(
  tournament: Pick<Tournament, "id" | "category">,
  isGuest: boolean,
  lang: string,
): CommonEventParams {
  return {
    is_guest: isGuest,
    tournament_id: tournament.id,
    category: tournament.category.toLowerCase(),
    lang,
  };
}

const ROUND_SIZE: Record<Exclude<RoundIndex, 5>, number> = {
  1: 48,
  2: 24,
  3: 12,
  4: 6,
};

/** round_advance의 round 파라미터 — RoundIndex(1..5) → "48"/"24"/"12"/"6"/"final". */
export function roundParam(round: RoundIndex): string {
  return round === 5 ? "final" : String(ROUND_SIZE[round]);
}

export type EntryPoint = "home" | "share_link" | "news" | "direct";

/**
 * tournament_start의 entry_point — 정확한 유입 경로 판별은 원래 불가능하고,
 * 아래 휴리스틱(추정 규칙)만 적용한다. 100% 정확하지 않다는 걸 알고 쓴다:
 *   1) URL에 utm_medium=share가 있으면 → "share_link" (UTM 소킥에서 붙인 값)
 *   2) 리퍼러 호스트가 우리 도메인과 같으면 → "home" (사이트 내부 클릭 유입)
 *   3) 리퍼러가 아예 없으면 → "direct" (주소 직접 입력 · 북마크 · 앱)
 *   4) 그 외 외부 리퍼러 → "news" (뉴스·블로그 등 외부 링크의 근사 버킷 —
 *      "뉴스"만 정확히 골라내진 못한다)
 */
export function resolveEntryPoint(): EntryPoint {
  if (typeof window === "undefined") return "direct";
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("utm_medium") === "share") return "share_link";
    const ref = document.referrer;
    if (!ref) return "direct";
    const refHost = new URL(ref).host;
    if (refHost === window.location.host) return "home";
    return "news";
  } catch {
    return "direct";
  }
}

const START_KEY_PREFIX = "wc48_tournament_started_at_";

/**
 * tournament_start 시점의 타임스탬프를 sessionStorage에 남긴다 —
 * champion_confirmed의 duration_sec(시작~완주 소요 초) 계산용.
 * 이미 기록돼 있으면 덮어쓰지 않는다(같은 세션 안에서 새로고침해도 시작
 * 시각이 밀리지 않도록).
 */
export function markTournamentStart(tournamentId: string): void {
  if (typeof window === "undefined") return;
  const key = START_KEY_PREFIX + tournamentId;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // sessionStorage 접근 불가(프라이빗 모드 등) — duration_sec은 그냥 생략된다.
  }
}

/** markTournamentStart 이후 지난 초. 기록이 없으면 null(이 경우 duration_sec은 생략). */
export function readTournamentDurationSec(tournamentId: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(START_KEY_PREFIX + tournamentId);
    if (!raw) return null;
    const startedAt = Number(raw);
    if (!Number.isFinite(startedAt)) return null;
    return Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  } catch {
    return null;
  }
}
