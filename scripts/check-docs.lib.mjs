// 문서 검사 3가지의 순수 함수 (DOC-PR D-77 · 지시서 §11.2).
// 파일·git 을 읽는 일은 check-docs.mjs 가 하고, 여기는 글자만 본다 — 단위 시험이 쉽도록.

/** 바뀐 줄(diff 추가 줄)에 나오면 안 되는 낱말. */
export const FORBIDDEN = [
  { word: "FIFA", re: /FIFA/ },
  { word: "참가자", re: /참가자/ },
  { word: "투표", re: /투표/ },
  { word: "Vote", re: /\bVote\b/ },
  { word: "표(단위)", re: /\d\s*표/ },
  { word: "팀 경로", re: /팀 경로/ },
  { word: "월드컵", re: /월드컵/ },
];

/** 금지 낱말을 쓰되 '쓰지 말라'고 적는 자리 — 검사 전에 지운다. */
export const FORBIDDEN_EXCEPTIONS = [
  "이상형 월드컵", // 서비스 방식 설명
  "'팀 경로'라 부르지 않는다", // 원장 D-75 정의
  "팀 경로(코드 이름)", // 금지 표의 금지 칸
];

/** unified diff 에서 추가된 줄만 { file, text } 로. */
export function addedLines(diff) {
  const out = [];
  let file = null;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      file = line.replace(/^\+\+\+ (b\/)?/, "");
      continue;
    }
    if (line.startsWith("+") && file) out.push({ file, text: line.slice(1) });
  }
  return out;
}

export function findForbidden(lines) {
  const hits = [];
  for (const { file, text } of lines) {
    let t = text;
    for (const ex of FORBIDDEN_EXCEPTIONS) t = t.split(ex).join("");
    for (const f of FORBIDDEN) if (f.re.test(t)) hits.push({ file, word: f.word, text });
  }
  return hits;
}

const PATH_RE = /(?:^|[^A-Za-z0-9_./-])((?:marketing|docs|lib)\/[^\s`'")\]|*,，]+)/g;

/** 문서 속 `marketing/` · `docs/` · `lib/` 상대 경로. 끝의 문장부호는 뗀다. */
export function extractPaths(text) {
  const set = new Set();
  for (const m of text.matchAll(PATH_RE)) {
    let p = m[1].replace(/[.:;·]+$/, "");
    if (p.includes("…")) continue; // "lib/…" 같은 자리표시
    set.add(p);
  }
  return [...set];
}

/** 버전 기록 행(| v2.1 | … · | **v2.9** | …)은 옛 기록 — 그때의 경로를 그대로 둔다. 링크 검사 전에 뺀다. */
export function withoutChangelogRows(text) {
  return text
    .split("\n")
    .filter((l) => !/^\|\s*\**v\d/.test(l))
    .join("\n");
}

const MODULE_EXT = ["", ".ts", ".tsx", ".mjs", ".js", ".md"];

/** exists(path) → boolean 을 받아, 확장자 없는 모듈 경로까지 찾아본 뒤 없는 것만. */
export function missingPaths(paths, exists, allowlist = []) {
  return paths.filter((p) => !allowlist.includes(p) && !MODULE_EXT.some((e) => exists(p + e)));
}

/** 원장 D-77 정의 줄의 원칙 문장(굵은 따옴표 안). */
export function ledgerPrinciple(ledger) {
  const start = ledger.indexOf("## D-77 ");
  if (start < 0) return null;
  const next = ledger.indexOf("\n## D-", start + 1);
  const block = ledger.slice(start, next < 0 ? undefined : next);
  const def = block.split("\n").find((l) => l.startsWith("- **정의**"));
  const m = def && def.match(/\*\*"([^"]+)"\*\*/);
  return m ? m[1] : null;
}

function section(md, headingStart) {
  const i = md.indexOf(headingStart);
  if (i < 0) return "";
  const j = md.indexOf("\n## ", i + 1);
  return md.slice(i, j < 0 ? undefined : j);
}

/** Stale-Doc 대조. 실패한 항목의 설명 목록(빈 배열 = 통과). */
export function staleChecks(claude, ledger) {
  const fails = [];
  const principle = ledgerPrinciple(ledger);
  const row6 = claude.split("\n").find((l) => l.startsWith("| 6 |")) ?? "";
  if (!principle) fails.push("① 원장 D-77 정의 줄에서 원칙 문장을 찾지 못함");
  else if (!row6.includes(principle)) fails.push("① 불변 원칙 6행에 원장 D-77 원칙 문장이 글자 그대로 없음");

  const launch = section(claude, "## 🚀 런칭 목표일");
  if (!launch.includes("2026-11-26")) fails.push("② 런칭 절에 2026-11-26 없음");

  const order = launch.split("\n").find((l) => l.includes("런칭 전 작업 순서")) ?? "";
  if (!order.includes("IMAGE-1 PR 1 · 2 · 3")) fails.push("③ 런칭 전 순서 줄에 'IMAGE-1 PR 1 · 2 · 3' 없음");

  if (row6.replace(/~~[^~]*~~/g, "").includes("Level 1 자동허용"))
    fails.push("④ 불변 원칙 6행에 'Level 1 자동허용'이 취소선 밖에 남아 있음");

  for (const l of launch.split("\n"))
    if (/10[\/-]0?8(?!\d)/.test(l) && !l.includes("49일 밀림"))
      fails.push(`⑤ 런칭 절에 10/08(10/8)이 '49일 밀림' 문맥 밖에 남음: ${l.trim().slice(0, 60)}`);

  // ⑥ D-20(디자인 정본)은 D-85로 바뀜 — 옛 기록(버전 머리 줄 · 버전 기록 행 · 취소선) 밖에서 D-20 만 홀로 남지 않게.
  for (const l of withoutChangelogRows(claude).split("\n")) {
    if (/^#\s*v\d/.test(l)) continue;
    const live = l.replace(/~~[^~]*~~/g, "");
    if (/D-20(?!\d)/.test(live) && !l.includes("D-85"))
      fails.push(`⑥ D-20 이 'D-85로 바뀜' 없이 지금 규칙으로 남음: ${l.trim().slice(0, 60)}`);
  }
  return fails;
}

/** LANGUAGE.md — 원장 D-86 새 낱말(조기 마감 · 숨김)이 §17 에 있는지. */
export function languageChecks(language) {
  const sec = section(language, "## 17.");
  if (!sec) return ["⑦ LANGUAGE.md §17(조기 마감 · 숨김) 절이 없음"];
  return ["조기 마감", "숨김", "D-86", "tournamentDeadline", "hidden"]
    .filter((w) => !sec.includes(w))
    .map((w) => `⑦ LANGUAGE.md §17 에 '${w}' 없음`);
}
