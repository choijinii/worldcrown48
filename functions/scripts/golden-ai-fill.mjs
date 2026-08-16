#!/usr/bin/env node
/**
 * golden-ai-fill — AI-1 §5 A 골든 테스트 + A-2 측정 (실제 Claude API 호출).
 *
 * 한 번 실행으로 3조건 × 3회 = **9회** 호출하고 표로 비교한다.
 *
 *   (a) sonnet5-json  — Sonnet 5 + 현행 JSON 포맷   ← 합격선(§6 Auto-STOP) 판정 대상
 *   (b) sonnet5-csv   — Sonnet 5 + "이름|국적|포지션" CSV 압축 포맷 (측정용 임시 파서)
 *   (c) haiku-json    — Haiku 4.5 + 현행 JSON 포맷
 *
 * (a)만 합격/불합격을 가른다 — 모델 업그레이드가 기존 프롬프트·파서를 수정 없이
 * 통과하는지(RULE R1)를 보는 골든 테스트다. (b)(c)는 **데이터**일 뿐이라 실패해도
 * 표에 그대로 찍고 종료 코드에 반영하지 않는다. 포맷·모델 전환은 대표 결정 사항이고
 * 이 스크립트는 프로덕션 경로를 바꾸지 않는다.
 *
 * (a)(c)는 프로덕션 프롬프트(buildPrompt)와 프로덕션 파서(parseAiContestants)를
 * 컴파일 산출물에서 그대로 가져다 쓴다 — 통과 = 콜러블 통과.
 * (b)는 이 파일 안의 임시 프롬프트·임시 파서를 쓴다(프로덕션 무영향).
 *
 * 실행:
 *   cd functions && npm run build
 *   ANTHROPIC_API_KEY='sk-ant-...' node scripts/golden-ai-fill.mjs
 *
 * 옵션 환경변수:
 *   USD_KRW=1417   원화 환산 환율 (기본 1417 — 2026-08-16 실측 가정치)
 *
 * 키는 절대 출력하지 않는다. 프롬프트 전문도 로그에 남기지 않는다 (RULE R2).
 */
import { basename } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt } from "../lib/core/aiFillCore.js";
import { parseAiContestants, TOTAL_CONTESTANTS } from "../lib/core/parseContestants.js";
import { SONNET_MODEL, HAIKU_MODEL, SONNET_THINKING } from "../lib/core/models.js";

const RUNS = 3;
const MAX_TOKENS = 8192; // aiFillContestants.ts의 AI_MAX_TOKENS와 같은 값
const NAME_SAMPLE = 10; // 실존 여부 눈검사용 — 각 조건 1회차에서 뽑는 이름 수

/**
 * 단가 — docs.claude.com/en/about-claude/models/overview 실측 (2026-08-16).
 *   claude-sonnet-5 : $2 / input MTok, $10 / output MTok
 *   claude-haiku-4-5: $1 / input MTok, $5  / output MTok
 *   claude-sonnet-4-6(직전 프로덕션): $3 / $15 — 이전/이후 비교용
 */
const PRICE = {
  [SONNET_MODEL]: { in: 2, out: 10 },
  [HAIKU_MODEL]: { in: 1, out: 5 },
};
const PREV_SONNET_PRICE = { in: 3, out: 15 };

/** 환율은 문서 실측 대상이 아니다 — 가정치이고 env로 덮어쓸 수 있다. */
const USD_KRW = Number(process.env.USD_KRW) > 0 ? Number(process.env.USD_KRW) : 1417;

const FIXTURE = {
  title: "2026 글로벌 K-POP 보컬 킹",
  category: "KPOP",
  description: "전 세계에서 활동 중인 K-POP 보컬리스트",
  keywords: [],
  existing: [],
  count: TOTAL_CONTESTANTS,
};

