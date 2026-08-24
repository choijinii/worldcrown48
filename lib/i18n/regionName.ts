/**
 * regionName — 국가 값을 **보는 사람의 언어로** 그리는 순수 렌더러 (LAB-UX-1 PR-2).
 *
 * 2026-08-23 대표 스크린샷의 실제 갭이 여기였다: `lang=es`로 바꿔도 Contestant의
 * 국적이 "대한민국"으로 남았다. UI 문구 층은 멀쩡했고, **데이터가 자유 텍스트**라
 * 번역될 여지가 없었던 것이다. 그래서 저장은 코드(ISO 3166-1 alpha-2)로 바꾸고,
 * 화면은 그 코드를 언어별 국가명으로 편다.
 *
 * 표를 들이지 않고 `Intl.DisplayNames`를 쓴다 — 200여 개 국가 × 3언어를 손으로
 * 관리하면 반드시 낡는다. Node 18+·모던 브라우저 모두 full-icu를 싣고 있다.
 *
 * **레거시를 건드리지 않는 것이 요점이다.** 이미 발행된 528건은 "대한민국"·"뉴질랜드"
 * 같은 자유 텍스트를 갖고 있다. 두 글자 코드가 아니면 원문 그대로 돌려준다 —
 * 추측해서 코드로 바꾸면 틀린 나라를 박는다.
 */
import type { Lang } from "@/lib/cookieConsent";

/** 값이 ISO 3166-1 alpha-2 모양인가 (두 글자 라틴). */
export function isRegionCode(value: string): boolean {
  return /^[A-Za-z]{2}$/.test((value ?? "").trim());
}

/**
 * 표시용 국가명.
 *
 *   "KR" + ko → "대한민국" · "KR" + en → "South Korea" · "KR" + es → "Corea del Sur"
 *   "대한민국"  → "대한민국" (레거시 자유 텍스트 — 그대로)
 *   ""         → ""
 *
 * `Intl.DisplayNames`가 모르는 코드(예: "ZZ")면 코드를 그대로 돌려준다. 빈칸으로
 * 두면 운영자가 "국적이 사라졌다"고 읽지만, 코드가 보이면 고칠 것이 보인다.
 */
export function displayRegion(value: string, lang: Lang): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || !isRegionCode(trimmed)) return trimmed;
  const code = trimmed.toUpperCase();
  try {
    const names = new Intl.DisplayNames([lang], { type: "region" });
    return names.of(code) ?? code;
  } catch {
    // Intl.DisplayNames 미지원·잘못된 코드 — 코드를 보여준다(정보 손실 없음).
    return code;
  }
}
