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
 *
 * T5 PR 2 — 공개 캐시에서 선택 수(`voteCount`) · 비율(`rate`) · 합계(`totalVotes`)를 뺀다
 * (`toPublicEntry`). 이상 징후(T-1~T-4)는 여전히 선택 수로 판정하므로, 그 기준선(이번 세대의
 * `RankingSnapshot`)은 서버 전용 `ranking_accum/{tid}/history/{seq}` 에 쓰고 거기서 읽는다.
 * 공개 `ranking_cache/{tid}/history` 에는 더 쓰지 않는다(옛 문서는 지우지 않고 규칙으로 읽기만 막는다).
 */
import { Timestamp, type DocumentData, type Firestore } from "firebase-admin/firestore";
import { buildTallies, contestantMetaOf } from "./rankingAggregator";
import { buildRankingUpdate } from "./scheduleRankingCacheCore";
import { accumToRankingInputs, type RankingAccum } from "./incrementalTally";
import { toPublicEntry } from "../_ranking/publicEntry";
import { ARCHIVE, toArchiveDoc } from "./rankingArchive";
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
 * 서버 전용 경보 기준선 자리 — `ranking_accum/{tid}/history/{seq}`. 규칙은 재귀 와일드카드로
 * read · write 모두 막혀 있다. `rankingAccumStore.ACCUM` 과 같은 이름이지만 거기서 가져오면
 * 순환 import 가 생겨(저장부가 이 파일을 부른다) 여기 다시 적는다.
 */
const ACCUM_COLLECTION = "ranking_accum";

/**
 * ms → Firestore 에 쓸 시각 값. 기본은 functions 의 `Timestamp.fromMillis`.
 * 에뮬레이터 시험은 루트 firebase-admin 으로 만든 db 를 넘기는데, 두 패키지의 Timestamp 는
 * 서로 다른 클래스라 섞으면 직렬화가 거절된다 → 시험은 루트 쪽 것을 넘긴다(`ServerTime` 과 같은 방식).
 */
export type ToTimestamp = (ms: number) => unknown;
export const defaultToTimestamp: ToTimestamp = (ms) => Timestamp.fromMillis(ms);

/** Narrow a stored baseline doc to the timestamp-free shape the cores use. */
function toSnapshot(data: DocumentData): RankingSnapshot {
  return {
    tournamentId: data.tournamentId,
    rankings: data.rankings ?? [],
    totalVotes: data.totalVotes ?? 0,
    generationSequence: data.generationSequence ?? 0,
  };
}

/**
 * 배포 전 모양(선택 수가 실린 공개 문서)일 때만 기준선으로 쓴다. 행이 하나도 없거나 `voteCount`
 * 가 없는 행이 있으면 null — 선택 수 없이 다시 세운 rate 순 목록은 뜻이 없다(NaN 비교).
 */
function legacyBaseline(data: DocumentData | undefined, seq: number): RankingSnapshot | null {
  const rows = data?.rankings;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  if (!rows.every((r) => typeof r?.voteCount === "number")) return null;
  return { ...toSnapshot(data!), generationSequence: seq };
}

