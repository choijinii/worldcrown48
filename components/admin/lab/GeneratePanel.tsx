/**
 * GeneratePanel — STEP 2의 "무엇을 만들 것인가" (LAB-UX-1 B · 대표 결정 ①).
 *
 * 예전 STEP 2에는 부품 버튼이 네 개 늘어서 있었다(AI 48명 전체 · 빈칸만 AI ·
 * 유튜브 검수기 · 영상 자동 소싱). 운영자는 "어느 걸 어떤 순서로 누르는가"를
 * 매번 기억해야 했고, 그 순서는 사실 하나뿐이었다. 그래서 순서를 화면이 갖는다:
 * 버튼은 **결과물** 두 개고, 부품은 접어 둔다(결정 1 = B안).
 *
 * R6 — 이 패널은 Tournament를 만들지 않는다. 결과는 전부 슬롯 "제안"이고, 발행은
 * 운영자가 [토너먼트 생성]을 눌러야 일어난다. 그 사실을 리드 문장으로 못 박는다.
 */
"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/useT";
import type { Step2Counters } from "@/lib/lab/step2Counters";
import { lab } from "./theme";

export type ChainStage = "filling" | "sourcing";

interface GeneratePanelProps {
  counters: Step2Counters;
  /** 지금 도는 체인 단계. null이면 놀고 있다. */
  stage: ChainStage | null;
  /** 소싱 진행률 — stage === "sourcing"일 때만 있다. */
  progress: { done: number; total: number } | null;
  onGenerateVideos: () => void;
  onGenerateRoster: () => void;
  /** 접이식 도구 — 구 유튜브 검수기(링크 일괄 입력). */
  onPasteLinks: () => void;
  /** 접이식 도구 — 빈칸만 AI. */
  onFillBlanks: () => void;
  /** 빈칸이 없으면 [빈칸만 AI]를 잠근다. */
  hasBlanks: boolean;
  /** 발행 중 등 바깥 사정으로 전체를 잠글 때. */
  disabled?: boolean;
}

export function GeneratePanel({
  counters,
  stage,
  progress,
  onGenerateVideos,
  onGenerateRoster,
  onPasteLinks,
  onFillBlanks,
  hasBlanks,
  disabled = false,
}: GeneratePanelProps): JSX.Element {
  const { t } = useT();
  const [toolsOpen, setToolsOpen] = useState(false);
  const busy = disabled || stage !== null;

  const primary = (running: boolean) =>
    ({
      flex: "1 1 260px",
      display: "grid",
      gap: 4,
      padding: "16px 20px",
      borderRadius: 12,
      border: `2px solid ${lab.gold}`,
      background: running ? lab.goldSubtle : "transparent",
      color: lab.gold,
      fontFamily: lab.font,
      textAlign: "left" as const,
      cursor: busy ? "not-allowed" : "pointer",
      opacity: busy && !running ? 0.45 : 1,
    }) as const;

  const tool = (enabled: boolean) =>
    ({
      padding: "8px 14px",
      borderRadius: 8,
      border: `1px solid ${lab.border}`,
      background: "transparent",
      color: lab.textSub,
      fontSize: 13,
      fontFamily: lab.font,
      cursor: enabled ? "pointer" : "not-allowed",
      opacity: enabled ? 1 : 0.45,
    }) as const;

  // 진행률이 아직 안 온 첫 순간에도 "영상 찾는 중"은 보여야 한다 — 라벨이
  // 기본값으로 되돌아가면 운영자는 체인이 멈춘 줄 안다.
  const videoLabel =
    stage === "sourcing"
      ? t("lab.generate.sourcing", {
          done: progress?.done ?? 0,
          total: progress?.total ?? 0,
        })
      : stage === "filling"
        ? t("lab.generate.filling")
        : t("lab.generate.videos");

  return (
    <section
      data-testid="lab-generate-panel"
      style={{
        display: "grid",
        gap: 14,
        padding: "16px 18px",
        borderRadius: 12,
        background: lab.surface,
        border: `1px solid ${lab.border}`,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: lab.textSub, lineHeight: 1.6 }}>
        {t("lab.generate.lead")}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button
          type="button"
          onClick={onGenerateVideos}
          disabled={busy}
          data-testid="lab-generate-videos"
          style={primary(stage !== null)}
        >
          <span style={{ fontSize: 15, fontWeight: 800 }}>{videoLabel}</span>
          <span style={{ fontSize: 12, color: lab.textMuted, fontWeight: 400 }}>
            {t("lab.generate.videosSub")}
          </span>
        </button>
        <button
          type="button"
          onClick={onGenerateRoster}
          disabled={busy}
          data-testid="lab-generate-roster"
          style={primary(false)}
        >
          <span style={{ fontSize: 15, fontWeight: 800 }}>
            {stage === "filling" ? t("lab.generate.filling") : t("lab.generate.roster")}
          </span>
          <span style={{ fontSize: 12, color: lab.textMuted, fontWeight: 400 }}>
            {t("lab.generate.rosterSub")}
          </span>
        </button>
      </div>

      <p
        data-testid="lab-step2-counter"
        style={{ margin: 0, fontSize: 13, color: lab.textSub, fontWeight: 600 }}
      >
        {t("lab.generate.counter", {
          filled: counters.filled,
          total: counters.total,
          suggested: counters.suggested,
          todo: counters.todo,
        })}
      </p>

      <div style={{ display: "grid", gap: 8 }}>
        <button
          type="button"
          onClick={() => setToolsOpen((open) => !open)}
          aria-expanded={toolsOpen}
          data-testid="lab-manual-tools-toggle"
          style={{
            justifySelf: "start",
            padding: 0,
            border: "none",
            background: "transparent",
            color: lab.textMuted,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: lab.font,
            cursor: "pointer",
          }}
        >
          {toolsOpen ? "▾" : "▸"} {t("lab.generate.tools")}
        </button>
        {toolsOpen && (
          <div
            data-testid="lab-manual-tools"
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}
          >
            <button
              type="button"
              onClick={onPasteLinks}
              disabled={busy}
              data-testid="lab-open-embed-inspector"
              style={tool(!busy)}
            >
              {t("lab.embed.open")}
            </button>
            <button
              type="button"
              onClick={onFillBlanks}
              disabled={busy || !hasBlanks}
              data-testid="fill-blanks-button"
              style={tool(!busy && hasBlanks)}
            >
              {t("lab.fill.blanks")}
            </button>
            <span style={{ fontSize: 12, color: lab.textMuted }}>
              {t("lab.generate.toolsHint")}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
