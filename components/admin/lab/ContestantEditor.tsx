/**
 * ContestantEditor — 48칸 중 한 칸 (AC Step2 #2·#5·#6 · LAB-UX-1 재구성).
 *
 * 빈 칸(이름 없음) → 금색 점선 + "+" / 채워진 칸 → 실선. 미리보기는 1:1 정사각
 * 중앙 크롭이다(대표 확정 2026-08-23): 유튜브 썸네일은 16:9지만 숏폼(9:16)이
 * 섞이면 16:9 틀에서 인물이 너무 작게 잡힌다.
 *
 * PR-2: "이미지 URL(라이선스 확인)" 칸을 삭제했다. 실데이터 528건 중 **0건**이
 * 채워져 있었다 — 아무도 쓰지 않는 칸이 카드 높이를 한 줄 먹고 있었다. 이제
 * 미리보기는 영상 썸네일 하나뿐이고, 영상이 없으면 예전처럼 자리만 비운다.
 *
 * LAB-UX-1이 바꾼 것 세 가지.
 *   ① **이름 칸에 ✎ 상시 노출** — 배지가 무엇이든 이름은 언제나 고칠 수 있다는 걸
 *      v1 목업이 안 보이게 그려서 대표가 "고치는 루트가 없나?"라고 물었다. 루트는
 *      있었고, 보이지 않았을 뿐이다.
 *   ② **검수 배지 2종 추가**(중복 의심 · 이름↔힌트 불일치). 지금까지 서버 로그에만
 *      있던 판정이라 운영자는 48칸을 눈으로 훑다 놓쳤다.
 *   ③ **검색 힌트 문구를 카드에서 뺀다** — 툴팁으로 옮겨 카드 높이를 줄인다.
 *      8열 그리드는 카드가 좁고 낮아야 성립한다.
 */
"use client";

import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import { buildThumbnailUrl } from "@/lib/embed/loopRange";
import { useT } from "@/lib/i18n/useT";
import type { SlotSourcingState } from "@/lib/lab/sourcingDraft";
import type { SlotReviewFlag } from "@/lib/lab/reviewFlags";
import {
  sourcingBadgeTone,
  sourcingDemotedMessage,
  sourcingReasonMessage,
  sourcingStatusMessage,
} from "@/lib/lab/sourcingMessages";
import { lab } from "./theme";

interface ContestantEditorProps {
  index: number;
  contestant: ContestantDraft;
  onChange: (index: number, patch: Partial<ContestantDraft>) => void;
  /** LAB-EV-1: 영상이 붙은 슬롯의 미세조정 열기. 없으면 버튼을 숨긴다. */
  onTune?: (index: number) => void;
  /** LAB-EV-2: 자동 소싱 결과 배지(제안·수동 필요·실존 의심). 없으면 안 그린다. */
  sourcing?: SlotSourcingState;
  /** LAB-UX-1: 검수 배지(중복 의심·이름↔힌트 불일치). 상태에서 파생된다. */
  reviewFlags?: SlotReviewFlag[];
  /** 중복 의심 배지의 [N번 보기] — 상대 칸으로 데려간다. */
  onGoToSlot?: (index: number) => void;
  /** LAB-EV-2: 이 슬롯만 캐시 우회 재검색. 소싱을 돌린 적 있을 때만 넘어온다. */
  onRefreshVideo?: (index: number) => void;
  /** 이 슬롯이 재검색 중. */
  refreshing?: boolean;
}

/** 슬롯 카드의 DOM id — [N번 보기] 스크롤이 이걸로 찾는다. */
export function slotDomId(index: number): string {
  return `contestant-node-${index}`;
}

/** 팔레트에 초록이 없다 — 검수기(LAB-EV-1)와 같은 색 역할을 쓴다. */
const TONE_COLOR = {
  ok: lab.turquoise,
  danger: lab.crimson,
  warn: lab.gold,
} as const;

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "4px 6px",
  borderRadius: 4,
  border: `1px solid ${lab.border}`,
  background: lab.surfaceElev,
  color: lab.text,
  fontSize: 11,
  fontFamily: lab.font,
  marginTop: 4,
};

const badgeStyle = (color: string): React.CSSProperties => ({
  justifySelf: "start",
  padding: "1px 6px",
  borderRadius: 999,
  border: `1px solid ${color}`,
  color,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.04em",
});

