"use client";

/**
 * M3 · WaitlistForm — Firestore `waitlist` create.
 *
 * 6 states per Handoff Brief §4:
 *   default → focused → loading → success / duplicate / invalid
 *
 * Duplicate detection: SHA-256(email) is used as the document ID. Under
 * the create-only Security Rules in `firestore.rules`, attempting to
 * create a document at an ID that already exists fails with
 * `permission-denied` — Firestore evaluates the `create` rule on the
 * existing doc and finds it's actually an update (denied). We catch
 * that code and surface the `duplicate` state.
 *
 * Consequences of this design:
 *   - The client never reads `waitlist` (emails are never exposed).
 *   - Rules can deny `list` / `get` / `update` / `delete` outright.
 *   - One email = one document. No need for a Cloud Function for dup check.
 *
 * Magnetic submit: subtle mouse-tracking translate on the button. Gated on
 * prefers-reduced-motion (no movement when reduced).
 */

import { useEffect, useRef, useState } from "react";
import { doc, serverTimestamp, setDoc, type FirestoreError } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { hashEmail, track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/useT";

type WaitlistState =
  | "default"
  | "focused"
  | "loading"
  | "success"
  | "duplicate"
  | "invalid";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isFirestoreError(e: unknown): e is FirestoreError {
  return typeof e === "object" && e !== null && "code" in e;
}

async function createEntry(email: string, emailHash: string): Promise<void> {
  const db = getDb();
  // setDoc at a known ID. If the doc exists, the `create` rule fails →
  // FirestoreError.code === "permission-denied" → caller treats as duplicate.
  await setDoc(doc(db, "waitlist", emailHash), {
    email,
    createdAt: serverTimestamp(),
  });
}

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<WaitlistState>("default");
  const submitRef = useRef<HTMLButtonElement>(null);
  const { t } = useT();

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
    try {
      const email_hash = await hashEmail(v);
      if (!email_hash) {
        // SubtleCrypto unavailable (older browser / non-secure context).
        throw new Error("Email hashing unavailable in this browser.");
      }
      await createEntry(v, email_hash);
      setState("success");
      void track("waitlist_submit", { email_hash });
    } catch (err) {
      // create-only rule + existing doc → permission-denied → treat as duplicate.
      if (isFirestoreError(err) && err.code === "permission-denied") {
        setState("duplicate");
        const email_hash = await hashEmail(v);
        void track("waitlist_duplicate", { email_hash });
        return;
      }
      // Firestore unreachable / other failure — surface as invalid so the
      // user can correct or retry; don't silently swallow.
      console.warn("WaitlistForm: submit failed", err);
      setState("invalid");
    }
  }

  const isError = state === "invalid" || state === "duplicate";
  const errMsg =
    state === "duplicate"
      ? t("launch.waitlist.errDuplicate")
      : state === "invalid"
        ? t("launch.waitlist.errInvalid")
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
                  if (state === "invalid" || state === "duplicate") {
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
    </section>
  );
}
