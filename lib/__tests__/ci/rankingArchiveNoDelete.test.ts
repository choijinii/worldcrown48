/**
 * 차트 사진 영구 보관(T5 PR 2 · 대표 2026-11-25) — `ranking_archive` 를 지우는 코드는 어디에도 없다.
 * 저장소 전체에서 `ranking_archive` 가 나오는 줄에 `delete` · `recursiveDelete` 가 함께 있으면 실패한다.
 */
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const SELF = "lib/__tests__/ci/rankingArchiveNoDelete.test.ts";

describe("ranking_archive 는 지우지 않는다", () => {
  it("git grep 결과에 delete · recursiveDelete 가 같은 줄에 0건", () => {
    const out = execFileSync("git", ["grep", "-n", "ranking_archive", "--", ".", `:(exclude)${SELF}`, ":(exclude)docs"], {
      encoding: "utf8",
    });
    expect(out.length).toBeGreaterThan(0);
    // 시험 이름("…-tournament-delete")은 지우는 코드가 아니다 — 시험은 "남는다"를 확인할 뿐이라 이름 한 줄만 허용한다.
    const hits =out.split("\n").filter((l) => /delete/i.test(l.replace(/^[^:]*:\d+:/, "").replace("archive-survives-tournament-delete", "")));
    expect(hits).toEqual([]);
  });
});
