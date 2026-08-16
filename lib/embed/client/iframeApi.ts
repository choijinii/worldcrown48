/**
 * iframeApi — YouTube IFrame Player API 로더 (LAB-EV-1 W3).
 *
 * ⚠ 이 파일은 `lib/embed` 하위지만 **브라우저 전용**이라 functions로 복사되지
 * 않는다(copy-embed.mjs의 파일 목록은 최상위 순수 모듈만 담는다). 그래서
 * `client/` 서브디렉터리에 둔다 — 경계를 눈으로 보이게.
 *
 * API 스크립트는 문서당 한 번만 로드돼야 하고, 전역 콜백
 * `window.onYouTubeIframeAPIReady`는 **하나뿐**이다. 여러 LoopPlayer가 동시에
 * 마운트돼도(ADR-EV-4 상한까지) 로드는 한 번, 준비 신호는 모두에게 — 그래서
 * 모듈 수준 단일 Promise로 감싼다.
 */

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  destroy(): void;
}

export interface YTPlayerEvent {
  target: YTPlayer;
  data?: number;
}

export interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (e: YTPlayerEvent) => void;
        onStateChange?: (e: YTPlayerEvent) => void;
        onError?: (e: YTPlayerEvent) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_SRC = "https://www.youtube.com/iframe_api";

let apiPromise: Promise<YTNamespace> | null = null;

export function loadIframeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IFrame API는 브라우저에서만 로드할 수 있습니다."));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    // 남이 이미 걸어둔 콜백을 밟지 않는다 — 우리 것을 뒤에 잇는다.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("IFrame API가 로드됐지만 YT.Player가 없습니다."));
    };

    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = API_SRC;
      script.async = true;
      script.onerror = () => reject(new Error("IFrame API 스크립트 로드 실패"));
      document.head.appendChild(script);
    }
  });

  // 실패한 약속을 캐시에 남기면 이후 마운트가 영원히 실패한다 — 다음 시도를 위해 비운다.
  apiPromise.catch(() => {
    apiPromise = null;
  });

  return apiPromise;
}
