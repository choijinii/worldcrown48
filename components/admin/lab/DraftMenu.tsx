/**
 * DraftMenu — 편집 중 [초안 목록]을 버튼 바로 밑에 펼친다 (LAB-FIX-2 §3-5 · 대표 결정 2026-11-10).
 *
 * 예전에는 [초안 목록]이 편집 화면을 떠나 "이어서 만들기" 화면(DraftPicker)으로 넘어갔다. 런칭 대회
 * 4개를 오가며 만들 때 화면 전환 → 다시 열기를 여러 번 반복해야 해서, 같은 화면 위에 작은 목록을
 * 겹쳐 띄운다. 줄마다 제목 · 마지막 저장 시각 · [열기], 맨 아래 [새로 시작].
 *
 * - [열기]·[새로 시작]은 지금 초안을 먼저 저장한 뒤 움직인다(호출부가 자동 저장기를 flush).
 * - 지금 초안 줄은 표시만 하고 [열기]를 끈다.
 * - [지우기]는 넣지 않는다(실수 방지) — 지우기는 "이어서 만들기" 화면에만 있다.
 * - 다시 누르기 · 바깥 누르기 · Esc 로 닫힌다.
 * 문구는 기존 사전 키(lab.draft.*)만 쓴다. 편집기를 처음 열 때의 "이어서 만들기" 화면은 그대로다.
 */
"use client";

import { useCallback, useState } from "react";
import type { DraftSummary } from "@/lib/lab/tournamentDraft";
import { draftMenuRows } from "@/lib/lab/tournamentDraft";
import { useT } from "@/lib/i18n/useT";
import { useEscapeClose, useOutsideClose } from "@/lib/ui/dismiss";
import { formatDraftTime } from "./DraftStatus";
import { lab } from "./theme";

export function DraftMenu({
  drafts,
  currentId,
  onShow,
  onOpen,
  onNew,
}: {
  drafts: DraftSummary[];
  /** 지금 편집 중인 초안 id — 아직 저장 전이면 null. */
  currentId: string | null;
  /** 펼칠 때 — 지금 초안을 저장하고 목록을 새로 읽는다. */
  onShow: () => Promise<void>;
  onOpen: (id: string) => void;
  onNew: () => void;
}): JSX.Element {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useEscapeClose(close, open);
  const ref = useOutsideClose<HTMLDivElement>(close, open);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    try {
      await onShow();
    } finally {
      setLoading(false);
    }
  }

  const rows = draftMenuRows(drafts, currentId);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => void toggle()}
        data-testid="draft-back-to-list"
        aria-expanded={open}
        aria-haspopup="true"
        style={{
          padding: "4px 10px",
          borderRadius: "var(--radius-border)",
          border: `1px solid ${lab.border}`,
          background: "transparent",
          color: lab.textSub,
          fontSize: 12,
          fontFamily: lab.font,
          cursor: "pointer",
        }}
      >
        {t("lab.draft.backToList")}
      </button>

      {open && (
        <div
          data-testid="draft-menu"
          role="dialog"
          aria-label={t("lab.draft.list.title")}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 40,
            width: 360,
            maxHeight: 420,
            overflowY: "auto",
            padding: 8,
            borderRadius: "var(--radius-border)",
            border: `1px solid ${lab.border}`,
            background: lab.surface,
            display: "grid",
            gap: 6,
          }}
        >
          {loading && rows.length === 0 ? (
            <p style={{ margin: 0, padding: 8, fontSize: 13, color: lab.textMuted }}>
              {t("lab.draft.list.loading")}
            </p>
          ) : rows.length === 0 ? (
            <p style={{ margin: 0, padding: 8, fontSize: 13, color: lab.textMuted }}>
              {t("lab.draft.list.empty")}
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              {rows.map((d) => (
                <li
                  key={d.id}
                  data-testid="draft-menu-row"
                  data-current={d.current}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: "var(--radius-border)",
                    border: `1px solid ${d.current ? lab.gold : lab.border}`,
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 700,
                        color: d.title.trim() ? lab.text : lab.textMuted,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.title.trim() || t("lab.draft.list.untitled")}
                    </span>
                    <span style={{ display: "block", marginTop: 2, fontSize: 11, color: lab.textMuted }}>
                      {t("lab.draft.list.savedAt", {
                        time: d.updatedAtMs ? formatDraftTime(d.updatedAtMs, lang, true) : "—",
                      })}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={d.current}
                    onClick={() => {
                      setOpen(false);
                      onOpen(d.id);
                    }}
                    data-testid="draft-menu-open"
                    style={{
                      flexShrink: 0,
                      padding: "5px 12px",
                      borderRadius: "var(--radius-border)",
                      border: `1px solid ${d.current ? lab.border : lab.gold}`,
                      background: d.current ? "transparent" : lab.gold,
                      color: d.current ? lab.textMuted : "var(--color-bg-default)",
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: lab.font,
                      cursor: d.current ? "default" : "pointer",
                    }}
                  >
                    {t("lab.draft.open")}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onNew();
            }}
            data-testid="draft-menu-new"
            style={{
              justifySelf: "start",
              padding: "6px 12px",
              borderRadius: "var(--radius-border)",
              border: `1px solid ${lab.border}`,
              background: "transparent",
              color: lab.textSub,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: lab.font,
              cursor: "pointer",
            }}
          >
            {t("lab.draft.new")}
          </button>
        </div>
      )}
    </div>
  );
}
