/**
 * waitlistCore — 사전등록 저장 핵심 (PRE-REG-1).
 *
 * 화면이 `waitlist` 에 직접 쓰던 일을 서버로 옮긴다. 서버에서만 할 수 있는 일:
 *   · 선착순 번호(founding_rank) — 1부터, 빈틈·중복 없이, 등록 순서대로. 번호 기록 문서
 *     (`waitlist_meta/founding`) 하나를 트랜잭션으로 읽고 올려서 동시 등록도 줄을 세운다.
 *   · 처음 들어온 경로(utm) · 화면 언어(lang) 를 등록 기록에 붙인다.
 *
 * 번호는 **결과에 넣지 않는다** — 화면·이벤트·로그 어디에도 나가지 않게(대표 결정).
 *
 * 봉인: 옛 화면이 번호 없이 쓴 문서가 있다. 그 문서들이 먼저 등록됐으므로 앞 번호를 가져야
 * 한다. 그래서 번호 기록 문서가 생기기 전(= 옛 문서 번호 매기기 스크립트가 아직 안 돌았다)에
 * 들어온 등록은 번호 없이 저장하고, 스크립트가 옛 문서와 함께 등록 시각 순서대로 번호를 매긴
 * 뒤 번호 기록 문서를 만든다(봉인). 그 뒤 등록은 바로 이어지는 번호를 받는다.
 *   스크립트: functions/scripts/assign-founding-rank.mjs
 *
 * 시험 메일(@wc48.test)은 진짜 모음·진짜 번호를 쓰지 않는다 — `waitlist_test` 에 시험 번호
 * (`waitlist_meta/test`)로 저장하고, 모음째 지울 수 있다(functions/scripts/clear-waitlist-test.mjs).
 *
 * Firestore 는 주입받는다 — 콜러블(functions 의 firebase-admin)과 에뮬레이터 시험(루트의
 * firebase-admin)이 같은 코드를 돈다. 그래서 여기서는 타입만 가져오고, 서버 시각 표지도
 * 부르는 쪽이 넘긴다(두 SDK 의 FieldValue 는 서로 다른 클래스다).
 */
import { createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

export const WAITLIST_COLLECTION = "waitlist";
export const WAITLIST_TEST_COLLECTION = "waitlist_test";
export const WAITLIST_META_COLLECTION = "waitlist_meta";
export const FOUNDING_META_ID = "founding";
export const TEST_META_ID = "test";

/** 시험 전용 도메인 — `.test` 최상위 도메인은 실제로 배달될 수 없다(RFC 2606). */
export const TEST_EMAIL_DOMAIN = "wc48.test";

/**
 * 등록 속도 제한 — 같은 연결(IP_HASH_SALT 로 해시한 IP)당 1분 10번(원장 D-58, 대표 2026-10-18).
 * hashIp 와 같은 값. 행사장 QR처럼 한 와이파이에 여러 명이 몰려도 1분 10명이면 넉넉하다.
 */
export const WAITLIST_RATE_LIMIT = 10;
export const WAITLIST_RATE_WINDOW_MS = 60_000;

/**
 * 트랜잭션 재시도 한도 — 기본 5 → 10. 등록은 모두 번호 기록 한 문서를 두고 겨룬다. 행사장 QR처럼
 * 한꺼번에 몰리면 재시도를 다 쓴 등록이 ABORTED 로 실패할 수 있다(CI 에뮬레이터 동시 20건에서
 * 18번 중 3번 "Transaction lock timeout" — 2026-10-18).
 */
export const WAITLIST_TX_MAX_ATTEMPTS = 10;

/** 화면(WaitlistForm)과 같은 모양 검사 · 규칙(firestore.rules)과 같은 길이 상한. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MIN = 5;
const EMAIL_MAX = 320;

const UTM_KEYS = ["source", "medium", "campaign", "content", "term"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];
export type Utm = Partial<Record<UtmKey, string>>;
const UTM_VALUE_MAX = 100;

const LANGS = ["ko", "en", "es"] as const;
export type WaitlistLang = (typeof LANGS)[number];

export type WaitlistStatus = "registered" | "duplicate";
/** 결과에는 상태만 — 번호를 넣지 않는다. */
export interface RegisterResult {
  status: WaitlistStatus;
}

/** 메일 형식이 틀렸다 — 콜러블이 invalid-argument 로 바꾼다. */
export class WaitlistInputError extends Error {
  constructor() {
    super("invalid-email");
    this.name = "WaitlistInputError";
  }
}

export function normalizeEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export function isValidWaitlistEmail(email: string): boolean {
  return email.length >= EMAIL_MIN && email.length <= EMAIL_MAX && EMAIL_RE.test(email);
}

/** 문서 ID = sha256(정규화한 메일) — 옛 화면(lib/analytics hashEmail)과 같은 값이라 중복 판정이 이어진다. */
export function waitlistDocId(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}

export function isTestEmail(email: string): boolean {
  return email.endsWith(`@${TEST_EMAIL_DOMAIN}`);
}

export function sanitizeUtm(raw: unknown): Utm | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;
  const out: Utm = {};
  for (const key of UTM_KEYS) {
    const v = src[key];
    if (typeof v !== "string") continue;
    const trimmed = v.trim().slice(0, UTM_VALUE_MAX);
    if (trimmed) out[key] = trimmed;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function sanitizeLang(raw: unknown): WaitlistLang | null {
  return (LANGS as readonly unknown[]).includes(raw) ? (raw as WaitlistLang) : null;
}

export interface RegisterDeps {
  /** 서버 시각 표지 — FieldValue.serverTimestamp() (부르는 쪽 SDK 의 것). */
  serverTime: () => unknown;
}

export async function registerWaitlistCore(
  db: Firestore,
  input: Record<string, unknown>,
  deps: RegisterDeps,
): Promise<RegisterResult> {
  const email = normalizeEmail(input.email);
  if (!isValidWaitlistEmail(email)) throw new WaitlistInputError();
  const utm = sanitizeUtm(input.utm);
  const lang = sanitizeLang(input.lang);
  const test = isTestEmail(email);

  const ref = db.collection(test ? WAITLIST_TEST_COLLECTION : WAITLIST_COLLECTION).doc(waitlistDocId(email));
  const metaRef = db.collection(WAITLIST_META_COLLECTION).doc(test ? TEST_META_ID : FOUNDING_META_ID);

  return db.runTransaction(async (tx) => {
    const [snap, meta] = await tx.getAll(ref, metaRef);
    if (snap.exists) return { status: "duplicate" };

    const entry: Record<string, unknown> = { email, createdAt: deps.serverTime() };
    if (utm) entry.utm = utm;
    if (lang) entry.lang = lang;
    // 시험 번호는 늘 매긴다(봉인과 무관). 진짜 번호는 봉인 뒤에만.
    if (test || meta.exists) {
      const last = meta.get("lastRank");
      const rank = (typeof last === "number" ? last : 0) + 1;
      entry.founding_rank = rank;
      tx.set(metaRef, { lastRank: rank }, { merge: true });
    }
    tx.create(ref, entry);
    return { status: "registered" };
  }, { maxAttempts: WAITLIST_TX_MAX_ATTEMPTS });
}
