#!/usr/bin/env node
/**
 * golden-ai-fill — AI-1 §5 A 골든 테스트 + A-2 측정 (실제 Claude API 호출).
 *
 * 2차(2026-08-16). 한 번 실행으로 3조건 × 3회 = **9회** 호출하고 표로 비교한다.
 *
 *   (d) Sonnet 4.6 + **옛 프롬프트 스냅샷**  ← H4 대조군 (허구가 업그레이드 탓인가?)
 *   (a) Sonnet 5   + 수정된 프롬프트         ← 합격선(§6 Auto-STOP) 판정 대상
 *   (c) Haiku 4.5  + 수정된 프롬프트         ← 비교군
 *
 * (a)만 합격/불합격을 가른다. (d)(c)는 **데이터**일 뿐이라 실패해도 표에 그대로 찍고
 * 종료 코드에 반영하지 않는다. 모델 전환은 대표 결정 사항이고 이 스크립트는 프로덕션
 * 경로를 바꾸지 않는다.
 *
 * (a)(c)는 프로덕션 프롬프트(buildPrompt)와 프로덕션 파서(parseAiContestants)를
 * 컴파일 산출물에서 그대로 가져다 쓴다 — 통과 = 콜러블 통과.
 * (d)만 이 파일 안에 얼려 둔 옛 프롬프트 문자열을 쓴다(1차와 동일 조건 재현용).
 *
 * 1차에서 측정한 (b) CSV 압축 포맷은 대표 기각으로 제거했다 — 3회 중 0회 통과였고
 * imageSearchKeyword가 빠지는 손실도 있었다. 기록은 최종 보고 D블록에 남는다.
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
const PREV_SONNET_MODEL = "claude-sonnet-4-6"; // AI-1 직전 프로덕션 모델 (H4 대조군)
const PREV_SONNET_PRICE = { in: 3, out: 15 };
const PRICE = {
  [SONNET_MODEL]: { in: 2, out: 10 },
  [HAIKU_MODEL]: { in: 1, out: 5 },
  [PREV_SONNET_MODEL]: PREV_SONNET_PRICE,
};

/** 환율은 문서 실측 대상이 아니다 — 가정치이고 env로 덮어쓸 수 있다. */
const USD_KRW = Number(process.env.USD_KRW) > 0 ? Number(process.env.USD_KRW) : 1417;

// AI-1 2차: 제목에서 연도 제거 (대표 결정 ④). "글로벌"·"전 세계에서 활동 중인"은
// 일부러 남겼다 — 실제 운영자가 칠 법한 문구이고, 이걸 두고도 실존 인물이 나와야
// 프롬프트 수정이 진짜 효과를 낸 것이다.
const FIXTURE = {
  title: "글로벌 K-POP 보컬 킹",
  category: "KPOP",
  description: "전 세계에서 활동 중인 K-POP 보컬리스트",
  keywords: [],
  existing: [],
  count: TOTAL_CONTESTANTS,
};

/**
 * 1차 골든에서 실제로 나갔던 프롬프트 **전문 스냅샷** (수정 전 buildPrompt + 당시 픽스처).
 *
 * H4 대조군 전용이다. buildPrompt를 고친 지금 조건 (d)가 새 프롬프트를 쓰면
 * "4.6이 옛 프롬프트로 실존 인물을 냈는가"라는 질문에 답할 수 없다. 그래서 문자열로
 * 얼려 둔다 — 1차 (a)와 **모델만 다르고 나머지는 완전히 동일한** 비교가 된다.
 * 절대 수정하지 말 것.
 */
const LEGACY_PROMPT = [
  "다음 Tournament 제목과 카테고리에 맞는 Contestant 48명을 추천해줘.",
  '제목: "2026 글로벌 K-POP 보컬 킹"',
  "카테고리: KPOP",
  "설명(참가 대상): 전 세계에서 활동 중인 K-POP 보컬리스트",
  "",
  "각 Contestant를 JSON 배열로 반환:",
  '[{ "name": string, "nationality": string, "position": string, "imageSearchKeyword": string }]',
  "",
  "규칙:",
  "- 정확히 48명",
  "- 퍼포먼스 기반 공개 데이터만 사용",
  "- 미성년자 금지",
  "- 카테고리에 맞는 활동 영역 (position 필드)",
  "- 한국적 요소에 치우치지 말 것 (글로벌 MZ)",
].join("\n");

