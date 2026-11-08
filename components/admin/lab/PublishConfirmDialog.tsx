/**
 * [토너먼트 생성] 확인창 (IMAGE-1 PR 1 · 마티오 메모 → D-77 보충).
 *
 * 발행 전 마지막 확인: 이름과 영상이 다를 수 있는 칸 번호(누르면 그 칸으로) · 체크 3칸 ·
 * 세 칸을 다 체크해야 [발행하기] 가 켜진다(publishConfirmReady). 문구는 6절 승인표 그대로.
 */
"use client";

import { Fragment, useEffect, useState } from "react";
import FocusTrap from "focus-trap-react";
import { useT } from "@/lib/i18n/useT";
import { useEscapeClose } from "@/lib/ui/dismiss";
import { SPLIT_SENTINEL, splitAround } from "@/lib/i18n/splitAround";
import { publishConfirmReady } from "@/lib/lab/nameVideoMismatch";
import type { MessageKey } from "@/lib/i18n/messages";
import { overlay, panel, primaryButton } from "./MakingManualDialog";
import { lab } from "./theme";

const CHECKS: MessageKey[] = ["lab.confirm.check1", "lab.confirm.check2", "lab.confirm.check3"];

export interface PublishConfirmDialogProps {
  open: boolean;
  /** 이름↔영상 불일치 칸(0부터). */
  mismatch: readonly number[];
  onGoTo: (index: number) => void;
  onBack: () => void;
  onPublish: () => void;
  onManual: () => void;
}

export function PublishConfirmDialog({
  open,
  mismatch,
  onGoTo,
  onBack,
  onPublish,
  onManual,
}: PublishConfirmDialogProps): JSX.Element | null {
  const { t } = useT();
  const [checks, setChecks] = useState([false, false, false]);
  useEffect(() => {
    if (open) setChecks([false, false, false]);
  }, [open]);
  useEscapeClose(onBack, open);
  if (!open) return null;
  const ready = publishConfirmReady(checks);

  // 번호 자리에 가르는 글자를 넣어 그린 뒤, 그 자리에 누르는 번호 버튼을 끼운다(어순은 언어마다 다르다).
  const [before, after] = splitAround(
    t("lab.confirm.warn", { n: mismatch.length, 번호: SPLIT_SENTINEL, numbers: SPLIT_SENTINEL, números: SPLIT_SENTINEL }),
  );

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="publish-confirm-title" data-testid="publish-confirm" style={overlay}>
      <FocusTrap focusTrapOptions={{ escapeDeactivates: false, fallbackFocus: "#publish-confirm-back" }}>
        <div style={panel}>
          <h2 id="publish-confirm-title" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            {t("lab.confirm.title")}
          </h2>
          {mismatch.length > 0 && (
            <p
              data-testid="confirm-warn"
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.7,
                color: "color-mix(in srgb, var(--color-gold) 55%, var(--color-crimson))",
              }}
            >
              {before}
              {mismatch.map((i, k) => (
                <Fragment key={i}>
                  {k > 0 ? ", " : ""}
                  <button
                    type="button"
                    data-testid={`confirm-goto-${i}`}
                    onClick={() => onGoTo(i)}
                    style={{
                      padding: "0 4px",
                      border: "none",
                      background: "transparent",
                      color: "inherit",
                      font: "inherit",
                      fontWeight: 800,
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    {i + 1}
                  </button>
                </Fragment>
              ))}
              {after}
            </p>
          )}
          <div style={{ display: "grid", gap: 10 }}>
            {CHECKS.map((k, i) => (
              <label key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.5, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={checks[i]}
                  data-testid={`confirm-check-${i + 1}`}
                  onChange={(e) => setChecks((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
                  style={{ marginTop: 3, accentColor: lab.gold }}
                />
                {t(k)}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={onManual}
            data-testid="confirm-manual-again"
            style={{
              justifySelf: "start",
              padding: 0,
              border: "none",
              background: "transparent",
              color: lab.textSub,
              fontSize: 12,
              fontFamily: lab.font,
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            {t("lab.confirm.manualAgain")}
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <button
              id="publish-confirm-back"
              type="button"
              onClick={onBack}
              data-testid="confirm-back"
              style={{
                padding: "10px 16px",
                borderRadius: "var(--radius-border)",
                border: `1px solid ${lab.border}`,
                background: "transparent",
                color: lab.textSub,
                fontSize: 13,
                fontFamily: lab.font,
                cursor: "pointer",
              }}
            >
              {t("lab.confirm.back")}
            </button>
            <button
              type="button"
              onClick={onPublish}
              disabled={!ready}
              data-testid="confirm-publish"
              style={primaryButton(ready)}
            >
              {t("lab.confirm.publish")}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
