/**
 * aiSuggestBriefCore — [AI에게 제안 받기] (LAB-FIX-4 · 원장 결정 A · 지시서 §3-1).
 *
 * 대회 제목 · 설명 · 카테고리를 읽어 엔트리 단위와 "AI에게 알려 줄 내용" 세 줄을 **제안**한다. 운영자가
 * 고치거나 그대로 둔다 — 자동으로 확정하지 않는다(화면이 칸에 채울 뿐, 저장은 운영자의 편집과 같다).
 * aiSuggestKeywordsCore 와 같은 모양(주입식 createMessage · 값싼 검사 먼저)이라 네트워크 없이 시험이 돈다.
 */
import { AI_BRIEF_LIMITS, isExtraOption } from "./aiBrief";
import { ENTRY_UNITS, type EntryUnit } from "./aiFillCore";

const TITLE_MAX = 50;

export type SuggestBriefReason = "unauthenticated" | "invalid-argument" | "ai-failed" | "unparseable";

export class SuggestBriefError extends Error {
  constructor(
    public reason: SuggestBriefReason,
    message: string,
  ) {
    super(message);
    this.name = "SuggestBriefError";
  }
}

export interface SuggestedBrief {
  entryUnit: EntryUnit;
  entry: string;
  extra: string;
  rules: string;
}

export interface SuggestBriefInput {
  uid: string | null | undefined;
  title: unknown;
  category: unknown;
  description?: unknown;
}

export interface SuggestBriefDeps {
  createMessage: (prompt: string) => Promise<string>;
  logError?: (message: string, err: unknown) => void;
}

export function buildSuggestBriefPrompt(title: string, category: string, description: string): string {
  const lines = [
    "다음 Tournament 의 엔트리 48개를 AI 가 채우거나 영상 제목에서 읽을 때 따를 규칙을 제안해줘.",
    `제목: "${title}"`,
    `카테고리: ${category}`,
  ];
  if (description.trim()) lines.push(`설명: ${description.trim()}`);
  lines.push(
    "",
    "채울 칸:",
    '- entryUnit: 엔트리 하나가 무엇인가. 사람 한 명이면 "individual", 그룹·팀 하나면 "group", 사람도 팀도 아닌 것(노래 · 작품 · 제품 · 배역)이면 "other"',
    `- entry: 엔트리는 어떤 것인가 — 칸의 이름 자리에 들어갈 대상 (예: 춤춘 댄스 크루 · 노래 제목 · 드라마 배역). ${AI_BRIEF_LIMITS.entry}자 이내`,
    // LAB-FIX-6 3-4 — 덧붙이는 정보는 목록 7개 중 하나(결정 I · 대표 2026-11-22 16:51). 목록 밖 값은 parse 가 버린다.
    "- extra: 덧붙이는 정보 — 이름 옆 둘째 칸에 무엇을 적을지. 아래 영문 키 중 **하나만** 적는다:",
    '  "team"(개인 엔트리가 속한 팀 · 그룹 — 소속사는 아님) · "artist"(노래를 부른 가수) · "actor"(배역을 연기한 배우) · "work"(인물 · 배역이 나오는 작품 제목) · "maker"(제품 · 서비스를 만든 회사) · "channel"(크리에이터의 채널) · "blank"(적을 것이 없음)',
    `- rules: 엔트리 조건 — 어떤 엔트리를 넣고 뺄지 (예: 2026년에 영상을 올린 팀만 · 어린이 팀 제외). 제목·설명에서 읽히는 것만. ${AI_BRIEF_LIMITS.rules}자 이내`,
    "",
    "- 제목·설명에 없는 조건을 지어내지 마라. 모르면 빈 문자열",
    "- 한국어로 쓴다",
    "- 설명·머리말 없이 JSON 한 줄만 출력한다",
    "",
    '출력 형식: {"entryUnit":"individual","entry":"","extra":"team","rules":""}',
  );
  return lines.join("\n");
}

const clip = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** 응답 → 제안. 한도를 넘는 글은 자른다(운영자가 고칠 수 있다). 읽을 수 없으면 던진다. */
export function parseSuggestedBrief(raw: string): SuggestedBrief {
  const text = (raw ?? "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new SuggestBriefError("unparseable", "AI 응답을 읽지 못했습니다.");
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    throw new SuggestBriefError("unparseable", "AI 응답을 읽지 못했습니다.");
  }
  const unit = (ENTRY_UNITS as readonly unknown[]).includes(o.entryUnit) ? (o.entryUnit as EntryUnit) : "individual";
  return {
    entryUnit: unit,
    entry: clip(o.entry, AI_BRIEF_LIMITS.entry),
    // 목록 밖 값(자유 글 · 다른 모양)은 버린다 — 빈 글 = 단위의 기본값(화면이 정한다).
    extra: isExtraOption(clip(o.extra, AI_BRIEF_LIMITS.extra)) ? clip(o.extra, AI_BRIEF_LIMITS.extra) : "",
    rules: clip(o.rules, AI_BRIEF_LIMITS.rules),
  };
}

export async function aiSuggestBriefCore(input: SuggestBriefInput, deps: SuggestBriefDeps): Promise<SuggestedBrief> {
  if (!input.uid) throw new SuggestBriefError("unauthenticated", "로그인이 필요합니다.");
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) throw new SuggestBriefError("invalid-argument", "title이 필요합니다.");
  if (title.length > TITLE_MAX) throw new SuggestBriefError("invalid-argument", `title은 ${TITLE_MAX}자 이하여야 합니다.`);
  const category = typeof input.category === "string" ? input.category.trim() : "";
  if (!category) throw new SuggestBriefError("invalid-argument", "유효한 category가 필요합니다.");
  const description = typeof input.description === "string" ? input.description.slice(0, 2000) : "";

  let text: string;
  try {
    text = await deps.createMessage(buildSuggestBriefPrompt(title, category, description));
  } catch (e) {
    deps.logError?.("aiSuggestBriefCore createMessage failed", e);
    throw new SuggestBriefError("ai-failed", "AI 호출에 실패했습니다.");
  }
  return parseSuggestedBrief(text);
}
