/**
 * COOKIE-1 Phase A — 흔적 쿠키(wc48_consent) 왕복.
 *
 * 잡으려는 사고: 값은 `"1.0.<ms>"` 인데 읽을 때 `split(".")` 로 나눠 버전이 `"1"` 이 되어
 * 흔적 쿠키가 한 번도 읽히지 않았다 → 동의한 팬도 매 방문 Firestore 를 다시 보고,
 * 그 조회가 늦거나 실패하면 동의 바가 다시 떴다. 형식은 바꾸지 않는다(R4) — 파싱만.
 *
 * node 환경이라 `document.cookie` 를 흉내 내는 작은 쿠키 통을 심는다.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_VALIDITY_MS,
  CURRENT_POLICY_VERSION,
  clearConsentBreadcrumbCookie,
  parseConsentBreadcrumb,
  readConsentBreadcrumbCookie,
  writeConsentBreadcrumbCookie,
} from "@/lib/cookieConsent";

/** 브라우저처럼 `name=value; attrs` 를 받아 `a=1; b=2` 로 돌려주는 최소 쿠키 통. */
function installCookieJar(): Map<string, string> {
  const jar = new Map<string, string>();
  const fakeDocument = {
    get cookie(): string {
      return Array.from(jar, ([k, v]) => `${k}=${v}`).join("; ");
    },
    set cookie(line: string) {
      const [pair, ...attrs] = line.split(";").map((s) => s.trim());
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      const expires = attrs.find((a) => a.toLowerCase().startsWith("expires="));
      if (expires && new Date(expires.slice(8)).getTime() <= Date.now()) jar.delete(name);
      else jar.set(name, value);
    },
  };
  (globalThis as { document?: unknown }).document = fakeDocument;
  return jar;
}

const SAVED = new Date("2026-10-05T03:00:00Z");
const LATER = new Date("2026-10-06T03:00:00Z");

let jar: Map<string, string>;
beforeEach(() => {
  jar = installCookieJar();
});
afterEach(() => {
  delete (globalThis as { document?: unknown }).document;
});

describe("흔적 쿠키 왕복 (R4 형식 유지)", () => {
  it("쓰기 → 읽기 왕복이 저장 시각을 돌려준다", () => {
    writeConsentBreadcrumbCookie(SAVED);
    expect(readConsentBreadcrumbCookie(LATER)?.getTime()).toBe(SAVED.getTime());
  });

  it("값 형식은 그대로 `<정책 버전>.<ms>` 이다", () => {
    writeConsentBreadcrumbCookie(SAVED);
    expect(jar.get(CONSENT_COOKIE_NAME)).toBe(`${CURRENT_POLICY_VERSION}.${SAVED.getTime()}`);
  });

  it("이미 심어진 `1.0.<ms>` 쿠키를 읽는다 (옛 쿠키 호환)", () => {
    jar.set(CONSENT_COOKIE_NAME, `1.0.${SAVED.getTime()}`);
    expect(readConsentBreadcrumbCookie(LATER)?.getTime()).toBe(SAVED.getTime());
  });

  it("다른 쿠키 사이에 섞여 있어도 읽는다", () => {
    jar.set("_other", "x");
    jar.set(CONSENT_COOKIE_NAME, `1.0.${SAVED.getTime()}`);
    jar.set("zz", "1.2.3");
    expect(readConsentBreadcrumbCookie(LATER)?.getTime()).toBe(SAVED.getTime());
  });

  it("이름이 접두로만 같은 쿠키(xwc48_consent)는 읽지 않는다", () => {
    jar.set(`x${CONSENT_COOKIE_NAME}`, `1.0.${SAVED.getTime()}`);
    expect(readConsentBreadcrumbCookie(LATER)).toBeNull();
  });

  it("지우면 다시 null", () => {
    writeConsentBreadcrumbCookie(SAVED);
    clearConsentBreadcrumbCookie();
    expect(readConsentBreadcrumbCookie(LATER)).toBeNull();
  });
});

describe("parseConsentBreadcrumb", () => {
  it("마지막 점에서 나눈다 — 버전 자체에 점이 있다", () => {
    expect(parseConsentBreadcrumb(`1.0.${SAVED.getTime()}`, LATER)?.getTime()).toBe(SAVED.getTime());
  });

  it("정책 버전이 올라가면 무효 (다시 묻는다)", () => {
    expect(parseConsentBreadcrumb(`1.1.${SAVED.getTime()}`, LATER)).toBeNull();
    expect(parseConsentBreadcrumb(`2.0.${SAVED.getTime()}`, LATER)).toBeNull();
    expect(parseConsentBreadcrumb(`1.${SAVED.getTime()}`, LATER)).toBeNull();
  });

  it("365일이 지나면 무효", () => {
    const expired = new Date(SAVED.getTime() + CONSENT_VALIDITY_MS);
    expect(parseConsentBreadcrumb(`1.0.${SAVED.getTime()}`, expired)).toBeNull();
    const justBefore = new Date(SAVED.getTime() + CONSENT_VALIDITY_MS - 1);
    expect(parseConsentBreadcrumb(`1.0.${SAVED.getTime()}`, justBefore)).not.toBeNull();
  });

  it("날짜로 만들 수 없는 큰 수는 null — Invalid Date 가 모달 날짜 표시를 죽이지 않게", () => {
    expect(parseConsentBreadcrumb("1.0.99999999999999999", LATER)).toBeNull();
  });

  it("지금보다 미래에 저장된 값은 null (조작된 쿠키 — 다시 묻는다)", () => {
    expect(parseConsentBreadcrumb(`1.0.${LATER.getTime() + 60_000}`, LATER)).toBeNull();
    expect(parseConsentBreadcrumb(`1.0.${LATER.getTime()}`, LATER)?.getTime()).toBe(LATER.getTime());
  });

  it("손상된 값은 null", () => {
    for (const raw of ["", "1.0.", "abc", "1.0.NaN", "1.0.12abc", ".123", "1.0.-5"]) {
      expect(parseConsentBreadcrumb(raw, LATER), raw).toBeNull();
    }
  });
});
