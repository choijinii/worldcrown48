/**
 * TranslateRemount — 브라우저 번역이 켜진 채 사이트 언어를 바꾸면 안의 화면을 통째로 새로 그린다
 * (lib/dom/translateRemount.ts 설명 참고). 번역이 아니면 아무것도 하지 않는다.
 *
 * 렌더 중에 ref 로 셈한다 — 언어가 바뀐 바로 그 그리기에서 key 가 바뀌어야 옛 마디를 고치는 대신 새로 만든다.
 * StrictMode 의 두 번째 그리기는 prevLang 이 이미 같아 두 번 올리지 않는다.
 */
"use client";

import { Fragment, useRef, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { isPageTranslated, nextRemountEpoch } from "@/lib/dom/translateRemount";

export function TranslateRemount({ children }: { children: ReactNode }): JSX.Element {
  const { lang } = useI18n();
  const epoch = useRef(0);
  const prevLang = useRef(lang);
  if (prevLang.current !== lang) {
    const translated = typeof document !== "undefined" && isPageTranslated(document.documentElement.className);
    epoch.current = nextRemountEpoch({ epoch: epoch.current, prevLang: prevLang.current, lang, translated });
    prevLang.current = lang;
  }
  return <Fragment key={epoch.current}>{children}</Fragment>;
}
