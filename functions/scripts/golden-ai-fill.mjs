#!/usr/bin/env node
/**
 * golden-ai-fill — AI-1 §5 A 골든 테스트 (실제 Claude API 호출).
 *
 * 목적: 모델을 claude-sonnet-4-6 → claude-sonnet-5 로 올린 뒤에도 **기존 프롬프트
 * 그대로** 48명 JSON이 나오고 parseAiContestants가 수정 없이 통과하는지 확인한다
 * (RULE R1 — 출력 스키마 불변). 합격선: 3회 연속 파싱 성공 · 48명 · 이름 중복 0.
 *
 * 프로덕션 코드 경로를 그대로 쓴다 — 프롬프트(buildPrompt)·파서(parseAiContestants)·
 * 모델 상수(models)를 전부 컴파일 산출물에서 가져오므로, 이 스크립트가 통과했다는 것은
 * 콜러블이 통과한다는 뜻이다.
 *
 * 실행:
 *   cd functions && npm run build
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/golden-ai-fill.mjs
 *
 * 키는 인자로 넘기지 말 것(셸 히스토리에 남는다). 로그에 키·프롬프트 전문을 남기지
 * 않는다 (RULE R2) — 토큰 수와 판정만 출력한다.
 */
import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt } from "../lib/core/aiFillCore.js";
import { parseAiContestants, TOTAL_CONTESTANTS } from "../lib/core/parseContestants.js";
import { SONNET_MODEL, SONNET_THINKING } from "../lib/core/models.js";

const RUNS = 3;
const MAX_TOKENS = 8192; // aiFillContestants.ts의 AI_MAX_TOKENS와 같은 값

// 단가 — docs.claude.com/en/about-claude/models/overview 실측 (2026-08-16).
// claude-sonnet-5: $2 / input MTok, $10 / output MTok
const PRICE_IN_PER_MTOK = 2;
const PRICE_OUT_PER_MTOK = 10;
// 직전 모델(claude-sonnet-4-6): $3 / $15 — 이전/이후 비교용
const PREV_IN_PER_MTOK = 3;
const PREV_OUT_PER_MTOK = 15;

const FIXTURE = {
  title: "2026 글로벌 K-POP 보컬 킹",
  category: "KPOP",
  description: "전 세계에서 활동 중인 K-POP 보컬리스트",
  keywords: [],
  existing: [],
  count: TOTAL_CONTESTANTS,
};

const usd = (n) => `$${n.toFixed(5)}`;

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "ANTHROPIC_API_KEY 환경변수가 필요합니다.\n" +
        "  예) ANTHROPIC_API_KEY=... node scripts/golden-ai-fill.mjs",
    );
    process.exit(2);
  }

  const anthropic = new Anthropic({ apiKey });
  const prompt = buildPrompt(FIXTURE);
  console.log(`모델: ${SONNET_MODEL} · thinking: ${SONNET_THINKING.type} · max_tokens: ${MAX_TOKENS}`);
  console.log(`프롬프트 길이: ${prompt.length}자 (전문은 로그에 남기지 않음)\n`);

  const rows = [];
  let failures = 0;

  for (let i = 1; i <= RUNS; i++) {
    const startedAt = Date.now();
    let verdict = "PASS";
    let detail = "";
    let usage = { input_tokens: 0, output_tokens: 0 };
    let stopReason = "";

    try {
      const resp = await anthropic.messages.create({
        model: SONNET_MODEL,
        max_tokens: MAX_TOKENS,
        thinking: SONNET_THINKING,
        messages: [{ role: "user", content: prompt }],
      });
      usage = resp.usage ?? usage;
      stopReason = resp.stop_reason ?? "";
      const block = resp.content[0];
      const text = block && block.type === "text" ? block.text : "";

      // 프로덕션 파서 그대로 — 수정 없이 통과해야 한다 (RULE R1).
      const contestants = parseAiContestants(text, TOTAL_CONTESTANTS);

      if (contestants.length !== TOTAL_CONTESTANTS) {
        verdict = "FAIL";
        detail = `${contestants.length}명 (기대 ${TOTAL_CONTESTANTS})`;
      } else {
        const names = contestants.map((c) => c.name.trim());
        const dupes = names.filter((n, idx) => names.indexOf(n) !== idx);
        if (dupes.length > 0) {
          verdict = "FAIL";
          detail = `이름 중복 ${dupes.length}건: ${[...new Set(dupes)].join(", ")}`;
        } else {
          detail = `48명 · 중복 0`;
        }
      }
      if (stopReason === "max_tokens") {
        verdict = "FAIL";
        detail += " · stop_reason=max_tokens (출력 잘림 — max_tokens 상향 필요)";
      }
    } catch (e) {
      verdict = "FAIL";
      detail = `${e?.name ?? "Error"}: ${e?.message ?? String(e)}`;
    }

    const elapsedMs = Date.now() - startedAt;
    const costNow =
      (usage.input_tokens / 1e6) * PRICE_IN_PER_MTOK +
      (usage.output_tokens / 1e6) * PRICE_OUT_PER_MTOK;
    const costPrev =
      (usage.input_tokens / 1e6) * PREV_IN_PER_MTOK +
      (usage.output_tokens / 1e6) * PREV_OUT_PER_MTOK;

    if (verdict === "FAIL") failures++;
    rows.push({ i, verdict, detail, usage, stopReason, elapsedMs, costNow, costPrev });

    console.log(
      `#${i} ${verdict} — ${detail}\n` +
        `    in=${usage.input_tokens} out=${usage.output_tokens} stop=${stopReason} ` +
        `${(elapsedMs / 1000).toFixed(1)}s · 건당 ${usd(costNow)} (4-6이었다면 ${usd(costPrev)})`,
    );
  }

  const sum = (f) => rows.reduce((a, r) => a + f(r), 0);
  const n = rows.length;
  console.log(
    `\n── 합계 ──\n` +
      `통과 ${n - failures}/${n}\n` +
      `평균 입력 토큰 ${Math.round(sum((r) => r.usage.input_tokens) / n)} · ` +
      `평균 출력 토큰 ${Math.round(sum((r) => r.usage.output_tokens) / n)}\n` +
      `평균 소요 ${(sum((r) => r.elapsedMs) / n / 1000).toFixed(1)}s\n` +
      `건당 비용 이후(sonnet-5) ${usd(sum((r) => r.costNow) / n)} · ` +
      `이전(sonnet-4-6 단가 환산) ${usd(sum((r) => r.costPrev) / n)}`,
  );

  if (failures > 0) {
    console.error(
      `\n골든 테스트 실패 — AI-1 §6 Auto-STOP 조건. 대표 결정 필요\n` +
        `(thinking 활성 / max_tokens 상향 / 프롬프트 미세조정 중 택1).`,
    );
    process.exit(1);
  }
  console.log("\n골든 테스트 통과 — 3회 연속 파싱 성공 · 48명 · 중복 0.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
