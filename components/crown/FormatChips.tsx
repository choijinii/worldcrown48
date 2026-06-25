/**
 * C-2 Crown Card · FormatChips — story / feed / link toggle.
 *
 * Wireframe `.sm-formats` (line 720-724). Three aria-pressed buttons that switch
 * the preview format (AC-3). Labels are fixed (non-translatable format names per
 * LANGUAGE.md §10 — Story/Feed/Link · ratios).
 */
"use client";

import { FORMAT_KEYS, type FormatKey } from "@/lib/crown/formats";
import styles from "./crown.module.css";

const CHIP_LABEL: Record<FormatKey, string> = {
  story: "Story · 9:16",
  feed: "Feed · 4:5",
  link: "Link · 1.91:1",
};

interface FormatChipsProps {
  fmt: FormatKey;
  onChange: (fmt: FormatKey) => void;
}

export function FormatChips({ fmt, onChange }: FormatChipsProps): JSX.Element {
  return (
    <div className={styles.smFormats} role="group" aria-label="Share format">
      {FORMAT_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          data-fmt={key}
          aria-pressed={key === fmt}
          onClick={() => onChange(key)}
        >
          {CHIP_LABEL[key]}
        </button>
      ))}
    </div>
  );
}
