/**
 * MediaSlot — Contestant 미디어 스왑 렌더러 (ND-1 §3 #12). The thin view over the
 * pure decideMediaRender decision:
 *   image → the licensed still (default · 48칸 그리드용)
 *   embed → 파사드: 정지 썸네일 + ▶ → hover/클릭 시에만 공식 iframe(mute·start)를
 *           lazy-mount (docs/demos/WC48_embed_demo_v1.html 준거). 서버에 영상 0바이트.
 *   clip  → 렌더 경로 없음 — decideMediaRender가 still로 fallback시킨다.
 */
"use client";

import { useState } from "react";
import {
  decideMediaRender,
  type ContestantMedia,
  type EmbedFacade,
} from "@/lib/media/mediaSlot";
import styles from "./MediaSlot.module.css";

function EmbedFacadeView({ facade, alt }: { facade: EmbedFacade; alt: string }): JSX.Element {
  const [active, setActive] = useState(false);
  return (
    <div
      className={styles.embedZone}
      onMouseEnter={() => setActive(true)}
      onFocus={() => setActive(true)}
      data-testid="media-embed"
      data-active={active}
    >
      {active ? (
        <iframe
          className={styles.iframe}
          src={facade.iframeSrc}
          title={alt || "Official video embed"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          type="button"
          className={styles.facade}
          onClick={() => setActive(true)}
          aria-label="영상 재생"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.thumb} src={facade.thumbnailUrl} alt={alt} />
          <span className={styles.play} aria-hidden="true">
            ▶
          </span>
          <span className={styles.embedChip}>EMBED</span>
        </button>
      )}
    </div>
  );
}

export function MediaSlot({
  media,
  imageUrl,
  alt = "",
  className,
}: {
  media?: ContestantMedia;
  imageUrl: string;
  alt?: string;
  className?: string;
}): JSX.Element | null {
  const decision = decideMediaRender(media, imageUrl);
  if (decision.render === "embed") {
    return <EmbedFacadeView facade={decision.facade} alt={alt} />;
  }
  if (decision.render === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className ?? styles.image} src={decision.imageUrl} alt={alt} />;
  }
  return null; // clip-only or empty → nothing to render (schema reserved, no path)
}
