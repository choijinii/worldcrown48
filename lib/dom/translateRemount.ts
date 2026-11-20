/**
 * 번역 중 언어 바꾸기 → 본문 새로 그리기 (팬 화면 번역 멈춤 · B 방법의 둘째 겹).
 *
 * 그물(translateGuard)이 멈춤은 막지만, 번역기가 바꿔 끼운 글자 마디는 React 가 고쳐도 화면에 나오지 않아
 * 사이트 언어를 바꾸면 옛 언어 글자가 남는다. 번역 중일 때만 본문을 통째로 새로 만들어(새 마디는 번역기가 다시
 * 번역한다) 이를 막는다. 번역이 아닐 때는 지금처럼 글자만 바꾼다(새로 그리지 않는다).
 */

/** 크롬(구글) 번역은 번역하는 동안 <html> 에 `translated-ltr` 또는 `translated-rtl` 을 단다. */
export function isPageTranslated(htmlClassName: string): boolean {
  return /(^|\s)translated-(ltr|rtl)(\s|$)/.test(htmlClassName);
}

export function nextRemountEpoch(opts: { epoch: number; prevLang: string; lang: string; translated: boolean }): number {
  return opts.prevLang !== opts.lang && opts.translated ? opts.epoch + 1 : opts.epoch;
}
