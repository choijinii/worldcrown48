/**
 * scheduleYouTubeDataRetention — YouTube API 자료 30일 지키기 (POLICY-YT-1 · 개발자 정책 III.E.4).
 *
 * 매일 04:30 KST 한 번. 판정은 전부 core/apiDataRetention 에 있다. **할당량 0** — YouTube API 를
 * 부르지 않으므로 키·시크릿도 쓰지 않는다.
 *
 *   ① video_search_cache — 7일 신선도를 넘긴 문서를 지운다. 검색 쪽이 이미 안 쓰는 문서라
 *      지워도 검색 횟수는 그대로다(대표 결정 2026-10-10 — 새로 받지 않고 지우기).
 *   ② 끝난 대회(status "ended")의 재생 판정 `contestants.media.embed.status` ·
 *      `tournaments.videoAlert` 를 지운다. 다시 진행 중이 되면 월요일
 *      scheduleEmbedRecheck 가 다시 채운다(대표 결정 2026-10-10).
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { planCacheRetention, planEndedEmbedCleanup } from "./core/apiDataRetention";
import { VIDEO_SEARCH_CACHE_COLLECTION } from "./videoSearchCache";

/** Firestore writeBatch 상한(500)보다 넉넉히 낮게. */
const WRITE_CHUNK = 400;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
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

/** ① 검색 캐시 — 7일 지난 문서 지우기. 문서 수는 검색어 종류만큼(수백)이라 전체를 읽는다. */
async function purgeSearchCache(nowMs: number): Promise<string> {
  const snap = await adminDb.collection(VIDEO_SEARCH_CACHE_COLLECTION).get();
  const stale = snap.docs.filter((d) => planCacheRetention(d.data(), nowMs) === "delete");
  await commitWrites(stale.map((d): Write => ({ kind: "delete", ref: d.ref })));
  return `cache ${snap.size} docs · deleted ${stale.length} (older than 7 days)`;
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

export const scheduleYouTubeDataRetention = onSchedule(
  {
    schedule: "30 4 * * *", // 매일 04:30
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
  },
  async () => {
    const nowMs = Date.now();
    // 둘은 서로 독립 — 하나가 실패해도 다른 하나는 돈다. 크론은 throw 로 죽지 않는다(내일 다시 돈다).
    try {
      logger.info(`scheduleYouTubeDataRetention: ${await clearEndedEmbedStatus()}`);
    } catch (err) {
      logger.error("scheduleYouTubeDataRetention: ended cleanup failed", err);
    }

    try {
      logger.info(`scheduleYouTubeDataRetention: ${await purgeSearchCache(nowMs)}`);
    } catch (err) {
      logger.error("scheduleYouTubeDataRetention: cache purge failed", err);
    }
  },
);
