/**
 * survey-rate-articles.lib.mjs — 순수 판정부(시험: functions/src/__tests__/surveyRateArticles.test.ts).
 *
 * 옛 rate(선택 수 ÷ 전체 선택 수)와 퍼센트 숫자가 남은 기사를 찾는다. 기사 숫자 허용 목록
 * (대표 확정 2026-11-25)에서 옛 rate 칸("TOP RATE" · "RUNNER-UP RATE" · "TOP MOMENTUM")은 빠졌다.
 * 이미 만들어진 기사는 **고치지도 지우지도 않고 보고만 한다**(대표 결정).
 *
 * 걸리는 조건 — 문서 모양은 lib/news/articleDoc.ts:
 *   ① evidence.stats[i] 라벨이 /RATE|MOMENTUM/(대소문자 무시) 이거나 값에 "%"
 *   ② body[lang][j] 가 stats 블록이고 items[k] 의 값(n)이나 라벨(l)에 "%"
 * 문단 글 속 "%" 는 조건 밖이다(사람이 읽고 판단할 몫).
 */

const LABEL_RE = /RATE|MOMENTUM/i;
const LANGS = ["ko", "en", "es"];

const str = (v) => (typeof v === "string" ? v : null);

/** 한 기사에서 걸린 칸의 설명 글 목록. 모양이 깨져도 멈추지 않는다. */
export function judgeArticle(doc) {
  const hits = [];
  const stats = doc && doc.evidence && Array.isArray(doc.evidence.stats) ? doc.evidence.stats : [];
  stats.forEach((s, i) => {
    if (!s || typeof s !== "object") return;
    const label = str(s.label);
    const value = str(s.value);
    if (label === null && value === null) return;
    const byLabel = label !== null && LABEL_RE.test(label);
    const byValue = value !== null && value.includes("%");
    if (!byLabel && !byValue) return;
    hits.push(`evidence.stats[${i}] ${label ?? ""}${byValue ? `=${value}` : ""}`);
  });
  const body = doc && doc.body && typeof doc.body === "object" ? doc.body : {};
  for (const lang of LANGS) {
    const blocks = Array.isArray(body[lang]) ? body[lang] : [];
    blocks.forEach((b, j) => {
      if (!b || b.type !== "stats" || !Array.isArray(b.items)) return;
      b.items.forEach((it, k) => {
        if (!it) return;
        const n = str(it.n) ?? "";
        const l = str(it.l) ?? "";
        if (n.includes("%") || l.includes("%")) hits.push(`body.${lang}[${j}].items[${k}] ${l}=${n}`);
      });
    });
  }
  return hits;
}

const KST = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function toMillis(v) {
  if (!v) return null;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (v instanceof Date) return v.getTime();
  return null;
}

/** Firestore Timestamp | Date → "YYYY-MM-DD HH:mm"(KST). 없으면 "—". */
export function fmtKstDate(v) {
  const ms = toMillis(v);
  return ms === null ? "—" : KST.format(new Date(ms));
}

/** [{id, data}] → 걸린 기사만, 만든 날짜 오름차순(같으면 id). */
export function surveyRows(docs) {
  const rows = [];
  for (const { id, data } of docs) {
    const fields = judgeArticle(data);
    if (fields.length === 0) continue;
    rows.push({
      id,
      titleKo: str(data && data.title && data.title.ko) ?? "(제목 없음)",
      status: str(data && data.status) ?? "—",
      created: fmtKstDate(data && data.createdAt),
      createdMs: toMillis(data && data.createdAt) ?? 0,
      fields,
    });
  }
  rows.sort((a, b) => a.createdMs - b.createdMs || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return rows;
}

const cell = (s) => String(s).replace(/\|/g, "∣").replace(/\n/g, " ");

/** 사람이 읽는 Markdown 목록. */
export function renderMarkdown(rows, { project, scanned, at }) {
  const lines = [
    "# 옛 rate · 퍼센트가 남은 기사 조사 (읽기 전용)",
    "",
    `- 프로젝트: ${project} · 조사 시각(KST): ${at}`,
    `- 읽은 기사 ${scanned}건 · 걸린 기사 ${rows.length}건`,
    "- 조건: ① evidence.stats 라벨이 RATE·MOMENTUM 이거나 값에 % ② 본문 stats 항목(언어마다)에 %",
    "- 결정(2026-11-25): 보고만 한다 — 고치거나 지우지 않는다.",
    "",
  ];
  if (rows.length === 0) {
    lines.push("걸린 기사가 없다.");
    return lines.join("\n") + "\n";
  }
  lines.push("| 제목(ko) | 상태 | 만든 날짜(KST) | 문서 id | 걸린 칸 |");
  lines.push("|---|---|---|---|---|");
  for (const r of rows) {
    lines.push(`| ${cell(r.titleKo)} | ${r.status} | ${r.created} | ${r.id} | ${cell(r.fields.join("<br>"))} |`);
  }
  return lines.join("\n") + "\n";
}
