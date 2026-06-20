import { describe, it, expect } from "vitest";
import { planFeaturedToggle } from "@/lib/lab/featuredToggle";

describe("planFeaturedToggle", () => {
  it("features the target when nothing is featured yet", () => {
    expect(planFeaturedToggle([], "B")).toEqual([{ id: "B", featured: true }]);
  });

  it("turns off the previous featured and turns on the target", () => {
    expect(planFeaturedToggle(["A"], "B")).toEqual([
      { id: "A", featured: false },
      { id: "B", featured: true },
    ]);
  });

  it("clears every other featured, leaving exactly one true", () => {
    const writes = planFeaturedToggle(["A", "B"], "C");
    expect(writes).toContainEqual({ id: "A", featured: false });
    expect(writes).toContainEqual({ id: "B", featured: false });
    expect(writes).toContainEqual({ id: "C", featured: true });
    expect(writes.filter((w) => w.featured)).toHaveLength(1);
  });

  it("does not re-write the target when it is already the sole featured", () => {
    expect(planFeaturedToggle(["X"], "X")).toEqual([]);
  });

  it("only emits off-writes for the stale ones when target already featured", () => {
    const writes = planFeaturedToggle(["A", "B", "C"], "B");
    expect(writes).toEqual([
      { id: "A", featured: false },
      { id: "C", featured: false },
    ]);
  });
});
