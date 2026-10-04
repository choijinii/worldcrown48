/**
 * crownRenderAlert — 카드 그리기 실패를 운영자 페이지 알림(admin_alerts)으로 남긴다 (CARD-FIX).
 *
 * 2026-09-27 부터 서버 Crown Card 가 `Cannot find module 'canvas'` 로 한 장도 안 만들어졌는데
 * 함수는 로그 한 줄만 남기고 끝나 아무도 몰랐다. 이 시험이 지키는 것:
 *   ① 실패하면 알림 1건이 생긴다
 *   ② 열린 알림이 있으면 새로 만들지 않고 횟수·마지막 시각만 갱신한다(차트 이상 징후 dedup 원칙)
 *   ③ 알림 쓰기가 실패해도 함수를 던지게 하지 않는다(영구 실패 무재시도 원칙 유지)
 */
import { describe, expect, it, vi } from "vitest";
import {
  CROWN_RENDER_ALERT_TYPE,
  planRenderFailureAlert,
  recordRenderFailure,
  type AlertStore,
} from "../core/crownRenderAlert";

const err = new Error("Cannot find module 'canvas'\nRequire stack:\n- /workspace/lib/core/canvasServer.js");
const base = { error: err, cardId: "uidA_t1", tournamentId: "t1" };

describe("planRenderFailureAlert", () => {
  it("열린 알림이 없으면 새 알림을 만든다 — type·severity high·detail = 오류 첫 줄 + cardId", () => {
    const plan = planRenderFailureAlert({ ...base, open: null });
    expect(plan.action).toBe("create");
    if (plan.action !== "create") return;
    expect(plan.doc).toEqual({
      type: CROWN_RENDER_ALERT_TYPE,
      severity: "high",
      detail: "Cannot find module 'canvas' · uidA_t1",
      tournamentId: "t1",
      cardId: "uidA_t1",
      count: 1,
      resolved: false,
    });
    expect(CROWN_RENDER_ALERT_TYPE).toBe("crown_card_render_failed");
  });

  it("열린 알림이 있으면 같은 문서를 갱신한다 — 횟수 +1, 최근 실패로 detail 교체", () => {
    const plan = planRenderFailureAlert({
      ...base,
      cardId: "uidB_t2",
      tournamentId: "t2",
      open: { id: "alert-1", count: 4 },
    });
    expect(plan).toEqual({
      action: "update",
      id: "alert-1",
      patch: {
        count: 5,
        detail: "Cannot find module 'canvas' · uidB_t2",
        tournamentId: "t2",
        cardId: "uidB_t2",
      },
    });
  });

  it("오류가 Error 가 아니어도 첫 줄을 쓴다 · 빈 오류는 'unknown error'", () => {
    expect(planRenderFailureAlert({ ...base, error: "boom\nmore", open: null })).toMatchObject({
      doc: { detail: "boom · uidA_t1" },
    });
    expect(planRenderFailureAlert({ ...base, error: undefined, open: null })).toMatchObject({
      doc: { detail: "unknown error · uidA_t1" },
    });
  });

  it("count 가 없거나 이상한 옛 문서도 1부터 다시 센다", () => {
    const plan = planRenderFailureAlert({ ...base, open: { id: "a", count: Number.NaN } });
    expect(plan).toMatchObject({ action: "update", patch: { count: 2 } });
  });
});

/** 메모리 위의 가짜 저장소 — 한 번에 하나의 열린 알림만 돌려준다(실제는 resolved=false 질의). */
function fakeStore(initialOpen: { id: string; count: number } | null = null) {
  const created: Array<Record<string, unknown>> = [];
  const updated: Array<{ id: string; patch: Record<string, unknown> }> = [];
  let open = initialOpen;
  const store: AlertStore = {
    findOpen: vi.fn(async () => open),
    create: vi.fn(async (doc) => {
      created.push(doc);
      open = { id: `new-${created.length}`, count: Number(doc.count) };
    }),
    update: vi.fn(async (id, patch) => {
      updated.push({ id, patch });
      open = { id, count: Number(patch.count) };
    }),
  };
  return { store, created, updated };
}

describe("recordRenderFailure", () => {
  it("첫 실패 → 알림 1건 생성 · 두 번째 실패 → 같은 문서 갱신(새 문서 없음)", async () => {
    const { store, created, updated } = fakeStore();
    await recordRenderFailure(store, base);
    await recordRenderFailure(store, { ...base, cardId: "uidC_t1" });
    expect(created).toHaveLength(1);
    expect(updated).toEqual([
      { id: "new-1", patch: expect.objectContaining({ count: 2, cardId: "uidC_t1" }) },
    ]);
  });

  it("알림 쓰기가 실패해도 던지지 않는다 (함수는 지금처럼 재시도 없이 끝난다)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store: AlertStore = {
      findOpen: vi.fn(async () => {
        throw new Error("PERMISSION_DENIED");
      }),
      create: vi.fn(),
      update: vi.fn(),
    };
    await expect(recordRenderFailure(store, base)).resolves.toBeUndefined();
    expect(store.create).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("쓰기 단계에서 실패해도 던지지 않는다", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store: AlertStore = {
      findOpen: vi.fn(async () => null),
      create: vi.fn(async () => {
        throw new Error("UNAVAILABLE");
      }),
      update: vi.fn(),
    };
    await expect(recordRenderFailure(store, base)).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
