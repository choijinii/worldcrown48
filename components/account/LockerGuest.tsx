"use client";

/**
 * LockerGuest — Locker Room(/account) 비로그인 안내 화면 (NAV-1 · 정본 v4 40 · 41).
 *
 * 화이트(원장 D-40) · 메뉴바는 다크 그대로. 위→아래: 눈썹 "LOCKER ROOM" · 제목 · 안내문(대표 승인
 * 2026-10-13) · Google 로그인 버튼(글자 = 저장 잠금 승인본 lockCopy.cta 재사용) · 크라운 카드 빈
 * 자리(장식 · 글자·숫자 없음) · 배너 자리 locker-below.
 *
 * 이 화면을 열기만 해서는 익명 계정을 만들지 않는다(원장 D-41) — 로그인 버튼을 눌렀을 때만
 * Google 로그인을 부른다.
 */
import { useAuthStore } from "@/lib/authStore";
import { useT } from "@/lib/i18n/useT";
import { LOCK_COPY } from "@/lib/crown/lockCopy";
import { BannerSlot } from "@/components/layout/BannerSlot";
import styles from "./lockerGuest.module.css";

export function LockerGuest(): JSX.Element {
  const { t, lang } = useT();
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signIn = () => void signInWithGoogle("account").catch(() => {});

  return (
    <main className={styles.page} data-testid="locker-guest" data-locker-guest="">
      <div className={styles.inner}>
        <div className={styles.text}>
          <p className={styles.eyebrow}>{t("locker.guest.eyebrow")}</p>
          <h1 className={styles.h1}>{t("locker.guest.title")}</h1>
          <p className={styles.body}>{t("locker.guest.body")}</p>
          <button type="button" className={styles.signIn} onClick={signIn} data-testid="locker-guest-signin">
            <span className={styles.g} aria-hidden="true">
              G
            </span>
            {LOCK_COPY[lang].cta}
          </button>
        </div>
        {/* 크라운 카드 빈 자리 — 장식. 가짜 기록·숫자를 넣지 않는다. */}
        <div className={styles.cardSlot} aria-hidden="true" />
      </div>
      <div className={styles.banner}>
        <BannerSlot slot="locker-below" variant="leaderboard" onSignIn={signIn} className={styles.bannerSlot} />
      </div>
    </main>
  );
}
