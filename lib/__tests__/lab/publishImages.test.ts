/**
 * IMAGE-1 PR 1 — 발행 흐름: 대회 id 먼저 → 그림 복사(finalize) → 한 번에 쓰기(commit) → 초안 그림 정리.
 * 복사 실패 = 발행 실패(쓰지 않음) · 쓰기 실패 = 정리하지 않음(다시 발행 가능) · 정리 실패 = 발행은 성공.
 */
import { describe, expect, it, vi } from "vitest";
import { publishWithImages, type PublishImageDeps } from "@/lib/lab/publishImages";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

const slot = (i: number, extra: Partial<ContestantDraft> = {}): ContestantDraft => ({
  name: `E${i}`,
  nationality: "",
  affiliation: "",
  imageSearchKeyword: "",
  ...extra,
});
const withImage = (i: number, file = i) =>
  slot(i, {
    imageUrl: `draft-url-${file}`,
    imageThumbUrl: `draft-thumb-${file}`,
    imageStoragePath: `entry-images/drafts/u1/d1/${file}.jpg`,
  });

function deps(over: Partial<PublishImageDeps> = {}) {
  const calls: string[] = [];
  const d: PublishImageDeps = {
    newTournamentId: () => "T1",
    finalize: vi.fn(async ({ slots }) => {
      calls.push("finalize");
      return Object.fromEntries(
        slots.map((s: { slot: number }) => [
          s.slot,
          { url: `final-${s.slot}`, thumbUrl: `final-thumb-${s.slot}`, storagePath: `entry-images/tournaments/T1/${s.slot}.jpg` },
        ]),
      );
    }),
    commit: vi.fn(async () => {
      calls.push("commit");
    }),
    cleanup: vi.fn(async () => {
      calls.push("cleanup");
    }),
    ...over,
  };
  return { d, calls };
}

describe("publishWithImages", () => {
  it("그림 칸이 없으면 finalize · cleanup 을 부르지 않는다", async () => {
    const { d, calls } = deps();
    const id = await publishWithImages(d, "d1", [slot(0), slot(1)]);
    expect(id).toBe("T1");
    expect(calls).toEqual(["commit"]);
  });

  it("그림 칸 → finalize(칸이 든 경로) → 주소를 갈아 끼워 commit → cleanup", async () => {
    const { d, calls } = deps();
    // 칸 0 에 옛 칸 5번 파일이 들어 있다(칸 옮김).
    await publishWithImages(d, "d1", [withImage(0, 5), slot(1), withImage(2)]);
    expect(calls).toEqual(["finalize", "commit", "cleanup"]);
    expect(d.finalize).toHaveBeenCalledWith({
      draftId: "d1",
      tournamentId: "T1",
      slots: [
        { slot: 0, storagePath: "entry-images/drafts/u1/d1/5.jpg" },
        { slot: 2, storagePath: "entry-images/drafts/u1/d1/2.jpg" },
      ],
    });
    const [tid, drafts] = (d.commit as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(tid).toBe("T1");
    expect(drafts[0]).toMatchObject({
      imageUrl: "final-0",
      imageThumbUrl: "final-thumb-0",
      imageStoragePath: "entry-images/tournaments/T1/0.jpg",
    });
    expect(drafts[1].imageUrl).toBeUndefined();
    expect(drafts[2].imageUrl).toBe("final-2");
    expect(d.cleanup).toHaveBeenCalledWith("d1");
  });

  it("commit 실패 → cleanup 을 부르지 않고 오류를 다시 던진다(초안 그림이 남아 다시 발행 가능)", async () => {
    const { d, calls } = deps({ commit: vi.fn(async () => Promise.reject(new Error("rules"))) });
    await expect(publishWithImages(d, "d1", [withImage(0)])).rejects.toThrow("rules");
    expect(calls).toEqual(["finalize"]);
    expect(d.cleanup).not.toHaveBeenCalled();
  });

  it("finalize 실패 → commit 하지 않는다", async () => {
    const { d } = deps({ finalize: vi.fn(async () => Promise.reject(new Error("copy"))) });
    await expect(publishWithImages(d, "d1", [withImage(0)])).rejects.toThrow("copy");
    expect(d.commit).not.toHaveBeenCalled();
  });

  it("finalize 결과에 칸이 빠지면 commit 하지 않는다(초안 주소가 발행되면 안 된다)", async () => {
    const { d } = deps({ finalize: vi.fn(async () => ({})) });
    await expect(publishWithImages(d, "d1", [withImage(0)])).rejects.toThrow();
    expect(d.commit).not.toHaveBeenCalled();
  });

  it("cleanup 실패 → 발행은 성공(대회 id 돌려줌)", async () => {
    const { d } = deps({ cleanup: vi.fn(async () => Promise.reject(new Error("net"))) });
    await expect(publishWithImages(d, "d1", [withImage(0)])).resolves.toBe("T1");
  });

  it("초안 없이 그림 칸이 있으면 던진다", async () => {
    const { d } = deps();
    await expect(publishWithImages(d, null, [withImage(0)])).rejects.toThrow();
    expect(d.commit).not.toHaveBeenCalled();
  });
});
