/**
 * useKpis — getAdminKpis callable wrapped in a 60s poll (handoff §3, §4.2).
 *
 * The server cache is the source of truth (handoff §5 DON'T — no localStorage
 * KPI cache). We poll every 60s, expose a manual ↻ refresh, and flag the cards
 * STALE once 90s pass with no fresh OK response (pure `isStale`, unit-tested).
 *
 * Firebase wiring (getFunctionsInstance + httpsCallable) keeps this hook out of
 * node-env tests — its logic is verified via E2E; the stale math is the unit.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "@/lib/firebase";
import { track } from "@/lib/analytics";
import { isStale } from "./formatKpi";
import type { KpiSnapshot } from "./types";

const POLL_MS = 60_000;
const TICK_MS = 20_000; // re-evaluate "stale" a few times within the window

export type KpiStatus = "loading" | "loaded" | "stale" | "error";

export interface UseKpisResult {
  data: KpiSnapshot | null;
  status: KpiStatus;
  refresh: () => void;
}

export function useKpis(): UseKpisResult {
  const [data, setData] = useState<KpiSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [lastOkMs, setLastOkMs] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const inFlight = useRef(false);

  const fetchOnce = useCallback(
    async (source: "auto" | "manual") => {
      if (inFlight.current) return;
      inFlight.current = true;
      void track("admin_kpi_refresh", { source });
      try {
        const callable = httpsCallable<unknown, KpiSnapshot>(
          getFunctionsInstance(),
          "getAdminKpis",
        );
        const res = await callable({});
        setData(res.data);
        setLastOkMs(Date.now());
        setError(false);
      } catch {
        setError(true);
      } finally {
        inFlight.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    void fetchOnce("auto");
    const poll = setInterval(() => void fetchOnce("auto"), POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [fetchOnce]);

  const refresh = useCallback(() => {
    setNow(Date.now());
    void fetchOnce("manual");
  }, [fetchOnce]);

  let status: KpiStatus;
  if (data) status = isStale(lastOkMs, now) ? "stale" : "loaded";
  else if (error) status = "error";
  else status = "loading";

  return { data, status, refresh };
}
