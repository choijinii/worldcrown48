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
  const entry: Entry = MESSAGES[key];
  const raw = entry[lang] ?? entry.en;
  return interpolate(raw, vars);
}
