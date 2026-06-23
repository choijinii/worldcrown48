/**
 * C-2 Crown Card · ShareActions — the ready-state three buttons.
 *
 * Wireframe `.share-actions` (docs/design/wireframes/Domain 3 · The Arena.html
 * line 708-712): Download (primary) · Share to X · Instagram. AC-2.
 *   - Download  → quick-save (Story PNG)         [wired in Phase 2 with canvas]
 *   - Share to X → X intent + Link PNG           [wired in Phase 2]
 *   - Instagram → opens the format/share menu    [Phase 1: state → "menu"]
 *
 * Disabled + dimmed by the shell's CSS when data-crown="unauth" (AC-9).
 */
"use client";

import styles from "./crown.module.css";

interface ShareActionsProps {
  onDownload: () => void;
  onShareX: () => void;
  onOpenMenu: () => void;
  disabled?: boolean;
}

export function ShareActions({ onDownload, onShareX, onOpenMenu, disabled }: ShareActionsProps): JSX.Element {
  return (
    <div className={styles.shareActions}>
      <button type="button" className={`${styles.shareBtn} ${styles.primary}`} onClick={onDownload} disabled={disabled} aria-label="Download Crown Card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12M7 11l5 4 5-4" />
          <path d="M5 19h14" />
        </svg>{" "}
        Download
      </button>
      <button type="button" className={styles.shareBtn} onClick={onShareX} disabled={disabled} aria-label="Share to X">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 4l16 16M20 4L4 20" />
        </svg>{" "}
        Share to X
      </button>
      <button type="button" className={styles.shareBtn} onClick={onOpenMenu} disabled={disabled} aria-label="Open share menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
        </svg>{" "}
        Instagram
      </button>
    </div>
  );
}
