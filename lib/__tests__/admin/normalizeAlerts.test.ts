/**
 * normalizeAlerts — raw admin_alerts docs → display-ready AdminAlertView[]
 * (handoff §4.4, §6.6, §11.2). Pure, node-env.
 *
 * Rules under test:
 *   - severity: resolved → "dismissed"; explicit `severity` wins; else map the
 *     anomaly type (T-1/T-2 → medium, T-3 → high, T-4 → low) — §6.6.
 *   - dedup by id (first wins)
 *   - drop dismissed alerts older than 24h
 *   - sort high > medium > low > dismissed, then createdAt desc
 */
import { describe, expect, it } from "vitest";
import { normalizeAlerts } from "@/lib/admin/dashboard/normalizeAlerts";
import type { RawAdminAlert } from "@/lib/admin/dashboard/types";

const NOW = 1_700_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;

const raw = (over: Partial<RawAdminAlert>): RawAdminAlert => ({
  id: "x",
  type: "T-1",
  detail: "d",
  tournamentId: "t",
  createdAtMs: NOW - MIN,
  resolved: false,
  ...over,
});

describe("normalizeAlerts — severity mapping", () => {
  it("resolved docs become dismissed", () => {
    const [a] = normalizeAlerts([raw({ resolved: true })], NOW);
    expect(a.severity).toBe("dismissed");
  });

  it("maps anomaly type → severity (§6.6)", () => {
    const out = normalizeAlerts(
      [
        raw({ id: "1", type: "T-1" }),
        raw({ id: "2", type: "T-2" }),
        raw({ id: "3", type: "T-3" }),
        raw({ id: "4", type: "T-4" }),
      ],
      NOW,
    );
    const sev = Object.fromEntries(out.map((a) => [a.id, a.severity]));
    expect(sev["1"]).toBe("medium");
    expect(sev["2"]).toBe("medium");
    expect(sev["3"]).toBe("high");
    expect(sev["4"]).toBe("low");
  });

  it("explicit severity overrides the type default", () => {
    const [a] = normalizeAlerts([raw({ type: "T-1", severity: "high" })], NOW);
    expect(a.severity).toBe("high");
  });

  it("resolved beats an explicit severity (always dismissed)", () => {
    const [a] = normalizeAlerts(
      [raw({ severity: "high", resolved: true })],
      NOW,
    );
    expect(a.severity).toBe("dismissed");
  });
});

describe("normalizeAlerts — dedup + age filter", () => {
  it("dedupes by id (first wins)", () => {
    const out = normalizeAlerts(
      [raw({ id: "dup", detail: "first" }), raw({ id: "dup", detail: "second" })],
      NOW,
    );
    expect(out).toHaveLength(1);
    expect(out[0].detail).toBe("first");
  });

  it("drops dismissed alerts older than 24h", () => {
    const out = normalizeAlerts(
      [
        raw({ id: "old", resolved: true, createdAtMs: NOW - 25 * HOUR }),
        raw({ id: "recent", resolved: true, createdAtMs: NOW - 2 * HOUR }),
      ],
      NOW,
    );
    expect(out.map((a) => a.id)).toEqual(["recent"]);
  });

  it("keeps unresolved alerts regardless of age", () => {
    const out = normalizeAlerts(
      [raw({ id: "old", resolved: false, createdAtMs: NOW - 100 * HOUR })],
      NOW,
    );
    expect(out).toHaveLength(1);
  });
});

describe("normalizeAlerts — sort", () => {
  it("orders high > medium > low > dismissed, then newest first", () => {
    const out = normalizeAlerts(
      [
        raw({ id: "low", type: "T-4", createdAtMs: NOW - MIN }),
        raw({ id: "dismissed", resolved: true, createdAtMs: NOW - MIN }),
        raw({ id: "high", type: "T-3", createdAtMs: NOW - MIN }),
        raw({ id: "med-old", type: "T-1", createdAtMs: NOW - 5 * MIN }),
        raw({ id: "med-new", type: "T-1", createdAtMs: NOW - 1 * MIN }),
      ],
      NOW,
    );
    expect(out.map((a) => a.id)).toEqual([
      "high",
      "med-new",
      "med-old",
      "low",
      "dismissed",
    ]);
  });
});
