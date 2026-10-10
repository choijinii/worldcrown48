/**
 * scheduleYouTubeDataRefresh — YouTube API 자료 30일 지키기 (POLICY-YT-1 · 개발자 정책 III.E.4).
 *
 * 매일 04:30 KST 한 번. 판정은 전부 core/apiDataRetention 에 있다.
 *
 *   ① video_search_cache — 25일 넘은 문서는 videos.list 로 제목·채널 이름을 새로 받아
 *      `apiRefreshedAt` 에 그 시각을 적는다(7일 신선도가 쓰는 `cachedAt` 은 그대로).
 *      없어진 영상은 그 후보만 빼고, 후보가 0개가 되거나 · 새로 받기에 실패하거나 ·
 *      30일을 넘긴 문서는 지운다.
 *   ② 끝난 대회(status "ended")의 재생 판정 `contestants.media.embed.status` ·
 *      `tournaments.videoAlert` 를 지운다(할당량 0). 다시 진행 중이 되면 월요일
 *      scheduleEmbedRecheck 가 다시 채운다(대표 결정 2026-10-10).
 *
 * 할당량: videos.list 는 콜당 1유닛(id 50개까지) — 기존 youtube_quota 계수기에 예약·정산한다
 * (새 키·새 시크릿 없음). 쓴 양은 로그 한 줄로 남긴다.
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { MAX_VIDEOS_PER_CALL } from "./_embed/constants";
import type { SearchCandidate } from "./_embed/sourcing/types";
import type { YouTubeApiItem } from "./_embed/verdict";
import {
  planCacheRetention,
  planEndedEmbedCleanup,
  refreshCandidates,
} from "./core/apiDataRetention";
import { createYouTubeGateway } from "./youtubeGateway";
import { reserveYouTubeQuota, settleYouTubeQuota } from "./youtubeQuota";
import { VIDEO_SEARCH_CACHE_COLLECTION } from "./videoSearchCache";

/** Firestore writeBatch 상한(500)보다 넉넉히 낮게. */
const WRITE_CHUNK = 400;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function toCandidates(value: unknown): SearchCandidate[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((c) => ({
      videoId: String((c as { videoId?: unknown })?.videoId ?? ""),
      title: String((c as { title?: unknown })?.title ?? ""),
      channelTitle: String((c as { channelTitle?: unknown })?.channelTitle ?? ""),
    }))
    .filter((c) => c.videoId !== "");
}

type Write =
  | { kind: "delete"; ref: FirebaseFirestore.DocumentReference }
  | { kind: "update"; ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> };

async function commitWrites(writes: Write[]): Promise<void> {
  for (const group of chunk(writes, WRITE_CHUNK)) {
    const batch = adminDb.batch();
    for (const w of group) {
      if (w.kind === "delete") batch.delete(w.ref);
      else batch.update(w.ref, w.data);
    }
    await batch.commit();
  }
}

