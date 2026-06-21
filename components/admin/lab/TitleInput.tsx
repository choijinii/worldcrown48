/**
 * TitleInput — Tournament title field with a live 50-char counter.
 *
 * Validation is the unit-tested `validateTitle`; this is the dark-themed shell
 * (AC Step1 #1). The counter turns crimson once the trimmed length hits the
 * cap. `maxLength` hard-caps typing; validateTitle still guards trimmed length.
 */
"use client";

import { validateTitle, TITLE_MAX } from "@/lib/lab/titleValidation";
import { lab } from "./theme";

interface TitleInputProps {
  value: string;
  onChange: (next: string) => void;
}

export function TitleInput({ value, onChange }: TitleInputProps): JSX.Element {
  const v = validateTitle(value);
  const atCap = v.remaining <= 0;

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
        Tournament 제목
      </span>
      <input
        type="text"
        value={value}
        maxLength={TITLE_MAX}
        onChange={(e) => onChange(e.target.value)}
        placeholder="예: Best Strikers of the Decade"
        aria-label="Tournament 제목"
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 8,
          border: `1px solid ${lab.border}`,
          background: lab.surface,
          color: lab.text,
          fontSize: 15,
          fontFamily: lab.font,
        }}
      />
      <span
        style={{
          display: "block",
          textAlign: "right",
          marginTop: 6,
          fontSize: 12,
          color: atCap ? lab.crimson : lab.textMuted,
        }}
        data-testid="title-counter"
      >
        {v.length}/{TITLE_MAX}
      </span>
    </label>
  );
}
