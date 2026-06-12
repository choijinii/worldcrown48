/**
 * ConsentToggle — reusable on/off switch for a single consent category.
 *
 * Stylesheet: `.consent-toggle` in globals.css (light-theme scoped).
 *
 * Accessibility:
 *   - role="switch" implicit through aria-pressed (per WAI-ARIA practices,
 *     a button with aria-pressed is treated as a switch by screen readers)
 *   - Disabled toggles are read as "ALWAYS ON" by sighted users via the
 *     adjacent `.cat-lock` label — the toggle itself carries aria-label
 *     so the screen reader announces its purpose.
 */

"use client";

import type { ConsentCategory } from "@/lib/cookieConsent";

export interface ConsentToggleProps {
  category: ConsentCategory;
  checked: boolean;
  /** Disabled = ESSENTIAL — always on, cannot be flipped. */
  disabled?: boolean;
  onChange?: (next: boolean) => void;
  ariaLabel: string;
  /**
   * Mark this toggle as the modal's initial-focus target for
   * focus-trap-react (only one toggle should set this; ConsentModal
   * passes true for the first non-disabled row — FUNCTIONAL).
   */
  initialFocus?: boolean;
}

export function ConsentToggle({
  category,
  checked,
  disabled = false,
  onChange,
  ariaLabel,
  initialFocus = false,
}: ConsentToggleProps): JSX.Element {
  return (
    <button
      type="button"
      className="consent-toggle"
      data-category={category}
      data-initial-focus={initialFocus ? "true" : undefined}
      aria-pressed={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onChange?.(!checked);
      }}
    />
  );
}
