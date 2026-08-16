/**
 * Pure-logic tests for the hardcoded-hex guard (TOK-1, W4).
 *
 * The runnable guard is `scripts/check-hardcoded-hex.mjs` (walks the repo,
 * exits non-zero on violations). Its detection / allowlist / path-exclusion
 * logic lives in `check-hardcoded-hex.lib.mjs` so it unit-tests here with no
 * filesystem — matching the repo's "pure logic in a testable module"
 * convention (same shape as seed-preview.lib.mjs).
 *
 * Handoff §7: 가드 스크립트 자체를 순수 단위테스트로.
 * Handoff §8 edge cases are covered under "detection".
 */
import { describe, expect, it } from "vitest";
import {
  findHex,
  filterAllowlisted,
  findUnusedAllowlist,
  isScannedPath,
  scanContent,
} from "../../scripts/check-hardcoded-hex.lib.mjs";

describe("findHex — detection (§8 edge cases)", () => {
  it("finds a 6-digit hex", () => {
    expect(findHex("color: #0E0944;").map((h) => h.hex)).toEqual(["#0E0944"]);
  });

  it("is case-insensitive — lower and upper both count", () => {
    expect(findHex("a #fcd006 b #FCD006").map((h) => h.hex)).toEqual([
      "#fcd006",
      "#FCD006",
    ]);
  });

  it("finds 3-digit shorthand", () => {
    expect(findHex("border: 1px solid #fff;").map((h) => h.hex)).toEqual([
      "#fff",
    ]);
  });

  it("finds 4- and 8-digit forms (alpha)", () => {
    expect(findHex("#abcd").map((h) => h.hex)).toEqual(["#abcd"]);
    expect(findHex("#0E0944FF").map((h) => h.hex)).toEqual(["#0E0944FF"]);
  });

  it("finds every hex inside a composite value (box-shadow / gradient)", () => {
    const line =
      "box-shadow: 0 0 8px #FCD006, inset 0 1px #00001F; background: linear-gradient(#0E0944, #241754);";
    expect(findHex(line).map((h) => h.hex)).toEqual([
      "#FCD006",
      "#00001F",
      "#0E0944",
      "#241754",
    ]);
  });

  it("finds hex inside inline style objects and template literals", () => {
    expect(findHex('<div style={{ color: "#D7063A" }}>').map((h) => h.hex)).toEqual(
      ["#D7063A"],
    );
    expect(findHex("const g = `1px solid ${on ? '#FCD006' : '#2D1C5A'}`").map((h) => h.hex)).toEqual([
      "#FCD006",
      "#2D1C5A",
    ]);
  });

  it("reports the column so the CLI can print file:line:col", () => {
    expect(findHex("  color: #fff;")[0].column).toBe(10);
  });

  // False positives: a run of hex-ish characters that is not a colour length.
  it("ignores non-colour '#' tokens", () => {
    expect(findHex("href='/policy#section'")).toEqual([]);
    expect(findHex("// see #added and #de")).toEqual([]);
    expect(findHex("id=#1234567")).toEqual([]); // 7 digits is not a colour
  });
});

describe("isScannedPath — path exclusion (ADR-TOK-4)", () => {
  it("scans tsx and css under app/ and components/", () => {
    expect(isScannedPath("components/crown/crown.module.css")).toBe(true);
    expect(isScannedPath("app/account/page.tsx")).toBe(true);
  });

  it("skips docs/ · public/ · outputs/ (ADR-TOK-4)", () => {
    expect(isScannedPath("docs/design/colors_and_type.css")).toBe(false);
    expect(isScannedPath("public/logo.svg")).toBe(false);
    expect(isScannedPath("outputs/handoffs-staging/KICK.md")).toBe(false);
  });

  it("skips the token ledger itself — globals.css is where hex is allowed to live", () => {
    expect(isScannedPath("app/globals.css")).toBe(false);
  });

  it("skips build and dependency directories", () => {
    expect(isScannedPath("node_modules/x/y.css")).toBe(false);
    expect(isScannedPath(".next/static/a.css")).toBe(false);
  });

  it("skips agent worktrees — 리포 자신의 옛 사본이라 이미 고친 위반이 되살아난다", () => {
    // 로컬에서만 존재하는 트리라, 훑으면 CI(fresh checkout)와 결과가 갈린다.
    expect(isScannedPath(".claude/worktrees/foo/app/globals.css")).toBe(false);
    expect(isScannedPath(".claude/worktrees/foo/components/auth/LoginModal.tsx")).toBe(false);
  });

  it("skips extensions outside the sweep scope", () => {
    expect(isScannedPath("README.md")).toBe(false);
    expect(isScannedPath("components/admin/lab/theme.ts")).toBe(false);
  });
});

