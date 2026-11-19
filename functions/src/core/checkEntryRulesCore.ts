/**
 * checkEntryRulesCore — 채운 뒤 "고르는 조건" 다시 검사 (LAB-FIX-5 §3-2).
 *
 * 명단 채우기는 "고르는 조건"을 한 번 읽고 쓸 뿐, 채운 뒤에 조건에 맞는지 다시 보지 않았다
 * (TEST2: "여성만"인데 남성으로 알려진 크리에이터 3 남음). 그래서 채운 직후 **두 번째 AI 호출**로 명단을
 * 조건과 한 줄씩 대조한다. 같은 사람이 다른 이름(본명 · 활동명 · 채널명)으로 두 번 들어간 것도 여기서 본다.
 *
 * 지우지 않는다 — 걸린 칸을 "손볼 칸"으로 표시하고 사유 한 줄을 돌려줄 뿐, 판단은 운영자가 한다.
 * **의심되면 표시한다**(잘못 표시된 칸은 운영자가 그냥 두면 되지만, 놓친 칸은 발행된다).
 *
 * 비용 가드: 고르는 조건이 비었거나 입력이 이상하면 모델을 부르기 전에 돌려보낸다(편집기도 조건이 빈 대회에서는
 * 부르지 않는다 — 옛 동작 보호). 같은 주입식 deps 모양(aiFillCore · aiSuggestBriefCore).
 */
import { parseAiBrief, type AiBrief } from "./aiBrief";
import { parseEntryUnit, type EntryUnit } from "./aiFillCore";

export const RULES_CHECK_LANGS = ["ko", "en", "es"] as const;
export type RulesCheckLang = (typeof RULES_CHECK_LANGS)[number];

const SLOT_COUNT = 48;
const NAME_MAX = 200;
const TITLE_MAX = 200;
/** 사유 한 줄 상한 — 칸 아래 한 줄에 들어갈 만큼. */
export const RULES_REASON_MAX = 120;

export type CheckRulesReason = "unauthenticated" | "invalid-argument" | "ai-failed" | "unparseable";

export class CheckRulesError extends Error {
  constructor(
    public reason: CheckRulesReason,
    message: string,
  ) {
    super(message);
    this.name = "CheckRulesError";
  }
}

export interface RulesCheckEntry {
  /** 0부터 · 화면 칸 번호 = slot + 1. */
  slot: number;
  name: string;
  affiliation?: string;
}

export interface RulesFlag {
  slot: number;
  reason: string;
}

export interface CheckRulesInput {
  uid: string | null | undefined;
  title: unknown;
  category?: unknown;
  entryUnit?: unknown;
  aiBrief: unknown;
  entries: unknown;
  lang: unknown;
}

export interface CheckRulesDeps {
  createMessage: (prompt: string) => Promise<string>;
  logInfo?: (message: string) => void;
  logError?: (message: string, err: unknown) => void;
}

const LANG_NAME: Record<RulesCheckLang, string> = {
  ko: "한국어",
  en: "English(영어)",
  es: "español(스페인어)",
};

const UNIT_WORD: Record<EntryUnit, string> = {
  individual: "사람 한 명",
  group: "팀(그룹) 하나",
  other: "사람도 팀도 아닌 대상 하나",
};

export function buildRulesCheckPrompt(opts: {
  title: string;
  category?: string;
  entryUnit: EntryUnit;
  brief: AiBrief;
  entries: readonly RulesCheckEntry[];
  lang: RulesCheckLang;
}): string {
  const { title, category, entryUnit, brief, entries, lang } = opts;
  const rows = entries.map(
    (e) => `${e.slot + 1}. ${e.name}` + (e.affiliation?.trim() ? ` (덧붙이는 정보: ${e.affiliation.trim()})` : ""),
  );
  return [
    "아래는 한 Tournament 의 엔트리 명단이다. 운영자가 정한 **고르는 조건**과 명단을 한 줄씩 대조해, 손볼 칸을 골라라.",
    "",
    `대회 제목: "${title}"` + (category ? ` (카테고리 ${category})` : ""),
    `엔트리 하나 = ${brief.entry || UNIT_WORD[entryUnit]}`,
    `고르는 조건: ${brief.rules}`,
    "",
    "표시할 칸:",
    "- 고르는 조건에 맞지 않는 엔트리 (예: \"여성만\"인데 남성으로 알려진 사람 · 조건의 연도에 활동하지 않은 사람)",
    "- 조건에 맞는지 확실하지 않은 엔트리 — **의심되면 표시**한다. 잘못 표시된 칸은 운영자가 그냥 두면 되지만, 놓친 칸은 그대로 발행된다",
    "- 같은 사람 · 팀이 다른 이름으로 두 번 들어간 칸 (본명 · 활동명 · 채널명 · 다른 표기). 둘 중 뒤 번호 칸을 표시하고 사유에 앞 번호를 적는다",
    "- 실제로 있는지 확인되지 않는 이름",
    "",
    "규칙:",
    "- 명단의 **모든 줄**을 하나씩 판정한다. 고르는 조건에 성별 · 연도 · 국적 같은 속성이 있으면 줄마다 그 속성을 따로 확인한다 — 널리 알려진 이름이라도 건너뛰지 마라",
    "- 칸을 지우거나 다른 이름을 제안하지 마라. 판정과 사유만",
    `- reason = 왜 표시했는지 한 줄(60자 안). **${LANG_NAME[lang]}**로 쓴다`,
    "- 번호(i)는 아래 명단의 번호 그대로. 명단에 없는 번호를 만들지 마라",
    "- ok = 조건에 맞고 의심도 없으면 true, 표시할 칸이면 false. false 인 줄에만 reason 을 쓴다",
    "- 설명 · 머리말 없이 JSON 한 줄만 출력한다",
    "",
    '출력 형식(명단의 줄마다 하나): {"rows":[{"i":<번호>,"ok":true},{"i":<번호>,"ok":false,"reason":"<사유>"}]}',
    "",
    "명단:",
    ...rows,
  ].join("\n");
}

