/**
 * scheduleEmbedRecheck — 주간 임베드 재검증 크론 (LAB-EV-1 W7).
 *
 * 매주 월 05:00 KST, **라이브 Tournament의 영상만** 전수 재검증한다. 끝난 대회의
 * 링크가 썩는 건 아무도 아프지 않지만, 진행 중인 대회의 카드가 검은 사각형이 되면
 * 그 Match는 그대로 망가진다.
 *
 * 쿼터: videos.list는 콜당 1유닛(id 50개까지). 라이브 대회 10개(480영상)라도
 * 10콜 = 10유닛/주. 일일 10,000 한도에 비하면 무시할 수 있다.
 *
 * 결과는 두 곳에 남는다:
 *   · contestant.media.embed.status — 어느 칸이 왜 죽었는지 (운영자가 고칠 자리)
 *   · tournament.videoAlert         — 목록 화면의 ⚠️ 배지 (48칸을 안 읽어도 되게)
 *
 * 알림 고도화(메일·Slack)는 후속 — 지금은 문서 + 로그까지다(킥 W7).
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { adminDb } from "./admin";
import { MAX_VIDEOS_PER_CALL } from "./_embed/constants";
import { buildVerdicts, type LinkVerdict } from "./_embed/verdict";
import {
  collectVideoIds,
  planRecheckUpdates,
  summarizeAlerts,
  type ContestantEmbedLike,
} from "./core/embedRecheckCore";
import { createYouTubeGateway } from "./youtubeGateway";

/** Firestore writeBatch 상한(500)보다 넉넉히 낮게 — 갱신은 나눠 쓴다. */
const WRITE_CHUNK = 400;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export const scheduleEmbedRecheck = onSchedule(
  {
    schedule: "0 5 * * 1", // 월요일 05:00
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    secrets: ["YOUTUBE_API_KEY"],
    timeoutSeconds: 540,
  },
  async () => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      logger.error("scheduleEmbedRecheck: YOUTUBE_API_KEY unset — skipping");
      return;
    }

    try {
      const liveSnap = await adminDb
        .collection("tournaments")
        .where("status", "==", "active")
        .get();
      if (liveSnap.empty) {
        logger.info("scheduleEmbedRecheck: no active Tournament — skip");
        return;
      }

      // 대회별로 Contestant를 읽고 임베드가 붙은 칸만 추린다. 복합 인덱스를 만들지
      // 않으려고 필터는 메모리에서 한다(대회당 48개 — 읽기가 아깝지 않다).
      const contestants: ContestantEmbedLike[] = [];
      for (const tournament of liveSnap.docs) {
        const snap = await adminDb
          .collection("contestants")
          .where("tournamentId", "==", tournament.id)
          .get();
        for (const doc of snap.docs) {
          const media = doc.data().media as
            | { type?: string; embed?: { videoId?: string; status?: { embeddable?: boolean } } }
            | undefined;
          const videoId = media?.embed?.videoId;
          if (media?.type !== "embed" || !videoId) continue;
          contestants.push({
            id: doc.id,
            tournamentId: tournament.id,
            videoId,
            storedEmbeddable: media.embed?.status?.embeddable,
          });
        }
      }

      if (contestants.length === 0) {
        logger.info("scheduleEmbedRecheck: no embeds in active Tournaments — skip");
        return;
      }

      const gateway = createYouTubeGateway(apiKey);
      const ids = collectVideoIds(contestants);
      const verdicts: LinkVerdict[] = [];
      let apiCalls = 0;
      for (const batch of chunk(ids, MAX_VIDEOS_PER_CALL)) {
        verdicts.push(...buildVerdicts(batch, await gateway.listVideos(batch)));
        apiCalls += 1;
      }

      const now = Date.now();
      const updates = planRecheckUpdates(contestants, verdicts, now);
      for (const group of chunk(updates, WRITE_CHUNK)) {
        const batch = adminDb.batch();
        for (const u of group) {
          batch.update(adminDb.collection("contestants").doc(u.contestantId), {
            "media.embed.status": u.status,
          });
        }
        await batch.commit();
      }

      const alerts = summarizeAlerts(contestants, verdicts, now);
      for (const group of chunk(alerts, WRITE_CHUNK)) {
        const batch = adminDb.batch();
        for (const a of group) {
          batch.update(adminDb.collection("tournaments").doc(a.tournamentId), {
            videoAlert: { failed: a.failed, warned: a.warned, checkedAt: a.checkedAt },
          });
        }
        await batch.commit();
      }

      const failed = alerts.reduce((sum, a) => sum + a.failed, 0);
      logger.info(
        `scheduleEmbedRecheck: ${contestants.length} embeds in ${liveSnap.size} live Tournament(s) · videos.list ×${apiCalls} · ${updates.length} marked · ${failed} blocked`,
      );
    } catch (err) {
      // 크론은 절대 throw로 죽지 않는다 — 다음 주에 다시 돈다.
      logger.error("scheduleEmbedRecheck: failed", err);
    }
  },
);
