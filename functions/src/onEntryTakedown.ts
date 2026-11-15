/**
 * onEntryTakedown — 내린 엔트리가 Champion 인 크라운 카드를 이니셜로 다시 굽는다 (IMAGE-1 PR 3 · 원장 D-77 · D-93).
 *
 * takeDownEntry 가 `entry_takedowns/{contestantId}` 를 만들면 시작하고, 한 번에 한 쪽(50장)씩 굽는다. 한 쪽을 마치면
 * 기록의 `rebake.cursor` 가 바뀌고 — 그 쓰기가 이 트리거를 다시 부른다. 그래서 카드가 많아도 함수 시간 제한에 걸리지 않는다.
 * 다른 칸만 바뀐 쓰기(장수 적기 등)는 건너뛴다. 끝나면 `rebake.finishedAt`.
 *
 * 같은 저장 경로에 덮어쓰고(짧은 캐시) 카드 문서 주소 끝 `&v=` 를 바꾼다. 굽기 실패는 onChampionConfirmed 와 같이
 * "render failed" 로그를 남긴다(대표 메일 알림 조건 — 바꾸지 마라) — 다시 시도로 폭주하지 않게 던지지 않는다.
 */
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb, adminStorage } from "./admin";
import { renderCrownPng } from "./core/canvasServer";
import { crownPngInput } from "./core/onChampionConfirmedCore";
import { rebakeTakedownPage } from "./core/entryTakedownStore";

type Rebake = { cursor?: string | null; finishedAt?: unknown } | undefined;

export const onEntryTakedown = onDocumentWritten(
  { document: "entry_takedowns/{contestantId}", timeoutSeconds: 300, memory: "512MiB" },
  async (event) => {
    const before = event.data?.before.data()?.rebake as Rebake;
    const after = event.data?.after.data()?.rebake as Rebake;
    if (!after || after.finishedAt) return;
    const created = !event.data?.before.exists;
    if (!created && (before?.cursor ?? null) === (after.cursor ?? null)) return;

    const bucket = adminStorage.bucket();
    try {
      await rebakeTakedownPage(adminDb, {
        nowMs: () => Date.now(),
        timestamp: (ms) => Timestamp.fromMillis(ms),
        render: ({ tournamentId, tournament, contestant }) =>
          renderCrownPng(crownPngInput({ tournamentId, tournament, contestant })),
        saveCard: async (path, png) => {
          await bucket.file(path).save(png, {
            contentType: "image/png",
            resumable: false,
            metadata: { cacheControl: "public,max-age=60" },
          });
        },
      }, event.params.contestantId);
    } catch (err) {
      console.error(`[onEntryTakedown] render failed for takedown ${event.params.contestantId} — skipping without retry:`, err);
    }
  },
);
