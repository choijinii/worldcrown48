/**
 * useAlerts — listAdminAlerts callable in a 60s poll (handoff §3, §4.4).
 *
 * The callable returns flat wire docs; the pure `normalizeAlerts` (unit-tested)
 * derives severity, dedups, drops aged-out dismissed, and sorts. Dismiss is a
 * UI-only stub in this PR (handoff §5 DON'T — real write callable is a later
 * PR); `dismissLocally` flips a doc to dismissed in local state only.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "@/lib/firebase";
import { normalizeAlerts } from "./normalizeAlerts";
import type { AdminAlertView, RawAdminAlert } from "./types";

const POLL_MS = 60_000;

export type AlertsStatus = "loading" | "loaded" | "error";

export interface UseAlertsResult {
  alerts: AdminAlertView[];
  status: AlertsStatus;
  refresh: () => void;
  /** UI-only dismiss (no backend write this PR — TODO: dismissAdminAlert callable). */
  dismissLocally: (id: string) => void;
}

export function useAlerts(): UseAlertsResult {
  const [raw, setRaw] = useState<RawAdminAlert[] | null>(null);
  const [error, setError] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const inFlight = useRef(false);

  const fetchOnce = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const callable = httpsCallable<unknown, { alerts: RawAdminAlert[] }>(
        getFunctionsInstance(),
        "listAdminAlerts",
      );
      const res = await callable({});
      setRaw(res.data.alerts ?? []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void fetchOnce();
    const poll = setInterval(() => void fetchOnce(), POLL_MS);
    return () => clearInterval(poll);
  }, [fetchOnce]);

  const dismissLocally = useCallback((id: string) => {
    // UI-only: marks the doc resolved in local state. normalizeAlerts then auto-
    // hides a >24h-old dismissed row, so dismissing an aged alert removes it
    // rather than greying it — acceptable for this stub. The real dismiss
    // callable (later PR) will stamp a dismissedAt so the row greys consistently.
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  const merged: RawAdminAlert[] = (raw ?? []).map((a) =>
    dismissedIds.has(a.id) ? { ...a, resolved: true } : a,
  );
  const alerts = normalizeAlerts(merged, Date.now());

  const status: AlertsStatus = raw ? "loaded" : error ? "error" : "loading";

  return { alerts, status, refresh: fetchOnce, dismissLocally };
}
