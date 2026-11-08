/**
 * 엔트리 그림 콜러블 두 개의 브라우저 쪽 손잡이 (IMAGE-1 PR 1 · 원장 D-77).
 * 서버: functions/src/importEntryImage.ts · finalizeEntryImages.ts.
 */
import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "@/lib/firebase";
import type { FinalizeArgs, FinalizedImage } from "@/lib/lab/publishImages";

export type ImportFailure = "fetch-failed" | "not-image" | "too-large" | "too-small";

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

export async function callImportEntryImage(args: {
  draftId: string;
  slot: number;
  url: string;
}): Promise<ImportEntryImageResult> {
  const fn = httpsCallable<typeof args, ImportEntryImageResult>(getFunctionsInstance(), "importEntryImage", {
    timeout: 70_000,
  });
  return (await fn(args)).data;
}

export async function callFinalizeEntryImages(args: FinalizeArgs): Promise<Record<number, FinalizedImage>> {
  const fn = httpsCallable<FinalizeArgs, { images: Record<number, FinalizedImage> }>(
    getFunctionsInstance(),
    "finalizeEntryImages",
    { timeout: 130_000 },
  );
  return (await fn(args)).data.images;
}

export async function callCleanupEntryImages(draftId: string): Promise<void> {
  const fn = httpsCallable<{ draftId: string; cleanup: true }, unknown>(getFunctionsInstance(), "finalizeEntryImages");
  await fn({ draftId, cleanup: true });
}
