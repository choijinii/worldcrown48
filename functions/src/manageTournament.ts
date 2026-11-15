/**
 * manageTournament — 대회 삭제 · 조기 마감 · 숨김 (ARENA-2 PR 3 · 원장 D-86). 관리자 전용 콜러블.
 *
 *   request.data: { action: "states", tournamentIds: string[] }   → { states: { [id]: { hasFans } } }
 *                 { action: "delete" | "closeEarly" | "hide" | "unhide", tournamentId: string }
 *
 * 거절은 HttpsError + details.code(tournamentAdmin.ts 의 코드) — 화면이 그 코드로 승인 문구를 고른다.
 * 브라우저에서 대회를 바로 지우는 길은 규칙에서 닫았다(firestore.rules) — 삭제는 이 함수로만.
 *
 * Security: requireAdmin 이 첫 줄(getAdminKpis 와 같은 방식 · ADMIN_UID 는 함수 쪽 비밀 값).
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb, adminStorage } from "./admin";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import { DRAFT_DIR_META } from "./core/entryImagePaths";
import { TOURNAMENT_ADMIN_ERROR_CODES as CODES } from "./core/tournamentAdmin";
import {
  TournamentAdminError,
  closeTournamentEarly,
  removeTournament,
  setTournamentVisibility,
  tournamentFanStates,
} from "./core/tournamentAdminStore";

const values = { timestamp: (ms: number) => Timestamp.fromMillis(ms), deleteField: () => FieldValue.delete() };

/** Lab 목록 한 번에 묻는 대회 수 상한 — 대회마다 집계 쿼리 1번. */
const MAX_STATE_IDS = 100;

type Action = "states" | "delete" | "closeEarly" | "hide" | "unhide";
const ACTIONS: readonly Action[] = ["states", "delete", "closeEarly", "hide", "unhide"];

function requireId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.includes("/")) {
    throw new HttpsError("invalid-argument", "tournamentId is required");
  }
  return value;
}

export const manageTournament = onCall(
  { cors: ALLOWED_ORIGINS, secrets: ["ADMIN_UID"], timeoutSeconds: 300 },
  async (req) => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);
    const actorUid = req.auth!.uid;
    const data = (req.data ?? {}) as { action?: unknown; tournamentId?: unknown; tournamentIds?: unknown };
    const action = data.action as Action;
    if (!ACTIONS.includes(action)) throw new HttpsError("invalid-argument", "unknown action");

    try {
      if (action === "states") {
        const ids = Array.isArray(data.tournamentIds) ? data.tournamentIds.map(requireId) : [];
        if (ids.length > MAX_STATE_IDS) throw new HttpsError("invalid-argument", "too many tournamentIds");
        return { states: await tournamentFanStates(adminDb, ids) };
      }
      const id = requireId(data.tournamentId);
      const nowMs = Date.now();
      if (action === "delete") {
        const bucket = adminStorage.bucket();
        return await removeTournament(adminDb, id, {
          nowMs,
          values,
          storage: {
            deletePrefix: (prefix) => bucket.deleteFiles({ prefix }),
            // 발행 복사가 대회 그림에 남긴 초안 폴더(finalizeEntryImages) — 파일 하나만 읽는다.
            draftDirOf: async (prefix) => {
              const [files] = await bucket.getFiles({ prefix, maxResults: 5 });
              for (const f of files) {
                const v = f.metadata?.metadata?.[DRAFT_DIR_META];
                if (typeof v === "string" && v) return v;
              }
              return null;
            },
          },
        });
      }
      if (action === "closeEarly") return await closeTournamentEarly(adminDb, id, { nowMs, actorUid, values });
      return await setTournamentVisibility(adminDb, id, action, { nowMs, actorUid, values });
    } catch (e) {
      if (e instanceof TournamentAdminError) {
        const kind = e.code === CODES.NOT_FOUND ? "not-found" : "failed-precondition";
        throw new HttpsError(kind, e.code, { code: e.code });
      }
      throw e;
    }
  },
);
