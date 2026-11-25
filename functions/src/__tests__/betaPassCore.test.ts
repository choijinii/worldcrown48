/**
 * BETA-PASS-1 — 명단 확인 + 통과증 만들기(지시서 §2-2 · §11 통합 목록을 순수 함수로).
 * 명단 안 · 밖 · 익명 · 미인증 메일 · 대소문자 다른 메일 · 만료 계산 · 서명 형식.
 */
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { HttpsError } from "firebase-functions/v2/https";
import { BETA_PASS_TTL_MS, issueBetaPass, launchAtFromEnv, DEFAULT_LAUNCH_AT_MS, type BetaAuth } from "../core/betaPassCore";

const SECRET = "s3cret-for-tests";
const NOW = Date.parse("2026-11-27T00:00:00+09:00");
const DAY = 86_400_000;
const LIST = ["Tester@Gmail.com", " daepyo@example.com "];

function google(email: string, verified = true, uid = "u1"): BetaAuth {
  return { uid, token: { email, email_verified: verified, firebase: { sign_in_provider: "google.com" } } };
}

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof HttpsError) return e.code;
    throw e;
  }
  return "(did-not-throw)";
}

const base = { allowlist: LIST, secret: SECRET, nowMs: NOW, launchAtMs: NOW + 30 * DAY };

describe("issueBetaPass", () => {
  it("명단 안(대소문자 · 공백 달라도) → 서명된 통과증", () => {
    const r = issueBetaPass({ ...base, auth: google("tester@gmail.com") });
    expect(r.expMs).toBe(NOW + BETA_PASS_TTL_MS);
    const mac = createHmac("sha256", SECRET).update(`u1.${r.expMs}`).digest("base64url");
    expect(r.token).toBe(`u1.${r.expMs}.${mac}`);
    expect(issueBetaPass({ ...base, auth: google("DAEPYO@EXAMPLE.COM") }).token).toMatch(/^u1\./);
  });

  it("명단 밖 → permission-denied", () => {
    expect(codeOf(() => issueBetaPass({ ...base, auth: google("stranger@gmail.com") }))).toBe("permission-denied");
  });

  it("미인증 메일 → permission-denied", () => {
    expect(codeOf(() => issueBetaPass({ ...base, auth: google("tester@gmail.com", false) }))).toBe("permission-denied");
  });

  it("로그인 없음 · 익명 → unauthenticated", () => {
    expect(codeOf(() => issueBetaPass({ ...base, auth: undefined }))).toBe("unauthenticated");
    expect(
      codeOf(() => issueBetaPass({ ...base, auth: { uid: "a", token: { firebase: { sign_in_provider: "anonymous" } } } })),
    ).toBe("unauthenticated");
  });

  it("메일 칸이 없는 계정 → permission-denied", () => {
    expect(codeOf(() => issueBetaPass({ ...base, auth: { uid: "x", token: { firebase: { sign_in_provider: "google.com" } } } }))).toBe(
      "permission-denied",
    );
  });

  it("명단 문서가 없거나 모양이 틀리면 아무도 못 들어간다", () => {
    for (const allowlist of [undefined, null, "tester@gmail.com", [1, 2], {}]) {
      expect(codeOf(() => issueBetaPass({ ...base, allowlist, auth: google("tester@gmail.com") }))).toBe("permission-denied");
    }
  });

  it("비밀이 비어 있으면 internal(서버 설정 문제)", () => {
    expect(codeOf(() => issueBetaPass({ ...base, secret: "", auth: google("tester@gmail.com") }))).toBe("internal");
  });

  it("만료 = 런칭과 14일 중 이른 쪽 · 지난 런칭 값은 버림", () => {
    expect(issueBetaPass({ ...base, launchAtMs: NOW + 3 * DAY, auth: google("tester@gmail.com") }).expMs).toBe(NOW + 3 * DAY);
    expect(issueBetaPass({ ...base, launchAtMs: NOW - DAY, auth: google("tester@gmail.com") }).expMs).toBe(NOW + 14 * DAY);
  });
});

describe("launchAtFromEnv", () => {
  it("값이 읽히면 그 시각 · 아니면 기본값", () => {
    expect(launchAtFromEnv("2026-12-09T15:00:00Z")).toBe(Date.parse("2026-12-09T15:00:00Z"));
    expect(launchAtFromEnv(undefined)).toBe(DEFAULT_LAUNCH_AT_MS);
    expect(launchAtFromEnv("not a date")).toBe(DEFAULT_LAUNCH_AT_MS);
  });
});
