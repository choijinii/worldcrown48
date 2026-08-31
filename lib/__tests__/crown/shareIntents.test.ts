import { describe, it, expect, vi } from "vitest";
import { buildTweetIntent, canShareFiles, withShareUtm, TWEET_HASHTAG } from "@/lib/crown/shareIntents";

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

  it("encodes the share url as https://<host> with the X share UTM tags (2026-08-29, marketing-instrumentation-kick.md ②; utm_campaign/content 2026-08-31 UTM_RULES v1.0)", () => {
    const url = new URL(buildTweetIntent("Yuki", "worldcrown48.com"));
    const shareUrl = new URL(url.searchParams.get("url")!);
    expect(shareUrl.origin + shareUrl.pathname).toBe("https://worldcrown48.com/");
    expect(shareUrl.searchParams.get("utm_source")).toBe("x");
    expect(shareUrl.searchParams.get("utm_medium")).toBe("share");
    // campaign을 안 넘기면 "토너먼트 밖 공유" → site (UTM_RULES v1.0 §1)
    expect(shareUrl.searchParams.get("utm_campaign")).toBe("site");
    expect(shareUrl.searchParams.get("utm_content")).toBe("crown_card");
  });

  it("carries the Tournament campaign (CrownData.campaign) into utm_campaign (UTM_RULES v1.0 A안, 2026-08-31)", () => {
    const url = new URL(buildTweetIntent("Yuki", "worldcrown48.com/arena/t1/champion", "best_stage_48"));
    const shareUrl = new URL(url.searchParams.get("url")!);
    expect(shareUrl.pathname).toBe("/arena/t1/champion");
    expect(shareUrl.searchParams.get("utm_campaign")).toBe("best_stage_48");
  });

  it("escapes special characters in the champion name (no intent injection)", () => {
    const url = new URL(buildTweetIntent("A & B #1", "worldcrown48.com"));
    expect(url.searchParams.get("text")).toBe(`A & B #1 is my Champion 👑 ${TWEET_HASHTAG}`);
    // raw query string must percent-encode the ampersand so it is one param
    expect(url.search).toContain("%23WorldCrown48");
  });
});

describe("withShareUtm", () => {
  it("appends utm_source/medium/campaign/content to a bare host (no campaign given → site)", () => {
    const url = withShareUtm("worldcrown48.com", "share_sheet");
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://worldcrown48.com/");
    expect(parsed.searchParams.get("utm_source")).toBe("share_sheet");
    expect(parsed.searchParams.get("utm_medium")).toBe("share");
    expect(parsed.searchParams.get("utm_campaign")).toBe("site");
    expect(parsed.searchParams.get("utm_content")).toBe("crown_card");
  });

  it("lets the caller vary utm_source per channel while medium/campaign/content stay fixed", () => {
    const x = new URL(withShareUtm("worldcrown48.com", "x"));
    const sheet = new URL(withShareUtm("worldcrown48.com", "share_sheet"));
    expect(x.searchParams.get("utm_source")).toBe("x");
    expect(sheet.searchParams.get("utm_source")).toBe("share_sheet");
    expect(x.searchParams.get("utm_medium")).toBe(sheet.searchParams.get("utm_medium"));
    expect(x.searchParams.get("utm_campaign")).toBe(sheet.searchParams.get("utm_campaign"));
    expect(x.searchParams.get("utm_content")).toBe(sheet.searchParams.get("utm_content"));
  });

  it("uses the given campaign verbatim and never re-derives it from the URL (2026-08-31 A안 — 대회 ID 파싱 방식 폐기)", () => {
    const parsed = new URL(withShareUtm("worldcrown48.com/arena/AbCd1234/champion", "share_sheet", "gen4_idol_48"));
    expect(parsed.searchParams.get("utm_campaign")).toBe("gen4_idol_48");
    // 빈 문자열은 site로 눌러 둔다 — utm_campaign이 빈 값으로 나가는 일이 없도록.
    const empty = new URL(withShareUtm("worldcrown48.com/arena/AbCd1234/champion", "share_sheet", ""));
    expect(empty.searchParams.get("utm_campaign")).toBe("site");
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
