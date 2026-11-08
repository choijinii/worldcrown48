/**
 * ① 파일 48장 · ④ 칸마다 [파일] — 브라우저가 줄여 우리 Storage 에 올린다 (IMAGE-1 PR 1 · 원장 D-77).
 *
 * 긴 변 1600 jpg + 600 jpg 두 장을 canvas 로 만들어 `entry-images/drafts/{uid}/{draftId}/{slot}.jpg` ·
 * `{slot}_600.jpg` 에 올리고, 초안 칸에 넣을 값을 돌려준다. 규칙(storage.rules)이 자기 uid 경로 ·
 * image/* · 10MB 를 지킨다. 대표가 고른 파일은 믿는다 — 세로 하한은 없다(지시서 5절).
 */
import { deleteObject, ref, uploadBytes } from "firebase/storage";
import { getStorageInstance, storageOriginForClient } from "@/lib/firebase";
import { publicStorageUrl } from "@/lib/media/storageUrl";
import { ENTRY_IMAGE_CLIENT, fitLongEdge, type ImageFields } from "@/lib/lab/entryImages";

export type { ImageFields };

const CACHE = "public,max-age=31536000";

async function toJpeg(bitmap: ImageBitmap, max: number): Promise<{ blob: Blob; w: number; h: number }> {
  const { w, h } = fitLongEdge(bitmap.width, bitmap.height, max);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unavailable");
  ctx.fillStyle = "white"; // 투명 png 의 빈 곳이 jpg 에서 검게 되지 않게
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", ENTRY_IMAGE_CLIENT.JPEG_QUALITY));
  if (!blob) throw new Error("jpeg encode failed");
  return { blob, w, h };
}

export function draftImagePath(uid: string, draftId: string, slot: number): string {
  return `entry-images/drafts/${uid}/${draftId}/${slot}.jpg`;
}

export async function uploadEntryImageFile(args: {
  uid: string;
  draftId: string;
  slot: number;
  file: Blob;
}): Promise<ImageFields> {
  const bitmap = await createImageBitmap(args.file);
  try {
    const [full, thumb] = await Promise.all([
      toJpeg(bitmap, ENTRY_IMAGE_CLIENT.LONG_EDGE),
      toJpeg(bitmap, ENTRY_IMAGE_CLIENT.THUMB_EDGE),
    ]);
    const storage = getStorageInstance();
    const path = draftImagePath(args.uid, args.draftId, args.slot);
    const thumbPath = path.replace(/\.jpg$/, "_600.jpg");
    const meta = { contentType: "image/jpeg", cacheControl: CACHE };
    await Promise.all([
      uploadBytes(ref(storage, path), full.blob, meta),
      uploadBytes(ref(storage, thumbPath), thumb.blob, meta),
    ]);
    const addedAt = Date.now();
    const bucket = storage.app.options.storageBucket ?? "";
    const origin = storageOriginForClient();
    return {
      imageUrl: publicStorageUrl(bucket, path, addedAt, origin),
      imageThumbUrl: publicStorageUrl(bucket, thumbPath, addedAt, origin),
      imageStoragePath: path,
      imageSource: { origin: "upload" },
      imageWidth: full.w,
      imageHeight: full.h,
      imageAddedAt: addedAt,
    };
  } finally {
    bitmap.close();
  }
}

/** [그림 지우기] — Storage 의 두 장을 지운다(없으면 조용히 넘어간다). */
export async function deleteEntryImageFiles(storagePath: string | undefined): Promise<void> {
  if (!storagePath?.startsWith("entry-images/drafts/")) return;
  const storage = getStorageInstance();
  const quiet = (p: Promise<void>) => p.catch(() => undefined);
  await Promise.all([
    quiet(deleteObject(ref(storage, storagePath))),
    quiet(deleteObject(ref(storage, storagePath.replace(/\.jpg$/, "_600.jpg")))),
  ]);
}
