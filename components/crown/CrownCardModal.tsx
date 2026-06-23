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

import { useEffect, useState } from "react";
import type { CrownData, FormatKey } from "@/lib/crown/formats";
import { track } from "@/lib/analytics";
import { CrownStaticCard } from "./CrownStaticCard";
import { ShareActions } from "./ShareActions";
import { ShareMenu } from "./ShareMenu";
import { LoginPromptBanner } from "./LoginPromptBanner";
import { loadCrownImage, downloadCrown } from "./CrownCanvasPreview";
import styles from "./crown.module.css";

interface CrownCardModalProps {
  data: CrownData;
  /** True once a non-anonymous Voter is signed in (gates share/download). */
  canShare: boolean;
  /** Open the sign-in flow from the unauth banner. */
  onSignIn: () => void;
  /** Tournament Deadline display value, e.g. "2026·06·20" (optional chip). */
  deadline?: string | null;
  /** Threaded into the §8 analytics events. */
  tournamentId?: string;
}

export function CrownCardModal({ data, canShare, onSignIn, deadline, tournamentId }: CrownCardModalProps): JSX.Element {
  const [view, setView] = useState<"ready" | "menu">("ready");
  const [menuFmt, setMenuFmt] = useState<FormatKey>("story");
  // Bumped on each open so the menu remounts and re-applies the preselected
  // format (the menu element stays in the DOM, hidden by CSS, between opens).
  const [openNonce, setOpenNonce] = useState(0);
  const crownState = !canShare ? "unauth" : view;

  useEffect(() => {
    void track("crown_modal_opened", tournamentId ? { tournamentId } : {});
  }, [tournamentId]);

  // Ready-state quick Download → Story PNG (wireframe dlBtn, silent).
  const onDownload = (): void => {
    void downloadCrown("story", data, loadCrownImage());
  };
  // Ready "Share to X" / "Instagram" open the share menu with the format the
  // wireframe preps (X → link, Instagram → story); the real actions + toast live
  // in the menu (AC-7 fulfilled by "Post to X").
  const openMenu = (fmt: FormatKey): void => {
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
            disabled={!canShare}
          />

          <ShareMenu key={openNonce} data={data} initialFmt={menuFmt} onBack={() => setView("ready")} tournamentId={tournamentId} />

          <LoginPromptBanner onSignIn={onSignIn} />
        </div>
      </div>
    </div>
  );
}
