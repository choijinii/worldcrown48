/**
 * localizedName — Contestant 이름을 화면 언어로 읽는다 (NAME-I18N-1 · 원장 D-61).
 *
 * `localizedTitle` 과 같은 소비 쪽 함수다. 이름을 그리는 화면은 전부 이것을 거친다.
 * 폴백 순서 = 화면 언어 → en → ko → 한글 정본 `name`. 빈칸은 나오지 않는다:
 * es 가 비면 en(K-POP·크리에이터 고유명사는 스페인어권도 같은 철자), en 도 비면 한글.
 * `nameI18n` 이 없는 옛 문서는 `name` 그대로.
 *
 * 모양만 받는다(`{ name, nameI18n? }`) — Contestant 문서와 차트 캐시 행이 같은 함수를 쓴다.
 */
import type { Lang } from "@/lib/cookieConsent";
import type { LocalizedText } from "@/lib/types/tournament";

export interface NamedLike {
  name: string;
  nameI18n?: Partial<LocalizedText> | null;
}

const ORDER: Record<Lang, Lang[]> = {
  ko: ["ko"],
  en: ["en", "ko"],
  es: ["es", "en", "ko"],
};

export function localizedName(c: NamedLike, lang: Lang): string {
  for (const l of ORDER[lang]) {
    const v = c.nameI18n?.[l];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return c.name;
}
