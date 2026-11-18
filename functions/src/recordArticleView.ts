/**
 * recordArticleView — 기사 조회 기록 콜러블 (PITCH-2 PR B · 원장 D-78 후보 · 급등 재료).
 *
 *   request.data:  { slug }
 *   returns:       { counted: boolean }  — 왜 안 셌는지는 돌려주지 않는다(브라우저는 결과를 쓰지 않는다)
 *   errors:        invalid-argument   slug 모양이 틀림
 *                  resource-exhausted 같은 연결에서 너무 잦음(홍수 막기 · 1분 60번)
 *
 * **로그인 없이 부른다** — 기사를 열기만 해서 익명 계정을 만들지 않는다(원장 D-41). 그래서
 * "같은 브라우저 1시간 1번"은 uid 가 아니라 IP 로 센다: registerWaitlist 와 같은 소금(IP_HASH_SALT)으로
 * (IP · 기사 · 시간) 을 해시한 표지 문서를 트랜잭션으로 만든다(articleViewCore). IP 원문은 저장하지 않는다.
 * 브라우저 쪽에도 로컬 메모(1시간)가 있어 대부분은 이 함수를 부르지도 않는다.
 *
 * 쓰는 곳은 news/{slug}.views 하나 — 브라우저는 news 에 못 쓴다(firestore.rules 그대로).
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import * as crypto from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ALLOWED_ORIGINS } from "./cors";
import { createUidRateLimiter } from "./core/uidRateLimit";
import { recordArticleViewCore, viewMarkId } from "./core/articleViewCore";
import { isValidArticleSlug } from "./_news/articleViews";

const IP_HASH_SALT = defineSecret("IP_HASH_SALT");

// 홍수 막기 — 같은 연결 1분 60번(인스턴스 메모리). 정상 팬은 기사마다 시간당 1번만 부른다.
const limiter = createUidRateLimiter(60, 60_000);

export const recordArticleView = onCall(
  {
    secrets: [IP_HASH_SALT],
    cors: ALLOWED_ORIGINS,
    // 로그인 전 화면(기사 지면)에서 부른다 — 공개 호출(hashIp 403 사고: 공개 권한이 빠지면 CORS 오류처럼 보인다).
    invoker: "public",
    timeoutSeconds: 20,
  },
  async (req): Promise<{ counted: boolean }> => {
    const slug = (req.data as { slug?: unknown } | undefined)?.slug;
    if (!isValidArticleSlug(slug)) throw new HttpsError("invalid-argument", "invalid-slug");

    const ip = req.rawRequest?.ip ?? "";
    const salt = IP_HASH_SALT.value() ?? "";
    // IP 나 소금이 없으면 "1시간 1번"을 지킬 수 없다 — 세지 않는다(부풀리기보다 덜 세기).
    if (!ip || !salt) return { counted: false };

    const now = Date.now();
    const ipKey = crypto.createHash("sha256").update(salt).update(ip).digest("hex");
    if (!limiter.check(ipKey, now)) throw new HttpsError("resource-exhausted", "rate-limited");

    try {
      const res = await recordArticleViewCore(
        adminDb,
        { slug, markId: viewMarkId(salt, ip, slug, now), nowMs: now },
        {
          increment: (n) => FieldValue.increment(n),
          deleteField: () => FieldValue.delete(),
          timestamp: (ms) => Timestamp.fromMillis(ms),
        },
      );
      return { counted: res.counted };
    } catch (err) {
      logger.error("recordArticleView: save failed", { slug, message: (err as Error)?.message });
      throw new HttpsError("internal", "save-failed");
    }
  },
);
