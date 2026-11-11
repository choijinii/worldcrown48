/**
 * LAB-FIX-2 통합 — 검수기의 인물 추출 콜러블 요청에 엔트리 단위(원장 D-73)가 실리는가.
 * 서버가 그 값을 어떻게 쓰는지는 functions/src/__tests__/extractContestantsCore.test.ts 가 본다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: unknown[] = [];
vi.mock("firebase/functions", () => ({
  httpsCallable: (_fns: unknown, name: string) => async (data: unknown) => {
    sent.push({ name, data });
    return { data: { extractions: [] } };
  },
}));
vi.mock("@/lib/firebase", () => ({ getFunctionsInstance: () => ({}) }));

import { extractContestantsFromVideos } from "@/lib/lab/extractContestants";

beforeEach(() => {
  sent.length = 0;
});

describe("extractContestantsFromVideos — 요청 모양", () => {
  const items = [{ videoId: "kJQP7kiw5Fk", title: "BABYMONSTER M/V", channelTitle: "BABYMONSTER" }];

  it("★팀 대회 → { items, entryUnit: 'group' }", async () => {
    await extractContestantsFromVideos(items, "group");
    expect(sent).toEqual([{ name: "extractContestantsFromVideos", data: { items, entryUnit: "group" } }]);
  });

  it("개인 대회 → entryUnit: 'individual'", async () => {
    await extractContestantsFromVideos(items, "individual");
    expect((sent[0] as { data: { entryUnit: string } }).data.entryUnit).toBe("individual");
  });
});
