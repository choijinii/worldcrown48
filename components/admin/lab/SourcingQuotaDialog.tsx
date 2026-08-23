/**
 * SourcingQuotaDialog — [🎬 동영상 생성] 앞의 쿼터 확인 창 (LAB-UX-1 B · 결정 3 유지).
 *
 * 예의가 아니라 **쿼터**다. search.list는 자체 버킷 하루 100콜이고 48명 소싱이
 * 그 절반을 쓴다(lib/embed/sourcing/quota). 운영자가 "오늘 몇 번 더 되는지"를 모른 채
 * 누르면 두 번째 Tournament가 통째로 막힌다. 견적은 드라이런(API 0콜)이라 창을 여는
 * 것 자체는 아무것도 소비하지 않는다.
 *
 * LAB-EV-2에서는 AutoSourceBar가 견적·실행·집계를 다 들고 있었다. 이제 체인이
 * 그 순서를 소유하므로(TournamentCreator) 이 파일에는 **그리는 일만** 남긴다.
 */
"use client";

import FocusTrap from "focus-trap-react";
import { useT } from "@/lib/i18n/useT";
import type { SourcingQuotaPreview } from "@/lib/lab/autoSource";
import { lab } from "./theme";

interface SourcingQuotaDialogProps {
  preview: SourcingQuotaPreview;
  onCancel: () => void;
  onRun: () => void;
}

export function SourcingQuotaDialog({
  preview,
  onCancel,
  onRun,
}: SourcingQuotaDialogProps): JSX.Element {
  const { t } = useT();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auto-source-title"
      data-testid="auto-source-confirm"
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
      <FocusTrap
        focusTrapOptions={{
          initialFocus: "#auto-source-run",
          escapeDeactivates: true,
          // focus-trap-react는 onDeactivate를 생성 시점에 얼린다
          // ([[feedback-focustrap-frozen-ondeactivate]]). 이 컴포넌트는 창이 열려
          // 있는 동안만 마운트되고 onCancel은 부모에서 안정적이라 얼어도 안전하다.
          onDeactivate: onCancel,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 460,
            display: "grid",
            gap: 14,
            background: lab.surface,
            border: `1px solid ${lab.border}`,
            borderRadius: 16,
            padding: 24,
            fontFamily: lab.font,
            color: lab.text,
          }}
        >
          <h2 id="auto-source-title" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            {t("lab.source.confirm.title")}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: lab.textSub, lineHeight: 1.6 }}>
            {t("lab.source.confirm.slots", {
              n: preview.quota.searchableSlots,
              cached: preview.quota.cachedSlots,
            })}
            <br />
            <span style={{ color: lab.textMuted }}>
              {t("lab.source.confirm.quota", {
                searches: preview.quota.estimate.searchCalls,
                remaining: preview.quota.remaining.searchCalls,
              })}
            </span>
          </p>
          <p style={{ margin: 0, fontSize: 12, color: lab.textMuted, lineHeight: 1.6 }}>
            {t("lab.source.hint")}
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: `1px solid ${lab.border}`,
                background: "transparent",
                color: lab.textSub,
                fontSize: 13,
                fontFamily: lab.font,
                cursor: "pointer",
              }}
            >
              {t("lab.source.confirm.cancel")}
            </button>
            <button
              id="auto-source-run"
              type="button"
              onClick={onRun}
              data-testid="auto-source-run"
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                border: "none",
                background: lab.gold,
                color: "var(--color-bg-default)",
                fontSize: 13,
                fontWeight: 800,
                fontFamily: lab.font,
                cursor: "pointer",
              }}
            >
              {t("lab.source.confirm.run")}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
