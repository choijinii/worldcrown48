/**
 * YouTubeInspectorModal — 48링크 일괄 검수 + 슬롯 자동 주입 (LAB-EV-1 W4).
 *
 * 운영자 동선은 세 번의 클릭 안에 끝난다(§6 AC#1):
 *   ① [🎬 유튜브 검수기] → ② 붙여넣기 → ③ [검수 및 자동 채우기]
 * 세 번째 클릭 하나가 검증 + 주입을 동시에 한다. 결과 리스트는 "무엇이 들어갔고
 * 무엇이 왜 빠졌는지"를 사후에 보여주는 영수증이라 창은 **닫지 않는다** — 운영자가
 * 색깔·사유를 보고 직접 [닫기]를 눌러야 한다(LAB-EV-1 E2E가 이 계약을 고정).
 *
 * 단, 제출 **전** 안내였던 "빈칸보다 링크가 N개 많아요" 넘침 경고는 검수 결과가
 * 나온 뒤(`verdicts`가 채워진 뒤)에는 감춘다(2026-08-29 대표 확정,
 * name-i18n-gap.md ②) — 이미 처리가 끝난 마당에 그 경고가 그대로 남아 있으면
 * 운영자가 "뭔가 또 손봐야 하나" 헷갈린다. 결과 리스트 각 줄이 실제 처리 결과를
 * 이미 보여주므로 넘침 경고는 그 순간부터 쓸모가 없어진다.
 *
 * 규모 N(48/24/12)은 BRACKET_SIZES 단일 소스에서 온다(ADR-EV-6 — 48 하드코딩 금지).
 * 판정·파싱·주입 로직은 전부 lib/embed + lib/lab의 순수 층에 있고(§0.5 렌더 테스트
 * 금지), 이 파일은 상태와 배선만 갖는다.
 */
"use client";

import { useMemo, useRef, useState } from "react";
import FocusTrap from "focus-trap-react";
import { useT } from "@/lib/i18n/useT";
import { useEscapeClose } from "@/lib/ui/dismiss";
import { showToast } from "@/lib/toast";
import { track } from "@/lib/analytics";
import {
  BRACKET_SIZES,
  DEFAULT_BRACKET_SIZE,
  type BracketSize,
} from "@/lib/embed/constants";
import { assignSlots, parseLinkBatch, type SlotAssignment } from "@/lib/embed/parseBatch";
import type { LinkStatus, LinkVerdict } from "@/lib/embed/verdict";
import { extractContestantsFromVideos } from "@/lib/lab/extractContestants";
import type { ExtractedContestant } from "@/lib/lab/pasteExtract";
import {
  inspectErrorCode,
  validateYouTubeLinks,
} from "@/lib/lab/inspectYouTube";
import {
  inspectErrorMessage,
  rowMessage,
  statusMessage,
  verdictMessages,
} from "@/lib/lab/embedMessages";
import { lab } from "./theme";

interface YouTubeInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * 비어 있는 슬롯의 0-based index — 화면 순서대로 (LAB-UX-1 ③).
   * 링크는 **여기에만, 이 개수만큼** 들어간다. 채워 둔 칸을 덮지 않는다.
   */
  blankIndexes: number[];
  /**
   * 통과·경고분을 그리드에 얹는다. 차단 판정은 여기까지 오지 않는다.
   * `extractions`는 제목에서 읽어낸 인물 — 확신 못 한 항목은 이름이 비어 있다.
   */
  onApply: (
    assignments: SlotAssignment[],
    verdicts: LinkVerdict[],
    extractions: ExtractedContestant[],
  ) => void;
}

/** 팔레트에 초록이 없다 — 통과는 turquoise, 경고는 Crown Gold, 차단은 crimson. */
const STATUS_COLOR: Record<LinkStatus, string> = {
  pass: lab.turquoise,
  warn: lab.gold,
  blocked: lab.crimson,
};

