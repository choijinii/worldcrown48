/**
 * Step2Summary — STEP 2 상단 제목·설명 요약 + 인라인 수정 (B-2.1 UX).
 *
 * On STEP 2 the operator is heads-down filling 48 cells; this keeps the
 * Tournament's title/description in view and lets them fix a typo inline WITHOUT
 * bouncing back to STEP 1 (which would lose scroll position on the grid). Edits
 * mutate the same TournamentCreator state, so publish re-translates the corrected
 * text. Display mode shows the original input (one language); it is NOT localized
 * here — this is the authoring surface, not a Voter-facing read.
 */
"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/useT";
import { lab } from "./theme";
import { TitleInput } from "./TitleInput";
import { DescriptionInput } from "./DescriptionInput";

interface Step2SummaryProps {
  title: string;
  description: string;
  onTitleChange: (next: string) => void;
  onDescriptionChange: (next: string) => void;
}

export function Step2Summary({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: Step2SummaryProps): JSX.Element {
  const { t } = useT();
  const [editing, setEditing] = useState(false);

  return (
    <div
      data-testid="step2-summary"
      style={{
        padding: 16,
        borderRadius: 12,
        background: lab.surface,
        border: `1px solid ${lab.border}`,
        display: "grid",
        gap: editing ? 16 : 8,
      }}
    >
      {editing ? (
        <>
          <TitleInput value={title} onChange={onTitleChange} />
          <DescriptionInput value={description} onChange={onDescriptionChange} />
          <button
            type="button"
            onClick={() => setEditing(false)}
            data-testid="step2-summary-done"
            style={{
              justifySelf: "start",
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: lab.gold,
              color: "var(--color-bg-default)",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: lab.font,
              cursor: "pointer",
            }}
          >
            {t("lab.step2.editDone")}
          </button>
        </>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              data-testid="step2-summary-title"
              style={{ fontWeight: 800, fontSize: 18, wordBreak: "break-word" }}
            >
              {title}
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                color: description ? lab.textSub : lab.textMuted,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {description || t("lab.step2.noDescription")}
            </div>
            {/* LAB-UX-1 — 편집기에 원문만 보이는 것이 **정상**임을 못 박는다.
                2026-08-23 대표가 lang=es에서 제목이 한국어로 보이는 걸 결함으로
                보고했다. 실제로는 발행 시 번역 설계인데, 화면이 그 말을 안 했다. */}
            <div
              data-testid="step2-translate-note"
              style={{ marginTop: 8, fontSize: 11, color: lab.textMuted }}
            >
              {t("lab.step2.translateNote")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            data-testid="step2-summary-edit"
            style={{
              flexShrink: 0,
              padding: "6px 12px",
              borderRadius: 8,
              border: `1px solid ${lab.border}`,
              background: "transparent",
              color: lab.textSub,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: lab.font,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t("lab.step2.editMeta")}
          </button>
        </div>
      )}
    </div>
  );
}
