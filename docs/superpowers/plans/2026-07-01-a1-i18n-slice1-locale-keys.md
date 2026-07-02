# A1-i18n Slice ① — Locale Wiring + Static UI Key System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `es` as a first-class locale across the 4 lockstep primitives, introduce a typed static-message catalog + `useT()` hook, and convert all 11 Pitch/Launch components from inline ko/en strings to catalog keys — so KO/EN/ES toggle (and `?lang=`) flips all static copy with zero inline Korean left.

**Architecture:** Extend the EXISTING React-Context i18n (`lib/i18n.tsx` + `?lang=` query). NO next-intl (handoff §9 trap 1). A pure resolver `resolveMessage(lang, key, vars)` over a typed catalog (`lib/i18n/messages.ts`) holds all logic (node-env vitest); `useT()` (`lib/i18n/useT.ts`) is thin React glue reading `useI18n().lang` (Playwright-covered). es values fall back to en when absent.

**Tech Stack:** Next.js 14 App Router, TypeScript, React Context, Vitest (node env), Playwright.

## Global Constraints

- ❌ **NO next-intl / no new i18n dependency.** Extend `lib/i18n.tsx` Context + `?lang=` only (handoff §5 DON'T, §9 trap 1).
- **Lang lockstep — edit all 4 together:** `Lang` type (`lib/cookieConsent.ts`) · `lib/locale.ts` (`SUPPORTED_LOCALES`/`LOCALE_META`/`isLang`) · `resolveBootLang` (`lib/i18n.tsx`). Missing one → `?lang=es` silently falls to en.
- **Zero inline Korean in the 11 components** after conversion. Verify: `grep -rnE '[가-힣]' components/pitch components/launch` → 0 matches.
- **`HeroSection` L2 marker:** the `en` value for key `pitch.hero.l2` MUST be exactly `"Ultimate Crown?"` (route-swap/CDN grep target, handoff §9 trap 4).
- **Non-translatable proper nouns** (LANGUAGE.md §10 / I18N_POLICY §5): WorldCrown48, Crown, Crown Card, AI-Report, Tournament, Contestant, Match, Voter, Champion, The Pitch/Arena/Lab, Launch Pad, LIVE, VOTE RATE, VS — keep verbatim in EVERY language's value.
- **es content:** AI-draft neutral Spanish (Español neutro, I18N_POLICY §6) is acceptable now; absent es → en fallback (handoff P2/P6). Never show a raw key or blank.
- **`<html lang>`:** do NOT re-hardcode "ko"; `useLocaleSync` owns it (handoff §5 DON'T).
- **Do NOT touch `tournament.title` rendering** — that is Slice ② (`getTitle`). This slice only converts *static UI chrome*, never Tournament data fields.
- Terminology: Tournament/Contestant/Match/Voter/Champion — never 대회/참가자/Battle (LANGUAGE.md §7).

---

## File Structure

- `lib/cookieConsent.ts` — MODIFY L54: `Lang` union gains `"es"` (root type; everything imports `Lang` from here).
- `lib/locale.ts` — MODIFY: `SUPPORTED_LOCALES`, `LOCALE_META.es`, `isLang`.
- `lib/i18n.tsx` — MODIFY: `resolveBootLang` accepts `?lang=es` + `nav.startsWith("es")`.
- `lib/i18n/messages.ts` — CREATE: typed catalog + `resolveMessage(lang, key, vars?)` pure resolver.
- `lib/i18n/useT.ts` — CREATE: `useT()` React hook → `t(key, vars?)`.
- `lib/i18n/__tests__/useT.test.ts` — CREATE: resolver key/fallback/interpolation unit tests.
- `lib/__tests__/locale.test.ts` — MODIFY: es added to expectations.
- `lib/__tests__/i18n.test.ts` — CREATE: `resolveBootLang` es unit tests.
- `components/launch/{LaunchHero,FeaturedTournament,SNSLinks,WaitlistForm}.tsx` — MODIFY: inline strings → `useT` keys.
- `components/pitch/{HeroSection,TrendingFeed,TournamentCard,LabEntryCard,NewsroomFeed,NewsFeedItem,PitchPage}.tsx` — MODIFY: inline strings → `useT` keys.
- `lib/pitch/labEntry.ts` — MODIFY: drop Korean from `LAB_COPY` (copy moves to catalog; keep `resolveLabState` logic + role tags).
- `e2e/pitch.spec.ts` — MODIFY: pin English-copy assertions to `?lang=en` (avoid post-keying false-red).
- `e2e/a1-i18n.spec.ts` — CREATE: 3-lang toggle text change + `?lang=es` boot + Console 0.
- `.github/workflows/a1-i18n-e2e.yml` — CREATE: scoped E2E workflow (handoff §11.5).
- `docs/i18n/I18N_POLICY.md` — MODIFY: 1-line note that §2·§3 next-intl plan is un-adopted (Context is current).

---

## Task 1: es locale lockstep (4 primitives)

**Files:**
- Modify: `lib/cookieConsent.ts:54`
- Modify: `lib/locale.ts:15-26`
- Modify: `lib/i18n.tsx:45-61`
- Modify (test): `lib/__tests__/locale.test.ts`
- Create (test): `lib/__tests__/i18n.test.ts`

**Interfaces:**
- Produces: `Lang = "ko" | "en" | "es"`; `SUPPORTED_LOCALES: readonly Lang[]` (length 3, order `["ko","en","es"]`); `LOCALE_META.es = { label: "Español", abbrev: "ES" }`; `isLang(v)` true for `"es"`; `resolveBootLang({url, navigatorLang})` returns `"es"` for `?lang=es` and for `navigatorLang` starting `es`.

- [ ] **Step 1: Update locale.test.ts to expect es (RED)**

Replace the `SUPPORTED_LOCALES` and `isLang` blocks and add an es meta case in `lib/__tests__/locale.test.ts`:

```ts
describe("SUPPORTED_LOCALES", () => {
  it("contains ko, en, es (es joins at MVP2 — A1-i18n completion)", () => {
    expect(SUPPORTED_LOCALES).toContain("ko");
    expect(SUPPORTED_LOCALES).toContain("en");
    expect(SUPPORTED_LOCALES).toContain("es");
    expect(SUPPORTED_LOCALES).toHaveLength(3);
    expect([...SUPPORTED_LOCALES]).toEqual(["ko", "en", "es"]);
  });
});
```

Add inside `describe("LOCALE_META", ...)`:

```ts
  it("es → Español / ES abbrev", () => {
    expect(LOCALE_META.es.label).toBe("Español");
    expect(LOCALE_META.es.abbrev).toBe("ES");
  });
```

Add inside `describe("isLang", ...)` first `it`:

```ts
    expect(isLang("es")).toBe(true);
```

- [ ] **Step 2: Create resolveBootLang es test (RED)**

Create `lib/__tests__/i18n.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveBootLang } from "../i18n";

const url = (search: string) => new URL(`http://x.com/${search}`);

describe("resolveBootLang", () => {
  it("?lang=es → es", () => {
    expect(resolveBootLang({ url: url("?lang=es"), navigatorLang: "en-US" })).toBe("es");
  });
  it("?lang=ko → ko, ?lang=en → en", () => {
    expect(resolveBootLang({ url: url("?lang=ko"), navigatorLang: "es-ES" })).toBe("ko");
    expect(resolveBootLang({ url: url("?lang=en"), navigatorLang: "ko-KR" })).toBe("en");
  });
  it("navigator es-MX (no query) → es", () => {
    expect(resolveBootLang({ url: url(""), navigatorLang: "es-MX" })).toBe("es");
  });
  it("navigator ko-KR → ko; anything else → en default", () => {
    expect(resolveBootLang({ url: url(""), navigatorLang: "ko-KR" })).toBe("ko");
    expect(resolveBootLang({ url: url(""), navigatorLang: "fr-FR" })).toBe("en");
  });
  it("unknown ?lang=xx falls through to navigator/default", () => {
    expect(resolveBootLang({ url: url("?lang=xx"), navigatorLang: "es-AR" })).toBe("es");
    expect(resolveBootLang({ url: url("?lang=xx"), navigatorLang: "fr" })).toBe("en");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test:unit -- lib/__tests__/locale.test.ts lib/__tests__/i18n.test.ts`
Expected: FAIL — `SUPPORTED_LOCALES` length is 2, `LOCALE_META.es` undefined, `resolveBootLang` returns `en` for es cases.

- [ ] **Step 4: Add es to the Lang type**

In `lib/cookieConsent.ts` line 54:

```ts
export type Lang = "ko" | "en" | "es";
```

- [ ] **Step 5: Add es to locale primitives**

In `lib/locale.ts`, update the three exports:

```ts
/** Locales shipped, in display order. `'es'` joins at MVP2 (A1-i18n completion). */
export const SUPPORTED_LOCALES: readonly Lang[] = ["ko", "en", "es"] as const;

/** Display metadata for each locale. `label` = full name, `abbrev` = trigger glyph text. */
export const LOCALE_META: Record<Lang, { label: string; abbrev: string }> = {
  ko: { label: "한국어", abbrev: "KO" },
  en: { label: "English", abbrev: "EN" },
  es: { label: "Español", abbrev: "ES" },
};

/** Type guard for an unknown `?lang=` value (edge case: `?lang=xx` → falls back to default). */
export function isLang(value: unknown): value is Lang {
  return value === "ko" || value === "en" || value === "es";
}
```

- [ ] **Step 6: Add es branch to resolveBootLang**

In `lib/i18n.tsx`, replace the body of `resolveBootLang` (lines 49-60):

```ts
  // 1. URL query
  const queryLang = args.url?.searchParams.get("lang");
  if (queryLang === "ko" || queryLang === "en" || queryLang === "es") return queryLang;

  // 2. (intentionally skipped — Firestore preference is Locker Room scope, MVP2)

  // 3. navigator.language
  const nav = args.navigatorLang?.toLowerCase() ?? "";
  if (nav.startsWith("ko")) return "ko";
  if (nav.startsWith("es")) return "es";

  // 4. default
  return "en";
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm run test:unit -- lib/__tests__/locale.test.ts lib/__tests__/i18n.test.ts`
Expected: PASS (all green).

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (`LOCALE_META` is `Record<Lang, …>`, so adding es to `Lang` without the meta entry would error — this confirms lockstep.)

- [ ] **Step 9: Commit**

```bash
git add lib/cookieConsent.ts lib/locale.ts lib/i18n.tsx lib/__tests__/locale.test.ts lib/__tests__/i18n.test.ts
git commit -m "feat(a1-i18n): add es locale across the 4 lockstep primitives

Lang type + SUPPORTED_LOCALES + LOCALE_META.es + isLang + resolveBootLang
(?lang=es / navigator es-*). LanguageToggle renders 3 options with no code
change (data-driven). Refs handoff §4-A.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Message catalog + resolver + useT hook

**Files:**
- Create: `lib/i18n/messages.ts`
- Create: `lib/i18n/useT.ts`
- Create: `lib/i18n/__tests__/useT.test.ts`

**Interfaces:**
- Produces:
  - `type MessageKey` — union of all catalog keys.
  - `MESSAGES: Record<MessageKey, { ko: string; en: string; es?: string }>` — key parity enforced by the `Record<MessageKey, …>` type (every key needs ko+en; es optional → en fallback).
  - `resolveMessage(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string` — pure. Picks `entry[lang] ?? entry.en`, then interpolates `{name}` tokens from `vars`.
  - `useT(): { t: (key: MessageKey, vars?: Record<string, string | number>) => string; lang: Lang }` — React hook.
- Consumes: `Lang` (Task 1), `useI18n` (`lib/i18n.tsx`).

- [ ] **Step 1: Write the resolver unit test (RED)**

Create `lib/i18n/__tests__/useT.test.ts` (tests the PURE resolver — repo convention keeps React glue for E2E):

```ts
import { describe, expect, it } from "vitest";
import { resolveMessage } from "../messages";

describe("resolveMessage", () => {
  it("returns the value for the active lang", () => {
    expect(resolveMessage("en", "pitch.hero.l2")).toBe("Ultimate Crown?");
    expect(resolveMessage("ko", "pitch.hero.cta.start")).toBe("투표 시작");
  });

  it("falls back to en when es is absent (never blank, never the key)", () => {
    // pitch.hero.l2 intentionally has no es override → en value.
    const es = resolveMessage("es", "pitch.hero.l2");
    expect(es).toBe("Ultimate Crown?");
    expect(es).not.toBe("");
    expect(es).not.toContain("pitch.hero");
  });

  it("uses the es value when present", () => {
    expect(resolveMessage("es", "pitch.hero.cta.start")).toBe("Empezar a votar");
  });

  it("interpolates {vars} (plural key)", () => {
    expect(
      resolveMessage("en", "pitch.trending.count.other", { count: 3 }),
    ).toBe("3 Tournaments · Live");
  });

  it("singular key is grammatically correct at count 1", () => {
    expect(
      resolveMessage("en", "pitch.trending.count.one", { count: 1 }),
    ).toBe("1 Tournament · Live");
  });

  it("preserves non-translatable proper nouns in every lang", () => {
    for (const lang of ["ko", "en", "es"] as const) {
      expect(resolveMessage(lang, "launch.featured.pill")).toContain("Tournament");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- lib/i18n/__tests__/useT.test.ts`
Expected: FAIL — `../messages` does not exist.

- [ ] **Step 3: Create the catalog + resolver**

Create `lib/i18n/messages.ts`. Every key carries `ko` + `en`; `es` is optional (absent → en fallback). Proper nouns kept verbatim per Global Constraints.

```ts
/**
 * messages — single source of truth for static UI copy (A1-i18n).
 *
 * Key rule: `domain.component.key` (I18N_POLICY §3). Every entry has ko + en;
 * `es` is optional and falls back to en (handoff P2/P6 — es content lands
 * incrementally). Proper nouns (WorldCrown48, Tournament, Contestant, Crown,
 * AI-Report, …) stay verbatim in EVERY language (LANGUAGE.md §10 / §5).
 *
 * Pure module — no React — so `resolveMessage` unit-tests in node-env vitest.
 * `useT` (useT.ts) is the thin React shell, verified by Playwright.
 */
import type { Lang } from "@/lib/cookieConsent";

interface Entry {
  ko: string;
  en: string;
  es?: string;
}

export const MESSAGES = {
  // ── Launch Pad (Domain 0, /launch) ──────────────────────────────
  "launch.hero.kicker": {
    ko: "지금 진행 중 · A WORLDCROWN48 TOURNAMENT IS OPEN",
    en: "NOW LIVE · A WORLDCROWN48 TOURNAMENT IS OPEN",
    es: "EN VIVO · UN TOURNAMENT DE WORLDCROWN48 ESTÁ ABIERTO",
  },
  "launch.hero.line1": {
    ko: "WHO RULES THE WORLD?",
    en: "WHO RULES THE WORLD?",
  },
  "launch.hero.line2": { ko: "YOU DECIDE.", en: "YOU DECIDE." },
  "launch.featured.pill": {
    ko: "FEATURED TOURNAMENT",
    en: "FEATURED TOURNAMENT",
  },
  "launch.featured.contestants": {
    ko: "Contestants",
    en: "Contestants",
  },
  "launch.featured.closes": { ko: "마감", en: "Closes", es: "Cierra" },
  "launch.featured.cta": { ko: "ENTER ARENA", en: "ENTER ARENA" },
  "launch.waitlist.head": {
    ko: "가장 먼저 입장하세요. 이메일을 남기면 개막을 가장 먼저 알려드립니다.",
    en: "Be first through the gate. Leave your email and we'll tell you the moment we open.",
    es: "Sé el primero en entrar. Deja tu correo y te avisamos en cuanto abramos.",
  },
  "launch.waitlist.placeholder": {
    ko: "이메일을 입력하세요",
    en: "Enter your email",
    es: "Introduce tu correo",
  },
  "launch.waitlist.emailLabel": {
    ko: "이메일 주소",
    en: "Email address",
    es: "Correo electrónico",
  },
  "launch.waitlist.submit": {
    ko: "웨이트리스트 참여",
    en: "Join the Waitlist",
    es: "Unirse a la lista",
  },
  "launch.waitlist.submitting": {
    ko: "제출 중…",
    en: "Submitting…",
    es: "Enviando…",
  },
  "launch.waitlist.success": {
    ko: "명단에 등록되었습니다!",
    en: "You're on the list!",
    es: "¡Ya estás en la lista!",
  },
  "launch.waitlist.errDuplicate": {
    ko: "이미 등록된 이메일입니다.",
    en: "This email is already on the list.",
    es: "Este correo ya está en la lista.",
  },
  "launch.waitlist.errInvalid": {
    ko: "올바른 이메일 주소를 입력하세요.",
    en: "Enter a valid email address.",
    es: "Introduce un correo válido.",
  },
  "launch.waitlist.privacy": {
    ko: "스팸 없음 · 언제든 수신 거부",
    en: "No spam · unsubscribe anytime",
    es: "Sin spam · cancela cuando quieras",
  },

  // ── The Pitch (Domain 1, /) ─────────────────────────────────────
  "pitch.hero.kicker": {
    ko: "트렌딩 · The Pitch · Global Fan Voting",
    en: "Trending · The Pitch · Global Fan Voting",
    es: "Tendencia · The Pitch · Votación Global de Fans",
  },
  "pitch.hero.l1": { ko: "왕관의 주인은", en: "Who wears the", es: "¿Quién lleva la" },
  // en MUST stay exactly "Ultimate Crown?" (route-swap/CDN grep target, §9 trap 4).
  "pitch.hero.l2": { ko: "Ultimate Crown?", en: "Ultimate Crown?" },
  "pitch.hero.sub": {
    ko: "48 Contestants. Five Rounds. Match를 거치며 하나의 Crown만 남을 때까지 전진합니다. 예측도, 배당도 없이 — 오직 팬의 선택. 당신의 한 표가 Champion을 만듭니다.",
    en: "48 Contestants. Five Rounds. You advance Match by Match until one Crown remains. No predictions, no odds — pure fan choice. Your vote crowns the Champion.",
    es: "48 Contestants. Cinco Rounds. Avanzas Match a Match hasta que queda una sola Crown. Sin predicciones ni apuestas — solo la elección de los fans. Tu voto corona al Champion.",
  },
  "pitch.hero.cta.start": {
    ko: "투표 시작",
    en: "Start Voting",
    es: "Empezar a votar",
  },
  "pitch.hero.cta.explore": { ko: "둘러보기", en: "Explore", es: "Explorar" },
  "pitch.trending.kicker": {
    ko: "트렌딩 · Trending",
    en: "Trending",
    es: "Tendencia",
  },
  "pitch.trending.title": {
    ko: "Trending Tournaments",
    en: "Trending Tournaments",
  },
  "pitch.trending.count.one": {
    ko: "{count} Tournament · 진행 중",
    en: "{count} Tournament · Live",
    es: "{count} Tournament · En vivo",
  },
  "pitch.trending.count.other": {
    ko: "{count} Tournaments · 진행 중",
    en: "{count} Tournaments · Live",
    es: "{count} Tournaments · En vivo",
  },
  "pitch.trending.empty.title": {
    ko: "현재 진행 중인 Tournament가 없습니다",
    en: "No Tournaments are open right now",
    es: "No hay Tournaments abiertos ahora mismo",
  },
  "pitch.trending.empty.sub": {
    ko: "곧 새로운 Tournament가 열립니다 · check back soon",
    en: "Check back soon — new Tournaments open regularly.",
    es: "Vuelve pronto — abrimos nuevos Tournaments a menudo.",
  },
  "pitch.card.featured": { ko: "FEATURED", en: "FEATURED" },
  "pitch.card.enter": { ko: "ENTER", en: "ENTER" },
  "pitch.card.contestants": {
    ko: "48 Contestants",
    en: "48 Contestants",
  },
  "pitch.card.closes": { ko: "마감 {date}", en: "Closes {date}", es: "Cierra {date}" },
  "pitch.lab.title": { ko: "Create Tournament", en: "Create Tournament" },
  "pitch.lab.roleTag": { ko: "TOURNAMENT HOST", en: "TOURNAMENT HOST" },
  "pitch.lab.sub.locked": {
    ko: "The Lab은 Tournament Host 전용입니다. 호스팅은 정식 오픈 후 열립니다.",
    en: "The Lab is reserved for Tournament Hosts. Hosting opens after launch.",
    es: "The Lab es solo para Tournament Hosts. La creación se habilita tras el lanzamiento.",
  },
  "pitch.lab.sub.active": {
    ko: "당신은 Tournament Host입니다 — The Lab을 열어 Tournament를 만들고 Deadline을 설정한 뒤 공개하세요.",
    en: "You are a Tournament Host — open The Lab to create a Tournament, set its Deadline, and publish.",
    es: "Eres un Tournament Host — abre The Lab para crear un Tournament, fijar su Deadline y publicarlo.",
  },
  "pitch.lab.cta.locked": { ko: "Coming Soon", en: "Coming Soon" },
  "pitch.lab.cta.active": { ko: "Open The Lab", en: "Open The Lab" },
  "pitch.lab.tip": {
    ko: "Coming Soon · Tournament 호스팅은 정식 오픈 후 열립니다",
    en: "Coming Soon · Tournament hosting opens after launch",
    es: "Coming Soon · La creación de Tournaments se abre tras el lanzamiento",
  },
  "pitch.news.kicker": { ko: "뉴스룸 · Newsroom", en: "Newsroom", es: "Sala de prensa" },
  "pitch.news.title": { ko: "Around the Pitch", en: "Around the Pitch" },
  "pitch.news.count": { ko: "Powered by GNews", en: "Powered by GNews" },
  "pitch.news.empty.title": {
    ko: "곧 다채로운 뉴스가 도착합니다",
    en: "Fresh news is on the way",
    es: "Pronto llegan nuevas noticias",
  },
  "pitch.news.empty.sub": {
    ko: "곧 새로운 소식이 도착합니다 · check back soon",
    en: "Fresh news is on the way — check back soon.",
    es: "Nuevas noticias en camino — vuelve pronto.",
  },
  "pitch.news.seeMore": {
    ko: "더 보기 · See more in the Arena Newsroom",
    en: "See more in the Arena Newsroom",
    es: "Ver más en el Arena Newsroom",
  },
  "pitch.news.hoursAgo": { ko: "{count}시간 전", en: "{count}h ago", es: "hace {count} h" },
} as const satisfies Record<string, Entry>;

export type MessageKey = keyof typeof MESSAGES;

/** Interpolate `{token}` occurrences from `vars`. Leaves unknown tokens intact. */
function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/**
 * Pure message resolution. `entry[lang] ?? entry.en` guarantees es (and any
 * future partial locale) never renders blank or a raw key.
 */
export function resolveMessage(
  lang: Lang,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const entry = MESSAGES[key];
  const raw = entry[lang] ?? entry.en;
  return interpolate(raw, vars);
}
```

- [ ] **Step 4: Create the useT hook**

Create `lib/i18n/useT.ts`:

```ts
/**
 * useT — React binding over the pure message resolver.
 *
 * Reads the active lang from the i18n Context and resolves catalog keys.
 * Thin by design (all logic is in messages.ts / resolveMessage, node-tested);
 * this shell is Playwright-covered per repo convention.
 */
"use client";

import { useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { resolveMessage, type MessageKey } from "./messages";

export function useT(): {
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  lang: ReturnType<typeof useI18n>["lang"];
} {
  const { lang } = useI18n();
  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      resolveMessage(lang, key, vars),
    [lang],
  );
  return { t, lang };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:unit -- lib/i18n/__tests__/useT.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (`satisfies Record<string, Entry>` validates every entry shape).

- [ ] **Step 7: Commit**

```bash
git add lib/i18n/messages.ts lib/i18n/useT.ts lib/i18n/__tests__/useT.test.ts
git commit -m "feat(a1-i18n): add typed message catalog + resolveMessage + useT

domain.component.key catalog with ko/en (+ optional es → en fallback),
{var} interpolation, proper nouns kept verbatim. Pure resolver node-tested;
useT is the React shell. Refs handoff §4-B.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Convert Launch components (Domain 0) to keys

**Files:**
- Modify: `components/launch/LaunchHero.tsx`
- Modify: `components/launch/FeaturedTournament.tsx`
- Modify: `components/launch/WaitlistForm.tsx`
- Modify: `components/launch/SNSLinks.tsx` (verify only — brand-only line, no Korean)

**Interfaces:**
- Consumes: `useT` (Task 2). Each component becomes/stays a client component and calls `const { t } = useT();`.

> TDD-exempt per handoff §11.3 (static markup, no logic). Verified by E2E (Task 6) + the Korean-grep gate. Each edit only swaps a string literal for a `t("…")` call.

- [ ] **Step 1: LaunchHero — key the kicker/slogan**

`LaunchHero` is currently a server component. Add `"use client"` at the very top (it now uses a hook) and import `useT`:

```tsx
"use client";

import { useT } from "@/lib/i18n/useT";

/**
 * M1 · LaunchHero — Crown SVG (colour anchor) + kicker + slogan.
 * Copy via useT (A1-i18n); slogan keys keep the same en text.
 */
export function LaunchHero() {
  const { t } = useT();
```

Replace the kicker/headline JSX (was lines 24-29) with:

```tsx
      <div className="hero-kicker">
        <span className="dot" aria-hidden="true" />
        {t("launch.hero.kicker")}
      </div>
      <h1 className="hero-line1">{t("launch.hero.line1")}</h1>
      <p className="hero-line2">{t("launch.hero.line2")}</p>
```

- [ ] **Step 2: FeaturedTournament — key pill/labels**

Add the hook at the top of the component body: `const { t } = useT();` (after the existing `useState` lines). Replace the literal segments:

```tsx
      <div className="ft-pill">
        <span className="star" aria-hidden="true">★</span>{" "}
        {t("launch.featured.pill")}
      </div>
      <h2 className="ft-title">{tournament.title}</h2>
      <div className="ft-meta">
        <span className="ft-meta-item">
          <span className="ft-meta-num">{tournament.contestantsCount ?? 48}</span>{" "}
          {t("launch.featured.contestants")}
        </span>
        {formatClosesAt(tournament.closesAt) && (
          <>
            <span className="ft-meta-sep" aria-hidden="true">·</span>
            <span className="ft-meta-item">
              {t("launch.featured.closes")}{" "}
              <span className="ft-meta-num">{formatClosesAt(tournament.closesAt)}</span>
            </span>
          </>
        )}
      </div>
```

And the CTA label:

```tsx
        <span>{t("launch.featured.cta")}</span>
```

> NOTE: `{tournament.title}` stays untouched here — Tournament title i18n is Slice ②.

- [ ] **Step 3: WaitlistForm — key all copy + error strings**

Add `import { useT } from "@/lib/i18n/useT";` and `const { t } = useT();` inside the component (after the `useState`/`useRef` lines). Replace the error message ternary:

```tsx
  const errMsg =
    state === "duplicate"
      ? t("launch.waitlist.errDuplicate")
      : state === "invalid"
        ? t("launch.waitlist.errInvalid")
        : "";
```

Replace the head, success, placeholder, aria-label, submit, spinner, and privacy strings:

```tsx
      <p className="wl-head">{t("launch.waitlist.head")}</p>
```
```tsx
        <div className="wl-success" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span> {t("launch.waitlist.success")}
        </div>
```
```tsx
              <input
                type="email"
                placeholder={t("launch.waitlist.placeholder")}
                autoComplete="email"
                aria-label={t("launch.waitlist.emailLabel")}
```
```tsx
              {state === "loading" ? (
                <>
                  <span className="wl-spinner" aria-hidden="true" /> {t("launch.waitlist.submitting")}
                </>
              ) : (
                t("launch.waitlist.submit")
              )}
```
```tsx
      <p className="wl-privacy">{t("launch.waitlist.privacy")}</p>
```

- [ ] **Step 4: SNSLinks — verify (brand-only line, no change)**

`SNSLinks` foot is `WorldCrown48 · 48 Contestants · One Crown` — all proper nouns/English, no Korean. Leave as-is. (Confirms the grep gate won't flag it.)

- [ ] **Step 5: Verify no Korean remains in launch components**

Run: `grep -rnE '[가-힣]' components/launch`
Expected: no output (exit 1).

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit` → PASS.

```bash
git add components/launch/
git commit -m "feat(a1-i18n): convert Launch Pad components to message keys

LaunchHero/FeaturedTournament/WaitlistForm now render via useT; zero inline
Korean. Tournament title left for Slice ②. Refs handoff §4-C.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Convert Pitch components (Domain 1) to keys

**Files:**
- Modify: `components/pitch/HeroSection.tsx`
- Modify: `components/pitch/TrendingFeed.tsx`
- Modify: `components/pitch/TournamentCard.tsx`
- Modify: `components/pitch/LabEntryCard.tsx`
- Modify: `components/pitch/NewsroomFeed.tsx`
- Modify: `components/pitch/NewsFeedItem.tsx` (date → keyed relative time)
- Modify: `lib/pitch/labEntry.ts` (drop Korean from LAB_COPY)
- Verify: `components/pitch/PitchPage.tsx` (brand foot line — no change)

**Interfaces:**
- Consumes: `useT` (Task 2). `NewsItem` gains an `hoursAgo: number` field replacing the pre-baked Korean `date` string (so dates localize).

> TDD-exempt (static markup) except the `NewsItem` shape change, which the newsroom unit tests already cover; run them after.

- [ ] **Step 1: HeroSection — key kicker/title/sub/CTAs**

Add `import { useT } from "@/lib/i18n/useT";` and `const { t } = useT();` at the top of the component. Replace the JSX body:

```tsx
      <div className="hero-kicker">{t("pitch.hero.kicker")}</div>
      <h1 className="hero-title">
        <span className="hero-l1">{t("pitch.hero.l1")}</span>
        <span className="hero-l2">{t("pitch.hero.l2")}</span>
      </h1>
      <p className="hero-sub">{t("pitch.hero.sub")}</p>
      <div className="hero-cta">
        <button className="btn btn-primary" type="button" onClick={scrollToTrending}>
          {t("pitch.hero.cta.start")} <ArrowIcon />
        </button>
        <button className="btn btn-ghost" type="button" onClick={scrollToTrending}>
          {t("pitch.hero.cta.explore")}
        </button>
      </div>
```

> The `en` value of `pitch.hero.l2` is `"Ultimate Crown?"` — unchanged. Confirms the route-swap/CDN grep still matches under en.

- [ ] **Step 2: TrendingFeed — key kicker/title/count/empty**

Add the hook. Replace the count and headings:

```tsx
      <div className="sec-head" id="trending">
        <div>
          <div className="sec-kicker">{t("pitch.trending.kicker")}</div>
          <h2 className="sec-title">{t("pitch.trending.title")}</h2>
        </div>
        <span className="sec-count">
          {t(
            tournaments.length === 1 ? "pitch.trending.count.one" : "pitch.trending.count.other",
            { count: tournaments.length },
          )}
        </span>
      </div>
```

Replace the empty state:

```tsx
        <div className="empty-state">
          <img src="/brand/wc48-crown-circle-outline.svg" alt="" width={56} />
          <div className="et">{t("pitch.trending.empty.title")}</div>
          <div className="es">{t("pitch.trending.empty.sub")}</div>
        </div>
```

> Singular/plural is preserved via two keys (`pitch.trending.count.one` / `.other`) — count 1 renders "1 Tournament · Live" grammatically (대표 decision 2026-07-01). The `.es` className here is a CSS class (empty-state sub), unrelated to the es locale.

- [ ] **Step 3: TournamentCard — key FEATURED/ENTER + localize meta line**

Add the hook and import `formatCloses` (already exported from `lib/pitch/trending`). Replace `cardMeta` usage: build the meta line via `t()` so it localizes (대표 decision 2026-07-01 — wire card meta now, not deferred).

Change the imports:

```tsx
import { formatCloses, statusPillVariant } from "@/lib/pitch/trending";
```

Replace the component body's meta computation + render. At the top of the component:

```tsx
export function TournamentCard({ tournament, position }: TournamentCardProps) {
  const { t } = useT();
  const closes = formatCloses(tournament.tournamentDeadline);
  const pill = statusPillVariant(tournament.status);
```

The FEATURED literal:

```tsx
            <span className="featured-pill" aria-label="Featured tournament">
              {t("pitch.card.featured")}
            </span>
```

The meta line (was `meta.map(...)`):

```tsx
        <div className="tcard-meta">
          <span>{t("pitch.card.contestants")}</span>
          {closes && (
            <span>
              <span className="sep">·&nbsp;</span>
              {t("pitch.card.closes", { date: closes })}
            </span>
          )}
        </div>
```

The ENTER literal:

```tsx
          <span className="tcard-enter">
            {t("pitch.card.enter")} <ArrowIcon />
          </span>
```

Leave `tournament.title` (Slice ②) and the status pill (`tournament.status.toUpperCase()` — data) untouched.

> **`cardMeta` cleanup:** `cardMeta` is now unused (TournamentCard was its only consumer). First confirm: `grep -rn 'cardMeta' components lib app` → only the (now-removed) import. Then delete `cardMeta` from `lib/pitch/trending.ts` and its test block from `lib/__tests__/pitch/trending.test.ts`. Keep `formatCloses`, `statusPillVariant`, `isFeedEmpty`, `TRENDING_LIMIT` (all still used/tested).

- [ ] **Step 4: LabEntryCard — key copy, keep state logic**

In `lib/pitch/labEntry.ts`, strip Korean from `LAB_COPY.locked.sub` (only the Korean prefix "대진 만들기 · " is removed; the rest is English and now lives in the catalog). Since copy moves to the catalog, reduce `LAB_COPY` to the role logic the component still needs, OR keep it English-only. Minimal change — replace the Korean-bearing `sub`/`tooltip` with catalog lookups in the component and drop them from `LAB_COPY`:

Replace `LAB_COPY` with:

```ts
export const LAB_COPY = {
  locked: { roleTag: "TOURNAMENT HOST", cta: "Coming Soon" },
  active: { roleTag: "TOURNAMENT HOST", cta: "Open The Lab" },
} as const;
```

In `components/pitch/LabEntryCard.tsx`, add the hook and route all copy through `t`:

```tsx
export function LabEntryCard({ isTournamentHost = false }: LabEntryCardProps) {
  const { t } = useT();
  const state = resolveLabState({ isTournamentHost });

  return (
    <section className="lab-entry" data-lab={state} aria-label="Create Tournament">
      <div className="lab-entry-ico">{state === "active" ? <LabIcon /> : <LockIcon />}</div>
      <div className="lab-entry-body">
        <div className="lab-entry-title">
          {t("pitch.lab.title")} <span className="lab-role-tag">{t("pitch.lab.roleTag")}</span>
        </div>
        <div className="lab-entry-sub">
          {state === "active" ? t("pitch.lab.sub.active") : t("pitch.lab.sub.locked")}
        </div>
      </div>

      <Link className="lab-cta lab-cta-active" href="/admin/lab">
        {t("pitch.lab.cta.active")} <ArrowIcon />
      </Link>

      <button
        className="lab-cta lab-cta-locked"
        type="button"
        aria-disabled="true"
        onClick={() => track("a1_lab_locked_hover", {})}
      >
        <LockIcon /> {t("pitch.lab.cta.locked")}
      </button>

      <div className="lab-tip" role="tooltip">{t("pitch.lab.tip")}</div>
    </section>
  );
}
```

Add `import { useT } from "@/lib/i18n/useT";` and remove the now-unused `LAB_COPY` import (keep `resolveLabState`).

- [ ] **Step 5: NewsFeedItem + NewsroomFeed — key chrome + localize dates**

In `lib/pitch/newsroom.ts`, change the `NewsItem` `date: string` field to `hoursAgo: number`. (Check the file first: `Read lib/pitch/newsroom.ts` — update the interface and any `date` references. The newsroom unit tests reference the shape; update them to match.)

In `NewsFeedItem.tsx`, add the hook and render the date via key:

```tsx
        <div className="nfi-date">{t("pitch.news.hoursAgo", { count: item.hoursAgo })}</div>
```

In `NewsroomFeed.tsx`, replace the mock data `date: "2시간 전"` → `hoursAgo: 2` (etc.), add the hook, and key the chrome:

```tsx
      <div className="sec-head">
        <div>
          <div className="sec-kicker">{t("pitch.news.kicker")}</div>
          <h2 className="sec-title">{t("pitch.news.title")}</h2>
        </div>
        <span className="sec-count">{t("pitch.news.count")}</span>
      </div>
```
```tsx
      <div className="news-empty">
        <img src="/brand/wc48-crown-outline.svg" alt="" width={48} />
        <div className="et">{t("pitch.news.empty.title")}</div>
        <div className="es">{t("pitch.news.empty.sub")}</div>
      </div>
```
```tsx
      <button className="see-more" type="button"
        onClick={() => track("a1_see_more_click", { destination: "arena_newsroom" })}>
        {t("pitch.news.seeMore")}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="12" x2="18" y2="12" />
          <polyline points="12 6 18 12 12 18" />
        </svg>
      </button>
```

Convert the KEYWORD_NEWS / AI_REPORTS mock arrays' `date: "N시간 전"` entries to `hoursAgo: N` (2/4/6/9 and 1/3 respectively).

- [ ] **Step 6: PitchPage — verify brand foot (no change)**

`PitchPage` foot `WorldCrown48 · 48 Contestants · One Crown` is brand/English — leave as-is.

- [ ] **Step 7: Run newsroom unit tests + verify no Korean**

Run: `npm run test:unit -- lib/__tests__/pitch`
Expected: PASS (after updating newsroom test data to `hoursAgo`).

Run: `grep -rnE '[가-힣]' components/pitch`
Expected: no output (exit 1).

- [ ] **Step 8: Typecheck + commit**

Run: `npx tsc --noEmit` → PASS.

```bash
git add components/pitch/ lib/pitch/labEntry.ts lib/pitch/newsroom.ts lib/__tests__/pitch/
git commit -m "feat(a1-i18n): convert The Pitch components to message keys

HeroSection/TrendingFeed/TournamentCard/LabEntryCard/Newsroom now render via
useT; NewsItem.date → hoursAgo (localized). hero.l2 en stays 'Ultimate Crown?'.
Zero inline Korean. Refs handoff §4-C.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Fix existing pitch.spec.ts determinism (avoid post-keying false-red)

**Files:**
- Modify: `e2e/pitch.spec.ts`

**Interfaces:** none — E2E only. English-copy assertions must run under `?lang=en` now that `?lang=ko` renders Korean.

- [ ] **Step 1: Pin English-copy assertions to ?lang=en**

The specs that assert English strings currently use `?lang=ko`. After keying, ko renders Korean. Change these `goto` calls to `?lang=en` (the en catalog values equal the previous bilingual-static English, so assertions like "Who wears the", "Trending Tournaments", "Around the Pitch" still match):

- AC-1 (`renders the 5 modules`): `page.goto("/?lang=ko")` → `page.goto("/?lang=en")`.
- AC-5+AC-6 (`no CategoryFilter chips, no Round labels`): `?lang=ko` → `?lang=en`.
- AC-11 (`3-breakpoint responsive`): the inner `page.goto("/?lang=ko")` → `?lang=en`.
- Phase F (`☰ opens SiteMapSheet`): `?lang=ko` → `?lang=en`.

Leave AC-2 (`/launch` — asserts `main.lp` selector, lang-agnostic) and AC-4/AC-10 (already `?lang=en`) unchanged.

> Rationale: the Navbar/SiteMapSheet domain names ("The Pitch", "Admin Dashboard") are proper nouns and stay identical across langs, but the module headings ("Trending Tournaments") are now keyed, so English assertions must pin en. `Create Tournament` (aria-label) is keyed via `pitch.lab.title` whose en value is unchanged.

- [ ] **Step 2: Commit**

```bash
git add e2e/pitch.spec.ts
git commit -m "test(a1-i18n): pin pitch.spec English assertions to ?lang=en

Post-keying, ?lang=ko renders Korean; English-copy assertions move to en for
determinism ([[feedback-i18n-test-determinism]]).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: New i18n E2E spec + scoped workflow

**Files:**
- Create: `e2e/a1-i18n.spec.ts`
- Create: `.github/workflows/a1-i18n-e2e.yml`

**Interfaces:** Consumes the header `lang-toggle` testid + `lang-option-{code}` testids (existing, `LanguageToggle.tsx`) and the pitch hero copy keys.

- [ ] **Step 1: Write the i18n E2E spec**

Create `e2e/a1-i18n.spec.ts`. Console-error gate per handoff §11.6, reusing the pitch IGNORED_CONSOLE noise list (signed-out GSI/FedCM/Firestore transport):

```ts
/**
 * A1-i18n — 3-language toggle + boot E2E (handoff §4-F, §7, §11).
 *
 * Verifies: (1) header shows KO/EN/ES; (2) picking ES flips The Pitch copy to
 * Spanish (or en fallback — never blank/raw key); (3) ?lang=es boots Spanish;
 * (4) zero (non-environmental) console errors throughout.
 */
import { expect, test, type ConsoleMessage } from "@playwright/test";

let consoleErrors: string[] = [];

const IGNORED_CONSOLE = [
  /Failed to load resource/i,
  /GSI_LOGGER/i,
  /\bFedCM\b/i,
  /accounts list is empty/i,
  /identitytoolkit/i,
  /status of (401|403|429)/i,
  /Could not reach Cloud Firestore backend/i,
  /Failed to fetch RSC payload/i,
];

test.beforeEach(({ page }) => {
  consoleErrors = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    consoleErrors.push(text);
  });
});

test.afterEach(() => {
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toHaveLength(0);
});

test("header toggle exposes KO / EN / ES", async ({ page }) => {
  await page.goto("/?lang=en");
  const toggle = page.getByTestId("lang-toggle");
  await toggle.getByRole("combobox").click();
  await expect(toggle.getByTestId("lang-option-ko")).toBeVisible();
  await expect(toggle.getByTestId("lang-option-en")).toBeVisible();
  await expect(toggle.getByTestId("lang-option-es")).toBeVisible();
});

test("picking ES flips hero copy and rewrites ?lang=es", async ({ page }) => {
  await page.goto("/?lang=en");
  // en boot: hero L1 is the English key value.
  await expect(page.getByText("Who wears the")).toBeVisible();

  const toggle = page.getByTestId("lang-toggle");
  await toggle.getByRole("combobox").click();
  await toggle.getByTestId("lang-option-es").click();

  await expect(page).toHaveURL(/[?&]lang=es/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  // Spanish hero L1 ("¿Quién lleva la"); L2 stays the proper-noun "Ultimate Crown?".
  await expect(page.getByText("¿Quién lleva la")).toBeVisible();
  await expect(page.getByText("Ultimate Crown?")).toBeVisible();
  // No raw key leaked.
  await expect(page.getByText(/pitch\.hero\./)).toHaveCount(0);
});

test("?lang=es boots Spanish directly", async ({ page }) => {
  await page.goto("/?lang=es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByText("Empezar a votar")).toBeVisible(); // pitch.hero.cta.start es
});

test("ko → en → es cycle keeps copy consistent (no blank / raw key)", async ({ page }) => {
  await page.goto("/?lang=ko");
  await expect(page.getByText("왕관의 주인은")).toBeVisible(); // pitch.hero.l1 ko
  const toggle = page.getByTestId("lang-toggle");
  await toggle.getByRole("combobox").click();
  await toggle.getByTestId("lang-option-en").click();
  await expect(page.getByText("Who wears the")).toBeVisible();
});
```

- [ ] **Step 2: Run the new spec locally (dev server)**

Run: `npm run test:e2e -- e2e/a1-i18n.spec.ts`
Expected: PASS (Playwright config boots the dev server per repo setup). If the local config requires `PREVIEW_URL`, run against `npm run dev` per `playwright.config.ts`.

- [ ] **Step 3: Create the scoped workflow**

Create `.github/workflows/a1-i18n-e2e.yml` (patterned on `a1-pitch-e2e.yml`: typecheck + scoped unit + E2E gated on preview secret; spec path pinned to avoid false-red):

```yaml
name: A1-i18n E2E (Playwright)

# Scoped to A1-i18n's files ([[feedback-workflow-spec-scope]]); E2E gated on the
# A1_PITCH_PREVIEW_URL secret (reused — same Pitch preview). Spec path pinned so
# other modules' specs never false-red this workflow.

on:
  pull_request:
    branches: [main]
    paths:
      - 'lib/i18n.tsx'
      - 'lib/i18n/**'
      - 'lib/locale.ts'
      - 'lib/cookieConsent.ts'
      - 'lib/__tests__/i18n.test.ts'
      - 'lib/__tests__/locale.test.ts'
      - 'components/pitch/**'
      - 'components/launch/**'
      - 'components/i18n/**'
      - 'e2e/a1-i18n.spec.ts'
      - 'playwright.config.ts'
      - '.github/workflows/a1-i18n-e2e.yml'

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      PREVIEW_URL: ${{ secrets.A1_PITCH_PREVIEW_URL }}
      VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
      NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
      NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Typecheck (tsc)
        run: npx tsc --noEmit
      - name: Unit tests — i18n + locale + pitch/launch logic
        run: npm run test:unit -- lib/i18n lib/__tests__/i18n.test.ts lib/__tests__/locale.test.ts lib/__tests__/pitch lib/__tests__/launch
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - name: Wait for Vercel Preview (skip if secret unset)
        run: |
          if [ -z "$PREVIEW_URL" ]; then
            echo "A1_PITCH_PREVIEW_URL not set — skipping E2E."; exit 0
          fi
          HEADER_ARGS=()
          if [ -n "$VERCEL_AUTOMATION_BYPASS_SECRET" ]; then
            HEADER_ARGS+=(-H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET")
          fi
          for i in {1..30}; do
            if curl -fsSL --max-time 10 "${HEADER_ARGS[@]}" "$PREVIEW_URL" >/dev/null; then
              echo "Preview reachable at $PREVIEW_URL"; exit 0
            fi
            echo "Preview not ready (attempt $i) — sleeping 10s."; sleep 10
          done
          echo "Preview never became reachable." >&2; exit 1
      - name: E2E (Playwright) — a1-i18n spec only
        if: ${{ env.PREVIEW_URL != '' }}
        run: npm run test:e2e -- e2e/a1-i18n.spec.ts
      - name: Upload Playwright HTML report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: a1-i18n-playwright-report
          path: playwright-report/
          retention-days: 14
```

- [ ] **Step 4: Commit**

```bash
git add e2e/a1-i18n.spec.ts .github/workflows/a1-i18n-e2e.yml
git commit -m "test(a1-i18n): add 3-lang toggle E2E + scoped workflow

e2e/a1-i18n.spec.ts (KO/EN/ES toggle, ?lang=es boot, console 0) + scoped
a1-i18n-e2e.yml (typecheck + unit + gated E2E, spec path pinned). Refs §11.5.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Doc reconciliation + final verification

**Files:**
- Modify: `docs/i18n/I18N_POLICY.md`

- [ ] **Step 1: Add the Context-vs-next-intl reconciliation note (handoff §9 trap 1)**

At the top of I18N_POLICY.md §2 (after the `## 2. URL 구조` heading) and §3 (`## 3. 기술 구현 — next-intl`), insert one line each:

```md
> ⚠️ 현행 구현은 React Context(`lib/i18n.tsx`) + `?lang=` 쿼리 방식이며, 아래 next-intl / `/ko/`·`/en/`·`/es/` URL 라우팅 안은 **미채택**입니다(2026-07-01, A1-i18n). 확장은 `lib/i18n/messages.ts` + `useT`로 합니다.
```

- [ ] **Step 2: Full-suite gate — no Korean, unit green, typecheck**

Run each and confirm:

```bash
grep -rnE '[가-힣]' components/pitch components/launch   # expect: no output
npm run test:unit -- lib/i18n lib/__tests__/i18n.test.ts lib/__tests__/locale.test.ts lib/__tests__/pitch lib/__tests__/launch   # expect: all PASS
npx tsc --noEmit   # expect: PASS
npm run lint   # expect: no new errors
grep -rn 'next-intl' package.json lib components   # expect: no output (trap 1)
grep -rn '"Ultimate Crown?"' lib/i18n/messages.ts   # expect: the en value present (trap 4)
```

- [ ] **Step 3: Commit**

```bash
git add docs/i18n/I18N_POLICY.md
git commit -m "docs(a1-i18n): note Context impl un-adopts next-intl plan (§9 trap 1)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 4: Slice ① review handoff**

Invoke `superpowers:requesting-code-review` against the slice ① diff (handoff §11.1 Phase 4): check §5 violations, CLAUDE.md #3/#4/#5, next-intl absence, inline-Korean 0, `Ultimate Crown?` en preserved, terminology. Then open the PR (Phase 5) with the §10 checklist. Slice ② (`title` object) is a separate spec→plan cycle and MUST deploy firestore.rules before code (handoff §9 trap 3).

---

## Self-Review

**Spec coverage (design doc → tasks):**
- es 4곳 lockstep → Task 1 ✓
- messages.ts + useT → Task 2 ✓
- 11 components (pitch 7 + launch 4) → Tasks 3–4 ✓ (SNSLinks/PitchPage verified brand-only)
- LanguageToggle 3 options (no code change) → Task 1 typecheck + Task 6 E2E ✓
- HeroSection `Ultimate Crown?` en preserved → Task 2 catalog + Task 7 grep ✓
- e2e/a1-i18n.spec + workflow → Task 6 ✓
- I18N_POLICY reconciliation note → Task 7 ✓
- Korean-grep gate → Tasks 3/4/7 ✓
- Analytics `cookie_lang_switch` unchanged (LanguageToggle already fires it) — no task needed ✓

**Gaps found & fixed inline:**
- Existing `e2e/pitch.spec.ts` would false-red after keying → added Task 5.
- Mock news Korean dates ("N시간 전") would fail the grep gate → `NewsItem.date`→`hoursAgo` + `pitch.news.hoursAgo` key (Task 4 Step 5).
- `LAB_COPY` held Korean in `sub` → reduced to logic-only, copy moved to catalog (Task 4 Step 4).

**Type consistency:** `Lang` (Task 1) consumed by `resolveMessage`/`useT` (Task 2) and `NewsItem.hoursAgo:number` used identically in NewsFeedItem + NewsroomFeed mock data + newsroom tests (Task 4). `MessageKey` union is the single param type across `resolveMessage`/`useT`/all components.

**Deferred (NOT this slice):** `tournament.title` localization + `getTitle` (Slice ②). The card meta line (`pitch.card.contestants`/`pitch.card.closes`) IS wired this slice (대표 decision 2026-07-01), replacing the now-deleted `cardMeta` helper.

**대표 decisions applied (2026-07-01, pre-flight):** (1) trending count keeps singular/plural via `pitch.trending.count.one`/`.other`; (2) card meta line localized now (cardMeta removed) — no unused catalog keys.
