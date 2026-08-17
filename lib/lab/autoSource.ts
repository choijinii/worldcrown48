/**
 * autoSource — 자동 소싱 콜러블 배선 + 배치 드라이버 (LAB-EV-2 §5 C).
 *
 * 콜러블 1회는 ≤8명이다(R5 · 60s 타임아웃). 48명을 채우려면 6번 순차 호출해야 하고,
 * 그 사이 두 가지가 유지돼야 한다:
 *   ① 진행률 — 운영자가 "12/48"을 본다
 *   ② **배치를 건너뛰는 중복 회피** — 1배치가 고른 영상을 2배치가 또 고르면 안 된다.
 *      서버는 자기 배치 안만 알므로, 클라이언트가 확정된 videoId를 다음 배치의
 *      excludeVideoIds에 실어 보낸다.
 *
 * 드라이버는 콜러블을 주입받는다 — 그래야 네트워크 없이 ①②를 테스트할 수 있다.
 * 검수 콜러블(inspectYouTube)과 같은 원칙: **실패를 조용히 삼키지 않는다**.
 */
import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "@/lib/firebase";
import { MAX_BATCH_TARGETS } from "@/lib/embed/sourcing/pipeline";
import type { QuotaEstimate, QuotaUsage } from "@/lib/embed/sourcing/quota";
import type {
  SourcingBatchSummary,
  SourcingTarget,
} from "@/lib/embed/sourcing/types";
import {
  addToTally,
  chunkTargets,
  EMPTY_TALLY,
  type SourcingRunTally,
} from "@/lib/lab/sourcingDraft";

export interface SourcingCallPayload {
  targets: SourcingTarget[];
  categoryKeywords?: string[];
  excludeVideoIds?: string[];
  dryRun?: boolean;
}

/** 드라이런 응답 — 확인 다이얼로그가 읽는다(API 0콜). */
export interface SourcingQuotaPreview {
  dryRun: true;
  quota: {
    estimate: QuotaEstimate;
    usage: QuotaUsage;
    remaining: QuotaUsage;
    cachedSlots: number;
    searchableSlots: number;
    searchMaxResults: number;
  };
}

export type SourcingCall = (payload: SourcingCallPayload) => Promise<SourcingBatchSummary>;

function callable<TRes>(name: "autoSourceVideos" | "refreshSlotVideo") {
  return httpsCallable<SourcingCallPayload, TRes>(getFunctionsInstance(), name);
}

/** 확인 다이얼로그용 견적. 쿼터를 소비하지 않는다. */
export async function previewSourcingQuota(
  targets: SourcingTarget[],
  categoryKeywords: string[],
): Promise<SourcingQuotaPreview> {
  const res = await callable<SourcingQuotaPreview>("autoSourceVideos")({
    targets,
    categoryKeywords,
    dryRun: true,
  });
  return res.data;
}

export async function autoSourceVideos(
  payload: SourcingCallPayload,
): Promise<SourcingBatchSummary> {
  const res = await callable<SourcingBatchSummary>("autoSourceVideos")(payload);
  return res.data;
}

export async function refreshSlotVideo(
  payload: SourcingCallPayload,
): Promise<SourcingBatchSummary> {
  const res = await callable<SourcingBatchSummary>("refreshSlotVideo")(payload);
  return res.data;
}

export interface SourcingRunInput {
  targets: SourcingTarget[];
  categoryKeywords: string[];
  /** 이 실행이 건드리지 않는 슬롯들이 이미 쓰고 있는 videoId. */
  excludeVideoIds: string[];
  batchSize?: number;
}

export interface SourcingRunHandlers {
  call: SourcingCall;
  /** 배치 하나가 끝날 때마다 — 그리드 주입은 여기서 즉시 일어난다(부분 결과 보존). */
  onBatch(batch: SourcingBatchSummary): void;
  /** 진행률 "done/total". */
  onProgress(done: number, total: number): void;
}

export interface SourcingRunResult {
  tally: SourcingRunTally;
  /** 끝까지 못 간 경우 남은 슬롯 수 — 쿼터 소진 등으로 중단됐음을 화면이 말한다. */
  remaining: number;
  /** 중단시킨 오류. 끝까지 갔으면 null. */
  error: unknown;
}

/**
 * 배치를 순차로 돌린다.
 *
 * **부분 결과를 버리지 않는다**: 4배치까지 성공하고 5배치에서 쿼터가 끊기면 앞의
 * 32명은 그리드에 남고, 화면은 "16칸 남음 + 사유"를 말한다. 여기서 throw로 통째
 * 롤백하면 운영자는 그날치 search 콜을 태우고도 아무것도 못 얻는다.
 */
export async function runSourcingBatches(
  input: SourcingRunInput,
  handlers: SourcingRunHandlers,
): Promise<SourcingRunResult> {
  const batches = chunkTargets(input.targets, input.batchSize ?? MAX_BATCH_TARGETS);
  const excluded = new Set(input.excludeVideoIds);
  let tally = EMPTY_TALLY;
  let done = 0;

  handlers.onProgress(0, input.targets.length);

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    let summary: SourcingBatchSummary;
    try {
      summary = await handlers.call({
        targets: batch,
        categoryKeywords: input.categoryKeywords,
        excludeVideoIds: Array.from(excluded),
      });
    } catch (error) {
      return { tally, remaining: input.targets.length - done, error };
    }

    // 이번 배치가 확정한 영상을 다음 배치의 회피 목록에 넣는다(배치 간 중복 방지).
    for (const result of summary.results) {
      const id = result.verdict?.videoId;
      if (id) excluded.add(id);
    }

    handlers.onBatch(summary);
    tally = addToTally(tally, summary);
    done += batch.length;
    handlers.onProgress(done, input.targets.length);
  }

  return { tally, remaining: 0, error: null };
}
