"use client";

/**
 * [이미지 주소 한꺼번에 넣기] 창 (IMAGE-1 PR 2 · 원장 D-77 ③ URL 48줄).
 *
 * 모양은 영상의 [링크 직접 붙여넣기] 창(YouTubeInspectorModal)과 같다 — 제목 · 안내 · 큰 입력 칸 ·
 * 맨 아래 [취소] [칸에 넣기]. 한 줄에 주소 하나(최대 48줄), 그림이 없는 칸부터 칸 순서대로
 * PR 1 importEntryImage 를 한 줄씩 부른다(배선은 TournamentCreator). 실패한 줄은 창 안에
 * "{n}번째 줄: {이유}"로 남는다. 모두 들어가면 창이 닫힌다.
 */
import { useState } from "react";
import FocusTrap from "focus-trap-react";
import { useT } from "@/lib/i18n/useT";
import { useEscapeClose } from "@/lib/ui/dismiss";
import type { MessageKey } from "@/lib/i18n/messages";
import { lab } from "./theme";

export interface ImageLineFailure {
  line: number;
  reasonKey: MessageKey;
}

interface ImageLinksModalProps {
  onClose: () => void;
  /** 실패한 줄을 돌려준다(없으면 빈 목록). */
  onSubmit: (text: string) => Promise<ImageLineFailure[]>;
}

export function ImageLinksModal({ onClose, onSubmit }: ImageLinksModalProps): JSX.Element {
  const { t } = useT();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState<ImageLineFailure[] | null>(null);
  useEscapeClose(onClose, !busy);

  async function submit() {
    if (busy || !text.trim()) return;
    setBusy(true);
    try {
      const failed = await onSubmit(text);
      if (failed.length === 0) {
        onClose();
        return;
      }
      setFailures(failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-links-title"
      data-testid="image-links-modal"
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
      <FocusTrap focusTrapOptions={{ initialFocus: "#image-links-input", escapeDeactivates: false }}>
        <div
          style={{
            width: "100%",
            maxWidth: 880,
            maxHeight: "86vh",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            background: lab.surface,
            border: `1px solid ${lab.border}`,
            borderRadius: "var(--radius-border)",
            padding: 24,
            fontFamily: lab.font,
            color: lab.text,
          }}
        >
          <header>
            <h2 id="image-links-title" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              {t("lab.image.pasteLinks")}
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: lab.textSub }}>{t("lab.image.pasteHint")}</p>
          </header>

          <textarea
            id="image-links-input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFailures(null);
            }}
            disabled={busy}
            data-testid="image-links-input"
            rows={8}
            style={{
              width: "100%",
              resize: "vertical",
              padding: 12,
              borderRadius: "var(--radius-border)",
              border: `1px solid ${lab.border}`,
              background: lab.surfaceElev,
              color: lab.text,
              fontSize: 12,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              lineHeight: 1.6,
            }}
          />

          {failures && failures.length > 0 && (
            <ul
              data-testid="image-links-failures"
              style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4, fontSize: 12, color: lab.crimson }}
            >
              {failures.map((f) => (
                <li key={f.line} data-testid={`image-links-fail-${f.line}`}>
                  {t("lab.image.pasteLineFail", { n: f.line, reason: t(f.reasonKey) })}
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              data-testid="image-links-cancel"
              style={{
                padding: "10px 16px",
                borderRadius: "var(--radius-border)",
                border: `1px solid ${lab.border}`,
                background: "transparent",
                color: lab.textSub,
                fontSize: 13,
                fontFamily: lab.font,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {t("lab.source.confirm.cancel")}
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              data-testid="image-links-submit"
              style={{
                padding: "10px 18px",
                borderRadius: "var(--radius-border)",
                border: "none",
                background: busy ? lab.surfaceElev : lab.gold,
                color: busy ? lab.textMuted : "var(--color-bg-default)",
                fontSize: 13,
                fontWeight: 800,
                fontFamily: lab.font,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {t("lab.image.pasteSubmit")}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
