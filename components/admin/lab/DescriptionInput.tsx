/**
 * DescriptionInput — "참가 대상" blurb (STEP 1 ③, B-2).
 *
 * LAB-FIX-6 3-2(결정 H 가) — **필수**. 비면 [다음 →]이 꺼지고(isStep1NextReady) 이유 글이 보인다(크림슨).
 * 추가 지시 1(대표 2026-11-24): 이유 글 자리 = 칸 제목의 "필수" 바로 옆(전에는 칸 아래). 옛 주석: Optional (never gates 다음). Entered in ONE language; translated to ko/en/es
 * at publish (translateTournamentMeta) and stored as description{ko,en,es}. The
 * text also feeds the ✨AI keyword + AI-fill prompts as an extra hint.
 */
"use client";

import { useT } from "@/lib/i18n/useT";
import { lab } from "./theme";
import { FieldTag } from "./FieldTag";

const DESCRIPTION_MAX = 300;

interface DescriptionInputProps {
  value: string;
  onChange: (next: string) => void;
}

export function DescriptionInput({
  value,
  onChange,
}: DescriptionInputProps): JSX.Element {
  const { t } = useT();
  const missing = value.trim() === "";
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
        {t("lab.description.label")} <FieldTag kind="required">{t("lab.description.required")}</FieldTag>
        {missing && (
          <span data-testid="lab-description-missing" style={{ marginLeft: 8, fontWeight: 400, color: lab.crimson }}>
            {t("lab.description.missing")}
          </span>
        )}
      </span>
      <textarea
        value={value}
        maxLength={DESCRIPTION_MAX}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("lab.description.placeholder")}
        aria-label={t("lab.description.label")}
        aria-invalid={missing}
        data-testid="lab-description"
        rows={3}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: "var(--radius-border)",
          border: `1px solid ${missing ? lab.crimson : lab.border}`,
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
