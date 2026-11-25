"use client";

import type { ReactNode } from "react";
import { lab } from "./theme";

/**
 * LAB-FIX-6 — "선택"과 "필수" 모두 금색(Crown Gold · lab.gold — 이 화면의 켜짐 · 다음 버튼 색).
 * 추가 지시 1(대표 눈검사 2026-11-24): 크림슨 "선택"은 남색 바탕에서 어두워 "필수"와 같은 토큰으로 바꿨다.
 * 같은 화면의 다른 "선택"(캠페인 이름표)도 이 부품을 쓴다.
 */
export function FieldTag({ kind, children }: { kind: "optional" | "required"; children: ReactNode }): JSX.Element {
  return (
    <span
      data-testid={`lab-field-tag-${kind}`}
      style={{ color: lab.gold, fontWeight: 700 }}
    >
      · {children}
    </span>
  );
}
