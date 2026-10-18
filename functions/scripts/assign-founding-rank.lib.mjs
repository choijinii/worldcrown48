/**
 * assign-founding-rank.lib.mjs — 옛 사전등록 문서 번호 매기기의 **순수 계획 층** (PRE-REG-1).
 *
 * 옛 화면은 `waitlist/{sha256(email)}` 에 `{email, createdAt}` 만 썼다(번호 없음). 등록 함수
 * (registerWaitlist)는 번호 기록 문서 `waitlist_meta/founding` 이 생기기 전에는 번호 없이
 * 저장한다(waitlistCore "봉인"). 이 계획은 번호 없는 문서 전부를 **등록 시각 순서대로**
 * 이어서 번호를 매기고, 실행 층(assign-founding-rank.mjs)이 그 끝 번호로 번호 기록 문서를
 * 만들어 봉인한다. 그 뒤 등록은 바로 다음 번호를 받는다.
 *
 * "등록 순서 = 번호 순서" 가 깨지는 곳(번호 없는 문서가 번호 있는 문서보다 먼저 등록됨 ·
 * 등록 시각 없음 · 빈틈 · 중복)은 고치는 척하지 않고 문제로 보고한다 — 고칠지는 대표가 본다.
 *
 * 관례: cleanup-tournaments.lib.mjs · backfill-title-i18n.lib.mjs (Firestore 없이 시험).
 */

/** 같은 등록 시각이면 문서 ID 순 — 다시 돌려도 같은 계획이 나온다. */
function byCreatedThenId(a, b) {
  const ta = a.createdAtMs ?? Number.POSITIVE_INFINITY;
  const tb = b.createdAtMs ?? Number.POSITIVE_INFINITY;
  if (ta !== tb) return ta - tb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * @param {{id: string, createdAtMs: number|null, rank: number|null}[]} docs  waitlist 문서 전부
 * @param {number|null} metaLastRank  waitlist_meta/founding.lastRank (없으면 null = 봉인 전)
 * @returns {{assignments: {id: string, rank: number}[], lastRank: number, problems: string[]}}
 */
export function planFoundingRanks(docs, metaLastRank) {
  const ranked = docs.filter((d) => typeof d.rank === "number");
  const unranked = docs.filter((d) => typeof d.rank !== "number").sort(byCreatedThenId);
  const problems = [];

  const maxRank = ranked.reduce((m, d) => Math.max(m, d.rank), 0);
  let next = Math.max(metaLastRank ?? 0, maxRank);

  const newestRankedMs = ranked.reduce(
    (m, d) => (typeof d.createdAtMs === "number" ? Math.max(m, d.createdAtMs) : m),
    Number.NEGATIVE_INFINITY,
  );

  const assignments = [];
  for (const d of unranked) {
    next += 1;
    assignments.push({ id: d.id, rank: next });
    if (d.createdAtMs === null || d.createdAtMs === undefined) {
      problems.push(`등록 시각 없음: ${d.id} → 맨 뒤 번호 ${next}`);
    } else if (d.createdAtMs < newestRankedMs) {
      problems.push(`순서 깨짐: ${d.id} 는 이미 번호를 받은 문서보다 먼저 등록됐는데 번호 ${next} 를 받는다`);
    }
  }
  return { assignments, lastRank: next, problems };
}

/**
 * 번호를 다 매긴 뒤 전체 점검 — 1~n 빈틈·중복 없음 · 번호 순서 = 등록 시각 순서 · 번호 없음 0건.
 * @param {{id: string, createdAtMs: number|null, rank: number|null}[]} docs
 * @returns {string[]}
 */
export function rankOrderProblems(docs) {
  const problems = [];
  const missing = docs.filter((d) => typeof d.rank !== "number");
  for (const d of missing) problems.push(`번호 없음: ${d.id}`);

  const ranked = docs.filter((d) => typeof d.rank === "number").sort((a, b) => a.rank - b.rank);
  const seen = new Map();
  for (const d of ranked) seen.set(d.rank, (seen.get(d.rank) ?? 0) + 1);
  for (const [rank, n] of seen) if (n > 1) problems.push(`중복 번호 ${rank}: ${n}건`);
  const max = ranked.length ? ranked[ranked.length - 1].rank : 0;
  for (let r = 1; r <= max; r++) if (!seen.has(r)) problems.push(`빈틈: 번호 ${r} 없음`);

  let prev = null;
  for (const d of ranked) {
    if (prev && typeof d.createdAtMs === "number" && typeof prev.createdAtMs === "number" && d.createdAtMs < prev.createdAtMs) {
      problems.push(`순서 뒤집힘: ${d.id}(번호 ${d.rank}) 가 ${prev.id}(번호 ${prev.rank}) 보다 먼저 등록됐다`);
    }
    prev = d;
  }
  return problems;
}

/** 출력용 — 앞 한 글자와 도메인만 남긴다(대표 화면에 메일 원문을 띄우지 않는다). */
export function maskEmail(email) {
  const at = typeof email === "string" ? email.indexOf("@") : -1;
  if (at < 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}
