/**
 * seed-categories.lib.mjs — the canonical `categories` collection payload (TX-0).
 *
 * Pure data (no firebase-admin / no I/O) so it unit-tests in the repo's node-env
 * Vitest — matching seed-preview.lib.mjs. The runnable seeder
 * (seed-categories.mjs) imports SEED_CATEGORIES and writes one doc per id.
 *
 * The 10 categories + their status/phase are the 대표-confirmed 3-phase launch
 * plan (§3 item 2 · §4 매핑표, 2026-07-10). Category ids are UPPER_SNAKE; the
 * display name is name.{ko,en,es}. `phase` is the 순차 런칭 단계 (0 = hidden 보존,
 * 1·2·3 = 1·2·3차); `order` is the display sort order.
 *
 *   1차 (live)      : KPOP · CREATOR
 *   2차 (scheduled) : KDRAMA · ESPORTS
 *   3차 (scheduled) : ANIME_WEBTOON · GLOBAL_POP · HOLLYWOOD
 *   보존 (hidden)   : FOOTBALL · GAMING · OTHER
 *
 * NOTE: Voter-facing surfacing (which statuses show where) is the Pitch/Arena
 * 개편 모듈 몫 — TX-0 seeds DATA only (§3 item 2). Changing a launch date later =
 * a data edit (status/phase), never a deploy.
 */

/** @typedef {{ id: string, name: { ko: string, en: string, es: string }, status: 'hidden'|'scheduled'|'live', phase: number, order: number }} SeedCategory */

/** @type {SeedCategory[]} */
export const SEED_CATEGORIES = [
  { id: "KPOP", name: { ko: "K-POP", en: "K-POP", es: "K-POP" }, status: "live", phase: 1, order: 1 },
  { id: "CREATOR", name: { ko: "크리에이터", en: "Creator", es: "Creador" }, status: "live", phase: 1, order: 2 },
  { id: "KDRAMA", name: { ko: "K-드라마", en: "K-Drama", es: "K-Drama" }, status: "scheduled", phase: 2, order: 3 },
  { id: "ESPORTS", name: { ko: "e스포츠", en: "Esports", es: "Esports" }, status: "scheduled", phase: 2, order: 4 },
  { id: "ANIME_WEBTOON", name: { ko: "애니 & 웹툰", en: "Anime & Webtoon", es: "Anime y Webtoon" }, status: "scheduled", phase: 3, order: 5 },
  { id: "GLOBAL_POP", name: { ko: "글로벌 팝", en: "Global Pop", es: "Pop Global" }, status: "scheduled", phase: 3, order: 6 },
  { id: "HOLLYWOOD", name: { ko: "할리우드", en: "Hollywood", es: "Hollywood" }, status: "scheduled", phase: 3, order: 7 },
  { id: "FOOTBALL", name: { ko: "축구", en: "Football", es: "Fútbol" }, status: "hidden", phase: 0, order: 8 },
  { id: "GAMING", name: { ko: "게임", en: "Gaming", es: "Gaming" }, status: "hidden", phase: 0, order: 9 },
  { id: "OTHER", name: { ko: "기타", en: "Other", es: "Otros" }, status: "hidden", phase: 0, order: 10 },
];
