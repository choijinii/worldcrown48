/**
 * The Lab E2E 공용 — 대회 목록의 관리자 함수 manageTournament (ARENA-2 PR 3 · 원장 D-86).
 *
 * Lab 대회 목록은 열리자마자 manageTournament("states")로 대회마다 참여 여부를 묻는다. 함수는 병합 뒤에
 * 배포되므로 미리보기 시험에서 진짜 주소를 부르면 브라우저가 실패 요청을 콘솔 오류로 남겨 "콘솔 오류 0"
 * 시험들이 깨진다. 그래서 Lab 을 여는 시험은 이 도우미로 **오가는 길만** 가로챈다 — 판정과 쓰기는 함수가
 * 부르는 같은 저장 코드(functions/src/core/tournamentAdminStore)를 admin SDK 로 그대로 돌린다(aiFill 가로채기와
 * 같은 방식 · 그쪽은 응답을 지어내지만 여기서는 진짜로 센다/지운다).
 *
 * 크라운 카드 그림 지우기는 하지 않는다(시험이 막 만든 대회엔 카드가 없다).
 */
import type { Page } from "@playwright/test";
import * as admin from "firebase-admin";
import {
  TournamentAdminError,
  closeTournamentEarly,
  removeTournament,
  setTournamentVisibility,
  tournamentFanStates,
} from "../functions/src/core/tournamentAdminStore";

function db(): admin.firestore.Firestore | null {
  if (admin.apps.length === 0) {
    const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
    if (!raw) return null;
    const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json) as admin.ServiceAccount) });
  }
  return admin.firestore();
}

const values = {
  timestamp: (ms: number) => admin.firestore.Timestamp.fromMillis(ms),
  deleteField: () => admin.firestore.FieldValue.delete(),
};

type Body = { data?: { action?: string; tournamentId?: string; tournamentIds?: string[] } };

/** onCall v2 응답 모양 — 성공은 `result`, 거절은 `error`(status · message · details). */
export async function stubManageTournament(page: Page): Promise<void> {
  await page.route("**/manageTournament*", async (route) => {
    const fs = db();
    const body = (route.request().postDataJSON() ?? {}) as Body;
    const d = body.data ?? {};
    const actorUid = process.env.TEST_UID ?? "e2e";
    const reply = (status: number, payload: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });
    if (!fs) return reply(200, { result: { states: {} } });
    try {
      const nowMs = Date.now();
      let result: unknown;
      if (d.action === "states") result = { states: await tournamentFanStates(fs, d.tournamentIds ?? []) };
      else if (d.action === "delete")
        result = await removeTournament(fs, d.tournamentId!, { nowMs, values, storage: { deletePrefix: async () => undefined } });
      else if (d.action === "closeEarly") result = await closeTournamentEarly(fs, d.tournamentId!, { nowMs, actorUid, values });
      else if (d.action === "hide" || d.action === "unhide")
        result = await setTournamentVisibility(fs, d.tournamentId!, d.action, { nowMs, actorUid, values });
      else return reply(400, { error: { status: "INVALID_ARGUMENT", message: "unknown action" } });
      return reply(200, { result });
    } catch (e) {
      if (e instanceof TournamentAdminError) {
        return reply(400, { error: { status: "FAILED_PRECONDITION", message: e.code, details: { code: e.code } } });
      }
      throw e;
    }
  });
}
