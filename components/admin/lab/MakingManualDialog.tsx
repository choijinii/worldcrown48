/**
 * [만들기 매뉴얼] 창 (IMAGE-1 PR 1 · 마티오 메모 → D-77 보충).
 *
 * 대회를 만드는 순서 5줄 + 꼭 지킬 것 7줄. 문구는 지시서 6절 승인표(2026-11-08) 그대로다.
 * 관리자 화면이라 배너 자리는 없다(원장 D-21). 닫기는 Escape · [닫기] · 바깥 누르기.
 */
"use client";

import FocusTrap from "focus-trap-react";
import { useT } from "@/lib/i18n/useT";
import { useEscapeClose } from "@/lib/ui/dismiss";
import type { MessageKey } from "@/lib/i18n/messages";
import { lab } from "./theme";

const STEPS: MessageKey[] = ["lab.manual.step1", "lab.manual.step2", "lab.manual.step3", "lab.manual.step4", "lab.manual.step5"];
const MUSTS: MessageKey[] = [
  "lab.manual.must1",
  "lab.manual.must2",
  "lab.manual.must3",
  "lab.manual.must4",
  "lab.manual.must5",
  "lab.manual.must6",
  "lab.manual.must7",
];

export function MakingManualDialog({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element | null {
  const { t } = useT();
  useEscapeClose(onClose, open);
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="making-manual-title"
      data-testid="making-manual"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={overlay}
    >
      <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, fallbackFocus: "#making-manual-close" }}>
        <div style={panel}>
          <h2 id="making-manual-title" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            {t("lab.manual.title")}
          </h2>
          <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8, fontSize: 13, lineHeight: 1.6 }}>
            {STEPS.map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ol>
          <h3 style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 800, color: lab.gold }}>{t("lab.manual.mustTitle")}</h3>
          <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8, fontSize: 13, lineHeight: 1.6 }}>
            {MUSTS.map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
          <button
            id="making-manual-close"
            type="button"
            onClick={onClose}
            data-testid="making-manual-close"
            style={primaryButton(true)}
          >
            {t("lab.embed.close")}
          </button>
        </div>
      </FocusTrap>
    </div>
  );
}

export const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1001,
  background: "rgba(0,0,31,0.72)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

export const panel: React.CSSProperties = {
  width: "100%",
  maxWidth: 620,
  maxHeight: "calc(100vh - 48px)",
  overflowY: "auto",
  display: "grid",
  gap: 14,
  background: lab.surface,
  border: `1px solid ${lab.border}`,
  borderRadius: "var(--radius-border)",
  padding: 32,
  fontFamily: lab.font,
  color: lab.text,
};

export function primaryButton(enabled: boolean): React.CSSProperties {
  return {
    justifySelf: "end",
    padding: "10px 20px",
    borderRadius: "var(--radius-border)",
    border: "none",
    background: enabled ? lab.gold : lab.surfaceElev,
    color: enabled ? "var(--color-bg-default)" : lab.textMuted,
    fontSize: 14,
    fontWeight: 800,
    fontFamily: lab.font,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}
