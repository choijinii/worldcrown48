/**
 * BETA-PASS-1 — 명단 확인 + 통과증 만들기(순수 함수 · 콜러블 betaPass 의 알맹이).
 *
 * 명단 = Firestore `config/betaAllowlist.emails`(관리 SDK 만 읽는다 · 콘솔에서 사람이 넣는다).
 * 통과증 형식은 화면 쪽 lib/launch/betaPass.ts 와 같다 — middleware 가 그쪽 verifyBetaPass 로 확인한다.
 *   `<uid>.<만료 ms>.<HMAC-SHA256("<uid>.<만료 ms>", BETA_PASS_SECRET) base64url>`
 * 메일은 로그에 남기지 않는다.
 */
import { createHmac } from "node:crypto";

/**
 * 콜러블 오류 코드를 실은 오류. firebase-functions 에 기대지 않는다 — 화면 쪽 시험(root vitest · tsc)이
 * 이 파일을 직접 읽어 통과증 형식을 맞대어 보는데, 그쪽에는 functions 의 패키지가 없다. 콜러블이 HttpsError 로 바꾼다.
 */
export class BetaPassError extends Error {
  constructor(public readonly code: "unauthenticated" | "permission-denied" | "internal", message: string) {
    super(message);
    this.name = "BetaPassError";
  }
}

export const BETA_PASS_TTL_MS = 14 * 86_400_000;
/** lib/launch/launchAt.ts LAUNCH_AT_MS 와 같은 값(root 시험이 둘을 맞대어 본다). */
export const DEFAULT_LAUNCH_AT_MS = Date.parse("2026-12-10T00:00:00+09:00");

export interface BetaAuth {
  uid: string;
  token: {
    email?: string;
    email_verified?: boolean;
    firebase?: { sign_in_provider?: string };
  };
}

export function launchAtFromEnv(value: string | undefined): number {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : DEFAULT_LAUNCH_AT_MS;
}

/** 런칭 시각과 지금+14일 중 이른 쪽. 이미 지난 런칭 값(낡은 기본값)은 버린다 — 받자마자 만료를 막는다. */
export function betaPassExpiryMs(nowMs: number, launchAtMs: number): number {
  const ttl = nowMs + BETA_PASS_TTL_MS;
  return launchAtMs > nowMs ? Math.min(launchAtMs, ttl) : ttl;
}

function normalizeList(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter((v): v is string => typeof v === "string").map((v) => v.trim().toLowerCase()).filter(Boolean));
}

export function issueBetaPass(input: {
  auth: BetaAuth | undefined;
  allowlist: unknown;
  secret: string;
  nowMs: number;
  launchAtMs: number;
}): { token: string; expMs: number } {
  const { auth } = input;
  if (!auth || auth.token.firebase?.sign_in_provider === "anonymous") {
    throw new BetaPassError("unauthenticated", "sign-in-required");
  }
  const email = (auth.token.email ?? "").trim().toLowerCase();
  if (!email || auth.token.email_verified !== true || !normalizeList(input.allowlist).has(email)) {
    throw new BetaPassError("permission-denied", "not-on-list");
  }
  if (!input.secret) throw new BetaPassError("internal", "not-configured");
  const expMs = betaPassExpiryMs(input.nowMs, input.launchAtMs);
  const mac = createHmac("sha256", input.secret).update(`${auth.uid}.${expMs}`).digest("base64url");
  return { token: `${auth.uid}.${expMs}.${mac}`, expMs };
}
