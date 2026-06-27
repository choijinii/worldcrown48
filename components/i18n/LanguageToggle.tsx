/**
 * LanguageToggle — 🌐 globe + dropdown locale switcher (ADR-0007, A1/B2).
 *
 * Lives in the global header, right side beside SIGN IN. Trigger shows
 * "🌐 KO" / "🌐 EN" (globe + current locale abbrev). Selecting an option
 * flips the i18n Context, rewrites `?lang=`, and syncs `<html lang>` via
 * useLocaleSync.
 *
 * a11y: ARIA listbox pattern (not a native <select>, per ADR-0007) so the
 * dropdown is keyboard-operable — Tab to focus, Enter/Space/Arrow to open,
 * ↑/↓ to move, Enter to pick, Escape to close, click-away to dismiss.
 * WAI-ARIA APG: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 */

"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Lang } from "@/lib/cookieConsent";
import { trackWithConsent } from "@/lib/analytics";
import { useLocaleSync } from "@/lib/useLocaleSync";
import { LOCALE_META, SUPPORTED_LOCALES } from "@/lib/locale";

export function LanguageToggle(): JSX.Element {
  const { lang, setLocale } = useLocaleSync();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const current = LOCALE_META[lang];
  const options = SUPPORTED_LOCALES;

  // Open with the active option highlighted.
  useEffect(() => {
    if (open) {
      const idx = options.indexOf(lang);
      setActiveIndex(idx === -1 ? 0 : idx);
    }
  }, [open, lang, options]);

  // Click-away closes the listbox.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (next: Lang) => {
    setOpen(false);
    if (next !== lang) {
      void trackWithConsent("cookie_lang_switch", {
        from: lang,
        to: next,
        surface: "global-header",
      });
      setLocale(next);
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + options.length) % options.length);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(options[activeIndex]);
    }
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }} data-testid="lang-toggle">
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`Language: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 36,
          padding: "0 12px",
          borderRadius: 10,
          border: "1px solid var(--color-border-soft, #E6EAF0)",
          background: "transparent",
          color: "var(--color-text-light, #0E0944)",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.02em",
          cursor: "pointer",
        }}
      >
        <span aria-hidden="true">🌐</span>
        <span>{current.abbrev}</span>
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Select language"
          tabIndex={-1}
          ref={(el) => el?.focus()}
          onKeyDown={onListKeyDown}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            margin: 0,
            padding: 4,
            listStyle: "none",
            minWidth: 140,
            borderRadius: 10,
            border: "1px solid var(--color-border-soft, #E6EAF0)",
            background: "#FFFFFF",
            boxShadow: "0 8px 24px rgba(14,9,68,0.12)",
            zIndex: 70,
          }}
        >
          {options.map((code, i) => {
            const meta = LOCALE_META[code];
            const selected = code === lang;
            const active = i === activeIndex;
            return (
              <li
                key={code}
                role="option"
                aria-selected={selected}
                data-testid={`lang-option-${code}`}
                onClick={() => pick(code)}
                onMouseEnter={() => setActiveIndex(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 7,
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: 13,
                  fontWeight: selected ? 700 : 500,
                  color: "var(--color-text-light, #0E0944)",
                  background: active ? "var(--color-gold-subtle, rgba(252,208,6,0.12))" : "transparent",
                  cursor: "pointer",
                }}
              >
                <span>{meta.label}</span>
                <span style={{ opacity: 0.6, fontSize: 11 }}>{meta.abbrev}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
