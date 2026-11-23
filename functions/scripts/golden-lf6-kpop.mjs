#!/usr/bin/env node
/**
 * golden-lf6-kpop — LAB-FIX-6 §7 K-pop 개인 · 팀 묶음 + 3-6 대회 하나 기준 항목별 비용 (실제 Claude API).
 *
 *   개인: 잠긴 옛 개인 지시문(덧붙이는 정보 = 소속 (팀) = 기본값 → 빈 글) · 명단 채우기 1회
 *         합격 = 48개 · 이전과 같은 지시문(sha) · 소속 칸에 회사 이름 0
 *   팀  : 잠긴 옛 팀 지시문(덧붙이는 정보 = 비워 두기 = 기본값 → 빈 글) · 명단 채우기 1회
 *         합격 = 48개 · 이전과 같은 지시문(sha) · 소속 칸 빈칸 48/48(서버 그물)
 *   비용: 개인 대회 하나에 대해 키워드 · [AI에게 제안 받기] · 제목 3언어 · 이름 3언어를 1번씩(Haiku) — 토큰 × 단가.
 *
 * 프로덕션 코어 · 프로덕션 모델 설정(models.ts · 각 콜러블의 max_tokens)을 그대로 쓴다. 키는 출력하지 않는다.
 *   cd functions && npm run build && ANTHROPIC_API_KEY=... node scripts/golden-lf6-kpop.mjs 결과.json
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { aiFillCore, buildPrompt } from "../lib/core/aiFillCore.js";
import { aiSuggestKeywordsCore } from "../lib/core/aiSuggestKeywordsCore.js";
import { aiSuggestBriefCore } from "../lib/core/aiSuggestBriefCore.js";
import { translateTournamentMetaCore } from "../lib/core/translateTournamentMetaCore.js";
import { translateContestantNamesCore } from "../lib/core/translateContestantNamesCore.js";
import { HAIKU_MODEL, SONNET_MODEL, SONNET_THINKING } from "../lib/core/models.js";

const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error("ANTHROPIC_API_KEY 가 없습니다.");
  process.exit(2);
}
const anthropic = new Anthropic({ apiKey: key });
/** 단가(USD / MTok) — models.ts 주석 · golden-ai-fill.mjs 와 같은 값. */
const PRICE = { [SONNET_MODEL]: { in: 2, out: 10 }, [HAIKU_MODEL]: { in: 1, out: 5 } };
const usd = (m, u) => (u.input * PRICE[m].in + u.output * PRICE[m].out) / 1e6;
const sha = (s) => createHash("sha256").update(s).digest("hex");

function caller(model, maxTokens, sink, label) {
  return async (prompt) => {
    const t0 = Date.now();
    const resp = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      ...(model === SONNET_MODEL ? { thinking: SONNET_THINKING } : {}),
      messages: [{ role: "user", content: prompt }],
    });
    const u = { input: resp.usage?.input_tokens ?? 0, output: resp.usage?.output_tokens ?? 0 };
    sink.push({ label, model, ...u, usd: usd(model, u), ms: Date.now() - t0, promptSha: sha(prompt) });
    const block = resp.content[0];
    return block && block.type === "text" ? block.text : "";
  };
}

/** 회사(소속사 · 레이블) 이름으로 보이는 것 — 사람이 표에서 다시 본다. */
const COMPANY = /(entertainment|\bent\b|music|label|records|company|agency|엔터|뮤직|레이블|레코드|\bHYBE\b|\bSM\b|\bYG\b|\bJYP\b|\bCUBE\b|\bSTARSHIP\b|\bPLEDIS\b|\bADOR\b|\bBIGHIT\b|\bKQ\b|\bWOOLLIM\b|\bRBW\b|\bFNC\b|\bEDAM\b|\bANTENNA\b|\bAOMG\b|\bP NATION\b|\bTHEBLACKLABEL\b|\bBELIFT\b|\bSOURCE\b|\bWAKEONE\b)/i;

