/**
 * BETA-PASS-1 — 1차 베타 통과증(지시서 §2-2 · §2-3 · §2-4 · §2-8 · §11 유닛).
 *
 * 통과증 = `<uid>.<만료 ms>.<HMAC-SHA256(uid.만료, BETA_PASS_SECRET) base64url>`.
 * 서명이 틀리거나 · 잘렸거나 · 만료됐거나 · 비밀이 비어 있으면 쿠키 없음과 같다.
 */
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  BETA_COOKIE,
  BETA_PASS_TTL_MS,
  betaCookieString,
  betaPassExpiryMs,
  isKakaoTalkUA,
  signBetaPass,
  verifyBetaPass,
} from "@/lib/launch/betaPass";

const SECRET = "test-secret-0123456789";
const NOW = Date.parse("2026-11-27T00:00:00+09:00");
const DAY = 86_400_000;

describe("signBetaPass · verifyBetaPass", () => {
  it("맞는 서명은 통과", async () => {
    const t = await signBetaPass("uid-1", NOW + DAY, SECRET);
    expect(t.split(".")).toHaveLength(3);
    expect(await verifyBetaPass(t, SECRET, NOW)).toBe(true);
  });

  it("node:crypto HMAC 과 같은 글자를 만든다(함수 쪽과 같은 형식)", async () => {
    const t = await signBetaPass("uid-1", NOW + DAY, SECRET);
    const mac = createHmac("sha256", SECRET).update(`uid-1.${NOW + DAY}`).digest("base64url");
    expect(t).toBe(`uid-1.${NOW + DAY}.${mac}`);
  });

  it("다른 비밀로 만든 서명은 못 통과", async () => {
    const t = await signBetaPass("uid-1", NOW + DAY, "other-secret");
    expect(await verifyBetaPass(t, SECRET, NOW)).toBe(false);
  });

  it("uid 나 만료를 손으로 바꾸면 못 통과", async () => {
    const t = await signBetaPass("uid-1", NOW + DAY, SECRET);
    const [, exp, mac] = t.split(".");
    expect(await verifyBetaPass(`uid-2.${exp}.${mac}`, SECRET, NOW)).toBe(false);
    expect(await verifyBetaPass(`uid-1.${NOW + 30 * DAY}.${mac}`, SECRET, NOW)).toBe(false);
  });

  it("잘린 값 · 아무 값 · 빈 값은 못 통과(던지지 않는다)", async () => {
    const t = await signBetaPass("uid-1", NOW + DAY, SECRET);
    for (const bad of [t.slice(0, -3), "1", "", "a.b", "a.b.c.d", `uid-1.${NOW + DAY}.`, `.${NOW + DAY}.x`, `uid-1.abc.${t.split(".")[2]}`, "uid.1.%%%"]) {
      expect(await verifyBetaPass(bad, SECRET, NOW)).toBe(false);
    }
    expect(await verifyBetaPass(undefined, SECRET, NOW)).toBe(false);
  });

  it("만료가 지나면 못 통과 · 아직이면 통과", async () => {
    const t = await signBetaPass("uid-1", NOW + DAY, SECRET);
    expect(await verifyBetaPass(t, SECRET, NOW + DAY)).toBe(false);
    expect(await verifyBetaPass(t, SECRET, NOW + DAY - 1)).toBe(true);
  });

  it("비밀이 비어 있으면(환경 변수를 아직 안 넣음) 어떤 값도 못 통과", async () => {
    const t = await signBetaPass("uid-1", NOW + DAY, SECRET);
    expect(await verifyBetaPass(t, "", NOW)).toBe(false);
    expect(await verifyBetaPass(t, undefined, NOW)).toBe(false);
  });

  it("빈 비밀로는 만들지 않는다(던진다)", async () => {
    await expect(signBetaPass("uid-1", NOW + DAY, "")).rejects.toThrow();
  });
});

describe("betaPassExpiryMs — 런칭 시각과 지금+14일 중 이른 쪽", () => {
  it("런칭이 14일 안이면 런칭 시각", () => {
    expect(betaPassExpiryMs(NOW, NOW + 5 * DAY)).toBe(NOW + 5 * DAY);
  });
  it("런칭이 14일보다 멀면 지금+14일", () => {
    expect(BETA_PASS_TTL_MS).toBe(14 * DAY);
    expect(betaPassExpiryMs(NOW, NOW + 30 * DAY)).toBe(NOW + 14 * DAY);
  });
  it("런칭 시각이 이미 지난 값(낡은 기본값)이면 버리고 지금+14일", () => {
    expect(betaPassExpiryMs(NOW, NOW - DAY)).toBe(NOW + 14 * DAY);
    expect(betaPassExpiryMs(NOW, NOW)).toBe(NOW + 14 * DAY);
  });
});

describe("betaCookieString", () => {
  it("이름 · Path · Max-Age(만료까지 초) · SameSite=Lax · Secure", () => {
    expect(BETA_COOKIE).toBe("wc48_beta");
    expect(betaCookieString("a.b.c", NOW + 90_500, NOW, true)).toBe(
      "wc48_beta=a.b.c; Path=/; Max-Age=90; SameSite=Lax; Secure",
    );
  });
  it("http(로컬)에서는 Secure 를 붙이지 않는다", () => {
    expect(betaCookieString("a.b.c", NOW + 10_000, NOW, false)).toBe("wc48_beta=a.b.c; Path=/; Max-Age=10; SameSite=Lax");
  });
});

describe("isKakaoTalkUA", () => {
  it("카카오톡 안 브라우저", () => {
    expect(
      isKakaoTalkUA(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.5",
      ),
    ).toBe(true);
    expect(isKakaoTalkUA("Mozilla/5.0 (Linux; Android 14) ... KAKAOTALK/10.4.5")).toBe(true);
  });
  it("그 밖", () => {
    expect(isKakaoTalkUA("Mozilla/5.0 (Macintosh) Chrome/131.0 Safari/537.36")).toBe(false);
    expect(isKakaoTalkUA("")).toBe(false);
    expect(isKakaoTalkUA(undefined)).toBe(false);
    expect(isKakaoTalkUA(null)).toBe(false);
  });
});

describe("함수 쪽(functions/src/core/betaPassCore)과 맞대기", () => {
  it("함수가 만든 통과증을 middleware 검증기가 받아들인다", async () => {
    const { issueBetaPass } = await import("../../../functions/src/core/betaPassCore");
    const r = issueBetaPass({
      auth: { uid: "AbC123xyz", token: { email: "t@example.com", email_verified: true, firebase: { sign_in_provider: "google.com" } } },
      allowlist: ["t@example.com"],
      secret: SECRET,
      nowMs: NOW,
      launchAtMs: NOW + 30 * DAY,
    });
    expect(await verifyBetaPass(r.token, SECRET, NOW)).toBe(true);
    expect(await verifyBetaPass(r.token, "wrong", NOW)).toBe(false);
  });

  it("기본 런칭 시각이 lib/launch/launchAt.ts 와 같다", async () => {
    const { DEFAULT_LAUNCH_AT_MS } = await import("../../../functions/src/core/betaPassCore");
    const { LAUNCH_AT_MS } = await import("@/lib/launch/launchAt");
    expect(DEFAULT_LAUNCH_AT_MS).toBe(LAUNCH_AT_MS);
  });
});
