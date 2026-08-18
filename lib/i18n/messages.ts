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

  // ── Champion (Domain 3, /arena/{tid}/champion) ──────────────────
  // HF-3.1 W3 — shown once when a returning guest lands on a CONFLICT card (an
  // account that already finished this Tournament). "Tournament" stays verbatim.
  "champion.returning.banner": {
    ko: "이 Tournament는 이미 이 계정으로 완주하셨어요 — 기존 기록을 보여드려요.",
    en: "You've already finished this Tournament on this account — here's your existing record.",
    es: "Ya completaste este Tournament con esta cuenta — aquí está tu registro anterior.",
  },
  "champion.returning.dismiss": { ko: "닫기", en: "Dismiss", es: "Cerrar" },

  // ── Arena load screens (Domain 3) ──
  // These were hardcoded Korean in the page, so en/es Voters read Korean on
  // entry. "Tournament" stays verbatim (LANGUAGE.md).
  "arena.load.loading": { ko: "불러오는 중…", en: "Loading…", es: "Cargando…" },
  "arena.load.notFound": {
    ko: "Tournament를 찾을 수 없어요.",
    en: "We couldn't find that Tournament.",
    es: "No encontramos ese Tournament.",
  },
  "arena.load.failed": {
    ko: "Tournament를 불러오지 못했어요. 연결을 확인하고 다시 시도해주세요.",
    en: "We couldn't load this Tournament. Check your connection and try again.",
    es: "No pudimos cargar este Tournament. Revisa tu conexión e inténtalo de nuevo.",
  },
  "arena.load.retry": { ko: "다시 시도", en: "Try again", es: "Reintentar" },
  "arena.load.home": { ko: "홈으로", en: "Go home", es: "Ir al inicio" },

  // ── Arena vote errors (Domain 3, castVote) — #12 3-language mapping ──
  // Server sends a stable details.code; the client resolves the localized toast
  // (no more hardcoded Korean from onVote). "Tournament" stays verbatim.
  "arena.vote.dailyLimit": {
    ko: "오늘 참가할 수 있는 Tournament를 모두 사용했어요 (5/5)",
    en: "You've joined all 5 Tournaments for today (5/5)",
    es: "Ya has participado en los 5 Tournaments de hoy (5/5)",
  },
  "arena.vote.rateLimited": {
    ko: "잠시 후 다시 시도해주세요.",
    en: "Please try again in a moment.",
    es: "Vuelve a intentarlo en un momento.",
  },
  "arena.vote.failed": {
    ko: "투표에 실패했어요. 다시 시도해주세요.",
    en: "Your vote didn't go through. Please try again.",
    es: "No se registró tu voto. Inténtalo de nuevo.",
  },

  // ── The Lab create flow (Domain 2, /admin/lab) — B-2 i18n (스코프 #8) ──
  // ko values are kept verbatim so the ?lang=ko Lab E2E selectors still match.
  "lab.header.title": { ko: "Tournament 만들기", en: "Create Tournament", es: "Crear Tournament" },
  "lab.next": { ko: "다음 →", en: "Next →", es: "Siguiente →" },
  "lab.backToStep1": { ko: "← STEP 1 수정", en: "← Edit STEP 1", es: "← Editar STEP 1" },
  "lab.step2.editMeta": { ko: "✏️ 제목·설명 수정", en: "✏️ Edit title & description", es: "✏️ Editar título y descripción" },
  "lab.step2.editDone": { ko: "완료", en: "Done", es: "Hecho" },
  "lab.step2.noDescription": { ko: "설명 없음", en: "No description", es: "Sin descripción" },

  "lab.title.label": { ko: "Tournament 제목", en: "Tournament Title", es: "Título del Tournament" },
  "lab.title.placeholder": {
    ko: "예: Best Strikers of the Decade",
    en: "e.g. Best Strikers of the Decade",
    es: "ej. Best Strikers of the Decade",
  },

  "lab.category.label": { ko: "카테고리", en: "Category", es: "Categoría" },
  "lab.category.placeholder": { ko: "카테고리 선택", en: "Select a category", es: "Selecciona una categoría" },
  "lab.category.loadError": {
    ko: "카테고리를 불러오지 못했습니다",
    en: "Couldn't load categories",
    es: "No se pudieron cargar las categorías",
  },

  "lab.description.label": { ko: "설명", en: "Description", es: "Descripción" },
  "lab.description.optional": { ko: "선택", en: "optional", es: "opcional" },
  "lab.description.placeholder": {
    ko: "어떤 참가자들의 Tournament인가요? (예: 2020년 이후 데뷔한 글로벌 4세대 K-POP 아이돌)",
    en: "Who competes in this Tournament? (e.g. global 4th-gen K-POP idols who debuted after 2020)",
    es: "¿Quiénes compiten en este Tournament? (ej. idols de K-POP de 4.ª generación que debutaron tras 2020)",
  },

  "lab.keywords.label": { ko: "키워드", en: "Keywords", es: "Palabras clave" },
  "lab.keywords.aiButton": { ko: "✨ AI 키워드 생성", en: "✨ Generate keywords", es: "✨ Generar palabras clave" },
  "lab.keywords.aiButtonBusy": { ko: "✨ 생성 중…", en: "✨ Generating…", es: "✨ Generando…" },
  "lab.keywords.placeholder": {
    ko: "키워드 입력 후 Enter",
    en: "Type a keyword, press Enter",
    es: "Escribe una palabra clave y pulsa Enter",
  },
  "lab.keywords.addAria": { ko: "키워드 추가", en: "Add keyword", es: "Añadir palabra clave" },
  "lab.keywords.removeAria": { ko: "{kw} 삭제", en: "Remove {kw}", es: "Eliminar {kw}" },
  "lab.keywords.tooLong": {
    ko: "키워드는 각 {max}자 이하여야 합니다.",
    en: "Each keyword must be {max} characters or fewer.",
    es: "Cada palabra clave debe tener {max} caracteres o menos.",
  },
  "lab.keywords.counter": {
    ko: "{count}/{max} · 최소 1개 (AI 실패 시 직접 입력 가능)",
    en: "{count}/{max} · at least 1 (type your own if AI fails)",
    es: "{count}/{max} · al menos 1 (escríbela tú si la IA falla)",
  },

  "lab.deadline.label": { ko: "Tournament Deadline", en: "Tournament Deadline", es: "Tournament Deadline" },
  "lab.deadline.preset": { ko: "{days}일 후", en: "in {days} days", es: "en {days} días" },
  "lab.deadline.dateAria": {
    ko: "Tournament Deadline 날짜",
    en: "Tournament Deadline date",
    es: "Fecha del Tournament Deadline",
  },
  "lab.deadline.missing": {
    ko: "Deadline 날짜를 선택해주세요.",
    en: "Please pick a Deadline date.",
    es: "Selecciona una fecha de Deadline.",
  },
  "lab.deadline.past": {
    ko: "Deadline은 미래 날짜여야 합니다.",
    en: "The Deadline must be a future date.",
    es: "El Deadline debe ser una fecha futura.",
  },

  "lab.fill.label": { ko: "채우기", en: "Fill", es: "Rellenar" },
  "lab.fill.all": { ko: "✨ AI 48명 전체", en: "✨ AI all 48", es: "✨ IA los 48" },
  "lab.fill.allBusy": { ko: "✨ 추천 중… (약 15초)", en: "✨ Generating… (~15s)", es: "✨ Generando… (~15s)" },
  "lab.fill.blanks": { ko: "✨ 빈칸만 AI", en: "✨ AI blanks only", es: "✨ IA solo vacíos" },
  "lab.fill.hint": {
    ko: "✏️ 칸을 직접 클릭해 입력·수정할 수도 있어요",
    en: "✏️ You can also click a cell to type or edit it",
    es: "✏️ También puedes hacer clic en una celda para escribir o editar",
  },

  "lab.publish.ready": {
    ko: "토너먼트 생성 ({filled}/{total})",
    en: "Create Tournament ({filled}/{total})",
    es: "Crear Tournament ({filled}/{total})",
  },
  "lab.publish.busy": { ko: "저장 중…", en: "Saving…", es: "Guardando…" },

  "lab.contestant.namePlaceholder": { ko: "#{n} 이름", en: "#{n} name", es: "#{n} nombre" },
  "lab.contestant.nameAria": { ko: "Contestant {n} 이름", en: "Contestant {n} name", es: "Contestant {n} nombre" },
  "lab.contestant.nationality": { ko: "국적", en: "Nationality", es: "Nacionalidad" },
  "lab.contestant.nationalityAria": {
    ko: "Contestant {n} 국적",
    en: "Contestant {n} nationality",
    es: "Contestant {n} nacionalidad",
  },
  "lab.contestant.position": { ko: "포지션", en: "Position", es: "Posición" },
  "lab.contestant.positionAria": {
    ko: "Contestant {n} 포지션",
    en: "Contestant {n} position",
    es: "Contestant {n} posición",
  },
  "lab.contestant.imageUrl": {
    ko: "이미지 URL (라이선스 확인)",
    en: "Image URL (check the license)",
    es: "URL de imagen (verifica la licencia)",
  },
  "lab.contestant.imageUrlAria": {
    ko: "Contestant {n} 이미지 URL",
    en: "Contestant {n} image URL",
    es: "Contestant {n} URL de imagen",
  },
  "lab.contestant.keywordHint": { ko: "Claude 추천 검색어", en: "Claude-suggested search term", es: "Término de búsqueda sugerido por Claude" },
  "lab.contestant.clearAria": { ko: "Contestant {n} 지우기", en: "Clear Contestant {n}", es: "Vaciar Contestant {n}" },

  "lab.toast.keywordFail": {
    ko: "키워드 생성 실패. 직접 입력할 수 있어요.",
    en: "Keyword generation failed. You can type them by hand.",
    es: "Falló la generación de palabras clave. Puedes escribirlas a mano.",
  },
  "lab.toast.noBlanks": { ko: "빈칸이 없습니다.", en: "There are no blanks to fill.", es: "No hay celdas vacías." },
  "lab.toast.fillFail": {
    ko: "AI 추천 실패. 다시 시도하거나 직접 입력하세요.",
    en: "AI fill failed. Retry or fill by hand.",
    es: "Falló el relleno con IA. Reintenta o rellena a mano.",
  },
  "lab.toast.publishSuccess": { ko: "✓ 토너먼트 생성 완료", en: "✓ Tournament created", es: "✓ Tournament creado" },
  "lab.toast.publishFail": {
    ko: "저장 실패. 데이터는 그대로 유지됩니다. 다시 시도해주세요.",
    en: "Save failed. Your data is kept — please try again.",
    es: "Error al guardar. Tus datos se conservan — inténtalo de nuevo.",
  },

  // ── TournamentList ("내 Tournament") chrome — B-2 i18n (Tournament 제목 자체는
  // 사용자 콘텐츠라 원문 유지; status 'active'는 LANGUAGE.md 고정 용어라 미번역). ──
  "lab.list.title": { ko: "내 Tournament", en: "My Tournaments", es: "Mis Tournaments" },
  "lab.list.loading": { ko: "불러오는 중…", en: "Loading…", es: "Cargando…" },
  "lab.list.empty": {
    ko: "아직 생성된 Tournament가 없습니다. 위에서 첫 토너먼트를 만들어보세요.",
    en: "No Tournaments yet. Create your first one above.",
    es: "Aún no hay Tournaments. Crea el primero arriba.",
  },
  "lab.list.contestantsCount": { ko: "{n}명", en: "{n} contestants", es: "{n} contestantes" },
  "lab.list.arenaLink": { ko: "Arena에서 보기 →", en: "View in Arena →", es: "Ver en Arena →" },
  "lab.list.delete": { ko: "삭제", en: "Delete", es: "Eliminar" },
  "lab.list.deleteConfirm": { ko: "삭제 확인", en: "Confirm delete", es: "Confirmar" },
  "lab.list.deleteCancel": { ko: "취소", en: "Cancel", es: "Cancelar" },
  "lab.list.deleteAria": { ko: "{title} 삭제", en: "Delete {title}", es: "Eliminar {title}" },
  "lab.list.toast.loadFail": {
    ko: "목록을 불러오지 못했어요.",
    en: "Couldn't load your Tournaments.",
    es: "No se pudo cargar tus Tournaments.",
  },
  "lab.list.toast.featuredFail": {
    ko: "featured 변경에 실패했어요.",
    en: "Couldn't change the featured Tournament.",
    es: "No se pudo cambiar el Tournament destacado.",
  },
  "lab.list.toast.deleteSuccess": { ko: "삭제되었어요.", en: "Deleted.", es: "Eliminado." },
  "lab.list.toast.deleteFail": {
    ko: "삭제에 실패했어요.",
    en: "Delete failed.",
    es: "No se pudo eliminar.",
  },

  "lab.list.videoAlert": {
    ko: "영상 {n}개 재생 불가",
    en: "{n} videos cannot play",
    es: "{n} videos no se reproducen",
  },

  // ── LAB-EV-1 유튜브 임베드 검수기 (어드민 전용 · ADR-EV-7) ──────────────
  "lab.embed.open": {
    ko: "🎬 유튜브 검수기 일괄 입력",
    en: "🎬 YouTube batch inspector",
    es: "🎬 Inspector por lotes de YouTube",
  },
  "lab.embed.title": {
    ko: "유튜브 임베드 검수기",
    en: "YouTube embed inspector",
    es: "Inspector de embeds de YouTube",
  },
  "lab.embed.subtitle": {
    ko: "줄당 링크 1개. 통과한 링크는 10초 무음 루프로 슬롯에 들어갑니다.",
    en: "One link per line. Passing links become 10-second silent loops in the slots.",
    es: "Un enlace por línea. Los enlaces válidos entran como bucles silenciosos de 10 segundos.",
  },
  "lab.embed.sizeTab": { ko: "{n}강", en: "{n} slots", es: "{n} espacios" },
  "lab.embed.sizeAria": {
    ko: "브래킷 규모 {n}",
    en: "Bracket size {n}",
    es: "Tamaño de bracket {n}",
  },
  "lab.embed.placeholder": {
    ko: "https://www.youtube.com/watch?v=…\nhttps://youtu.be/…?t=90\n(줄당 1개, 최대 {n}개)",
    en: "https://www.youtube.com/watch?v=…\nhttps://youtu.be/…?t=90\n(one per line, up to {n})",
    es: "https://www.youtube.com/watch?v=…\nhttps://youtu.be/…?t=90\n(uno por línea, hasta {n})",
  },
  "lab.embed.validate": {
    ko: "검수 및 자동 채우기",
    en: "Inspect & auto-fill",
    es: "Inspeccionar y rellenar",
  },
  "lab.embed.validating": { ko: "검수 중…", en: "Inspecting…", es: "Inspeccionando…" },
  "lab.embed.close": { ko: "닫기", en: "Close", es: "Cerrar" },
  "lab.embed.counter": {
    ko: "{parsed}/{limit}줄 · 문제 {failed}줄",
    en: "{parsed}/{limit} lines · {failed} with problems",
    es: "{parsed}/{limit} líneas · {failed} con problemas",
  },
  "lab.embed.empty": {
    ko: "링크를 한 줄에 하나씩 붙여넣으세요.",
    en: "Paste one link per line.",
    es: "Pega un enlace por línea.",
  },
  "lab.embed.rowLabel": { ko: "{n}번 링크", en: "Link {n}", es: "Enlace {n}" },
  "lab.embed.slotLabel": { ko: "슬롯 {n}", en: "Slot {n}", es: "Espacio {n}" },
  "lab.embed.status.pass": { ko: "통과", en: "Pass", es: "Válido" },
  "lab.embed.status.warn": { ko: "경고", en: "Warning", es: "Aviso" },
  "lab.embed.status.blocked": { ko: "차단", en: "Blocked", es: "Bloqueado" },
  "lab.embed.reason.notFound": {
    ko: "존재하지 않는 영상 · 교체 필요",
    en: "Video does not exist · replace it",
    es: "El video no existe · reemplázalo",
  },
  "lab.embed.reason.notEmbeddable": {
    ko: "외부 재생 불가 · 교체 필요",
    en: "Embedding disabled by the owner · replace it",
    es: "El propietario desactivó el embed · reemplázalo",
  },
  "lab.embed.reason.private": {
    ko: "비공개 영상 · 교체 필요",
    en: "Private video · replace it",
    es: "Video privado · reemplázalo",
  },
  "lab.embed.reason.regionBlocked": {
    ko: "지역 차단: {countries}",
    en: "Blocked in: {countries}",
    es: "Bloqueado en: {countries}",
  },
  "lab.embed.reason.regionLimited": {
    ko: "허용 지역만: {countries}",
    en: "Allowed only in: {countries}",
    es: "Permitido solo en: {countries}",
  },
  "lab.embed.reason.ageRestricted": {
    ko: "연령제한 · 임베드에서 막힐 수 있어 교체 권장",
    en: "Age-restricted · may not play embedded, replacing is safer",
    es: "Restringido por edad · puede no reproducirse incrustado",
  },
  "lab.embed.reason.live": {
    ko: "라이브 스트림 · 루프에 맞지 않음",
    en: "Live stream · not suitable for a loop",
    es: "Transmisión en vivo · no sirve para un bucle",
  },
  "lab.embed.reason.tooShort": {
    ko: "10초보다 짧은 영상",
    en: "Shorter than 10 seconds",
    es: "Dura menos de 10 segundos",
  },
  "lab.embed.reason.duplicate": {
    ko: "{n}번 링크와 중복",
    en: "Duplicate of link {n}",
    es: "Duplicado del enlace {n}",
  },
  "lab.embed.reason.overLimit": {
    ko: "정원 {limit}개를 넘었습니다",
    en: "Beyond the {limit}-link limit",
    es: "Supera el límite de {limit}",
  },
  "lab.embed.reason.notYouTube": {
    ko: "유튜브 링크가 아닙니다",
    en: "Not a YouTube link",
    es: "No es un enlace de YouTube",
  },
  "lab.embed.reason.noVideoId": {
    ko: "영상 ID를 찾을 수 없습니다 (채널·재생목록 링크?)",
    en: "No video id found (channel or playlist link?)",
    es: "No se encontró el id del video (¿canal o lista?)",
  },
  "lab.embed.reason.notALink": {
    ko: "링크가 아닙니다",
    en: "Not a link",
    es: "No es un enlace",
  },
  "lab.embed.applied": {
    ko: "✓ {n}개 슬롯에 영상을 넣었어요.",
    en: "✓ Video added to {n} slots.",
    es: "✓ Video añadido a {n} espacios.",
  },
  "lab.embed.error.permission": {
    ko: "검수기는 운영자 전용입니다.",
    en: "The inspector is operator-only.",
    es: "El inspector es solo para operadores.",
  },
  "lab.embed.error.quota": {
    ko: "유튜브 API 하루 한도를 모두 썼어요. 잠시 후 나눠서 다시 시도해주세요.",
    en: "The YouTube API daily quota is used up. Try again later in smaller batches.",
    es: "Se agotó la cuota diaria de la API de YouTube. Inténtalo más tarde por lotes.",
  },
  "lab.embed.error.failed": {
    ko: "검수에 실패했어요. 다시 시도해주세요.",
    en: "Inspection failed. Please try again.",
    es: "La inspección falló. Inténtalo de nuevo.",
  },
  "lab.embed.tuner.open": { ko: "🎬 영상", en: "🎬 Video", es: "🎬 Video" },
  "lab.embed.tuner.title": {
    ko: "슬롯 {n} · 영상 미세조정",
    en: "Slot {n} · fine-tune the loop",
    es: "Espacio {n} · ajustar el bucle",
  },
  "lab.embed.tuner.loop": {
    ko: "{start}초 ~ {end}초 · 무음 루프",
    en: "{start}s – {end}s · silent loop",
    es: "{start}s – {end}s · bucle silencioso",
  },
  "lab.embed.tuner.start": { ko: "시작점", en: "Start", es: "Inicio" },
  "lab.embed.tuner.back": { ko: "−1초", en: "−1s", es: "−1s" },
  "lab.embed.tuner.forward": { ko: "+1초", en: "+1s", es: "+1s" },
  "lab.embed.tuner.openOriginal": {
    ko: "원본 열기 ↗",
    en: "Open original ↗",
    es: "Abrir original ↗",
  },
  "lab.embed.tuner.hint": {
    ko: "원본의 '가장 많이 다시 본 구간' 그래프를 눈으로 확인하고 시작점을 정하세요.",
    en: "Check the original's most-replayed graph by eye, then set the start point.",
    es: "Mira el gráfico de lo más repetido en el original y fija el inicio.",
  },
  "lab.embed.tuner.suggest": {
    ko: "✨ 킬링파트 추천",
    en: "✨ Suggest the hook",
    es: "✨ Sugerir el momento clave",
  },
  "lab.embed.tuner.suggesting": { ko: "추천 받는 중…", en: "Suggesting…", es: "Sugiriendo…" },
  "lab.embed.tuner.source.comments": {
    ko: "댓글 {n}개",
    en: "{n} comments",
    es: "{n} comentarios",
  },
  "lab.embed.tuner.source.chapters": { ko: "챕터", en: "Chapter", es: "Capítulo" },
  "lab.embed.tuner.source.heuristic": { ko: "기본값", en: "Default", es: "Predeterminado" },
  "lab.embed.tuner.commentsOff": {
    ko: "댓글이 꺼진 영상이라 챕터·기본값으로 추천했어요.",
    en: "Comments are off, so the suggestion comes from chapters or the default.",
    es: "Los comentarios están desactivados: la sugerencia viene de capítulos o del valor por defecto.",
  },
  "lab.embed.tuner.remove": { ko: "영상 빼기", en: "Remove video", es: "Quitar video" },
  "lab.embed.tuner.done": { ko: "완료", en: "Done", es: "Hecho" },
  "lab.embed.tuner.blockedNote": {
    ko: "재생이 막힌 영상입니다. 링크를 교체해주세요.",
    en: "This video cannot play here. Replace the link.",
    es: "Este video no puede reproducirse aquí. Reemplaza el enlace.",
  },

  // ── LAB-EV-2 자동 영상 소싱 (STEP 2) ───────────────────────────────────
  "lab.source.open": {
    ko: "🔍 영상 자동 소싱",
    en: "🔍 Auto-source videos",
    es: "🔍 Buscar videos automáticamente",
  },
  "lab.source.busy": {
    ko: "소싱 중… {done}/{total}",
    en: "Sourcing… {done}/{total}",
    es: "Buscando… {done}/{total}",
  },
  "lab.source.hint": {
    ko: "이름과 검색어 힌트로 유튜브를 찾아 검수한 뒤 슬롯에 제안합니다. 생성은 직접 누르세요.",
    en: "Finds and inspects YouTube videos from each name, then proposes them per slot. You still press Create.",
    es: "Busca e inspecciona videos de YouTube por nombre y los propone en cada espacio. Tú pulsas Crear.",
  },
  "lab.source.noTargets": {
    ko: "이름이 채워진 칸이 없습니다. 먼저 후보를 채워주세요.",
    en: "No named slots yet. Fill in contestants first.",
    es: "Aún no hay espacios con nombre. Rellena los contestants primero.",
  },
  "lab.source.confirm.title": {
    ko: "영상 자동 소싱을 시작할까요?",
    en: "Start auto-sourcing videos?",
    es: "¿Iniciar la búsqueda automática de videos?",
  },
  "lab.source.confirm.slots": {
    ko: "대상 {n}칸 (캐시 적중 {cached}칸은 검색 없이 처리)",
    en: "{n} slots ({cached} already cached — no search needed)",
    es: "{n} espacios ({cached} en caché — sin búsqueda)",
  },
  "lab.source.confirm.quota": {
    ko: "예상 검색 {searches}회 · 오늘 남은 검색 {remaining}회 (태평양시 자정 초기화)",
    en: "~{searches} searches · {remaining} left today (resets midnight PT)",
    es: "~{searches} búsquedas · quedan {remaining} hoy (se reinicia a medianoche PT)",
  },
  "lab.source.confirm.run": { ko: "소싱 시작", en: "Start sourcing", es: "Empezar" },
  "lab.source.confirm.cancel": { ko: "취소", en: "Cancel", es: "Cancelar" },
  "lab.source.confirm.loading": {
    ko: "사용량 확인 중…",
    en: "Checking quota…",
    es: "Comprobando cuota…",
  },
  "lab.source.done": {
    ko: "✓ 제안 {suggested} · 수동 필요 {manual} · 실존 의심 {unknown} (검색 {searches}회)",
    en: "✓ {suggested} proposed · {manual} need manual · {unknown} unverified ({searches} searches)",
    es: "✓ {suggested} propuestos · {manual} manuales · {unknown} sin verificar ({searches} búsquedas)",
  },
  "lab.source.stopped": {
    ko: "{remaining}칸을 남기고 중단됐습니다. 지금까지의 결과는 그대로 있습니다.",
    en: "Stopped with {remaining} slots left. Everything sourced so far is kept.",
    es: "Se detuvo con {remaining} espacios pendientes. Lo ya obtenido se conserva.",
  },
  "lab.source.error.permission": {
    ko: "운영자 권한이 필요합니다.",
    en: "Operator permission required.",
    es: "Se requiere permiso de operador.",
  },
  "lab.source.error.quota": {
    ko: "오늘 남은 유튜브 검색 횟수가 부족합니다. 태평양시 자정에 초기화됩니다.",
    en: "Not enough YouTube search quota left today. It resets at midnight PT.",
    es: "No queda cuota de búsqueda de YouTube hoy. Se reinicia a medianoche PT.",
  },
  "lab.source.error.failed": {
    ko: "영상 소싱에 실패했습니다. 다시 시도해주세요.",
    en: "Video sourcing failed. Please try again.",
    es: "La búsqueda de videos falló. Inténtalo de nuevo.",
  },
  "lab.source.badge.suggested": { ko: "제안", en: "Proposed", es: "Propuesto" },
  "lab.source.badge.manual": { ko: "수동 필요", en: "Needs manual", es: "Manual" },
  "lab.source.badge.unknown": { ko: "실존 의심", en: "Unverified", es: "Sin verificar" },
  "lab.source.reason.noResults": {
    ko: "검색 결과 0건 — 실존하지 않는 인물일 수 있습니다",
    en: "No search results — this person may not exist",
    es: "Sin resultados — puede que esta persona no exista",
  },
  "lab.source.reason.allBlocked": {
    ko: "후보 영상이 모두 재생 불가(임베드 차단·비공개)",
    en: "Every candidate is blocked (not embeddable or private)",
    es: "Todos los candidatos están bloqueados (no incrustables o privados)",
  },
  "lab.source.reason.notRelevant": {
    ko: "이 후보의 영상으로 볼 만한 결과가 없습니다",
    en: "No result looked like this contestant's video",
    es: "Ningún resultado parecía el video de este contestant",
  },
  "lab.source.reason.allDuplicate": {
    ko: "후보 영상이 이미 다른 칸에 쓰였습니다",
    en: "Every candidate is already used in another slot",
    es: "Todos los candidatos ya se usan en otro espacio",
  },
  "lab.source.reason.searchFailed": {
    ko: "검색에 실패했습니다 — 이 칸만 다시 시도해주세요",
    en: "Search failed — retry this slot",
    es: "La búsqueda falló — reintenta este espacio",
  },
  // AI-2: 감점된 영상이 실제로 슬롯에 얹혔을 때만 뜨는 배지 툴팁.
  "lab.source.demoted": {
    ko: "감점: 논란 키워드({terms}) — 다른 영상이 없어 이 영상이 들어갔습니다. 확인하세요",
    en: "Demoted: sensitive keyword ({terms}) — no cleaner video was found. Please review",
    es: "Penalizado: palabra sensible ({terms}) — no se encontró otro video. Revísalo",
  },
  "lab.source.refresh": { ko: "새 영상 찾기", en: "Find another", es: "Buscar otro" },
  "lab.source.refreshing": { ko: "찾는 중…", en: "Searching…", es: "Buscando…" },
  "lab.source.refreshEmpty": {
    ko: "다른 후보를 찾지 못했습니다.",
    en: "No other candidate found.",
    es: "No se encontró otro candidato.",
  },

  // ── ND-1 News Desk (Domain: /news + /admin/newsdesk) ───────────────────
  "newsdesk.error.dailyLimit": {
    ko: "오늘 생성 한도(20건)를 모두 사용했어요. 내일 다시 시도해주세요.",
    en: "You've hit today's draft limit (20). Try again tomorrow.",
    es: "Has alcanzado el límite de hoy (20 borradores). Inténtalo mañana.",
  },
  "newsdesk.error.generateFailed": {
    ko: "초안 생성에 실패했어요. 잠시 후 다시 시도해주세요.",
    en: "Draft generation failed. Please try again shortly.",
    es: "No se pudo generar el borrador. Inténtalo de nuevo pronto.",
  },
  "news.masthead.tagline": {
    ko: "팬이 만드는 뉴스",
    en: "News, made by fans",
    es: "Noticias hechas por fans",
  },
  "news.rail.label": { ko: "뉴스", en: "NEWSROOM", es: "SALA DE PRENSA" },
  "news.list.title": { ko: "뉴스", en: "Newsroom", es: "Sala de prensa" },
  "news.list.empty": {
    ko: "아직 발행된 기사가 없어요.",
    en: "No published articles yet.",
    es: "Aún no hay artículos publicados.",
  },
  "news.article.byline": {
    ko: "WorldCrown48 뉴스룸",
    en: "WorldCrown48 Newsroom",
    es: "Redacción de WorldCrown48",
  },
  "news.article.notFound": {
    ko: "기사를 찾을 수 없어요. 내려갔거나 아직 발행되지 않았습니다.",
    en: "Article not found — it may be unpublished or taken down.",
    es: "Artículo no encontrado — puede estar sin publicar o retirado.",
  },
  // ✦ AI-Report v2.5 문구 (3언어) — DATA {asOf} 는 렌더러가 붙임
  "news.aiReport": {
    ko: "✦ AI-Report · 발행인이 검토·승인했습니다",
    en: "✦ AI-Report · reviewed & approved by the publisher",
    es: "✦ AI-Report · revisado y aprobado por el editor",
  },
  // 기사 byline의 데이터 기준시각 라벨 (3언어) — {asOf} 보간
  "news.article.dataAsOf": {
    ko: "데이터 기준 {asOf}",
    en: "Data as of {asOf}",
    es: "Datos al {asOf}",
  },
  // 편집기 근거 스냅샷 패널 설명 (3언어)
  "newsdesk.evidence.hint": {
    ko: "AI가 기사 작성에 사용한 근거 수치입니다. 발행 전 기사 내용과 대조하세요.",
    en: "The evidence figures the AI used to write this article. Cross-check them against the article before publishing.",
    es: "Las cifras que la IA usó para redactar este artículo. Coteja con el artículo antes de publicar.",
  },
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
 * Pure message resolution. `entry[lang] || entry.en` guarantees es (and any
 * future partial locale) never renders blank or a raw key.
 */
export function resolveMessage(
  lang: Lang,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const entry: Entry = MESSAGES[key];
  // `||` (not `??`) so an empty-string locale value also falls back to en —
  // structurally guarantees the "never blank / never a raw key" invariant.
  const raw = entry[lang] || entry.en;
  return interpolate(raw, vars);
}
