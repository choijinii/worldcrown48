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
 *
 * ── 닫기를 focus-trap에 맡기지 않는다 (2026-08-23 실측) ──
 * 저장소의 모든 모달이 `onDeactivate`를 "사용자가 닫았다"로 써 왔는데, focus-trap은
 * **언마운트 정리에서도** 그걸 부른다. React StrictMode의 dev 재마운트는
 * mount → cleanup → mount라서 cleanup의 deactivate가 곧바로 `onDeactivate`를
 * 때리고, 부모가 상태를 닫아 버려 두 번째 mount 때는 띄울 것이 없다. 결과는
 * "버튼을 눌렀는데 창이 아예 안 보인다"이고, 프로덕션은 이중 호출을 안 하므로
 * 로컬에서만 터진다 — [[feedback_strictmode_ref_guard_kills_subscription]]과 같은 계열.
 *
 * 대조 실험(무료·API 0콜): `reactStrictMode: true`에서 검수기 모달 DOM 잔존 false,
 * `false`로 바꾸면 true. 그래서 여기서는 focus-trap에 **포커스 가두기만** 맡기고
 * 닫기는 우리가 갖는다: [취소] 클릭 · Escape 키. 그러면 수명주기와 무관해진다.
 */
"use client";

import { useEffect } from "react";
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

  // Escape는 우리가 처리한다(escapeDeactivates: false). focus-trap의 수명주기에
  // 닫기를 얹으면 StrictMode 재마운트가 그걸 "사용자가 닫았다"로 오인한다.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

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
          // 닫기는 우리 몫이다 — onDeactivate/escapeDeactivates를 쓰지 않는다.
          // focus-trap이 얼리는 콜백 문제([[feedback-focustrap-frozen-ondeactivate]])도
          // 함께 사라진다: 이제 얼릴 콜백 자체가 없다.
          escapeDeactivates: false,
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
