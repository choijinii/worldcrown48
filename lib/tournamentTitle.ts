/**
 * localizedTitle — read a Tournament's display title in the active language.
 *
 * B-2 stored title translations additively (`titleI18n:{ko,en,es}`) but left the
 * flat `title` as the only field any surface rendered — so an ES/EN Voter saw the
 * Korean original (B-2.1 follow-up). This is the CONSUMPTION side: every surface
 * that shows a user-created title resolves `titleI18n[lang]` and falls back to the
 * flat `title` when the language slot is missing (legacy pre-B-2 doc) or empty
 * (translation failed → publish stored the original everywhere).
 */
import type { Lang } from "@/lib/cookieConsent";
import type { LocalizedText } from "@/lib/types/tournament";

export function localizedTitle(
  tournament: { title: string; titleI18n?: Partial<LocalizedText> | null },
  lang: Lang,
): string {
  const slot = tournament.titleI18n?.[lang];
  return slot && slot.trim() ? slot : tournament.title;
}
