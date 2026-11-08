/**
 * C-2 Crown Card · CrownStaticCard — the ready-state 1.91:1 preview.
 *
 * HTML/CSS (NOT canvas) mirror of the wireframe `.crown-card` markup
 * (docs/design/wireframes/Domain 3 · The Arena.html line 697-707). The canvas
 * renderer (drawLink) produces the downloadable PNG; this is the instant, crisp
 * in-modal preview. NO AI-Report badge (CLAUDE.md 원칙 #4), no Vote Count.
 */
"use client";

import type { CrownData } from "@/lib/crown/formats";
import styles from "./crown.module.css";

interface CrownStaticCardProps {
  data: CrownData;
  /** Backend PNG still generating (data-crown="loading" on the parent shell). */
  loadingLabel?: string;
}

export function CrownStaticCard({ data, loadingLabel }: CrownStaticCardProps): JSX.Element {
  return (
    <div className={styles.crownCard}>
      {/* eslint-disable-next-line @next/next/no-img-element — brand SVG, no optimization needed */}
      <img className={styles.crownCardMark} src="/brand/wc48-crown-filled.svg" alt="" />
      {/* IMAGE-1 (D-77) — 그림 엔트리 챔피언은 그 그림(우리 Storage 복사본). 아니면 이니셜. */}
      <div className={styles.crownCardPhoto}>
        {data.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.crownCardPhotoImg}
            src={data.photoUrl}
            alt=""
            data-testid="crown-card-photo"
            style={{ objectPosition: `50% ${data.photoFocusY ?? 40}%` }}
          />
        ) : (
          data.initial
        )}
      </div>
      <div className={styles.crownCardInfo}>
        <div className={styles.cl}>CHAMPION</div>
        <div className={styles.cn} data-testid="crown-card-name">{data.name}</div>
        <div className={styles.ct}>{data.title}</div>
        <div className={styles.cw}>{data.url}</div>
      </div>
      <div className={styles.crownLoading}>
        <div className="spinner lg" aria-hidden="true" />
        <div className={styles.lt}>{loadingLabel ?? "Crown Card 생성 중 · generating…"}</div>
      </div>
    </div>
  );
}
