/**
 * Pure-logic tests for the colour-regression harness (TOK-1).
 *
 * The runnable comparer is `scripts/visual-diff/compare-colors.mjs` (drives two
 * Playwright pages). Its snapshot-diffing logic lives in
 * `compare-colors.lib.mjs` so it unit-tests here with no browser — same
 * "pure logic in a testable module" split as the hex guard.
 */
import { describe, expect, it } from "vitest";
import {
  COLOUR_PROPS,
  diffSnapshots,
  summarise,
} from "../../scripts/visual-diff/compare-colors.lib.mjs";

const row = (p: string, over: Record<string, string> = {}) => ({
  p,
  t: "DIV",
  color: "rgb(242, 242, 245)",
  backgroundColor: "rgba(0, 0, 0, 0)",
  ...over,
});

describe("COLOUR_PROPS", () => {
  it("covers every property a colour swap could move", () => {
    for (const p of [
      "color",
      "backgroundColor",
      "borderTopColor",
      "borderRightColor",
      "borderBottomColor",
      "borderLeftColor",
      "outlineColor",
      "fill",
      "stroke",
      "boxShadow",
      "backgroundImage",
    ]) {
      expect(COLOUR_PROPS).toContain(p);
    }
  });
});

describe("diffSnapshots", () => {
  it("reports no differences for identical snapshots", () => {
    const snap = [row("body"), row("body/0:P")];
    const r = diffSnapshots(snap, snap);
    expect(r.comparable).toBe(true);
    expect(r.diffs).toEqual([]);
    expect(r.count).toBe(2);
  });

  it("reports the element, property and both values on a mismatch", () => {
    const base = [row("body/0:P", { color: "rgb(14, 9, 68)" })];
    const head = [row("body/0:P", { color: "rgb(0, 0, 0)" })];
    expect(diffSnapshots(base, head).diffs).toEqual([
      {
        path: "body/0:P",
        prop: "color",
        base: "rgb(14, 9, 68)",
        head: "rgb(0, 0, 0)",
      },
    ]);
  });

  // The box-shadow regression this harness actually caught: a token hoisted
  // into :root turned an invalid (and therefore absent) shadow into a real one.
  it("catches a shadow appearing where there was none", () => {
    const base = [row("body/0:HEADER", { boxShadow: "none" })];
    const head = [
      row("body/0:HEADER", {
        boxShadow: "rgba(36, 23, 84, 0.1) 0px 10px 30px 0px",
      }),
    ];
    const { diffs } = diffSnapshots(base, head);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].prop).toBe("boxShadow");
  });

  it("reports several differing properties on one element separately", () => {
    const base = [row("body", { color: "rgb(1, 1, 1)" })];
    const head = [
      row("body", { color: "rgb(2, 2, 2)", backgroundColor: "rgb(3, 3, 3)" }),
    ];
    expect(diffSnapshots(base, head).diffs.map((d) => d.prop)).toEqual([
      "color",
      "backgroundColor",
    ]);
  });

  it("refuses to compare when the two DOMs differ in size", () => {
    const r = diffSnapshots([row("body")], [row("body"), row("body/0:P")]);
    expect(r.comparable).toBe(false);
    expect(r.reason).toMatch(/1.*2|노드/);
    expect(r.diffs).toEqual([]);
  });

  it("flags a structural mismatch when paths diverge at the same index", () => {
    const r = diffSnapshots([row("body/0:P")], [row("body/0:SPAN")]);
    expect(r.comparable).toBe(false);
  });
});

describe("summarise", () => {
  it("passes only when every route compared and found nothing", () => {
    const s = summarise([
      { route: "/a", comparable: true, count: 10, diffs: [] },
      { route: "/b", comparable: true, count: 5, diffs: [] },
    ]);
    expect(s).toEqual({ ok: true, elements: 15, differences: 0, skipped: 0 });
  });

  it("fails when any route reports a difference", () => {
    const s = summarise([
      {
        route: "/a",
        comparable: true,
        count: 10,
        diffs: [{ path: "body", prop: "color", base: "a", head: "b" }],
      },
    ]);
    expect(s.ok).toBe(false);
    expect(s.differences).toBe(1);
  });

  // A route that could not be compared proves nothing — treating it as a pass
  // would let a regression through on exactly the page that failed to load.
  it("fails when a route could not be compared at all", () => {
    const s = summarise([
      { route: "/a", comparable: true, count: 10, diffs: [] },
      { route: "/b", comparable: false, reason: "로드 실패", diffs: [] },
    ]);
    expect(s.ok).toBe(false);
    expect(s.skipped).toBe(1);
  });
});
