/**
 * Tournament + Contestant domain contract (Domain 2 · The Lab).
 *
 * Single source of truth for the shapes B-1 writes to Firestore and C-1/C-2
 * later read. Pure type declarations — no runtime behavior, so no test.
 *
 * Terminology is LANGUAGE.md-official: Tournament, Contestant, Champion,
 * Voter, Match. Never Candidate / 대회 / Battle.
 *
 * Note on `Timestamp`: this contract is consumed by both client (firebase/
 * firestore) and Cloud Functions (firebase-admin/firestore), whose Timestamp
 * types are nominally different. We keep the field types structural here and
 * let the write-side builders stamp the concrete value (serverTimestamp()).
 */
import type { ContestantMedia } from "@/lib/media/mediaSlot";

/**
 * A Tournament category id (UPPER_SNAKE, e.g. "KPOP"). TX-0 (2026-07-11):
 * categories are Firestore DATA (a `categories` collection), NOT a code enum,
 * so a Tournament just carries the id string. Validity is checked against the
 * loaded category id list (lib/taxonomy · isValidCategoryId) at every trust
 * boundary — never a hard-coded tuple. The doc shape lives in
 * `lib/taxonomy/category.ts` (CategoryDoc). See LANGUAGE.md §13.
 */
export type Category = string;

// ND-1 §3 #12 — Contestant media swap grail (image·embed·clip). Type lives in the
// pure lib/media/mediaSlot module (renderer + decision); re-exported on Contestant.
export type { ContestantMedia };

/** Exactly 48 Contestants per Tournament — the binary tree halves 48→24→12→6→FINAL. */
export const TOTAL_CONTESTANTS = 48;

export type TournamentStatus = "active" | "ended" | "draft";

/**
 * currentRound: 1=ROUND OF 48, 2=ROUND OF 24, 3=ROUND OF 12, 4=ROUND OF 6,
 * 5=THE FINAL. There is NO ROUND OF 16 / QF / SF (FIFA names forbidden).
 */
export type RoundIndex = 1 | 2 | 3 | 4 | 5;

export interface TournamentSettings {
  aiNews: boolean;
  multiLang: boolean;
  showRanking: boolean;
}

/**
 * A ko/en/es string bundle. B-2 (2026-07-11): title·description are translated
 * once at publish (Haiku) and STORED here — consumption stays each module's job
 * (same "store, don't consume" contract as `keywords`). All three slots are
 * populated (the untranslated ones fall back to the original input), so a reader
 * always has a value. `title` (the flat original) is kept for back-compat with
 * every existing read site (Arena/Pitch/Launch/Crown) — this is ADDITIVE, not a
 * migration. See handoff §3 / 대표 결정 #3.
 */
export interface LocalizedText {
  ko: string;
  en: string;
  es: string;
}

export interface Tournament {
  id: string;
  title: string; // max 50 chars — flat ORIGINAL input, unchanged for back-compat
  titleI18n: LocalizedText; // B-2: additive 3-language title (translated at publish)
  description: LocalizedText; // B-2: participant-scope blurb, 3 languages (may be empty strings)
  keywords: string[]; // B-2: ≤12, each ≤30 chars — AI-fill hint + C-4 news + C-5 Fan Intelligence
  category: Category;
  status: TournamentStatus;
  hostUid: string;
  createdAt: unknown; // serverTimestamp() at write time
  tournamentDeadline: unknown | null; // Tournament-wide only — Round Deadline does NOT exist
  currentRound: RoundIndex;
  totalContestants: typeof TOTAL_CONTESTANTS;
  settings: TournamentSettings;
  featured: boolean; // exactly one Tournament true at a time (Launch Pad hero)
}

export interface Contestant {
  id: string;
  tournamentId: string;
  hostUid: string; // denormalized from the Tournament — enables batch-safe Firestore rules
  order: number; // 1..48
  name: string;
  /**
   * ISO 3166-1 alpha-2 (KR·JP·US…). LAB-UX-1 PR-2 이전에 발행된 문서는 자유 텍스트
   * ("대한민국")를 갖고 있다 — 화면은 `displayRegion`이 둘 다 처리한다.
   */
  nationality: string;
  /**
   * 소속(그룹·팀·채널). PR-2에서 신설했다.
   *
   * `position`(직책)을 **대체**하지만 지우지 않는다: 이미 발행된 528건은 position에만
   * 값이 있어서, 필드를 갈아치우면 그 Tournament들의 메타가 통째로 빈칸이 된다.
   * 읽을 때는 `contestantAffiliation()`이 affiliation → position 순으로 본다.
   */
  affiliation?: string;
  /** @deprecated PR-2 이전 발행분 전용. 새 문서에는 쓰지 않는다. */
  position?: string;
  imageSearchKeyword: string; // Claude-suggested search term only
  /**
   * ND-1 §3 #12 — OPTIONAL media swap grail (image | embed | clip). `clip`은
   * 스키마 예약이고 렌더 경로가 없다(lib/media/mediaSlot.ts).
   *
   * LAB-UX-1 PR-2: 운영자가 직접 붙이던 `imageUrl`이 사라졌다 — 실데이터 528건 중
   * 0건이 채워져 있었다. 이제 Contestant의 그림은 전부 여기서 나온다
   * (`contestantThumbnail`이 embed의 videoId로 정지 썸네일을 만든다).
   */
  media?: ContestantMedia;
}

/**
 * The shape Claude returns per Contestant before the operator edits and the
 * system assigns order/tournamentId. 이미지 URL은 애초에 없었고(불변 원칙 #6 —
 * 함수는 이미지를 내려받지 않는다), PR-2에서 운영자 입력 칸마저 사라졌다.
 */
export interface AiContestantSuggestion {
  name: string;
  /** ISO 3166-1 alpha-2. */
  nationality: string;
  /** 소속(그룹·팀·채널). */
  affiliation: string;
  imageSearchKeyword: string;
}

/**
 * 표시용 소속 — PR-2 이전 발행분 호환 (LAB-UX-1).
 *
 * 새 문서는 `affiliation`을, 2026-08-24 이전 발행분(528건)은 `position`을 갖는다.
 * 필드를 갈아치우는 대신 읽는 쪽에서 흡수한다 — 그래야 기존 Tournament의 메타가
 * 빈칸이 되지 않는다(B-2의 `titleI18n` 추가형 전례와 같은 방식).
 */
export function contestantAffiliation(
  c: Pick<Contestant, "affiliation" | "position">,
): string {
  return (c.affiliation ?? "").trim() || (c.position ?? "").trim();
}
