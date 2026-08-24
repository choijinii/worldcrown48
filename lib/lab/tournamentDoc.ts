/**
 * Firestore payload builders for Publish (Domain 2 · The Lab, Step 3).
 *
 * Pure functions that turn operator input into the exact document shapes from
 * 부록 A. They own the write-time invariants (status='active', currentRound=1,
 * featured=false, exactly 48 contestants with 1-based order) so the component
 * just spreads `createdAt: serverTimestamp()` and commits a writeBatch.
 *
 * `createdAt` and `id` are intentionally NOT set here — serverTimestamp() and
 * doc ids are Firestore-side concerns the caller stamps, keeping these
 * functions deterministic and node-env testable.
 */
import { isValidCategory } from "@/lib/lab/categories";
import { validateTitle } from "@/lib/lab/titleValidation";
import { validateKeywords } from "@/lib/lab/keywordsValidation";
import { validateDeadline } from "@/lib/lab/deadlineValidation";
import { LOOP_SECONDS } from "@/lib/embed/constants";
import type { ContestantMedia } from "@/lib/media/mediaSlot";
import {
  TOTAL_CONTESTANTS,
  type Category,
  type Contestant,
  type LocalizedText,
  type Tournament,
} from "@/lib/types/tournament";

export interface TournamentInput {
  /** Flat original title (validated ≤50). Kept for back-compat reads. */
  title: string;
  /** Additive 3-language title (original in the source slot + translations). */
  titleI18n: LocalizedText;
  /** 3-language participant blurb (empty strings when the host skips it). */
  description: LocalizedText;
  /** Raw keyword chips — normalized + validated here (≥1, ≤12, each ≤30). */
  keywords: string[];
  category: Category;
  hostUid: string;
  /** Chosen deadline as epoch ms — must be strictly in the future. */
  deadlineMs: number;
}

/** A Tournament doc minus the Firestore-owned `id` and `createdAt`. */
export type TournamentDocData = Omit<Tournament, "id" | "createdAt">;

/**
 * Operator-editable Contestant row before order/tournamentId are assigned.
 *
 * LAB-EV-1: the video fields are OPTIONAL and ADDITIVE — 발행 시 기존 `media`
 * 그레일에 실린다(병렬 스키마를 만들지 않는다 — buildContestantDocs).
 *
 * LAB-UX-1 PR-2: `imageUrl` 칸이 사라졌다. 실데이터 528건 중 0건이 채워져 있었고,
 * Contestant의 그림은 이제 전부 영상 썸네일에서 나온다(contestantThumbnail).
 */
export interface ContestantDraft {
  name: string;
  /** ISO 3166-1 alpha-2 (KR·JP…). 표시는 displayRegion이 언어별로 편다. */
  nationality: string;
  /** 소속(그룹·팀·채널) — PR-2 신설. 직책(position)을 대체한다. */
  affiliation: string;
  imageSearchKeyword: string;
  /** 11자 YouTube id — 검수기(LAB-EV-1)가 채운다. */
  videoId?: string;
  /** 루프 시작 초. */
  videoStartSec?: number;
  /** 루프 끝 초 (기본 start+10 · ADR-EV-1). */
  videoEndSec?: number;
  /** [원본 열기]·출처 칩이 가리키는 watch URL (ADR-EV-3). */
  videoSourceUrl?: string;
}

/** A Contestant doc minus the Firestore-owned `id`. */
export type ContestantDocData = Omit<Contestant, "id">;

export function buildTournamentDoc(
  input: TournamentInput,
  validCategoryIds: readonly string[],
  nowMs: number,
): TournamentDocData {
  const title = validateTitle(input.title);
  if (!title.isValid) {
    throw new Error("Tournament 제목이 유효하지 않습니다 (1~50자).");
  }
  // TX-0: category validity is data-driven — the caller passes the ids loaded
  // from the `categories` collection (never a hard-coded tuple). This is the
  // AUTHORITATIVE membership check: a Tournament can only be created with a
  // known category id, so a bad category never becomes a real Tournament.
  if (!isValidCategory(input.category, validCategoryIds)) {
    throw new Error(`유효하지 않은 카테고리: ${String(input.category)}`);
  }
  if (!input.hostUid) {
    throw new Error("hostUid가 필요합니다.");
  }
  const keywords = validateKeywords(input.keywords);
  if (!keywords.isValid) {
    throw new Error("키워드는 1~12개, 각 30자 이하여야 합니다.");
  }
  const deadline = validateDeadline(input.deadlineMs, nowMs);
  if (!deadline.isValid) {
    throw new Error("Tournament Deadline은 미래 시각이어야 합니다.");
  }

  return {
    title: title.value,
    titleI18n: input.titleI18n,
    description: input.description,
    keywords: keywords.values,
    category: input.category,
    status: "active",
    hostUid: input.hostUid,
    // Pure/testable value — the caller stamps the real Firestore Timestamp
    // (Timestamp.fromMillis) just as it stamps createdAt: serverTimestamp().
    tournamentDeadline: input.deadlineMs,
    currentRound: 1,
    totalContestants: TOTAL_CONTESTANTS,
    settings: { aiNews: false, multiLang: false, showRanking: true },
    featured: false,
  };
}

/**
 * LAB-EV-1 W6 — 영상이 붙은 draft를 기존 `media` 그레일(ND-1 §3 #12)에 싣는다.
 *
 * 킥은 flat 필드(videoId·videoStartSec…)를 적었지만, 같은 개념의 저장소가 이미
 * `media.embed`로 존재한다(MediaSlot이 그걸 읽어 파사드를 렌더한다). 병렬 스키마를
 * 하나 더 만들면 "검수기는 채웠는데 카드는 못 읽는" 두 진실이 생기므로, **추가만**
 * 한다는 RULE 2에 맞춰 EmbedMedia를 확장해 재사용한다. Contestant를 읽는 기존
 * 코드는 전부 무영향(media 부재 = image).
 */
function mediaOf(d: ContestantDraft): ContestantMedia | undefined {
  if (!d.videoId) return undefined;
  return {
    type: "embed",
    embed: {
      videoId: d.videoId,
      start: d.videoStartSec ?? 0,
      end: d.videoEndSec ?? (d.videoStartSec ?? 0) + LOOP_SECONDS,
      sourceUrl: d.videoSourceUrl ?? "",
    },
  };
}

export function buildContestantDocs(
  tournamentId: string,
  hostUid: string,
  drafts: ContestantDraft[],
): ContestantDocData[] {
  if (drafts.length !== TOTAL_CONTESTANTS) {
    throw new Error(
      `정확히 ${TOTAL_CONTESTANTS}명이 필요합니다 (받음: ${drafts.length}).`,
    );
  }
  return drafts.map((d, i) => {
    const media = mediaOf(d);
    return {
      tournamentId,
      hostUid,
      order: i + 1,
      name: d.name,
      nationality: d.nationality,
      affiliation: d.affiliation,
      imageSearchKeyword: d.imageSearchKeyword,
      // undefined 필드를 그대로 넘기면 Firestore가 거부한다 — 있을 때만 싣는다.
      ...(media ? { media } : {}),
    };
  });
}
