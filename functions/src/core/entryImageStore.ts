/**
 * entryImageStore — 초안 칸 그림 저장 (IMAGE-1 PR 1 · PR 2 공용).
 *
 * ④ 칸마다 URL(importEntryImage)과 ② 이미지 검색 AI(autoSourceImages)가 같은 자리
 * `entry-images/drafts/{uid}/{draftId}/{slot}.jpg` · `{slot}_600.jpg` 에 같은 모양으로 둔다.
 */
import { adminStorage } from "../admin";
import { publicStorageUrl } from "../_embed/storageUrl";
import { draftImagePath, thumbPathOf } from "./entryImageCore";

const CACHE = "public,max-age=31536000";
/** 에뮬레이터에서는 주소 앞부분이 에뮬레이터다(실서비스는 기본값). */
const ORIGIN = process.env.FIREBASE_STORAGE_EMULATOR_HOST
  ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`
  : undefined; // 주소 끝 &v= 가 바뀌므로 길게 둬도 옛 그림이 남지 않는다

export async function saveDraftImage(
  uid: string,
  draftId: string,
  slot: number,
  r: { full: Buffer; thumb: Buffer; width: number; height: number },
): Promise<{ url: string; thumbUrl: string; storagePath: string; width: number; height: number; addedAt: number }> {
  const storagePath = draftImagePath(uid, draftId, slot);
  const bucket = adminStorage.bucket();
  const meta = { contentType: "image/jpeg", cacheControl: CACHE };
  await Promise.all([
    bucket.file(storagePath).save(r.full, { resumable: false, metadata: meta }),
    bucket.file(thumbPathOf(storagePath)).save(r.thumb, { resumable: false, metadata: meta }),
  ]);
  const addedAt = Date.now();
  return {
    url: publicStorageUrl(bucket.name, storagePath, addedAt, ORIGIN),
    thumbUrl: publicStorageUrl(bucket.name, thumbPathOf(storagePath), addedAt, ORIGIN),
    storagePath,
    width: r.width,
    height: r.height,
    addedAt,
  };
}
