/**
 * ARENA-2 PR 3 (원장 D-86) — Lab 대회 목록 한 줄의 버튼 고르기 · 서버 거절 → 승인 문구.
 *
 * 원칙 ②: 참여한 팬이 있으면 [삭제] 자리가 [조기 마감]으로 바뀐다. 참여를 아직 모르면(불러오는 중 ·
 * 실패) 어느 쪽도 보이지 않는다 — 모르는 채로 [삭제]를 내밀지 않는다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/lib/i18n/messages";
import {
  TOURNAMENT_ADMIN_ERROR_CODES,
  adminFailureMessageKey,
  tournamentRowActions,
} from "@/lib/lab/tournamentAdmin";

const NOW = Date.UTC(2026, 10, 7, 3);
const FUTURE = NOW + 86_400_000;
const PAST = NOW - 1;
const row = (over: Partial<Parameters<typeof tournamentRowActions>[0]> = {}) =>
  tournamentRowActions({ hasFans: false, status: "active", deadlineMs: FUTURE, closedEarly: false, nowMs: NOW, ...over });

describe("tournamentRowActions — 줄마다 보이는 버튼", () => {
  it("참여 없음 → [삭제] · 공개 대회 → [숨기기]", () => {
    expect(row()).toEqual({ primary: "delete", visibility: "hide", canFeature: true, badges: [] });
  });

  it("참여 있음 · 마감 전 → [조기 마감]", () => {
    expect(row({ hasFans: true }).primary).toBe("closeEarly");
  });

  it("참여 있음 · 이미 마감 → 삭제도 조기 마감도 없음", () => {
    expect(row({ hasFans: true, deadlineMs: PAST }).primary).toBeNull();
  });

  it("참여를 아직 모르면 어느 쪽도 내밀지 않는다", () => {
    expect(row({ hasFans: undefined }).primary).toBeNull();
  });

  it("숨긴 대회 → [다시 보이기] · 대표 대회로 고를 수 없음 · 표시 '숨김'", () => {
    const r = row({ status: "hidden" });
    expect(r.visibility).toBe("unhide");
    expect(r.canFeature).toBe(false);
    expect(r.badges).toEqual(["hidden"]);
  });

  it("조기 마감한 대회 → 표시 '조기 마감'", () => {
    expect(row({ hasFans: true, deadlineMs: PAST, closedEarly: true }).badges).toEqual(["closedEarly"]);
  });

  it("공개도 숨김도 아닌 대회(draft) → 숨기기·다시 보이기 없음", () => {
    expect(row({ status: "draft" }).visibility).toBeNull();
  });
});

describe("adminFailureMessageKey — 서버 거절 → 승인 문구(⑦ · ⑧ · ⑮ · ⑰)", () => {
  it("참여가 생겨 삭제가 막히면 ⑧", () => {
    expect(adminFailureMessageKey("delete", TOURNAMENT_ADMIN_ERROR_CODES.HAS_FANS)).toBe("lab.list.toast.deleteHasFans");
  });
  it("발행 기사로 삭제가 막히면 ⑮", () => {
    expect(adminFailureMessageKey("delete", TOURNAMENT_ADMIN_ERROR_CODES.HAS_ARTICLE)).toBe("lab.list.toast.deleteHasArticle");
  });
  it("그 밖의 실패는 동작마다 기존·승인 실패 문구", () => {
    expect(adminFailureMessageKey("delete", undefined)).toBe("lab.list.toast.deleteFail");
    expect(adminFailureMessageKey("closeEarly", TOURNAMENT_ADMIN_ERROR_CODES.ALREADY_CLOSED)).toBe("lab.list.toast.closeEarlyFail");
    expect(adminFailureMessageKey("hide", undefined)).toBe("lab.list.toast.hideFail");
    expect(adminFailureMessageKey("unhide", undefined)).toBe("lab.list.toast.hideFail");
  });
});

describe("서버와 화면의 거절 코드가 같다", () => {
  it("functions/src/core/tournamentAdmin.ts 의 코드 표와 글자까지 같다", () => {
    const src = readFileSync(path.resolve(__dirname, "../../../functions/src/core/tournamentAdmin.ts"), "utf8");
    for (const [k, v] of Object.entries(TOURNAMENT_ADMIN_ERROR_CODES)) {
      expect(src, k).toContain(`${k}: "${v}"`);
    }
  });
});

describe("승인 문구 17개 (2026-11-07 대표 · outputs/ARENA-2_PR3_문구승인표_2026-11-07.md)", () => {
  const approved: Record<string, [string, string, string]> = {
    "lab.list.deleteNote": ["이 Tournament와 딸린 기록을 모두 지워요. 되돌릴 수 없어요.", "This deletes the Tournament and all its records. It can't be undone.", "Se eliminarán el Tournament y todos sus registros. No se puede deshacer."],
    "lab.list.closeEarly": ["조기 마감", "Close early", "Cerrar antes"],
    "lab.list.closeEarlyNote": ["마감 시각을 지금으로 당겨요. 진행 중인 팬은 끝까지 마칠 수 있고, 새로 시작할 수는 없어요. 되돌릴 수 없어요.", "This moves the deadline to now. Fans mid-run can finish, but no one can start a new run. It can't be undone.", "La fecha límite pasa a ahora. Los fans que ya empezaron pueden terminar, pero nadie puede empezar de nuevo. No se puede deshacer."],
    "lab.list.closeEarlyConfirm": ["조기 마감 확인", "Confirm close", "Confirmar cierre"],
    "lab.list.toast.closeEarlySuccess": ["조기 마감했어요.", "Closed early.", "Cerrado antes de tiempo."],
    "lab.list.toast.closeEarlyFail": ["조기 마감에 실패했어요.", "Couldn't close early.", "No se pudo cerrar."],
    "lab.list.toast.deleteHasFans": ["그사이 참여한 팬이 생겨 지울 수 없어요. 조기 마감을 써 주세요.", "Fans have joined, so it can't be deleted. Use Close early instead.", "Ya hay fans participando, así que no se puede eliminar. Usa Cerrar antes."],
    "lab.list.hide": ["숨기기", "Hide", "Ocultar"],
    "lab.list.hideNote": ["이 Tournament를 모든 화면에서 숨겨요. 기록은 지우지 않고, 다시 보이게 할 수 있어요.", "This hides the Tournament everywhere. Records are kept, and you can show it again.", "El Tournament se ocultará en todas partes. Los registros se conservan y puedes volver a mostrarlo."],
    "lab.list.unhide": ["다시 보이기", "Show again", "Mostrar de nuevo"],
    "lab.list.badge.closedEarly": ["조기 마감", "Closed early", "Cerrado antes"],
    "lab.list.badge.hidden": ["숨김", "Hidden", "Oculto"],
    "lab.list.toast.hidden": ["숨겼어요.", "Hidden.", "Oculto."],
    "lab.list.toast.unhidden": ["다시 보이게 했어요.", "Visible again.", "Visible de nuevo."],
    "lab.list.toast.deleteHasArticle": ["이 Tournament를 다룬 발행 기사가 있어 지울 수 없어요. 기사를 먼저 내려 주세요.", "A published article covers this Tournament, so it can't be deleted. Unpublish the article first.", "Hay un artículo publicado sobre este Tournament, así que no se puede eliminar. Primero retira el artículo."],
    "lab.list.hideConfirm": ["숨기기 확인", "Confirm hide", "Confirmar"],
    "lab.list.toast.hideFail": ["바꾸지 못했어요.", "Couldn't update.", "No se pudo actualizar."],
  };
  for (const [key, [ko, en, es]] of Object.entries(approved)) {
    it(key, () => {
      expect((MESSAGES as Record<string, unknown>)[key]).toEqual({ ko, en, es });
    });
  }
  it("기존 [삭제] 문구는 그대로", () => {
    expect(MESSAGES["lab.list.delete"]).toEqual({ ko: "삭제", en: "Delete", es: "Eliminar" });
  });
});

describe("Lab 목록은 브라우저에서 대회를 지우지 않는다 (서버 함수로만)", () => {
  it("TournamentList 에 writeBatch 삭제 · deleteDoc 이 없다", () => {
    const src = readFileSync(path.resolve(__dirname, "../../../components/admin/lab/TournamentList.tsx"), "utf8");
    expect(src).not.toMatch(/batch\.delete\(/);
    expect(src).not.toMatch(/deleteDoc\(/);
  });
});
