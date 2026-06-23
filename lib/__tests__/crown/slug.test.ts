import { describe, it, expect } from "vitest";
import { slug, crownFileName } from "@/lib/crown/slug";

/**
 * slug — filesystem-safe Champion slug for the download filename
 * (wireframe line 1095, 1342). Pure (handoff §3).
 */
describe("slug", () => {
  it("keeps alphanumerics and collapses runs of other chars to single dashes", () => {
    expect(slug("M. Adeyemi")).toBe("M-Adeyemi");
    expect(slug("Son Heung-min")).toBe("Son-Heung-min");
  });

  it("trims leading and trailing dashes", () => {
    expect(slug("¡Vamos!")).toBe("Vamos");
    expect(slug("  spaced  ")).toBe("spaced");
  });

  it("falls back to 'champion' for empty or all-symbol input", () => {
    expect(slug("")).toBe("champion");
    expect(slug("###")).toBe("champion");
  });

  it("drops non-ASCII letters (filename safety over fidelity)", () => {
    expect(slug("Édgar 손")).toBe("dgar");
  });
});

describe("crownFileName", () => {
  it("builds the WC48-Crown-{slug}-{fmt}.png filename", () => {
    expect(crownFileName("M. Adeyemi", "story")).toBe("WC48-Crown-M-Adeyemi-story.png");
    expect(crownFileName("", "link")).toBe("WC48-Crown-champion-link.png");
  });
});
