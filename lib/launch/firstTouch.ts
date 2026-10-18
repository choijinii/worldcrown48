/**
 * firstTouch — 처음 들어온 경로(UTM) 기억 (PRE-REG-1 · 원장 D-53).
 *
 * 사이트 어느 페이지로 들어오든 주소의 `utm_*` 를 읽어 두었다가, 사전등록 때 등록 함수와
 * `waitlist_submit` 이벤트에 붙인다. 사전등록까지 며칠 걸린 팬도 어느 링크로 왔는지 알기 위해.
 * 이미 기억한 값은 덮지 않는다 — "처음" 들어온 경로.
 *
 * 동의(대표 결정 ① · COOKIE-1 "통계는 분석 동의 뒤로"):
 *   · 분석 쿠키에 동의한 팬만 브라우저(localStorage `wc48_utm`)에 **7일** 기억한다.
 *   · 동의하지 않은 팬은 메모리 변수에만 둔다 — 새로고침·탭 닫기면 사라진다. 그 방문 안에서
 *     등록할 때만 경로를 붙인다. 예전에 기억한 값도 동의 없이는 읽지 않는다.
 *   · 방문 중에 동의하면 그때부터 지금 방문의 경로를 7일 기억으로 옮긴다. 동의를 거두면 지운다.
 *   *방문* = 같은 탭에서 새로고침 없이 사이트 안을 옮겨 다니는 동안(= 이 모듈의 메모리 수명).
 *
 * 동의 여부는 부르는 쪽이 COOKIE-1 의 useAnalyticsConsent() 로 읽어 넘긴다 — 여기서 판단하지 않는다.
 * 저장 키 이름은 UTM_RULES v1.0 §3 예시 그대로(`wc48_utm`).
 */

export const FIRST_TOUCH_KEY = "wc48_utm";
/** 보관 기간 7일 (8/31 대표). 등록 기록 자체의 보관 기간은 정하지 않는다. */
export const FIRST_TOUCH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const UTM_KEYS = ["source", "medium", "campaign", "content", "term"] as const;
type UtmKey = (typeof UTM_KEYS)[number];
export type Utm = Partial<Record<UtmKey, string>>;
/** 서버(functions/src/core/waitlistCore sanitizeUtm)와 같은 상한. */
const UTM_VALUE_MAX = 100;

/** localStorage 와 같은 모양이면 무엇이든(시험용 가짜 포함). */
export interface TouchStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export function parseUtm(search: string): Utm | null {
  const params = new URLSearchParams(search);
  const out: Utm = {};
  for (const key of UTM_KEYS) {
    const v = params.get(`utm_${key}`)?.trim().slice(0, UTM_VALUE_MAX);
    if (v) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** `waitlist_submit` 에 붙이는 이름 — 세션 소스(GA 자동)와 헷갈리지 않게 first_utm_*. */
export function firstTouchEventParams(utm: Utm | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!utm) return out;
  for (const key of UTM_KEYS) if (utm[key]) out[`first_utm_${key}`] = utm[key]!;
  return out;
}

export interface FirstTouch {
  /** 페이지(주소)를 볼 때마다 — 이 방문의 처음 경로를 잡고, 동의했으면 기억으로 옮긴다. */
  observe(search: string, now: number, consent: boolean): void;
  /** 분석 동의가 바뀌었을 때 — 주면 지금 방문 경로를 기억으로, 거두면 기억을 지운다. */
  consentChanged(granted: boolean, now: number): void;
  /** 등록 때 붙일 경로. 동의 = 기억한 값(없으면 이 방문) · 동의 없음 = 이 방문만. */
  current(now: number, consent: boolean): Utm | null;
}

export function createFirstTouch(getStorage: () => TouchStorage | null): FirstTouch {
  let visit: Utm | null = null;

  const storage = (): TouchStorage | null => {
    try {
      return getStorage();
    } catch {
      return null;
    }
  };

  function readStored(now: number): Utm | null {
    const s = storage();
    if (!s) return null;
    try {
      const raw = s.getItem(FIRST_TOUCH_KEY);
      if (raw === null) return null;
      const parsed = JSON.parse(raw) as { utm?: unknown; savedAt?: unknown };
      const fresh = typeof parsed.savedAt === "number" && now - parsed.savedAt < FIRST_TOUCH_TTL_MS;
      const utm = parsed.utm && typeof parsed.utm === "object" ? (parsed.utm as Utm) : null;
      if (fresh && utm && Object.keys(utm).length > 0) return utm;
      s.removeItem(FIRST_TOUCH_KEY);
      return null;
    } catch {
      try {
        s.removeItem(FIRST_TOUCH_KEY);
      } catch {
        // 저장소가 막힌 기기 — 메모리로 족하다.
      }
      return null;
    }
  }

  function persist(now: number): void {
    if (!visit || readStored(now)) return;
    try {
      storage()?.setItem(FIRST_TOUCH_KEY, JSON.stringify({ utm: visit, savedAt: now }));
    } catch {
      // 저장이 막힌 기기 — 이번 방문 메모리만으로 등록에 붙는다.
    }
  }

  return {
    observe(search, now, consent) {
      if (!visit) visit = parseUtm(search);
      if (consent) persist(now);
    },
    consentChanged(granted, now) {
      if (granted) {
        persist(now);
        return;
      }
      try {
        storage()?.removeItem(FIRST_TOUCH_KEY);
      } catch {
        // 지울 수 없는 저장소 — 동의 없이는 어차피 읽지 않는다.
      }
    },
    current(now, consent) {
      return consent ? readStored(now) ?? visit : visit;
    },
  };
}

function browserStorage(): TouchStorage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

/** 탭 하나에 하나 — 모듈 수명 = 방문. */
export const firstTouch: FirstTouch = createFirstTouch(browserStorage);
