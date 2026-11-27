/**
 * NEWS-0a 3-2 — 쌓인 시험 초안 나누기 · 지우기 규칙(scripts/ops/news-0a-test-drafts.lib.mjs).
 * 실서비스를 부르지 않는다 — 읽기 · 사본 · 지우기는 가짜.
 */
import { describe, expect, it, vi } from "vitest";
import { classifyDraft, runDeleteStep } from "../../../scripts/ops/news-0a-test-drafts.lib.mjs";

type T = { exists: boolean; e2e?: unknown; hostUid?: unknown };
const tmap = (o: Record<string, T>) => new Map(Object.entries(o));

describe("classifyDraft — 세 묶음 경계", () => {
  const ts = tmap({ real: { exists: true }, test: { exists: true, e2e: true }, seed: { exists: true, hostUid: "seed-op" }, gone: { exists: false } });
  const d = (o: Record<string, unknown>) => ({ status: "draft", origin: "event_open", ...o });
  it("시험 대회 · 없는 대회의 개막 · 결과 초안 = 지울 것", () => {
    expect(classifyDraft(d({ tournamentId: "test" }), ts).group).toBe("delete");
    expect(classifyDraft(d({ tournamentId: "gone" }), ts).group).toBe("delete");
    expect(classifyDraft(d({ origin: "event_champion", tournamentId: "nowhere" }), ts).group).toBe("delete");
  });
  it("외신 종합 · 손 초안 · 주간 초안은 대회와 상관없이 남길 것", () => {
    for (const origin of ["cron_press", "manual_ai", "manual_blank", "cron_weekly"]) {
      expect(classifyDraft(d({ origin, tournamentId: "test" }), ts).group).toBe("keep");
    }
  });
  it("실제 대회 = 남길 것 · 대회 id 없음 · 모르는 출처 · 시드 대회 = 판단이 서지 않는 것", () => {
    expect(classifyDraft(d({ tournamentId: "real" }), ts).group).toBe("keep");
    expect(classifyDraft(d({}), ts).group).toBe("unsure");
    expect(classifyDraft(d({ origin: "x", tournamentId: "test" }), ts).group).toBe("unsure");
    expect(classifyDraft(d({ tournamentId: "seed" }), ts).group).toBe("unsure");
  });
  it("초안이 아니면 어느 묶음에도 넣지 않는다", () => {
    expect(classifyDraft(d({ status: "published", tournamentId: "gone" }), ts).group).toBe("skip");
    expect(classifyDraft(d({ status: "archived", tournamentId: "gone" }), ts).group).toBe("skip");
  });
});

/** 가짜 저장소 — 기사 · 대회 · 지운 기록 · 일어난 순서. */
function fakeStore(articles: Record<string, Record<string, unknown>>, tournaments: Record<string, T>) {
  const docs = new Map(Object.entries(articles).map(([id, data]) => [id, { data, updateTime: "t1" }]));
  const order: string[] = [];
  const deps = {
    readArticles: vi.fn(async (ids: string[]) =>
      new Map(ids.map((id) => { const x = docs.get(id); return [id, x ? { exists: true, data: x.data, updateTime: x.updateTime, raw: x.data } : { exists: false }]; })),
    ),
    readTournaments: vi.fn(async (ids: string[]) => new Map(ids.map((id) => [id, tournaments[id] ?? { exists: false }]))),
    writeBackup: vi.fn(async (b: unknown[]) => { order.push(`backup:${b.length}`); }),
    deleteMany: vi.fn(async (items: { id: string; updateTime: string }[]) =>
      items.map((it) => {
        const x = docs.get(it.id);
        if (!x) return { id: it.id, ok: true }; // 이미 없음 — Firestore 지우기는 성공
        if (x.updateTime !== it.updateTime) return { id: it.id, ok: false, reason: "precondition" };
        docs.delete(it.id);
        order.push(`delete:${it.id}`);
        return { id: it.id, ok: true };
      }),
    ),
    sleep: vi.fn(async () => {}),
  };
  return { docs, order, deps };
}

