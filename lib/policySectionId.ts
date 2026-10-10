/**
 * 정책 문서 제목 id — 조항 링크(`/policies/community#2.7`)가 실제로 그 조항으로 가게 (POLICY-YT-1).
 *
 * 번호로 시작하는 제목(`## 8. …` · `### 2.7 …`)은 번호가 id 다. 정책 페이지는 ko·en·es 세 문서를
 * 한 DOM 에 그리고 CSS 로 하나만 보이므로, 번호만 쓰면 세 언어 id 가 겹친다 → 언어 접두를 붙인다
 * (ko 없음 · `en-` · `es-`). 링크 해시는 번호 그대로(`#2.7`) 두고, 화면이 `sectionHashTarget` 로
 * 그 언어의 id 를 찾아 이동한다(ko 는 브라우저 기본 이동과 같은 id).
 *
 * 번호 없는 제목은 예전 그대로: h2 = 제목 글자 slug(es 만 `es-` 접두), h3 = id 없음.
 */
import type { Lang } from "@/lib/cookieConsent";

const PREFIX: Record<Lang, string> = { ko: "", en: "en-", es: "es-" };

/** `8. 이의신청` → "8" · `2.7 사기` → "2.7" · 번호 없음 → null. */
export function headingNumber(text: string): string | null {
  const m = /^\s*(\d+(?:\.\d+)*)\.?\s/.exec(text);
  return m ? m[1] : null;
}

/** 제목의 id. 번호 없는 h3 는 undefined(id 를 달지 않는다 — 예전과 같음). */
export function sectionId(text: string, lang: Lang, level: 2 | 3): string | undefined {
  const num = headingNumber(text);
  if (num) return PREFIX[lang] + num;
  if (level === 3) return undefined;
  return (lang === "es" ? "es-" : "") + slug(text);
}

/** 링크 해시(`#2.7`) → 지금 화면 언어 문서의 id. 번호가 아닌 해시는 그대로. 빈 해시 → null. */
export function sectionHashTarget(hash: string, lang: Lang): string | null {
  let raw = hash.replace(/^#/, "");
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // 잘못된 % 인코딩 — 글자 그대로 쓴다
  }
  if (!raw) return null;
  return /^\d+(?:\.\d+)*$/.test(raw) ? PREFIX[lang] + raw : raw;
}

/**
 * 정책 문서 안의 다른 정책 문서 링크(`/policies/community#2.7`)에 그 문서의 언어를 붙인다.
 * 붙이지 않으면 새 페이지가 브라우저 언어로 열려, es 문서에서 누른 링크가 한국어 문서로 간다.
 * 그 밖의 링크(외부 · mailto)는 그대로.
 */
export function policyLinkHref(href: string | undefined, lang: Lang): string | undefined {
  if (!href || !href.startsWith("/policies/")) return href;
  const hashAt = href.indexOf("#");
  const path = hashAt < 0 ? href : href.slice(0, hashAt);
  const hash = hashAt < 0 ? "" : href.slice(hashAt);
  if (/[?&]lang=/.test(path)) return href;
  return `${path}${path.includes("?") ? "&" : "?"}lang=${lang}${hash}`;
}

/**
 * Slug a heading into a stable section ID. Lowercases, strips quotes,
 * replaces spaces and slashes with `-`. Keeps Korean characters as-is —
 * they survive URL encoding fine.
 */
export function slug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[·:'"`()[\]{}]/g, "")
    .replace(/[\s/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
