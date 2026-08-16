/**
 * recommendKillingPart — 어드민 콜러블 (LAB-EV-1 W2).
 *
 *   request.data: { videoId: string }
 *   returns:      { videoId, durationSec, source, candidates[], commentsAvailable }
 *
 * 3층 추천(댓글→챕터→60s)의 로직은 lib/embed/killingPart에 있고, 여기서는
 * 인증·시크릿·에러 매핑만 한다. ADR-EV-2: Most Replayed는 공식 API에 없으므로
 * 자동 수집하지 않는다 — 최종 판단은 운영자의 눈([원본 열기])이다.
 *
 * 쿼터: videos.list 1 + commentThreads.list 1 = 슬롯당 2유닛. 48슬롯을 전부
 * 추천받아도 96유닛(일일 10,000)이라 안전하지만, 화면은 "열어본 슬롯만" 부른다.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import { createUidRateLimiter } from "./core/uidRateLimit";
import {
  InspectError,
  suggestKillingPart,
  type KillingPartSuggestion,
} from "./core/inspectCore";
import { createYouTubeGateway } from "./youtubeGateway";
import { toHttpsError } from "./validateYouTubeLinks";

const YOUTUBE_API_KEY = defineSecret("YOUTUBE_API_KEY");

/** 슬롯을 하나씩 열어보는 조작이라 분당 30회 — 48칸을 훑어도 걸리지 않는다. */
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const limiter = createUidRateLimiter(RATE_LIMIT, RATE_WINDOW_MS);

export const recommendKillingPart = onCall(
  {
    secrets: [YOUTUBE_API_KEY, "ADMIN_UID"],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
  },
  async (req): Promise<KillingPartSuggestion> => {
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
      return await suggestKillingPart(
        { videoId: req.data?.videoId },
        { gateway: createYouTubeGateway(apiKey), logInfo: (m) => logger.info(m) },
      );
    } catch (err) {
      if (!(err instanceof InspectError)) logger.error("recommendKillingPart failed", err);
      throw toHttpsError(err);
    }
  },
);
