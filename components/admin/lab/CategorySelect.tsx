/**
 * CategorySelect — the 6-category dropdown (FOOTBALL · KPOP · ANIME · GAMING ·
 * MOVIE · OTHER), driven by the shared CATEGORIES enum (대표 결정 2026-06-20).
 *
 * Renders exactly the 6 official categories — never a single hard-coded sport
 * like "WORLD CUP 2026" (trap #4). Same enum as the G-1 admin console.
 */
"use client";

import { CATEGORIES, type Category } from "@/lib/types/tournament";
import { lab } from "./theme";

interface CategorySelectProps {
  value: Category | "";
  onChange: (next: Category) => void;
}

const LABELS: Record<Category, string> = {
  FOOTBALL: "⚽ Football",
  KPOP: "🎤 K-Pop",
  ANIME: "🎌 Anime",
  GAMING: "🎮 Gaming",
  MOVIE: "🎬 Movie",
  OTHER: "✨ Other",
};

export function CategorySelect({
  value,
  onChange,
}: CategorySelectProps): JSX.Element {
  return (
    <label style={{ display: "block", fontFamily: lab.font }}>
      <span
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: lab.textSub,
          marginBottom: 8,
        }}
      >
        카테고리
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Category)}
        aria-label="카테고리"
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 8,
          border: `1px solid ${lab.border}`,
          background: lab.surface,
          color: value ? lab.text : lab.textMuted,
          fontSize: 15,
          fontFamily: lab.font,
        }}
      >
        <option value="" disabled>
          카테고리 선택
        </option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c} style={{ color: "#000" }}>
            {LABELS[c]}
          </option>
        ))}
      </select>
    </label>
  );
}