// ── (b) 전용 임시 자산 — 프로덕션 아님 ────────────────────────────────
/**
 * CSV 압축 포맷 프롬프트. 현행 JSON과 **규칙은 같게** 두고 출력 형식만 바꾼다
 * (토큰 차이가 형식에서만 나오게 하려고).
 *
 * ⚠ 현행 JSON의 imageSearchKeyword 필드가 이 포맷에는 없다 — 이미지 소싱 힌트가
 *   사라진다는 뜻이라 단순 토큰 절감으로만 비교하면 안 된다. 표 아래 각주로 뜬다.
 */
function buildCsvPrompt(opts) {
  const { title, category, description, count } = opts;
  const lines = [
    `다음 Tournament 제목과 카테고리에 맞는 Contestant ${count}명을 추천해줘.`,
    `제목: "${title}"`,
    `카테고리: ${category}`,
  ];
  if (description && description.trim()) {
    lines.push(`설명(참가 대상): ${description.trim()}`);
  }
  lines.push(
    "",
    "출력 형식: 한 줄에 한 명, 파이프(|)로 구분. 헤더·번호·설명·코드펜스 없이 줄만.",
    "이름|국적|포지션",
    "",
    "규칙:",
    `- 정확히 ${count}명`,
    "- 퍼포먼스 기반 공개 데이터만 사용",
    "- 미성년자 금지",
    "- 카테고리에 맞는 활동 영역 (포지션)",
    "- 한국적 요소에 치우치지 말 것 (글로벌 MZ)",
  );
  return lines.join("\n");
}

/** CSV 임시 파서. 프로덕션 parseContestants와 동일한 관용도(코드펜스 제거)만 흉내낸다. */
export function parseCsvContestants(text, count) {
  const cleaned = String(text ?? "")
    .replace(/```[a-zA-Z]*\n?/g, "")
    .replace(/```/g, "");
  const rows = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.includes("|"))
    .map((l) => l.split("|").map((c) => c.trim()))
    .filter((cells) => cells.length === 3 && cells[0].length > 0)
    // 모델이 헤더를 붙였을 때 한 줄 버림
    .filter((cells) => !(cells[0] === "이름" && cells[1] === "국적"));

  if (rows.length < count) {
    throw new Error(`CSV 행 부족: ${rows.length}/${count}`);
  }
  return rows.slice(0, count).map(([name, nationality, position]) => ({
    name,
    nationality,
    position,
  }));
}

// ── 조건 정의 ────────────────────────────────────────────────────────
const CONDITIONS = [
  {
    key: "a",
    label: "(a) Sonnet5 · JSON",
    model: SONNET_MODEL,
    thinking: SONNET_THINKING,
    gating: true, // 이 조건만 종료 코드를 가른다
    prompt: () => buildPrompt(FIXTURE),
    parse: (text) => parseAiContestants(text, TOTAL_CONTESTANTS),
  },
  {
    key: "b",
    label: "(b) Sonnet5 · CSV",
    model: SONNET_MODEL,
    thinking: SONNET_THINKING,
    gating: false,
    prompt: () => buildCsvPrompt(FIXTURE),
    parse: (text) => parseCsvContestants(text, TOTAL_CONTESTANTS),
  },
  {
    key: "c",
    label: "(c) Haiku4.5 · JSON",
    model: HAIKU_MODEL,
    thinking: null, // Haiku 4.5는 adaptive thinking 미지원 — 생략이 곧 비활성
    gating: false,
    prompt: () => buildPrompt(FIXTURE),
    parse: (text) => parseAiContestants(text, TOTAL_CONTESTANTS),
  },
];

// ── 유틸 ─────────────────────────────────────────────────────────────
const usd = (n) => `$${n.toFixed(5)}`;
const krw = (n) => `${Math.round(n * USD_KRW).toLocaleString("ko-KR")}원`;

function costOf(usage, price) {
  return (
    (usage.input_tokens / 1e6) * price.in + (usage.output_tokens / 1e6) * price.out
  );
}

/** 표 셀 폭 맞추기 — 한글은 2칸으로 센다. */
function width(s) {
  let w = 0;
  for (const ch of String(s)) w += /[ᄀ-ᇿ　-〿가-힯＀-｠]/.test(ch) ? 2 : 1;
  return w;
}
const pad = (s, n) => String(s) + " ".repeat(Math.max(0, n - width(s)));
const padL = (s, n) => " ".repeat(Math.max(0, n - width(s))) + String(s);

