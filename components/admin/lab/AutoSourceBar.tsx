/**
 * AutoSourceBar — STEP 2의 [🔍 영상 자동 소싱] 버튼 + 확인 다이얼로그 + 진행률
 * (LAB-EV-2 §5 C).
 *
 * 확인 다이얼로그를 먼저 여는 이유는 예의가 아니라 **쿼터**다. search.list는 자체
 * 버킷 하루 100콜이고 48명 소싱이 그 절반을 쓴다(lib/embed/sourcing/quota). 운영자가
 * "오늘 몇 번 더 되는지"를 모른 채 누르면 두 번째 토너먼트가 통째로 막힌다. 견적은
 * 드라이런(API 0콜)이라 다이얼로그를 여는 것 자체는 아무것도 소비하지 않는다.
 *
 * R6 — 이 컴포넌트는 Tournament를 만들지 않는다. 결과는 슬롯 "제안"이고, 생성은
 * 운영자가 [토너먼트 생성]을 눌러야 일어난다.
 *
 * 시각 언어는 기존 검수기(YouTubeInspectorModal)를 그대로 재사용한다(R7).
 */
"use client";

import { useRef, useState } from "react";
import FocusTrap from "focus-trap-react";
import { useT } from "@/lib/i18n/useT";
import { showToast } from "@/lib/toast";
import { track } from "@/lib/analytics";
import { inspectErrorCode } from "@/lib/lab/inspectYouTube";
import { sourcingErrorMessage } from "@/lib/lab/sourcingMessages";
import {
  autoSourceVideos,
  previewSourcingQuota,
  runSourcingBatches,
  type SourcingQuotaPreview,
} from "@/lib/lab/autoSource";
import {
  buildSourcingTargets,
  collectExcludedVideoIds,
  type SourcingRunTally,
} from "@/lib/lab/sourcingDraft";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import type { SourcingBatchSummary } from "@/lib/embed/sourcing/types";
import { lab } from "./theme";

interface AutoSourceBarProps {
  contestants: ContestantDraft[];
  keywords: string[];
  /** 배치 하나가 끝날 때마다 즉시 그리드에 반영한다(부분 결과 보존). */
  onBatch: (batch: SourcingBatchSummary) => void;
  /** 다른 채우기 작업이 도는 동안은 잠근다. */
  disabled?: boolean;
}

interface Progress {
  done: number;
  total: number;
}

export function AutoSourceBar({
  contestants,
  keywords,
  onBatch,
  disabled = false,
}: AutoSourceBarProps): JSX.Element {
  const { t } = useT();
  const [preview, setPreview] = useState<SourcingQuotaPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);

  // focus-trap-react는 onDeactivate를 생성 시점에 얼린다 —
  // [[feedback-focustrap-frozen-ondeactivate]]. 상태는 ref로 읽는다.
  const runningRef = useRef(false);
  const running = progress !== null;
  runningRef.current = running;

  const targets = buildSourcingTargets(contestants);
  const busy = disabled || running || previewing;

  async function openConfirm() {
    if (busy) return;
    if (targets.length === 0) {
      showToast(t("lab.source.noTargets"), "info");
      return;
    }
    setPreviewing(true);
    try {
      setPreview(await previewSourcingQuota(targets, keywords));
    } catch (err) {
      const code = inspectErrorCode(err);
      showToast(t(sourcingErrorMessage(code).key), "error");
      void track("admin_lab_source_preview_error", { error_code: code });
    } finally {
      setPreviewing(false);
    }
  }

  async function startRun() {
    setPreview(null);
    setProgress({ done: 0, total: targets.length });
    const started = Date.now();

    const result = await runSourcingBatches(
      {
        targets,
        categoryKeywords: keywords,
        excludeVideoIds: collectExcludedVideoIds(
          contestants,
          targets.map((x) => x.index),
        ),
      },
      {
        call: autoSourceVideos,
        onBatch,
        onProgress: (done, total) => setProgress({ done, total }),
      },
    );

    setProgress(null);
    reportRun(result.tally, result.remaining, result.error, started);
  }

  function reportRun(
    tally: SourcingRunTally,
    remaining: number,
    error: unknown,
    startedAt: number,
  ) {
    if (error) {
      const code = inspectErrorCode(error);
      showToast(t(sourcingErrorMessage(code).key), "error");
      void track("admin_lab_source_error", {
        error_code: code,
        remaining,
        sourced: tally.suggested,
      });
    }
    // 오류로 멈췄어도 앞선 배치의 결과는 그리드에 남아 있다 — 그걸 말해준다.
    if (remaining > 0 && !error) showToast(t("lab.source.stopped", { remaining }), "info");
    if (tally.suggested + tally.manual + tally.unknownPerson > 0) {
      showToast(
        t("lab.source.done", {
          suggested: tally.suggested,
          manual: tally.manual,
          unknown: tally.unknownPerson,
          searches: tally.searchCalls,
        }),
        error ? "info" : "success",
      );
    }
    void track("admin_lab_source_run", {
      duration_ms: Date.now() - startedAt,
      targets: targets.length,
      suggested: tally.suggested,
      manual: tally.manual,
      unknown_person: tally.unknownPerson,
      cache_hits: tally.cacheHits,
      ai_judged: tally.aiJudged,
      ambiguous: tally.ambiguous,
      search_calls: tally.searchCalls,
      units: tally.units,
      remaining,
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openConfirm}
        disabled={busy}
        data-testid="lab-auto-source"
        title={t("lab.source.hint")}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: `1px solid ${running ? lab.gold : lab.border}`,
          background: running ? lab.goldSubtle : "transparent",
          color: running ? lab.gold : lab.textSub,
          fontSize: 13,
          fontFamily: lab.font,
          fontWeight: running ? 700 : 400,
          cursor: busy ? "not-allowed" : "pointer",
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {running
          ? t("lab.source.busy", { done: progress.done, total: progress.total })
          : previewing
            ? t("lab.source.confirm.loading")
            : t("lab.source.open")}
      </button>

      {preview && (
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
              onDeactivate: () => !runningRef.current && setPreview(null),
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
                  onClick={() => setPreview(null)}
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
                  onClick={() => void startRun()}
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
      )}
    </>
  );
}
