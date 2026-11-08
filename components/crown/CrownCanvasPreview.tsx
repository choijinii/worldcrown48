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
import type { Canvas2D } from "@/lib/crown/canvas/primitives";
import { crownFileName } from "@/lib/crown/slug";
import { buildTweetIntent, canShareFiles, withShareUtm, type ShareCapableNavigator } from "@/lib/crown/shareIntents";
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

/**
 * IMAGE-1 (원장 D-77) — 챔피언 그림. 주소마다 한 번만 불러온다. `crossOrigin = "anonymous"` 가 있어야
 * 캔버스가 오염되지 않아 PNG 로 저장된다(버킷 CORS 설정 필요 · storage.cors.json). 못 불러오면 null →
 * 이니셜로 그린다(다운로드는 깨지지 않는다).
 */
const photoCache = new Map<string, Promise<HTMLImageElement | null>>();
const photoReady = new Map<string, HTMLImageElement | null>();

export function loadCrownPhoto(url: string | undefined): Promise<HTMLImageElement | null> {
  if (!url || typeof window === "undefined") return Promise.resolve(null);
  let p = photoCache.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.decoding = "async";
      im.onload = () => {
        photoReady.set(url, im);
        resolve(im);
      };
      im.onerror = () => {
        photoReady.set(url, null);
        resolve(null);
      };
      im.src = url;
    });
    photoCache.set(url, p);
  }
  return p;
}

/** 이미 불러온 그림(없으면 null) — 그리는 순간에 동기로 쓴다. */
function readyPhoto(url: string | undefined): HTMLImageElement | null {
  return url ? photoReady.get(url) ?? null : null;
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
  const photo = readyPhoto(data.photoUrl);
  if (fmt === "link") drawLink(ctx, F.w, F.h, data, img, photo, data.photoFocusY);
  else drawPortrait(ctx, F.w, F.h, data, img, photo, data.photoFocusY);
}

/** Render `fmt` off-screen and resolve a PNG blob. 그림 엔트리면 그림을 먼저 불러온다. */
export async function crownBlob(fmt: FormatKey, data: CrownData, img: HTMLImageElement | null): Promise<Blob | null> {
  await loadCrownPhoto(data.photoUrl);
  const c = document.createElement("canvas");
  paintCrown(c, fmt, data, img);
  return new Promise((resolve) => {
    try {
      c.toBlob(resolve, "image/png");
    } catch {
      // 만일 캔버스가 오염됐으면(CORS) 사진 없이 다시 굽는다 — 저장은 늘 된다.
      const plain = document.createElement("canvas");
      paintCrown(plain, fmt, { ...data, photoUrl: undefined }, img);
      plain.toBlob(resolve, "image/png");
    }
  });
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
 *
 * ⚠️ v2.1 (§16 3): 폴백이 **다운로드**라서 게스트에게 그대로 두면 저장 잠금이 뚫린다 —
 * Web Share를 지원하지 않는 브라우저에서 "공유"를 누르면 그냥 파일이 저장된다. 그래서
 * `allowDownloadFallback` 을 받아 게스트일 때는 저장 없이 "fallback" 만 돌려주고, 호출부가
 * 토스트로 안내한다. 공유를 여는 것과 저장을 잠그는 것이 같은 버튼에서 만나는 지점이다.
 */
export async function nativeShareCrown(
  fmt: FormatKey,
  data: CrownData,
  img: HTMLImageElement | null,
  allowDownloadFallback: boolean = true,
): Promise<"shared" | "fallback"> {
  const blob = await crownBlob(fmt, data, img);
  if (!blob) return "fallback";
  const file = new File([blob], `wc48-crown-${fmt}.png`, { type: "image/png" });
  const nav = (typeof navigator !== "undefined" ? navigator : undefined) as ShareCapableNavigator | undefined;
  if (nav && canShareFiles(nav, file) && nav.share) {
    try {
      // url은 UTM 부착 대상(2026-08-29, marketing-instrumentation-kick.md 묶음②) —
      // text의 "worldcrown48.com" 표기 문구 자체는 그대로 두고(화면 문구 승인 게이트
      // 미해당), 추적 가능한 실제 링크만 별도 url 필드로 추가한다.
      await nav.share({
        files: [file],
        title: "My WorldCrown48 Champion",
        text: `${data.displayName ?? data.name} · Champion 👑 worldcrown48.com`,
        url: withShareUtm(data.url, "share_sheet", data.campaign),
      });
      return "shared";
    } catch {
      return "fallback";
    }
  }
  if (allowDownloadFallback) await downloadCrown(fmt, data, img);
  return "fallback";
}

/** Open the X intent in a new tab and save the Link PNG to attach (AC-7, wireframe shareX). */
export async function shareCrownToX(data: CrownData, img: HTMLImageElement | null): Promise<void> {
  if (typeof window !== "undefined") {
    // 공유 문구 = 화면 언어의 이름 · 카드 그림 = 영어 이름 (NAME-I18N-1 · D-62).
    window.open(buildTweetIntent(data.displayName ?? data.name, data.url, data.campaign), "_blank", "noopener");
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
  const { initial, name, title, url, campaign, photoUrl, photoFocusY } = data;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const d: CrownData = { initial, name, title, url, path: "", campaign, photoUrl, photoFocusY };
    const img = loadCrownImage();
    let alive = true;
    let raf = requestAnimationFrame(() => paintCrown(canvas, fmt, d, img));
    // Re-render once the crown SVG finishes loading so it replaces the glyph.
    const onLoad = (): void => {
      raf = requestAnimationFrame(() => paintCrown(canvas, fmt, d, img));
    };
    if (img && !img.complete) img.addEventListener("load", onLoad);
    // IMAGE-1 — 챔피언 그림이 다 불러와지면 이니셜 대신 그림으로 다시 그린다.
    if (photoUrl) {
      void loadCrownPhoto(photoUrl).then((photo) => {
        if (alive && photo) onLoad();
      });
    }
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      if (img) img.removeEventListener("load", onLoad);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- campaign 은 그림에 안 그려진다(옛 그대로)
  }, [fmt, initial, name, title, url, photoUrl, photoFocusY]);

  return (
    <div className={styles.ccCanvasWrap}>
      <canvas ref={ref} className={styles.ccPreviewCanvas} aria-label="Crown Card preview" />
    </div>
  );
}
