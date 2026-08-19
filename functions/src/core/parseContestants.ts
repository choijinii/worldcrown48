/**
 * Parse Claude's AI-Fill response into exactly 48 Contestant suggestions.
 *
 * Server-only logic — lives inside the functions deploy package (functions
 * can't import the root `lib/`; cross-package constants are duplicated by
 * project precedent, e.g. cors.ts). Mirrors the client-side domain contract.
 *
 * Handoff §9 trap #8: the model reply is not guaranteed to be a bare JSON
 * array. Extract the first array, parse, normalize. Failures are typed
 * (ContestantParseError) so the onCall wrapper maps them to HttpsError and the
 * UI can offer "retry".
 *
 * ── AI-1 (2026-08-16) 관용도 확대 — 대표 결정 ──────────────────────────
 * 골든 1차에서 Sonnet 5가 "정확히 48명"을 자주 빗나갔다(49명·47명). 개수 하나
 * 때문에 48명치 토큰을 통째로 버리는 게 손해라, 프롬프트는 조금 더(50~52명)
 * 요청하고 여기서 정리한다:
 *
 *   이름 없는 항목 버림 → 이름 기준 중복 제거(먼저 나온 것 유지) → 앞에서부터
 *   expectedCount개만 취득 → 그래도 floor 미만이면 실패
 *
 * floor = expectedCount - SHORTFALL_TOLERANCE (48이면 46). 46~47명이면 그대로
 * 돌려준다 — 빈칸은 편집기에서 채우거나 빈칸만 다시 AI를 돌리면 되고(B-2), 이미
 * 지원되는 흐름이다.
 *
 * 출력 스키마는 불변이다 (RULE R1) — 필드 4개, 이름도 그대로. 바뀐 것은 몇 개를
 * 통과시키느냐뿐이라 클라이언트 계약은 손대지 않는다.
 *
 * ── AI-2 (2026-08-18) 오염 힌트 폐기 + 중복 정규화 ─────────────────────
 * 2026-08-17 스모크에서 Sonnet 5가 **확신 없는 인물의 `imageSearchKeyword`에
 * 자기 메모를 흘렸다**: `NewJeans Sullyoon 아님 Hyein 확인`. 그 칸은 LAB-EV-2
 * 자동 소싱이 **그대로 YouTube 검색창에 넣는 문자열**이라, 메모가 섞이면 검색은
 * 0건이 되고 search 콜(하루 100)만 탄다. 6칸이 전부 그렇게 죽었다.
 *
 * 프롬프트 계약(aiFillCore)이 1차 방어고, 여기가 2차다. 판정되면 **힌트만 비우지
 * 않고 항목 자체를 버린다** — 증거에서 오염된 힌트는 늘 소속·실존 오류를 달고
 * 나왔다(설윤을 NewJeans로 오기, NMIXX에 없는 "미도리"). 힌트만 지우면 폴백
 * 검색어로 그 틀린 인물을 계속 찾는다. 과다 요청 여유분(2~4명)이 손실을 메운다.
 *
 * 중복도 같은 사건에서 나왔다: `설윤`(오염)과 `설윤(엔믹스)`(정상)가 따로 등재됐다.
 * 이름을 그대로 비교하면 이 둘은 다른 사람이다 — 괄호 꼬리를 떼고 비교한다.
 *
 * ── AI-2.1 (2026-08-19) "버리지 말고 가려내라" — 대표 결정 ──────────────
 * 1차 골든에서 이름 병합이 **실존하는 다른 인물을 지웠다**. `김채원`(LE SSERAFIM)
 * 다음에 온 `김채원(허윤진)`(힌트 `LE SSERAFIM Yunjin`)과 `김채원(위클리)`(힌트
 * `Weeekly Kim Zaehee`)가 이름이 같다는 이유만으로 사라졌다 — 빠진 건 허윤진과
 * 이재희다. 모델이 낸 건 "이름표가 틀린 항목"이지 "중복"이 아니었다.
 *
 * 그래서 이름은 이제 **판정의 시작일 뿐**이다. 가르는 건 힌트다:
 *   ① 소속이 다르다 → 동명이인, 둘 다 남긴다
 *   ② 소속이 같다 → 인물 토큰 비교. 다르면 둘 다, 같을 때만 병합
 *   ③ 못 가리면 → 둘 다 남기고 "중복 의심"을 달아 사람에게 넘긴다
 * 소속·인물을 가르는 팀 토큰은 외부 DB 없이 **응답 자체에서** 뽑는다
 * (inferTeamTokens — 두 사람 이상의 힌트에 나오는 낱말 = 소속을 가리키는 말).
 *
 * 이름 칸이 힌트와 어긋나도 버리지 않는다. 플래그를 달고 **힌트에서 뽑은 인물
 * 토큰을 정정 후보로** 남긴다 — 이름을 코드가 고쳐 쓰지는 않는다(추측 금지).
 *
 * 파이프라인: 이름 없음 폐기 → **오염 힌트 폐기** → 팀 토큰 추출 →
 *            **중복 판정(병합은 '같다'가 확인될 때만)** → 앞에서부터
 *            expectedCount개 → floor 미만이면 실패(기존 그대로)
 */

