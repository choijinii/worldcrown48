#!/usr/bin/env node
/**
 * golden-extract-crews — LAB-FIX-4 §7 합격선 실측 (실제 Claude API 1회 호출).
 *
 * 대회 ④ 48줄(실제 유튜브 제목 · 채널 = fixtures/lab-fix4-crews.json)을 지시서 §7 설정의 "AI에게 알려 줄 내용"과
 * 함께 **프로덕션 코어(extractContestantsCore) · 프로덕션 모델 설정(SONNET + thinking 끔 · 4096)** 그대로 1번 부른다.
 * 통과 = 콜러블 통과(콜러블은 같은 코어 위의 배선뿐 — 관리자 확인 · 한도).
 *
 * 합격선(지시서 §7): 이름 48개 중 44개 이상 맞음(대소문자 · 띄어쓰기 차이는 맞음) · 원곡 가수가 엔트리 이름으로
 * 들어간 칸 0개 · 틀린 국가 0개(비운 것은 틀린 것이 아님).
 * "원곡 가수 이름"은 제목에서 `Dance Cover by`/`cover by` 앞에 나오는 첫 이름(대문자 낱말)과 같으면 센다 — 자동 판정은
 * 보조이고, 표의 칸마다 사람이 다시 본다.
 *
 * 실행:
 *   cd functions && npm run build
 *   ANTHROPIC_API_KEY=... node scripts/golden-extract-crews.mjs [결과.json]
 * 키는 출력하지 않는다. 프롬프트 전문도 남기지 않는다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { extractContestantsCore } from "../lib/core/extractContestantsCore.js";
import { SONNET_MODEL, SONNET_THINKING } from "../lib/core/models.js";

const fixture = JSON.parse(readFileSync(join(import.meta.dirname, "..", "src", "__tests__", "fixtures", "lab-fix4-crews.json"), "utf8"));
const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error("ANTHROPIC_API_KEY 가 없습니다.");
  process.exit(2);
}
const anthropic = new Anthropic({ apiKey: key });
let usage = null;
const started = Date.now();
const out = await extractContestantsCore(
  {
    uid: "golden",
    items: fixture.items.map(({ videoId, title, channelTitle }) => ({ videoId, title, channelTitle })),
    entryUnit: fixture.brief.entryUnit,
    aiBrief: { entry: fixture.brief.entry, extra: fixture.brief.extra, rules: fixture.brief.rules },
    tournamentTitle: fixture.tournamentTitle,
    tournamentDescription: "",
  },
  {
    createMessage: async (prompt) => {
      const resp = await anthropic.messages.create({
        model: SONNET_MODEL,
        max_tokens: 4096,
        thinking: SONNET_THINKING,
        messages: [{ role: "user", content: prompt }],
      });
      usage = { input: resp.usage?.input_tokens, output: resp.usage?.output_tokens, stop: resp.stop_reason };
      const block = resp.content[0];
      return block && block.type === "text" ? block.text : "";
    },
    logError: (m, e) => console.error(m, e?.message ?? e),
  },
);
const ms = Date.now() - started;

const norm = (s) => (s ?? "").toLowerCase().replace(/[\s._\-'’()]/g, "");
/** 제목에서 커버 대상(원곡 가수) 후보 — "[...] ARTIST (한글) - 'SONG' ... cover by" 의 ARTIST. */
function originalArtist(title) {
  const t = title.replace(/^\s*(\[[^\]]*\]\s*)+/, "");
  const m = t.match(/^([^\-–|'"‘“(]+?)\s*(\(|-|–|'|"|‘|“)/);
  return m ? m[1].trim() : "";
}

const rows = fixture.items.map((it, i) => {
  const got = out[i];
  const nameOk = norm(got.name) !== "" && norm(got.name) === norm(it.expectedName);
  const orig = originalArtist(it.title);
  const isOriginal = got.name !== "" && orig !== "" && norm(got.name) === norm(orig) && norm(orig) !== norm(it.expectedName);
  const countryWrong = got.nationality !== "" && got.nationality !== it.expectedCountry;
  return { n: i + 1, videoId: it.videoId, expected: it.expectedName, got: got.name, nameOk, expectedCountry: it.expectedCountry, gotCountry: got.nationality, countryWrong, original: orig, isOriginal, confident: got.confident };
});
const named = rows.filter((r) => r.nameOk).length;
const originals = rows.filter((r) => r.isOriginal).length;
const wrongCountries = rows.filter((r) => r.countryWrong).length;
const blanks = rows.filter((r) => r.got === "").length;

for (const r of rows) {
  console.log(
    `${String(r.n).padStart(2)} ${r.nameOk ? "○" : "×"} ${r.countryWrong ? "국가×" : "     "} 기대=${r.expected}/${r.expectedCountry}  받음=${r.got || "(빈칸)"}/${r.gotCountry || "-"}${r.isOriginal ? "  ← 원곡 가수" : ""}`,
  );
}
const pass = named >= 44 && originals === 0 && wrongCountries === 0;
console.log(`\n이름 맞음 ${named}/48 · 빈칸 ${blanks} · 원곡 가수 ${originals} · 틀린 국가 ${wrongCountries} · ${ms}ms · 토큰 ${JSON.stringify(usage)}`);
console.log(pass ? "합격선 통과" : "합격선 미달");
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ model: SONNET_MODEL, ms, usage, named, blanks, originals, wrongCountries, pass, rows }, null, 2));
process.exit(pass ? 0 : 1);
