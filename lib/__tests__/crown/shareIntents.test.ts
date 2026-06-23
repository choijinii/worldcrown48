import { describe, it, expect, vi } from "vitest";
import { buildTweetIntent, canShareFiles, TWEET_HASHTAG } from "@/lib/crown/shareIntents";

/**
 * shareIntents — X intent URL + Web Share feature detection.
 * Ported from the wireframe shareX (line 1359-1366) and nativeShare
 * (line 1347-1358). Pure logic (handoff §11.2 — AC-7, AC-8).
 */
describe("buildTweetIntent", () => {
  it("targets the X intent endpoint", () => {
    const url = buildTweetIntent("M. Adeyemi", "worldcrown48.com");
    expect(url.startsWith("https://twitter.com/intent/tweet?")).toBe(true);
  });

  it("encodes the champion tweet text with the #WorldCrown48 hashtag", () => {
    const url = new URL(buildTweetIntent("M. Adeyemi", "worldcrown48.com"));
    expect(url.searchParams.get("text")).toBe(`M. Adeyemi is my Champion 👑 ${TWEET_HASHTAG}`);
  });

  it("encodes the share url as https://<host>", () => {
    const url = new URL(buildTweetIntent("Yuki", "worldcrown48.com"));
    expect(url.searchParams.get("url")).toBe("https://worldcrown48.com");
  });

  it("escapes special characters in the champion name (no intent injection)", () => {
    const url = new URL(buildTweetIntent("A & B #1", "worldcrown48.com"));
    expect(url.searchParams.get("text")).toBe(`A & B #1 is my Champion 👑 ${TWEET_HASHTAG}`);
    // raw query string must percent-encode the ampersand so it is one param
    expect(url.search).toContain("%23WorldCrown48");
  });
});

describe("canShareFiles (Web Share API feature detect)", () => {
  const file = { name: "wc48.png" };

  it("returns false when navigator is undefined (SSR / node)", () => {
    expect(canShareFiles(undefined, file)).toBe(false);
  });

  it("returns false when canShare is not implemented (desktop Chrome/Firefox)", () => {
    expect(canShareFiles({}, file)).toBe(false);
  });

  it("returns true when navigator.canShare({files}) is true (mobile)", () => {
    const nav = { canShare: vi.fn(() => true) };
    expect(canShareFiles(nav, file)).toBe(true);
    expect(nav.canShare).toHaveBeenCalledWith({ files: [file] });
  });

  it("returns false when navigator.canShare({files}) is false", () => {
    expect(canShareFiles({ canShare: () => false }, file)).toBe(false);
  });

  it("returns false (never throws) when canShare itself throws", () => {
    expect(canShareFiles({ canShare: () => { throw new Error("boom"); } }, file)).toBe(false);
  });
});
