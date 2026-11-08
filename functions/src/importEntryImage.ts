/**
 * importEntryImage — ④ 칸마다 URL 한 장 (IMAGE-1 PR 1 · 원장 D-77).
 *
 *   { draftId, slot, url } → { ok: true, url, thumbUrl, storagePath, width, height, addedAt, sourceUrl, sourcePage }
 *                          | { ok: false, reason: "fetch-failed" | "not-image" | "too-large" | "too-small" }
 *
 * 관리자 게이트(autoSourceVideos 와 같은 방식) → 내려받기(10초 · 10MB · image/*) → 긴 변 1600 jpg +
 * 600 jpg → `entry-images/drafts/{uid}/{draftId}/{slot}.jpg` · `{slot}_600.jpg`. 바깥 주소는
 * 기록만 하고 화면에는 우리 복사본만 나간다. PR 2 의 URL 48줄이 같은 함수를 돌려 쓴다.
 *
 * 실패 이유는 오류가 아니라 **값**으로 돌려준다 — 화면이 이유 문구(6절 ⓑ)를 칸 옆에 그대로 보인다.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { ALLOWED_ORIGINS } from "./cors";
import { requireAdmin } from "./core/requireAdmin";
import { adminStorage } from "./admin";
import {
  ImportError,
  draftImagePath,
  fetchImageBytes,
  parseImportRequest,
  resizeToJpegs,
  thumbPathOf,
  type ImportFailure,
} from "./core/entryImageCore";
import { publicStorageUrl } from "./_embed/storageUrl";

export type ImportEntryImageResult =
  | {
      ok: true;
      url: string;
      thumbUrl: string;
      storagePath: string;
      width: number;
      height: number;
      addedAt: number;
      sourceUrl: string;
      sourcePage: string;
    }
  | { ok: false; reason: ImportFailure };

const CACHE = "public,max-age=31536000";
/** 에뮬레이터에서는 주소 앞부분이 에뮬레이터다(실서비스는 기본값). */
const ORIGIN = process.env.FIREBASE_STORAGE_EMULATOR_HOST
  ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`
  : undefined; // 주소 끝 &v= 가 바뀌므로 길게 둬도 옛 그림이 남지 않는다

export const importEntryImage = onCall(
  { cors: ALLOWED_ORIGINS, secrets: ["ADMIN_UID"], timeoutSeconds: 60, memory: "1GiB" },
  async (req): Promise<ImportEntryImageResult> => {
    requireAdmin(req.auth?.uid, process.env.ADMIN_UID);
    const uid = req.auth!.uid;
    const input = parseImportRequest(req.data);
    if (!input) throw new HttpsError("invalid-argument", "draftId · slot(0~47) · url 이 필요합니다.");

    try {
      const bytes = await fetchImageBytes(input.url, {
        // 에뮬레이터 시험만 로컬 가짜 서버를 부른다. 실서비스는 내부 주소를 막는다.
        allowLoopback: process.env.FUNCTIONS_EMULATOR === "true",
      });
      const r = await resizeToJpegs(bytes);
      const storagePath = draftImagePath(uid, input.draftId, input.slot);
      const bucket = adminStorage.bucket();
      const meta = { contentType: "image/jpeg", cacheControl: CACHE };
      await Promise.all([
        bucket.file(storagePath).save(r.full, { resumable: false, metadata: meta }),
        bucket.file(thumbPathOf(storagePath)).save(r.thumb, { resumable: false, metadata: meta }),
      ]);
      const addedAt = Date.now();
      return {
        ok: true,
        url: publicStorageUrl(bucket.name, storagePath, addedAt, ORIGIN),
        thumbUrl: publicStorageUrl(bucket.name, thumbPathOf(storagePath), addedAt, ORIGIN),
        storagePath,
        width: r.width,
        height: r.height,
        addedAt,
        // ④ 는 그림 주소 = 출처 페이지(무대에는 도메인 글자만).
        sourceUrl: input.url,
        sourcePage: input.url,
      };
    } catch (err) {
      if (err instanceof ImportError) {
        logger.info("importEntryImage refused", { reason: err.code, detail: err.message });
        return { ok: false, reason: err.code };
      }
      logger.error("importEntryImage failed", err);
      throw new HttpsError("internal", "그림을 저장하지 못했습니다.");
    }
  },
);
