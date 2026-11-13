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
 *
 * LAB-FIX-3 (원장 D-89) — 칸의 손 넣기를 켜고 끄는 버튼으로 바꿨다.
 *   · 자동 칸([동영상 생성]·검수기·[새 영상 찾기]로 영상이 들어온 칸) = [새 영상 찾기]만.
 *   · 수동 칸(영상 없는 칸 + 손으로 영상을 넣은 칸) = [영상] · [이미지] · [이미지 파일].
 *     [영상]·[이미지]를 누르면 그 칸에만 쓰는 주소 줄이 열리고 Enter 또는 ↵ 로 넣는다. 켜진 버튼을 다시
 *     누르면 빠진다(묻지 않음). 또 누르면 먼저 넣었던 주소가 채워진 채 열린다(주소 기억 · 초안에만).
 *   · 🔎(검색어 힌트 툴팁) · [그림 지우기] · 수동 칸의 [영상 찾기]는 없앴다. 판정은 lib/lab/manualMedia.
 *   · 이름만 있고 영상·그림이 없는 칸 가운데는 크라운 로고(정본 /brand/wc48-crown-filled.svg).
 */
"use client";

import { useRef, useState } from "react";
import { slotButtons } from "@/lib/lab/manualMedia";
import type { Message } from "@/lib/lab/embedMessages";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import { slotPreview } from "@/lib/lab/entryImages";
import { sourceHost } from "@/lib/media/storageUrl";
import type { MessageKey } from "@/lib/i18n/messages";
import { useT } from "@/lib/i18n/useT";
import type { SlotSourcingState } from "@/lib/lab/sourcingDraft";
import type { SlotReviewFlag } from "@/lib/lab/reviewFlags";
import {
  sourcingBadgeTone,
  sourcingDemotedMessage,
  sourcingReasonMessage,
  sourcingStatusMessage,
} from "@/lib/lab/sourcingMessages";
import type { PairSide } from "@/lib/thumbnail/pick";
import { PairBadge } from "./PairPanel";
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
  /** THUMB-1: 이 칸이 대표 매치의 A·B 이면 그 쪽. */
  pairMark?: PairSide | null;
  /** THUMB-1: 미리보기 칸을 누르면 대표 매치로 고른다. 영상이 있는 칸에만 넘어온다. */
  onPick?: (index: number) => void;
  /** IMAGE-1 (D-77) — 칸마다 그림 넣기 · 지우기. 없으면 칩을 그리지 않는다. */
  image?: SlotImageHandlers;
  /** IMAGE-1 — 이름↔영상 불일치(영상 제목·채널에 이름·소속이 없다). */
  videoMismatch?: boolean;
  /** LAB-FIX-3 (D-89) — 수동 칸의 [영상] 넣기 · 빼기. 없으면 [영상]을 그리지 않는다. */
  video?: SlotVideoHandlers;
}

export interface SlotVideoHandlers {
  /** 실패하면 보여 줄 문구, 성공하면 null. */
  onAdd: (index: number, url: string) => Promise<Message | null>;
  onRemove: (index: number) => void;
}

type LineKind = "video" | "image";

export type ImportFailure = "fetch-failed" | "not-image" | "too-large" | "too-small";

export interface SlotImageHandlers {
  onFile: (index: number, file: File) => void;
  /** 실패하면 이유, 성공하면 null. */
  onUrl: (index: number, url: string) => Promise<ImportFailure | null>;
  onRemove: (index: number) => void;
  /** 이 칸이 올리는 중. */
  busy?: boolean;
}

const FAIL_KEY: Record<ImportFailure, MessageKey> = {
  "fetch-failed": "lab.image.fail.fetchFailed",
  "not-image": "lab.image.fail.notImage",
  "too-large": "lab.image.fail.tooLarge",
  "too-small": "lab.image.fail.tooSmall",
};

/** 주황 — 팔레트에 없어 금색과 크림슨을 섞는다(토큰만 · check:hex). */
const ORANGE = "color-mix(in srgb, var(--color-gold) 55%, var(--color-crimson))";

const chipStyle: React.CSSProperties = {
  padding: "2px 7px",
  borderRadius: 999,
  border: `1px solid ${lab.border}`,
  background: "transparent",
  color: lab.textSub,
  fontSize: 9,
  fontFamily: lab.font,
  cursor: "pointer",
};

