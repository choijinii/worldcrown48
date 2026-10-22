/**
 * translateNames — 발행 때 엔트리 이름 3언어를 받는 자리 (NAME-I18N-1 · 원장 D-61).
 *
 * `translateMeta` 와 같은 모양: 서버 콜러블 `translateContestantNames`(Haiku 1번에 48명)를
 * 부르고, 콜러블이 없거나 실패하면 `fallbackNames` 로 떨어진다 — **발행은 막지 않는다.**
 *
 * 폴백은 en·es 를 빈칸으로 둔다(한글을 복사하지 않는다). 화면은 `localizedName` 이 한글로
 * 폴백하고, 빈칸이어야 백필 스크립트가 "아직 안 채워짐"으로 보고 다시 채울 수 있다.
 */
import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "@/lib/firebase";
import type { LocalizedText } from "@/lib/types/tournament";

export interface NameEntry {
  name: string;
  affiliation: string;
}

interface CallableResult {
  nameI18n?: LocalizedText[];
}

/** ko = name · en·es 빈칸 — 실패·미지원 경로. */
export function fallbackNames(names: string[]): LocalizedText[] {
  return names.map((n) => ({ ko: n.trim(), en: "", es: "" }));
}

/**
 * 콜러블 응답을 발행용으로 고른다(순수). 길이가 다르면 전부 폴백 — 어긋난 응답은 이름을
 * 엉뚱한 사람에게 붙인다. 자리마다 ko 가 그 자리 이름과 다르면 그 칸만 폴백.
 */
export function namesForPublish(
  drafts: { name: string }[],
  got: LocalizedText[] | null | undefined,
): LocalizedText[] {
  const names = drafts.map((d) => d.name.trim());
  if (!got || got.length !== names.length) return fallbackNames(names);
  return got.map((g, i) =>
    g && g.ko === names[i]
      ? { ko: names[i], en: g.en ?? "", es: g.es ?? "" }
      : { ko: names[i], en: "", es: "" },
  );
}

export async function translateNames(
  entries: NameEntry[],
  category: string,
): Promise<LocalizedText[]> {
  try {
    const callable = httpsCallable<
      { entries: NameEntry[]; category: string },
      CallableResult
    >(getFunctionsInstance(), "translateContestantNames");
    const res = await callable({ entries, category });
    return namesForPublish(entries, res.data?.nameI18n);
  } catch {
    // 이름 번역이 실패해도 발행은 성공한다(제목 번역과 같은 규칙 · ADR-B2 §4).
    return fallbackNames(entries.map((e) => e.name));
  }
}
