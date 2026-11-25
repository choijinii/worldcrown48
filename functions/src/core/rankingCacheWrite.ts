/**
 * rankingCacheWrite — 누적 하나로 공개 차트 캐시 `ranking_cache/{tid}` 를 쓴다 (T5 · PR 1).
 *
 * 지금까지 `scheduleRankingCache` 크론 몸통에 있던 "contestants 읽기 → buildTallies →
 * prevCache/history24 → buildRankingUpdate → history 회전 → cache set → admin_alerts" 를
 * **그대로 옮긴 것**이다. 달라진 것은 재료 하나뿐 — `votes` 전량을 읽어 `tallyVotes` ·
 * `tallyRuns` 로 세던 값 대신 누적(`RankingAccum`)을 `accumToRankingInputs` 로 같은 모양으로
 * 바꿔 넣는다. 필드 · history 회전 · 경보 규칙은 한 글자도 바꾸지 않았다
 * (`__tests__/scheduleRankingCacheCore.test.ts` 가 순수 결정부를 그대로 지킨다).
 *
 * 발표 흐름(`publishTournament`)과 다시 세기 도우미(마지막 확정이 늦게 끝났을 때)가 함께 부른다.
 */
import { Timestamp, type DocumentData, type Firestore } from "firebase-admin/firestore";
import { buildTallies, contestantMetaOf } from "./rankingAggregator";
import { buildRankingUpdate } from "./scheduleRankingCacheCore";
import { accumToRankingInputs, type RankingAccum } from "./incrementalTally";
import type { AnomalyTag, RankingCache, RankingSnapshot } from "../_ranking/rankingTypes";

/**
 * History generations retained — the T-3 baseline is exactly 2 runs back
 * (= 24h at the 09:00/21:00 cadence).
 *
 * 60분 주기 시절에는 24였다. 주기를 하루 2회로 바꾸면서 그대로 두면 T-3(#1 +200% over 24h)의
 * 기준선이 **12일 전**을 가리키게 되어 경보 문구가 사실과 어긋난다 (대표 확정, 2026-09-10).
 *
 * ⚠️ **전환 직후 두 번은 기준선이 짧다.** 배포 후 첫 실행의 `gen-2` 문서는 60분 주기 시절에
 * 쓰인 것이라 24시간이 아니라 ~2시간 전이다 → T-3(+200%)이 헐거워져 거짓 경보가 날 수 있다.
 * T-3은 `PERSISTENT_TAGS` 가 아니라 매번 새 `admin_alerts` 문서를 만든다. 두 번 발표되면
 * (= 24시간) 저절로 맞으므로 코드로 보정하지 않는다.
 *
 * ⚠️ 보관 세대가 24 → 2로 줄어도 회전 로직은 실행당 1건만 지운다. 과거 24세대 시절에 쌓인
 * 문서 일부는 아무 실행도 도달하지 못해 남는다 — 읽히지 않는 데이터이고, 일괄 삭제는
 * §5 DON'T 3으로 금지다.
 */
export const HISTORY_KEEP = 2;

/**
 * ms → Firestore 에 쓸 시각 값. 기본은 functions 의 `Timestamp.fromMillis`.
 * 에뮬레이터 시험은 루트 firebase-admin 으로 만든 db 를 넘기는데, 두 패키지의 Timestamp 는
 * 서로 다른 클래스라 섞으면 직렬화가 거절된다 → 시험은 루트 쪽 것을 넘긴다(`ServerTime` 과 같은 방식).
 */
export type ToTimestamp = (ms: number) => unknown;
export const defaultToTimestamp: ToTimestamp = (ms) => Timestamp.fromMillis(ms);

/** Narrow a stored ranking_cache doc to the timestamp-free shape the cores use. */
function toSnapshot(data: DocumentData): RankingSnapshot {
  return {
    tournamentId: data.tournamentId,
    rankings: data.rankings ?? [],
    totalVotes: data.totalVotes ?? 0,
    generationSequence: data.generationSequence ?? 0,
  };
}

/**
 * 누적 → 공개 차트 캐시 한 세대. `readsFixed` = 이 함수가 읽은 문서 수(contestants · 직전 캐시 ·
 * 24시간 전 세대 · 열린 경보) — 대회 기록 수와 무관한 고정 비용이라 실행 기록에 따로 남긴다.
 */
