/**
 * C-2 Crown Card · ShareMenu — format chips + canvas preview + share actions.
 *
 * Wireframe `.share-menu` (line 713-741). Owns the selected format, renders the
 * live canvas preview, and wires the share actions to the browser glue in
 * CrownCanvasPreview:
 *   Download      → selected-format PNG + toast            (AC-5)
 *   Share…        → Web Share, else download fallback       (AC-8)
 *   Save both     → 9:16 + 4:5 in sequence + toast          (AC-6)
 *   Post to X     → X intent + Link PNG + toast             (AC-7)
 * Emits the §8 analytics events. In-modal feedback via CrownToast (AC-23).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FORMATS, type FormatKey, type CrownData } from "@/lib/crown/formats";
import { useI18n } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { FormatChips } from "./FormatChips";
import { CrownToast } from "./CrownToast";
import {
  CrownCanvasPreview,
  loadCrownImage,
  downloadCrown,
  nativeShareCrown,
  shareCrownToX,
} from "./CrownCanvasPreview";
import styles from "./crown.module.css";

interface ShareMenuProps {
  data: CrownData;
  onBack: () => void;
  tournamentId?: string;
  /** Format preselected when the menu opens (ready "X" → link, "Instagram" → story). */
  initialFmt?: FormatKey;
}

function strings(lang: "ko" | "en") {
  const en = {
    title: "Share your Crown Card",
    back: "Back to card",
    download: "Download",
    share: "Share…",
    both: "Save both ratios · 9:16 + 4:5",
    postX: "Post to X · text + image",
    note: "Rendered instantly in your browser · no backend · Instagram · Meta · X ready",
    savedFmt: (f: string) => `PNG saved · ${f}`,
    savedBoth: "Saved both · 9:16 + 4:5",
    xOpened: "Opened X · attach the saved image",
    shareFallback: "This browser can't share directly — image saved instead",
  };
  if (lang === "en") return en;
  return {
    ...en,
    title: "Share your Crown Card",
    back: "Back to card",
    savedFmt: (f: string) => `PNG 저장 완료 · ${f}`,
    savedBoth: "9:16 + 4:5 두 장 저장 완료",
    xOpened: "X 작성창을 열었어요 · 저장된 이미지를 첨부하세요",
    shareFallback: "이 브라우저는 직접 공유를 지원하지 않아 이미지를 저장했어요",
  };
}

export function ShareMenu({ data, onBack, tournamentId, initialFmt = "story" }: ShareMenuProps): JSX.Element {
  const { lang } = useI18n();
  const t = strings(lang === "ko" ? "ko" : "en");
  const [fmt, setFmt] = useState<FormatKey>(initialFmt);
  const [toast, setToastMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 2800);
  }, []);

  // Clear any pending toast timer on unmount (the menu remounts on each open via
  // key={openNonce}) so setToastMsg never fires on an unmounted instance.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const img = loadCrownImage();
  // §8 analytics base — drop tournamentId when absent (EventParams forbids undefined).
  const base: Record<string, string> = {};
  if (tournamentId) base.tournamentId = tournamentId;

  const changeFmt = (next: FormatKey): void => {
    if (next === fmt) return;
    void track("crown_format_changed", { ...base, fromFmt: fmt, toFmt: next });
    setFmt(next);
  };

  const onDownload = async (): Promise<void> => {
    await downloadCrown(fmt, data, img);
    void track("crown_downloaded", { ...base, fmt });
    showToast(t.savedFmt(fmt));
  };

  const onNative = async (): Promise<void> => {
    const result = await nativeShareCrown(fmt, data, img);
    if (result === "shared") void track("crown_shared_native", { ...base, fmt });
    else showToast(t.shareFallback);
  };

  const onBoth = async (): Promise<void> => {
    // Await BOTH saves before claiming success (AC-6) — a failed feed render
    // must not show "saved both". Sequential awaits also space the two browser
    // downloads so the second isn't blocked.
    await downloadCrown("story", data, img);
    await downloadCrown("feed", data, img);
    void track("crown_downloaded", { ...base, fmt: "both" });
    showToast(t.savedBoth);
  };

  const onPostX = async (): Promise<void> => {
    await shareCrownToX(data, img);
    void track("crown_shared_x", { ...base });
    showToast(t.xOpened);
  };

  return (
    <div className={styles.shareMenu}>
      <div className={styles.smTop}>
        <button type="button" className={styles.smBack} onClick={onBack} aria-label={t.back}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className={styles.smh}>{t.title}</div>
      </div>

      <FormatChips fmt={fmt} onChange={changeFmt} />

      <div className={styles.smPreview}>
        <CrownCanvasPreview fmt={fmt} data={data} />
        <div className={styles.ccDim}>{FORMATS[fmt].label}</div>
      </div>

      <div className={styles.smActions}>
        <button type="button" className={`${styles.shareBtn} ${styles.primary}`} onClick={onDownload} aria-label={t.download}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12M7 11l5 4 5-4" />
            <path d="M5 19h14" />
          </svg>{" "}
          {t.download}
        </button>
        <button type="button" className={styles.shareBtn} onClick={onNative} aria-label={t.share}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
          </svg>{" "}
          {t.share}
        </button>
      </div>

      <div className={styles.smNet}>
        <button type="button" className={styles.shareOpt} onClick={onBoth} aria-label={t.both}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
          </svg>{" "}
          {t.both}
        </button>
        <button type="button" className={styles.shareOpt} onClick={onPostX} aria-label={t.postX}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 4l16 16M20 4L4 20" />
          </svg>{" "}
          {t.postX}
        </button>
      </div>

      <div className={styles.ccNote}>{t.note}</div>
      <CrownToast message={toast} />
    </div>
  );
}
