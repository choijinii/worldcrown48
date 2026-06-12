/**
 * ConsentModal — fine-grained category-level consent dialog.
 *
 * Surface contract (handoff §4 Modal AC):
 *   - 4 categories: ESSENTIAL (locked on) · FUNCTIONAL · ANALYTICS · MARKETING
 *   - MARKETING default OFF (handoff §9 trap 2 — overrides lite-spec)
 *   - KO/EN swap via `data-ml` on the .modal element (CSS hides the other lang)
 *   - Save: spinner → "✓ Saved · valid 12 months"
 *   - reduced motion: spinner skipped, goes straight to saved
 *   - Keyboard trap: focus-trap-react handles Tab/Shift+Tab + initial focus
 *   - Escape closes the modal (built-in to focus-trap-react)
 *   - role="dialog" aria-modal="true" aria-labelledby="modal-title"
 *
 * The modal mounts conditionally — when modalState === "closed" we return
 * null so focus-trap doesn't sit on a hidden dialog hogging focus.
 *
 * "Essentials only" footer button is the modal's equivalent of the
 * banner's Reject — useful for users who opened Customize and decided
 * they want minimum exposure after all.
 */

"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import FocusTrap from "focus-trap-react";
import { useI18n } from "@/lib/i18n";
import {
  REJECT_ALL_PREFERENCES,
  type ConsentPreferences,
  type Lang,
} from "@/lib/cookieConsent";
import { ConsentToggle } from "./ConsentToggle";
import { useCookieConsent } from "./CookieConsentProvider";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ConsentModal(): JSX.Element | null {
  const titleId = useId();
  const { lang, setLang } = useI18n();
  const {
    modalState,
    preferences: savedPreferences,
    lastSavedAt,
    closeModal,
    savePreferences,
  } = useCookieConsent();

  // Local edit state — only flushed to the provider on Save. Seeded from
  // the provider's current preferences each time the modal opens so the
  // user sees what they last chose.
  const [draft, setDraft] = useState<ConsentPreferences>(savedPreferences);
  const lastOpenedAtRef = useRef<number>(0);

  useEffect(() => {
    if (modalState === "open" || modalState === "closed") {
      // Reset draft when transitioning to a re-editable state. We compare
      // by reference because savedPreferences is updated only on save.
      const now = performance.now();
      if (now - lastOpenedAtRef.current > 100) {
        setDraft(savedPreferences);
        lastOpenedAtRef.current = now;
      }
    }
  }, [modalState, savedPreferences]);

  if (modalState === "closed") return null;

  const isSaving = modalState === "saving";
  const isSaved = modalState === "saved";
  const isInteractive = modalState === "open";

  return (
    <FocusTrap
      active={isInteractive}
      focusTrapOptions={{
        initialFocus: '[data-initial-focus="true"]',
        escapeDeactivates: true,
        clickOutsideDeactivates: false,
        onDeactivate: () => {
          // Only treat Escape as a close action when the modal is still
          // editable — during saving/saved we let the explicit Close button
          // drive transitions.
          if (isInteractive) closeModal();
        },
        // The library checks isClickable before allowing the initial focus —
        // a button with `disabled` would fail, so we guide it explicitly.
        fallbackFocus: ".modal",
      }}
    >
      <div
        className="modal-scrim"
        onMouseDown={(e: MouseEvent<HTMLDivElement>) => {
          // Click outside the modal box does NOT close — per handoff,
          // saving is the only legitimate dismissal once opened.
          if (e.target === e.currentTarget) {
            e.stopPropagation();
          }
        }}
      >
        <div
          className="modal"
          data-ml={lang}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <ModalHeader
            titleId={titleId}
            lang={lang}
            onLangChange={setLang}
            onClose={closeModal}
            closeDisabled={isSaving}
          />

          <div className="modal-body">
            <div className="cat-list">
              <EssentialRow />
              <FunctionalRow
                checked={draft.functional}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, functional: v }))
                }
                disabled={isSaving}
              />
              <AnalyticsRow
                checked={draft.analytics}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, analytics: v }))
                }
                disabled={isSaving}
              />
              <MarketingRow
                checked={draft.marketing}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, marketing: v }))
                }
                disabled={isSaving}
              />
            </div>
          </div>

          <ModalFooter
            modalState={modalState}
            isSaved={isSaved}
            isSaving={isSaving}
            lastSavedAt={lastSavedAt}
            onEssentialsOnly={() => {
              setDraft(REJECT_ALL_PREFERENCES);
              const skipSpin = prefersReducedMotion();
              void savePreferences(REJECT_ALL_PREFERENCES).catch(() => {
                /* error surfaced via state */
              });
              if (skipSpin) {
                // The save flow already does state transitions; nothing
                // extra needed. Comment kept so future tweaks know reduced
                // motion is handled inside the provider.
              }
            }}
            onSave={() => {
              void savePreferences(draft).catch(() => {
                /* error surfaced via state */
              });
            }}
          />
        </div>
      </div>
    </FocusTrap>
  );
}