/** ① 검색 캐시 — 새로 받기 · 지우기. */
async function refreshSearchCache(apiKey: string | undefined, nowMs: number): Promise<string> {
  const snap = await adminDb.collection(VIDEO_SEARCH_CACHE_COLLECTION).get();
  const writes: Write[] = [];
  const toRefresh: { ref: FirebaseFirestore.DocumentReference; candidates: SearchCandidate[] }[] = [];
  let expired = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const plan = planCacheRetention(data, nowMs);
    if (plan === "keep") continue;
    const candidates = toCandidates(data.candidates);
    if (plan === "delete" || candidates.length === 0) {
      writes.push({ kind: "delete", ref: doc.ref });
      expired += 1;
      continue;
    }
    toRefresh.push({ ref: doc.ref, candidates });
  }

  const ids = [...new Set(toRefresh.flatMap((d) => d.candidates.map((c) => c.videoId)))];
  const batches = chunk(ids, MAX_VIDEOS_PER_CALL);
  const items = new Map<string, YouTubeApiItem>();
  const failedIds = new Set<string>();
  let apiCalls = 0;
  let reserved = 0;

  if (batches.length > 0 && !apiKey) {
    // 키가 없으면 새로 받을 수 없다 = 새로 받기 실패 → 지운다(R4).
    logger.error("scheduleYouTubeDataRefresh: YOUTUBE_API_KEY unset — refresh impossible, deleting due docs");
    ids.forEach((id) => failedIds.add(id));
  } else if (batches.length > 0) {
    try {
      await reserveYouTubeQuota({ searchCalls: 0, units: batches.length });
      reserved = batches.length;
    } catch (err) {
      logger.warn("scheduleYouTubeDataRefresh: quota reserve failed — refresh skipped", err);
      ids.forEach((id) => failedIds.add(id));
    }
  }

  if (reserved > 0 && apiKey) {
    const gateway = createYouTubeGateway(apiKey);
    for (const group of batches) {
      try {
        apiCalls += 1;
        for (const item of await gateway.listVideos(group)) items.set(item.id, item);
      } catch (err) {
        logger.warn("scheduleYouTubeDataRefresh: videos.list failed", err);
        group.forEach((id) => failedIds.add(id));
      }
    }
    if (apiCalls < reserved) await settleYouTubeQuota({ searchCalls: 0, units: apiCalls - reserved });
  }

  let refreshed = 0;
  let failed = 0;
  let dropped = 0;
  for (const d of toRefresh) {
    // 새로 받기 실패 = 지운다(R4). 응답이 없었던 영상은 '없어짐'과 구별할 수 없으므로.
    if (d.candidates.some((c) => failedIds.has(c.videoId))) {
      writes.push({ kind: "delete", ref: d.ref });
      failed += 1;
      continue;
    }
    const next = refreshCandidates(
      d.candidates,
      d.candidates.map((c) => items.get(c.videoId)).filter((i): i is YouTubeApiItem => !!i),
    );
    dropped += d.candidates.length - next.length;
    if (next.length === 0) {
      writes.push({ kind: "delete", ref: d.ref });
      failed += 1;
      continue;
    }
    writes.push({ kind: "update", ref: d.ref, data: { candidates: next, apiRefreshedAt: nowMs } });
    refreshed += 1;
  }

  await commitWrites(writes);
  return `cache ${snap.size} docs · refreshed ${refreshed} · deleted ${expired + failed} (expired ${expired}, failed/empty ${failed}) · videos gone ${dropped} · videos.list ×${apiCalls} (${apiCalls} units)`;
}

/** ② 끝난 대회의 재생 판정 지우기 — 할당량 0. */
async function clearEndedEmbedStatus(): Promise<string> {
  const ended = await adminDb.collection("tournaments").where("status", "==", "ended").get();
  if (ended.empty) return "ended Tournaments 0";

  // 판정이 남은 Contestant 만 — 재검사는 문제 있는 칸에만 쓰므로 수가 작다.
  // 단일 필드 조건이라 복합 인덱스가 필요 없다.
  const marked = await adminDb
    .collection("contestants")
    .where("media.embed.status.checkedAt", ">", 0)
    .get();

  const plan = planEndedEmbedCleanup(
    ended.docs.map((d) => ({ id: d.id, status: "ended", hasVideoAlert: d.get("videoAlert") != null })),
    marked.docs.map((d) => ({
      id: d.id,
      tournamentId: String(d.get("tournamentId") ?? ""),
      hasEmbedStatus: true,
    })),
  );

  await commitWrites([
    ...plan.contestantIds.map(
      (id): Write => ({
        kind: "update",
        ref: adminDb.collection("contestants").doc(id),
        data: { "media.embed.status": FieldValue.delete() },
      }),
    ),
    ...plan.tournamentIds.map(
      (id): Write => ({
        kind: "update",
        ref: adminDb.collection("tournaments").doc(id),
        data: { videoAlert: FieldValue.delete() },
      }),
    ),
  ]);
  return `ended Tournaments ${ended.size} · cleared embed status ${plan.contestantIds.length} · videoAlert ${plan.tournamentIds.length}`;
}

export const scheduleYouTubeDataRefresh = onSchedule(
  {
    schedule: "30 4 * * *", // 매일 04:30
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    secrets: ["YOUTUBE_API_KEY"],
    timeoutSeconds: 540,
  },
  async () => {
    const nowMs = Date.now();
    // ② 는 키가 필요 없다 — 키가 없어도 끝난 대회 정리는 한다.
    try {
      logger.info(`scheduleYouTubeDataRefresh: ${await clearEndedEmbedStatus()}`);
    } catch (err) {
      logger.error("scheduleYouTubeDataRefresh: ended cleanup failed", err);
    }

    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      logger.info(`scheduleYouTubeDataRefresh: ${await refreshSearchCache(apiKey, nowMs)}`);
    } catch (err) {
      // 크론은 throw 로 죽지 않는다 — 내일 다시 돈다(25일 기준이라 여유 5일).
      logger.error("scheduleYouTubeDataRefresh: cache refresh failed", err);
    }
  },
);
