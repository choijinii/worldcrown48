"use client";

/**
 * M3 · WaitlistForm — 사전등록 (PRE-REG-1: 등록 함수 registerWaitlist 경유).
 *
 * 6 states per Handoff Brief §4:
 *   default → focused → loading → success / duplicate / invalid
 * + rateLimited (PRE-REG-1 — 같은 연결에서 너무 잦을 때 함수가 막는다).
 *
 * 브라우저는 `waitlist` 에 쓰지도 읽지도 않는다(규칙으로 닫힘). 메일 · 처음 들어온 경로
 * (lib/launch/firstTouch) · 화면 언어를 함수에 넘기고, 함수가 중복 판정 · 선착순 번호 ·
 * 저장을 서버에서 한다. 함수는 번호를 돌려주지 않는다 — 화면·이벤트에 번호가 나가지 않는다.
 * 로그인 없이 부른다 — 익명 계정을 만들지 않는다(원장 D-41).
 *
 * 기존 작은 글씨(스팸 없음) 아래에 보관 기간 한 줄(원장 D-57) — 처리방침 1.1 로 잇는다.
 *
 * GA 이벤트 이름은 그대로(waitlist_submit · waitlist_duplicate — 8/31). 처음 경로를
 * first_utm_* 로 붙인다. track() 이 분석 동의 문을 지난다(COOKIE-1).
 *
 * Magnetic submit: subtle mouse-tracking translate on the button. Gated on
 * prefers-reduced-motion (no movement when reduced).
 */

import { useEffect, useRef, useState } from "react";
import { hashEmail, track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/useT";
import { useAnalyticsConsent } from "@/components/policy/CookieConsentProvider";
import { firstTouch, firstTouchEventParams } from "@/lib/launch/firstTouch";
import { callRegisterWaitlist, waitlistPayload } from "@/lib/launch/waitlistSubmit";
import { retentionNoteParts, retentionPolicyHref } from "@/lib/launch/retentionNote";

type WaitlistState =
  | "default"
  | "focused"
  | "loading"
  | "success"
  | "duplicate"
  | "invalid"
  | "rateLimited";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<WaitlistState>("default");
  const submitRef = useRef<HTMLButtonElement>(null);
  const { t, lang } = useT();
  const analyticsConsent = useAnalyticsConsent();

  // ── Magnetic submit (matches Cinematic pattern from design system) ──
  useEffect(() => {
    const btn = submitRef.current;
    if (!btn) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const strength = 0.3;
    const onMove = (e: MouseEvent) => {
      if (btn.disabled) return;
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      btn.style.transform = `translate(${(dx * strength).toFixed(2)}px,${(dy * strength).toFixed(2)}px)`;
    };
    const onLeave = () => {
      btn.style.transform = "translate(0,0)";
    };
    btn.addEventListener("mousemove", onMove);
    btn.addEventListener("mouseleave", onLeave);
    return () => {
      btn.removeEventListener("mousemove", onMove);
      btn.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "loading") return;

    const v = email.trim().toLowerCase();
    if (!EMAIL_RE.test(v)) {
      setState("invalid");
      return;
    }

    setState("loading");
    const utm = firstTouch.current(Date.now(), analyticsConsent);
    const outcome = await callRegisterWaitlist(waitlistPayload(v, utm, lang));
    setState(outcome);
    if (outcome === "success" || outcome === "duplicate") {
      const email_hash = await hashEmail(v);
      void track(outcome === "success" ? "waitlist_submit" : "waitlist_duplicate", {
        email_hash,
        ...firstTouchEventParams(utm),
      });
    }
  }

  const retention = retentionNoteParts(t("launch.waitlist.retention"));

  const isError = state === "invalid" || state === "duplicate" || state === "rateLimited";
  const errMsg =
    state === "duplicate"
      ? t("launch.waitlist.errDuplicate")
      : state === "invalid"
        ? t("launch.waitlist.errInvalid")
        : state === "rateLimited"
          ? t("launch.waitlist.errRateLimited")
          : "";

  const formClass = [
    "wl-form",
    state === "focused" ? "is-focused" : "",
    isError ? "is-error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="waitlist" data-state={state} aria-label="Waitlist">
      <p className="wl-head">{t("launch.waitlist.head")}</p>

      {state === "success" ? (
        <div className="wl-success" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span> {t("launch.waitlist.success")}
        </div>
      ) : (
        <>
          <form className={formClass} onSubmit={handleSubmit} noValidate>
            <div className="wl-field">
              <input
                type="email"
                placeholder={t("launch.waitlist.placeholder")}
                autoComplete="email"
                aria-label={t("launch.waitlist.emailLabel")}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (isError) {
                    setState("default");
                  }
                }}
                onFocus={() => {
                  if (state === "default") setState("focused");
                }}
                onBlur={() => {
                  if (state === "focused") setState("default");
                }}
              />
            </div>
            <button
              ref={submitRef}
              type="submit"
              className="wl-submit"
              disabled={state === "loading"}
            >
              {state === "loading" ? (
                <>
                  <span className="wl-spinner" aria-hidden="true" /> {t("launch.waitlist.submitting")}
                </>
              ) : (
                t("launch.waitlist.submit")
              )}
            </button>
          </form>
          <div
            className={`wl-msg${isError ? " err" : ""}`}
            role="status"
            aria-live="polite"
          >
            {errMsg}
          </div>
        </>
      )}

      <p className="wl-privacy">{t("launch.waitlist.privacy")}</p>
      {/* 보관 기간 — 등록하는 자리에서 알린다(원장 D-57). 끝 낱말 = 처리방침 1.1 링크. */}
      <p className="wl-retention">
        {retention.before}
        {retention.link && <a href={retentionPolicyHref(lang)}>{retention.link}</a>}
      </p>
    </section>
  );
}
