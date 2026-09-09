/**
 * C-2 Crown Card · LoginPromptBanner — **저장(다운로드) 잠금** 배너.
 *
 * v2.0까지 이 배너는 "공유·저장은 로그인이 필요합니다"였다. v2.1에서 게스트 공유가 열리면서
 * 그 문장은 **화면에서 사실과 다른 말**이 됐다 — 잠긴 것은 저장뿐이다(§16 2·3).
 * 문구는 2026-09-09 대표 승인본이며 마침표까지 그대로다(§5 DO 7).
 *
 * 부모 셸이 `data-crown="unauth"` 일 때만 보이고, 그 CSS가 **Download 버튼 하나만** 흐리게
 * 만든다(예전에는 버튼 세 개를 통째로 잠갔다).
 *
 * 문구의 단일 출처는 `lib/crown/lockCopy.ts` 다 — 승인 문구를 .tsx 안에 두면 node-env
 * 테스트가 못 읽어 CI가 지켜 주지 못한다.
 *
 * 이 배너를 본 시점이 `share_locked_view` 다 — 이름은 유지하고 의미만 "저장 잠금"으로
 * 갱신했다(EVENT_SPEC v1.2 §7: 이름을 바꾸면 GA 과거 데이터와 끊긴다).
 */
"use client";

import { useI18n } from "@/lib/i18n";
import { LOCK_COPY } from "@/lib/crown/lockCopy";
import styles from "./crown.module.css";

interface LoginPromptBannerProps {
  onSignIn: () => void;
}

export function LoginPromptBanner({ onSignIn }: LoginPromptBannerProps): JSX.Element {
  const { lang } = useI18n();
  const t = LOCK_COPY[lang as keyof typeof LOCK_COPY] ?? LOCK_COPY.en;
  return (
    <div className={styles.loginBanner}>
      <div className={styles.lbIco}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <div>
        {/* 승인본이 그 자체로 완결된 문장이라 제목 줄을 따로 두지 않는다 —
            "Sign in to share your Crown"은 v2.1에서 사실과 다르고 표 밖 문구다. */}
        <div className={styles.lbS}>{t.sub}</div>
      </div>
      <button type="button" className={styles.lbBtn} onClick={onSignIn}>
        {t.cta}
      </button>
    </div>
  );
}