import { ROSTER_EXCLUSIONS, type RosterExclusion } from "./rosterExclusions";

export const TOTAL_CONTESTANTS = 48;

/** 부족분 허용치. expectedCount 48 → 46명까지 통과, 45명이면 실패. */
export const SHORTFALL_TOLERANCE = 2;

/**
 * 힌트 길이 상한. 계약(aiFillCore 프롬프트)이 "최대 6단어"를 요구하므로 60자면
 * 정상 검색어에는 넉넉하고, 문장으로 흘러나온 메모는 대부분 여기서 걸린다.
 */
export const HINT_MAX_LENGTH = 60;

/**
 * 메모 토큰 — **부분 문자열로도** 잡는다.
 * 고유명사·검색어 안에 이 자모열이 끼어들 일이 사실상 없는 것만 여기 둔다.
 * (증거의 `... 아님 ...` 형태가 전부 이쪽에 걸린다)
 */
const MEMO_SUBSTRINGS = [
  "아님",
  "아닌",
  "미확인",
  "불확실",
  "맞는지",
  "추정",
] as const;

/**
 * 메모 토큰 — **낱말이 통째로 같을 때만** 잡는다.
 *
 * 이쪽은 고유명사에 섞일 수 있다: `인지`는 골퍼 "박인지"의 일부고, `아마`는
 * "아마존"의 일부다. 부분 일치로 잡으면 멀쩡한 인물을 버린다(§6 Auto-STOP —
 * 검증기 오탐). 증거의 오염 힌트는 `확인`을 전부 **독립 낱말**로 썼으므로
 * 낱말 일치만으로 6/6이 잡힌다.
 *
 * 영어 토큰은 킥 ④ 초안에 없지만, 모델이 영문으로 같은 메모를 남길 수 있어
 * "검색어로는 절대 안 쓰는" 것만 좁게 넣었다(§10 보고 대상).
 */
const MEMO_WORDS = [
  "확인",
  "아마",
  "같음",
  "인지",
  "unverified",
  "unsure",
  "unknown",
  "tbd",
  "confirm",
  "verify",
] as const;

/**
 * 힌트 낱말 나누기 — 공백과 ASCII 구두점만 자른다.
 *
 * `\p{Letter}` 유니코드 속성 이스케이프는 쓰지 않는다(`/u` 필요 → 저장소
 * tsconfig에서 TS1501). searchQuery.ts와 같은 이유·같은 방식이다. 한글·한자·
 * 악센트 라틴은 나열되지 않았으므로 낱말에 그대로 남는다.
 */
const HINT_SEPARATORS = new RegExp(
  "[" +
    "\\s" +
    "\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E" +
    "\\u00A0-\\u00BF\\u2000-\\u206F\\u3000-\\u303F" +
    "\\uFF00-\\uFF0F\\uFF1A-\\uFF20\\uFF3B-\\uFF40\\uFF5B-\\uFF65" +
    "]+",
  "g",
);

/** 괄호 **안쪽**만 캡처 — 이름 칸의 꼬리가 무엇을 말하는지 보려고 쓴다. */
const PARENTHETICAL_INNER = new RegExp(
  "[\\u0028\\uFF08\\u005B\\uFF3B\\u3010]" +
    "([^\\u0029\\uFF09\\u005D\\uFF3D\\u3011]*)",
);

/** 괄호와 그 안 내용 — 반각·전각·대괄호·【】. 닫힘이 없어도(잘린 응답) 지운다. */
const PARENTHETICAL = new RegExp(
  "[\\u0028\\uFF08\\u005B\\uFF3B\\u3010]" +
    "[^\\u0029\\uFF09\\u005D\\uFF3D\\u3011]*" +
    "[\\u0029\\uFF09\\u005D\\uFF3D\\u3011]?",
  "g",
);

