/**
 * C-2 Crown Card · ShareActions — the ready-state three buttons.
 *
 * Wireframe `.share-actions` (docs/design/wireframes/Domain 3 · The Arena.html
 * line 708-712): Download (primary) · Share to X · Instagram. AC-2.
 *   - Download  → quick-save (Story PNG)         [wired in Phase 2 with canvas]
 *   - Share to X → X intent + Link PNG           [wired in Phase 2]
 *   - Instagram → opens the format/share menu    [Phase 1: state → "menu"]
 *
 * v2.1 (§16 2·3): **Download 만 잠긴다.** 공유(X · Instagram/공유 메뉴)는 게스트에게 열려
 * 있다. 예전에는 셸 CSS가 `.shareActions` 전체를 `pointer-events: none` 으로 덮어 세 버튼을
 * 한꺼번에 막았다 — 그대로 두면 게스트가 공유 버튼을 눌러도 아무 일이 일어나지 않는다.
 * 이제 `data-locked` 가 붙은 버튼만 흐려진다.
 */
"use client";

import styles from "./crown.module.css";

interface ShareActionsProps {
  onDownload: () => void;
  onShareX: () => void;
  onOpenMenu: () => void;
  /** v2.1: 저장(다운로드)만 로그인 게이트. 공유 두 개는 언제나 열려 있다. */
  canSave?: boolean;
}

export function ShareActions({ onDownload, onShareX, onOpenMenu, canSave = true }: ShareActionsProps): JSX.Element {
  return (
    <div className={styles.shareActions}>
      <button type="button" className={`${styles.shareBtn} ${styles.primary}`} onClick={onDownload} disabled={!canSave} data-locked={!canSave} aria-label="Download Crown Card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12M7 11l5 4 5-4" />
          <path d="M5 19h14" />
        </svg>{" "}
        Download
      </button>
      <button type="button" className={styles.shareBtn} onClick={onShareX} aria-label="Share to X">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 4l16 16M20 4L4 20" />
        </svg>{" "}
        Share to X
      </button>
      <button type="button" className={styles.shareBtn} onClick={onOpenMenu} aria-label="Open share menu">
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
