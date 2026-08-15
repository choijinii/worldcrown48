/**
 * SlotVideoTuner — 슬롯 하나의 루프 시작점 미세조정 (LAB-EV-1 W5).
 *
 * 열리면 킬링파트 추천(W2)을 한 번 부른다 — 영상 길이도 그 응답에서 온다(슬라이더
 * 최대값). 쿼터는 슬롯당 2유닛이라 "열어본 슬롯만" 소모한다.
 *
 * ADR-EV-2: 추천은 어디까지나 후보다. 마지막 판단은 운영자가 [원본 열기]로 유튜브의
 * '가장 많이 다시 본 구간' 그래프를 **눈으로** 보고 내린다 — 그 그래프는 공식 API가
 * 주지 않고, 긁어오는 것은 영구 금지다.
 *
 * ADR-EV-4: 이 화면에서 살아 있는 플레이어는 1개뿐이다.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import FocusTrap from "focus-trap-react";
import { useT } from "@/lib/i18n/useT";
import { showToast } from "@/lib/toast";
import { LOOP_SECONDS } from "@/lib/embed/constants";
import { buildWatchUrl, resolveLoopRange } from "@/lib/embed/loopRange";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import {
  inspectErrorCode,
  recommendKillingPart,
  type KillingPartSuggestion,
} from "@/lib/lab/inspectYouTube";
import { inspectErrorMessage } from "@/lib/lab/embedMessages";
import { LoopPlayer } from "@/components/embed/LoopPlayer";
import { lab } from "./theme";

interface SlotVideoTunerProps {
  /** 0-based 그리드 인덱스 (표시는 +1). */
  index: number;
  draft: ContestantDraft;
  onRetime: (startSec: number, durationSec: number | null) => void;
  onRemove: () => void;
  onClose: () => void;
}

/** 슬라이더 최대값 — 길이를 아직 모를 때의 임시 상한. */
const UNKNOWN_DURATION_MAX = 600;

