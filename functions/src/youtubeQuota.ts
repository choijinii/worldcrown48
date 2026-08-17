/**
 * youtubeQuota — YouTube 할당량 카운터 어댑터 (LAB-EV-2 R4 "가드는 실행 전에").
 *
 * 순수 판정(decideQuota·estimateSourcingQuota)은 `_embed/sourcing/quota`에 있고,
 * 여기서는 Firestore 트랜잭션·시계만 얹는다 — aiQuota(AI-1)와 같은 모양.
 *
 * **예약 → 실행 → 정산** 3단계다:
 *   ① reserve  실행 상한을 트랜잭션으로 먼저 올린다. 두 세션이 동시에 눌러도
 *              둘 다 통과하는 구멍이 없다(읽고-쓰기 사이가 트랜잭션 안이다).
 *   ② 실행     API 호출.
 *   ③ settle   안 쓴 만큼을 음수로 되돌린다. §7이 이 카운터를 Cloud Console
 *              할당량 페이지와 대조하므로 상한 예약을 그대로 남기면 안 된다.
 *
 * 문서 id는 **태평양시 날짜**다(ptDate) — Google 리셋 기준. KST로 세면 매일
 * 16~17시간 어긋나 §6 Auto-STOP 5번("카운터가 실사용량과 크게 어긋남")을 자초한다.
 */
import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import {
  decideQuota,
  ptDate,
  remainingQuota,
  type QuotaEstimate,
  type QuotaUsage,
} from "./_embed/sourcing/quota";

export const YOUTUBE_QUOTA_COLLECTION = "youtube_quota";

/** 클라이언트 i18n 계약용 안정 코드 (voteErrorCodes·aiDailyLimit 방식). */
export const YOUTUBE_QUOTA_ERROR_CODE = "youtube_daily_quota";

function quotaRef(now: Date = new Date()) {
  return adminDb.collection(YOUTUBE_QUOTA_COLLECTION).doc(ptDate(now));
}

function toUsage(data: FirebaseFirestore.DocumentData | undefined): QuotaUsage {
  return {
    searchCalls: Math.max(0, Number(data?.searchCalls ?? 0)),
    units: Math.max(0, Number(data?.units ?? 0)),
  };
}

/** 오늘 쓴 양 — 확인 다이얼로그(드라이런)가 "잔여"를 그리는 데 쓴다. */
export async function readYouTubeQuota(now: Date = new Date()): Promise<QuotaUsage> {
  const snap = await quotaRef(now).get();
  return toUsage(snap.data());
}

/**
 * 실행 상한을 예약한다. 초과면 `resource-exhausted`로 던지고 **API는 한 콜도 안 나간다**.
 * details에 어느 버킷이 얼마나 남았는지를 실어 UI가 "search 콜 10개 남음"을 그린다.
 */
export async function reserveYouTubeQuota(
  estimate: QuotaEstimate,
  now: Date = new Date(),
): Promise<void> {
  if (estimate.searchCalls <= 0 && estimate.units <= 0) return;
  const ref = quotaRef(now);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const usage = toUsage(snap.data());
    const decision = decideQuota(usage, estimate);

    if (decision.status === "denied") {
      const left = remainingQuota(usage);
      throw new HttpsError(
        "resource-exhausted",
        decision.bucket === "search"
          ? `오늘 남은 유튜브 검색 횟수가 부족합니다 (남음 ${decision.remaining} · 필요 ${decision.needed}). 태평양시 자정에 초기화됩니다.`
          : `오늘 남은 유튜브 API 사용량이 부족합니다 (남음 ${decision.remaining} · 필요 ${decision.needed}). 태평양시 자정에 초기화됩니다.`,
        {
          code: YOUTUBE_QUOTA_ERROR_CODE,
          bucket: decision.bucket,
          remaining: decision.remaining,
          needed: decision.needed,
          remainingSearchCalls: left.searchCalls,
          remainingUnits: left.units,
        },
      );
    }

    tx.set(
      ref,
      {
        searchCalls: FieldValue.increment(estimate.searchCalls),
        units: FieldValue.increment(estimate.units),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

/**
 * 예약분과 실사용의 차이를 되돌린다(보통 음수). 실패해도 실행 결과를 버리지 않는다 —
 * 카운터가 조금 보수적으로 남는 건 안전 방향이고, 운영자의 48명 소싱 결과를
 * 정산 실패로 날리는 건 안전 방향이 아니다.
 */
export async function settleYouTubeQuota(
  delta: QuotaEstimate,
  now: Date = new Date(),
): Promise<void> {
  if (delta.searchCalls === 0 && delta.units === 0) return;
  await quotaRef(now).set(
    {
      searchCalls: FieldValue.increment(delta.searchCalls),
      units: FieldValue.increment(delta.units),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
