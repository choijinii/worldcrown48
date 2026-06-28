import { describe, expect, it } from "vitest";
import {
  DEV_DOMAINS,
  DEV_NAV_STORAGE_KEY,
  isDevNavShortcut,
  parseDevNavValue,
  serializeDevNavValue,
} from "../../dev/devNav";

// Minimal shape of the bits of KeyboardEvent the matcher reads.
type KeyArgs = Partial<{
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  key: string;
  code: string;
}>;
const ev = (a: KeyArgs) => a as KeyboardEvent;

describe("isDevNavShortcut", () => {
  it("true for Cmd+Shift+D (Mac)", () => {
    expect(
      isDevNavShortcut(ev({ metaKey: true, shiftKey: true, code: "KeyD" })),
    ).toBe(true);
  });
  it("true for Ctrl+Shift+D (Windows)", () => {
    expect(
      isDevNavShortcut(ev({ ctrlKey: true, shiftKey: true, code: "KeyD" })),
    ).toBe(true);
  });
  it("false without Shift", () => {
    expect(
      isDevNavShortcut(ev({ metaKey: true, code: "KeyD" })),
    ).toBe(false);
  });
  it("false without Meta/Ctrl", () => {
    expect(isDevNavShortcut(ev({ shiftKey: true, code: "KeyD" }))).toBe(false);
  });
  it("false for a different key", () => {
    expect(
      isDevNavShortcut(ev({ metaKey: true, shiftKey: true, code: "KeyK" })),
    ).toBe(false);
  });
});

describe("parse/serialize dev nav value", () => {
  it("'1' → true, '0'/null/other → false", () => {
    expect(parseDevNavValue("1")).toBe(true);
    expect(parseDevNavValue("0")).toBe(false);
    expect(parseDevNavValue(null)).toBe(false);
    expect(parseDevNavValue("yes")).toBe(false);
  });
  it("serialize round-trips", () => {
    expect(parseDevNavValue(serializeDevNavValue(true))).toBe(true);
    expect(parseDevNavValue(serializeDevNavValue(false))).toBe(false);
  });
  it("storage key is the agreed constant", () => {
    expect(DEV_NAV_STORAGE_KEY).toBe("wc48_dev_nav");
  });
});

describe("DEV_DOMAINS", () => {
  it("lists exactly 7 domains", () => {
    expect(DEV_DOMAINS).toHaveLength(7);
  });
  it("Locker Room is disabled (MVP2)", () => {
    const locker = DEV_DOMAINS.find((d) => d.key === "locker-room");
    expect(locker).toBeDefined();
    expect(locker?.enabled).toBe(false);
  });
  it("every enabled domain has an absolute href", () => {
    for (const d of DEV_DOMAINS) {
      if (d.enabled) expect(d.href.startsWith("/")).toBe(true);
    }
  });
  it("includes the Launch Pad at /", () => {
    const launch = DEV_DOMAINS.find((d) => d.key === "launch-pad");
    expect(launch?.href).toBe("/");
    expect(launch?.enabled).toBe(true);
  });
});
