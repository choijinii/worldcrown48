/**
 * waitlistSubmit — 사전등록 화면 ↔ 등록 함수 registerWaitlist (PRE-REG-1).
 *
 * 화면은 더 이상 `waitlist` 에 직접 쓰지 않는다(규칙으로도 닫혔다). 메일 · 처음 들어온 경로 ·
 * 화면 언어를 함수에 넘기고, 돌아온 상태를 화면 상태로 옮긴다. 함수는 선착순 번호를 돌려주지
 * 않는다 — 화면·이벤트로 번호가 나갈 길이 없다.
 *
 * 로그인 없이 부른다(원장 D-41) — 이 경로는 익명 계정을 만들지 않는다.
 */
import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "@/lib/firebase";
import type { Lang } from "@/lib/cookieConsent";
import type { Utm } from "@/lib/launch/firstTouch";

export const REGISTER_WAITLIST_FN = "registerWaitlist";

export interface WaitlistPayload {
  email: string;
  utm?: Utm;
  lang: Lang;
}

/** 화면 상태 중 제출 결과 셋 + 속도 제한. */
export type WaitlistOutcome = "success" | "duplicate" | "invalid" | "rateLimited";

export function waitlistPayload(email: string, utm: Utm | null, lang: Lang): WaitlistPayload {
  const payload: WaitlistPayload = { email: email.trim().toLowerCase(), lang };
  if (utm) payload.utm = utm;
  return payload;
}

export function waitlistOutcomeFromResult(data: unknown): WaitlistOutcome {
  const status = data && typeof data === "object" ? (data as { status?: unknown }).status : undefined;
  if (status === "registered") return "success";
  if (status === "duplicate") return "duplicate";
  return "invalid";
}

/**
 * 함수 오류 → 화면 상태. 형식 오류 = invalid · 속도 제한 = rateLimited.
 * 그 밖(연결 끊김 · 서버 오류)은 옛 화면처럼 invalid — 기존 승인 문구를 바꾸지 않는다.
 */
export function waitlistOutcomeFromError(err: unknown): WaitlistOutcome {
  const code = err && typeof err === "object" ? (err as { code?: unknown }).code : undefined;
  if (code === "functions/resource-exhausted") return "rateLimited";
  return "invalid";
}

export async function callRegisterWaitlist(payload: WaitlistPayload): Promise<WaitlistOutcome> {
  try {
    const call = httpsCallable<WaitlistPayload, unknown>(getFunctionsInstance(), REGISTER_WAITLIST_FN);
    const res = await call(payload);
    return waitlistOutcomeFromResult(res.data);
  } catch (err) {
    const outcome = waitlistOutcomeFromError(err);
    if (outcome === "invalid") console.warn("WaitlistForm: submit failed", err);
    return outcome;
  }
}
