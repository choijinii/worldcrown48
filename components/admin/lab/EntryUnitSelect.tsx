/**
 * EntryUnitSelect — STEP 1 "엔트리 단위" (ENTRY-UNIT-1 · 원장 D-73).
 *
 * 개인(기본) / 팀 두 개 중 하나. AI 채우기(🎬·🖼·빈칸만 AI)가 이 값을 따라
 * 사람 48명을 채울지, 그룹 48개를 채울지가 갈린다. 제목에서 AI가 단위를 짐작하게
 * 두지 않는다 — 2026-10-27 대표 실측에서 "…무대를 연출한 팀" 제목이 멤버 48명으로
 * 채워졌다. 대회 문서·서버 초안에 함께 저장된다.
 *
 * 라디오 묶음으로 둔다(드롭다운이 아니라): 선택지가 둘뿐이고, 지금 무엇이 골라져
 * 있는지 펼치지 않고 바로 보여야 한다.
 */
"use client";

import { ENTRY_UNITS, type EntryUnit } from "@/lib/types/tournament";
import { useT } from "@/lib/i18n/useT";
import { lab } from "./theme";

interface EntryUnitSelectProps {
  value: EntryUnit;
  onChange: (next: EntryUnit) => void;
}

const OPTION_KEY: Record<EntryUnit, "lab.entryUnit.individual" | "lab.entryUnit.group"> = {
  individual: "lab.entryUnit.individual",
  group: "lab.entryUnit.group",
};

export function EntryUnitSelect({ value, onChange }: EntryUnitSelectProps): JSX.Element {
  const { t } = useT();
  return (
    <div role="radiogroup" aria-label={t("lab.entryUnit.label")} style={{ fontFamily: lab.font }}>
      <span
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: lab.textSub,
          marginBottom: 8,
        }}
      >
        {t("lab.entryUnit.label")}
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        {ENTRY_UNITS.map((unit) => {
          const selected = unit === value;
          return (
            <button
              key={unit}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`lab-entry-unit-${unit}`}
              onClick={() => onChange(unit)}
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 8,
                border: `1px solid ${selected ? lab.gold : lab.border}`,
                background: selected ? lab.goldSubtle : lab.surface,
                color: selected ? lab.gold : lab.textSub,
                fontWeight: selected ? 800 : 600,
                fontSize: 15,
                fontFamily: lab.font,
                cursor: "pointer",
              }}
            >
              {t(OPTION_KEY[unit])}
            </button>
          );
        })}
      </div>
    </div>
  );
}