// ── Sub-views ─────────────────────────────────────────────────────────

function ModalHeader({
  titleId,
  lang,
  onLangChange,
  onClose,
  closeDisabled,
}: {
  titleId: string;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onClose: () => void;
  closeDisabled: boolean;
}): JSX.Element {
  return (
    <header className="modal-head">
      <div className="mh-icon">
        <img src="/wc48-crown-filled.svg" alt="" />
      </div>
      <div className="mh-text">
        <div className="mh-eyebrow">
          <span className="ml-ko">쿠키 설정 · COOKIE PREFERENCES</span>
          <span className="ml-en">COOKIE PREFERENCES</span>
        </div>
        <h3 className="mh-title" id={titleId}>
          <span className="ml-ko">어떤 데이터를 허용하시겠어요?</span>
          <span className="ml-en">What data may we use?</span>
        </h3>
      </div>
      <div className="mh-lang" role="group" aria-label="Modal language">
        <button
          type="button"
          aria-pressed={lang === "ko"}
          onClick={() => onLangChange("ko")}
        >
          KO
        </button>
        <button
          type="button"
          aria-pressed={lang === "en"}
          onClick={() => onLangChange("en")}
        >
          EN
        </button>
      </div>
      <button
        type="button"
        className="mh-close"
        aria-label="Close cookie preferences"
        onClick={onClose}
        disabled={closeDisabled}
      >
        ×
      </button>
    </header>
  );
}

function EssentialRow(): JSX.Element {
  return (
    <div className="cat" data-locked="essential">
      <div>
        <div className="cat-key">
          <span className="ml-ko">ESSENTIAL · 필수</span>
          <span className="ml-en">ESSENTIAL</span>
        </div>
        <div className="cat-name">
          <span className="ml-ko">서비스 동작에 필요한 쿠키</span>
          <span className="ml-en">Cookies needed for the service to run</span>
        </div>
        <div className="cat-desc">
          <span className="ml-ko">
            로그인 세션, 보안 토큰, 언어 설정 등 서비스가 동작하기 위해
            필요합니다. 끌 수 없습니다.
          </span>
          <span className="ml-en">
            Login session, security tokens, language preference. Required
            for the service to operate. Cannot be turned off.
          </span>
        </div>
        <div className="cat-lock">
          <span className="ml-ko">
            <b>ALWAYS ON</b> · 항상 켜짐 — 변경 불가
          </span>
          <span className="ml-en">
            <b>ALWAYS ON</b> · Cannot be changed
          </span>
        </div>
      </div>
      <ConsentToggle
        category="essential"
        checked
        disabled
        ariaLabel="Essential cookies — always on"
      />
    </div>
  );
}

function FunctionalRow({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}): JSX.Element {
  return (
    <div className="cat">
      <div>
        <div className="cat-key">
          <span className="ml-ko">FUNCTIONAL · 기능</span>
          <span className="ml-en">FUNCTIONAL</span>
        </div>
        <div className="cat-name">
          <span className="ml-ko">편의 기능과 개인화 설정</span>
          <span className="ml-en">Convenience features and personalization</span>
        </div>
        <div className="cat-desc">
          <span className="ml-ko">
            최근 본 Tournament, 선호 언어, Voter 닉네임 자동 채움 등 편의
            기능을 위한 쿠키입니다. 끄면 일부 편의 기능이 매번 초기화됩니다.
          </span>
          <span className="ml-en">
            Recently viewed Tournaments, preferred language, Voter nickname
            autofill. Turning these off resets those preferences every visit.
          </span>
        </div>
      </div>
      <ConsentToggle
        category="functional"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        ariaLabel="Functional cookies"
        initialFocus={!disabled}
      />
    </div>
  );
}