function printTable(headers, rows) {
  const widths = headers.map((h, i) =>
    Math.max(width(h), ...rows.map((r) => width(r[i]))),
  );
  const line = (cells, padder) =>
    "│ " + cells.map((c, i) => padder(c, widths[i])).join(" │ ") + " │";
  const sep = (l, m, r) =>
    l + widths.map((w) => "─".repeat(w + 2)).join(m) + r;

  console.log(sep("┌", "┬", "┐"));
  console.log(line(headers, pad));
  console.log(sep("├", "┼", "┤"));
  for (const r of rows) {
    console.log("│ " + r.map((c, i) => (i === 0 ? pad(c, widths[i]) : padL(c, widths[i]))).join(" │ ") + " │");
  }
  console.log(sep("└", "┴", "┘"));
}

// ── 실행 ─────────────────────────────────────────────────────────────
async function runOnce(anthropic, cond) {
  const startedAt = Date.now();
  const result = {
    verdict: "PASS",
    detail: "",
    usage: { input_tokens: 0, output_tokens: 0 },
    stopReason: "",
    names: [],
  };

  try {
    const req = {
      model: cond.model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: cond.prompt() }],
    };
    if (cond.thinking) req.thinking = cond.thinking;

    const resp = await anthropic.messages.create(req);
    result.usage = resp.usage ?? result.usage;
    result.stopReason = resp.stop_reason ?? "";
    const block = resp.content[0];
    const text = block && block.type === "text" ? block.text : "";

    const contestants = cond.parse(text);
    result.names = contestants.map((c) => String(c.name ?? "").trim());

    if (contestants.length !== TOTAL_CONTESTANTS) {
      result.verdict = "FAIL";
      result.detail = `${contestants.length}명 (기대 ${TOTAL_CONTESTANTS})`;
    } else {
      const dupes = result.names.filter((n, i) => result.names.indexOf(n) !== i);
      if (dupes.length > 0) {
        result.verdict = "FAIL";
        result.detail = `중복 ${dupes.length}건: ${[...new Set(dupes)].join(", ")}`;
      } else {
        result.detail = "48명 · 중복 0";
      }
    }
    if (result.stopReason === "max_tokens") {
      result.verdict = "FAIL";
      result.detail += " · stop_reason=max_tokens (출력 잘림)";
    }
  } catch (e) {
    result.verdict = "FAIL";
    result.detail = `${e?.name ?? "Error"}: ${e?.message ?? String(e)}`;
  }

  result.elapsedMs = Date.now() - startedAt;
  return result;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "ANTHROPIC_API_KEY 환경변수가 필요합니다.\n" +
        "  예) ANTHROPIC_API_KEY='sk-ant-...' node scripts/golden-ai-fill.mjs",
    );
    process.exit(2);
  }

  const anthropic = new Anthropic({ apiKey });

  console.log("AI-1 골든 테스트 + A-2 측정");
  console.log(`조건 3 × ${RUNS}회 = ${CONDITIONS.length * RUNS}회 호출 · max_tokens ${MAX_TOKENS}`);
  console.log(`환율 가정 USD_KRW=${USD_KRW} (env로 조정 가능)`);
  console.log(`합격 판정 대상: (a)만 — (b)(c)는 측정 데이터\n`);

  const perCondition = [];

  for (const cond of CONDITIONS) {
    console.log(`── ${cond.label} · ${cond.model} ──`);
    const runs = [];
    for (let i = 1; i <= RUNS; i++) {
      const r = await runOnce(anthropic, cond);
      runs.push(r);
      const price = PRICE[cond.model];
      console.log(
        `  #${i} ${r.verdict} — ${r.detail} · in=${r.usage.input_tokens} out=${r.usage.output_tokens} ` +
          `${(r.elapsedMs / 1000).toFixed(1)}s · ${usd(costOf(r.usage, price))} / ${krw(costOf(r.usage, price))}`,
      );
    }
    // 실존 여부 눈검사 — 1회차 이름 10개
    const firstNames = runs[0]?.names ?? [];
    if (firstNames.length > 0) {
      console.log(`  1회차 이름 ${NAME_SAMPLE}개: ${firstNames.slice(0, NAME_SAMPLE).join(", ")}`);
    } else {
      console.log(`  1회차 이름 샘플 없음 (파싱 실패)`);
    }
    console.log("");
    perCondition.push({ cond, runs });
  }

  // ── 요약 표 ──
  const avg = (arr, f) => arr.reduce((a, x) => a + f(x), 0) / arr.length;
  const summary = perCondition.map(({ cond, runs }) => {
    const price = PRICE[cond.model];
    const inTok = avg(runs, (r) => r.usage.input_tokens);
    const outTok = avg(runs, (r) => r.usage.output_tokens);
    const cost = avg(runs, (r) => costOf(r.usage, price));
    const secs = avg(runs, (r) => r.elapsedMs) / 1000;
    const passes = runs.filter((r) => r.verdict === "PASS").length;
    return { cond, inTok, outTok, cost, secs, passes, runs };
  });

  const baseline = summary.find((s) => s.cond.key === "a");
  /** 0으로 나누면 NaN이 표에 찍힌다 — 기준값이 없을 땐 대시로 둔다. */
  const delta = (now, base) =>
    base > 0 ? `${(((now - base) / base) * 100).toFixed(1)}%` : "—(기준값 없음)";

  printTable(
    ["조건", "모델", "통과", "입력토큰", "출력토큰", "건당($)", "건당(원)", "소요(s)"],
    summary.map((s) => [
      s.cond.label,
      s.cond.model,
      `${s.passes}/${RUNS}`,
      Math.round(s.inTok).toLocaleString(),
      Math.round(s.outTok).toLocaleString(),
      usd(s.cost),
      krw(s.cost),
      s.secs.toFixed(1),
    ]),
  );

  // ── 파생 지표 ──
  console.log("");
  if (baseline) {
    const prevCost = avg(baseline.runs, (r) => costOf(r.usage, PREV_SONNET_PRICE));
    console.log(
      `이전/이후 (조건 a 기준): sonnet-4-6 단가 환산 ${usd(prevCost)} / ${krw(prevCost)} ` +
        `→ sonnet-5 ${usd(baseline.cost)} / ${krw(baseline.cost)} ` +
        `(${delta(baseline.cost, prevCost)})`,
    );

    for (const s of summary) {
      if (s.cond.key === "a") continue;
      console.log(
        `${s.cond.label} vs (a): 출력 토큰 ${delta(s.outTok, baseline.outTok)} · ` +
          `건당 비용 ${delta(s.cost, baseline.cost)}`,
      );
    }
  }

  console.log(
    "\n※ (b) CSV 포맷에는 현행 JSON의 imageSearchKeyword가 없다 — 이미지 소싱 힌트가\n" +
      "   사라지므로 토큰 절감만으로 비교하면 안 된다 (전환은 대표 결정 사항).",
  );
  console.log("※ 환율은 가정치다. 단가만 docs.claude.com 실측(2026-08-16).");

  // ── 종료 코드: (a)만 판정 ──
  const gating = summary.filter((s) => s.cond.gating);
  const gatingFails = gating.reduce((a, s) => a + (RUNS - s.passes), 0);
  if (gatingFails > 0) {
    console.error(
      `\n골든 테스트 실패 — (a) ${RUNS - gating[0].passes}/${RUNS}회 실패. AI-1 §6 Auto-STOP 조건.\n` +
        `대표 결정 필요 (thinking 활성 / max_tokens 상향 / 프롬프트 미세조정 중 택1).`,
    );
    process.exit(1);
  }
  console.log("\n골든 테스트 통과 — (a) 3회 연속 파싱 성공 · 48명 · 중복 0.");
}

// 직접 실행할 때만 돈다 — 위 임시 파서를 import해서 따로 검증할 수 있게.
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
