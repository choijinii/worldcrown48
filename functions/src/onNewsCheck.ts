/**
 * onNewsCheck — 기사를 저장하면 서버가 생성 뒤 검사를 다시 돌려 checkWarnings · checkedText · checkBlocked 를 새로 적는다
 * (NEWS-2 · 결정 J · 대표 2026-11-27).
 *
 * 관리자는 뉴스데스크에서 제목 · 부제 · 본문을 브라우저로 바로 저장한다(saveArticleFields). 그 길이 어디든 이 트리거가 뒤따른다.
 * 글이 검사한 글(checkedText)과 같으면 아무것도 쓰지 않는다 — 조회 수 칸 저장 · 이 트리거 자신의 쓰기는 그냥 지나간다.
 * 발행된 기사는 상태를 건드리지 않는다(내리지 않음) — 경고만 적는다. 외신 초안(cron_press) · 백지 초안도 처음 만들어질 때 여기서 검사된다.
 * 사이에 더 새 저장이 끼면(문서 시각이 다르면) 쓰지 않는다 — 그 저장의 트리거가 다시 검사한다.
 */
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { adminDb } from "./admin";
import { recheckPatch } from "./core/newsCheckState";

export const onNewsCheck = onDocumentWritten("news/{slug}", async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return;
  const patch = recheckPatch(after.data() as Record<string, unknown>);
  if (!patch) return;
  try {
    await adminDb.doc(`news/${event.params.slug}`).update({ ...patch }, { lastUpdateTime: after.updateTime });
    logger.info("onNewsCheck: rechecked", { slug: event.params.slug, warnings: patch.checkWarnings.length, blocked: patch.checkBlocked });
  } catch (err) {
    // 더 새 저장이 끼었거나(precondition) 문서가 지워짐 — 그쪽 트리거가 맡는다.
    logger.warn("onNewsCheck: skipped write", { slug: event.params.slug, message: (err as Error)?.message });
  }
});
