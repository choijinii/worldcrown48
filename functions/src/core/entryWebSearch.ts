/**
 * entryWebSearch — 조건 확인용 웹 검색 근거 (LAB-FIX-5 3-3 · 대표 승인 2026-11-22 · 지시서 조사표 A 방법).
 *
 * 조건 확인 AI(checkEntryRules)는 기억만으로 판단해 놓친 칸이 있었다(뷰티 묶음: 레오제이 = 남성인데 표시 없음).
 * 그래서 칸마다 "이름 + 엔트리 정의"로 Brave 웹 검색을 1번 하고, 위 3개의 제목 · 요약을 AI 에게 함께 보인다.
 *
 * Brave 약관: 검색 결과는 메모리에서만 쓰고 버린다 — 이 모듈은 저장하지도 로그를 남기지도 않는다.
 * 실패(오류 · 한도)해도 멈추지 않는다: 그 칸은 근거 없이 AI 기억만으로 확인된다(지금 동작).
 */

export const WEB_SEARCH = {
  /** 칸마다 AI 에게 보일 검색 결과 수. */
  COUNT: 3,
  /** 동시에 도는 검색 수 — Brave 초당 한도(50)보다 한참 아래. 48칸 ≈ 12번 기다림. */
  CONCURRENCY: 4,
  TITLE_MAX: 100,
  SNIPPET_MAX: 220,
  /** 검색어에 붙이는 엔트리 정의의 상한(글자). */
  ENTRY_WORDS_MAX: 40,
  /** 초당 한도(429)에서 쉬었다 다시 부르는 횟수 · 쉬는 시간(이미지 검색과 같음). */
  THROTTLE_RETRIES: 2,
  THROTTLE_WAIT_MS: 1100,
} as const;

export interface WebSnippet {
  title: string;
  description: string;
}

export type WebSearchOutcome = { kind: "ok"; snippets: WebSnippet[] } | { kind: "limit" } | { kind: "error" };

export interface WebEvidence {
  /** 칸(0부터) → 검색 결과. 빈 목록 = 검색했지만 결과 없음 · 칸이 없음 = 검색하지 못함. */
  evidence: Map<number, WebSnippet[]>;
  searched: number;
  failed: number;
  limited: boolean;
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** 검색어 = 이름 + 엔트리 정의(괄호 풀이 "(활동명)" 같은 것은 뺀다 · 앞 40자). */
export function buildWebQuery(name: string, entryDef: string): string {
  const def = squash((entryDef ?? "").replace(/\([^)]*\)|（[^）]*）/g, " ")).slice(0, WEB_SEARCH.ENTRY_WORDS_MAX).trim();
  return squash(`${name ?? ""} ${def}`);
}

const ENTITIES: Record<string, string> = { amp: "&", quot: '"', "#39": "'", apos: "'", lt: "<", gt: ">", nbsp: " " };

/** Brave 요약의 <strong> 같은 태그와 글자 참조를 걷어내고 상한에서 자른다. */
export function cleanSnippetText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const text = squash(
    v
      .replace(/<[^>]*>/g, "")
      .replace(/&(amp|quot|#39|apos|lt|gt|nbsp);/g, (_, k: string) => ENTITIES[k] ?? "")
      .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n))),
  );
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Brave /res/v1/web/search 응답 → 위 3개의 제목 · 요약(주소는 넘기지 않는다). */
export function parseBraveWeb(json: unknown): WebSnippet[] {
  const results = (json as { web?: { results?: unknown } } | null)?.web?.results;
  if (!Array.isArray(results)) return [];
  const out: WebSnippet[] = [];
  for (const r of results) {
    if (out.length >= WEB_SEARCH.COUNT) break;
    if (!r || typeof r !== "object") continue;
    const title = cleanSnippetText((r as { title?: unknown }).title, WEB_SEARCH.TITLE_MAX);
    const description = cleanSnippetText((r as { description?: unknown }).description, WEB_SEARCH.SNIPPET_MAX);
    if (!title && !description) continue;
    out.push({ title, description });
  }
  return out;
}

/**
 * 칸마다 1번 검색(동시 CONCURRENCY 개). 한 칸의 오류는 그 칸만 빠진다.
 * 한도(limit)가 오면 새 검색을 더 시작하지 않는다 — 이미 받은 결과는 쓴다.
 */
export async function gatherWebEvidence(
  entries: readonly { slot: number; name: string }[],
  entryDef: string,
  search: (query: string) => Promise<WebSearchOutcome>,
): Promise<WebEvidence> {
  const evidence = new Map<number, WebSnippet[]>();
  let searched = 0;
  let failed = 0;
  let limited = false;
  let next = 0;
  const worker = async () => {
    while (!limited && next < entries.length) {
      const e = entries[next++];
      let outcome: WebSearchOutcome;
      try {
        outcome = await search(buildWebQuery(e.name, entryDef));
      } catch {
        outcome = { kind: "error" };
      }
      if (outcome.kind === "ok") {
        evidence.set(e.slot, outcome.snippets);
        searched++;
      } else if (outcome.kind === "limit") {
        limited = true;
      } else {
        failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(WEB_SEARCH.CONCURRENCY, entries.length) }, worker));
  return { evidence, searched, failed, limited };
}

/**
 * LAB-FIX-6 3-1(결정 G · 대표 2026-11-23 09:07) — 웹 검색 확인을 켜고 끄는 **한 곳**. 지금은 운영자 편집기만 쓰므로 켬.
 * 유저 편집기에 열 때(MVP 1.5) 끌 수 있게 환경 값 `ENTRY_WEB_SEARCH=off` 하나로 끈다
 * (functions/.env.worldcrown48 에 한 줄 + checkEntryRules 재배포). 그 밖의 값 · 빈 값 = 켬.
 */
export function entryWebSearchEnabled(env: Readonly<Record<string, string | undefined>>): boolean {
  return (env.ENTRY_WEB_SEARCH ?? "").trim().toLowerCase() !== "off";
}

/** 켜져 있고 Brave 키가 있을 때만 검색 함수를 만든다 — 꺼져 있으면 만들지도 부르지도 않는다. */
export function pickWebSearch(
  enabled: boolean,
  key: string,
  make: (key: string) => (query: string) => Promise<WebSearchOutcome>,
): ((query: string) => Promise<WebSearchOutcome>) | undefined {
  return enabled && key ? make(key) : undefined;
}
