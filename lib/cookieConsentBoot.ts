/**
 * cookieConsentBoot — 쿠키 동의 부품이 첫 화면에서 무엇을 할지 정하는 순수 함수 (ANON-1).
 *
 * 2026-10-04 대표 결정(제안 1): **익명 계정은 쿠키 동의 버튼을 누를 때 만든다.**
 * 그래서 첫 화면 판단은 "이미 있는 사용자"만 보고, 사용자가 없으면 계정을 만들지 않고
 * 곧바로 동의 바를 보여 준다.
 *
 *   흔적 쿠키 있음(이미 동의함)        → "hide-by-cookie"  (아무것도 읽지 않음)
 *   흔적 쿠키 없음 + 기존 사용자 있음  → "check-firestore" (그 사용자의 동의 기록 확인)
 *   흔적 쿠키 없음 + 사용자 없음       → "show-banner"     (첫 방문 — 계정 만들지 않음)
 *
 * 이 함수가 정하지 않는 것: 동의 문구 · 동의 바 배치(COOKIE-1 범위) · 저장할 때의 uid
 * (저장 순간 lib/firebase.ts 의 익명 계정 함수로 정한다 — 로그인 사용자면 그 사람, 아니면 그때 익명 계정 생성).
 */
import type { CookieConsentDoc } from "@/lib/cookieConsent";

export type ConsentBootAction = "hide-by-cookie" | "check-firestore" | "show-banner";

export function planConsentBoot(input: {
  cookieSavedAt: Date | null;
  existingUid: string | null;
}): ConsentBootAction {
  if (input.cookieSavedAt) return "hide-by-cookie";
  if (input.existingUid) return "check-firestore";
  return "show-banner";
}

/**
 * 첫 화면 순서 전체 (COOKIE-1 · lib/__tests__/policy/consentBoot.test.ts).
 *
 * F-1 (대표 승인 2026-10-05): 흔적 쿠키에는 카테고리 선택이 없다. 그래서 흔적이 있으면 동의 바는
 * **바로 숨기고**(위 planConsentBoot 의 "hide-by-cookie"), 그 뒤 **이미 있는 사용자**일 때만
 * 동의 기록을 읽어 카테고리를 되살린다 — 그래야 돌아온 팬의 분석 동의가 이어진다.
 * 계정은 만들지 않는다(D-41: getExistingUid 는 조회만). 사용자가 없거나 읽기에 실패하면
 * 분석은 꺼진 채로 둔다(R2 — 모르면 동의 없음).
 */
export async function runConsentBoot(
  deps: {
    cookieSavedAt: Date | null;
    /** 이미 있는 사용자의 uid — 없으면 null. 절대 계정을 만들지 않는다. */
    getExistingUid: () => Promise<string | null>;
    loadConsent: (uid: string) => Promise<CookieConsentDoc | null>;
    /**
     * 이 세션에서 팬이 동의 버튼(다시 열기 · 필수만 · 모두 허용 · 저장)을 눌렀는가.
     * 누른 뒤에 도착한 부팅 결과는 버린다 — 옛 기록이 새 선택을 덮지 않게(검수 1 · R2).
     */
    userActed?: () => boolean;
  },
  on: {
    hideBanner: (savedAt: Date | null) => void;
    showBanner: () => void;
    applyRecord: (record: CookieConsentDoc) => void;
  },
): Promise<void> {
  const { cookieSavedAt } = deps;
  const stale = () => deps.userActed?.() === true;
  const byCookie = planConsentBoot({ cookieSavedAt, existingUid: null }) === "hide-by-cookie";
  if (byCookie) on.hideBanner(cookieSavedAt);

  let uid: string | null = null;
  try {
    uid = await deps.getExistingUid();
  } catch {
    uid = null;
  }
  if (stale()) return;
  if (!uid) {
    // 첫 방문(사용자 없음) — 계정을 만들지 않고 동의 바. 흔적이 있으면 숨긴 채(분석 꺼짐).
    if (!byCookie) on.showBanner();
    return;
  }

  let record: CookieConsentDoc | null = null;
  try {
    record = await deps.loadConsent(uid);
  } catch {
    record = null; // 읽기 실패 = 기록 없음으로 본다
  }
  if (stale()) return; // 읽는 사이 팬이 직접 골랐다 — 늦은 기록은 버린다

  if (record) {
    on.applyRecord(record);
    if (!byCookie) on.hideBanner(null);
  } else if (!byCookie) {
    on.showBanner();
  }
}
