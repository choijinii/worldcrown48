/**
 * DraftPicker — 이어서 만들기 (EDITOR-FIX-1).
 *
 * 편집기를 열 때 내 초안이 있으면 이 목록이 먼저 뜬다: 제목 · 마지막 저장 시각,
 * 줄마다 [열기]·[지우기], 아래에 [새로 시작]. 지우기는 같은 줄에서 한 번 더 묻는다
 * (브라우저 confirm 창은 쓰지 않는다 — 자동화가 멈춘다).
 */
"use client";

import { useState } from "react";
import type { DraftSummary } from "@/lib/lab/tournamentDraft";
import { useT } from "@/lib/i18n/useT";
import { formatDraftTime } from "./DraftStatus";
import { lab } from "./theme";

const smallButton = (primary: boolean, danger = false) =>
  ({
    padding: "7px 14px",
    borderRadius: 8,
    border: `1px solid ${danger ? lab.crimson : primary ? lab.gold : lab.border}`,
    background: primary ? lab.gold : "transparent",
    color: danger ? lab.crimson : primary ? "var(--color-bg-default)" : lab.textSub,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: lab.font,
    cursor: "pointer",
  }) as const;

export function DraftPicker({
  drafts,
  loading,
  onOpen,
  onDelete,
  onNew,
}: {
  drafts: DraftSummary[];
  loading: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}): JSX.Element {
  const { t, lang } = useT();
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <section data-testid="draft-picker" style={{ display: "grid", gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{t("lab.draft.list.title")}</h2>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: lab.textMuted }}>
          {t("lab.draft.list.subtitle")}
        </p>
      </div>

      {loading ? (
        <p style={{ margin: 0, fontSize: 13, color: lab.textMuted }}>
          {t("lab.draft.list.loading")}
        </p>
      ) : drafts.length === 0 ? (
        <p
          data-testid="draft-list-empty"
          style={{
            margin: 0,
            padding: "18px 16px",
            borderRadius: 10,
            border: `1px dashed ${lab.border}`,
            fontSize: 13,
            color: lab.textMuted,
          }}
        >
          {t("lab.draft.list.empty")}
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {drafts.map((d) => (
            <li
              key={d.id}
              data-testid="draft-row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 10,
                border: `1px solid ${confirming === d.id ? lab.crimson : lab.border}`,
                background: lab.surface,
              }}
            >
              {confirming === d.id ? (
                <>
                  <span style={{ fontSize: 13, color: lab.text }}>
                    {t("lab.draft.deleteConfirm")}
                  </span>
                  <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirming(null);
                        onDelete(d.id);
                      }}
                      data-testid="draft-delete-confirm"
                      style={smallButton(false, true)}
                    >
                      {t("lab.draft.delete")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      style={smallButton(false)}
                    >
                      {t("lab.draft.cancel")}
                    </button>
                  </span>
                </>
              ) : (
                <>
                  <span style={{ minWidth: 0 }}>
                    <span
                      data-testid="draft-row-title"
                      style={{
                        display: "block",
                        fontSize: 14,
                        fontWeight: 700,
                        color: d.title.trim() ? lab.text : lab.textMuted,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.title.trim() || t("lab.draft.list.untitled")}
                    </span>
                    <span style={{ display: "block", marginTop: 2, fontSize: 12, color: lab.textMuted }}>
                      {t("lab.draft.list.savedAt", {
                        time: d.updatedAtMs ? formatDraftTime(d.updatedAtMs, lang, true) : "—",
                      })}
                    </span>
                  </span>
                  <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => onOpen(d.id)}
                      data-testid="draft-open"
                      style={smallButton(true)}
                    >
                      {t("lab.draft.open")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(d.id)}
                      data-testid="draft-delete"
                      style={smallButton(false)}
                    >
                      {t("lab.draft.delete")}
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onNew}
        data-testid="draft-new"
        style={{ ...smallButton(false), justifySelf: "start", padding: "10px 18px" }}
      >
        {t("lab.draft.new")}
      </button>
    </section>
  );
}
