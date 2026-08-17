/**
 * autoSourceVideos · refreshSlotVideo — 자동 영상 소싱 콜러블 (LAB-EV-2 §5 B).
 *
 *   autoSourceVideos  { targets[≤8], categoryKeywords?, excludeVideoIds?, dryRun? }
 *                     → { results[], spent, reserved, cacheHits, aiJudged }
 *                     → dryRun이면 { dryRun: true, quota: {...} } (API 0콜)
 *   refreshSlotVideo  { targets[1], excludeVideoIds? } → 캐시 우회 재검색 1회
 *
 * 얇은 어댑터다. 파이프라인·판정·쿼터 산식은 전부 `_embed/sourcing`(클라이언트와
 * 같은 파일)에 있고 여기서는 인증·시크릿·Firestore·모델 배선만 한다.
 *
 * 방어는 R4 순서 그대로 쌓인다 — 값싼 관문이 먼저다:
 *   requireAdmin → 분당 버킷 → 일일 콜 캡(Firestore) → **YouTube 쿼터 예약** → API
 * 인증 실패한 요청은 유튜브 콜을 1개도, Claude 토큰을 1개도 태우지 않는다.
 *
 * R6 — 결과는 슬롯 "제안"일 뿐이다. 이 함수는 Tournament를 만들지 않는다.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import Anthropic from "@anthropic-ai/sdk";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import { createUidRateLimiter } from "./core/uidRateLimit";
import { consumeAiDailyQuota } from "./aiQuota";
import { InspectError, inspectLinks } from "./core/inspectCore";
import { parseSourcingRequest, type SourcingRequest } from "./core/sourcingRequest";
import { toHttpsError } from "./validateYouTubeLinks";
import { createYouTubeGateway, createYouTubeSearchProvider } from "./youtubeGateway";
import {
  readYouTubeQuota,
  reserveYouTubeQuota,
  settleYouTubeQuota,
} from "./youtubeQuota";
import { readSearchCache, writeSearchCache } from "./videoSearchCache";
import { HAIKU_MODEL } from "./core/models";
import { MAX_VIDEOS_PER_CALL } from "./_embed/constants";
import {
  sourceBatch,
  type SourcingDeps,
} from "./_embed/sourcing/pipeline";
import {
  buildRelevancePrompt,
  parseRelevanceResponse,
  type AmbiguousItem,
} from "./_embed/sourcing/relevance";
import {
  buildSearchQuery,
  searchCacheKey,
  SEARCH_MAX_RESULTS,
} from "./_embed/sourcing/searchQuery";
import {
  CANDIDATE_ATTEMPTS,
  estimateSourcingQuota,
  remainingQuota,
} from "./_embed/sourcing/quota";

const YOUTUBE_API_KEY = defineSecret("YOUTUBE_API_KEY");
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

/**
 * 분당 버킷 — 48명 = 6배치라 정상 작업은 분당 6~7회다. 12면 연타는 막고 정상
 * 진행은 안 막는다. (교차 인스턴스 상한은 consumeAiDailyQuota 쪽이 맡는다)
 */
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;
const limiter = createUidRateLimiter(RATE_LIMIT, RATE_WINDOW_MS);

/** 애매분 판정 응답은 짧은 JSON 한 줄 — 24건이라도 넉넉하다. */
const JUDGE_MAX_TOKENS = 2048;

function requireYouTubeKey(): string {
  const apiKey = YOUTUBE_API_KEY.value();
  if (!apiKey) {
    throw new HttpsError(
      "failed-precondition",
      "YOUTUBE_API_KEY secret is not set. Run `firebase functions:secrets:set YOUTUBE_API_KEY`.",
    );
  }
  return apiKey;
}

/**
 * 규칙이 못 가른 짝만 Haiku **배치 1콜**로 묻는다. 실패하면 빈 판정을 돌려주고
 * 파이프라인이 보수적으로(=관련 없음) 진행한다 — 모델이 죽어도 48명 소싱은 끝난다.
 */
function createRelevanceJudge(
  anthropicKey: string,
): ((items: AmbiguousItem[]) => Promise<Map<string, boolean>>) | undefined {
  if (!anthropicKey) return undefined;
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  return async (items: AmbiguousItem[]): Promise<Map<string, boolean>> => {
    const resp = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: JUDGE_MAX_TOKENS,
      messages: [{ role: "user", content: buildRelevancePrompt(items) }],
    });
    // 비용 실측용(§8 B) — 프롬프트 전문은 남기지 않는다. 토큰 수만.
    logger.info("autoSourceVideos relevance usage", {
      model: HAIKU_MODEL,
      items: items.length,
      inputTokens: resp.usage?.input_tokens,
      outputTokens: resp.usage?.output_tokens,
    });
    const block = resp.content[0];
    return parseRelevanceResponse(block && block.type === "text" ? block.text : "");
  };
}

