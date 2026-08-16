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
import { buildThumbnailUrl } from "@/lib/embed/loopRange";
import { useT } from "@/lib/i18n/useT";
import { lab } from "./theme";

interface ContestantEditorProps {
  index: number;
  contestant: ContestantDraft;
  onChange: (index: number, patch: Partial<ContestantDraft>) => void;
  /** LAB-EV-1: 영상이 붙은 슬롯의 미세조정 열기. 없으면 버튼을 숨긴다. */
  onTune?: (index: number) => void;
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
  onTune,
}: ContestantEditorProps): JSX.Element {
  const { t } = useT();
  const n = index + 1;
  const isEmpty = contestant.name.trim() === "";
  // LAB-EV-1: 영상만 있는 슬롯도 그리드에서 비어 보이면 안 된다 — 유튜브 썸네일을
  // 미리보기로 쓴다(imageUrl은 건드리지 않는다. 라이선스된 스틸의 자리다).
  const videoId = contestant.videoId ?? "";
  const previewUrl = contestant.imageUrl || (videoId ? buildThumbnailUrl(videoId) : "");
  // The ✕ clears the WHOLE card (all fields, incl. the AI keyword hint) back to
  // an empty slot. Shown whenever the card holds anything to clear.
  const hasContent = [
    contestant.name,
    contestant.nationality,
    contestant.position,
    contestant.imageUrl,
    contestant.imageSearchKeyword,
  ].some((v) => v.trim() !== "");

  function clearCard() {
    onChange(index, {
      name: "",
      nationality: "",
      position: "",
      imageUrl: "",
      imageSearchKeyword: "",
    });
  }

  return (
    <div
      data-testid={`contestant-node-${index}`}
      data-empty={isEmpty}
      style={{
        position: "relative",
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
      {hasContent && (
        <button
          type="button"
          onClick={clearCard}
          data-testid={`contestant-clear-${index}`}
          aria-label={t("lab.contestant.clearAria", { n })}
          title={t("lab.contestant.clearAria", { n })}
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            zIndex: 1,
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            border: "none",
            background: "rgba(14,9,68,0.75)",
            color: lab.textSub,
            fontSize: 13,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      )}
      <div
        style={{
          aspectRatio: "1 / 1",
          borderRadius: 4,
          background: lab.surfaceElev,
          backgroundImage: previewUrl ? `url(${previewUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: lab.textMuted,
          fontSize: 22,
          position: "relative",
        }}
      >
        {!previewUrl && (isEmpty ? "+" : "🏆")}
        {videoId && onTune && (
          <button
            type="button"
            onClick={() => onTune(index)}
            data-testid={`contestant-tune-${index}`}
            aria-label={t("lab.embed.tuner.title", { n })}
            style={{
              position: "absolute",
              left: 4,
              bottom: 4,
              padding: "2px 6px",
              borderRadius: 999,
              border: `1px solid ${lab.border}`,
              background: "rgba(0,0,31,0.72)",
              color: lab.gold,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: lab.font,
              cursor: "pointer",
            }}
          >
            {t("lab.embed.tuner.open")}
          </button>
        )}
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
