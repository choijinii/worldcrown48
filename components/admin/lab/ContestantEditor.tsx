/**
 * ContestantEditor — one editable node in the 48-grid (AC Step2 #2·#5·#6).
 *
 * Empty (no name) → dashed gold border + "+" affordance. Filled → solid
 * border. imageUrl is operator-entered only — the Cloud Function never
 * auto-downloads images (copyright, 불변 원칙 #6); it supplies imageSearchKeyword
 * as a hint the operator uses to find a licensed URL.
 */
"use client";

import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import { useT } from "@/lib/i18n/useT";
import { lab } from "./theme";

interface ContestantEditorProps {
  index: number;
  contestant: ContestantDraft;
  onChange: (index: number, patch: Partial<ContestantDraft>) => void;
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "4px 6px",
  borderRadius: 4,
  border: `1px solid ${lab.border}`,
  background: lab.surfaceElev,
  color: lab.text,
  fontSize: 11,
  fontFamily: lab.font,
  marginTop: 4,
};

export function ContestantEditor({
  index,
  contestant,
  onChange,
}: ContestantEditorProps): JSX.Element {
  const { t } = useT();
  const n = index + 1;
  const isEmpty = contestant.name.trim() === "";

  return (
    <div
      data-testid={`contestant-node-${index}`}
      data-empty={isEmpty}
      style={{
        background: lab.surface,
        borderRadius: 5,
        border: isEmpty
          ? `2px dashed ${lab.borderDashed}`
          : `1px solid ${lab.border}`,
        padding: 8,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          aspectRatio: "1 / 1",
          borderRadius: 4,
          background: lab.surfaceElev,
          backgroundImage: contestant.imageUrl
            ? `url(${contestant.imageUrl})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: lab.textMuted,
          fontSize: 22,
        }}
      >
        {!contestant.imageUrl && (isEmpty ? "+" : "🏆")}
      </div>

      <input
        value={contestant.name}
        onChange={(e) => onChange(index, { name: e.target.value })}
        placeholder={t("lab.contestant.namePlaceholder", { n })}
        aria-label={t("lab.contestant.nameAria", { n })}
        style={{ ...fieldStyle, fontWeight: 700, fontSize: 12 }}
      />
      <div style={{ display: "flex", gap: 4 }}>
        <input
          value={contestant.nationality}
          onChange={(e) => onChange(index, { nationality: e.target.value })}
          placeholder={t("lab.contestant.nationality")}
          aria-label={t("lab.contestant.nationalityAria", { n })}
          style={fieldStyle}
        />
        <input
          value={contestant.position}
          onChange={(e) => onChange(index, { position: e.target.value })}
          placeholder={t("lab.contestant.position")}
          aria-label={t("lab.contestant.positionAria", { n })}
          style={fieldStyle}
        />
      </div>
      <input
        value={contestant.imageUrl}
        onChange={(e) => onChange(index, { imageUrl: e.target.value })}
        placeholder={t("lab.contestant.imageUrl")}
        aria-label={t("lab.contestant.imageUrlAria", { n })}
        style={fieldStyle}
      />
      {contestant.imageSearchKeyword && (
        <span
          style={{ marginTop: 4, fontSize: 10, color: lab.textMuted }}
          title={t("lab.contestant.keywordHint")}
        >
          🔎 {contestant.imageSearchKeyword}
        </span>
      )}
    </div>
  );
}