export function SlotVideoTuner({
  index,
  draft,
  onRetime,
  onRemove,
  onClose,
}: SlotVideoTunerProps): JSX.Element | null {
  const { t } = useT();
  const [suggestion, setSuggestion] = useState<KillingPartSuggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(busy);
  busyRef.current = busy;

  const videoId = draft.videoId ?? "";
  const startSec = draft.videoStartSec ?? 0;
  const durationSec = suggestion?.durationSec ?? null;
  const range = resolveLoopRange({ startSec, durationSec });
  const maxStart = Math.max(
    0,
    (durationSec ?? UNKNOWN_DURATION_MAX) - Math.min(LOOP_SECONDS, durationSec ?? LOOP_SECONDS),
  );

  // 열리면 한 번 추천을 부른다 — 후보와 영상 길이를 동시에 얻는다.
  useEffect(() => {
    if (!videoId) return;
    let alive = true;
    setBusy(true);
    recommendKillingPart(videoId)
      .then((res) => {
        if (alive) setSuggestion(res);
      })
      .catch((err) => {
        if (alive) showToast(t(inspectErrorMessage(inspectErrorCode(err)).key), "error");
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
    // t는 lang이 바뀔 때만 바뀌므로 의존성에서 뺀다 — 언어 토글로 API를 다시 부르지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  if (!videoId) return null;

  function nudge(delta: number) {
    onRetime(Math.max(0, Math.min(maxStart, startSec + delta)), durationSec);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="slot-tuner-title"
      data-testid="slot-video-tuner"
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
      <FocusTrap
        focusTrapOptions={{
          initialFocus: "#slot-tuner-slider",
          escapeDeactivates: true,
          onDeactivate: () => !busyRef.current && onClose(),
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            display: "grid",
            gap: 14,
            background: lab.surface,
            border: `1px solid ${lab.border}`,
            borderRadius: 16,
            padding: 22,
            fontFamily: lab.font,
            color: lab.text,
          }}
        >
          <h2 id="slot-tuner-title" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
            {t("lab.embed.tuner.title", { n: index + 1 })}
          </h2>

          <div style={{ width: 240, margin: "0 auto" }}>
            <LoopPlayer
              videoId={videoId}
              startSec={range.startSec}
              endSec={range.endSec}
              durationSec={durationSec}
              showSourceChip={false}
              title={draft.name}
            />
          </div>

          <p style={{ margin: 0, textAlign: "center", fontSize: 12, color: lab.textSub }}>
            {t("lab.embed.tuner.loop", { start: range.startSec, end: range.endSec })}
          </p>

          <label style={{ display: "grid", gap: 6, fontSize: 12, color: lab.textSub }}>
            {t("lab.embed.tuner.start")}
            <input
              id="slot-tuner-slider"
              type="range"
              min={0}
              max={maxStart}
              step={1}
              value={Math.min(startSec, maxStart)}
              onChange={(e) => onRetime(Number(e.target.value), durationSec)}
              data-testid="slot-tuner-slider"
              style={{ width: "100%", accentColor: lab.gold }}
            />
          </label>

          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button type="button" onClick={() => nudge(-1)} style={nudgeStyle}>
              {t("lab.embed.tuner.back")}
            </button>
            <button type="button" onClick={() => nudge(1)} style={nudgeStyle}>
              {t("lab.embed.tuner.forward")}
            </button>
            <a
              href={buildWatchUrl(videoId, range.startSec)}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="slot-tuner-open-original"
              style={{ ...nudgeStyle, textDecoration: "none", display: "inline-block" }}
            >
              {t("lab.embed.tuner.openOriginal")}
            </a>
          </div>

          <p style={{ margin: 0, fontSize: 11, color: lab.textMuted, textAlign: "center" }}>
            {t("lab.embed.tuner.hint")}
          </p>

          {/* 추천 후보 칩 (W2 결과) */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
            {busy && <span style={{ fontSize: 12, color: lab.textMuted }}>{t("lab.embed.tuner.suggesting")}</span>}
            {suggestion?.candidates.map((c) => {
              const label =
                c.source === "comments"
                  ? t("lab.embed.tuner.source.comments", { n: c.mentions })
                  : c.source === "chapters"
                    ? c.chapterTitle || t("lab.embed.tuner.source.chapters")
                    : t("lab.embed.tuner.source.heuristic");
              const active = c.startSec === startSec;
              return (
                <button
                  key={`${c.source}-${c.startSec}`}
                  type="button"
                  onClick={() => onRetime(c.startSec, durationSec)}
                  data-testid={`slot-tuner-candidate-${c.startSec}`}
                  title={label}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 999,
                    border: `1px solid ${active ? lab.gold : lab.border}`,
                    background: active ? lab.goldSubtle : "transparent",
                    color: active ? lab.gold : lab.textSub,
                    fontSize: 11,
                    fontFamily: lab.font,
                    cursor: "pointer",
                  }}
                >
                  {formatClock(c.startSec)} · {label}
                </button>
              );
            })}
          </div>

          {suggestion && !suggestion.commentsAvailable && (
            <p style={{ margin: 0, fontSize: 11, color: lab.textMuted, textAlign: "center" }}>
              {t("lab.embed.tuner.commentsOff")}
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <button
              type="button"
              onClick={onRemove}
              data-testid="slot-tuner-remove"
              style={{ ...nudgeStyle, color: lab.crimson, borderColor: lab.crimson }}
            >
              {t("lab.embed.tuner.remove")}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 18px",
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
              {t("lab.embed.tuner.done")}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}

const nudgeStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: `1px solid ${lab.border}`,
  background: "transparent",
  color: lab.textSub,
  fontSize: 12,
  fontFamily: lab.font,
  cursor: "pointer",
};

/** 초 → m:ss (후보 칩 라벨). */
function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
