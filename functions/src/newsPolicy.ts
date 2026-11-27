/**
 * newsPolicy — 4층 TIOZ 편집 방침 콜러블 둘 (NEWS-1 · 결정 G · H · 대표 승인 자리 2026-11-27).
 *
 *   getNewsPolicy  {}                          → { lines: NewsPolicyLine[], updatedAt: number | null }
 *   saveNewsPolicy { lines: { text, reason, kinds?, addedAt? }[] } → { lines: NewsPolicyLine[] }
 *     · 목록 통째로 바꾸기. 30줄 · 줄마다 200자 · 이유 필수 · kinds ⊂ press · open · result · weekly · column.
 *     · 어기면 invalid-argument, details.code = too-many-lines | line-too-long | reason-required | text-required | bad-kind | bad-shape
 *
 * 관리자만(requireAdmin). 문서 config/newsPolicy 는 브라우저에서 관리자도 직접 읽거나 쓰지 못한다(firestore.rules).
 * 화면은 A줄 newsdesk 탭이 이 콜러블로 만든다.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import { kstDate } from "./core/voteRecord";
import { NEWS_POLICY_DOC, normalizePolicySave, policyLinesFromDoc } from "./core/newsPolicyCore";
import type { NewsPolicyLine } from "./core/tioKnowledge";

export const getNewsPolicy = onCall(
  { secrets: ["ADMIN_UID"], cors: ALLOWED_ORIGINS },
  async (req): Promise<{ lines: NewsPolicyLine[]; updatedAt: number | null }> => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);
    const snap = await adminDb.doc(NEWS_POLICY_DOC).get();
    const data = snap.data();
    const at = (data?.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? null;
    return { lines: snap.exists ? policyLinesFromDoc(data) : [], updatedAt: at };
  },
);

export const saveNewsPolicy = onCall(
  { secrets: ["ADMIN_UID"], cors: ALLOWED_ORIGINS },
  async (req): Promise<{ lines: NewsPolicyLine[] }> => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);
    const r = normalizePolicySave(req.data, kstDate());
    if (!r.ok) throw new HttpsError("invalid-argument", "편집 방침을 저장할 수 없습니다.", { code: r.code });
    await adminDb.doc(NEWS_POLICY_DOC).set({
      lines: r.lines,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: req.auth!.uid,
    });
    return { lines: r.lines };
  },
);
