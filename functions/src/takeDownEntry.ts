/**
 * takeDownEntry — 엔트리 하나의 그림(이미지 대회) 또는 영상·썸네일(영상 대회)을 내린다 (IMAGE-1 PR 3 · 원장 D-77 · D-83 · D-93).
 * 관리자 전용 콜러블. 브라우저에서 엔트리 그림·기록을 바로 바꾸는 길은 규칙에서 닫았다(firestore.rules · D-86과 같은 원칙).
 *
 *   request.data: { tournamentId, contestantId, reason }  →  { cards: n, already }
 *     n = 그 엔트리가 Champion 인 크라운 카드 장수(끝 알림 "크라운 카드 {n}장을 다시 굽고 있어요") — 다시 굽기는
 *     트리거 onEntryTakedown 이 기록 문서를 따라 한 쪽씩 한다.
 *
 * manageTournament(대회 단위 동작)와 따로 둔 이유: 엔트리 단위이고, Storage 파일 삭제 · 차트 캐시 패치 · 카드 다시 굽기가
 * 딸려 있어 판정·기록 모양이 다르다. 거절은 HttpsError + details.code(entryTakedown.ts 의 코드).
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb, adminStorage } from "./admin";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import { ENTRY_TAKEDOWN_ERROR_CODES as CODES } from "./core/entryTakedown";
import { EntryTakedownError, takeDownEntry as takeDown } from "./core/entryTakedownStore";

function requireId(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 128 || value.includes("/")) {
    throw new HttpsError("invalid-argument", `${name} is required`);
  }
  return value;
}

export const takeDownEntry = onCall(
  { cors: ALLOWED_ORIGINS, secrets: ["ADMIN_UID"], timeoutSeconds: 120 },
  async (req) => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);
    const data = (req.data ?? {}) as { tournamentId?: unknown; contestantId?: unknown; reason?: unknown };
    const tournamentId = requireId(data.tournamentId, "tournamentId");
    const contestantId = requireId(data.contestantId, "contestantId");
    const bucket = adminStorage.bucket();
    try {
      return await takeDown(
        adminDb,
        {
          nowMs: Date.now(),
          timestamp: (ms) => Timestamp.fromMillis(ms),
          deleteField: () => FieldValue.delete(),
          deleteFile: async (path) => {
            await bucket.file(path).delete({ ignoreNotFound: true });
          },
        },
        { tournamentId, contestantId, reason: data.reason, byUid: req.auth!.uid },
      );
    } catch (e) {
      if (e instanceof EntryTakedownError) {
        const kind = e.code === CODES.NOT_FOUND ? "not-found" : e.code === CODES.REASON_REQUIRED ? "invalid-argument" : "failed-precondition";
        throw new HttpsError(kind, e.code, { code: e.code });
      }
      throw e;
    }
  },
);
