/**
 * nameEdits — 발행 뒤 The Lab 에서 엔트리 이름 en·es 를 보고 고친다 (NAME-I18N-1 PR 2 · 원장 D-61).
 *
 * 발행 때 AI 가 채운 영어 이름이 틀렸거나 비었을 때 사람이 고치는 자리다. 한글 `name` 은
 * 정본이라 고치지 않는다(중복 판정·검색 기준 #82) — `nameI18n` 한 칸만 쓴다.
 *
 * 먼저 볼 이름 = 영어 칸이 빈 엔트리. AI 가 못 받았거나, 받은 이름이 한글 발음과 맞지 않아
 * 비웠거나(대표 2026-10-24 A안 · nameSoundsAlike), 옛 문서라 아직 없는 것. 맨 위에 모은다.
 * es 는 en 을 따라간다(es = en 복사) — 사람이 es 를 따로 고친 칸만 그대로 둔다.
 */
import type { LocalizedText } from "@/lib/types/tournament";

export interface NameEditRow {
  id: string;
  order: number;
  /** 한글 정본 — 보기만 한다. */
  name: string;
  en: string;
  es: string;
  /** 영어 칸이 비었다 — 화면에 한글로 보이는 이름. */
  flagged: boolean;
}

interface NamedDoc {
  id: string;
  order?: number;
  name?: string;
  nameI18n?: Partial<LocalizedText> | null;
}

const HANGUL_RE = /[가-힣ᄀ-ᇿ㄰-㆏]/;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function nameEditRows(docs: NamedDoc[]): NameEditRow[] {
  return docs
    .map((d) => {
      const en = str(d.nameI18n?.en);
      return {
        id: d.id,
        order: typeof d.order === "number" ? d.order : 0,
        name: str(d.name),
        en,
        es: str(d.nameI18n?.es),
        flagged: !en.trim(),
      };
    })
    .sort((a, b) => Number(b.flagged) - Number(a.flagged) || a.order - b.order);
}

/** 영어 칸을 고친다 — es 가 비었거나 en 과 같았으면 함께 따라간다. */
export function editEn(row: NameEditRow, en: string): NameEditRow {
  const follows = !row.es.trim() || row.es === row.en;
  return { ...row, en, es: follows ? en : row.es };
}

/**
 * 저장할 값(순수). 바뀐 엔트리만 · 앞뒤 빈칸 정리 · es 가 비면 en 복사 · ko = 한글 정본.
 * 한글이 든 en·es 는 쓰지 않고 `invalid` 로 돌려준다(화면이 알린다).
 */
export function planNameEdits(
  before: NameEditRow[],
  after: NameEditRow[],
): { writes: { id: string; nameI18n: LocalizedText }[]; invalid: string[] } {
  const was = new Map(before.map((r) => [r.id, r]));
  const writes: { id: string; nameI18n: LocalizedText }[] = [];
  const invalid: string[] = [];
  for (const r of after) {
    const en = r.en.trim();
    const es = r.es.trim() || en;
    const old = was.get(r.id);
    if (old && old.en.trim() === en && (old.es.trim() || old.en.trim()) === es) continue;
    if (HANGUL_RE.test(en) || HANGUL_RE.test(es)) {
      invalid.push(r.id);
      continue;
    }
    writes.push({ id: r.id, nameI18n: { ko: r.name, en, es } });
  }
  return { writes, invalid };
}
