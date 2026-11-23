"use client";

import type { ReactNode } from "react";
import { lab } from "./theme";

/**
 * LAB-FIX-6 3-3 — "선택" 표시는 크림슨(디자인 시스템 토큰 --color-crimson). 같은 화면의 다른 "선택"(캠페인 이름표)도
 * 이 부품을 쓴다. "필수"는 금색(Crown Gold — 이 화면의 켜짐 · 다음 버튼 색).
 */
export function FieldTag({ kind, children }: { kind: "optional" | "required"; children: ReactNode }): JSX.Element {
  return (
    <span
      data-testid={`lab-field-tag-${kind}`}
      style={{ color: kind === "optional" ? "var(--color-crimson)" : lab.gold, fontWeight: 700 }}
    >
      · {children}
    </span>
  );
}