function AnalyticsRow({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}): JSX.Element {
  return (
    <div className="cat">
      <div>
        <div className="cat-key">
          <span className="ml-ko">ANALYTICS · 분석</span>
          <span className="ml-en">ANALYTICS</span>
        </div>
        <div className="cat-name">
          <span className="ml-ko">투표 흐름과 페이지 사용 통계</span>
          <span className="ml-en">Voting flow and page-usage statistics</span>
        </div>
        <div className="cat-desc">
          <span className="ml-ko">
            어떤 Tournament가 인기 있는지, 어디서 이탈하는지 익명으로
            집계합니다. 개인 식별 정보는 저장하지 않습니다.
          </span>
          <span className="ml-en">
            Anonymous aggregation of which Tournaments are popular and where
            Voters drop off. No personally identifying data is stored.
          </span>
        </div>
      </div>
      <ConsentToggle
        category="analytics"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        ariaLabel="Analytics cookies"
      />
    </div>
  );
}

function MarketingRow({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}): JSX.Element {
  return (
    <div className="cat">
      <div>
        <div className="cat-key">
          <span className="ml-ko">MARKETING · 광고</span>
          <span className="ml-en">MARKETING</span>
        </div>
        <div className="cat-name">
          <span className="ml-ko">관심사 기반 광고 노출</span>
          <span className="ml-en">Interest-based ad recommendations</span>
        </div>
        <div className="cat-desc">
          <span className="ml-ko">
            선호 카테고리(축구·K-pop 등)에 맞춰 관련 Tournament·파트너
            콘텐츠를 추천하기 위한 쿠키입니다. 끄더라도 광고 자체가
            사라지지는 않습니다 — 관련도만 떨어집니다.
          </span>
          <span className="ml-en">
            Cookies that match preferred categories (football, K-pop, etc.)
            to recommend related Tournaments and partner content. Turning
            these off does not remove ads — only makes them less relevant.
          </span>
        </div>
      </div>
      <ConsentToggle
        category="marketing"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        ariaLabel="Marketing cookies"
      />
    </div>
  );
}

function ModalFooter({
  modalState,
  isSaved,
  isSaving,
  lastSavedAt,
  onEssentialsOnly,
  onSave,
}: {
  modalState: string;
  isSaved: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  onEssentialsOnly: () => void;
  onSave: () => void;
}): JSX.Element {
  return (
    <footer className="modal-foot">
      <div className="modal-foot-status" aria-live="polite">
        {modalState === "open" && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span className="ml-ko">
              마지막 저장{" "}
              <b style={{ color: "var(--color-royal)" }}>
                {lastSavedAt ? formatDate(lastSavedAt, "ko") : "없음"}
              </b>
            </span>
            <span className="ml-en">
              Last saved{" "}
              <b style={{ color: "var(--color-royal)" }}>
                {lastSavedAt ? formatDate(lastSavedAt, "en") : "never"}
              </b>
            </span>
          </span>
        )}
        {isSaving && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span className="spin" aria-hidden="true" />
            <span className="ml-ko">Firestore에 저장 중…</span>
            <span className="ml-en">Saving to Firestore…</span>
          </span>
        )}
        {isSaved && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span className="saved-tick" aria-hidden="true">
              ✓
            </span>
            <span className="ml-ko">저장됨 · 12개월 유효</span>
            <span className="ml-en">Saved · valid 12 months</span>
          </span>
        )}
      </div>
      <div className="modal-foot-actions">
        <button
          type="button"
          className="btn-ghost"
          onClick={onEssentialsOnly}
          disabled={isSaving}
        >
          <span className="ml-ko">필수만</span>
          <span className="ml-en">Essentials only</span>
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={onSave}
          disabled={isSaving}
        >
          <span className="ml-ko">선택 저장 · Save preferences</span>
          <span className="ml-en">Save preferences</span>
        </button>
      </div>
    </footer>
  );
}

function formatDate(d: Date, lang: Lang): string {
  // Locale-aware short date. The legal evidence value is the Firestore
  // serverTimestamp; this UI line is informational only.
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", opts).format(d);
}