/**
 * 누적 → 공개 차트 캐시 한 세대. `readsFixed` = 이 함수가 읽은 문서 수(contestants · 직전 캐시 ·
 * 기준선 두 개(+ 배포 뒤 첫 발표의 옛 공개 문서) · 열린 경보) — 대회 기록 수와 무관한 고정
 * 비용이라 실행 기록에 따로 남긴다.
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
  const baselineRef = db.collection(ACCUM_COLLECTION).doc(tid).collection("history");
  let readsFixed = 0;

  // contestants (for name/videoId join) + 직전 공개 캐시(세대 번호 · 직전 발표 시각).
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
  // 세대 번호는 공개 캐시 값 + 1 그대로 — 기준선 문서 번호가 이것을 따른다.
  const prevSeq: number | null = prevData ? (prevData.generationSequence ?? 0) : null;
  const generationSequence = prevSeq === null ? 0 : prevSeq + 1;

  // baselines: T-4 = 직전 세대(seq−1, 12시간 전); T-3 = 2세대 전(seq−2, 24시간 전).
  // 둘 다 서버 전용 기준선에서 읽는다. 그 자리에 문서가 없을 때만(PR 2 배포 뒤 첫 발표) 옛
  // 공개 문서를 한 번 본다 — `ranking_cache/{tid}` 가 곧 seq−1, 옛 공개 history/{seq−2} 가 T-3.
  // ⚠️ T-4 의 기준선이 1시간 → 12시간으로 늘어난 것은 **알고 남긴 것**이다. 이상 판정
  // 규칙 재설계는 범위 밖이고(대표 지시 2026-09-10), 경보 문구도 건드리지
  // 않는다 — `anomalyRules` 의 "1h" 표기는 실제와 어긋난 채 남아 있다.
  let prevCache: RankingSnapshot | null = null;
  let prevFromLegacy = false;
  if (prevSeq !== null) {
    const p = await baselineRef.doc(String(prevSeq)).get();
    readsFixed += 1;
    if (p.exists) {
      prevCache = toSnapshot(p.data()!);
    } else {
      // 직전 공개 캐시는 위에서 이미 읽었다 — 추가 읽기 없음.
      prevCache = legacyBaseline(prevData!, prevSeq);
      prevFromLegacy = prevCache !== null;
    }
  }

  let history24: RankingSnapshot | null = null;
  const wantSeq = generationSequence - HISTORY_KEEP;
  if (wantSeq >= 0) {
    const h = await baselineRef.doc(String(wantSeq)).get();
    readsFixed += 1;
    if (h.exists) {
      history24 = toSnapshot(h.data()!);
    } else {
      const old = await cacheRef.collection("history").doc(String(wantSeq)).get();
      readsFixed += 1;
      history24 = old.exists ? legacyBaseline(old.data(), wantSeq) : null;
    }
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

  // 서버 전용 기준선 — 이번 세대(선택 수 · 비율 · 합계 포함)를 쓰고, 보관 창 밖(seq−3)을 지운다.
  // 공개 캐시보다 먼저 쓴다: 그 사이에 죽으면 다음 실행이 같은 번호로 다시 쓴다(공개 세대 번호가
  // 그대로라서). 옛 공개 문서에서 가져온 직전 기준선은 이 자리에 한 번 옮겨 둔다 — 그래야 다음
  // 발표의 T-3(seq−2)이 공개 쪽을 다시 보지 않고, 새 공개 history 를 쓰지 않아도 기준선이 이어진다.
  if (prevFromLegacy) {
    await baselineRef.doc(String(prevSeq)).set({
      tournamentId: tid,
      rankings: prevCache!.rankings,
      totalVotes: prevCache!.totalVotes,
      generationSequence: prevSeq,
    });
  }
  const baseline: RankingSnapshot = {
    tournamentId: tid,
    rankings: update.rankings,
    totalVotes: update.totalVotes,
    generationSequence,
  };
  await baselineRef.doc(String(generationSequence)).set(baseline);
  const stale = generationSequence - 1 - HISTORY_KEEP;
  if (stale >= 0) {
    await baselineRef.doc(String(stale)).delete().catch(() => undefined);
  }

  // write the fresh cache — PURE Voter data, no anomaly signal (W-2) · 선택 수 · 비율 · 합계 없음(T5 PR 2).
  const newCache: RankingCache = {
    tournamentId: tid,
    rankings: update.rankings.map(toPublicEntry),
    // 10판 기준(정본 §5)을 화면이 판정하는 값. 화면은 판수를 따로 세지 않는다.
    runsTotal: update.runsTotal,
    generationSequence,
    generatedAt: now as RankingCache["generatedAt"],
    previousGeneratedAt: (prevData?.generatedAt as RankingCache["previousGeneratedAt"] | undefined) ?? null,
  };
  await cacheRef.set(newCache);

  // 차트 사진 영구 보관 — 발표마다 한 문서. 공개 캐시 행(= 선택 수 · 비율 없음)에서 만들고, 기준선 행
  // (영상 · 그림 주소가 남아 있다)은 쓰지 않는다. 같은 번호는 덮어쓴다. 지우는 코드는 없다.
  await db
    .collection(ARCHIVE)
    .doc(tid)
    .collection("gens")
    .doc(String(generationSequence))
    .set(toArchiveDoc(newCache, nowMs));

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
