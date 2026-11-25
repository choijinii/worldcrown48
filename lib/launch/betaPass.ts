/**
 * 1차 베타 통과증 (BETA-PASS-1 · 대표 결정 2026-11-24 "명단 로그인 통과").
 *
 * 커튼(curtain.ts)을 지나는 길은 "명단에 있는 구글 계정으로 로그인"뿐이다. 명단 확인은 서버 함수
 * `betaPass` 가 하고, 통과하면 서명된 통과증을 돌려준다. 화면이 그것을 쿠키 `wc48_beta` 로 심고,
 * middleware 가 서명 · 만료를 확인한다(Edge 에서 도는 Web Crypto). 서명 없는 `=1` 같은 값은 누구나
 * 손으로 심을 수 있어서 쓰지 않는다.
 *
 *   통과증 = `<uid>.<만료 ms>.<HMAC-SHA256("<uid>.<만료 ms>", BETA_PASS_SECRET) base64url>`
 *
 * 함수 쪽(functions/src/core/betaPassCore.ts)은 같은 글자를 node:crypto 로 만든다 — 같은 형식인지는
 * 시험이 서로의 결과를 맞대어 본다.
 */

export const BETA_COOKIE = "wc48_beta";
export const BETA_PASS_TTL_MS = 14 * 86_400_000;

const TOKEN_RE = /^([A-Za-z0-9_-]{1,128})\.(\d{1,16})\.([A-Za-z0-9_-]{43})$/;

/**
 * 만료 = 런칭 시각과 지금+14일 중 이른 쪽. 런칭 시각이 이미 지난 값이면(코드 기본값이 낡은 경우 —
 * 커튼은 Vercel 의 LAUNCH_AT 을 따로 본다) 버리고 지금+14일. 받자마자 만료되는 통과증을 막는다.
 */
export function betaPassExpiryMs(nowMs: number, launchAtMs: number): number {
  const ttl = nowMs + BETA_PASS_TTL_MS;
  return launchAtMs > nowMs ? Math.min(launchAtMs, ttl) : ttl;
}

function base64url(bytes: ArrayBuffer): string {
  let bin = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

/** 길이가 같을 때 글자를 모두 비교한다(앞에서 틀린 자리를 시간으로 알아내지 못하게). */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signBetaPass(uid: string, expMs: number, secret: string): Promise<string> {
  if (!secret) throw new Error("BETA_PASS_SECRET is empty");
  return `${uid}.${expMs}.${await hmac(`${uid}.${expMs}`, secret)}`;
}

/** 서명이 맞고 만료 전이면 true. 비밀이 비어 있으면 어떤 값도 false. 던지지 않는다. */
export async function verifyBetaPass(token: string | undefined, secret: string | undefined, nowMs: number): Promise<boolean> {
  if (!token || !secret) return false;
  const m = TOKEN_RE.exec(token);
  if (!m) return false;
  const [, uid, expText, mac] = m;
  const expMs = Number(expText);
  if (!Number.isSafeInteger(expMs) || nowMs >= expMs) return false;
  try {
    return sameText(mac, await hmac(`${uid}.${expMs}`, secret));
  } catch {
    return false;
  }
}

/** document.cookie 에 쓰는 글자. Max-Age = 만료까지 남은 초(내림). */
export function betaCookieString(token: string, expMs: number, nowMs: number, secure: boolean): string {
  const maxAge = Math.max(0, Math.floor((expMs - nowMs) / 1000));
  const base = `${BETA_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  return secure ? `${base}; Secure` : base;
}

/** 카카오톡 안 브라우저 — user agent 에 KAKAOTALK 가 든다(지시서 §2-8). */
export function isKakaoTalkUA(ua: string | null | undefined): boolean {
  return /KAKAOTALK/i.test(ua ?? "");
}