/**
 * 힌트가 검색어가 아니라 **메모**인가 (AI-2 규칙 ④).
 *
 *   (a) 메모 토큰 포함 · (b) 물음표 포함 · (c) HINT_MAX_LENGTH 초과
 *   (d) 빈 힌트는 **오염이 아니다** — 소싱에 "이름 + 카테고리 키워드" 폴백이 있다
 *
 * 한글 자체는 금지하지 않는다. 트로트처럼 한국어 검색이 맞는 카테고리가 있다
 * (`임영웅 무대`는 정상 힌트다).
 */
export function isPollutedHint(hint: string): boolean {
  const text = (hint ?? "").trim();
  if (!text) return false; // (d)
  if (text.length > HINT_MAX_LENGTH) return true; // (c)
  if (text.includes("?") || text.includes("\uFF1F")) return true; // (b) 반각·전각
  const lower = text.toLocaleLowerCase();
  if (MEMO_SUBSTRINGS.some((token) => lower.includes(token))) return true; // (a) 부분
  const words = new Set(lower.replace(HINT_SEPARATORS, " ").split(" ").filter(Boolean));
  return MEMO_WORDS.some((token) => words.has(token)); // (a) 낱말
}

/**
 * 중복 판정용 이름 키 (AI-2 규칙 ⑤).
 * 괄호 꼬리 제거 → 공백 제거 → 소문자. `설윤` = `설윤(엔믹스)` = `설 윤`.
 */
export function normalizeNameKey(name: string): string {
  return (name ?? "")
    .replace(PARENTHETICAL, " ")
    .toLocaleLowerCase()
    .replace(/\s+/g, "");
}

/** 중복 판정용 힌트 키. 대소문자·공백 무시. 빈 힌트는 중복 판정에서 뺀다. */
export function normalizeHintKey(hint: string): string {
  return (hint ?? "").toLocaleLowerCase().replace(/\s+/g, "");
}

/** 비교용 정규화 — 소문자 + 공백 제거. 이름·소속 낱말 양쪽에 같은 잣대를 쓴다. */
function foldForMatch(text: string): string {
  return (text ?? "").toLocaleLowerCase().replace(/\s+/g, "");
}

/**
 * 제외 목록에 걸리는가 (AI-2.2).
 *
 * **이름과 소속이 함께 맞을 때만** 걸린다. `수진`이라는 이름만 보고 자르면
 * 위클리 이수진 같은 다른 사람이 같이 잘린다 — 동명이인을 지우지 않는다는
 * AI-2.1의 원칙은 여기서도 그대로다.
 *
 * 이름은 `name` 칸뿐 아니라 **힌트에서도** 찾는다: 이름표가 엉뚱해도
 * (`미연` 🔎 `GIDLE Soojin`) 슬롯에 들어갈 영상은 제외 대상의 것이기 때문이다.
 */
export function findExclusion(
  item: { name: string; position: string; imageSearchKeyword: string },
  list: readonly RosterExclusion[] = ROSTER_EXCLUSIONS,
): RosterExclusion | null {
  const nameKey = normalizeNameKey(item.name);
  const hintFolded = foldForMatch(item.imageSearchKeyword);
  const haystack = `${hintFolded}${foldForMatch(item.position)}`;

  for (const entry of list) {
    const nameHit = entry.names.some((raw) => {
      const alias = foldForMatch(raw);
      if (!alias) return false;
      return nameKey === alias || hintFolded.includes(alias);
    });
    if (!nameHit) continue;
    const affiliationHit = entry.affiliation.some((raw) => {
      const token = foldForMatch(raw);
      return token !== "" && haystack.includes(token);
    });
    if (affiliationHit) return entry;
  }
  return null;
}

/** 버려진 항목의 사유 — 골든이 표로 찍고 대표가 오탐을 눈으로 본다. */
export type DiscardReason =
  | "no-name"
  | "polluted-hint"
  /** 같은 인물임이 **판정된** 중복. 이름만 같아서 버리는 경로는 더 없다. */
  | "duplicate-merged"
  /** 제외 목록에 걸렸다 (rosterExclusions — 이름 + 소속이 함께 맞을 때만). */
  | "excluded";

export interface DiscardedContestant {
  reason: DiscardReason;
  name: string;
  imageSearchKeyword: string;
  /** 왜 그렇게 판정했는지 — 병합은 근거 없이 하지 않는다. */
  detail?: string;
}

