/**
 * ClearAllDialog — [모두 비우기] 확인 창 (LAB-FIX-4 · 원장 결정 C · 문구 §5 12~14).
 *
 * 엔트리 칸 전부(이름 · 덧붙이는 정보 · 국가 · 영상 · 이미지)를 비운다. 대회 제목 · 설명 · "AI에게 알려 줄 내용" ·
 * 대회 종류는 그대로다. 되돌릴 수 없으므로 처음 초점은 [취소]에 둔다 — Enter 한 번으로 지워지지 않게.
 */
"use client";

import FocusTrap from "focus-trap-react";
import { useT } from "@/lib/i18n/useT";
import { useEscapeClose } from "@/lib/ui/dismiss";
import { lab } from "./theme";

interface ClearAllDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export function ClearAllDialog({ onCancel, onConfirm }: ClearAllDialogProps): JSX.Element {
  const { t } = useT();
  useEscapeClose(onCancel);

  const button = {
    padding: "10px 16px",
    borderRadius: "var(--radius-border)",
    fontSize: 13,
    fontFamily: lab.font,
    cursor: "pointer",
  } as const;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-all-title"
      aria-describedby="clear-all-body"
      data-testid="lab-clear-all-dialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,31,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <FocusTrap focusTrapOptions={{ initialFocus: "#clear-all-cancel", escapeDeactivates: false }}>
        <div
          style={{
            width: "100%",
            maxWidth: 460,
            display: "grid",
            gap: 14,
            background: lab.surface,
            border: `1px solid ${lab.border}`,
            borderRadius: "var(--radius-border)",
            padding: 24,
            fontFamily: lab.font,
            color: lab.text,
          }}
        >
          <h2 id="clear-all-title" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            {t("lab.clearAll.button")}
          </h2>
          <p id="clear-all-body" style={{ margin: 0, fontSize: 13, color: lab.textSub, lineHeight: 1.6 }}>
            {t("lab.clearAll.body")}
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              id="clear-all-cancel"
              type="button"
              onClick={onCancel}
              data-testid="lab-clear-all-cancel"
              style={{ ...button, border: `1px solid ${lab.border}`, background: "transparent", color: lab.textSub }}
            >
              {t("lab.clearAll.cancel")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              data-testid="lab-clear-all-confirm"
              style={{ ...button, border: "none", background: lab.crimson, color: lab.text, fontWeight: 800 }}
            >
              {t("lab.clearAll.confirm")}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