describe("scanContent — file → violations", () => {
  it("returns one violation per hex with 1-indexed line numbers", () => {
    const css = ["a {", "  color: #FCD006;", "}", ".b { background: #fff }"].join(
      "\n",
    );
    expect(scanContent("components/x.css", css)).toEqual([
      { file: "components/x.css", line: 2, column: 10, hex: "#FCD006" },
      { file: "components/x.css", line: 4, column: 18, hex: "#fff" },
    ]);
  });

  it("returns nothing for a fully tokenised file", () => {
    expect(scanContent("components/x.css", "a { color: var(--color-gold); }")).toEqual(
      [],
    );
  });
});

describe("filterAllowlisted — ADR-TOK-3 third-party brand colours", () => {
  const allowlist = {
    entries: [
      {
        file: "components/auth/SignInButton.tsx",
        hex: "#FBBC05",
        reason: "brand-fixed: Google 브랜드 팔레트",
      },
    ],
  };

  it("drops a violation matching an allowlist entry", () => {
    const v = [
      {
        file: "components/auth/SignInButton.tsx",
        line: 12,
        column: 5,
        hex: "#FBBC05",
      },
    ];
    expect(filterAllowlisted(v, allowlist)).toEqual([]);
  });

  it("matches the hex case-insensitively", () => {
    const v = [
      {
        file: "components/auth/SignInButton.tsx",
        line: 12,
        column: 5,
        hex: "#fbbc05",
      },
    ];
    expect(filterAllowlisted(v, allowlist)).toEqual([]);
  });

  it("keeps the same hex in a different file — the exception is per-file", () => {
    const v = [
      { file: "components/crown/Other.tsx", line: 3, column: 5, hex: "#FBBC05" },
    ];
    expect(filterAllowlisted(v, allowlist)).toHaveLength(1);
  });

  it("keeps a different hex in an allowlisted file — the exception is per-colour", () => {
    const v = [
      {
        file: "components/auth/SignInButton.tsx",
        line: 20,
        column: 5,
        hex: "#0E0944",
      },
    ];
    expect(filterAllowlisted(v, allowlist)).toHaveLength(1);
  });

  it("treats an empty or missing allowlist as no exceptions", () => {
    const v = [{ file: "a.tsx", line: 1, column: 1, hex: "#fff" }];
    expect(filterAllowlisted(v, { entries: [] })).toHaveLength(1);
    expect(filterAllowlisted(v, undefined)).toHaveLength(1);
  });
});

describe("findUnusedAllowlist — the exception list must not rot", () => {
  // An exception that no longer matches anything is a stale claim: the colour
  // was tokenised or the file moved, and the entry now silently widens the
  // guard's blind spot. Surfacing it keeps the list honest.
  const entry = {
    file: "components/auth/SignInButton.tsx",
    hex: "#FBBC05",
    reason: "brand-fixed",
  };

  it("reports an entry that matches no violation", () => {
    expect(findUnusedAllowlist([], { entries: [entry] })).toEqual([entry]);
  });

  it("reports nothing when the entry is still doing work", () => {
    const found = [
      {
        file: "components/auth/SignInButton.tsx",
        line: 9,
        column: 5,
        hex: "#FBBC05",
      },
    ];
    expect(findUnusedAllowlist(found, { entries: [entry] })).toEqual([]);
  });

  it("matches case-insensitively, like filterAllowlisted does", () => {
    const found = [
      {
        file: "components/auth/SignInButton.tsx",
        line: 9,
        column: 5,
        hex: "#fbbc05",
      },
    ];
    expect(findUnusedAllowlist(found, { entries: [entry] })).toEqual([]);
  });

  it("handles an empty or missing allowlist", () => {
    expect(findUnusedAllowlist([], { entries: [] })).toEqual([]);
    expect(findUnusedAllowlist([], undefined)).toEqual([]);
  });
});