/**
 * 운영자 검수 플래그 (AI-2.1 · 대표 결정 2026-08-19 "버리지 말고 가려내라").
 *
 *   duplicate-suspect  — 이름이 겹치는데 같은 인물인지 **끝내 못 가렸다**. 둘 다 남긴다.
 *   name-hint-mismatch — 이름 칸이 힌트가 가리키는 인물과 어긋난다
 *                        (`김채원(허윤진)` + `LE SSERAFIM Yunjin`). 버리지 않고 정정 후보를 남긴다.
 */
export type ReviewFlag = "duplicate-suspect" | "name-hint-mismatch";

export interface ContestantNotice {
  flag: ReviewFlag;
  /** 채택 배열에서의 위치 (0-based). 슬롯 번호 = index + 1. */
  index: number;
  name: string;
  imageSearchKeyword: string;
  /** 짝이 된 항목의 index — 중복 의심일 때. */
  pairedIndex?: number;
  /**
   * 힌트에서 뽑은 인물 토큰 = **이름 정정 후보**. 이름을 여기서 고쳐 쓰지 않는다 —
   * 로마자 토큰을 한글 이름으로 바꾸는 건 추측이고, 추측을 명단에 박으면
   * AI-1의 허구 인물 사고를 다른 층에서 반복하는 것이다. 사람이 고른다.
   */
  suggestedNameTokens?: string[];
  detail: string;
}

export interface ParseOptions {
  /**
   * 폐기된 항목을 하나씩 알려준다. 반환값 스키마를 건드리지 않고 폐기 목록을
   * 밖으로 빼는 유일한 통로다 (R1 — 출력 스키마 불변).
   */
  onDiscard?: (item: DiscardedContestant) => void;
  /**
   * 검수 플래그. 폐기가 아니라 **남긴 채로** 사람에게 넘기는 신호다.
   * 같은 이유로 반환 스키마 밖(콜백)에 둔다.
   */
  onNotice?: (notice: ContestantNotice) => void;
}

/**
 * 힌트에서 변별력 없는 낱말 — 어느 검색어에나 붙는다.
 * (searchQuery.ts의 HINT_STOPWORDS와 목적이 같다. 그 파일은 클라이언트 공유 층이라
 *  functions/core에서 import하지 않는다 — 저장소 관례상 상수 중복이 허용된 지점이다.)
 */
const HINT_FILLERS = new Set([
  "stage",
  "performance",
  "live",
  "fancam",
  "official",
  "mv",
  "video",
  "music",
  "clip",
  "무대",
  "직캠",
  "영상",
  "the",
  "of",
  "and",
  "a",
  "an",
]);

/**
 * 힌트의 뜻 있는 낱말만. 소문자·구두점 제거.
 *
 * 한 글자도 버리지 않는다. STAYC `윤`처럼 **한 음절이 곧 활동명**인 경우가 있고,
 * 버리면 그 사람은 인물 토큰이 없어져 중복 판정에서 아예 빠진다. 대신 `(G)I-DLE`이
 * 남기는 `g`·`i` 같은 부스러기는 여러 사람의 힌트에 나타나므로 팀 토큰으로 걸러진다
 * (inferTeamTokens) — 길이로 자르는 것보다 이쪽이 정확하다.
 */
export function hintTokenSet(hint: string): string[] {
  const seen = new Set<string>();
  for (const t of (hint ?? "")
    .toLocaleLowerCase()
    .replace(HINT_SEPARATORS, " ")
    .split(" ")) {
    if (t.length > 0 && !HINT_FILLERS.has(t)) seen.add(t);
  }
  return Array.from(seen);
}

/**
 * 응답 하나에서 **팀 토큰**을 추린다 (AI-2.1 ①).
 *
 * 외부 DB 없이 응답 자체로 판별한다: 어떤 낱말이 **서로 다른 인물** 둘 이상의
 * 힌트에 나오면 그건 개인을 가리키는 말이 아니라 소속을 가리키는 말이다.
 * 48명 로스터에서 `sserafim`은 5~6번, `yunjin`은 한 번 나온다.
 *
 * 한계 두 가지. ① 그 팀에서 한 명만 뽑히면 팀 토큰이 인물 토큰으로 분류된다.
 * ② 같은 인물이 서로 다른 소속으로 두 번 오르면(`NewJeans Sullyoon` +
 * `NMIXX Sullyoon`) 그 인물 토큰이 팀으로 분류된다. 둘 다 판정을 **틀리게**
 * 만들지는 않는다 — 그때는 "가릴 근거가 없다"(unsure)로 떨어져 사람에게 간다.
 * 조용히 병합하는 경우는 없다는 뜻이고, 그게 이 설계의 요점이다.
 */
