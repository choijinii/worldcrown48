/**
 * 발행 흐름 + 엔트리 그림 (IMAGE-1 PR 1 · 원장 D-77).
 *
 *   ① 대회 id 를 먼저 정한다(doc() — 쓰기 없음)
 *   ② 그림 칸이 있으면 finalizeEntryImages 가 초안 경로 → tournaments/{id}/ 로 복사
 *   ③ 돌려받은 주소로 칸을 갈아 끼워 writeBatch 한 번(Tournament + 엔트리 48 + 초안 삭제)
 *   ④ 성공하면 초안 경로 파일 정리(실패해도 발행은 성공 — 남은 파일은 PR 3 의 주 1회 청소)
 *
 * ③ 이 실패하면 tournaments 경로 복사본이 남는다(PR 3 청소). 초안 파일은 그대로라 다시 발행할 수 있다.
 * 순서·실패 처리만 여기 있고 Firestore·콜러블은 주입한다(시험 가능).
 */
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

export interface FinalizedImage {
  url: string;
  thumbUrl: string;
  storagePath: string;
}

export interface FinalizeArgs {
  draftId: string;
  tournamentId: string;
  slots: { slot: number; storagePath: string }[];
}

export interface PublishImageDeps {
  newTournamentId(): string;
  finalize(args: FinalizeArgs): Promise<Record<number, FinalizedImage>>;
  commit(tournamentId: string, drafts: ContestantDraft[]): Promise<void>;
  cleanup(draftId: string): Promise<void>;
  warn?(message: string, err: unknown): void;
}

const DRAFT_PREFIX = "entry-images/drafts/";

/** 초안 경로에 그림을 든 칸(칸 번호 · 그 칸이 든 경로). */
export function draftImageSlots(drafts: readonly ContestantDraft[]): { slot: number; storagePath: string }[] {
  return drafts.flatMap((d, slot) =>
    d.imageUrl && d.imageStoragePath?.startsWith(DRAFT_PREFIX) ? [{ slot, storagePath: d.imageStoragePath }] : [],
  );
}

export async function publishWithImages(
  deps: PublishImageDeps,
  draftId: string | null,
  drafts: ContestantDraft[],
): Promise<string> {
  const tournamentId = deps.newTournamentId();
  const slots = draftImageSlots(drafts);
  if (slots.length === 0) {
    await deps.commit(tournamentId, drafts);
    return tournamentId;
  }
  if (!draftId) throw new Error("그림이 든 칸은 초안이 있어야 발행할 수 있습니다.");

  const images = await deps.finalize({ draftId, tournamentId, slots });
  const next = drafts.map((d, i) => {
    if (!slots.some((s) => s.slot === i)) return d;
    const img = images[i];
    // 초안 주소가 발행되면 초안 정리 뒤 그림이 깨진다 — 칸이 빠졌으면 발행하지 않는다.
    if (!img) throw new Error(`그림 복사 결과에 칸 ${i + 1} 이 없습니다.`);
    return { ...d, imageUrl: img.url, imageThumbUrl: img.thumbUrl, imageStoragePath: img.storagePath };
  });
  await deps.commit(tournamentId, next);
  try {
    await deps.cleanup(draftId);
  } catch (e) {
    deps.warn?.("초안 그림 정리 실패 — 발행은 끝남", e);
  }
  return tournamentId;
}
