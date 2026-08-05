/**
 * resolveBracketSeed — the Arena's first-entry seed resolution (ADR-0007).
 *
 * The C-1 E2E failures (verdict 2026-08-04 §4) came from `setDoc` on this path
 * never settling: the Arena awaited it before first render, so a stalled Write
 * channel left the page on "불러오는 중…" forever with no error surface. These
 * tests pin the hardened contract: the seed is ALWAYS resolved promptly, and it
 * stays refresh-stable even when the server never acks.
 */
import { describe, it, expect, vi } from "vitest";
import { resolveBracketSeed, type SeedIO } from "@/lib/arena/bracketSeed";

const NEW = 4242;
const SERVER = 777;
const CACHED = 555;

function io(over: Partial<SeedIO> = {}): SeedIO {
  const cache = { value: null as number | null };
  return {
    read: vi.fn(async () => null),
    create: vi.fn(async () => {}),
    cacheGet: vi.fn(() => cache.value),
    cacheSet: vi.fn((s: number) => {
      cache.value = s;
    }),
    cacheClear: vi.fn(() => {
      cache.value = null;
    }),
    newSeed: vi.fn(() => NEW),
    timeoutMs: 20,
    ...over,
  };
}

const never = () => new Promise<void>(() => {});

describe("resolveBracketSeed", () => {
  it("adopts the server seed when the doc already exists", async () => {
    const i = io({ read: vi.fn(async () => SERVER) });
    const r = await resolveBracketSeed(i);
    expect(r).toEqual({ seed: SERVER, source: "server" });
    expect(i.create).not.toHaveBeenCalled();
    expect(i.cacheClear).toHaveBeenCalled();
  });

  it("creates a new seed when absent and the write acks", async () => {
    const i = io();
    const r = await resolveBracketSeed(i);
    expect(r).toEqual({ seed: NEW, source: "created" });
    expect(i.create).toHaveBeenCalledWith(NEW);
    expect(i.cacheClear).toHaveBeenCalled();
  });

  // THE regression the verdict identified: a write that never settles must not
  // block the caller. Previously this awaited forever.
  it("returns the seed when the write never settles, instead of hanging", async () => {
    const i = io({ create: vi.fn(never) });
    const r = await resolveBracketSeed(i);
    expect(r).toEqual({ seed: NEW, source: "pending-local" });
  });

  it("caches the seed BEFORE awaiting the write, so a refresh reuses it", async () => {
    const i = io({ create: vi.fn(never) });
    await resolveBracketSeed(i);
    expect(i.cacheSet).toHaveBeenCalledWith(NEW);
    expect(i.cacheClear).not.toHaveBeenCalled(); // still unconfirmed — keep it
  });

  it("reuses a cached seed on the next entry rather than reshuffling", async () => {
    const i = io({ create: vi.fn(never), cacheGet: vi.fn(() => CACHED) });
    const r = await resolveBracketSeed(i);
    expect(r.seed).toBe(CACHED);
    expect(i.newSeed).not.toHaveBeenCalled();
  });

  it("adopts the winner's seed when the create-once race is lost", async () => {
    const read = vi
      .fn<SeedIO["read"]>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(SERVER);
    const i = io({
      read,
      create: vi.fn(async () => {
        throw new Error("permission-denied");
      }),
    });
    const r = await resolveBracketSeed(i);
    expect(r).toEqual({ seed: SERVER, source: "server" });
    expect(i.cacheClear).toHaveBeenCalled();
  });

  it("still yields a usable seed when the create fails and the doc is absent", async () => {
    const i = io({
      create: vi.fn(async () => {
        throw new Error("unavailable");
      }),
    });
    const r = await resolveBracketSeed(i);
    expect(r).toEqual({ seed: NEW, source: "pending-local" });
  });

  // A read failure is a genuine load failure — the caller surfaces it.
  it("propagates a read rejection", async () => {
    const i = io({
      read: vi.fn(async () => {
        throw new Error("unavailable");
      }),
    });
    await expect(resolveBracketSeed(i)).rejects.toThrow();
  });

  it("never leaves the background write as an unhandled rejection", async () => {
    let reject!: (e: Error) => void;
    const i = io({ create: vi.fn(() => new Promise<void>((_, r) => (reject = r))) });
    const r = await resolveBracketSeed(i);
    expect(r.source).toBe("pending-local");
    reject(new Error("late failure"));
    await new Promise((res) => setTimeout(res, 5)); // would surface as unhandled
  });
});
