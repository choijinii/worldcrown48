/**
 * continueMemo — "선택 이어가기" 알약의 브라우저 메모 (NAV-1 E · 원장 D-18 · 대표 결정 2026-10-11).
 *
 * 왜 브라우저 메모인가: 끝내지 않은 판을 서버의 `roundProgress` 로는 고를 수 없다 — 그 문서는
 * 라운드가 끝날 때에만 써지고(48강 도중에 멈춘 판은 문서가 없다), 문서 id 가 `{uid}_{tid}` 라
 * "가장 최근 끝내지 않은 대결"을 목록으로 찾을 수 없다. Firestore 읽기를 늘리지 않으려고(R7)
 * **매치 화면에서 선택할 때마다 이 브라우저에 대회 id·시각을 적고, 대회를 마치면 지운다.**
 * 알약은 메모만 읽고, 진짜 상태는 그 대결의 매치 화면이 기존 읽기로 정한다(다른 기기에서 이미
 * 끝낸 판이면 완료 화면이 뜨고 메모가 지워진다).
 *
 * 원장 D-18 의 "새 저장소 없음"은 이 결정으로 **"서버 저장소 없음 · 브라우저 메모만"**으로
 * 바뀌었다(대표 2026-10-11). 그래서 같은 기기에서만 이어갈 수 있다 — 알약 설명이 그 사실을 말한다.
 *
 * 메모 읽기·쓰기는 전부 try/catch — 저장소가 막혀도(사생활 보호 창 등) 화면은 깨지지 않는다.
 * 이 파일은 functions 로 복사되지 않는다(copy-run 의 목록 밖 · 브라우저 전용).
 */

export const CONTINUE_MEMO_KEY = "wc48:continue:v1";

/** 기능 스위치 — 알약을 끄려면 false (R7). */
export const CONTINUE_PILL_ENABLED = true;

/**
 * 마지막 선택에서 이만큼 지나면 알약을 숨긴다. 마감이 지나 더는 끝낼 수 없게 된 판이 다른 기기·
 * 다른 길로 정리되지 않아도 알약이 영원히 남지 않게 하는 안전망이다(선택마다 시각이 새로 적힌다).
 */
export const CONTINUE_MEMO_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** 같은 탭 안에서 메모가 바뀌었음을 알약에 알리는 이벤트(storage 이벤트는 다른 탭에만 온다). */
export const CONTINUE_MEMO_EVENT = "wc48:continue-memo";

export interface ContinueMemo {
  tournamentId: string;
  at: number;
}

function defaultStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function announce(): void {
  try {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(CONTINUE_MEMO_EVENT));
  } catch {
    // 알림 실패는 다음 페이지 이동 때 다시 읽으므로 무시한다.
  }
}

export function readContinueMemo(storage: Storage | null = defaultStorage()): ContinueMemo | null {
  try {
    const raw = storage?.getItem(CONTINUE_MEMO_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<ContinueMemo>;
    if (typeof v.tournamentId !== "string" || !v.tournamentId) return null;
    if (typeof v.at !== "number" || !Number.isFinite(v.at)) return null;
    return { tournamentId: v.tournamentId, at: v.at };
  } catch {
    return null;
  }
}

/** 선택이 서버에 받아들여질 때마다 — 이 대회가 "가장 최근 끝내지 않은 대결"이 된다. */
export function noteContinue(tournamentId: string, nowMs: number, storage: Storage | null = defaultStorage()): void {
  try {
    storage?.setItem(CONTINUE_MEMO_KEY, JSON.stringify({ tournamentId, at: nowMs }));
  } catch {
    return;
  }
  announce();
}

/** 그 대회를 마쳤을 때 — 메모가 그 대회일 때만 지운다. */
export function clearContinue(tournamentId: string, storage: Storage | null = defaultStorage()): void {
  try {
    if (readContinueMemo(storage)?.tournamentId !== tournamentId) return;
    storage?.removeItem(CONTINUE_MEMO_KEY);
  } catch {
    return;
  }
  announce();
}

/** 대회를 가리지 않고 지운다 — 로그아웃(공용 기기에서 다음 사람에게 남지 않게). */
export function clearContinueAny(storage: Storage | null = defaultStorage()): void {
  try {
    storage?.removeItem(CONTINUE_MEMO_KEY);
  } catch {
    return;
  }
  announce();
}

/** 알약이 갈 곳. 그 대회의 매치 화면 안에서는 숨긴다(D-18). `null` = 알약도 자리도 없음. */
export function continuePillHref(
  memo: ContinueMemo | null,
  pathname: string,
  nowMs: number,
  enabled: boolean = CONTINUE_PILL_ENABLED,
): string | null {
  if (!enabled || !memo) return null;
  if (nowMs - memo.at > CONTINUE_MEMO_MAX_AGE_MS) return null;
  const href = `/arena/${encodeURIComponent(memo.tournamentId)}`;
  return pathname === href ? null : href;
}