/**
 * 팀 토큰으로 인정할 최소 소유자 수.
 *
 * 2였을 때 문제가 났다: 같은 인물이 두 번 오르면(`GFriend Miyeon` + `(G)I-DLE
 * Miyeon`) 그 사람 이름이 "둘이 쓰는 낱말"이 되어 팀으로 분류됐고, 그러면
 * 인물 토큰이 사라져 중복을 못 잡았다. 진짜 그룹은 로스터에 3명 이상 올라오고
 * 중복은 보통 2건이라, 3이 둘을 가른다.
 */
export const TEAM_TOKEN_MIN_OWNERS = 3;

export function inferTeamTokens(
  rows: readonly { name: string; imageSearchKeyword: string }[],
): Set<string> {
  const owners = new Map<string, Set<string>>();
  for (const row of rows) {
    // 소유자 = **힌트의 알맹이**다. 이름으로 세면 같은 인물이 두 표기로 오를 때
    // (`Sullyoon` / `설윤`) 그 인물 토큰이 "둘이 쓰는 낱말"로 보여 팀으로 오분류된다.
    // 보조어를 뺀 토큰 집합을 서명으로 쓰므로 `... stage`와 `... performance`도 한 명이다.
    const owner = hintTokenSet(row.imageSearchKeyword).slice().sort().join(" ");
    if (!owner) continue;
    for (const token of hintTokenSet(row.imageSearchKeyword)) {
      const set = owners.get(token) ?? new Set<string>();
      set.add(owner);
      owners.set(token, set);
    }
  }
  const teams = new Set<string>();
  owners.forEach((names, token) => {
    if (names.size >= TEAM_TOKEN_MIN_OWNERS) teams.add(token);
  });
  return teams;
}

/** 힌트에서 **인물**을 가리키는 낱말만 (소속 낱말을 뺀 나머지). */
export function personTokens(
  hint: string,
  teamTokens: ReadonlySet<string>,
): string[] {
  return hintTokenSet(hint).filter((t) => !teamTokens.has(t));
}

export type SameContestantVerdict = "same" | "different" | "unsure";

export interface SameContestantJudgement {
  verdict: SameContestantVerdict;
  detail: string;
  /** 상대 항목의 인물 토큰 — 이름 정정 후보로 쓴다. */
  personTokens: string[];
}

/**
 * 이름이 겹치는 두 항목이 **같은 인물인가** (AI-2.1 대표 결정 ①②③).
 *
 * 예전에는 이름 키가 같으면 그냥 버렸다. 그러다 골든 2·3회차에서
 * `김채원`(LE SSERAFIM) 뒤에 온 `김채원(허윤진)`·`김채원(위클리)`가 통째로
 * 사라졌다 — **실존하는 다른 인물**(허윤진·이재희)이 명단에서 빠진 것이다.
 * 그래서 이제 이름은 판정의 시작일 뿐이고, 가르는 건 힌트다.
 *
 *   ① 소속이 서로 다르다        → 동명이인. 둘 다 남긴다
 *      (단 인물 토큰까지 같으면 = 모델이 소속을 틀렸을 수 있다 → 사람에게)
 *   ② 소속이 같(거나 불명)다     → 인물 토큰으로 가른다. 다르면 둘 다, 같으면 병합
 *   ③ 그래도 못 가른다          → 둘 다 남기고 "중복 의심"을 단다
 */
