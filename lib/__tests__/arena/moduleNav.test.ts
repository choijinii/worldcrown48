/**
 * lib/arena/moduleNav — pure model behind the Arena ModuleNav (W-6).
 *
 * The ModuleNav.tsx component is thin glue (usePathname → resolveActiveTab →
 * render); ALL of its logic lives here so it is node-env vitest'd directly,
 * matching this codebase's pure-core + thin-glue pattern. Tab order, the
 * disabled Newsroom (C-4/C-5 unbuilt), href building, and active-tab detection
 * (trap #6: exact route match, not prefix) are covered here.
 */
import { describe, expect, it } from "vitest";
import {
  MODULE_TABS,
  moduleTabHref,
  resolveActiveTab,
  type ModuleTabKey,
} from "@/lib/arena/moduleNav";

describe("MODULE_TABS — the 4-tab strip (대표 결정: 6→4)", () => {
  it("is exactly VS Battle · Crown Card · Ranking · Newsroom, in order", () => {
    expect(MODULE_TABS.map((t) => t.key)).toEqual([
      "vs",
      "crown",
      "ranking",
      "newsroom",
    ]);
    expect(MODULE_TABS.map((t) => t.label)).toEqual([
      "VS Battle",
      "Crown Card",
      "Ranking",
      "Newsroom",
    ]);
  });

  it("disables ONLY Newsroom (C-4/C-5 unbuilt → Coming soon)", () => {
    const disabled = MODULE_TABS.filter((t) => t.disabled).map((t) => t.key);
    expect(disabled).toEqual(["newsroom"]);
  });
});

describe("moduleTabHref — /arena/{id} + subPath", () => {
  it("builds each route from a tournamentId", () => {
    const id = "t-123";
    const href = (k: ModuleTabKey) =>
      moduleTabHref(id, MODULE_TABS.find((t) => t.key === k)!);
    expect(href("vs")).toBe("/arena/t-123");
    expect(href("crown")).toBe("/arena/t-123/champion");
    expect(href("ranking")).toBe("/arena/t-123/ranking");
    expect(href("newsroom")).toBe("/arena/t-123/newsroom");
  });
});

describe("resolveActiveTab — exact route, not prefix (trap #6)", () => {
  it("maps the base arena route to VS Battle", () => {
    expect(resolveActiveTab("/arena/t-123")).toBe("vs");
  });
  it("maps each sub-route to its tab", () => {
    expect(resolveActiveTab("/arena/t-123/champion")).toBe("crown");
    expect(resolveActiveTab("/arena/t-123/ranking")).toBe("ranking");
    expect(resolveActiveTab("/arena/t-123/newsroom")).toBe("newsroom");
  });
  it("does NOT let the base route steal the active state from a sub-route", () => {
    // /arena/{id} is a prefix of every sub-route — a naive startsWith would
    // wrongly mark VS Battle active on /ranking.
    expect(resolveActiveTab("/arena/t-123/ranking")).not.toBe("vs");
  });
});
