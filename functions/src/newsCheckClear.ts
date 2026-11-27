/**
 * clearNewsCheckWarnings — [경고 풀기](대표 승인 2026-11-27 18:17 · 문구 경고 풀기 / Clear warning / Quitar aviso).
 * 관리자만. 그 초안의 지금 경고를 모두 "풀림"으로 적고(checkBlocked false), 누가 · 언제 · 어떤 경고를 풀었는지
 * news_check_clears 에 한 줄 남긴다. 단추 화면은 A줄 newsdesk 탭이 붙인다.
 *
 *   요청  { slug: string }
 *   응답  { slug, cleared: CheckWarning[] (이번에 새로 푼 것 · 이미 푼 것은 빠짐), checkBlocked: false }
 *   거절  invalid-argument(slug 없음) · not-found(기사 없음) · failed-precondition details.code "check-pending"
 *         (글을 고친 뒤 서버가 아직 다시 검사하지 않음 — 몇 초 뒤 다시)
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import { planClearWarnings } from "./core/newsCheckState";
import type { CheckWarning } from "./core/newsCheck";

export const clearNewsCheckWarnings = onCall(
  { secrets: ["ADMIN_UID"], cors: ALLOWED_ORIGINS },
  async (req): Promise<{ slug: string; cleared: CheckWarning[]; checkBlocked: false }> => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);
    const uid = req.auth!.uid;
    const slug = String((req.data as { slug?: unknown } | null)?.slug ?? "").trim();
    if (!slug || slug.includes("/")) throw new HttpsError("invalid-argument", "slug 가 필요합니다.");
    const ref = adminDb.doc(`news/${slug}`);
    return adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const plan = planClearWarnings(snap.exists ? (snap.data() as Record<string, unknown>) : undefined, uid, Date.now());
      if (!plan.ok) {
        if (plan.code === "not-found") throw new HttpsError("not-found", "기사를 찾을 수 없습니다.", { code: plan.code });
        throw new HttpsError("failed-precondition", "아직 다시 검사 중입니다. 잠시 뒤 다시 눌러 주세요.", { code: plan.code });
      }
      tx.update(ref, plan.patch);
      if (plan.cleared.length > 0) {
        tx.set(adminDb.collection("news_check_clears").doc(), { slug, by: uid, at: FieldValue.serverTimestamp(), warnings: plan.cleared });
      }
      return { slug, cleared: plan.cleared, checkBlocked: false as const };
    });
  },
);
