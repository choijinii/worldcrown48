/**
 * TranslateGuard — 번역 멈춤 그물을 브라우저에 한 번 건다(lib/dom/translateGuard.ts 설명 참고).
 * 모듈을 읽는 순간(하이드레이션 전) 건다 — 번역기는 그 뒤에야 글자를 바꾼다. 그리는 것은 없다.
 */
"use client";

import { installTranslateGuard } from "@/lib/dom/translateGuard";

if (typeof window !== "undefined" && typeof Node !== "undefined") {
  installTranslateGuard(Node.prototype);
}

export function TranslateGuard(): null {
  return null;
}
