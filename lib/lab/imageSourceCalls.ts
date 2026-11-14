/**
 * autoSourceImages 콜러블의 브라우저 쪽 손잡이 (IMAGE-1 PR 2 · 서버: functions/src/autoSourceImages.ts).
 * 함수 제한 시간이 540초라 브라우저 쪽은 그보다 조금 길게 기다린다.
 */
import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "@/lib/firebase";
import type { AutoSourceImagesResponse, ImageTarget } from "@/lib/lab/imageSourcing";

export async function callAutoSourceImages(args: {
  draftId: string;
  slots: ImageTarget[];
  excludeUrls: string[];
}): Promise<AutoSourceImagesResponse> {
  const fn = httpsCallable<typeof args, AutoSourceImagesResponse>(getFunctionsInstance(), "autoSourceImages", {
    timeout: 560_000,
  });
  return (await fn(args)).data;
}
