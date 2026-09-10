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
 * 시작 시각 마커의 키 — **회차를 포함한다** (RUN-1 PR 3).
 *
 * 참가 규칙 v2.0 전에는 "사람 × 대회 = 1:1" 이라 대회 id만으로 충분했다. 지금은 한 사람이
 * 같은 대회를 하루 5판까지 돈다. 회차가 빠지면 2판째가 **1판째 시작 시각**을 그대로 물려받아
 * `duration_sec` 이 "1판 시작 ~ 2판 완주"가 된다 — 완주 소요 시간이 통째로 거짓이 된다.
 */
export function tournamentStartKey(
  tournamentId: string,
  runIndex: number,
): string {
  return `${START_KEY_PREFIX}${tournamentId}_r${runIndex}`;
}

/**
 * tournament_start 시점의 타임스탬프를 sessionStorage에 남긴다 —
 * champion_confirmed의 duration_sec(시작~완주 소요 초) 계산용.
 * 이미 기록돼 있으면 덮어쓰지 않는다(같은 세션 안에서 새로고침해도 시작
 * 시각이 밀리지 않도록). 새 판은 키가 달라 새로 기록된다.
 */
export function markTournamentStart(
  tournamentId: string,
  runIndex: number,
): void {
  if (typeof window === "undefined") return;
  const key = tournamentStartKey(tournamentId, runIndex);
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // sessionStorage 접근 불가(프라이빗 모드 등) — duration_sec은 그냥 생략된다.
  }
}

/** markTournamentStart 이후 지난 초. 기록이 없으면 null(이 경우 duration_sec은 생략). */
export function readTournamentDurationSec(
  tournamentId: string,
  runIndex: number,
): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(tournamentStartKey(tournamentId, runIndex));
    if (!raw) return null;
    const startedAt = Number(raw);
    if (!Number.isFinite(startedAt)) return null;
    return Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  } catch {
    return null;
  }
}

const FIRST_VOTE_KEY_PREFIX = "wc48_first_vote_";

/**
 * `first_vote` 의 "이 판에서 이미 쐈는가" 마커 키 (EVENT_SPEC v1.2 ⑩).
 *
 * ⚠️ **회차가 키에 반드시 들어간다.** 빠지면 2판째에 이미 마커가 있어 영영 발화하지 않는다 —
 * 참가 규칙 v2.0(한 대회 하루 5판)에서 판 단위 계측 전체가 1판째만 남는다는 뜻이다.
 */
export function firstVoteKey(tournamentId: string, runIndex: number): string {
  return `${FIRST_VOTE_KEY_PREFIX}${tournamentId}_r${runIndex}`;
}

/**
 * 이 판에서 `first_vote` 를 아직 안 쐈으면 표시하고 `true` 를 준다. 두 번째부터는 `false`.
 *
 * `markTournamentStart` 와 같은 `sessionStorage` 관례다. 새로고침은 같은 세션이라 마커가
 * 남아 재발화하지 않고, 새 판은 키가 달라 다시 발화한다.
 *
 * ⚠️ 탭을 닫았다 다시 연 경우엔 sessionStorage가 비므로 이 마커만으로는 부족하다. 호출부가
 * **"그 판의 기존 선택이 0건"** 이라는 조건을 함께 본다 — 이어하기로 돌아온 판은 이미 선택이
 * 있으므로 그 문에서 걸린다. 두 겹이라야 "판의 첫 선택"이라는 사실과 맞는다.
 *
 * 저장소를 못 쓰면(프라이빗 모드 등) `false` — 중복을 막을 수단이 없으면 안 쏘는 쪽이 안전하다.
 * 판당 1회라는 성질이 깨진 이벤트는 없느니만 못하다.
 */
export function markFirstVote(tournamentId: string, runIndex: number): boolean {
  if (typeof window === "undefined") return false;
  const key = firstVoteKey(tournamentId, runIndex);
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return false;
  }
}

/**
 * 📌 `ceremony_viewed` · `ceremony_skipped` (대관 연출) — **아직 구현 자체가 없다**(ARENA-1이
 * 밀렸다). 이 PR에서 만들지 않는다. 나중에 붙일 때는 새 경로를 파지 말고 여기 헬퍼와
 * `matchSessionId` 를 그대로 써서 다른 판 단위 이벤트와 같은 열쇠로 묶어라.
 */
