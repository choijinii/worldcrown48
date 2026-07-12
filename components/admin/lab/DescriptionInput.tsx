/**
 * DescriptionInput — optional "참가 대상" blurb (STEP 1 ③, B-2).
 *
 * Optional (never gates 다음). Entered in ONE language; translated to ko/en/es
 * at publish (translateTournamentMeta) and stored as description{ko,en,es}. The
 * text also feeds the ✨AI keyword + AI-fill prompts as an extra hint.
 */
"use client";

import { lab } from "./theme";

const DESCRIPTION_MAX = 300;

interface DescriptionInputProps {
  value: string;
  onChange: (next: string) => void;
}

export function DescriptionInput({
  value,
  onChange,
}: DescriptionInputProps): JSX.Element {
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
        설명 <span style={{ color: lab.textMuted, fontWeight: 400 }}>· 선택</span>
      </span>
      <textarea
        value={value}
        maxLength={DESCRIPTION_MAX}
        onChange={(e) => onChange(e.target.value)}
        placeholder="어떤 참가자들의 Tournament인가요? (예: 2020년 이후 데뷔한 글로벌 4세대 K-POP 아이돌)"
        aria-label="Tournament 설명"
        rows={3}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 8,
          border: `1px solid ${lab.border}`,
          background: lab.surface,
          color: lab.text,
          fontSize: 14,
          lineHeight: 1.5,
          fontFamily: lab.font,
          resize: "vertical",
        }}
      />
    </label>
  );
}
