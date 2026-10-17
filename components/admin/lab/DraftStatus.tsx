/**
 * DraftStatus — 초안 자동 저장 상태 한 줄 (EDITOR-FIX-1).
 *
 * 저장 중 / 저장됨 · 시각 / 저장 실패. 실패는 조용히 넘기지 않는다 — 빨간 글자와
 * [다시 시도]가 남아 있고, 다음 저장이 성공해야 사라진다.
 */
"use client";

import type { AutosaveStatus } from "@/lib/lab/draftAutosaver";
import { useT } from "@/lib/i18n/useT";
import { lab } from "./theme";

const LOCALE = { ko: "ko-KR", en: "en-US", es: "es-ES" } as const;

export function formatDraftTime(ms: number, lang: keyof typeof LOCALE, withDate = false): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    ...(withDate ? { month: "short", day: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  }).format(ms);
}

export function DraftStatus({
  status,
  onRetry,
}: {
  status: AutosaveStatus | null;
  onRetry: () => void;
}): JSX.Element | null {
  const { t, lang } = useT();
  if (!status) return null;
  return (
    <span
      data-testid="draft-save-status"
      data-status={status.kind}
      role="status"
      aria-live="polite"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: status.kind === "error" ? lab.crimson : lab.textMuted,
        fontWeight: status.kind === "error" ? 700 : 400,
      }}
    >
      {status.kind === "saving" && t("lab.draft.status.saving")}
      {status.kind === "saved" &&
        t("lab.draft.status.saved", { time: formatDraftTime(status.at, lang) })}
      {status.kind === "error" && (
        <>
          {t("lab.draft.status.error")}
          <button
            type="button"
            onClick={onRetry}
            data-testid="draft-save-retry"
            style={{
              flexShrink: 0,
              padding: "3px 10px",
              borderRadius: 6,
              border: `1px solid ${lab.crimson}`,
              background: "transparent",
              color: lab.crimson,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: lab.font,
              cursor: "pointer",
            }}
          >
            {t("lab.draft.retry")}
          </button>
        </>
      )}
    </span>
  );
}
