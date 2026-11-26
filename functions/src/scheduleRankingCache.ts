/**
 * scheduleRankingCache — v2 scheduler (KST 09:00·21:00 · asia-northeast3).
 *
 * For every Tournament inside the ranking window (마감 전 + 마감 후 유예 —
 * `core/rankingWindow`; handoff §9 trap #4: a per-Voter bracket model has no global
 * round to key off) it publishes the chart cache `ranking_cache/{tournamentId}`:
 * contestant metadata join → the SAME pure computeRankings / anomaly rules as the
 * client (buildRankingUpdate core) → history rotation (HISTORY_KEEP) → cache write →
 * `admin_alerts`. That body lives in `core/rankingCacheWrite.ts` (moved as is).
 *
 * This wrapper is the ONLY place that picks Tournaments and the publish time; every
 * decision lives in the tested cores. RTDB is never used (stack consistency).
 *
 * RUN-1 PR 3 (AC 14) — 매시간 전량 재읽기가 비용·중단의 원인이라 **하루 두 번**으로 줄였다.
 * 시각을 고정한 이유는 부하가 아니라 **문구다**: §8 승인 문구가 "오늘 21:00"·"내일 09:00"
 * 이라는 고정 시각이라, 배포 시각 기준 상대 주기(`every 12 hours`)로 두면 발표 시각이
 * 배포할 때마다 달라져 화면이 거짓말을 한다. 크론식 + `timeZone` 은 한 쌍이다 — `timeZone`
 * 이 빠지면 UTC로 돌아 KST 18:00·06:00에 발표된다.
 *
 * T5 차트 증분 집계(PR 1 · 설계보고 `outputs/T5_설계보고_2026-11-24.md`) — 발표마다 대회 `votes`
 * 를 통째로 다시 읽지 않는다. 대회마다 `publishTournament`(core/rankingAccumStore) 하나를 부른다:
 * 누적 `ranking_accum/{tid}` 에 지난 발표 뒤 셀 수 있게 된 기록만 더하고(증분), 5만 건 미만
 * 대회는 전량과 견줘 보고(그림자 비교), 창 안 마지막 발표는 처음부터 다시 세어 확정한다.
 * 다시 세기 요청(계정 삭제 등)이 있으면 처음부터 다시 센다 — 예산에 닿으면 `continueRankingRecount`
 * 도우미가 잇는다. 발표 시각은 **분 단위로 내린 값**이다 — 크론 시작이 몇 초 늦어도 구간 끝
 * (발표 − 2분)과 "창 안 마지막 발표" 판정이 정해진 발표 시각 기준으로 같게 나온다. 대회 하나가
 * 실패해도(`try/catch`) 다른 대회 발표는 계속한다.
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { rankingWindowStartMs } from "./core/rankingWindow";
import { RECOUNT_BUDGET_MS, publishTournament } from "./core/rankingAccumStore";

const MINUTE_MS = 60_000;

export const scheduleRankingCache = onSchedule(
  {
    // KST 09:00 · 21:00 고정 (AC 14). ❌ "every 12 hours" 금지 — 상대 주기다.
    schedule: "0 9,21 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    // 정해진 발표 시각(분 단위로 내림). 대회 목록 하한 · 구간 끝 · 마지막 발표 판정이 모두 이 값을
    // 쓴다 — 셋이 서로 다른 "지금"을 보면 경계의 대회가 마지막 확정을 놓칠 수 있다.
    const nowMs = Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;

    // 집계 대상 = 마감 전 대회 **+ 방금 마감된 대회**. Single-field range → auto-indexed.
    //
    // 마감 전만 보면 팬이 실제로 보는 최종 랭킹이 "마감 직전 마지막 크론 사진"이 된다
    // (팬은 W-7 때문에 마감 후에만 랭킹을 본다) → 발표가 하루 두 번이 된 지금은 **마감 직전
    // 최대 12시간의 선택이 최종 랭킹에서 빠진다.** `onChampionForNews` 가 이 캐시의 #1으로
    // 기사 Champion을 정하므로 기사까지 틀어진다. 사유·경계는 `core/rankingWindow` 참조.
    const windowStart = Timestamp.fromMillis(rankingWindowStartMs(nowMs));
    const inWindow = await adminDb
      .collection("tournaments")
      .where("tournamentDeadline", ">", windowStart)
      .get();

    // 다시 세기 예산은 **이 실행 전체에 하나**다. 대회마다 400초를 따로 주면 큰 다시 세기 둘이 540초
    // 시간 초과를 넘겨 함수가 죽고, 뒤 대회들은 아예 발표되지 않는다(try/catch 는 시간 초과를 못 잡는다).
    // 런칭 대회들은 마감이 같아 마지막 확정이 같은 발표에 몰린다. 예산이 지난 뒤의 대회는 다시 세기를
    // 한 페이지만 하고 job 을 도우미에게 넘기며, 캐시는 증분 누적으로 쓴다.
    const runDeadlineMs = Date.now() + RECOUNT_BUDGET_MS;

    for (const tournamentDoc of inWindow.docs) {
      const tournamentId = tournamentDoc.id;
      try {
        const deadline = tournamentDoc.data().tournamentDeadline as Timestamp;
        await publishTournament(adminDb, tournamentId, deadline.toMillis(), nowMs, { deadlineAtMs: runDeadlineMs });
      } catch (err) {
        // 이 대회의 캐시는 옛 것으로 남는다 — 누적이 앞서 갔으면 다음 발표가 그 누적으로 쓴다.
        logger.error("rankingPublish failed", { tournamentId, err: String(err) });
      }
    }
  },
);
