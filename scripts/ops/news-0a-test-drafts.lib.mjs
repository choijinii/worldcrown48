/**
 * NEWS-0a 3-2 — 쌓인 시험 초안 나누기 규칙(순수 함수 · 네트워크 없음).
 *
 * 묶음: "delete"(가 · 지울 것) · "keep"(나 · 남길 것) · "unsure"(다 · 판단이 서지 않는 것).
 *   (나) 출처가 외신 종합(cron_press) · 손 초안(manual_ai · manual_blank) · 주간(cron_weekly) 이면 대회와 상관없이 남긴다.
 *   (가) 개막 · 결과 초안(event_open · event_champion) 중 딸린 대회가 시험 대회(e2e: true)이거나 대회 문서가 없다.
 *   (다) 대회 id 가 없다 · 모르는 출처 · 시드 대회(hostUid seed-) · 기사 자체에만 시험 표식 — 사람이 본다.
 *   그 밖(대회가 있고 시험 표식 없음) = (나).
 * 초안(status "draft")이 아닌 기사는 어느 묶음에도 넣지 않는다(부르는 쪽이 초안만 넘기지만 한 번 더 막는다).
 */
export const KEEP_ORIGINS = new Set(["cron_press", "manual_ai", "manual_blank", "cron_weekly"]);
export const EVENT_ORIGINS = new Set(["event_open", "event_champion"]);

/**
 * @param {{ status?: unknown, origin?: unknown, tournamentId?: unknown, e2e?: unknown }} article
 * @param {Map<string, { exists: boolean, e2e?: unknown, hostUid?: unknown, status?: unknown }>} tournaments
 * @returns {{ group: "delete"|"keep"|"unsure"|"skip", reason: string }}
 */
export function classifyDraft(article, tournaments) {
  if (article.status !== "draft") return { group: "skip", reason: "초안 아님" };
  const origin = typeof article.origin === "string" ? article.origin : "";
  if (KEEP_ORIGINS.has(origin)) return { group: "keep", reason: `출처 ${origin}` };
  if (!EVENT_ORIGINS.has(origin)) return { group: "unsure", reason: `모르는 출처 ${origin || "(없음)"}` };
  const tid = typeof article.tournamentId === "string" && article.tournamentId ? article.tournamentId : null;
  if (!tid) return { group: "unsure", reason: "대회 id 없음" };
  const t = tournaments.get(tid);
  if (!t || !t.exists) return { group: "delete", reason: "대회 문서 없음" };
  if (t.e2e === true) return { group: "delete", reason: "시험 대회(e2e)" };
  if (typeof t.hostUid === "string" && t.hostUid.startsWith("seed-")) return { group: "unsure", reason: "시드 대회(hostUid seed-)" };
  if (article.e2e === true) return { group: "unsure", reason: "기사에만 시험 표식" };
  return { group: "keep", reason: "실제 대회 · 시험 표식 없음" };
}

/**
 * NEWS-0a 3-2 2단계 — (가) 묶음 지우기. 바깥 일(읽기 · 사본 쓰기 · 지우기 · 쉬기)은 모두 주입한다.
 *
 * 순서: ① 후보 전부를 지금 다시 읽는다 → ② 그중 지금도 (가)인 것의 문서 전체를 안전 사본으로 먼저 쓴다 →
 *       ③ 묶음(기본 100)마다 다시 읽어 지금도 (가)이고 사본을 쓴 뒤 바뀌지 않았을 때만(updateTime 조건) 지운다.
 * 이미 없는 문서 = 건너뜀(다시 돌려도 안전). 바뀐 문서 · 더는 (가)가 아닌 문서 = 건너뜀. 실패한 줄은 retries 번 다시.
 *
 * @param {{
 *   candidateIds: string[],
 *   readArticles: (ids: string[]) => Promise<Map<string, { exists: boolean, data?: any, updateTime?: string, raw?: any }>>,
 *   readTournaments: (ids: string[]) => Promise<Map<string, { exists: boolean, e2e?: unknown, hostUid?: unknown }>>,
 *   writeBackup: (docs: any[]) => Promise<void> | void,
 *   deleteMany: (items: { id: string, updateTime: string }[]) => Promise<{ id: string, ok: boolean, reason?: string }[]>,
 *   sleep?: (ms: number) => Promise<void>,
 *   batchSize?: number, pauseMs?: number, retries?: number,
 * }} deps
 */
export async function runDeleteStep(deps) {
  const { candidateIds, readArticles, readTournaments, writeBackup, deleteMany } = deps;
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const batchSize = deps.batchSize ?? 100;
  const pauseMs = deps.pauseMs ?? 3000;
  const retries = deps.retries ?? 2;
  const result = { candidates: candidateIds.length, deleted: 0, skipped: 0, failed: 0, backedUp: 0, skippedReasons: {}, failedIds: [] };
  const skip = (why) => {
    result.skipped += 1;
    result.skippedReasons[why] = (result.skippedReasons[why] ?? 0) + 1;
  };

  async function eligible(ids) {
    const arts = await readArticles(ids);
    const tids = [...new Set([...arts.values()].filter((a) => a.exists).map((a) => a.data?.tournamentId).filter((x) => typeof x === "string" && x))];
    const ts = tids.length ? await readTournaments(tids) : new Map();
    const ok = [];
    const not = [];
    for (const id of ids) {
      const a = arts.get(id);
      if (!a || !a.exists) { not.push([id, "이미 없음"]); continue; }
      const c = classifyDraft(a.data ?? {}, ts);
      if (c.group !== "delete") { not.push([id, a.data?.status !== "draft" ? "초안 아님(발행 · 보관)" : "더는 (가) 아님"]); continue; }
      ok.push({ id, updateTime: a.updateTime, raw: a.raw ?? a.data });
    }
    return { ok, not };
  }

  // ① · ② 안전 사본 먼저 — 사본에 없는 문서는 지우지 않는다.
  const first = await eligible(candidateIds);
  await writeBackup(first.ok.map((x) => ({ id: x.id, updateTime: x.updateTime, doc: x.raw })));
  result.backedUp = first.ok.length;
  const backupTime = new Map(first.ok.map((x) => [x.id, x.updateTime]));
  for (const [, why] of first.not) skip(why);

  // ③ 묶음마다 다시 읽고 지운다.
  const ids = first.ok.map((x) => x.id);
  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    const now = await eligible(chunk);
    for (const [, why] of now.not) skip(why);
    let todo = [];
    for (const x of now.ok) {
      if (x.updateTime !== backupTime.get(x.id)) skip("사본 뒤에 바뀜");
      else todo.push({ id: x.id, updateTime: x.updateTime });
    }
    for (let attempt = 0; attempt <= retries && todo.length; attempt += 1) {
      const res = await deleteMany(todo);
      const failedNow = [];
      for (const r of res) {
        if (r.ok) result.deleted += 1;
        else if (r.reason === "precondition") skip("지우는 순간 바뀜");
        else failedNow.push(todo.find((t) => t.id === r.id));
      }
      todo = failedNow.filter(Boolean);
      if (todo.length) await sleep(pauseMs);
    }
    for (const t of todo) { result.failed += 1; result.failedIds.push(t.id); }
    if (i + batchSize < ids.length) await sleep(pauseMs);
  }
  return result;
}
