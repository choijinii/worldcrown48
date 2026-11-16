/**
 * C-2 Crown Card · CrownStaticCard — the ready-state 1.91:1 preview.
 *
 * HTML/CSS (NOT canvas) mirror of the wireframe `.crown-card` markup
 * (docs/design/wireframes/Domain 3 · The Arena.html line 697-707). The canvas
 * renderer (drawLink) produces the downloadable PNG; this is the instant, crisp
 * in-modal preview. NO AI-Report badge (CLAUDE.md 원칙 #4), no Vote Count.
 */
"use client";

import { useEffect, useState } from "react";
import type { CrownData } from "@/lib/crown/formats";
import { isUsablePhoto, photoCandidates } from "@/lib/crown/photoFallback";
import styles from "./crown.module.css";

interface CrownStaticCardProps {
  data: CrownData;
  /** Backend PNG still generating (data-crown="loading" on the parent shell). */
  loadingLabel?: string;
}

export function CrownStaticCard({ data, loadingLabel }: CrownStaticCardProps): JSX.Element {
  // IMAGE-1 PR 3 — 영상 썸네일은 첫 주소가 안 뜨면 다음 주소, 다 안 되면 이니셜.
  const candidates = photoCandidates(data);
  const [tryIndex, setTryIndex] = useState(0);
  useEffect(() => setTryIndex(0), [data.photoUrl, data.photoFallbackUrl]);
  const src = candidates[tryIndex];
  const next = () => setTryIndex((i) => i + 1);
  return (
    <div className={styles.crownCard}>
      {/* eslint-disable-next-line @next/next/no-img-element — brand SVG, no optimization needed */}
      <img className={styles.crownCardMark} src="/brand/wc48-crown-filled.svg" alt="" />
      {/* IMAGE-1 (D-77) — 그림 엔트리 챔피언은 그 그림 · 영상 대회는 유튜브 썸네일(PR 3). 아니면 이니셜. */}
      <div className={styles.crownCardPhoto}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            className={styles.crownCardPhotoImg}
            src={src}
            alt=""
            data-testid="crown-card-photo"
            onError={next}
            onLoad={(e) => {
              if (!isUsablePhoto(e.currentTarget.naturalWidth)) next();
            }}
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
