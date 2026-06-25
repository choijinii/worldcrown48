/**
 * C-2 Crown Card · CrownToast — in-modal share feedback.
 *
 * Wireframe `.cc-toast` (line 366-367, 740). Controlled: render with a non-null
 * `message` to show it; the parent clears it after ~2.8s (wireframe toast()).
 * Accessible status region (AC-23: role="status" aria-live="polite").
 */
"use client";

import styles from "./crown.module.css";

interface CrownToastProps {
  message: string | null;
}

export function CrownToast({ message }: CrownToastProps): JSX.Element {
  return (
    <div
      className={message ? `${styles.ccToast} ${styles.show}` : styles.ccToast}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
