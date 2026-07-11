/**
 * CategorySelect — the category dropdown, driven by the `categories` collection
 * DATA (TX-0), never a hard-coded tuple.
 *
 * This is an OPERATOR tool, so it lists EVERY category regardless of status
 * (live · scheduled · hidden) with the status label shown beside each name — the
 * Lab must let a Host build 2차·3차 (scheduled) content ahead of its public
 * launch, and keep FOOTBALL/GAMING/OTHER (hidden) reachable (handoff §3 item 4).
 * Voter-facing status filtering is the Pitch/Arena모듈 몫, not here.
 */
"use client";

import { selectCategories, CATEGORY_STATUSES, type CategoryDoc } from "@/lib/taxonomy/category";
import { lab } from "./theme";

interface CategorySelectProps {
  value: string;
  onChange: (next: string) => void;
  categories: CategoryDoc[];
}

/** Operator-facing status label (병기). */
const STATUS_LABEL: Record<CategoryDoc["status"], string> = {
  live: "live",
  scheduled: "scheduled",
  hidden: "hidden",
};

export function CategorySelect({
  value,
  onChange,
  categories,
}: CategorySelectProps): JSX.Element {
  // Operator sees all statuses, ordered by `order`.
  const options = selectCategories(categories, CATEGORY_STATUSES);

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
        onChange={(e) => onChange(e.target.value)}
        aria-label="카테고리"
        disabled={options.length === 0}
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
          {options.length === 0 ? "카테고리를 불러오지 못했습니다" : "카테고리 선택"}
        </option>
        {options.map((c) => (
          <option key={c.id} value={c.id} style={{ color: "#000" }}>
            {c.name.ko} · {STATUS_LABEL[c.status]}
          </option>
        ))}
      </select>
    </label>
  );
}
