/**
 * registerWaitlist — 사전등록 콜러블 (PRE-REG-1 · Domain 0 Launch Pad).
 *
 * 얇은 어댑터: 속도 제한 → registerWaitlistCore(정규화·형식·트랜잭션 번호 매기기).
 *
 *   request.data:  { email, utm?: {source,medium,campaign,content,term}, lang?: "ko"|"en"|"es" }
 *   returns:       { status: "registered" | "duplicate" }   — 번호는 돌려주지 않는다
 *   errors:        invalid-argument   메일 형식이 틀림
 *                  resource-exhausted 같은 IP 에서 너무 잦음
 *
 * **로그인 없이 부른다** — `/launch` 를 열거나 등록하는 일로 익명 계정을 만들지 않는다(원장 D-41).
 * 그래서 남용 막기는 uid 가 아니라 IP 로 한다: hashIp 와 같은 소금(IP_HASH_SALT)으로 IP 를
 * 해시한 값을 키로, 인스턴스 메모리 속도 제한(createUidRateLimiter)을 건다. IP 원문·해시 어느 것도
 * 저장하지 않는다.
 *
 * 메일·번호를 로그에 남기지 않는다.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import * as crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ALLOWED_ORIGINS } from "./cors";
import { createUidRateLimiter } from "./core/uidRateLimit";
import {
  WAITLIST_RATE_LIMIT,
  WAITLIST_RATE_WINDOW_MS,
  WaitlistInputError,
  registerWaitlistCore,
  type RegisterResult,
} from "./core/waitlistCore";

const IP_HASH_SALT = defineSecret("IP_HASH_SALT");

// 한도 = 같은 연결당 1분 10번(원장 D-58) — 값은 waitlistCore 에 둔다(시험이 본다).
const limiter = createUidRateLimiter(WAITLIST_RATE_LIMIT, WAITLIST_RATE_WINDOW_MS);

export const registerWaitlist = onCall(
  {
    secrets: [IP_HASH_SALT],
    cors: ALLOWED_ORIGINS,
    // 로그인 전 화면에서 부른다 — 공개 호출(hashIp 403 사고: 공개 권한이 빠지면 CORS 오류처럼 보인다).
    invoker: "public",
    timeoutSeconds: 20,
  },
  async (req): Promise<RegisterResult> => {
    const ip = req.rawRequest?.ip ?? "";
    if (ip) {
      const key = crypto.createHash("sha256").update(IP_HASH_SALT.value() ?? "").update(ip).digest("hex");
      if (!limiter.check(key, Date.now())) {
        throw new HttpsError("resource-exhausted", "rate-limited");
      }
    }

    try {
      return await registerWaitlistCore(adminDb, (req.data ?? {}) as Record<string, unknown>, {
        serverTime: () => FieldValue.serverTimestamp(),
      });
    } catch (err) {
      if (err instanceof WaitlistInputError) throw new HttpsError("invalid-argument", "invalid-email");
      logger.error("registerWaitlist: save failed", { message: (err as Error)?.message });
      throw new HttpsError("internal", "save-failed");
    }
  },
);
