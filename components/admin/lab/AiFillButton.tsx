/**
 * AiFillButton — triggers the aiFillContestants callable (AC Step1 #1·#3).
 *
 * Disabled until the title is valid AND a category is chosen (gate logic reuses
 * the tested validateTitle + isValidCategory). Crown Gold point colour. The
 * busy label states the ~15s expectation so the operator doesn't re-click.
 */
"use client";

import { validateTitle } from "@/lib/lab/titleValidation";
import { isValidCategory } from "@/lib/lab/categories";
import { lab } from "./theme";

interface AiFillButtonProps {
  title: string;
  category: string;
  busy: boolean;
  onClick: () => void;
}

export function AiFillButton({
  title,
  category,
  busy,
  onClick,
}: AiFillButtonProps): JSX.Element {
  const enabled = validateTitle(title).isValid && isValidCategory(category) && !busy;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      style={{
        width: "100%",
        padding: "14px 18px",
        borderRadius: 12,
        border: `2px solid ${lab.gold}`,
        background: enabled ? lab.goldSubtle : "transparent",
        color: lab.gold,
        fontWeight: 800,
        fontSize: 15,
        fontFamily: lab.font,
        cursor: enabled ? "pointer" : "not-allowed",
        opacity: enabled || busy ? 1 : 0.45,
      }}
    >
      {busy
        ? "✨ Claude AI가 48명을 추천 중… (약 15초)"
        : "✨ Claude AI가 48명 추천"}
    </button>
  );
}
