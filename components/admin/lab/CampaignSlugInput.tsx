/**
 * CampaignSlugInput — optional 캠페인 이름표 field (STEP 1, below the title).
 *
 * UTM_RULES v1.0 A안(대표 승인 2026-08-31): the value becomes `utm_campaign` on
 * every share link made from this Tournament's Crown Card. Typing is normalized
 * on the spot (lowercase · space/hyphen → `_` · everything else dropped) so what
 * the host sees is exactly what GA will receive. Never gates 다음 — blank means
 * "use the normalized Tournament id" (campaignForTournament).
 */
"use client";

import { CAMPAIGN_SLUG_MAX, normalizeCampaignSlug } from "@/lib/lab/campaignSlugValidation";
import { useT } from "@/lib/i18n/useT";
import { lab } from "./theme";

interface CampaignSlugInputProps {
  value: string;
  onChange: (next: string) => void;
}

export function CampaignSlugInput({ value, onChange }: CampaignSlugInputProps): JSX.Element {
  const { t } = useT();

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
        {t("lab.campaignSlug.label")}{" "}
        <span style={{ color: lab.textMuted, fontWeight: 400 }}>
          · {t("lab.campaignSlug.optional")}
        </span>
      </span>
      <input
        type="text"
        value={value}
        maxLength={CAMPAIGN_SLUG_MAX}
        inputMode="text"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => onChange(normalizeCampaignSlug(e.target.value))}
        placeholder={t("lab.campaignSlug.placeholder")}
        aria-label={t("lab.campaignSlug.label")}
        data-testid="lab-campaign-slug"
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
          marginTop: 6,
          fontSize: 12,
          lineHeight: 1.5,
          color: lab.textMuted,
        }}
      >
        {t("lab.campaignSlug.hint")}
      </span>
    </label>
  );
}
