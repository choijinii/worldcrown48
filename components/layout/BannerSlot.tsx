/**
 * BannerSlot — 이름 붙은 배너 자리 하나 (ARENA-1 PR 1 · 원장 D-21 · 킥 §12 B-2).
 *
 * 자리 이름(slot)으로 `banners` 에서 켜진 배너 1건을 읽어 보여 준다. 없으면 **기본 공지**
 * (비로그인 = 로그인 유도 · 로그인 = 크라운 카드 공유 유도). 빈 상자를 그리지 않는다 —
 * 첫 렌더부터 기본 공지를 그리고, 배너 문서가 오면 그것으로 바꾼다.
 *
 * 고르는 규칙은 전부 lib/banner/bannerSlot(순수·유닛 테스트)이고 여기는 읽기·렌더만 한다.
 * 쿼리는 `slot ==` 하나뿐이다 — active·priority·기간은 메모리에서 거른다(복합 색인 불필요,
 * 자리당 문서는 몇 건뿐).
 *
 * 관리 화면(CRUD)·나머지 자리 배치는 소킥 BANNER-1.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuthStore } from "@/lib/authStore";
import { useT } from "@/lib/i18n/useT";
import {
  bannerAudience,
  resolveBanner,
  type BannerDoc,
  type BannerSlotName,
} from "@/lib/banner/bannerSlot";
import styles from "./bannerSlot.module.css";

interface BannerSlotProps {
  slot: BannerSlotName;
  /** 기본 공지(비로그인)의 "로그인 화면" — 화면이 가진 로그인 모달을 연다. */
  onSignIn?: () => void;
  className?: string;
}

export function BannerSlot({ slot, onSignIn, className }: BannerSlotProps): JSX.Element {
  const { t, lang } = useT();
  const user = useAuthStore((s) => s.user);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [docs, setDocs] = useState<BannerDoc[]>([]);

  useEffect(() => {
    let alive = true;
    getDocs(query(collection(getDb(), "banners"), where("slot", "==", slot)))
      .then((snap) => {
        if (!alive) return;
        setDocs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BannerDoc, "id">) })));
      })
      .catch((err) => {
        // 읽기 실패 = 기본 공지 그대로(빈칸 금지). 콘솔 오류로 올리지 않는다 — 기본 공지가
        // 설계된 폴백이라 팬 화면에는 결함이 아니다. 원인 추적용으로 warn 만 남긴다.
        console.warn("[BannerSlot] banners read failed — showing default notice", err);
      });
    return () => {
      alive = false;
    };
  }, [slot]);

  const audience = bannerAudience({
    signedIn: Boolean(user),
    isAnonymous: Boolean(user?.isAnonymous),
  });
  const resolved = resolveBanner(docs, slot, Date.now(), audience);
  const rootClass = [styles.slot, className ?? ""].filter(Boolean).join(" ");

  if (resolved.source === "doc") {
    const b = resolved.banner;
    const title = b.title[lang] || b.title.ko;
    const body = b.body ? b.body[lang] || b.body.ko : "";
    const inner = (
      <>
        <span className={styles.title}>{title}</span>
        {body ? <span className={styles.body}>{body}</span> : null}
      </>
    );
    return (
      <aside className={rootClass} data-testid="banner-slot" data-banner-slot={slot} data-banner-source="doc">
        {b.href ? (
          <Link href={b.href} className={styles.action}>
            {inner}
          </Link>
        ) : (
          <div className={styles.action}>{inner}</div>
        )}
      </aside>
    );
  }

  const notice = resolved.notice;
  const label = <span className={styles.title}>{t(notice.titleKey)}</span>;
  return (
    <aside
      className={rootClass}
      data-testid="banner-slot"
      data-banner-slot={slot}
      data-banner-source="default"
      data-banner-audience={audience}
    >
      {notice.action === "link" ? (
        <Link href={notice.href} className={styles.action}>
          {label}
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
        </Link>
      ) : (
        <button
          type="button"
          className={styles.action}
          onClick={() => (onSignIn ? onSignIn() : void signInWithGoogle("other").catch(() => {}))}
        >
          {label}
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
        </button>
      )}
    </aside>
  );
}
