/**
 * finalizeEntryImages — 발행 때 초안 그림을 대회 경로로 복사 (IMAGE-1 PR 1 · 원장 D-77).
 *
 *   { draftId, tournamentId, slots: [{ slot, storagePath }] }
 *        → { images: { [slot]: { url, thumbUrl, storagePath } } }
 *   { draftId, cleanup: true } → { deleted: n }   (배치 성공 뒤 초안 경로 파일 전부 삭제)
 *
 * 발행 흐름: 화면이 Tournament id 를 먼저 정하고(doc()) → 이 함수로 복사 → 돌려받은 주소로
 * writeBatch → 성공하면 cleanup. 배치가 실패하면 tournaments 경로에 복사본이 남는다(주 1회
 * 청소는 PR 3). 초안 파일은 그대로라 다시 발행할 수 있다.
 *
 * 복사는 **칸이 들고 있는 경로**에서 한다(planFinalize) — 칸을 옮겨도 그림이 따라간다.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import { adminStorage } from "./admin";
import { draftImageDir, planFinalize } from "./core/entryImageCore";
import { publicStorageUrl } from "./_embed/storageUrl";

export interface FinalizedImage {
  url: string;
  thumbUrl: string;
  storagePath: string;
}

const CACHE = "public,max-age=31536000";

export const finalizeEntryImages = onCall(
  { cors: ALLOWED_ORIGINS, secrets: ["ADMIN_UID"], timeoutSeconds: 120 },
  async (req) => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);
    const uid = req.auth!.uid;
    const d = (req.data ?? {}) as Record<string, unknown>;
    const draftId = typeof d.draftId === "string" ? d.draftId : "";
    const bucket = adminStorage.bucket();

    if (d.cleanup === true) {
      if (!/^[A-Za-z0-9]{1,64}$/.test(draftId)) throw new HttpsError("invalid-argument", "draftId");
      const [files] = await bucket.getFiles({ prefix: draftImageDir(uid, draftId) });
      await Promise.all(files.map((f) => f.delete({ ignoreNotFound: true })));
      return { deleted: files.length };
    }

    const tournamentId = typeof d.tournamentId === "string" ? d.tournamentId : "";
    const slots = Array.isArray(d.slots) ? (d.slots as { slot: number; storagePath: string }[]) : null;
    if (!slots) throw new HttpsError("invalid-argument", "slots");
    let plan;
    try {
      plan = planFinalize(uid, draftId, tournamentId, slots);
    } catch (e) {
      throw new HttpsError("invalid-argument", String((e as Error).message));
    }

    const version = Date.now();
    const images: Record<number, FinalizedImage> = {};
    await Promise.all(
      plan.map(async (step) => {
        await bucket.file(step.from).copy(bucket.file(step.to));
        // 600 사본이 없으면(옛 칸 · 올리다 끊김) 원본 주소로 물러난다 — 발행을 막지 않는다.
        let thumbOk = true;
        try {
          await bucket.file(step.fromThumb).copy(bucket.file(step.toThumb));
        } catch (e) {
          thumbOk = false;
          logger.warn("finalizeEntryImages thumb missing", { from: step.fromThumb, err: String(e) });
        }
        await bucket.file(step.to).setMetadata({ cacheControl: CACHE }).catch(() => undefined);
        const url = publicStorageUrl(bucket.name, step.to, version);
        images[step.slot] = {
          url,
          thumbUrl: thumbOk ? publicStorageUrl(bucket.name, step.toThumb, version) : url,
          storagePath: step.to,
        };
      }),
    ).catch((e) => {
      if (e instanceof HttpsError) throw e;
      logger.error("finalizeEntryImages copy failed", e);
      throw new HttpsError("internal", "그림을 대회로 옮기지 못했습니다.");
    });
    return { images };
  },
);
