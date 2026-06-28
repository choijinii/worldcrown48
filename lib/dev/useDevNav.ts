/**
 * useDevNav — localStorage-backed on/off state + global Cmd/Ctrl+Shift+D
 * shortcut (ADR-0008). Thin React shell over the pure helpers in `./devNav`.
 *
 * Edge cases (handoff §8):
 *  #1 localStorage blocked (incognito strict) → persistence silently fails but
 *     the toggle still flips in-memory for the session, so the shortcut works.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEV_NAV_STORAGE_KEY,
  isDevNavShortcut,
  parseDevNavValue,
  serializeDevNavValue,
} from "./devNav";

export function useDevNav(): { enabled: boolean; toggle: () => void } {
  const [enabled, setEnabled] = useState(false);

  // Hydrate from localStorage after mount (SSR renders the off state).
  useEffect(() => {
    try {
      setEnabled(
        parseDevNavValue(window.localStorage.getItem(DEV_NAV_STORAGE_KEY)),
      );
    } catch {
      /* localStorage unavailable — stay off */
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((cur) => {
      const next = !cur;
      try {
        window.localStorage.setItem(
          DEV_NAV_STORAGE_KEY,
          serializeDevNavValue(next),
        );
      } catch {
        console.warn(
          "[dev-nav] localStorage unavailable — state will reset on reload.",
        );
      }
      return next;
    });
  }, []);

  // Global keyboard shortcut. Registered even while off, so the shortcut can
  // turn Dev Nav on from any page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isDevNavShortcut(e)) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return { enabled, toggle };
}
