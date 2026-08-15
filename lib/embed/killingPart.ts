/**
 * killingPart — 10초 루프의 시작점 추천 3층 (LAB-EV-1 W2 · ADR-EV-2).
 *
 * 유튜브의 "가장 많이 다시 본 구간"(Most Replayed)은 공식 API가 주지 않는다.
 * ADR-EV-2는 비공식 스크래핑을 영구 금지했으므로, 공식 데이터만으로 근사한다:
 *
 *   ① 댓글 타임스탬프 — "1:30 여기가 킬링파트"가 몰린 지점. 좋아요로 가중한다.
 *   ② 설명란 챕터   — 후렴/Chorus/Dance Break 같은 이름이 붙은 구간 우선.
 *   ③ 휴리스틱 60s  — 위 둘이 다 비었을 때의 기본값(짧은 영상이면 가운데로).
 *
 * 댓글이 꺼진 영상은 예외가 아니라 정상 경로다 — 폴백이 곧 기능이다(§8).
 * 최종 선택은 언제나 운영자 몫이고(ADR-EV-2 "[원본 열기]"), 이 함수는 후보와
 * 근거만 제시한다.
 */
import { HEURISTIC_START_SEC, LOOP_SECONDS } from "./constants";
import { extractTimestamps, parseTimestamp } from "./timestamps";

/** 같은 지점을 가리키는 언급으로 묶는 폭 — 루프 길이와 같게 둔다. */
const CLUSTER_WINDOW_SEC = LOOP_SECONDS;
/** 이미 있는 후보와 이만큼 가까우면 같은 지점으로 보고 버린다. */
const DEDUPE_SEC = 3;
const MAX_CANDIDATES_PER_LAYER = 3;

/** 챕터 제목이 "여기가 하이라이트"라고 말해주는 단어들 (ko·en). */
const KILLING_PART_KEYWORDS = [
  "chorus",
  "hook",
  "drop",
  "dance",
  "break",
  "climax",
  "highlight",
  "후렴",
  "하이라이트",
  "킬링",
  "클라이맥스",
  "포인트",
  "안무",
];

export type KillingPartSource = "comments" | "chapters" | "heuristic";

export interface TimestampEntry {
  sec: number;
  /** 좋아요 가중치 — 무가중 언급도 1은 갖는다. */
  weight: number;
}

export interface TimestampCluster {
  sec: number;
  mentions: number;
  weight: number;
}

export interface KillingPartCandidate {
  startSec: number;
  source: KillingPartSource;
  /** 이 후보를 뒷받침한 언급 수(챕터·휴리스틱은 0). */
  mentions: number;
  /** 0~1 — 같은 층 안에서의 상대 근거 세기. UI 칩의 정렬·강조에 쓴다. */
  confidence: number;
  /** chapters 층일 때 원본 챕터 제목(운영자가 눈으로 확인할 근거). */
  chapterTitle?: string;
}

export interface KillingPartInput {
  comments: { text: string; likeCount: number }[];
  description: string;
  durationSec: number | null;
}

export interface KillingPartResult {
  source: KillingPartSource;
  candidates: KillingPartCandidate[];
}

/** 가까운 언급을 한 덩어리로 묶고, 가중치가 큰 순으로 돌려준다(①층). */
export function clusterTimestamps(entries: TimestampEntry[]): TimestampCluster[] {
  if (entries.length === 0) return [];
  const sorted = [...entries].sort((a, b) => a.sec - b.sec);

  const groups: TimestampEntry[][] = [];
  for (const entry of sorted) {
    const current = groups[groups.length - 1];
    if (current && entry.sec - current[0].sec <= CLUSTER_WINDOW_SEC) current.push(entry);
    else groups.push([entry]);
  }

  return groups
    .map((group) => {
      const weight = group.reduce((sum, e) => sum + e.weight, 0);
      const weighted = group.reduce((sum, e) => sum + e.sec * e.weight, 0);
      return {
        sec: Math.floor(weight > 0 ? weighted / weight : group[0].sec),
        mentions: group.length,
        weight,
      };
    })
    .sort((a, b) => b.weight - a.weight || b.mentions - a.mentions || a.sec - b.sec);
}

