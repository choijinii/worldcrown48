/**
 * 사전등록 보관 기간 한 줄 (PRE-REG-1 · 원장 D-57).
 *
 * 승인 문구 하나(`launch.waitlist.retention`)의 마지막 " · " 뒤 낱말을 처리방침 1.1(사전등록
 * 문단) 링크로 그린다. 링크에는 화면 언어를 붙인다 — 붙이지 않으면 브라우저 언어 문서가 열린다.
 */
import type { Lang } from "@/lib/cookieConsent";
import { policyLinkHref } from "@/lib/policySectionId";

const SEP = " · ";

export function retentionNoteParts(text: string): { before: string; link: string | null } {
  const at = text.lastIndexOf(SEP);
  if (at < 0) return { before: text, link: null };
  return { before: text.slice(0, at + SEP.length), link: text.slice(at + SEP.length) };
}

export function retentionPolicyHref(lang: Lang): string {
  return policyLinkHref("/policies/privacy#1.1", lang)!;
}
