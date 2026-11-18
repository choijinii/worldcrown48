/**
 * 기사 지면 → 조회 기록 콜러블 한 번 (PITCH-2 PR B).
 * 같은 브라우저 · 같은 기사는 1시간 로컬 메모로 다시 부르지 않는다. 저장소가 막혀도,
 * 콜러블이 실패해도 지면은 아무 일 없다(오류를 던지지도 콘솔에 남기지도 않는다).
 */
import { describe, expect, it, vi } from "vitest";
import { VIEW_MEMO_KEY, VIEW_MEMO_TTL_MS, recordArticleViewOnce } from "@/lib/news/recordArticleView";

function memStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => Array.from(m.keys())[i] ?? null,
    get length() {
      return m.size;
    },
  };
}

const T = 1_800_000_000_000;

describe("recordArticleViewOnce", () => {
  it("처음 열면 부르고 메모를 남긴다", async () => {
    const storage = memStorage();
    const call = vi.fn().mockResolvedValue(undefined);
    expect(await recordArticleViewOnce("20261118-pub001", { storage, call, now: () => T })).toBe(true);
    expect(call).toHaveBeenCalledWith("20261118-pub001");
    expect(JSON.parse(storage.getItem(VIEW_MEMO_KEY)!)).toEqual({ "20261118-pub001": T });
  });

  it("1시간 안에 다시 열면 부르지 않는다 · 1시간이 지나면 다시 부른다", async () => {
    const storage = memStorage();
    const call = vi.fn().mockResolvedValue(undefined);
    await recordArticleViewOnce("s1", { storage, call, now: () => T });
    expect(await recordArticleViewOnce("s1", { storage, call, now: () => T + VIEW_MEMO_TTL_MS - 1 })).toBe(false);
    expect(call).toHaveBeenCalledTimes(1);
    expect(await recordArticleViewOnce("s1", { storage, call, now: () => T + VIEW_MEMO_TTL_MS })).toBe(true);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("다른 기사는 따로 부르고, 지난 메모는 지운다", async () => {
    const storage = memStorage();
    const call = vi.fn().mockResolvedValue(undefined);
    await recordArticleViewOnce("old", { storage, call, now: () => T });
    await recordArticleViewOnce("new", { storage, call, now: () => T + VIEW_MEMO_TTL_MS + 1 });
    expect(call).toHaveBeenCalledTimes(2);
    expect(Object.keys(JSON.parse(storage.getItem(VIEW_MEMO_KEY)!))).toEqual(["new"]);
  });

  it("저장소가 없거나 깨져도 부른다", async () => {
    const call = vi.fn().mockResolvedValue(undefined);
    expect(await recordArticleViewOnce("s1", { storage: null, call, now: () => T })).toBe(true);
    const broken = memStorage();
    broken.setItem(VIEW_MEMO_KEY, "{not json");
    expect(await recordArticleViewOnce("s1", { storage: broken, call, now: () => T })).toBe(true);
    const throwing = memStorage();
    throwing.getItem = () => {
      throw new Error("blocked");
    };
    expect(await recordArticleViewOnce("s1", { storage: throwing, call, now: () => T })).toBe(true);
    expect(call).toHaveBeenCalledTimes(3);
  });

  it("콜러블이 실패해도 던지지 않고, 메모를 남기지 않아 다음에 다시 부른다", async () => {
    const storage = memStorage();
    const call = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue(undefined);
    const errSpy = vi.spyOn(console, "error");
    expect(await recordArticleViewOnce("s1", { storage, call, now: () => T })).toBe(false);
    expect(errSpy).not.toHaveBeenCalled();
    expect(await recordArticleViewOnce("s1", { storage, call, now: () => T + 1 })).toBe(true);
  });

  it("주소 이름이 틀리면 부르지 않는다", async () => {
    const call = vi.fn();
    expect(await recordArticleViewOnce("a/b", { storage: memStorage(), call, now: () => T })).toBe(false);
    expect(call).not.toHaveBeenCalled();
  });
});
