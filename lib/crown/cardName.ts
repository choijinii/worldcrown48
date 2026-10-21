/**
 * crownCardName — 크라운 카드 안에 새길 Champion 이름 (NAME-I18N-1 · 원장 D-62).
 *
 * 화면 언어와 상관없이 공식 영어 이름(`nameI18n.en`), 없으면 한글 `name`. 카드 그림은
 * 한 장이라 언어별로 그릴 수 없고, SNS로 퍼지는 카드는 어디서나 읽혀야 한다.
 * 언어 인자를 일부러 받지 않는다 — 화면 언어가 끼어들 자리를 없앤다.
 *
 * IMPORT-FREE: 서버가 그리는 카드도 같은 함수를 쓰도록 copy-crown 이 functions 로 복사한다.
 */
export function crownCardName(c: {
  name: string;
  nameI18n?: { ko?: string; en?: string; es?: string } | null;
}): string {
  const en = c.nameI18n?.en;
  return typeof en === "string" && en.trim() ? en.trim() : c.name;
}