export async function writeCacheFromAccum(
  db: Firestore,
  tid: string,
  accum: RankingAccum,
  nowMs: number,
  opts: { toTimestamp?: ToTimestamp } = {},
): Promise<{ readsFixed: number }> {
  const now = (opts.toTimestamp ?? defaultToTimestamp)(nowMs);
  const cacheRef = db.collection("ranking_cache").doc(tid);
  const historyRef = cacheRef.collection("history");
  let readsFixed = 0;

  // contestants (for name/videoId join) + 직전 캐시.
  const [contestantsSnap, prevSnap] = await Promise.all([
    db.collection("contestants").where("tournamentId", "==", tid).get(),
    cacheRef.get(),
  ]);
  readsFixed += contestantsSnap.size + 1;

  // 옛 크론의 tallyVotes · tallyRuns 결과와 같은 모양(누적이 그 둘의 합이다).
  const { counts, runs } = accumToRankingInputs(accum);
  const tallies = buildTallies(
    counts,
    // name · media.embed.videoId(PR-2) · nameI18n(NAME-I18N-1) — 문서 읽기는 한 곳.
    contestantsSnap.docs.map((d) => contestantMetaOf(d.id, d.data())),
  );

  const prevData = prevSnap.exists ? prevSnap.data()! : null;
  const prevCache = prevData ? toSnapshot(prevData) : null;
  const generationSequence = prevCache ? prevCache.generationSequence + 1 : 0;

  // baselines: T-4 = prevCache (= 직전 발표, 이제 12시간 전); T-3 = the doc
  // 2 generations back (= 24h at the 09:00/21:00 cadence).
  // ⚠️ T-4 의 기준선이 1시간 → 12시간으로 늘어난 것은 **알고 남긴 것**이다. 이상 판정
  // 규칙 재설계는 범위 밖이고(대표 지시 2026-09-10), 경보 문구도 건드리지
  // 않는다 — `anomalyRules` 의 "1h" 표기는 실제와 어긋난 채 남아 있다.
  let history24: RankingSnapshot | null = null;
  const wantSeq = generationSequence - HISTORY_KEEP;
  if (wantSeq >= 0) {
    const h = await historyRef.doc(String(wantSeq)).get();
    readsFixed += 1;
    if (h.exists) history24 = toSnapshot(h.data()!);
  }

  // Persistent (T-1/T-2) alerts already open → dedup (trap #8).
  const openAlerts = await db
    .collection("admin_alerts")
    .where("tournamentId", "==", tid)
    .where("resolved", "==", false)
    .get();
  readsFixed += openAlerts.size;
  const existingUnresolvedTags = openAlerts.docs.map((d) => d.data().type as AnomalyTag);

  const update = buildRankingUpdate({
    tournamentId: tid,
    tallies,
    runs,
    prevCache,
    history24,
    existingUnresolvedTags,
  });

  // rotate history — store the now-previous cache under its own sequence,
  // then prune anything older than the HISTORY_KEEP window.
  if (prevData) {
    await historyRef.doc(String(prevCache!.generationSequence)).set(prevData);
    const stale = generationSequence - 1 - HISTORY_KEEP;
    if (stale >= 0) {
      await historyRef.doc(String(stale)).delete().catch(() => undefined);
    }
  }

  // write the fresh cache — PURE Voter data, no anomaly signal (W-2).
  // (Vote Count carried in voteCount — internal only.)
  const newCache: RankingCache = {
    tournamentId: tid,
    rankings: update.rankings,
    totalVotes: update.totalVotes,
    // 10판 기준(정본 §5)을 화면이 판정하는 값. 화면은 판수를 따로 세지 않는다.
    runsTotal: update.runsTotal,
    generationSequence,
    generatedAt: now as RankingCache["generatedAt"],
    previousGeneratedAt: (prevData?.generatedAt as RankingCache["previousGeneratedAt"] | undefined) ?? null,
  };
  await cacheRef.set(newCache);

  // admin_alerts — create new, or refresh the open persistent one (dedup).
  for (const action of update.alertActions) {
    if (action.create) {
      await db.collection("admin_alerts").add({
        type: action.type,
        tournamentId: tid,
        detail: action.detail,
        createdAt: now,
        resolved: false,
      });
    } else {
      const open = openAlerts.docs.find((d) => (d.data().type as AnomalyTag) === action.type);
      if (open) await open.ref.update({ createdAt: now, detail: action.detail });
    }
  }

  return { readsFixed };
}
