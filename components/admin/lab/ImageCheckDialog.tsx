/**
 * ImageCheckDialog — 편집기 엔트리 칸의 그림 확인 창 (IMAGE-1 PR 3 · 원장 D-92).
 *
 * 칸의 "그림" 배지 또는 칸 아래 출처 도메인 글자를 누르면 열린다. 그림 크게 보기(1600) · 출처 페이지 열기 ·
 * 원본 그림 열기(둘 다 새 탭 · noopener noreferrer) · [새 이미지 찾기](검색으로 들어온 칸에만) · [닫기].
 * 창 모양은 영상 조절 창(SlotVideoTuner)과 같다. 관리자 편집기 안이라 링크를 둔다 — 매치 무대는 글자만(D-77) 그대로.
 */
"use client";

import FocusTrap from "focus-trap-react";
import { useT } from "@/lib/i18n/useT";
import { useEscapeClose } from "@/lib/ui/dismiss";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import { imageCheckLinks } from "@/lib/lab/imageCheck";
import { lab } from "./theme";

export function ImageCheckDialog({
  index,
  draft,
  onRefresh,
  refreshing = false,
  onClose,
}: {
  /** 0-based 칸 번호(표시는 +1). */
  index: number;
  draft: ContestantDraft;
  /** [새 이미지 찾기] — 검색으로 들어온 칸에만 넘어온다. */
  onRefresh?: () => void;
  refreshing?: boolean;
  onClose: () => void;
}): JSX.Element | null {
  const { t } = useT();
  useEscapeClose(onClose, !refreshing);
  if (!draft.imageUrl) return null;
  const links = imageCheckLinks(draft);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-check-title"
      data-testid="image-check-dialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1001,
        background: "rgba(0,0,31,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <FocusTrap focusTrapOptions={{ initialFocus: "#image-check-close", escapeDeactivates: false }}>
        <div
          style={{
            width: "100%",
            maxWidth: 560,
            maxHeight: "calc(100vh - 48px)",
            overflowY: "auto",
            display: "grid",
            gap: 14,
            background: lab.surface,
            border: `1px solid ${lab.border}`,
            borderRadius: "var(--radius-border)",
            padding: 40,
            fontFamily: lab.font,
            color: lab.text,
          }}
        >
          <h2 id="image-check-title" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
            {t("lab.imageCheck.title", { n: index + 1 })}
          </h2>
          {/* 1600 장(원본 사본) 크게 보기 — 자르지 않는다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-testid="image-check-img"
            src={draft.imageUrl}
            alt={draft.name}
            style={{ width: "100%", maxHeight: "56vh", objectFit: "contain", background: lab.bg, borderRadius: "var(--radius-border)" }}
          />
          <p style={{ margin: 0, fontSize: 12, color: lab.textSub, textAlign: "center" }}>{t("lab.imageCheck.hint")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {links.sourcePage && (
              <a href={links.sourcePage} target="_blank" rel="noopener noreferrer" data-testid="image-check-open-page" style={linkStyle}>
                {t("lab.imageCheck.openPage")}
              </a>
            )}
            {links.sourceUrl && (
              <a href={links.sourceUrl} target="_blank" rel="noopener noreferrer" data-testid="image-check-open-original" style={linkStyle}>
                {t("lab.imageCheck.openOriginal")}
              </a>
            )}
            {onRefresh && (
              <button type="button" onClick={onRefresh} disabled={refreshing} data-testid="image-check-refresh" style={linkStyle}>
                {refreshing ? t("lab.source.refreshing") : t("lab.image.refresh")}
              </button>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              id="image-check-close"
              type="button"
              onClick={onClose}
              data-testid="image-check-close"
              style={{
                padding: "8px 18px",
                borderRadius: "var(--radius-border)",
                border: "none",
                background: lab.gold,
                color: "var(--color-bg-default)",
                fontSize: 13,
                fontWeight: 800,
                fontFamily: lab.font,
                cursor: "pointer",
              }}
            >
              {t("lab.embed.close")}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: "var(--radius-border)",
  border: `1px solid ${lab.border}`,
  background: "transparent",
  color: lab.textSub,
  fontSize: 12,
  fontFamily: lab.font,
  textDecoration: "none",
  display: "inline-block",
  cursor: "pointer",
};
