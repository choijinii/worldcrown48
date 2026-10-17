/**
 * KeywordChips — Tournament Keywords input (STEP 1 ④, B-2).
 *
 * Required (≥1 to advance) but AI is a HELPER not a gate (AC#1/#2): the host can
 * always type a keyword by hand even if ✨AI generation fails. Chips add on Enter
 * or comma, remove on ×. Enter/comma during IME composition (한글 조합 중) are left
 * to the IME — EDITOR-FIX-1, chipInput.ts. Validation (trim/dedupe/≤12/≤30) reuses the tested
 * validateKeywords. es long-word chips wrap + break (§8 overflow edge).
 *
 * NOT tags / hashtags (LANGUAGE.md §13 — Tournament Keywords).
 */
"use client";

import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import {
  validateKeywords,
  KEYWORDS_MAX,
  KEYWORD_MAX_LEN,
} from "@/lib/lab/keywordsValidation";
import { chipKeyAction, isImeComposing, splitCommaDraft } from "@/lib/lab/chipInput";
import { useT } from "@/lib/i18n/useT";
import { lab } from "./theme";

interface KeywordChipsProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** Runs the ✨AI keyword suggestion callable; parent owns the wiring. */
  onAiGenerate: () => void;
  /** True while the AI suggestion request is in flight. */
  aiBusy: boolean;
}

export function KeywordChips({
  value,
  onChange,
  onAiGenerate,
  aiBusy,
}: KeywordChipsProps): JSX.Element {
  const { t } = useT();
  const [draft, setDraft] = useState("");
  const v = validateKeywords(value);
  const atMax = v.count >= KEYWORDS_MAX;

  function commitAll(texts: string[]) {
    const trimmed = texts.map((x) => x.trim()).filter(Boolean);
    if (trimmed.length === 0) return;
    // Re-run validation on the merged set so dedupe/cap are authoritative.
    const merged = validateKeywords([...value, ...trimmed]);
    onChange(merged.values);
  }

  function commitDraft() {
    commitAll([draft]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const action = chipKeyAction({
      key: e.key,
      isComposing: e.nativeEvent.isComposing,
      keyCode: e.keyCode,
      draftEmpty: !draft,
      hasChips: value.length > 0,
    });
    if (action === "commit") {
      e.preventDefault();
      commitDraft();
    } else if (action === "pop") {
      onChange(value.slice(0, -1));
    }
  }

  /** 조합 중 누른 쉼표는 조합이 끝난 뒤 글자로 들어온다 — 그때 확정한다. */
  function onDraftChange(e: ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    if (isImeComposing(e.nativeEvent as InputEvent)) {
      setDraft(text);
      return;
    }
    const split = splitCommaDraft(text);
    commitAll(split.commits);
    setDraft(split.rest);
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div style={{ fontFamily: lab.font }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: lab.textSub }}>
          {t("lab.keywords.label")} <span style={{ color: lab.gold }}>*</span>
        </span>
        <button
          type="button"
          onClick={onAiGenerate}
          disabled={aiBusy}
          data-testid="keyword-ai-button"
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: `1px solid ${lab.gold}`,
            background: aiBusy ? "transparent" : lab.goldSubtle,
            color: lab.gold,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: lab.font,
            cursor: aiBusy ? "not-allowed" : "pointer",
            opacity: aiBusy ? 0.6 : 1,
          }}
        >
          {aiBusy ? t("lab.keywords.aiButtonBusy") : t("lab.keywords.aiButton")}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: 10,
          borderRadius: 8,
          border: `1px solid ${v.hasTooLong ? lab.crimson : lab.border}`,
          background: lab.surface,
          minHeight: 48,
          alignItems: "center",
        }}
      >
        {value.map((kw, i) => (
          <span
            key={`${kw}-${i}`}
            data-testid="keyword-chip"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              maxWidth: "100%",
              padding: "5px 10px",
              borderRadius: 999,
              background: lab.goldSubtle,
              color: lab.gold,
              fontSize: 13,
              fontWeight: 600,
              wordBreak: "break-all",
              overflowWrap: "anywhere",
            }}
          >
            {kw}
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label={t("lab.keywords.removeAria", { kw })}
              style={{
                border: "none",
                background: "transparent",
                color: lab.gold,
                cursor: "pointer",
                fontSize: 14,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </span>
        ))}
        {!atMax && (
          <input
            type="text"
            value={draft}
            maxLength={KEYWORD_MAX_LEN}
            onChange={onDraftChange}
            onKeyDown={onKeyDown}
            onBlur={commitDraft}
            placeholder={value.length === 0 ? t("lab.keywords.placeholder") : ""}
            aria-label={t("lab.keywords.addAria")}
            style={{
              flex: 1,
              minWidth: 120,
              border: "none",
              outline: "none",
              background: "transparent",
              color: lab.text,
              fontSize: 14,
              fontFamily: lab.font,
            }}
          />
        )}
      </div>

      <span
        style={{
          display: "block",
          marginTop: 6,
          fontSize: 12,
          color: v.hasTooLong ? lab.crimson : lab.textMuted,
        }}
      >
        {v.hasTooLong
          ? t("lab.keywords.tooLong", { max: KEYWORD_MAX_LEN })
          : t("lab.keywords.counter", { count: v.count, max: KEYWORDS_MAX })}
      </span>
    </div>
  );
}
