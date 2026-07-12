/**
 * DeadlinePicker — Tournament Deadline field (STEP 1 ⑤ · UX-3, B-2).
 *
 * Required. Preset chips (3/7/14일, default 7) + a date input for a custom day.
 * Validation reuses the tested validateDeadline (rejects past/미래 아님, §8 edge).
 * Deadline exists ONLY on the Tournament — there is NO Round Deadline (불변 원칙).
 */
"use client";

import {
  validateDeadline,
  presetDeadlineMs,
  DEADLINE_PRESETS_DAYS,
} from "@/lib/lab/deadlineValidation";
import { lab } from "./theme";

interface DeadlinePickerProps {
  value: number; // epoch ms
  onChange: (ms: number) => void;
  /** Reference "now" (parent passes Date.now()) — keeps presets + validation aligned. */
  nowMs: number;
}

/** ms → local yyyy-mm-dd for the date input. */
function toDateInput(ms: number): string {
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** yyyy-mm-dd → epoch ms at local end-of-day (so "today" isn't already past). */
function fromDateInput(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return NaN;
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

export function DeadlinePicker({
  value,
  onChange,
  nowMs,
}: DeadlinePickerProps): JSX.Element {
  const v = validateDeadline(value, nowMs);

  return (
    <div style={{ fontFamily: lab.font }}>
      <span
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: lab.textSub,
          marginBottom: 8,
        }}
      >
        Tournament Deadline <span style={{ color: lab.gold }}>*</span>
      </span>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {DEADLINE_PRESETS_DAYS.map((days) => {
          const ms = presetDeadlineMs(nowMs, days);
          const active = toDateInput(ms) === toDateInput(value);
          return (
            <button
              key={days}
              type="button"
              onClick={() => onChange(ms)}
              data-testid={`deadline-preset-${days}`}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${active ? lab.gold : lab.border}`,
                background: active ? lab.goldSubtle : "transparent",
                color: active ? lab.gold : lab.textSub,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: lab.font,
              }}
            >
              {days}일 후
            </button>
          );
        })}
      </div>

      <input
        type="date"
        value={toDateInput(value)}
        min={toDateInput(nowMs)}
        onChange={(e) => onChange(fromDateInput(e.target.value))}
        aria-label="Tournament Deadline 날짜"
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 8,
          border: `1px solid ${v.isValid ? lab.border : lab.crimson}`,
          background: lab.surface,
          color: lab.text,
          fontSize: 15,
          fontFamily: lab.font,
          colorScheme: "dark",
        }}
      />
      {!v.isValid && (
        <span
          style={{
            display: "block",
            marginTop: 6,
            fontSize: 12,
            color: lab.crimson,
          }}
        >
          {v.isMissing
            ? "Deadline 날짜를 선택해주세요."
            : "Deadline은 미래 날짜여야 합니다."}
        </span>
      )}
    </div>
  );
}