const calls = [];
const result = {};

// ── 개인 ──
const IND = { title: "글로벌 K-POP 보컬 킹", category: "KPOP", description: "전 세계에서 활동 중인 K-POP 보컬리스트" };
const indCalls = [];
const ind = await aiFillCore(
  { uid: "golden", ...IND, entryUnit: "individual", aiBrief: { entry: "", extra: "", rules: "" } },
  { createMessage: caller(SONNET_MODEL, 8192, indCalls, "명단 채우기(개인)") },
);
const lockedInd = sha(buildPrompt({ ...IND, keywords: [], existing: [], count: 48 }));
result.individual = {
  count: ind.length,
  samePrompt: indCalls[0].promptSha === lockedInd,
  company: ind.filter((c) => COMPANY.test(c.affiliation ?? "")).map((c) => `${c.name} / ${c.affiliation}`),
  filledAffiliation: ind.filter((c) => (c.affiliation ?? "") !== "").length,
  rows: ind.map((c) => ({ name: c.name, affiliation: c.affiliation ?? "", nationality: c.nationality ?? "" })),
};
calls.push(...indCalls);

// ── 팀 ──
const GRP = { title: "K-POP 4세대 걸그룹 최강자", category: "KPOP", description: "", keywords: ["kpop", "girlgroup"] };
const grpCalls = [];
const grp = await aiFillCore(
  { uid: "golden", ...GRP, entryUnit: "group" },
  { createMessage: caller(SONNET_MODEL, 8192, grpCalls, "명단 채우기(팀)") },
);
const lockedGrp = sha(buildPrompt({ ...GRP, existing: [], count: 48, entryUnit: "group" }));
result.group = {
  count: grp.length,
  samePrompt: grpCalls[0].promptSha === lockedGrp,
  blankAffiliation: grp.filter((c) => (c.affiliation ?? "") === "").length,
  rows: grp.map((c) => ({ name: c.name, affiliation: c.affiliation ?? "", nationality: c.nationality ?? "" })),
};
calls.push(...grpCalls);

// ── 3-6 비용: 개인 대회 하나의 나머지 AI 일(1번씩) ──
await aiSuggestKeywordsCore({ uid: "golden", ...IND }, { createMessage: caller(HAIKU_MODEL, 512, calls, "키워드") });
const sug = await aiSuggestBriefCore({ uid: "golden", ...IND }, { createMessage: caller(HAIKU_MODEL, 512, calls, "AI에게 제안 받기") });
result.suggest = sug;
await translateTournamentMetaCore(
  { uid: "golden", title: IND.title, description: IND.description, sourceLang: "ko" },
  { createMessage: caller(HAIKU_MODEL, 1024, calls, "제목 · 설명 3언어") },
);
await translateContestantNamesCore(
  { entries: ind.map((c) => ({ name: c.name, affiliation: c.affiliation ?? "" })), category: "KPOP", entryUnit: "individual" },
  { createMessage: caller(HAIKU_MODEL, 4096, calls, "이름 3언어") },
);

result.calls = calls.map(({ promptSha, ...c }) => c);
result.totalUsd = calls.reduce((a, c) => a + c.usd, 0);
console.log(`개인: ${result.individual.count}개 · 지시문 같음 ${result.individual.samePrompt} · 소속 칸 회사 이름 ${result.individual.company.length} ${JSON.stringify(result.individual.company)} · 소속 적힘 ${result.individual.filledAffiliation}`);
console.log(`팀: ${result.group.count}개 · 지시문 같음 ${result.group.samePrompt} · 소속 칸 빈칸 ${result.group.blankAffiliation}/${result.group.count}`);
console.log(`제안: ${JSON.stringify(sug)}`);
for (const c of result.calls) console.log(`${c.label} · ${c.model} · 입력 ${c.input} · 출력 ${c.output} · $${c.usd.toFixed(4)} · ${c.ms}ms`);
console.log(`합계 $${result.totalUsd.toFixed(4)}`);
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(result, null, 2));
