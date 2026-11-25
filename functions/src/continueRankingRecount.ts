/**
 * continueRankingRecount — 차트 다시 세기 도우미 (T5 · 설계보고 `outputs/T5_설계보고_2026-11-24.md` §3).
 *
 * 발표 크론이 시작한 처음부터 다시 세기가 예산(크론 실행 전체에 하나 · `RECOUNT_BUDGET_MS`)에 닿으면
 * 진행 상태를 `ranking_recount_jobs/{tid}` 에 남긴다. 이 크론이 5분마다 그 job 들을 이어 센다 — 다음
 * 발표(12시간 뒤)까지 기다리면 큰 대회의 다시 세기가 하루를 넘길 수 있다.
 *
 * 마지막 확정(final) job 을 끝내면 여기서 최종 차트를 쓴다. 그 캐시 쓰기가 실패해도 누적 문서의 표지
 * (`finalCachePendingMs`)가 남아 다음 실행이 먼저 다시 쓴다. 몸통은 `runRecountHelper`(core · 에뮬레이터 시험).
 *
 * 표지 · job 이 없으면 빈 쿼리 두 번으로 끝난다(평소 비용).
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { adminDb } from "./admin";
import { runRecountHelper } from "./core/rankingAccumStore";

export const continueRankingRecount = onSchedule(
  { schedule: "every 5 minutes", region: "asia-northeast3", timeoutSeconds: 540, memory: "512MiB" },
  async () => {
    // 예산 240초(HELPER_BUDGET_MS · 5분 간격보다 짧게 — 길면 매번 다음 실행과 겹쳐 임대에 막힌다).
    await runRecountHelper(adminDb);
  },
);
