/**
 * newsDraftAssembly — pure helpers shared by the callable/triggers/cron
 * (ND-1 §3 #4·#6). No Firestore/Anthropic here; those live in the wrappers.
 *
 *   - parseNewsDraftReply: Haiku 블록 JSON(OUTPUT_SPEC "blocks") → 검증된 초안
 *   - newsDraftExists: origin+tournamentId 멱등 판정 (at-least-once 전달 대비)
 */
import { validateBlocks, type ArticleBlock } from "../_news/articleDoc";
import { CHART_RATE_TERMS } from "./displayTerms";

export class NewsDraftParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NewsDraftParseError";
  }
}

export interface ParsedNewsDraft {
  title: string;
  subhead: string;
  body: ArticleBlock[];
}

function toStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * 서버 그물 — 기사 숫자 허용 목록 (대표 확정 2026-11-25 · T5 PR 2 · 검토 고침 1회차).
 * AI 가 만든 stats 블록 항목(l·n)마다:
 *   - 금지 낱말(선택 수 3언어 · 득표 · 횟수 · 순위점수율 · 옛 rate 칸 이름 …)이 있으면 버린다.
 *   - 횟수 값(9회 · 9 times · 9 veces)이면 버린다.
 *   - `%` 가 있는데 라벨이 1등 비율 · 선택 비율의 3언어 낱말이 아니면 버린다.
 *   - 비율 낱말 라벨인데 값에 `%` 가 없으면(횟수일 수 있음) 버린다.
 *   - 비율 칸은 같은 블록에 Crown Score 칸이 남아 있을 때만 남는다("Crown Score 순위와 함께만").
 * 빈 블록이 되면 블록째 버린다. 본문 문장(paragraph 등)은 고치지 않는다 — 지시문 +
 * 대표 검수 몫.
 */
const STAT_DENY =
  /vot(e|o|a)|득표|선택 수|횟수|placement|순위점수율|오른 순위|reach|alcance|TOP RATE|RUNNER-UP|MOMENTUM/i;
const COUNT_VALUE = /\d\s*회|\btimes?\b|\bveces\b|\bvez\b/i;
const RATE_LABEL = new RegExp(
  [CHART_RATE_TERMS.win, CHART_RATE_TERMS.pick]
    .flatMap((t) => [t.ko, t.en, t.es])
    .join("|"),
  "i",
);
const CROWN_SCORE_LABEL = /crown score/i;

function statItemAllowed(it: { n?: unknown; l?: unknown }): boolean {
  const l = toStr(it.l);
  const n = toStr(it.n);
  const both = `${l} ${n}`;
  if (STAT_DENY.test(both)) return false;
  if (COUNT_VALUE.test(both)) return false;
  const isRateLabel = RATE_LABEL.test(l);
  if (both.includes("%") && !isRateLabel) return false;
  if (isRateLabel && !n.includes("%")) return false;
  return true;
}

function netStatsBlocks(blocks: ArticleBlock[]): ArticleBlock[] {
  const out: ArticleBlock[] = [];
  for (const b of blocks) {
    if (b && b.type === "stats" && Array.isArray(b.items)) {
      const kept = b.items.filter(statItemAllowed);
      const hasCrown = kept.some((it) => CROWN_SCORE_LABEL.test(toStr(it.l)));
      const items = hasCrown ? kept : kept.filter((it) => !RATE_LABEL.test(toStr(it.l)));
      if (items.length > 0) out.push({ ...b, items });
      continue;
    }
    out.push(b);
  }
  return out;
}

/**
 * Parse a Haiku draft reply into a validated {title, subhead, body}. The prompt
 * OUTPUT_SPEC asks for `{ title, subhead, blocks: Block[] }`; we accept `blocks`
 * (and tolerate `body`) and validate the block model before it can become a doc.
 * Throws NewsDraftParseError on anything unusable — the wrapper surfaces internal.
 */
export function parseNewsDraftReply(text: string): ParsedNewsDraft {
  const match = text.match(/\{[\s\S]*\}/);
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(match ? match[0] : text) as Record<string, unknown>;
  } catch {
    throw new NewsDraftParseError("draft reply is not JSON");
  }
  const title = toStr(obj.title).trim();
  if (!title) throw new NewsDraftParseError("draft reply has no title");
  const rawBlocks = Array.isArray(obj.blocks)
    ? obj.blocks
    : Array.isArray(obj.body)
      ? obj.body
      : [];
  const body = netStatsBlocks(rawBlocks as ArticleBlock[]);
  const check = validateBlocks(body);
  if (!check.ok) {
    throw new NewsDraftParseError(`draft reply blocks invalid: ${check.error}`);
  }
  return { title, subhead: toStr(obj.subhead).trim(), body };
}

export interface ExistingDraftKey {
  origin: string;
  tournamentId?: string;
}

/**
 * Idempotency guard: has a draft with this (origin, tournamentId) already been
 * created? An open draft and a result draft for the same Tournament coexist
 * (different origin) — only the SAME origin+tournament pair is a duplicate.
 */
export function newsDraftExists(
  existing: ExistingDraftKey[],
  origin: string,
  tournamentId?: string,
): boolean {
  return existing.some(
    (e) => e.origin === origin && e.tournamentId === tournamentId,
  );
}