function buildDeps(input: {
  youtubeKey: string;
  anthropicKey: string;
  nowMs: number;
}): SourcingDeps {
  const gateway = createYouTubeGateway(input.youtubeKey);
  const provider = createYouTubeSearchProvider(input.youtubeKey);

  return {
    search: (query, maxResults) => provider.search(query, maxResults),
    // LAB-EV-1의 검증을 그대로 쓴다(R3 복제 금지) — 판정 규칙이 검수기와 한 몸이다.
    verify: async (videoIds) => (await inspectLinks({ videoIds }, { gateway })).verdicts,
    readCache: (keys, nowMs) => readSearchCache(keys, nowMs),
    writeCache: (entries, nowMs) => writeSearchCache(entries, nowMs),
    judgeAmbiguous: createRelevanceJudge(input.anthropicKey),
    reserveQuota: (estimate) => reserveYouTubeQuota(estimate),
    settleQuota: (delta) => settleYouTubeQuota(delta),
    logInfo: (message) => logger.info(message),
  };
}

/**
 * 드라이런 — API를 한 콜도 안 부르고 "이번 실행이 얼마를 쓰는지 / 오늘 얼마 남았는지"
 * 만 돌려준다. 확인 다이얼로그(DoD)가 이걸 읽는다. 캐시를 실제로 조회하므로 추정이
 * 아니라 실측에 가깝다: 적중 슬롯은 검색 콜을 쓰지 않는다.
 */
async function estimateOnly(request: SourcingRequest, nowMs: number) {
  const queries = request.targets.map((t) => buildSearchQuery(t, request.categoryKeywords));
  const keys = queries.filter(Boolean).map((q) => searchCacheKey(q));
  const cached = await readSearchCache(keys, nowMs);

  const searchable = queries.filter(Boolean).length;
  const cachedSlots = keys.filter((k) => (cached.get(k)?.length ?? 0) > 0).length;
  const estimate = estimateSourcingQuota({
    searchesNeeded: searchable - cachedSlots,
    verifyIdCount: searchable * CANDIDATE_ATTEMPTS,
    maxIdsPerVerifyCall: MAX_VIDEOS_PER_CALL,
  });

  const usage = await readYouTubeQuota();
  return {
    dryRun: true as const,
    quota: {
      estimate,
      usage,
      remaining: remainingQuota(usage),
      /** 검색 없이 처리되는 슬롯 수 — "캐시 적중 12칸" 안내. */
      cachedSlots,
      /** 이름이 있어 실제로 소싱 대상인 슬롯 수. */
      searchableSlots: searchable,
      searchMaxResults: SEARCH_MAX_RESULTS,
    },
  };
}

async function runSourcing(
  req: { auth?: { uid?: string } | null; data?: unknown },
  options: { kind: "autoSourceVideos" | "refreshSlotVideo"; bypassCache: boolean },
) {
  requireAdmin(req.auth?.uid, process.env.ADMIN_UID);
  const uid = req.auth!.uid!;

  if (!limiter.check(uid, Date.now())) {
    throw new HttpsError("resource-exhausted", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
  }

  const request = parseSourcingRequest(req.data);
  const nowMs = Date.now();

  // 드라이런은 어떤 쿼터도 소비하지 않는다 — 확인 다이얼로그를 여는 것만으로
  // 하루치가 줄면 운영자는 다이얼로그를 못 연다.
  if (request.dryRun) return estimateOnly(request, nowMs);

  // 교차 인스턴스 일일 콜 캡 — 시크릿을 읽기 전에 건다(AI-1 패턴).
  await consumeAiDailyQuota(options.kind);

  const youtubeKey = requireYouTubeKey();
  // Anthropic 키가 없으면 규칙 판정만으로 돈다 — 소싱이 통째로 멈추지는 않는다.
  const anthropicKey = ANTHROPIC_API_KEY.value() ?? "";
  if (!anthropicKey) {
    logger.warn("autoSourceVideos: ANTHROPIC_API_KEY 미설정 — 애매한 후보는 전부 탈락 처리");
  }

  return sourceBatch(
    {
      targets: request.targets,
      categoryKeywords: request.categoryKeywords,
      excludeVideoIds: request.excludeVideoIds,
      bypassCache: options.bypassCache,
      nowMs,
    },
    buildDeps({ youtubeKey, anthropicKey, nowMs }),
  );
}

export const autoSourceVideos = onCall(
  {
    secrets: [YOUTUBE_API_KEY, ANTHROPIC_API_KEY, "ADMIN_UID"],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
  },
  async (req) => {
    try {
      return await runSourcing(req, { kind: "autoSourceVideos", bypassCache: false });
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      if (!(err instanceof InspectError)) logger.error("autoSourceVideos failed", err);
      throw toHttpsError(err);
    }
  },
);

/**
 * 슬롯 1개 재검색 — 캐시를 건너뛴다(DoD "캐시 우회 재검색 1회"). 운영자가 제안된
 * 영상이 마음에 안 들 때 누른다. search 콜을 1개 더 쓰므로 같은 쿼터 가드를 탄다.
 */
export const refreshSlotVideo = onCall(
  {
    secrets: [YOUTUBE_API_KEY, ANTHROPIC_API_KEY, "ADMIN_UID"],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
  },
  async (req) => {
    try {
      return await runSourcing(req, { kind: "refreshSlotVideo", bypassCache: true });
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      if (!(err instanceof InspectError)) logger.error("refreshSlotVideo failed", err);
      throw toHttpsError(err);
    }
  },
);
