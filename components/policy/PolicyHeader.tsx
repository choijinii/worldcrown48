/**
 * PolicyHeader — title row above the markdown body.
 *
 * Shows the eyebrow ("WC48 · LEGAL · {doc name}"), the title, the last-
 * updated + effective + jurisdiction meta line, and the KO/EN/ES tabs.
 *
 * Receives every language's frontmatter as props — the active one is
 * picked by the I18n context. Both languages render side-by-side and
 * CSS hides the inactive (via `.policy-doc[data-lang] .doc-en` rules in
 * globals.css). This avoids a flash when the user toggles.
 */

"use client";

import { useI18n } from "@/lib/i18n";
import type { PolicyFrontmatter } from "@/lib/policyTypes";
import { LanguageTabs } from "./LanguageTabs";

export interface PolicyHeaderProps {
  ko: PolicyFrontmatter;
  en: PolicyFrontmatter;
  es: PolicyFrontmatter;
}

type Lang3 = "ko" | "en" | "es";

const DOC_NAMES: Record<string, Record<Lang3, string>> = {
  cookies: { ko: "쿠키 정책", en: "Cookie Policy", es: "Política de cookies" },
  community: { ko: "커뮤니티 가이드", en: "Community Guidelines", es: "Normas de la comunidad" },
  terms: { ko: "이용약관", en: "Terms of Service", es: "Términos del servicio" },
  privacy: { ko: "개인정보처리방침", en: "Privacy Policy", es: "Política de privacidad" },
};

/** 머리 정보 라벨 — ko·es 는 "자기 언어 · 영어" 병기, en 은 영어만(지금 그대로). */
const META: Record<"updated" | "version" | "jurisdiction", Record<Lang3, string>> = {
  updated: { ko: "최종 수정 · LAST UPDATED", en: "LAST UPDATED", es: "Última actualización · LAST UPDATED" },
  version: { ko: "버전 · VERSION", en: "VERSION", es: "Versión · VERSION" },
  jurisdiction: { ko: "관할 · JURISDICTION", en: "JURISDICTION", es: "Jurisdicción · JURISDICTION" },
};

export function PolicyHeader({ ko, en, es }: PolicyHeaderProps): JSX.Element {
  const { lang } = useI18n();
  const fm = { ko, en, es }[lang];
  const docName = DOC_NAMES[fm.type] ?? { ko: fm.title, en: fm.title, es: fm.title };

  return (
    <header className="policy-header">
      <div className="ph-eyebrow">
        <span>WC48 · LEGAL</span>
        <span>·</span>
        <b>{docName[lang]}</b>
      </div>
      <h1 className="ph-title">{fm.title}</h1>
      <div className="ph-meta">
        <span>
          {META.updated[lang]}{" "}
          <b>{fm.lastUpdated}</b>
        </span>
        <span>
          {META.version[lang]} <b>v{fm.version}</b>
        </span>
        <span>
          {META.jurisdiction[lang]}{" "}
          <b>EU · UK · KR</b>
        </span>
      </div>
      <LanguageTabs surface="policy" />
    </header>
  );
}