describe("runDeleteStep — (가)만 지우고 다시 돌려도 안전", () => {
  const articles = {
    a1: { status: "draft", origin: "event_open", tournamentId: "gone1" },
    a2: { status: "draft", origin: "event_open", tournamentId: "t-e2e" },
    keepPress: { status: "draft", origin: "cron_press" },
    keepReal: { status: "draft", origin: "event_open", tournamentId: "real" },
    unsure: { status: "draft", origin: "event_open" },
    pub: { status: "published", origin: "event_open", tournamentId: "gone2" },
  };
  const tournaments = { "t-e2e": { exists: true, e2e: true }, real: { exists: true } };

  it("후보에 (나) · (다) · 발행 기사가 섞여 와도 (가)만 지운다 · 사본이 먼저", async () => {
    const s = fakeStore(articles, tournaments);
    const r = await runDeleteStep({ candidateIds: Object.keys(articles), ...s.deps, batchSize: 2 });
    expect(r).toMatchObject({ deleted: 2, backedUp: 2, failed: 0, skipped: 4 });
    expect(Array.from(s.docs.keys()).sort()).toEqual(["keepPress", "keepReal", "pub", "unsure"]);
    expect(s.order[0]).toBe("backup:2");
    expect((s.deps.writeBackup.mock.calls[0][0] as { id: string }[]).map((b) => b.id)).toEqual(["a1", "a2"]);
  });

  it("사본을 쓴 뒤 발행된 문서는 지우지 않는다", async () => {
    const s = fakeStore(articles, tournaments);
    s.deps.writeBackup.mockImplementation(async () => {
      s.docs.set("a1", { data: { ...articles.a1, status: "published" }, updateTime: "t2" });
    });
    const r = await runDeleteStep({ candidateIds: ["a1", "a2"], ...s.deps });
    expect(r.deleted).toBe(1);
    expect(s.docs.has("a1")).toBe(true);
    expect((r.skippedReasons as Record<string, number>)["초안 아님(발행 · 보관)"]).toBe(1);
  });

  it("지우는 순간 바뀐 문서(updateTime 다름)는 건너뛴다", async () => {
    const s = fakeStore(articles, tournaments);
    const orig = s.deps.readArticles.getMockImplementation()!;
    let calls = 0;
    s.deps.readArticles.mockImplementation(async (ids: string[]) => {
      calls += 1;
      const m = await orig(ids);
      if (calls === 2) s.docs.set("a2", { data: articles.a2, updateTime: "t9" }); // 다시 읽은 뒤 · 지우기 전에 바뀜
      return m;
    });
    const r = await runDeleteStep({ candidateIds: ["a1", "a2"], ...s.deps });
    expect(r.deleted).toBe(1);
    expect(s.docs.has("a2")).toBe(true);
    expect((r.skippedReasons as Record<string, number>)["지우는 순간 바뀜"]).toBe(1);
  });

  it("실패한 줄은 다시 시도하고 끝까지 실패하면 실패 건수로 센다", async () => {
    const s = fakeStore(articles, tournaments);
    let n = 0;
    const orig = s.deps.deleteMany.getMockImplementation()!;
    s.deps.deleteMany.mockImplementation(async (items: { id: string; updateTime: string }[]) => {
      n += 1;
      if (n === 1) return items.map((i) => ({ id: i.id, ok: false, reason: "unavailable" }));
      const out = [];
      for (const i of items) out.push(i.id === "a2" ? { id: i.id, ok: false, reason: "unavailable" } : (await orig([i]))[0]);
      return out;
    });
    const r = await runDeleteStep({ candidateIds: ["a1", "a2"], ...s.deps, retries: 2 });
    expect(r).toMatchObject({ deleted: 1, failed: 1, failedIds: ["a2"] });
  });

  it("두 번째로 돌리면 이미 없음으로 건너뛰고 지우는 것 0", async () => {
    const s = fakeStore(articles, tournaments);
    await runDeleteStep({ candidateIds: ["a1", "a2"], ...s.deps });
    const r = await runDeleteStep({ candidateIds: ["a1", "a2"], ...s.deps });
    expect(r).toMatchObject({ deleted: 0, backedUp: 0, skipped: 2, failed: 0 });
    expect((r.skippedReasons as Record<string, number>)["이미 없음"]).toBe(2);
  });
});
