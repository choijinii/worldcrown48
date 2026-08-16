/**
 * aiQuota — 편집기 AI 콜러블의 일일 상한 어댑터 (AI-1 §5 B).
 *
 * aiDailyLimit(순수 결정) 위에 Firestore 트랜잭션·시계만 얹는다. 두 콜러블이
 * 같은 문서를 쓰므로 트랜잭션 코드를 한 곳에 둔다 — generateNewsDraft(ND-1)의
 * 카운터와 같은 모양이다.
 *
 * 컬렉션 이름은 `ai_usage` — 핸드오프 문면은 `aiUsage`였지만 이 저장소의 컬렉션은
 * 전부 snake_case(`news_generation`·`ranking_cache`·`daily_participation`)라
 * 관례에 맞췄다. 문서 id는 문면대로 `{yyyy-mm-dd}`(KST).
 *
 * 카운트는 **모델 호출 직전**에 올린다. 모델이 그 뒤 실패해도 1회는 소모된다
 * (ND-1과 동일) — 실패 재시도로 상한을 무한히 우회하는 구멍을 막는 쪽이 낫다.
 */
import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { kstDate } from "./core/voteRecord";
import {
  AI_ERROR_CODES,
  aiUsageDocId,
  decideAiCall,
  resolveAiDailyLimit,
  type AiCallKind,
} from "./core/aiDailyLimit";

export const AI_USAGE_COLLECTION = "ai_usage";

/**
 * 오늘치 쿼터를 1 소모한다. 넘겼으면 `resource-exhausted`로 던진다.
 * (details.code = 'ai_daily_limit' — 클라이언트 i18n 계약)
 */
export async function consumeAiDailyQuota(kind: AiCallKind): Promise<void> {
  const limit = resolveAiDailyLimit(process.env.AI_DAILY_LIMIT);
  const ref = adminDb
    .collection(AI_USAGE_COLLECTION)
    .doc(aiUsageDocId(kstDate()));

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const counts = (snap.data()?.counts ?? {}) as Record<string, unknown>;
    const countToday = Number(counts[kind] ?? 0);

    if (decideAiCall(countToday, limit).status === "limit_reached") {
      throw new HttpsError(
        "resource-exhausted",
        "오늘 사용할 수 있는 AI 호출을 다 썼습니다. 내일 다시 시도해주세요.",
        { code: AI_ERROR_CODES.DAILY_LIMIT, kind, limit },
      );
    }

    tx.set(
      ref,
      {
        counts: { [kind]: FieldValue.increment(1) },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}
