/**
 * EDITOR-FIX-1 — 자동 저장기: 입력이 멈춘 뒤 저장(디바운스) · 즉시 저장(flush) ·
 * 저장 직렬화 · 상태(저장 중/저장됨/실패) · 실패는 삼키지 않고 다시 시도 가능.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDraftAutosaver, type AutosaveStatus } from "@/lib/lab/draftAutosaver";

function setup(save = vi.fn(async (_s: string) => {})) {
  const statuses: AutosaveStatus[] = [];
  const saver = createDraftAutosaver<string>({
    save,
    delayMs: 1000,
    now: () => 42,
    onStatus: (s) => statuses.push(s),
  });
  return { saver, save, statuses };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("debounce", () => {
  it("saves once, with the latest value, after input stops", async () => {
    const { saver, save } = setup();
    saver.schedule("a");
    await vi.advanceTimersByTimeAsync(500);
    saver.schedule("ab");
    await vi.advanceTimersByTimeAsync(999);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("ab");
  });
});

describe("flush", () => {
  it("saves the pending value immediately and resolves when done", async () => {
    const { saver, save } = setup();
    saver.schedule("x");
    await saver.flush();
    expect(save).toHaveBeenCalledWith("x");
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("is a no-op with nothing pending", async () => {
    const { saver, save } = setup();
    await saver.flush();
    expect(save).not.toHaveBeenCalled();
  });

  it("waits for a save already in flight", async () => {
    let release!: () => void;
    const save = vi.fn(() => new Promise<void>((r) => (release = r)));
    const { saver } = setup(save);
    saver.schedule("x");
    await vi.advanceTimersByTimeAsync(1000);
    let done = false;
    void saver.flush().then(() => (done = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(false);
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
  });
});

describe("serialization", () => {
  it("never runs two saves at once (last write lands last)", async () => {
    const order: string[] = [];
    let active = 0;
    const save = vi.fn(async (s: string) => {
      active++;
      expect(active).toBe(1);
      await new Promise((r) => setTimeout(r, 300));
      order.push(s);
      active--;
    });
    const { saver } = setup(save);
    saver.schedule("1");
    void saver.flush();
    saver.schedule("2");
    void saver.flush();
    await vi.advanceTimersByTimeAsync(1000);
    expect(order).toEqual(["1", "2"]);
  });
});

describe("status", () => {
  it("goes saving → saved(at)", async () => {
    const { saver, statuses } = setup();
    saver.schedule("x");
    await saver.flush();
    expect(statuses).toEqual([{ kind: "saving" }, { kind: "saved", at: 42 }]);
  });

  it("reports a failure instead of swallowing it, and retry() re-saves", async () => {
    const save = vi
      .fn<(s: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("permission-denied"))
      .mockResolvedValueOnce(undefined);
    const { saver, statuses } = setup(save);
    saver.schedule("x");
    await saver.flush();
    expect(statuses.at(-1)).toEqual({ kind: "error" });
    await saver.retry();
    expect(save).toHaveBeenLastCalledWith("x");
    expect(statuses.at(-1)).toEqual({ kind: "saved", at: 42 });
  });

  it("retry() prefers a newer pending value over the failed one", async () => {
    const save = vi
      .fn<(s: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("x"))
      .mockResolvedValue(undefined);
    const { saver } = setup(save);
    saver.schedule("old");
    await saver.flush();
    saver.schedule("new");
    await saver.retry();
    expect(save).toHaveBeenLastCalledWith("new");
  });
});

describe("stop (발행 직전)", () => {
  it("drops pending input and waits for the in-flight save, then ignores schedule()", async () => {
    let release!: () => void;
    const save = vi.fn(() => new Promise<void>((r) => (release = r)));
    const { saver } = setup(save);
    saver.schedule("a");
    await vi.advanceTimersByTimeAsync(1000); // "a" in flight
    saver.schedule("b"); // pending
    let stopped = false;
    void saver.stop().then(() => (stopped = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(stopped).toBe(false);
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(stopped).toBe(true);
    saver.schedule("c");
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("resume() re-arms after stop", async () => {
    const { saver, save } = setup();
    await saver.stop();
    saver.resume();
    saver.schedule("z");
    await saver.flush();
    expect(save).toHaveBeenCalledWith("z");
  });
});
