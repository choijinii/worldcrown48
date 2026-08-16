/**
 * validateYouTubeLinks — 어드민 콜러블 (LAB-EV-1 W1).
 *
 *   request.data: { videoIds: string[] }   (≤50, 11자 id — 파싱은 클라이언트 lib/embed)
 *   returns:      { verdicts: LinkVerdict[], apiCalls: number }
 *
 * inspectCore를 감싸는 얇은 어댑터다. 순서 보존·중복 축약·판정 규칙은 전부 코어에
 * 있고 여기서는 인증·시크릿·에러 매핑만 한다.
 *
 * 보안: ADR-EV-7 — 검수기 콘솔은 어드민 전용이다. requireAdmin이 **첫 줄**에서
 * 돌고(G-1 패턴 · 콜러블 URL 직접 호출 방어), 그 뒤에야 시크릿을 읽는다 — 인증
 * 실패한 요청이 유튜브 쿼터를 1유닛도 태우지 않게.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import { createUidRateLimiter } from "./core/uidRateLimit";
import { InspectError, inspectLinks } from "./core/inspectCore";
import { createYouTubeGateway } from "./youtubeGateway";
import type { LinkVerdict } from "./_embed/verdict";

const YOUTUBE_API_KEY = defineSecret("YOUTUBE_API_KEY");

/** 48개 검증 1회 = videos.list 1유닛. 분당 10회면 실수 연타는 막고 정상 작업은 안 막는다. */
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const limiter = createUidRateLimiter(RATE_LIMIT, RATE_WINDOW_MS);

/** InspectError → HttpsError. 쿼터는 429로 내려 클라이언트가 재시도 안내를 띄운다. */
export function toHttpsError(err: unknown): HttpsError {
  if (err instanceof InspectError) {
    switch (err.reason) {
      case "invalid-argument":
        return new HttpsError("invalid-argument", err.message);
      case "not-found":
        return new HttpsError("not-found", err.message);
      case "quota-exceeded":
        return new HttpsError("resource-exhausted", err.message);
      default:
        return new HttpsError("internal", err.message);
    }
  }
  return new HttpsError("internal", "유튜브 검증에 실패했습니다. 다시 시도해주세요.");
}

export const validateYouTubeLinks = onCall(
  {
    secrets: [YOUTUBE_API_KEY, "ADMIN_UID"],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
  },
  async (req): Promise<{ verdicts: LinkVerdict[]; apiCalls: number }> => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);

    if (!limiter.check(req.auth!.uid, Date.now())) {
      throw new HttpsError(
        "resource-exhausted",
        "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      );
    }

    const apiKey = YOUTUBE_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError(
        "failed-precondition",
        "YOUTUBE_API_KEY secret is not set. Run `firebase functions:secrets:set YOUTUBE_API_KEY`.",
      );
    }

    try {
      return await inspectLinks(
        { videoIds: req.data?.videoIds },
        {
          gateway: createYouTubeGateway(apiKey),
          logInfo: (message) => logger.info(message),
        },
      );
    } catch (err) {
      if (!(err instanceof InspectError)) logger.error("validateYouTubeLinks failed", err);
      throw toHttpsError(err);
    }
  },
);