export function judgeSameContestant(
  a: { imageSearchKeyword: string },
  b: { imageSearchKeyword: string },
  teamTokens: ReadonlySet<string>,
): SameContestantJudgement {
  const A = hintTokenSet(a.imageSearchKeyword);
  const B = hintTokenSet(b.imageSearchKeyword);
  const personB = B.filter((t) => !teamTokens.has(t));

  if (A.length === 0 || B.length === 0) {
    return {
      verdict: "unsure",
      detail: "힌트가 비어 있어 같은 인물인지 가릴 수 없다",
      personTokens: personB,
    };
  }

  const teamA = A.filter((t) => teamTokens.has(t));
  const teamB = B.filter((t) => teamTokens.has(t));
  const personA = A.filter((t) => !teamTokens.has(t));
  const overlaps = (x: string[], y: string[]) => x.some((t) => y.includes(t));

  // ① 소속이 서로 다르다
  if (teamA.length > 0 && teamB.length > 0 && !overlaps(teamA, teamB)) {
    if (personA.length > 0 && personB.length > 0 && overlaps(personA, personB)) {
      return {
        verdict: "unsure",
        detail:
          `인물 토큰은 같은데(${personA.join(" ")}) 소속이 다르다` +
          ` (${teamA.join(" ")} ≠ ${teamB.join(" ")}) — 한쪽 소속이 틀렸을 수 있다`,
        personTokens: personB,
      };
    }
    return {
      verdict: "different",
      detail: `소속이 다르다 (${teamA.join(" ")} ≠ ${teamB.join(" ")}) — 동명이인`,
      personTokens: personB,
    };
  }

  // ② 소속이 같거나 불명 — 인물 토큰으로 가른다
  if (personA.length > 0 && personB.length > 0) {
    if (!overlaps(personA, personB)) {
      return {
        verdict: "different",
        detail: `같은 소속의 다른 인물 (${personA.join(" ")} ≠ ${personB.join(" ")})`,
        personTokens: personB,
      };
    }
    // 한쪽이 다른 쪽을 통째로 품을 때만 같은 인물로 본다
    // (`Chaewon` ⊂ `Kim Chaewon`). 낱말 하나만 겹치는 건(`NMIXX Haewon` vs
    // `NMIXX Lily`에서 소속이 팀으로 안 잡힌 경우) 같다고 말할 근거가 못 된다.
    const aInB = personA.every((t) => personB.includes(t));
    const bInA = personB.every((t) => personA.includes(t));
    if (aInB || bInA) {
      return {
        verdict: "same",
        detail: `인물 토큰이 일치한다 (${personA.filter((t) => personB.includes(t)).join(" ")})`,
        personTokens: personB,
      };
    }
    return {
      verdict: "unsure",
      detail:
        `인물 토큰이 일부만 겹친다 (${personA.join(" ")} / ${personB.join(" ")})` +
        " — 같은 인물이라고 단정할 수 없다",
      personTokens: personB,
    };
  }

  // ③ 힌트에 팀 이름만 있다 — 사람에게 넘긴다
  return {
    verdict: "unsure",
    detail: "힌트에 인물을 가리키는 낱말이 없어 가릴 수 없다",
    personTokens: personB,
  };
}

/**
 * 소속(position)이 힌트의 팀과 **어긋나는가**.
 *
 * 증거의 슬롯 11이 그랬다: 이름 설윤 · position "NewJeans 메인댄서" · 실제로는
 * NMIXX. position이 한국어 직책만 담고 있으면(“메인보컬”) 모순이 아니라 **정보 없음**
 * 이다 — 그때 false를 돌려주는 게 중요하다. 없는 걸 어긋났다고 하면 안 된다.
 */
export function affiliationContradicts(
  item: { position: string; imageSearchKeyword: string },
  teamTokens: ReadonlySet<string>,
): boolean {
  const hintTeams = hintTokenSet(item.imageSearchKeyword).filter((t) =>
    teamTokens.has(t),
  );
  if (hintTeams.length === 0) return false;
  const posTeams = hintTokenSet(item.position).filter((t) => teamTokens.has(t));
  if (posTeams.length === 0) return false;
  return !posTeams.some((t) => hintTeams.includes(t));
}

/**
 * 이름 칸의 괄호 안이 힌트와 **정면으로 어긋나는가** — 라틴 문자일 때만.
 *
 * `설윤(NMIXX)` + 힌트 `NewJeans Sullyoon` 같은 경우다. 괄호가 한글이면
 * (`김채원(허윤진)`) 로마자 힌트와 문자 자체가 달라 여기서는 못 잡는다 —
 * 그건 이름 충돌 경로(judgeSameContestant "different")가 잡아 정정 후보를 남긴다.
 * 로마자↔한글 변환표를 들이는 건 이번 범위 밖이고, 추측으로 이름을 고치면
 * 허구 인물 사고를 반복한다.
 */
export function parentheticalContradictsHint(
  name: string,
  hint: string,
): boolean {
  const inside = (name ?? "").match(PARENTHETICAL_INNER);
  if (!inside) return false;
  const tokens = hintTokenSet(inside[1] ?? "").filter((t) => /^[a-z0-9]+$/.test(t));
  if (tokens.length === 0) return false; // 한글 괄호 — 여기서는 판단하지 않는다
  const hintTokens = hintTokenSet(hint);
  if (hintTokens.length === 0) return false;
  return !tokens.some((t) => hintTokens.includes(t));
}