/**
 * 응답 → 표시할 칸(0부터). 명단에 없는 번호 · 중복 번호(두 번째부터) · 모양이 다른 줄은 버린다.
 * 사유가 비어도 표시는 남긴다(표시가 사유보다 중요하다). 읽을 수 없는 응답은 null.
 */
export function parseRulesCheckReply(text: string, validSlots: ReadonlySet<number>): RulesFlag[] | null {
  let rows: unknown;
  try {
    const m = (text ?? "").match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]) as { flags?: unknown; rows?: unknown };
    // 줄마다 판정(rows) — ok 가 true 가 아닌 줄만 표시한다. 옛 모양(flags = 걸린 칸만)도 읽는다.
    rows = Array.isArray(parsed?.rows)
      ? (parsed.rows as unknown[]).filter((r) => r && typeof r === "object" && (r as { ok?: unknown }).ok !== true)
      : parsed?.flags;
  } catch {
    return null;
  }
  if (!Array.isArray(rows)) return null;
  const out: RulesFlag[] = [];
  const seen = new Set<number>();
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const { i, reason } = r as { i?: unknown; reason?: unknown };
    if (typeof i !== "number" || !Number.isInteger(i)) continue;
    const slot = i - 1;
    if (!validSlots.has(slot) || seen.has(slot)) continue;
    seen.add(slot);
    const why = typeof reason === "string" ? reason.replace(/\s+/g, " ").trim().slice(0, RULES_REASON_MAX) : "";
    out.push({ slot, reason: why });
  }
  return out;
}

function parseEntries(v: unknown): RulesCheckEntry[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > SLOT_COUNT) return null;
  const out: RulesCheckEntry[] = [];
  const seen = new Set<number>();
  for (const raw of v) {
    if (!raw || typeof raw !== "object") return null;
    const { slot, name, affiliation } = raw as { slot?: unknown; name?: unknown; affiliation?: unknown };
    if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 0 || slot >= SLOT_COUNT || seen.has(slot)) return null;
    if (typeof name !== "string" || name.length > NAME_MAX) return null;
    seen.add(slot);
    const n = name.trim();
    if (!n) continue; // 빈 칸은 보내지 않는다
    out.push({ slot, name: n, affiliation: typeof affiliation === "string" ? affiliation.trim().slice(0, NAME_MAX) : "" });
  }
  return out.length > 0 ? out : null;
}

export async function checkEntryRulesCore(input: CheckRulesInput, deps: CheckRulesDeps): Promise<{ flags: RulesFlag[] }> {
  if (!input.uid) throw new CheckRulesError("unauthenticated", "로그인이 필요합니다.");
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title || title.length > TITLE_MAX) throw new CheckRulesError("invalid-argument", "title이 필요합니다.");
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const entryUnit = parseEntryUnit(input.entryUnit);
  if (!entryUnit) throw new CheckRulesError("invalid-argument", "entryUnit은 individual · group · other 중 하나여야 합니다.");
  const brief = parseAiBrief(input.aiBrief);
  if (!brief || !brief.rules) throw new CheckRulesError("invalid-argument", "고르는 조건이 없습니다.");
  const lang = (RULES_CHECK_LANGS as readonly unknown[]).includes(input.lang) ? (input.lang as RulesCheckLang) : null;
  if (!lang) throw new CheckRulesError("invalid-argument", "lang은 ko · en · es 중 하나여야 합니다.");
  const entries = parseEntries(input.entries);
  if (!entries) throw new CheckRulesError("invalid-argument", "검사할 칸이 없거나 칸 번호가 올바르지 않습니다.");

  let text: string;
  try {
    text = await deps.createMessage(buildRulesCheckPrompt({ title, category, entryUnit, brief, entries, lang }));
  } catch (e) {
    deps.logError?.("checkEntryRulesCore createMessage failed", e);
    throw new CheckRulesError("ai-failed", "AI 호출에 실패했습니다.");
  }
  const flags = parseRulesCheckReply(text, new Set(entries.map((e) => e.slot)));
  if (!flags) {
    deps.logError?.("checkEntryRulesCore unparseable reply", text.slice(0, 200));
    throw new CheckRulesError("unparseable", "AI 응답을 읽지 못했습니다. 다시 시도해주세요.");
  }
  deps.logInfo?.(
    `checkEntryRules: ${entries.length}칸 중 ${flags.length}칸 표시 — ` +
      flags.map((f) => `${f.slot + 1} ${entries.find((e) => e.slot === f.slot)?.name ?? ""}: ${f.reason}`).join(" | "),
  );
  return { flags };
}
