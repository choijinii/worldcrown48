/**
 * AiBriefPanel — STEP 1 "AI에게 알려 줄 내용" 묶음 (LAB-FIX-4 · 원장 결정 A).
 *
 * 대회마다 AI에게 주는 정보를 한 자리에 모은다: 엔트리 단위(개인 · 팀 · 그 외) + 세 줄
 * (엔트리는 어떤 것인가 · 덧붙이는 정보 · 고르는 조건) + [AI에게 제안 받기] + 키워드(이미 AI 힌트로 쓰인다).
 * 팬에게 보이는 제목 · 설명 · 카테고리 · 마감은 묶음 밖에 그대로 둔다.
 *
 * [AI에게 제안 받기]는 제목 · 설명 · 카테고리를 읽어 단위와 세 줄을 **칸에 채울 뿐**이다 — 운영자가 고치거나
 * 그대로 둔다. 세 줄을 비워 둔 대회는 지금과 똑같이 움직인다.
 */
"use client";

import type { ReactNode } from "react";
import type { EntryUnit } from "@/lib/types/tournament";
import { AI_BRIEF_LIMITS, type AiBrief } from "@/lib/lab/aiBrief";
import { useT } from "@/lib/i18n/useT";
import type { MessageKey } from "@/lib/i18n/messages";
import { EntryUnitSelect } from "./EntryUnitSelect";
import { lab } from "./theme";

interface AiBriefPanelProps {
  entryUnit: EntryUnit;
  onEntryUnitChange: (next: EntryUnit) => void;
  brief: AiBrief;
  onBriefChange: (next: AiBrief) => void;
  onSuggest: () => void;
  suggestBusy: boolean;
  /** 제목 · 카테고리가 있어야 제안을 받을 수 있다. */
  canSuggest: boolean;
  /** 묶음 맨 아래 — 키워드 칩. */
  children?: ReactNode;
}

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: lab.textSub,
  marginBottom: 8,
} as const;

const fieldStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "var(--radius-border)",
  border: `1px solid ${lab.border}`,
  background: lab.surface,
  color: lab.text,
  fontSize: 14,
  lineHeight: 1.5,
  fontFamily: lab.font,
} as const;

const LINES: { field: keyof AiBrief; label: MessageKey; placeholder: MessageKey; multiline?: boolean }[] = [
  { field: "entry", label: "lab.brief.entryLabel", placeholder: "lab.brief.entryPlaceholder" },
  { field: "extra", label: "lab.brief.extraLabel", placeholder: "lab.brief.extraPlaceholder" },
  { field: "rules", label: "lab.brief.rulesLabel", placeholder: "lab.brief.rulesPlaceholder", multiline: true },
];

export function AiBriefPanel({
  entryUnit,
  onEntryUnitChange,
  brief,
  onBriefChange,
  onSuggest,
  suggestBusy,
  canSuggest,
  children,
}: AiBriefPanelProps): JSX.Element {
  const { t } = useT();
  const suggestEnabled = canSuggest && !suggestBusy;

  return (
    <section
      data-testid="lab-ai-brief"
      aria-labelledby="lab-ai-brief-title"
      style={{
        display: "grid",
        gap: 16,
        padding: "16px 18px",
        borderRadius: "var(--radius-border)",
        border: `1px solid ${lab.border}`,
        background: lab.surfaceElev,
        fontFamily: lab.font,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 240px" }}>
          <h2 id="lab-ai-brief-title" style={{ margin: 0, fontSize: 15, fontWeight: 800, color: lab.text }}>
            {t("lab.brief.title")}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: lab.textMuted, lineHeight: 1.5 }}>{t("lab.brief.lead")}</p>
        </div>
        <button
          type="button"
          onClick={onSuggest}
          disabled={!suggestEnabled}
          aria-busy={suggestBusy}
          data-testid="lab-brief-suggest"
          style={{
            padding: "8px 14px",
            borderRadius: "var(--radius-border)",
            border: `1px solid ${lab.gold}`,
            background: suggestBusy ? lab.goldSubtle : "transparent",
            color: lab.gold,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: lab.font,
            cursor: suggestEnabled ? "pointer" : "not-allowed",
            opacity: suggestEnabled || suggestBusy ? 1 : 0.45,
          }}
        >
          {t("lab.brief.suggest")}
        </button>
      </div>

      <EntryUnitSelect value={entryUnit} onChange={onEntryUnitChange} />

      {LINES.map(({ field, label, placeholder, multiline }) => (
        <label key={field} style={{ display: "block" }}>
          <span style={labelStyle}>{t(label)}</span>
          {multiline ? (
            <textarea
              value={brief[field]}
              maxLength={AI_BRIEF_LIMITS[field]}
              onChange={(e) => onBriefChange({ ...brief, [field]: e.target.value })}
              placeholder={t(placeholder)}
              rows={3}
              data-testid={`lab-brief-${field}`}
              style={{ ...fieldStyle, resize: "vertical" }}
            />
          ) : (
            <input
              value={brief[field]}
              maxLength={AI_BRIEF_LIMITS[field]}
              onChange={(e) => onBriefChange({ ...brief, [field]: e.target.value })}
              placeholder={t(placeholder)}
              data-testid={`lab-brief-${field}`}
              style={fieldStyle}
            />
          )}
        </label>
      ))}

      {children}
    </section>
  );
}