/** 설명란에서 챕터 목록을 뽑는다(②층). 앞/뒤 어느 쪽에 시간이 붙어도 읽는다. */
export function parseChapters(description: string): { startSec: number; title: string }[] {
  const leading = /^[\s[(]*(\d{1,3}:\d{2}(?::\d{2})?)[\])]?\s*[-–—:•|]?\s*(.+)$/;
  const trailing = /^(.+?)\s*[-–—:•|]?\s*[[(]?(\d{1,3}:\d{2}(?::\d{2})?)[\])]?$/;

  const seen = new Set<number>();
  const out: { startSec: number; title: string }[] = [];

  for (const line of description.split("\n")) {
    const raw = line.trim();
    if (!raw) continue;

    let stamp: string | null = null;
    let title = "";
    const lead = raw.match(leading);
    if (lead) {
      stamp = lead[1];
      title = lead[2];
    } else {
      const tail = raw.match(trailing);
      if (tail) {
        stamp = tail[2];
        title = tail[1];
      }
    }
    if (!stamp) continue;

    const startSec = parseTimestamp(stamp);
    const cleanTitle = title.replace(/^[-–—:•|\s]+|[-–—:•|\s]+$/g, "");
    if (startSec === null || !cleanTitle || seen.has(startSec)) continue;
    seen.add(startSec);
    out.push({ startSec, title: cleanTitle });
  }

  return out.sort((a, b) => a.startSec - b.startSec);
}

/** ③층 — 60s. 60s가 영상 밖이면 가운데 근처로 당긴다(§8 짧은 영상). */
export function heuristicStartSec(durationSec: number | null): number {
  if (durationSec === null || durationSec >= HEURISTIC_START_SEC + LOOP_SECONDS) {
    return HEURISTIC_START_SEC;
  }
  return Math.max(0, Math.floor(durationSec / 2 - LOOP_SECONDS / 2));
}

function isKillingPartTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return KILLING_PART_KEYWORDS.some((kw) => lower.includes(kw));
}

function dedupe(candidates: KillingPartCandidate[]): KillingPartCandidate[] {
  const kept: KillingPartCandidate[] = [];
  for (const c of candidates) {
    if (kept.some((k) => Math.abs(k.startSec - c.startSec) <= DEDUPE_SEC)) continue;
    kept.push(c);
  }
  return kept;
}

function commentCandidates(input: KillingPartInput): KillingPartCandidate[] {
  const entries: TimestampEntry[] = [];
  for (const c of input.comments) {
    for (const sec of extractTimestamps(c.text ?? "")) {
      // 영상 길이를 넘는 값은 오타이거나 다른 영상 얘기다 — 버린다.
      if (input.durationSec !== null && sec >= input.durationSec) continue;
      entries.push({ sec, weight: 1 + Math.max(0, c.likeCount ?? 0) });
    }
  }
  const clusters = clusterTimestamps(entries);
  if (clusters.length === 0) return [];
  const top = clusters[0].weight;
  return clusters.slice(0, MAX_CANDIDATES_PER_LAYER).map((cl) => ({
    startSec: cl.sec,
    source: "comments" as const,
    mentions: cl.mentions,
    confidence: top > 0 ? Number((cl.weight / top).toFixed(2)) : 0,
  }));
}

function chapterCandidates(input: KillingPartInput): KillingPartCandidate[] {
  const chapters = parseChapters(input.description ?? "").filter(
    (ch) => input.durationSec === null || ch.startSec < input.durationSec,
  );
  if (chapters.length === 0) return [];

  const keyword = chapters.filter((ch) => isKillingPartTitle(ch.title));
  // 0:00은 인트로다 — 이름이 킬링파트를 가리키지 않는 한 후보가 아니다.
  const rest = chapters.filter((ch) => !keyword.includes(ch) && ch.startSec > 0);

  return [...keyword, ...rest].slice(0, MAX_CANDIDATES_PER_LAYER).map((ch, i) => ({
    startSec: ch.startSec,
    source: "chapters" as const,
    mentions: 0,
    confidence: isKillingPartTitle(ch.title) ? 0.6 : Math.max(0.2, 0.4 - i * 0.05),
    chapterTitle: ch.title,
  }));
}

/**
 * 3층 추천. 위층이 후보를 내면 그 층이 source가 되고, 아래층은 기본값 칩 하나만
 * 꼬리에 붙는다 — 운영자가 언제나 "그냥 60초"로 돌아갈 수 있게.
 */
export function recommendKillingPart(input: KillingPartInput): KillingPartResult {
  const heuristic: KillingPartCandidate = {
    startSec: heuristicStartSec(input.durationSec),
    source: "heuristic",
    mentions: 0,
    confidence: 0.2,
  };

  const comments = commentCandidates(input);
  if (comments.length > 0) {
    return { source: "comments", candidates: dedupe([...comments, heuristic]) };
  }

  const chapters = chapterCandidates(input);
  if (chapters.length > 0) {
    return { source: "chapters", candidates: dedupe([...chapters, heuristic]) };
  }

  return { source: "heuristic", candidates: [heuristic] };
}