// ── 조건 정의 ────────────────────────────────────────────────────────
// (e) N=12는 코어의 N 일반성 확인용이다. 프로덕션 콜러블은 bracketSize를 받지
// 않는다 — 풀은 항상 48이고 브래킷 크기는 Voter 런타임 선택이다(대진 흐름 #10,
// 2026-08-16 대표 재확인). ADR-EV-6의 N은 "검수기 슬롯 수"로 별개 개념.
const CONDITIONS = [
  {
    // H4 대조군 — 옛 프롬프트 그대로 4.6에 던진다. 1차 (a)(Sonnet5+옛 프롬프트)와
    // 짝을 이뤄 "허구가 업그레이드 탓인가, 원래 있던 결함인가"를 가른다.
    // thinking은 **보내지 않는다** — AI-1 이전 프로덕션이 그랬던 그대로의 재현.
    key: "d",
    label: "(d) Sonnet4.6 · 옛프롬프트",
    model: PREV_SONNET_MODEL,
    thinking: null,
    gating: false,
    prompt: () => LEGACY_PROMPT,
    parse: (text) => parseAiContestants(text, TOTAL_CONTESTANTS),
  },
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
    key: "c",
    label: "(c) Haiku4.5 · JSON",
    model: HAIKU_MODEL,
    thinking: null, // Haiku 4.5는 adaptive thinking 미지원 — 생략이 곧 비활성
    gating: false,
    prompt: () => buildPrompt(FIXTURE),
    parse: (text) => parseAiContestants(text, TOTAL_CONTESTANTS),
  },
  {
    // N 파라미터화 확인 — buildPrompt·parseAiContestants가 48 말고도 도는지.
    // 값싼 Haiku로 1회만. 프로덕션 콜러블은 아직 N을 받지 않는다(대표 확인 대기).
    key: "e",
    label: "(e) Haiku4.5 · N=12",
    model: HAIKU_MODEL,
    thinking: null,
    gating: false,
    runs: 1,
    count: 12,
    prompt: () => buildPrompt({ ...FIXTURE, count: 12 }),
    parse: (text) => parseAiContestants(text, 12),
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
    rawCount: null, // 모델이 실제로 준 항목 수 (중복 제거·절단 전) — 과다 요청이 먹었는지 확인용
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

    // 모델이 실제로 준 개수 — 파서가 절단하기 전 값. 과다 요청이 먹혔는지 본다.
    try {
      const arr = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? text);
      if (Array.isArray(arr)) result.rawCount = arr.length;
    } catch {
      /* 원본 개수는 참고값이라 실패해도 무시 */
    }

    const want = cond.count ?? TOTAL_CONTESTANTS;
    const contestants = cond.parse(text);
    result.names = contestants.map((c) => String(c.name ?? "").trim());
    const raw = result.rawCount === null ? "?" : result.rawCount;

    if (contestants.length !== want) {
      // 파서는 N-2까지 통과시키지만, 골든 합격선은 킥 DoD대로 정확히 N이다.
      result.verdict = "FAIL";
      result.detail = `${contestants.length}명 (기대 ${want}, 원본 ${raw}개)`;
    } else {
      const dupes = result.names.filter((n, i) => result.names.indexOf(n) !== i);
      if (dupes.length > 0) {
        result.verdict = "FAIL";
        result.detail = `중복 ${dupes.length}건: ${[...new Set(dupes)].join(", ")}`;
      } else {
        result.detail = `${want}명 · 중복 0 · 원본 ${raw}개`;
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
  const totalCalls = CONDITIONS.reduce((a, c) => a + (c.runs ?? RUNS), 0);
  console.log(`조건 ${CONDITIONS.length}개 · 총 ${totalCalls}회 호출 · max_tokens ${MAX_TOKENS}`);
  console.log(`환율 가정 USD_KRW=${USD_KRW} (env로 조정 가능)`);
  console.log(`합격 판정 대상: (a)만 — (d)(c)는 측정 데이터\n`);

  const perCondition = [];

  for (const cond of CONDITIONS) {
    console.log(`── ${cond.label} · ${cond.model} ──`);
    const runs = [];
    const condRuns = cond.runs ?? RUNS;
    for (let i = 1; i <= condRuns; i++) {
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
    ["조건", "모델", "N", "통과", "입력토큰", "출력토큰", "건당($)", "건당(원)", "소요(s)"],
    summary.map((s) => [
      s.cond.label,
      s.cond.model,
      String(s.cond.count ?? TOTAL_CONTESTANTS),
      `${s.passes}/${s.runs.length}`,
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
    "\n※ 눈검사 포인트 — 위 이름 10개가 **실존 아티스트**인지 조건별로 확인할 것.\n" +
      "   (d)가 실존이면 허구는 Sonnet 5 업그레이드가 만든 회귀,\n" +
      "   (d)도 허구면 옛 프롬프트에 원래 있던 결함을 업그레이드가 드러낸 것이다.",
  );
  console.log("※ 환율은 가정치다. 단가만 docs.claude.com 실측(2026-08-16).");

  // ── 종료 코드: (a)만 판정 ──
  const gating = summary.filter((s) => s.cond.gating);
  const gatingFails = gating.reduce((a, s) => a + (s.runs.length - s.passes), 0);
  if (gatingFails > 0) {
    console.error(
      `\n골든 테스트 실패 — (a) ${gating[0].runs.length - gating[0].passes}/${gating[0].runs.length}회 실패. AI-1 §6 Auto-STOP 조건.\n` +
        `대표 결정 필요 (thinking 활성 / max_tokens 상향 / 프롬프트 미세조정 중 택1).`,
    );
    process.exit(1);
  }
  console.log(`\n골든 테스트 통과 — (a) ${gating[0].runs.length}회 연속 파싱 성공 · ${TOTAL_CONTESTANTS}명 · 중복 0.`);
}

// 직접 실행할 때만 돈다 — 위 임시 파서를 import해서 따로 검증할 수 있게.
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
