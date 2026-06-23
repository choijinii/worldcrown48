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

import { useState } from "react";
import type { CrownData } from "@/lib/crown/formats";
import { CrownStaticCard } from "./CrownStaticCard";
import { ShareActions } from "./ShareActions";
import { LoginPromptBanner } from "./LoginPromptBanner";
import styles from "./crown.module.css";

interface CrownCardModalProps {
  data: CrownData;
  /** True once a non-anonymous Voter is signed in (gates share/download). */
  canShare: boolean;
  /** Open the sign-in flow from the unauth banner. */
  onSignIn: () => void;
  /** Tournament Deadline display value, e.g. "2026·06·20" (optional chip). */
  deadline?: string | null;
}

export function CrownCardModal({ data, canShare, onSignIn, deadline }: CrownCardModalProps): JSX.Element {
  const [view, setView] = useState<"ready" | "menu">("ready");
  const crownState = !canShare ? "unauth" : view;

  // Download / X share need the client canvas renderer — wired in Phase 2.
  const onDownload = (): void => {};
  const onShareX = (): void => {};

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
            onOpenMenu={() => setView("menu")}
            disabled={!canShare}
          />

          {/* menu region — full ShareMenu (chips + canvas + toast) lands in Phase 2 */}
          <div className={styles.shareMenu}>
            <div className={styles.smTop}>
              <button type="button" className={styles.smBack} onClick={() => setView("ready")} aria-label="Back to card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div className={styles.smh}>Share your Crown Card</div>
            </div>
          </div>

          <LoginPromptBanner onSignIn={onSignIn} />
        </div>
      </div>
    </div>
  );
}
