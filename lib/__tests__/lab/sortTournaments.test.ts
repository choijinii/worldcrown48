import { describe, it, expect } from "vitest";
import { sortByCreatedAtDesc } from "@/lib/lab/sortTournaments";

// Firestore Timestamp-like — the helper reads toMillis()/seconds, never a real SDK.
const ts = (ms: number) => ({ toMillis: () => ms });

describe("sortByCreatedAtDesc (내 Tournament — 최신 등록 맨 위)", () => {
  it("orders newest createdAt first", () => {
    const rows = [
      { id: "a", createdAt: ts(100) },
      { id: "b", createdAt: ts(300) },
      { id: "c", createdAt: ts(200) },
    ];
    expect(sortByCreatedAtDesc(rows).map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("supports the {seconds} Timestamp shape too", () => {
    const rows = [
      { id: "a", createdAt: { seconds: 1 } },
      { id: "b", createdAt: { seconds: 5 } },
    ];
    expect(sortByCreatedAtDesc(rows).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("puts rows with a missing createdAt last (pending serverTimestamp)", () => {
    const rows = [
      { id: "a", createdAt: undefined },
      { id: "b", createdAt: ts(200) },
      { id: "c", createdAt: ts(100) },
    ];
    expect(sortByCreatedAtDesc(rows).map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the input array", () => {
    const rows = [
      { id: "a", createdAt: ts(1) },
      { id: "b", createdAt: ts(2) },
    ];
    const copy = [...rows];
    sortByCreatedAtDesc(rows);
    expect(rows).toEqual(copy);
  });
});
