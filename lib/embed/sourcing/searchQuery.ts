/**
 * searchQuery — 검색어 조립과 캐시 키 (LAB-EV-2 §3 · §5 A).
 *
 * §3 OUT에 "검색어 AI 재작성" 금지가 있다. AI는 STEP 2에서 이미
 * `imageSearchKeyword`를 남겼고(예 "BLACKPINK Jisoo stage performance"), 그게
 * 검색어다. 힌트가 비어 있을 때만 "이름 + 카테고리 키워드"로 조립한다 — 그 이상은
 * 모델 콜을 하나 더 쓰면서 운영자가 예측할 수 없는 검색어를 만든다.
 */

/**
 * search.list `maxResults` — 문서상 허용 범위 0~50(기본 5). 킥 §3이 지정한 15를
 * 쓴다: 후보 10~15개를 캐시에 담아두면 [새 영상 찾기]와 중복 회피가 **검색 콜을 더
 * 쓰지 않고** 돌아간다(search 버킷이 하루 100콜뿐이라 이게 결정적이다).
 */
export const SEARCH_MAX_RESULTS = 15;

/** 캐시 TTL — DoD "TTL 7일". */
export const CACHE_TTL_DAYS = 7;
export const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * 힌트에서 후보 변별력이 없는 낱말 — 관련성 채점에서 빼려고 여기 둔다.
 * ("BLACKPINK Jisoo stage performance"에서 stage·performance는 어느 영상에나 있다)
 */
const HINT_STOPWORDS = new Set([
  "stage",
  "performance",
  "official",
  "video",
  "music",
  "mv",
  "live",
  "clip",
  "highlight",
  "highlights",
  "photo",
  "photos",
  "image",
  "images",
  "profile",
  "the",
  "and",
  "of",
  "a",
  "an",
]);

/**
 * 토큰 구분자 — 공백과 구두점. **버리는 쪽을 열거**한다(남기는 쪽이 아니라).
 *
 * `\p{Letter}` 유니코드 속성 이스케이프를 쓰면 `/u` 플래그가 필요하고, 이 저장소의
 * 루트 tsconfig에는 `target`이 없어 ES5로 떨어진다 → TS1501로 빌드가 깨진다.
 * 그래서 ASCII 구두점 · Latin-1 기호 · General Punctuation(– — … ‧) · CJK 구두점
 * (、。「」【】〜) · 전각 형태를 명시적으로 나열한다. 나열되지 않은 것(한글·한자·
 * 가나·악센트 라틴)은 전부 토큰에 남는다 — "Rosé"·"지수"가 살아야 한다.
 */
const TOKEN_SEPARATORS = new RegExp(
  "[" +
    "\\s" + // 공백 전부
    "\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E" + // ASCII 구두점
    "\\u00A0-\\u00BF" + // Latin-1 기호 (· ¡ « »)
    "\\u2000-\\u206F" + // General Punctuation (– — … ‧ ′)
    "\\u3000-\\u303F\\u30FB" + // CJK 구두점 (、。「」【】〜) + 가나 중점
    "\\uFF00-\\uFF0F\\uFF1A-\\uFF20\\uFF3B-\\uFF40\\uFF5B-\\uFF65" + // 전각 형태
    "]+",
  "g",
);

/**
 * 토큰화 — 소문자화 + 구두점으로 자르기. 정규식 하나를 여기에만 두고 관련성 채점과
 * 공유한다(같은 문자열을 두 규칙으로 자르면 "검색은 됐는데 관련성이 0점"이 생긴다).
 */
export function tokenize(text: string): string[] {
  return (text ?? "")
    .toLowerCase()
    .replace(TOKEN_SEPARATORS, " ")
    .split(" ")
    .filter((t) => t.length > 0);
}

/** 힌트 토큰 중 변별력 있는 것만. 이름 토큰과 겹치는 건 이름 쪽에서 이미 센다. */
export function hintTokens(searchHint: string, nameTokens: string[]): string[] {
  const name = new Set(nameTokens);
  return tokenize(searchHint).filter(
    (t) => t.length > 1 && !HINT_STOPWORDS.has(t) && !name.has(t),
  );
}

/**
 * 검색어. 힌트가 있으면 그대로, 없으면 이름 + 카테고리 키워드 앞 2개.
 * 키워드를 전부 붙이면 검색이 지나치게 좁아져 0건("실존 의심")이 뜬다.
 */
export function buildSearchQuery(
  target: { name: string; searchHint?: string },
  categoryKeywords: readonly string[] = [],
): string {
  const hint = (target.searchHint ?? "").trim();
  if (hint) return hint;
  const name = (target.name ?? "").trim();
  if (!name) return "";
  const extra = categoryKeywords
    .map((k) => (k ?? "").trim())
    .filter(Boolean)
    .slice(0, 2);
  return [name, ...extra].join(" ");
}

/**
 * 캐시 문서 id — 검색어 해시 (DoD "검색어 해시 키").
 *
 * node:crypto를 쓰지 않는다: 이 디렉터리는 클라이언트와 functions가 **같은 파일**을
 * 공유하는 import-free 층이다(constants.ts 머리말). 대신 서로 다른 오프셋의 FNV-1a
 * 두 개를 이어 붙여 64비트를 만든다 — 하루 수백 건 규모에서 충돌은 사실상 0이고,
 * 캐시 문서에 원본 검색어를 함께 저장하므로 충돌이 나도 진단할 수 있다.
 */
export function searchCacheKey(query: string): string {
  const normalized = tokenize(query).join(" ");
  return `${fnv1a(normalized, 0x811c9dc5)}${fnv1a(normalized, 0x01000193)}`;
}

function fnv1a(text: string, seed: number): string {
  let hash = seed >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    // FNV prime 16777619 — 32비트 곱셈은 Math.imul로 해야 정밀도가 안 샌다.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** 캐시 항목이 아직 유효한가. `cachedAt`은 epoch ms. */
export function isCacheFresh(cachedAt: number, nowMs: number): boolean {
  if (!Number.isFinite(cachedAt) || cachedAt <= 0) return false;
  return nowMs - cachedAt < CACHE_TTL_MS;
}
