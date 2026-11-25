/**
 * continueRankingRecount — 차트 다시 세기 도우미 (T5 · 설계보고 `outputs/T5_설계보고_2026-11-24.md` §3).
 *
 * 발표 크론이 시작한 처음부터 다시 세기가 한 실행 예산(`RECOUNT_BUDGET_MS`)에 닿으면 진행 상태를
 * `ranking_recount_jobs/{tid}` 에 남긴다. 이 크론이 5분마다 그 job 들을 이어 센다 — 다음 발표
 * (12시간 뒤)까지 기다리면 큰 대회의 다시 세기가 하루를 넘길 수 있다.
 *
 * job 이 없으면 문서 0건 읽기로 끝난다(평소 비용 = 5분마다 빈 쿼리 한 번).
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { adminDb } from "./admin";
import { HELPER_BUDGET_MS, JOBS, runRecount, type ReadCounts, type RecountJob } from "./core/rankingAccumStore";

export const continueRankingRecount = onSchedule(
  { schedule: "every 5 minutes", region: "asia-northeast3", timeoutSeconds: 540, memory: "512MiB" },
  async () => {
    const jobs = await adminDb.collection(JOBS).get();
    if (jobs.empty) return;

    // 예산은 실행 전체에 하나(240초 · 5분 간격보다 짧게 — 길면 매번 다음 실행과 겹쳐 임대에 막힌다).
    const deadlineAtMs = Date.now() + HELPER_BUDGET_MS;
    for (const doc of jobs.docs) {
      if (Date.now() >= deadlineAtMs) break; // 남은 job 은 다음 5분 실행이 잇는다
      const job = doc.data() as RecountJob;
      const reads: ReadCounts = { created: 0, relinked: 0, runFetch: 0, recount: 0, shadow: 0 };
      try {
        // asOf · final 은 job 문서의 값을 runRecount 가 그대로 쓴다(이어 세기). resumeOnly — 목록을
        // 읽은 뒤 다른 실행이 job 을 끝냈으면 새로 세기 시작하지 않는다(새 다시 세기는 발표 흐름 몫).
        // 다른 실행이 임대 중이면 runRecount 가 읽지 않고 {done:false}.
        const res = await runRecount(
          adminDb,
          job.tournamentId,
          { asOfMs: job.asOfMs, final: job.final, deadlineAtMs, nowMs: () => Date.now(), resumeOnly: true },
          reads,
        );
        logger.info("continueRankingRecount", {
          tournamentId: job.tournamentId,
          done: res.done,
          final: job.final,
          recountReads: reads.recount,
        });
        // TODO(Task 4): res.done && job.final 이면 writeCacheFromAccum 으로 최종 차트를 쓴다.
      } catch (err) {
        // 한 대회가 실패해도 나머지 job 은 잇는다 — job 문서가 남아 다음 실행이 다시 시도한다.
        logger.error("continueRankingRecount failed", { tournamentId: job.tournamentId, err: String(err) });
      }
    }
  },
);
