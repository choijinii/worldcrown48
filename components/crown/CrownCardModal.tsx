/**
 * C-2 Crown Card · CrownCardModal — the dark-theme share modal shell.
 *
 * Wireframe `.sf-crown` state machine (docs/design/wireframes/Domain 3 · The
 * Arena.html line 684-748). `data-crown` drives which region shows:
 *   ready   → head + 1.91:1 static card + 3 share actions   (AC-2)
 *   unauth  → same, share actions dimmed + login banner      (AC-9, AC-10)
 *   menu    → format chips + canvas preview + share menu      (Phase 2)
 *   loading → backend PNG still generating                    (Phase 3)
 *
 * Always dark (Domain 3 tokens only — CLAUDE.md 원칙 #1, handoff §5). The modal
 * is a thin glue component (E2E-covered, handoff §3) over the tested pure render
 * logic in lib/crown/*. NO AI-Report badge, NO FIFA, NO Vote Count (§5 DON'T).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CrownData, FormatKey } from "@/lib/crown/formats";
import { track, trackWithConsent } from "@/lib/analytics";
import { useT } from "@/lib/i18n/useT";
import { slug } from "@/lib/crown/slug";
import { CrownStaticCard } from "./CrownStaticCard";
import { ShareActions } from "./ShareActions";
import { ShareMenu } from "./ShareMenu";
import { LoginPromptBanner } from "./LoginPromptBanner";
import { loadCrownImage, downloadCrown } from "./CrownCanvasPreview";
import styles from "./crown.module.css";

interface CrownCardModalProps {
  data: CrownData;
  /** v2.1: 공유 가능 여부 — 언제나 true 다(게스트 공유 개방, §16 2). */
  canShare: boolean;
  /** v2.1: 저장(다운로드) 가능 여부 — 로그인(비익명)만 (§16 3). 잠금 배너도 이 값이 정한다. */
  canSave: boolean;
  /** Open the sign-in flow from the unauth banner. */
  onSignIn: () => void;
  /** Tournament Deadline display value, e.g. "2026·06·20" (optional chip). */
  deadline?: string | null;
  /** Threaded into the §8 analytics events. */
  tournamentId?: string;
  /** Tournament category id (e.g. "KPOP") — threaded into 계측 소킥 A 공통 파라미터. */
  category?: string;
}

export function CrownCardModal({ data, canShare, canSave, onSignIn, deadline, tournamentId, category }: CrownCardModalProps): JSX.Element {
  const [view, setView] = useState<"ready" | "menu">("ready");
  const [menuFmt, setMenuFmt] = useState<FormatKey>("story");
  // Bumped on each open so the menu remounts and re-applies the preselected
  // format (the menu element stays in the DOM, hidden by CSS, between opens).
  const [openNonce, setOpenNonce] = useState(0);
  // v2.1: "unauth" 는 이제 **저장 잠금** 상태다. 공유는 어느 상태에서도 열려 있다.
  const crownState = !canSave ? "unauth" : view;
  const { lang } = useT();

  useEffect(() => {
    void track("crown_modal_opened", tournamentId ? { tournamentId } : {});
  }, [tournamentId]);

  // share_locked_view (EVENT_SPEC v1.2 §7) — **이름은 유지, 의미만 갱신.** v2.1부터 이
  // 배너는 "공유 잠금"이 아니라 **"저장(다운로드) 잠금"**이다. 이름을 바꾸면 GA 과거
  // 데이터와 끊기므로 정의만 바꿨다. 전환율의 분모라 tournament_id·category가 없으면
  // 그 파라미터만 뺀다 — 값을 지어내지 않는다.
  useEffect(() => {
    if (crownState !== "unauth") return;
    void trackWithConsent("share_locked_view", {
      is_guest: true,
      lang,
      ...(tournamentId ? { tournament_id: tournamentId } : {}),
      ...(category ? { category: category.toLowerCase() } : {}),
    });
  }, [crownState, tournamentId, category, lang]);

  // crown_card_created (EVENT_SPEC.md §4) — 실제 카드 이미지(canvas PNG)가 처음
  // 만들어지는 시점. ready 상태의 Download 버튼과 메뉴 진입(캔버스 미리보기가
  // 그때 그려진다) 두 경로 모두에서 호출되므로, 세션당 한 번만 보내도록 ref로
  // 막는다. card_id는 별도 Firestore 문서가 없어 tournamentId+슬러그로 대신한다
  // (근사값이라는 걸 알고 쓴다).
  const cardCreatedFiredRef = useRef(false);
  const fireCardCreated = useCallback(() => {
    if (cardCreatedFiredRef.current) return;
    cardCreatedFiredRef.current = true;
    void trackWithConsent("crown_card_created", {
      is_guest: !canSave,
      lang,
      ...(tournamentId ? { tournament_id: tournamentId } : {}),
      ...(category ? { category: category.toLowerCase() } : {}),
      card_id: `${tournamentId ?? "unknown"}_${slug(data.name)}`,
    });
  }, [canSave, lang, tournamentId, category, data.name]);

  // Ready-state quick Download → Story PNG (wireframe dlBtn, silent).
  const onDownload = (): void => {
    fireCardCreated();
    void downloadCrown("story", data, loadCrownImage());
  };
  // Ready "Share to X" / "Instagram" open the share menu with the format the
  // wireframe preps (X → link, Instagram → story); the real actions + toast live
  // in the menu (AC-7 fulfilled by "Post to X").
  const openMenu = (fmt: FormatKey): void => {
    fireCardCreated();
    setMenuFmt(fmt);
    setOpenNonce((n) => n + 1);
    setView("menu");
  };
  const onShareX = (): void => openMenu("link");

  return (
    <div className={styles.sfCrown} data-crown={crownState} data-testid="crown-modal">
      <div className={styles.crownStage}>
        <div className={styles.crownHalo} aria-hidden="true" />
        <div className={styles.crownModal} role="dialog" aria-modal="true" aria-label="Crown Card">
          <div className={styles.crownModalHead}>
            <div className={styles.crownEyebrow}>챔피언 확정 · Champion confirmed</div>
            <div className={styles.crownConfirm}>
              Your Crown is <em>{data.name}</em>
            </div>
            {deadline ? (
              <span
                aria-label="Tournament Deadline"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 10,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  letterSpacing: "0.06em",
                }}
              >
                Tournament Deadline · {deadline}
              </span>
            ) : null}
          </div>

          <CrownStaticCard data={data} />

          <ShareActions
            onDownload={onDownload}
            onShareX={onShareX}
            onOpenMenu={() => openMenu("story")}
            canSave={canSave}
          />

          <ShareMenu key={openNonce} data={data} initialFmt={menuFmt} onBack={() => setView("ready")} tournamentId={tournamentId} canSave={canSave} category={category} />

          <LoginPromptBanner onSignIn={onSignIn} />
        </div>
      </div>
    </div>
  );
}
