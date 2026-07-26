#!/usr/bin/env node
/**
 * seed-news.mjs — ND-1 News Desk preview seeder (Phase D′).
 *
 * Injects canonical `news` docs so a designer can spot-check the built surfaces
 * WITHOUT the AI callable / Anthropic secret:
 *   - one PUBLISHED "open" article (기준본 v3 content, 3-lang: ko full · en full ·
 *     es empty → render fallback demo) with an EMBED hero → demonstrates /news
 *     목록·기사 URL·NewsRail·AI-Report v2.5·임베드 파사드 hover·언어 fallback.
 *   - one DRAFT "column" article → 대기함에서 발행/내리기 흐름을 시연할 대상.
 *
 * Usage:
 *   node functions/scripts/seed-news.mjs            # seed
 *   node functions/scripts/seed-news.mjs --cleanup  # remove seeded docs
 *   node functions/scripts/seed-news.mjs --help
 *
 * Auth: FIREBASE_ADMIN_SDK_KEY (raw JSON or base64) — admin SDK bypasses rules.
 * Safeguards: refuses NODE_ENV=production; idempotent (skips existing unless --cleanup).
 */
import admin from "firebase-admin";

const HELP = `seed-news — ND-1 News Desk preview seeder (Phase D′)

  (no flag)     seed the published + draft demo articles
  --cleanup     remove the seeded demo articles
  --help, -h    show this help
`;

const PUBLISHED_SLUG = "20260722-nd1dmo";
const DRAFT_SLUG = "20260722-nd1drf";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded);
}

// ── canonical demo content (기준본 v3, 축제의 언어판) ──────────────────────
const koBody = [
  {
    type: "hero",
    kicker: "TOURNAMENT OPEN",
    title: "2026 서머 컴백 타이틀곡 48",
    subtitle: "여름의 무대를 채울 48곡 · ROUND OF 48 개막",
    imageUrl: "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg",
    embed: { videoId: "9bZkp7q19f0", start: 0 },
  },
  {
    type: "lead",
    text: "지난 6월 마지막 주, 음원 차트 1위는 닷새 동안 세 번 주인이 바뀌었다. 차트는 매일 답을 바꿨고, 그래서 즐거운 숙제가 하나 남았다 — 당신의 올여름 노래는 어느 곡인가.",
  },
  {
    type: "paragraph",
    text: "그 질문이 오늘, 하나의 무대 위에 올랐다. WorldCrown48이 개막한 '2026 서머 컴백 타이틀곡 48'은 이번 시즌 발표된 타이틀곡 48곡을 한 무대에 올린 Tournament다.",
  },
  {
    type: "stats",
    items: [
      { n: "48", l: "CONTESTANTS" },
      { n: "08-31", l: "DEADLINE · KST" },
      { n: "KO·EN·ES", l: "LANGUAGES" },
    ],
  },
  {
    type: "matchups",
    pairs: [
      {
        left: { group: "URBANROSE", title: "Blue Flame" },
        right: { group: "MIRO", title: "여름밤 도둑" },
      },
    ],
    note: "개막전부터 눈을 뗄 수 없는 만남이 성사됐다 — 어느 쪽을 골라도 여름 노래 하나는 확실히 챙겨가는 매치다.",
  },
  { type: "closer", text: "올여름의 노래는, 당신이 정한다." },
];

const enBody = [
  {
    type: "hero",
    kicker: "TOURNAMENT OPEN",
    title: "2026 Summer Comeback Title Tracks 48",
    subtitle: "48 songs for the summer stage · ROUND OF 48 opens",
    imageUrl: "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg",
    embed: { videoId: "9bZkp7q19f0", start: 0 },
  },
  {
    type: "lead",
    text: "In the last week of June the #1 spot changed hands three times in five days. The chart kept changing its answer — leaving one delightful question: which song was YOUR summer?",
  },
  {
    type: "paragraph",
    text: "Today that question took the stage. WorldCrown48's '2026 Summer Comeback Title Tracks 48' puts this season's 48 title tracks on one stage.",
  },
  {
    type: "stats",
    items: [
      { n: "48", l: "CONTESTANTS" },
      { n: "08-31", l: "DEADLINE · KST" },
      { n: "KO·EN·ES", l: "LANGUAGES" },
    ],
  },
  {
    type: "matchups",
    pairs: [
      {
        left: { group: "URBANROSE", title: "Blue Flame" },
        right: { group: "MIRO", title: "여름밤 도둑" },
      },
    ],
    note: "A first-round meeting you can't look away from — whichever you pick, you walk away with a summer song.",
  },
  { type: "closer", text: "This summer's song is yours to decide." },
];

const publishedDoc = {
  slug: PUBLISHED_SLUG,
  template: "open",
  status: "published",
  origin: "manual_ai",
  tournamentId: "dev-preview-lab",
  title: {
    ko: "닷새 만에 세 번 바뀐 여름 차트 — 이제 당신의 한 곡을 고를 시간",
    en: "The Summer Chart Changed Three Times in Five Days — Now Pick Your One Song",
    es: "", // es 미번역 → 렌더 원문 fallback 시연
  },
  subhead: {
    ko: "'2026 서머 컴백 타이틀곡 48' 개막. 올여름을 함께한 48곡이 한 무대에.",
    en: "'2026 Summer Comeback Title Tracks 48' opens. 48 songs on one stage.",
    es: "",
  },
  body: { ko: koBody, en: enBody, es: [] },
  evidence: {
    asOf: "2026-07-22 08:00 KST",
    stats: [
      { label: "CONTESTANTS", value: "48" },
      { label: "DEADLINE · KST", value: "08-31" },
      { label: "LANGUAGES", value: "KO·EN·ES" },
    ],
    tournamentId: "dev-preview-lab",
  },
};

const draftDoc = {
  slug: DRAFT_SLUG,
  template: "column",
  status: "draft",
  origin: "manual_ai",
  title: { ko: "여름 플레이리스트의 심리학 (초안)", en: "", es: "" },
  subhead: { ko: "왜 우리는 매년 여름 노래를 다시 고를까.", en: "", es: "" },
  body: {
    ko: [
      { type: "lead", text: "여름이 오면 우리는 늘 새로운 플레이리스트를 만든다." },
      { type: "closer", text: "올여름, 당신의 한 곡은 무엇인가." },
    ],
    en: [],
    es: [],
  },
  evidence: { asOf: "2026-07-26 12:00 KST", stats: [] },
};

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to run with NODE_ENV=production.");
    process.exit(1);
  }
  const svc = loadServiceAccount();
  if (!svc) {
    console.error("FIREBASE_ADMIN_SDK_KEY is not set (raw JSON or base64).");
    process.exit(1);
  }
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(svc) });
  }
  const db = admin.firestore();
  const cleanup = args.includes("--cleanup");

  for (const doc of [publishedDoc, draftDoc]) {
    const ref = db.collection("news").doc(doc.slug);
    if (cleanup) {
      await ref.delete();
      console.log(`[cleanup] removed news/${doc.slug}`);
      continue;
    }
    const snap = await ref.get();
    if (snap.exists) {
      console.log(`[skip] news/${doc.slug} already exists`);
      continue;
    }
    await ref.set({
      ...doc,
      publishedAt:
        doc.status === "published" ? admin.firestore.FieldValue.serverTimestamp() : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`[seed] wrote news/${doc.slug} (${doc.status})`);
  }
  console.log(
    cleanup
      ? "Done. Demo articles removed."
      : `Done. Visit /news · /news/${PUBLISHED_SLUG} · / (NewsRail) · /admin/newsdesk (draft ${DRAFT_SLUG}).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