export interface AiContestantSuggestion {
  name: string;
  nationality: string;
  position: string;
  imageSearchKeyword: string;
}

export type ContestantParseReason =
  | "unparseable"
  | "not_array"
  | "wrong_count";

export class ContestantParseError extends Error {
  constructor(
    public reason: ContestantParseReason,
    message: string,
    public received?: number,
  ) {
    super(message);
    this.name = "ContestantParseError";
  }
}

function toStr(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

export function parseAiContestants(
  text: string,
  expectedCount: number = TOTAL_CONTESTANTS,
  options: ParseOptions = {},
): AiContestantSuggestion[] {
  const match = text.match(/\[[\s\S]*\]/);
  let parsed: unknown;
  try {
    parsed = JSON.parse(match ? match[0] : text);
  } catch {
    throw new ContestantParseError(
      "unparseable",
      "AI 응답에서 JSON 배열을 찾지 못했습니다.",
    );
  }

  if (!Array.isArray(parsed)) {
    throw new ContestantParseError(
      "not_array",
      "AI 응답이 배열 형식이 아닙니다.",
    );
  }

  const discard = (
    reason: DiscardReason,
    item: { name: string; imageSearchKeyword: string },
    detail?: string,
  ) =>
    options.onDiscard?.({
      reason,
      name: item.name,
      imageSearchKeyword: item.imageSearchKeyword,
      ...(detail ? { detail } : {}),
    });

  // ── 1차: 모양만 거른다. 이름 없음 · 오염 힌트. 중복 판단은 아직 안 한다 ──
  // 팀 토큰은 **응답 전체**를 봐야 뽑을 수 있어서(inferTeamTokens) 한 번에 못 끝낸다.
  const rows: AiContestantSuggestion[] = [];
  for (const raw of parsed) {
    const o = (raw ?? {}) as Record<string, unknown>;
    const name = toStr(o.name).trim();
    const hint = toStr(o.imageSearchKeyword).trim();
    if (!name) {
      discard("no-name", { name, imageSearchKeyword: hint }); // 슬롯을 못 채운다
      continue;
    }
    if (isPollutedHint(hint)) {
      // 힌트가 검색어가 아니라 메모면 그 **항목 자체를** 버린다(설계 결정 ③).
      discard("polluted-hint", { name, imageSearchKeyword: hint });
      continue;
    }
    const row = {
      name,
      nationality: toStr(o.nationality),
      position: toStr(o.position),
      imageSearchKeyword: hint,
    };
    // AI-2.2: 제외 목록. 여기만은 **버리는 게 목적**이다 — 프롬프트 지시가
    // 두 번 뚫린 자리라(골든 2026-08-19, 수진 2/3회) 서버가 마지막으로 막는다.
    const excluded = findExclusion(row);
    if (excluded) {
      discard("excluded", row, excluded.reason);
      continue;
    }
    rows.push(row);
  }

  // ── 2차: 응답 전체에서 팀 토큰을 뽑는다 (AI-2.1 ①의 재료) ──
  const teamTokens = inferTeamTokens(rows);

  // ── 3차: 순서대로 채운다. **이름이 겹친다고 버리지 않는다** — 가려낸다 ──
  const picked: AiContestantSuggestion[] = [];
  const notice = (n: ContestantNotice) => options.onNotice?.(n);

  for (const row of rows) {
    const nameKey = normalizeNameKey(row.name);
    const hintKey = normalizeHintKey(row.imageSearchKeyword);

    // 충돌 후보를 찾는다 — 판정의 시작점일 뿐이다. 셋 중 하나라도 걸리면 본다:
    //   ① 이름이 같다 ② 검색어가 똑같다 ③ **힌트가 같은 인물을 가리킨다**
    // ③이 AI-2.2에서 추가됐다. 2026-08-19 골든의 중복 6쌍은 이름도 검색어도
    // 달랐다(`설윤`🔎LE SSERAFIM Sakura + `사쿠라`🔎LE SSERAFIM Sakura performance).
    // 사람 이름표를 못 믿으니 힌트가 가리키는 사람으로 찾는 수밖에 없다.
    const rowPersons = personTokens(row.imageSearchKeyword, teamTokens);
    const rivalIndex = picked.findIndex((p) => {
      if (normalizeNameKey(p.name) === nameKey) return true;
      if (hintKey !== "" && normalizeHintKey(p.imageSearchKeyword) === hintKey) {
        return true;
      }
      if (rowPersons.length === 0) return false;
      const rivalPersons = personTokens(p.imageSearchKeyword, teamTokens);
      return rivalPersons.some((t) => rowPersons.includes(t));
    });

    if (rivalIndex >= 0) {
      const rival = picked[rivalIndex];
      const judged = judgeSameContestant(rival, row, teamTokens);

      if (judged.verdict === "same") {
        // 같은 인물이 확인됐을 때만 병합한다. 남길 쪽은 **소속이 힌트와 맞는 쪽**.
        const rivalBroken = affiliationContradicts(rival, teamTokens);
        const rowBroken = affiliationContradicts(row, teamTokens);
        const namesDisagree = normalizeNameKey(rival.name) !== nameKey;
        if (rivalBroken && !rowBroken) {
          picked[rivalIndex] = row; // 일관된 쪽으로 갈아끼운다
          discard(
            "duplicate-merged",
            rival,
            `${judged.detail} · 소속이 힌트와 어긋나 이쪽을 접었다`,
          );
        } else {
          discard("duplicate-merged", row, judged.detail);
        }
        // 같은 인물인데 **이름 표기가 서로 달랐다** → 살아남은 쪽 이름이 틀렸을
        // 수 있다. 병합했다고 조용히 넘기지 않는다(`설윤`이 사쿠라를 가리킨 건).
        if (namesDisagree) {
          const survivor = picked[rivalIndex];
          notice({
            flag: "name-hint-mismatch",
            index: rivalIndex,
            name: survivor.name,
            imageSearchKeyword: survivor.imageSearchKeyword,
            suggestedNameTokens: judged.personTokens,
            detail:
              `"${rival.name}"와 "${row.name}"가 같은 인물을 가리킨다 —` +
              ` ${judged.detail}. 남은 이름 칸이 맞는지 확인할 것`,
          });
        }
        continue;
      }

      if (judged.verdict === "unsure") {
        // 못 가렸다 → 둘 다 남기고 사람에게 넘긴다 (③).
        notice({
          flag: "duplicate-suspect",
          index: picked.length,
          name: row.name,
          imageSearchKeyword: row.imageSearchKeyword,
          pairedIndex: rivalIndex,
          suggestedNameTokens: judged.personTokens,
          detail: `"${rival.name}"와 중복 의심 — ${judged.detail}`,
        });
      } else if (normalizeNameKey(rival.name) === nameKey) {
        // 다른 인물인데 **이름이 같다** → 이름 칸이 틀렸을 가능성이 크다.
        // 골든 #2의 `김채원(허윤진)`(힌트 LE SSERAFIM Yunjin)이 이 경로다.
        notice({
          flag: "name-hint-mismatch",
          index: picked.length,
          name: row.name,
          imageSearchKeyword: row.imageSearchKeyword,
          pairedIndex: rivalIndex,
          suggestedNameTokens: judged.personTokens,
          detail:
            `"${rival.name}"와 이름이 같지만 다른 인물이다 — ${judged.detail}.` +
            ` 이름 칸을 힌트 기준으로 확인할 것`,
        });
      }
      // different / unsure — 어느 쪽이든 **버리지 않고** 아래에서 채택한다.
    } else if (parentheticalContradictsHint(row.name, row.imageSearchKeyword)) {
      // 겹치는 상대가 없어도 이름 꼬리가 힌트와 어긋나면 알린다(라틴 문자 한정).
      notice({
        flag: "name-hint-mismatch",
        index: picked.length,
        name: row.name,
        imageSearchKeyword: row.imageSearchKeyword,
        suggestedNameTokens: hintTokenSet(row.imageSearchKeyword).filter(
          (t) => !teamTokens.has(t),
        ),
        detail: "이름 괄호 안이 힌트와 어긋난다 — 이름 칸을 확인할 것",
      });
    }

    picked.push(row);
    if (picked.length === expectedCount) break; // 과다 공급분은 버린다
  }

  const floor = Math.max(1, expectedCount - SHORTFALL_TOLERANCE);
  if (picked.length < floor) {
    throw new ContestantParseError(
      "wrong_count",
      `${expectedCount}명 중 최소 ${floor}명이 필요합니다 (중복 제거 후: ${picked.length}).`,
      picked.length,
    );
  }

  return picked;
}
