/**
 * onArticleDeleted — 기사가 지워지면 그 기사의 조회 칸 `news_views/{slug}` 도 지운다
 * (PITCH-2 PR B · 대표 결정 2026-11-18).
 *
 * 관리자는 브라우저에서 기사를 지울 수 있다(firestore.rules news 쓰기 = 관리자). 그 길이 어디든 이 트리거가
 * 뒤따라 지운다. 기사를 내리기(archived)만 하면 조회 칸은 그대로 둔다 — 지운 것이 아니므로.
 */
import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { adminDb } from "./admin";
import { deleteArticleViewsCore } from "./core/articleViewCore";

export const onArticleDeleted = onDocumentDeleted("news/{slug}", async (event) => {
  try {
    await deleteArticleViewsCore(adminDb, event.params.slug);
  } catch (err) {
    logger.error("onArticleDeleted: views delete failed", { slug: event.params.slug, message: (err as Error)?.message });
  }
});