export function ContestantEditor({
  index,
  contestant,
  onChange,
  onTune,
  sourcing,
  reviewFlags,
  onGoToSlot,
  onRefreshVideo,
  refreshing = false,
}: ContestantEditorProps): JSX.Element {
  const { t } = useT();
  const n = index + 1;
  const isEmpty = contestant.name.trim() === "";
  // LAB-EV-1: 영상만 있는 슬롯도 그리드에서 비어 보이면 안 된다 — 유튜브 썸네일을
  // 미리보기로 쓴다(imageUrl은 건드리지 않는다. 라이선스된 스틸의 자리다).
  const videoId = contestant.videoId ?? "";
  const previewUrl = videoId ? buildThumbnailUrl(videoId) : "";
  const hint = (contestant.imageSearchKeyword ?? "").trim();
  const duplicate = reviewFlags?.find((f) => f.kind === "duplicate-suspect");
  const mismatch = reviewFlags?.find((f) => f.kind === "name-hint-mismatch");
  // The ✕ clears the WHOLE card (all fields, incl. the AI keyword hint) back to
  // an empty slot. Shown whenever the card holds anything to clear.
  const hasContent = [
    contestant.name,
    contestant.nationality,
    contestant.affiliation,
    contestant.imageSearchKeyword,
  ].some((v) => v.trim() !== "");

  function clearCard() {
    onChange(index, {
      name: "",
      nationality: "",
      affiliation: "",
      imageSearchKeyword: "",
    });
  }

  return (
    <div
      id={slotDomId(index)}
      data-testid={`contestant-node-${index}`}
      data-empty={isEmpty}
      style={{
        position: "relative",
        background: lab.surface,
        borderRadius: 5,
        border: isEmpty
          ? `2px dashed ${lab.borderDashed}`
          : `1px solid ${lab.border}`,
        padding: 8,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {hasContent && (
        <button
          type="button"
          onClick={clearCard}
          data-testid={`contestant-clear-${index}`}
          aria-label={t("lab.contestant.clearAria", { n })}
          title={t("lab.contestant.clearAria", { n })}
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            zIndex: 1,
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            border: "none",
            background: "rgba(14,9,68,0.75)",
            color: lab.textSub,
            fontSize: 13,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      )}
      <div
        style={{
          aspectRatio: "1 / 1",
          borderRadius: 4,
          background: lab.surfaceElev,
          backgroundImage: previewUrl ? `url(${previewUrl})` : undefined,
          // 1:1 중앙 크롭 — 16:9 썸네일도 숏폼도 인물이 크게 잡힌다(결정 ②).
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: lab.textMuted,
          fontSize: 22,
          position: "relative",
        }}
      >
        {!previewUrl && (isEmpty ? "+" : "🏆")}
        {/* 검색 힌트는 카드에서 뺐다 — 여기 🔎에 툴팁으로만 남는다(카드 높이 절약). */}
        {hint && (
          <span
            data-testid={`contestant-hint-${index}`}
            title={t("lab.review.hintTip", { hint })}
            style={{
              position: "absolute",
              left: 4,
              top: 4,
              padding: "1px 4px",
              borderRadius: 999,
              background: "rgba(0,0,31,0.72)",
              color: lab.textSub,
              fontSize: 9,
              cursor: "help",
            }}
          >
            🔎
          </span>
        )}
        {videoId && onTune && (
          <button
            type="button"
            onClick={() => onTune(index)}
            data-testid={`contestant-tune-${index}`}
            aria-label={t("lab.embed.tuner.title", { n })}
            style={{
              position: "absolute",
              left: 4,
              bottom: 4,
              padding: "2px 6px",
              borderRadius: 999,
              border: `1px solid ${lab.border}`,
              background: "rgba(0,0,31,0.72)",
              color: lab.gold,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: lab.font,
              cursor: "pointer",
            }}
          >
            {t("lab.embed.tuner.open")}
          </button>
        )}
      </div>

      {/* ✎는 장식이 아니라 안내다 — "이 칸은 언제든 고칠 수 있다"는 뜻. */}
      <div style={{ position: "relative" }}>
        <input
          value={contestant.name}
          onChange={(e) => onChange(index, { name: e.target.value })}
          placeholder={t("lab.contestant.namePlaceholder", { n })}
          aria-label={t("lab.contestant.nameAria", { n })}
          title={t("lab.contestant.editName", { n })}
          style={{ ...fieldStyle, fontWeight: 700, fontSize: 12, paddingRight: 18 }}
        />
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 5,
            top: "50%",
            transform: "translateY(-40%)",
            fontSize: 9,
            color: lab.textMuted,
            pointerEvents: "none",
          }}
        >
          ✎
        </span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <input
          value={contestant.affiliation}
          onChange={(e) => onChange(index, { affiliation: e.target.value })}
          placeholder={t("lab.contestant.affiliation")}
          aria-label={t("lab.contestant.affiliationAria", { n })}
          style={fieldStyle}
        />
        {/* 국가는 ISO 코드로 저장한다 — 화면이 보는 사람의 언어로 편다.
            운영자에겐 코드 그대로 보여주는 게 맞다: 고칠 때 무엇을 치는지 알아야 한다. */}
        <input
          value={contestant.nationality}
          onChange={(e) => onChange(index, { nationality: e.target.value })}
          placeholder={t("lab.contestant.nationality")}
          aria-label={t("lab.contestant.nationalityAria", { n })}
          style={{ ...fieldStyle, textTransform: "uppercase" }}
        />
      </div>
      {/* LAB-UX-1 — 검수 배지. 소싱 배지와 공존한다(한 칸에 둘 다 붙을 수 있다). */}
      {(duplicate || mismatch) && (
        <div
          data-testid={`contestant-review-${index}`}
          style={{ marginTop: 6, display: "grid", gap: 3 }}
        >
          {duplicate && (
            <>
              <span
                data-review-flag="duplicate-suspect"
                title={t("lab.review.duplicateTip", {
                  slots: duplicate.pairedIndexes.map((i) => i + 1).join(", "),
                })}
                style={{ ...badgeStyle(TONE_COLOR.warn), cursor: "help" }}
              >
                {t("lab.review.duplicate")} ·{" "}
                {duplicate.pairedIndexes.map((i) => i + 1).join(", ")}
              </span>
              {onGoToSlot && duplicate.pairedIndexes[0] !== undefined && (
                <button
                  type="button"
                  onClick={() => onGoToSlot(duplicate.pairedIndexes[0])}
                  data-testid={`contestant-goto-${index}`}
                  style={{
                    justifySelf: "start",
                    padding: "2px 7px",
                    borderRadius: 999,
                    border: `1px solid ${lab.border}`,
                    background: "transparent",
                    color: lab.textSub,
                    fontSize: 9,
                    fontFamily: lab.font,
                    cursor: "pointer",
                  }}
                >
                  {t("lab.review.goToSlot", { n: duplicate.pairedIndexes[0] + 1 })}
                </button>
              )}
            </>
          )}
          {mismatch && (
            <span
              data-review-flag="name-hint-mismatch"
              title={t("lab.review.nameMismatchTip", {
                tokens: mismatch.suggestedNameTokens.join(" ") || hint,
              })}
              style={{ ...badgeStyle(TONE_COLOR.danger), cursor: "help" }}
            >
              {t("lab.review.nameMismatch")}
            </span>
          )}
        </div>
      )}

      {/* LAB-EV-2 — 소싱 결과. "왜 안 됐는지"가 칸 안에 남아야 운영자가 조치한다. */}
      {sourcing && (
        <div
          data-testid={`contestant-sourcing-${index}`}
          data-sourcing-status={sourcing.status}
          style={{ marginTop: 6, display: "grid", gap: 3 }}
        >
          {(() => {
            // AI-2: 감점된 영상이 그래도 얹혔으면 배지에 사유를 매단다. 배지 문구
            // 자체는 그대로다 — "제안"인데 논란 영상일 수 있다는 건 툴팁으로 알린다.
            const demoted = sourcingDemotedMessage(sourcing);
            return (
              <span
                title={demoted ? t(demoted.key, demoted.vars) : undefined}
                data-demoted={demoted ? "true" : undefined}
                style={badgeStyle(TONE_COLOR[sourcingBadgeTone(sourcing.status)])}
              >
                {t(sourcingStatusMessage(sourcing.status).key)}
                {demoted ? " ⚠" : ""}
              </span>
            );
          })()}
          {(() => {
            const reason = sourcingReasonMessage(sourcing);
            return reason ? (
              <span style={{ fontSize: 9, color: lab.textMuted, lineHeight: 1.4 }}>
                {t(reason.key)}
              </span>
            ) : null;
          })()}
        </div>
      )}

      {/* 영상 찾기 — 배지와 **무관하게** 이름이 있는 칸이면 언제나 준다.
          배지 블록 안에 있던 시절엔 이름을 고치는 순간(배지 해제) 이 버튼까지
          사라져 새 인물의 영상을 찾을 길이 없었다(대표 스모크 ①). */}
      {onRefreshVideo && (
        <button
          type="button"
          onClick={() => onRefreshVideo(index)}
          disabled={refreshing}
          data-testid={`contestant-refresh-${index}`}
          style={{
            marginTop: 6,
            justifySelf: "start",
            alignSelf: "start",
            padding: "2px 7px",
            borderRadius: 999,
            border: `1px solid ${lab.border}`,
            background: "transparent",
            color: lab.textSub,
            fontSize: 9,
            fontFamily: lab.font,
            cursor: refreshing ? "not-allowed" : "pointer",
          }}
        >
          {refreshing
            ? t("lab.source.refreshing")
            : videoId
              ? t("lab.source.refresh")
              : t("lab.source.find")}
        </button>
      )}
    </div>
  );
}
