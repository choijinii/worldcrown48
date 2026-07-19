/**
 * translateMeta — publish-time title/description translation seam (B-2 §3 #4).
 *
 * The host types title + description in ONE language (the current UI lang). At
 * publish we translate the missing languages once (Haiku, server callable) and
 * store title/description as {ko,en,es} additively. On ANY failure the publish
 * still succeeds with the original text mirrored into every slot (ADR-B2 §4:
 * 발행 성공 + 미번역 언어 원문 fallback + 관리자 재발행).
 *
 * `fallbackMeta` is the pure, node-testable fallback. `translateMeta` is the
 * client wiring: it calls the `translateTournamentMeta` callable and degrades to
 * `fallbackMeta` if the callable is unavailable or errors.
 */
import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "@/lib/firebase";
import type { Lang } from "@/lib/cookieConsent";
import type { LocalizedText } from "@/lib/types/tournament";

export interface TranslateMetaInput {
  title: string;
  description: string;
  sourceLang: Lang;
}

export interface TranslateMetaResult {
  titleI18n: LocalizedText;
  descriptionI18n: LocalizedText;
}

/** Original text in every slot — the failure/degraded path. */
export function fallbackMeta(input: TranslateMetaInput): TranslateMetaResult {
  const both = (s: string): LocalizedText => ({ ko: s, en: s, es: s });
  return {
    titleI18n: both(input.title),
    descriptionI18n: both(input.description),
  };
}

export async function translateMeta(
  input: TranslateMetaInput,
): Promise<TranslateMetaResult> {
  try {
    const callable = httpsCallable<TranslateMetaInput, TranslateMetaResult>(
      getFunctionsInstance(),
      "translateTournamentMeta",
    );
    const res = await callable(input);
    const { titleI18n, descriptionI18n } = res.data ?? {};
    if (titleI18n && descriptionI18n) return { titleI18n, descriptionI18n };
    return fallbackMeta(input);
  } catch {
    // Publish must never fail because translation did (ADR-B2 §4).
    return fallbackMeta(input);
  }
}
