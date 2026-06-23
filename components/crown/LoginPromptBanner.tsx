/**
 * C-2 Crown Card · LoginPromptBanner — the unauth share gate.
 *
 * Wireframe `.login-banner` (docs/design/wireframes/Domain 3 · The Arena.html
 * line 742-746). Preview is always free; share/download require sign-in (AC-9,
 * AC-10). Shown only when the parent shell is data-crown="unauth"; the shell's
 * CSS dims and disables the share actions behind it.
 */
"use client";

import { useI18n } from "@/lib/i18n";
import styles from "./crown.module.css";

interface LoginPromptBannerProps {
  onSignIn: () => void;
}

const TEXT = {
  ko: {
    title: "Sign in to share your Crown",
    sub: "미리보기는 자유 · 공유·저장은 로그인이 필요합니다",
    cta: "Sign in",
  },
  en: {
    title: "Sign in to share your Crown",
    sub: "Preview freely · sign in to share or save",
    cta: "Sign in",
  },
} as const;

export function LoginPromptBanner({ onSignIn }: LoginPromptBannerProps): JSX.Element {
  const { lang } = useI18n();
  const t = TEXT[lang] ?? TEXT.en;
  return (
    <div className={styles.loginBanner}>
      <div className={styles.lbIco}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <div>
        <div className={styles.lbT}>{t.title}</div>
        <div className={styles.lbS}>{t.sub}</div>
      </div>
      <button type="button" className={styles.lbBtn} onClick={onSignIn}>
        {t.cta}
      </button>
    </div>
  );
}