/** 켜고 끄는 칸 버튼 — 켜지면 금색(기존 토큰만 · check:hex). */
function toggleStyle(on: boolean): React.CSSProperties {
  return on
    ? { ...chipStyle, borderColor: lab.gold, background: lab.goldSubtle, color: lab.gold, fontWeight: 700 }
    : chipStyle;
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
  borderRadius: "var(--radius-border)",
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
  pairMark = null,
  onPick,
  image,
  videoMismatch = false,
  video,
}: ContestantEditorProps): JSX.Element {
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  // 주소 줄은 칸 안에서 한 번에 하나 — [영상] 줄 또는 [이미지] 줄.
  const [line, setLine] = useState<LineKind | null>(null);
  const [lineValue, setLineValue] = useState("");
  const [lineBusy, setLineBusy] = useState(false);
  const [lineFail, setLineFail] = useState<Message | null>(null);
  const buttons = slotButtons(contestant);
  const n = index + 1;
  const isEmpty = contestant.name.trim() === "";
  // LAB-EV-1: 영상만 있는 슬롯도 그리드에서 비어 보이면 안 된다 — 유튜브 썸네일을
  // 미리보기로 쓴다(imageUrl은 건드리지 않는다. 라이선스된 스틸의 자리다).
  const videoId = contestant.videoId ?? "";
  // IMAGE-1 — 영상 썸네일 > 그림 600 사본 > 없음.
  const preview = slotPreview(contestant);
  const previewUrl = preview.url;
  // 이름 아래 한 줄: 영상 칸은 제목 · 채널, 그림 엔트리는 출처 도메인 글자.
  const metaLine = videoId
    ? [contestant.videoTitle, contestant.videoChannel].filter(Boolean).join(" · ")
    : contestant.imageUrl
      ? sourceHost(contestant.imageSource?.sourcePage)
      : "";

  function closeLine() {
    setLine(null);
    setLineFail(null);
  }

  /** [영상]·[이미지] — 켜져 있으면 빼고, 꺼져 있으면 기억한 주소를 채운 채 줄을 열고 닫는다. */
  function toggle(kind: LineKind) {
    const on = kind === "video" ? buttons.video === "on" : buttons.image === "on";
    if (on) {
      closeLine();
      if (kind === "video") video?.onRemove(index);
      else image?.onRemove(index);
      return;
    }
    if (line === kind) {
      closeLine();
      return;
    }
    setLine(kind);
    setLineFail(null);
    setLineValue((kind === "video" ? contestant.manualVideoUrl : contestant.manualImageUrl) ?? "");
  }

  async function submitLine() {
    const url = lineValue.trim();
    if (!line || !url || lineBusy) return;
    setLineBusy(true);
    setLineFail(null);
    try {
      let fail: Message | null = null;
      if (line === "video") {
        if (video) fail = await video.onAdd(index, url);
      } else if (image) {
        const reason = await image.onUrl(index, url);
        fail = reason ? { key: FAIL_KEY[reason] } : null;
      }
      setLineFail(fail);
      if (!fail) setLine(null);
    } finally {
      setLineBusy(false);
    }
  }
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
      data-pair={pairMark ?? ""}
      onDragOver={image ? (e) => e.preventDefault() : undefined}
      onDrop={
        image
          ? (e) => {
              // 한 칸에 한 장을 놓으면 그 칸만 — 그리드 전체 끌어놓기로 번지지 않게 멈춘다.
              const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
              if (!file) return;
              e.preventDefault();
              e.stopPropagation();
              image.onFile(index, file);
            }
          : undefined
      }
      style={{
        position: "relative",
        background: lab.surface,
        borderRadius: "var(--radius-border)",
        border: pairMark
          ? `2px solid ${pairMark === "a" ? lab.turquoise : lab.crimson}`
          : isEmpty
            ? `2px dashed ${lab.borderDashed}`
            : `1px solid ${lab.border}`,
        padding: 8,
        display: "flex",
        flexDirection: "column",
        // 그리드 칸의 최소 너비는 기본이 내용 폭이다 — 긴 글자(영상 제목·소속·출처 도메인)가
        // 칸을, 그리고 세로줄 전체를 넓히지 못하게 0 으로 둔다(EDITOR-GRID-FIX).
        minWidth: 0,
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
        // THUMB-1: 미리보기 칸을 누르면 대표 매치로 고른다(안의 버튼은 제 일을 한다).
        role={onPick ? "button" : undefined}
        tabIndex={onPick ? 0 : undefined}
        aria-label={onPick ? t("lab.pair.pickAria", { n }) : undefined}
        data-testid={`contestant-pick-${index}`}
        onClick={(e) => {
          if (!onPick || (e.target as HTMLElement).closest("button")) return;
          onPick(index);
        }}
        onKeyDown={(e) => {
          if (!onPick || e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPick(index);
          }
        }}
        style={{
          cursor: onPick ? "pointer" : undefined,
          aspectRatio: "1 / 1",
          borderRadius: "var(--radius-border)",
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
        {!previewUrl &&
          (isEmpty ? (
            "+"
          ) : (
            // 장식용 정본 로고(SVG · NavBrand 와 같은 파일) — 글 읽기 프로그램은 건너뛴다.
            <img
              data-testid={`slot-crown-${index}`}
              src="/brand/wc48-crown-filled.svg"
              alt=""
              aria-hidden="true"
              style={{ width: "40%", height: "auto", opacity: 0.35 }}
            />
          ))}
        {preview.imageOnly && (
          <span
            data-testid={`slot-image-badge-${index}`}
            style={{
              position: "absolute",
              right: 4,
              bottom: 4,
              padding: "1px 6px",
              borderRadius: 999,
              background: "rgba(0,0,31,0.72)",
              color: lab.turquoise,
              fontSize: 9,
              fontWeight: 700,
            }}
          >
            {t("lab.image.badge")}
          </span>
        )}
        {image?.busy && (
          <span
            data-testid={`slot-image-busy-${index}`}
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,31,0.55)" }}
          />
        )}
        {pairMark && (
          <span style={{ position: "absolute", left: 4, top: 4, zIndex: 1 }}>
            <PairBadge side={pairMark} size={20} />
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
      {metaLine && (
        <span
          data-testid={`slot-meta-${index}`}
          title={metaLine}
          style={{
            display: "block",
            marginTop: 2,
            fontSize: 9,
            color: lab.textMuted,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >{metaLine}</span>
      )}
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
      {(duplicate || mismatch || videoMismatch) && (
        <div
          data-testid={`contestant-review-${index}`}
          style={{ marginTop: 6, display: "grid", gap: 3 }}
        >
          {/* IMAGE-1 — 이름↔영상 불일치. 새 배지가 맨 앞(지시서 2-C 12). */}
          {videoMismatch && (
            <span
              data-review-flag="name-video-mismatch"
              title={t("lab.badge.nameVideoDesc")}
              style={{ ...badgeStyle(ORANGE), cursor: "help" }}
            >
              {t("lab.badge.nameVideo")}
            </span>
          )}
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

      {/* LAB-FIX-3 (D-89) — 칸 버튼 한 줄. 자동 칸 = [새 영상 찾기] · 수동 칸 = [영상] · [이미지] · [이미지 파일]. */}
      {((buttons.refresh && onRefreshVideo) || (buttons.manual && (video || image))) && (
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {buttons.refresh && onRefreshVideo && (
            <button
              type="button"
              onClick={() => onRefreshVideo(index)}
              disabled={refreshing}
              data-testid={`contestant-refresh-${index}`}
              style={{ ...chipStyle, cursor: refreshing ? "not-allowed" : "pointer" }}
            >
              {refreshing ? t("lab.source.refreshing") : t("lab.source.refresh")}
            </button>
          )}
          {buttons.manual && video && (
            <button
              type="button"
              data-testid={`slot-video-${index}`}
              aria-pressed={buttons.video === "on"}
              aria-expanded={line === "video"}
              disabled={lineBusy}
              onClick={() => toggle("video")}
              style={toggleStyle(buttons.video === "on")}
            >
              {t("lab.slot.video")}
            </button>
          )}
          {buttons.manual && image && (
            <>
              <button
                type="button"
                data-testid={`slot-image-url-${index}`}
                aria-pressed={buttons.image === "on"}
                aria-expanded={line === "image"}
                // 리뷰 M-4 — 올리는 중에 빼면 끝난 업로드가 그림을 되살린다.
                disabled={image.busy || lineBusy}
                onClick={() => toggle("image")}
                style={toggleStyle(buttons.image === "on")}
              >
                {t("lab.image.chipUrl")}
              </button>
              <button
                type="button"
                data-testid={`slot-image-file-${index}`}
                disabled={image.busy}
                onClick={() => fileRef.current?.click()}
                style={chipStyle}
              >
                {t("lab.image.chipFile")}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                data-testid={`slot-image-file-input-${index}`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) image.onFile(index, file);
                }}
              />
            </>
          )}
        </div>
      )}
      {buttons.manual && line && (
        <div style={{ display: "flex", gap: 4, alignItems: "stretch" }}>
          <input
            type="url"
            value={lineValue}
            autoFocus
            disabled={lineBusy}
            placeholder={t(line === "video" ? "lab.slot.videoPlaceholder" : "lab.slot.imagePlaceholder")}
            aria-label={t(line === "video" ? "lab.slot.videoPlaceholder" : "lab.slot.imagePlaceholder")}
            data-testid={line === "video" ? `slot-video-input-${index}` : `slot-image-url-input-${index}`}
            onChange={(e) => setLineValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submitLine();
              }
            }}
            style={{ ...fieldStyle, minWidth: 0 }}
          />
          <button
            type="button"
            data-testid={`slot-line-submit-${index}`}
            aria-label={t("lab.slot.submit")}
            title={t("lab.slot.submit")}
            disabled={lineBusy}
            onClick={() => void submitLine()}
            style={{ ...chipStyle, marginTop: 4, borderRadius: "var(--radius-border)", fontSize: 11, flexShrink: 0 }}
          >
            ↵
          </button>
        </div>
      )}
      {lineFail && line && (
        <span
          data-testid={line === "video" ? `slot-video-fail-${index}` : `slot-image-fail-${index}`}
          role="status"
          style={{ marginTop: 3, fontSize: 9, color: lab.crimson }}
        >
          {t(lineFail.key, lineFail.vars)}
        </span>
      )}
    </div>
  );
}
