/**
 * PolicyHeader — title row above the markdown body.
 *
 * Shows the eyebrow ("WC48 · LEGAL · {doc name}"), the title, the last-
 * updated + effective + jurisdiction meta line, and the KO/EN tabs.
 *
 * Receives BOTH languages' frontmatter as props — the active one is
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
}

const DOC_NAMES: Record<string, { ko: string; en: string }> = {
  cookies: { ko: "쿠키 정책", en: "Cookie Policy" },
  community: { ko: "커뮤니티 정책", en: "Community Guidelines" },
  terms: { ko: "이용약관", en: "Terms of Service" },
  privacy: { ko: "개인정보처리방침", en: "Privacy Policy" },
};

export function PolicyHeader({ ko, en }: PolicyHeaderProps): JSX.Element {
  const { lang } = useI18n();
  const fm = lang === "ko" ? ko : en;
  const docName = DOC_NAMES[fm.type] ?? { ko: fm.title, en: fm.title };

  return (
    <header className="policy-header">
      <div className="ph-eyebrow">
        <span>WC48 · LEGAL</span>
        <span>·</span>
        <b>{lang === "ko" ? docName.ko : docName.en}</b>
      </div>
      <h1 className="ph-title">{fm.title}</h1>
      <div className="ph-meta">
        <span>
          {lang === "ko" ? "최종 수정 · LAST UPDATED" : "LAST UPDATED"}{" "}
          <b>{fm.lastUpdated}</b>
        </span>
        <span>
          {lang === "ko" ? "버전 · VERSION" : "VERSION"} <b>v{fm.version}</b>
        </span>
        <span>
          {lang === "ko" ? "관할 · JURISDICTION" : "JURISDICTION"}{" "}
          <b>EU · UK · KR</b>
        </span>
      </div>
      <LanguageTabs surface="policy" />
    </header>
  );
}
