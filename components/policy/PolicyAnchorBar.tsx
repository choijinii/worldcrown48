/**
 * PolicyAnchorBar — mobile-only sticky bottom <select> that jumps to
 * an h2 section by ID.
 *
 * The section list is derived client-side from the rendered DOM so it
 * stays in sync with whatever react-markdown emitted. We re-scan when
 * the active lang changes (different content = different sections).
 */

"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

interface SectionOption {
  id: string;
  label: string;
}

export function PolicyAnchorBar(): JSX.Element {
  const { lang } = useI18n();
  const [options, setOptions] = useState<SectionOption[]>([]);

  useEffect(() => {
    // Wait a tick so react-markdown has flushed to the DOM.
    const id = requestAnimationFrame(() => {
      const active = document.querySelector<HTMLElement>(
        `.policy-doc[data-lang="${lang}"]`,
      );
      const root = active ?? document;
      const headings = Array.from(
        root.querySelectorAll<HTMLHeadingElement>(".policy-section h2"),
      );
      setOptions(
        headings
          .filter((h) => h.id)
          .map((h) => ({ id: h.id, label: h.textContent ?? h.id })),
      );
    });
    return () => cancelAnimationFrame(id);
  }, [lang]);

  return (
    <div className="policy-anchor-bar">
      <select
        aria-label="Jump to section"
        defaultValue=""
        onChange={(e) => {
          const id = e.target.value;
          if (!id) return;
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          e.target.value = "";
        }}
      >
        <option value="">
          {lang === "ko" ? "섹션으로 이동…" : "Jump to section…"}
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