export function YouTubeInspectorModal({
  isOpen,
  onClose,
  blankIndexes,
  onApply,
}: YouTubeInspectorModalProps): JSX.Element | null {
  const { t } = useT();
  const [size, setSize] = useState<BracketSize>(DEFAULT_BRACKET_SIZE);
  const [text, setText] = useState("");
  const [verdicts, setVerdicts] = useState<LinkVerdict[] | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => parseLinkBatch(text, size), [text, size]);
  // ③ — 빈칸에만, 빈칸 개수만큼. 남는 링크는 배정되지 않는다.
  const slots = useMemo(() => assignSlots(rows, blankIndexes), [rows, blankIndexes]);
  const passingRows = rows.filter((r) => r.ok && r.videoId).length;
  const overflow = Math.max(0, passingRows - blankIndexes.length);
  const slotByIndex = useMemo(
    () => new Map(slots.map((s) => [s.index, s])),
    [slots],
  );
  const verdictById = useMemo(
    () => new Map((verdicts ?? []).map((v) => [v.videoId, v])),
    [verdicts],
  );
  const failedRows = rows.filter((r) => !r.ok).length;

  // 훅은 조기 return **앞**에 있어야 한다 — 호출 순서가 렌더마다 같아야 하므로.
  // busy 중에는 듣지 않는다: 진행 중인 작업을 Escape로 끊지 않기 위해서다.
  useEscapeClose(onClose, !busy);

  if (!isOpen) return null;

  async function handleValidate() {
    if (busy) return;
    if (slots.length === 0) {
      showToast(t("lab.embed.empty"), "info");
      return;
    }
    setBusy(true);
    try {
      const res = await validateYouTubeLinks(slots.map((s) => s.videoId));
      setVerdicts(res.verdicts);

      // ③ — 검수를 통과한 영상의 제목·채널로 인물을 읽는다. 재료는 방금 받은
      // verdict에 이미 있다(YouTube API 0콜). 실패해도 영상 주입은 살린다:
      // 빈 결과로 넘기면 그 칸들이 "수동 필요"가 되어 사람에게 간다.
      const usable = res.verdicts.filter((v) => v.status !== "blocked");
      let extractions: ExtractedContestant[] = [];
      if (usable.length > 0) {
        try {
          extractions = await extractContestantsFromVideos(
            usable.map((v) => ({
              videoId: v.videoId,
              title: v.title,
              channelTitle: v.channelTitle,
            })),
          );
        } catch (err) {
          // 검수는 성공했고 **추출만** 실패했다. 여기서 검수 실패 문구를 띄우면
          // 운영자는 영상이 안 들어간 줄 안다 — 실제로는 들어가 있다
          // (쿼터 문구 사고와 같은 계열: 원인을 잘못 지목하지 않는다).
          const code = inspectErrorCode(err);
          const key =
            code === "quota-daily" || code === "quota-youtube"
              ? inspectErrorMessage(code).key
              : "lab.embed.error.extract";
          showToast(t(key), "error");
          void track("admin_lab_extract_error", { error_code: code });
        }
      }

      onApply(slots, res.verdicts, extractions);

      const applied = usable.length;
      const named = extractions.filter((e) => e.confident).length;
      showToast(
        t("lab.embed.appliedWithNames", { n: applied, named, manual: applied - named }),
        "success",
      );
      void track("admin_lab_embed_validate", {
        requested: slots.length,
        applied,
        api_calls: res.apiCalls,
        bracket_size: size,
      });
    } catch (err) {
      const code = inspectErrorCode(err);
      showToast(t(inspectErrorMessage(code).key), "error");
      void track("admin_lab_embed_validate_error", { error_code: code });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="embed-inspector-title"
      data-testid="embed-inspector"
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
        // 닫기는 useEscapeClose가 갖는다 — focus-trap 수명주기에 얹으면
        // StrictMode 재마운트가 그걸 "사용자가 닫았다"로 오인한다(lib/ui/dismiss).
        focusTrapOptions={{
          initialFocus: "#embed-inspector-input",
          escapeDeactivates: false,
        }}
      >
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
            borderRadius: 16,
            padding: 24,
            fontFamily: lab.font,
            color: lab.text,
          }}
        >
          <header>
            <h2 id="embed-inspector-title" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              {t("lab.embed.title")}
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: lab.textSub }}>
              {t("lab.embed.subtitle")}
            </p>
          </header>

          {/* 브래킷 규모 탭 — BRACKET_SIZES 단일 소스 (ADR-EV-6) */}
          <div role="tablist" style={{ display: "flex", gap: 8 }}>
            {BRACKET_SIZES.map((n) => (
              <button
                key={n}
                type="button"
                role="tab"
                aria-selected={size === n}
                aria-label={t("lab.embed.sizeAria", { n })}
                data-testid={`embed-size-${n}`}
                onClick={() => setSize(n)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: `1px solid ${size === n ? lab.gold : lab.border}`,
                  background: size === n ? lab.goldSubtle : "transparent",
                  color: size === n ? lab.gold : lab.textSub,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: lab.font,
                  cursor: "pointer",
                }}
              >
                {t("lab.embed.sizeTab", { n })}
              </button>
            ))}
          </div>

          <textarea
            id="embed-inspector-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("lab.embed.placeholder", { n: size })}
            data-testid="embed-inspector-input"
            rows={8}
            style={{
              width: "100%",
              resize: "vertical",
              padding: 12,
              borderRadius: 8,
              border: `1px solid ${lab.border}`,
              background: lab.surfaceElev,
              color: lab.text,
              fontSize: 12,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              lineHeight: 1.6,
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 12, color: failedRows > 0 ? lab.gold : lab.textMuted }}>
              {t("lab.embed.counter", {
                parsed: rows.length,
                limit: size,
                failed: failedRows,
              })}
              {" · "}
              {t("lab.embed.blanksLeft", { n: blankIndexes.length })}
              {/* 넘치는 링크가 채워진 칸을 밀어내지 않는다는 걸 **누르기 전에** 말한다.
                  누른 뒤에 알면 이미 무엇이 빠졌는지 세어야 한다. verdicts가 채워졌다는
                  건 검수·주입이 이미 끝났다는 뜻 — 그 뒤로는 아래 결과 리스트가 실제
                  처리 결과를 보여주니, 제출 전 예고였던 이 문구는 감춘다(대표 확정 08-29). */}
              {overflow > 0 && !verdicts && (
                <span data-testid="embed-overflow" style={{ color: lab.gold }}>
                  {" · "}
                  {t("lab.embed.overflow", { n: overflow })}
                </span>
              )}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: `1px solid ${lab.border}`,
                  background: "transparent",
                  color: lab.textSub,
                  fontSize: 13,
                  fontFamily: lab.font,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {t("lab.embed.close")}
              </button>
              <button
                type="button"
                onClick={handleValidate}
                disabled={busy}
                data-testid="embed-inspector-validate"
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: busy ? lab.surfaceElev : lab.gold,
                  color: busy ? lab.textMuted : "var(--color-bg-default)",
                  fontSize: 13,
                  fontWeight: 800,
                  fontFamily: lab.font,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {busy ? t("lab.embed.validating") : t("lab.embed.validate")}
              </button>
            </div>
          </div>

          {rows.length > 0 && (
            <ul
              data-testid="embed-inspector-results"
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                overflowY: "auto",
                display: "grid",
                gap: 6,
              }}
            >
              {rows.map((row) => {
                const slot = slotByIndex.get(row.index);
                const verdict = slot ? verdictById.get(slot.videoId) : undefined;
                const status: LinkStatus = row.ok ? (verdict?.status ?? "pass") : "blocked";
                const parseMsg = rowMessage(row, size);
                const notes = verdict ? verdictMessages(verdict) : [];
                const color = row.ok && !verdict ? lab.textMuted : STATUS_COLOR[status];

                return (
                  <li
                    key={row.index}
                    data-testid={`embed-row-${row.index}`}
                    data-status={verdict || !row.ok ? status : "pending"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: `1px solid ${lab.border}`,
                      borderLeft: `3px solid ${color}`,
                      background: lab.surfaceElev,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: lab.textMuted, minWidth: 62 }}>
                      {slot
                        ? t("lab.embed.slotLabel", { n: slot.slot })
                        : t("lab.embed.rowLabel", { n: row.index })}
                    </span>

                    {/* 존재하지 않는 영상의 썸네일 URL은 404다 — 깨진 이미지
                        아이콘을 그리느니 자리를 비운다(콘솔 오류도 함께 사라진다). */}
                    {verdict?.exists && verdict.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={verdict.thumbnailUrl}
                        alt=""
                        style={{ width: 48, height: 27, objectFit: "cover", borderRadius: 3 }}
                      />
                    )}

                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: lab.text,
                      }}
                      title={verdict?.title || row.raw}
                    >
                      {verdict?.title || row.raw}
                    </span>

                    <span style={{ color, fontWeight: 700 }}>
                      {(verdict || !row.ok) && t(statusMessage(status).key)}
                    </span>

                    <span style={{ color: lab.textSub, minWidth: 220, textAlign: "right" }}>
                      {parseMsg
                        ? t(parseMsg.key, parseMsg.vars)
                        : notes.map((n) => t(n.key, n.vars)).join(" · ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </FocusTrap>
    </div>
  );
}
