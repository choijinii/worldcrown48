/**
 * TakedownDialog — 대회의 엔트리 하나를 내리는 창 (IMAGE-1 PR 3 · 원장 D-77 · D-83 · D-93).
 *
 * Lab "내 Tournament" 목록의 [그림 내리기] / [영상 내리기](대회 종류를 따른다)가 연다. 엔트리 48개를 칸 순서로
 * 나열하고 줄마다 [내리기] → 사유 칸 + 마지막 확인 → 서버 함수 takeDownEntry. 이미 내린 줄은 "내림 · 날짜 · 사유".
 * 창 모양은 영상 조절 창(SlotVideoTuner)과 같다. 문구는 지시서 2-D 승인표 그대로(lib/i18n/messages.ts).
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import FocusTrap from "focus-trap-react";
import { useT } from "@/lib/i18n/useT";
import { useEscapeClose } from "@/lib/ui/dismiss";
import { showToast } from "@/lib/toast";
import { isReasonValid, MAX_REASON_LENGTH, takedownCopy, takedownRows, type TakedownKind, type TakedownRow } from "@/lib/lab/takedown";
import { loadTakedownData, takeDownEntry } from "@/lib/lab/takeDownEntry";
import { lab } from "./theme";

export function TakedownDialog({
  tournamentId,
  title,
  kind,
  onClose,
}: {
  tournamentId: string;
  title: string;
  kind: TakedownKind;
  onClose: () => void;
}): JSX.Element {
  const { t } = useT();
  const copy = takedownCopy(kind);
  const [rows, setRows] = useState<TakedownRow[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { contestants, records } = await loadTakedownData(tournamentId);
      setRows(takedownRows(kind, contestants, records));
    } catch (err) {
      console.warn("[Lab] takedown list load failed:", err);
      setRows([]);
    }
  }, [tournamentId, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  // 서버를 부르는 중에는 Escape 로 끊지 않는다.
  useEscapeClose(onClose, !busy);

  function pick(id: string | null) {
    setPicked(id);
    setReason("");
    setReasonError(false);
  }

  async function run(row: TakedownRow) {
    if (!isReasonValid(reason)) {
      setReasonError(true);
      return;
    }
    setBusy(true);
    try {
      const res = await takeDownEntry({ tournamentId, contestantId: row.id, reason: reason.trim() });
      showToast(t(copy.done, { 이름: row.name, name: row.name, n: res.cards }), "success");
      pick(null);
      await load();
    } catch (err) {
      console.warn("[Lab] takedown failed:", err);
      showToast(t(copy.fail), "error");
    } finally {
      setBusy(false);
    }
  }

  const anyActionable = rows?.some((r) => r.state !== "none") ?? false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="takedown-title"
      data-testid="takedown-dialog"
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
      {/* 내리는 동안은 창 안 버튼이 모두 잠긴다 → 갈 곳(fallbackFocus = 창 판)이 없으면 focus-trap 이 예외를 던진다(실서비스 걸어 보기 11-16). */}
      <FocusTrap
        focusTrapOptions={{ initialFocus: "#takedown-close", fallbackFocus: "#takedown-panel", escapeDeactivates: false, allowOutsideClick: true }}
      >
        <div
          id="takedown-panel"
          tabIndex={-1}
          style={{
            width: "100%",
            maxWidth: 640,
            maxHeight: "calc(100vh - 48px)",
            display: "grid",
            gridTemplateRows: "auto auto 1fr auto",
            gap: 14,
            background: lab.surface,
            border: `1px solid ${lab.border}`,
            borderRadius: "var(--radius-border)",
            padding: 32,
            fontFamily: lab.font,
            color: lab.text,
          }}
        >
          <h2 id="takedown-title" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
            {t(copy.title, { "대회 제목": title, title })}
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: lab.textSub, lineHeight: 1.6 }}>{t(copy.note)}</p>

          <div style={{ overflowY: "auto", minHeight: 0 }}>
            {rows === null ? null : !anyActionable ? (
              <p data-testid="takedown-empty" style={{ margin: 0, fontSize: 13, color: lab.textMuted }}>
                {t(copy.empty)}
              </p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
                {rows.map((r) => (
                  <li
                    key={r.id}
                    data-testid={`takedown-row-${r.order}`}
                    style={{
                      display: "grid",
                      gap: 8,
                      padding: "8px 10px",
                      border: `1px solid ${picked === r.id ? lab.crimson : lab.border}`,
                      borderRadius: "var(--radius-border)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span style={{ width: 22, fontSize: 11, color: lab.textMuted }}>{r.order}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.name}
                      </span>
                      {r.host && <span style={{ fontSize: 11, color: lab.textMuted }}>{r.host}</span>}
                      <span style={{ flex: 1 }} />
                      {r.state === "down" ? (
                        <span data-testid={`takedown-done-${r.order}`} style={{ fontSize: 11, color: lab.textSub }}>
                          {t("lab.takedown.rowDone", { 날짜: r.date, date: r.date, 사유: r.reason, reason: r.reason })}
                        </span>
                      ) : r.state === "can" && picked !== r.id ? (
                        <button
                          type="button"
                          data-testid={`takedown-pick-${r.order}`}
                          onClick={() => pick(r.id)}
                          disabled={busy}
                          style={smallButton}
                        >
                          {t("lab.takedown.row")}
                        </button>
                      ) : null}
                    </div>
                    {picked === r.id && (
                      <div style={{ display: "grid", gap: 8 }}>
                        <input
                          data-testid="takedown-reason"
                          value={reason}
                          maxLength={MAX_REASON_LENGTH}
                          onChange={(e) => {
                            setReason(e.target.value);
                            if (reasonError) setReasonError(false);
                          }}
                          placeholder={t("lab.takedown.reasonPlaceholder")}
                          aria-invalid={reasonError}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "var(--radius-border)",
                            border: `1px solid ${reasonError ? lab.crimson : lab.border}`,
                            background: lab.bg,
                            color: lab.text,
                            fontSize: 12,
                            fontFamily: lab.font,
                          }}
                        />
                        {reasonError && (
                          <span data-testid="takedown-reason-error" role="alert" style={{ fontSize: 11, color: lab.crimson }}>
                            {t("lab.takedown.reasonRequired")}
                          </span>
                        )}
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                          <span data-testid="takedown-confirm" style={{ fontSize: 12, color: lab.textSub }}>
                            {t(copy.confirm, { 이름: r.name, name: r.name })}
                          </span>
                          <button
                            type="button"
                            data-testid="takedown-run"
                            onClick={() => run(r)}
                            disabled={busy}
                            style={{ ...smallButton, border: "none", background: lab.crimson, color: "var(--color-white)", fontWeight: 700 }}
                          >
                            {t(copy.run)}
                          </button>
                          <button type="button" onClick={() => pick(null)} disabled={busy} style={smallButton}>
                            {t("lab.list.deleteCancel")}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button id="takedown-close" type="button" data-testid="takedown-close" onClick={onClose} disabled={busy} style={smallButton}>
              {t("lab.embed.close")}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}

const smallButton: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: "var(--radius-border)",
  border: `1px solid ${lab.border}`,
  background: "transparent",
  color: lab.textSub,
  fontSize: 12,
  fontFamily: lab.font,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
