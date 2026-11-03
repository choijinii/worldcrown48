/**
 * scheduleEmbedRecheck — 주간 임베드 재검증 크론 (LAB-EV-1 W7).
 *
 * 매주 월 05:00 KST, **모든 Tournament의 영상**을 전수 재검증한다(YT-FIX-1 · 개발자 정책 III.E.4 —
 * 끝난 대회 · 초안의 영상 ID 도 30일 안에 한 번 확인). 진행 중인 대회의 카드가 검은 사각형이 되면
 * 그 Match는 그대로 망가진다.
 *
 * 쿼터: videos.list는 콜당 1유닛(id 50개까지). 대회 20개(960영상)라도
 * 20콜 = 20유닛/주. 일일 10,000 한도에 비하면 무시할 수 있다.
 *
 * 결과는 세 곳에 남는다:
 *   · contestant.media.embed.status — 어느 칸이 왜 죽었는지 (운영자가 고칠 자리 · 마감 전 대회만)
 *   · tournament.videoAlert         — 목록 화면의 ⚠️ 배지 (48칸을 안 읽어도 되게 · 마감 전 대회만)
 *   · contestant.media.embed.gone   — 내려간·비공개 영상 (모든 대회 · 썸네일 대신 이름 첫 글자)
 *
 * 알림 고도화(메일·Slack)는 후속 — 지금은 문서 + 로그까지다(킥 W7).
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { MAX_VIDEOS_PER_CALL } from "./_embed/constants";
import { buildVerdicts, type LinkVerdict } from "./_embed/verdict";
import { isDeadlinePassed, toDeadlineMs } from "./_run/deadline";
import {
  collectVideoIds,
  planGoneUpdates,
  planRecheckUpdates,
  splitByDeadline,
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
      const allSnap = await adminDb.collection("tournaments").select("tournamentDeadline").get();
      if (allSnap.empty) {
        logger.info("scheduleEmbedRecheck: no Tournament — skip");
        return;
      }
      const nowMs = Date.now();
      const endedIds = new Set(
        allSnap.docs
          .filter((d) => isDeadlinePassed(toDeadlineMs(d.get("tournamentDeadline")), nowMs))
          .map((d) => d.id),
      );

      // 대회별로 Contestant를 읽고 임베드가 붙은 칸만 추린다. 복합 인덱스를 만들지
      // 않으려고 필터는 메모리에서 한다(대회당 48개 — 읽기가 아깝지 않다).
      const contestants: ContestantEmbedLike[] = [];
      for (const tournament of allSnap.docs) {
        const snap = await adminDb
          .collection("contestants")
          .where("tournamentId", "==", tournament.id)
          .get();
        for (const doc of snap.docs) {
          const media = doc.data().media as
            | {
                type?: string;
                embed?: { videoId?: string; gone?: boolean; status?: { embeddable?: boolean } };
              }
            | undefined;
          const videoId = media?.embed?.videoId;
          if (media?.type !== "embed" || !videoId) continue;
          contestants.push({
            id: doc.id,
            tournamentId: tournament.id,
            videoId,
            storedEmbeddable: media.embed?.status?.embeddable,
            storedGone: media.embed?.gone,
          });
        }
      }

      if (contestants.length === 0) {
        logger.info("scheduleEmbedRecheck: no embeds — skip");
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
      const { open } = splitByDeadline(contestants, endedIds);
      const updates = planRecheckUpdates(open, verdicts, now);
      for (const group of chunk(updates, WRITE_CHUNK)) {
        const batch = adminDb.batch();
        for (const u of group) {
          batch.update(adminDb.collection("contestants").doc(u.contestantId), {
            "media.embed.status": u.status,
          });
        }
        await batch.commit();
      }

      const goneUpdates = planGoneUpdates(contestants, verdicts);
      for (const group of chunk(goneUpdates, WRITE_CHUNK)) {
        const batch = adminDb.batch();
        for (const u of group) {
          batch.update(adminDb.collection("contestants").doc(u.contestantId), {
            "media.embed.gone": u.gone ? true : FieldValue.delete(),
          });
        }
        await batch.commit();
      }

      const alerts = summarizeAlerts(open, verdicts, now);
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
        `scheduleEmbedRecheck: ${contestants.length} embeds in ${allSnap.size} Tournament(s) (${endedIds.size} ended) · videos.list ×${apiCalls} · ${updates.length} marked · ${failed} blocked · ${goneUpdates.length} gone changed`,
      );
    } catch (err) {
      // 크론은 절대 throw로 죽지 않는다 — 다음 주에 다시 돈다.
      logger.error("scheduleEmbedRecheck: failed", err);
    }
  },
);
