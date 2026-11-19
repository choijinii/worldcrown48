/**
 * golden-fill-beauty — LAB-FIX-5 §7 뷰티 크리에이터 묶음 실측 (명단 채우기 + 조건 검사 · 실제 Claude API 2회).
 *
 * TEST2 설정 그대로(제목 · 엔트리 단위 개인 · 세 줄)로 48칸을 채우고, 바로 조건 검사를 부른다.
 * 합격선(지시서 §7):
 *   - 한글로 옮겨 적힌 외국 인물 이름 0 (국적이 KR 이 아닌데 이름에 한글)
 *   - 남성으로 알려진 크리에이터가 명단에 있으면 그 칸이 모두 조건 검사에 걸림
 *   - 같은 사람 두 번 0쌍(있으면 표시됨)
 *   - 이미지 못 찾은 칸 ≤ 3 — BRAVE_SEARCH_API_KEY 가 있을 때만 잰다(없으면 "안 잼")
 * "남성으로 알려진" 목록은 아래 KNOWN_MALE(TEST1 · TEST2 에 나온 이름 + 널리 알려진 남성 뷰티 크리에이터) — 목록 밖은 사람이 결과 표를 본다.
 *
 *   cd functions && npm run build
 *   ANTHROPIC_API_KEY=... [BRAVE_SEARCH_API_KEY=...] node scripts/golden-fill-beauty.mjs [결과.json]
 * 키는 출력하지 않는다.
 */
import { writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { aiFillCore } from "../lib/core/aiFillCore.js";
import { checkEntryRulesCore } from "../lib/core/checkEntryRulesCore.js";
import { normalizeNameKey } from "../lib/core/parseContestants.js";
import { IMAGE_SEARCH, buildImageQuery, parseBraveImages } from "../lib/core/imageSearchCore.js";
import { SONNET_MODEL, SONNET_THINKING } from "../lib/core/models.js";

const TITLE = "TEST2-2026년 세계적인 여성 뷰티크리에이터의 이상형 월드컵!";
const BRIEF = {
  entry: "여성 뷰티 크리에이터 (활동명)",
  extra: "",
  rules: "2026년에 활동한 여성만. 한 사람은 한 번만 넣는다(본명과 활동명을 따로 넣지 않는다). 실제로 확인되는 인물만.",
};
const KNOWN_MALE = [
  "James Charles", "제임스 찰스", "Jeffree Star", "제프리 스타", "레오제이", "Leo J", "LeoJ", "Manny MUA", "Manny Gutierrez",
  "Patrick Starrr", "Bretman Rock", "Wayne Goss", "Gabriel Zamora", "Mario Dedivanovic", "Patrick Ta",
].map((n) => normalizeNameKey(n));
const HANGUL = /[가-힣]/;

const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error("ANTHROPIC_API_KEY 가 없습니다.");
  process.exit(2);
}
const anthropic = new Anthropic({ apiKey: key });
const usage = [];
const createMessage = async (prompt) => {
  const resp = await anthropic.messages.create({
    model: SONNET_MODEL,
    max_tokens: 8192,
    thinking: SONNET_THINKING,
    messages: [{ role: "user", content: prompt }],
  });
  usage.push({ input: resp.usage?.input_tokens, output: resp.usage?.output_tokens, stop: resp.stop_reason });
  const block = resp.content[0];
  return block && block.type === "text" ? block.text : "";
};

const started = Date.now();
const filled = await aiFillCore(
  { uid: "golden", title: TITLE, category: "CREATOR", description: "", keywords: [], existing: [], entryUnit: "individual", aiBrief: BRIEF },
  { createMessage, logInfo: (m) => console.error(m), logError: (m, e) => console.error(m, e?.message ?? e) },
);
const { flags } = await checkEntryRulesCore(
  {
    uid: "golden",
    title: TITLE,
    category: "CREATOR",
    entryUnit: "individual",
    aiBrief: BRIEF,
    entries: filled.map((c, slot) => ({ slot, name: c.name, affiliation: c.affiliation })),
    lang: "ko",
  },
  { createMessage, logError: (m, e) => console.error(m, e?.message ?? e) },
);
const flagged = new Map(flags.map((f) => [f.slot, f.reason]));

// 이미지 찾기(선택) — Brave 키가 있으면 칸마다 실서비스와 같은 검색어(buildImageQuery)로 Brave 이미지 검색 1회.
// "못 찾은 칸" = 세로 400px 이상 후보가 하나도 없는 칸(내려받기 실패까지는 재지 않는다 — 실서비스보다 조금 너그럽다).
let notFound = null;
if (process.env.BRAVE_SEARCH_API_KEY) {
  notFound = [];
  for (const [slot, c] of filled.entries()) {
    const u = new URL("https://api.search.brave.com/res/v1/images/search");
    u.searchParams.set("q", buildImageQuery(c.name, c.affiliation, []));
    u.searchParams.set("count", String(IMAGE_SEARCH.COUNT));
    u.searchParams.set("safesearch", IMAGE_SEARCH.SAFESEARCH);
    const res = await fetch(u, { headers: { Accept: "application/json", "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY } });
    const cands = res.ok ? parseBraveImages(await res.json(), c.name) : [];
    if (!cands.some((x) => x.height === undefined || x.height >= 400)) notFound.push(slot + 1);
    await new Promise((r) => setTimeout(r, 1100)); // 초당 한도
  }
}
const ms = Date.now() - started;

const rows = filled.map((c, slot) => {
  const k = normalizeNameKey(c.name);
  return {
    n: slot + 1,
    name: c.name,
    nationality: c.nationality,
    hangulForeign: HANGUL.test(c.name) && c.nationality !== "KR",
    knownMale: KNOWN_MALE.includes(k),
    flagged: flagged.has(slot),
    reason: flagged.get(slot) ?? "",
  };
});
const keyCount = new Map();
for (const r of rows) keyCount.set(normalizeNameKey(r.name), (keyCount.get(normalizeNameKey(r.name)) ?? 0) + 1);
const sameNamePairs = [...keyCount.values()].filter((v) => v > 1).length;

for (const r of rows) {
  console.log(
    `${String(r.n).padStart(2)} ${r.name} (${r.nationality || "-"})${r.hangulForeign ? "  ← 한글로 옮긴 외국 이름" : ""}${r.knownMale ? "  ← 남성으로 알려짐" : ""}${r.flagged ? `  [표시: ${r.reason}]` : ""}`,
  );
}
const hangulForeign = rows.filter((r) => r.hangulForeign).length;
const males = rows.filter((r) => r.knownMale);
const malesMissed = males.filter((r) => !r.flagged).length;
const pass =
  hangulForeign === 0 && malesMissed === 0 && sameNamePairs === 0 && (notFound === null || notFound.length <= 3);
console.log(
  `\n한글로 옮긴 외국 이름 ${hangulForeign} · 남성으로 알려진 ${males.length}명 중 표시 안 됨 ${malesMissed} · 같은 이름 두 번 ${sameNamePairs}쌍 · ` +
    `표시된 칸 ${flags.length} · 이미지 못 찾은 칸 ${notFound === null ? "안 잼" : `${notFound.length} (${notFound.join(", ")})`} · ${ms}ms · 토큰 ${JSON.stringify(usage)}`,
);
console.log(pass ? "합격선 통과" : "합격선 미달");
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ model: SONNET_MODEL, ms, usage, hangulForeign, malesMissed, sameNamePairs, flags, notFound, pass, rows }, null, 2));
process.exit(pass ? 0 : 1);
