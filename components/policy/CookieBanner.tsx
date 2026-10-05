/**
 * CookieBanner — first-visit fixed-bottom GDPR banner.
 *
 * Rendering rules:
 *   - Mounted by the Provider into the same React tree, but visually
 *     fixed to the viewport bottom (CSS `position: fixed`).
 *   - When bannerState !== "visible", the entire `<aside>` is removed
 *     from the DOM via the `hidden` attribute so the slide-down animation
 *     can fully exit and assistive tech doesn't read stale content.
 *
 * Three actions (handoff §4 Banner AC):
 *   - "Accept all"    → ACCEPT_ALL_PREFERENCES, save, hide
 *   - "Reject"        → REJECT_ALL_PREFERENCES (essential only), save, hide
 *   - "Customize"     → open the ConsentModal (banner stays mounted but
 *                        hidden behind the scrim)
 *
 * Bilingual content per handoff §4: "배너 내 텍스트는 ko + en 동시 표기".
 * The Korean line is the primary content; the English line follows on a
 * second visual block, muted. Both are present in the DOM at all times
 * (no language toggle here — the modal handles that).
 *
 * COOKIE-1 (§9 게이트 1 · 대표 승인 2026-09-20 · 2026-10-05): 접힌 상태는 **한 줄 56px** —
 * 제목 · '자세히' · 버튼 3개(같은 줄 · 같은 크기 — 거부가 허용만큼 쉬워야 한다).
 * 머리말 줄과 본문(ko·en)은 '자세히' 안에 접고, 누르면 그 자리(줄 위)에서 펼쳐진다.
 * 문구는 한 글자도 바꾸지 않는다 — lib/__tests__/policy/cookieBannerCopy.test.ts.
 */

"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  pickViewportHeight,
  stageMode,
  type StageMode,
} from "@/lib/arena/stageLayout";
import {
  consentBarReserve,
  shouldShowConsentBar,
} from "@/lib/policy/consentBar";
import { useCookieConsent } from "./CookieConsentProvider";

/** 지금 화면의 배치 — 아레나 무대와 같은 판정(stageMode)을 가져다 쓴다(R7). */
function readMode(): StageMode {
  return stageMode(
    window.innerWidth,
    pickViewportHeight(window.innerHeight, window.visualViewport?.height),
  );
}

/**
 * 화면 배치를 따라간다(회전 · 창 크기 · 주소창). 서버 HTML·첫 렌더는 "desktop" —
 * 마운트 뒤 실제 배치로 바꾼다.
 */
function useViewportMode(): StageMode {
  const [mode, setMode] = useState<StageMode>("desktop");
  useEffect(() => {
    const update = () => setMode(readMode());
    update();
    const landscape = window.matchMedia("(orientation: landscape)");
    landscape.addEventListener("change", update);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      landscape.removeEventListener("change", update);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);
  return mode;
}

export function CookieBanner(): JSX.Element | null {
  const { bannerState, bannerReopened, acceptAll, rejectAll, openModal } =
    useCookieConsent();
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const [barHeight, setBarHeight] = useState(0);
  const mode = useViewportMode();
  // §9 게이트 2 — 모바일 가로에서는 동의 바를 미룬다(동의를 가정하지 않는다 · R2).
  // 팬이 직접 다시 연 동의 바는 가로에서도 보인다(리뷰 I-1 — 철회를 막지 않는다).
  const deferred = !shouldShowConsentBar({ mode, reopened: bannerReopened });
  const shown = bannerState === "visible" && !deferred;

  // 동의 바의 실제 높이를 잰다 — '자세히'를 펼치거나 화면 폭이 바뀌면 다시.
  useEffect(() => {
    const el = barRef.current;
    if (!shown || !el || typeof ResizeObserver === "undefined") {
      setBarHeight(0);
      return;
    }
    const measure = () => setBarHeight(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [shown]);

  // During the boot resolve, render nothing (avoids flash before we know
  // whether the user has already consented).
  if (bannerState === "resolving") return null;

  const hidden = !shown;
  const reserve = consentBarReserve({ shown, height: barHeight });

  return (
    <>
      {/* COOKIE-1 — 보이는 동안만 페이지 맨 아래에 동의 바 높이만큼 여백(끝까지 내리면 마지막
        내용이 동의 바 위로 드러난다). 사라지면 이 여백도 없다. */}
      {reserve > 0 ? (
        <div
          className="cb-reserve"
          aria-hidden="true"
          style={{ height: reserve }}
        />
      ) : null}
      <aside
        ref={barRef}
        className="cookie-banner"
        data-state={bannerState}
        data-expanded={expanded ? "true" : "false"}
        data-deferred={deferred ? "landscape" : undefined}
        role="region"
        aria-label="Cookie consent"
        hidden={hidden}
      >
        <div className="cb-inner">
          {/* COOKIE-1 — 머리말 줄 · 본문은 '자세히' 안으로 접는다. 접혀도 DOM 에 남는다(R1). */}
          <div id={detailsId} className="cb-details" hidden={!expanded}>
            <div className="cb-eyebrow">
              <span className="cb-dot" aria-hidden="true" />
              <span>쿠키 동의 · COOKIE CONSENT · GDPR</span>
            </div>
            <p className="cb-body">
              WC48은 서비스 제공에 필요한 필수 쿠키를 사용하며, 기능·분석·광고
              쿠키는 모두 선택사항입니다. 카테고리별로 동의를 변경할 수
              있습니다. 자세한 내용은 <a href="/policies/cookies">쿠키 정책</a>{" "}
              · <a href="/policies/privacy">개인정보처리방침</a>을 참고하세요.
              <span className="cb-body-en">
                We use essential cookies to run the service. Functional,
                analytics, and marketing cookies are all optional — set each
                category individually. See our{" "}
                <a href="/policies/cookies">Cookie Policy</a> ·{" "}
                <a href="/policies/privacy">Privacy Policy</a>.
              </span>
            </p>
          </div>
          <div className="cb-row">
            <h2 className="cb-title">
              데이터를 정중하게 다루기 위한 동의가 필요합니다.
            </h2>
            <button
              type="button"
              className="cb-more"
              aria-expanded={expanded}
              aria-controls={detailsId}
              onClick={() => setExpanded((v) => !v)}
            >
              자세히 · Details
            </button>
            <div className="cb-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  void rejectAll();
                }}
              >
                필수만 · Reject non-essential
              </button>
              <button type="button" className="btn-outline" onClick={openModal}>
                설정하기 · Customize
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  void acceptAll();
                }}
              >
                모두 허용 · Accept all
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
