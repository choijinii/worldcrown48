/**
 * C-2 Crown Card · CrownCanvasPreview — live <canvas> preview + browser I/O.
 *
 * Wires the tested isomorphic renderers (lib/crown/canvas/*) to the DOM. The
 * component paints the selected format on a single requestAnimationFrame tick
 * (AC-4, handoff §6 "캔버스 재렌더는 requestAnimationFrame 1회만"). The exported
 * helpers (paintCrown / crownBlob / downloadCrown / nativeShareCrown /
 * shareCrownToX) are the browser glue for the share actions — they render off an
 * offscreen canvas so a download never disturbs the visible preview (wireframe
 * blobFor/download/nativeShare/shareX, line 1330-1366).
 */
"use client";

import { useEffect, useRef } from "react";
import { FORMATS, type FormatKey, type CrownData } from "@/lib/crown/formats";
import { drawLink } from "@/lib/crown/canvas/drawLink";
import { drawPortrait } from "@/lib/crown/canvas/drawPortrait";
import { drawQR } from "@/lib/crown/canvas/drawQR";
import type { Canvas2D } from "@/lib/crown/canvas/primitives";
import { crownFileName } from "@/lib/crown/slug";
import { buildTweetIntent, canShareFiles, type ShareCapableNavigator } from "@/lib/crown/shareIntents";
import styles from "./crown.module.css";

let crownImg: HTMLImageElement | null = null;

/** Singleton crown SVG image, loaded once on the client (glyph fallback until ready). */
export function loadCrownImage(): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  if (!crownImg) {
    crownImg = new Image();
    crownImg.src = "/brand/wc48-crown-filled.svg";
  }
  return crownImg;
}

/** Paint `fmt` onto `canvas`, sizing it to the format and dispatching the renderer. */
export function paintCrown(
  canvas: HTMLCanvasElement,
  fmt: FormatKey,
  data: CrownData,
  img: HTMLImageElement | null,
): void {
  const F = FORMATS[fmt];
  canvas.width = F.w;
  canvas.height = F.h;
  // Bridge the DOM context to the isomorphic Canvas2D surface (the renderers use
  // only the common subset; the browser type is wider — incl. CanvasPattern).
  const ctx = canvas.getContext("2d") as unknown as Canvas2D | null;
  if (!ctx) return;
  if (fmt === "link") drawLink(ctx, F.w, F.h, data, img, drawQR);
  else drawPortrait(ctx, F.w, F.h, data, img, drawQR);
}

/** Render `fmt` off-screen and resolve a PNG blob. */
export function crownBlob(fmt: FormatKey, data: CrownData, img: HTMLImageElement | null): Promise<Blob | null> {
  const c = document.createElement("canvas");
  paintCrown(c, fmt, data, img);
  return new Promise((resolve) => c.toBlob(resolve, "image/png"));
}

/** Render `fmt` and trigger a browser download (wireframe download(), line 1338). */
export async function downloadCrown(fmt: FormatKey, data: CrownData, img: HTMLImageElement | null): Promise<void> {
  const blob = await crownBlob(fmt, data, img);
  if (!blob) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = crownFileName(data.name, fmt);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

/**
 * Native Web Share when supported, else download fallback (AC-8). Returns
 * "shared" | "fallback" so the caller can pick the right toast.
 */
export async function nativeShareCrown(
  fmt: FormatKey,
  data: CrownData,
  img: HTMLImageElement | null,
): Promise<"shared" | "fallback"> {
  const blob = await crownBlob(fmt, data, img);
  if (!blob) return "fallback";
  const file = new File([blob], `wc48-crown-${fmt}.png`, { type: "image/png" });
  const nav = (typeof navigator !== "undefined" ? navigator : undefined) as ShareCapableNavigator | undefined;
  if (nav && canShareFiles(nav, file) && nav.share) {
    try {
      await nav.share({ files: [file], title: "My WorldCrown48 Champion", text: `${data.name} · Champion 👑 worldcrown48.com` });
      return "shared";
    } catch {
      return "fallback";
    }
  }
  await downloadCrown(fmt, data, img);
  return "fallback";
}

/** Open the X intent in a new tab and save the Link PNG to attach (AC-7, wireframe shareX). */
export async function shareCrownToX(data: CrownData, img: HTMLImageElement | null): Promise<void> {
  if (typeof window !== "undefined") {
    window.open(buildTweetIntent(data.name, data.url), "_blank", "noopener");
  }
  await downloadCrown("link", data, img);
}

interface CrownCanvasPreviewProps {
  fmt: FormatKey;
  data: CrownData;
}

export function CrownCanvasPreview({ fmt, data }: CrownCanvasPreviewProps): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);
  // Depend on the rendered fields, not the `data` object identity — toCrownData
  // builds a fresh object every parent render, which would otherwise repaint the
  // canvas on every unrelated re-render (path is not drawn, so it's excluded).
  const { initial, name, title, url } = data;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const d: CrownData = { initial, name, title, url, path: "" };
    const img = loadCrownImage();
    let raf = requestAnimationFrame(() => paintCrown(canvas, fmt, d, img));
    // Re-render once the crown SVG finishes loading so it replaces the glyph.
    const onLoad = (): void => {
      raf = requestAnimationFrame(() => paintCrown(canvas, fmt, d, img));
    };
    if (img && !img.complete) img.addEventListener("load", onLoad);
    return () => {
      cancelAnimationFrame(raf);
      if (img) img.removeEventListener("load", onLoad);
    };
  }, [fmt, initial, name, title, url]);

  return (
    <div className={styles.ccCanvasWrap}>
      <canvas ref={ref} className={styles.ccPreviewCanvas} aria-label="Crown Card preview" />
    </div>
  );
}
