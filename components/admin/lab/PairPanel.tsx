/**
 * PairPanel — 편집기 STEP 2 대표 매치 패널 (THUMB-1 · 원장 D-35 · D-56 · 합격 시안
 * `docs/design/claude-design/THUMB-1_2026-10-18/WC48 VS Thumbnail.dc.html` B-1~B-4).
 *
 * 48칸 그리드 위쪽. 왼쪽 = A·B 칸(이름 · 8:9 자르기 창 · 위치 막대 1개), 오른쪽 =
 * 피치 카드 미리보기 1개(D-56). 막대를 움직이면 미리보기가 바로 바뀐다.
 * 고르기 자체는 그리드 칸에서 한다(A → B → 세 번째부터 A 교체, `lib/thumbnail/pick`).
 *
 * The Lab 이라 다크 그대로(D-40). 미리보기 커버는 공용 `VSThumb` — 피치 카드와 같은 부품.
 */
"use client";

import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import { isValidVideoId } from "@/lib/embed/youtubeUrl";
import { useT } from "@/lib/i18n/useT";
import { formatCloses } from "@/lib/pitch/trending";
import { defaultPos } from "@/lib/thumbnail/pair";
import type { PairPick, PairSide } from "@/lib/thumbnail/pick";
import { VSThumb, VSThumbHalf, type VSThumbSide } from "@/components/thumbnail/VSThumb";
import { lab } from "./theme";

interface PairPanelProps {
  contestants: ContestantDraft[];
  pick: PairPick;
  onPosChange: (side: PairSide, pos: number) => void;
  title: string;
  deadlineMs: number;
}

const SIDE_COLOR: Record<PairSide, string> = {
  a: "var(--color-turquoise)",
  b: "var(--color-crimson)",
};
const SIDE_INK: Record<PairSide, string> = {
  a: "var(--arena-ink)",
  b: "var(--color-white)",
};

/** 그리드 칸의 A/B 뱃지와 같은 모양 — 패널과 그리드가 한 표식을 쓴다. */
export function PairBadge({ side, size = 24 }: { side: PairSide; size?: number }): JSX.Element {
  return (
    <span
      data-testid={`pair-badge-${side}`}
      style={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: 5,
        background: SIDE_COLOR[side],
        color: SIDE_INK[side],
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {side.toUpperCase()}
    </span>
  );
}

export function sideData(
  contestants: ContestantDraft[],
  slot: number | null,
  pos: number | null,
): VSThumbSide | null {
  if (slot === null) return null;
  const c = contestants[slot];
  if (!c || !isValidVideoId(c.videoId ?? "")) return null;
  const orientation = c.videoOrientation === "portrait" ? "portrait" : "landscape";
  return { videoId: c.videoId!, orientation, pos: pos ?? defaultPos(orientation) };
}

function Slot({
  side,
  slot,
  data,
  name,
  onPosChange,
}: {
  side: PairSide;
  slot: number | null;
  data: VSThumbSide | null;
  name: string;
  onPosChange: (side: PairSide, pos: number) => void;
}) {
  const { t } = useT();
  const label = t(data?.orientation === "portrait" ? "lab.pair.posPortrait" : "lab.pair.posLandscape", {
    side: side.toUpperCase(),
  });
  const value = data ? data.pos : 0;
  return (
    <div
      data-testid={`pair-slot-${side}`}
      data-slot={slot ?? ""}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        border: `1px solid color-mix(in srgb, ${SIDE_COLOR[side]} 45%, transparent)`,
        borderRadius: 5,
        background: "var(--color-bg-soft)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <PairBadge side={side} />
        <span
          data-testid={`pair-slot-${side}-name`}
          style={{
            fontSize: 14,
            fontWeight: 600,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: data ? lab.text : lab.textSub,
          }}
        >
          {data ? name : t("lab.pair.slotEmpty")}
        </span>
      </div>
      <VSThumbHalf side={side} data={data} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: data ? 1 : 0.4 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            color: lab.textSub,
          }}
        >
          <span>{label}</span>
          <span data-testid={`pair-pos-${side}-value`} style={{ color: lab.gold }}>
            {data ? `${value}%` : "—"}
          </span>
        </div>
        <div style={{ position: "relative", height: 24, display: "flex", alignItems: "center" }}>
          <div
            style={{ position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2, background: "var(--color-border)" }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              width: `${value}%`,
              height: 4,
              borderRadius: 2,
              background: SIDE_COLOR[side],
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `calc(${value}% - 8px)`,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: lab.gold,
              boxShadow: "var(--shadow-gold)",
              pointerEvents: "none",
            }}
          />
          {/* 실제 조작은 기본 막대 — 키보드·보조기기가 그대로 쓴다. 겉모양만 위 세 겹. */}
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            disabled={!data}
            aria-label={label}
            data-testid={`pair-pos-${side}`}
            onChange={(e) => onPosChange(side, Number(e.target.value))}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              margin: 0,
              opacity: 0,
              cursor: data ? "pointer" : "not-allowed",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function PairPanel({ contestants, pick, onPosChange, title, deadlineMs }: PairPanelProps): JSX.Element {
  const { t } = useT();
  const a = sideData(contestants, pick.a, pick.aPos);
  const b = sideData(contestants, pick.b, pick.bPos);
  const nameOf = (slot: number | null) =>
    slot === null ? "" : contestants[slot]?.name.trim() || t("lab.pair.entryFallback", { n: slot + 1 });

  return (
    <section
      data-testid="pair-panel"
      style={{
        border: "1px solid var(--color-border-gold)",
        padding: "28px 32px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        background: "var(--color-bg-deep)",
        fontFamily: lab.font,
        color: lab.text,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.24em",
            fontWeight: 700,
            color: lab.gold,
          }}
        >
          {t("lab.pair.kicker")}
        </div>
        <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em" }}>
          {t("lab.pair.title")}
        </h3>
        <span style={{ fontSize: 13, color: lab.textSub }}>{t("lab.pair.help")}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "539px minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}>
          <Slot side="a" slot={pick.a} data={a} name={nameOf(pick.a)} onPosChange={onPosChange} />
          <Slot side="b" slot={pick.b} data={b} name={nameOf(pick.b)} onPosChange={onPosChange} />
        </div>

        {/* 미리보기 = 피치 카드 1개(D-56). */}
        <article
          data-testid="pair-preview"
          style={{
            width: "100%",
            borderRadius: 5,
            overflow: "hidden",
            border: `1px solid ${lab.border}`,
            background: "var(--color-bg-soft)",
          }}
        >
          <div style={{ position: "relative" }}>
            <VSThumb
              a={a}
              b={b}
              title={title.trim() || t("lab.draft.list.untitled")}
              showCrop
              testId="pair-preview-thumb"
            />
            <div style={{ position: "absolute", top: 12, left: 12, zIndex: 12, display: "flex", gap: 6 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: `1px solid ${lab.border}`,
                  background: "color-mix(in srgb, var(--arena-ink) 55%, transparent)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  color: lab.textSub,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: lab.textSub }} />
                {t("lab.pair.previewStatus")}
              </span>
            </div>
          </div>
          <div
            style={{
              padding: "15px 22px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: lab.textSub,
              display: "flex",
              gap: 8,
            }}
          >
            <span>{t("pitch.card.contestants")}</span>
            <span>·</span>
            <span>{t("pitch.card.closes", { date: formatCloses(new Date(deadlineMs)) })}</span>
          </div>
        </article>
      </div>
    </section>
  );
}
