/**
 * LAB-FIX-5 §3-5 — 엔트리가 커버 · 리뷰의 주인공(사람 · 팀)일 때 제목의 원곡 가수 · 원작자는 덧붙이는 정보(소속)에도 넣지 않는다.
 * B줄 사전 점검: 29번 베베 칸 소속에 "YOUNG POSSE"(원곡 가수)가 들어갔다. 지시문 + 서버 그물(제목에 "원곡: X" 처럼 명시된 것만).
 */
import { describe, expect, it, vi } from "vitest";
import {
  buildBriefExtractPrompt,
  dropOriginalArtistExtra,
  extractContestantsCore,
  type ExtractItem,
} from "../core/extractContestantsCore";

const crewBrief = { entry: "영상에서 춤춘 댄스 크루", extra: "", rules: "K-pop 곡에 맞춰 춤춘 국내외 댄스 크루. 원곡 가수는 엔트리가 아니다." };
const bebe: ExtractItem = { videoId: "NDcwCp7GxTA", title: "베베(BEBE) - 'XXL' Dance Performance (원곡: YOUNG POSSE)", channelTitle: "베베 BEBE" };

describe("지시문 — 사람 · 팀 엔트리의 소속 칸에 원곡 가수를 적지 않는다", () => {
  it("새 링크 제목 읽기 지시문에 그 줄이 있다", () => {
    const p = buildBriefExtractPrompt([bebe], { tournamentTitle: "t", brief: crewBrief, entryUnit: "group" });
    expect(p).toContain("원곡 가수 · 원작자는 affiliation 에도 적지 않는다");
    expect(p).toContain("소속을 알 수 없으면 빈 문자열");
  });
});

describe("서버 그물 dropOriginalArtistExtra", () => {
  it.each([
    ["베베(BEBE) - 'XXL' Dance Performance (원곡: YOUNG POSSE)", "YOUNG POSSE"],
    ["NOVA - Supernova cover (원곡 : aespa)", "aespa"],
    ["HANABI | 'Magnetic' Dance Cover [Original: ILLIT]", "ILLIT"],
    ["Crew X 'Drama' (original song by aespa)", "aespa"],
  ])("%s → 소속 %s 를 비운다", (title, extra) => {
    expect(dropOriginalArtistExtra(title, extra)).toBe("");
    expect(dropOriginalArtistExtra(title, extra.toLowerCase().replace(" ", ""))).toBe("");
  });
  it("원곡 표시가 없거나 소속이 원곡 가수가 아니면 그대로", () => {
    expect(dropOriginalArtistExtra("aespa 카리나 직캠", "aespa")).toBe("aespa");
    expect(dropOriginalArtistExtra("베베(BEBE) - 'XXL' (원곡: YOUNG POSSE)", "BEBE Agency")).toBe("BEBE Agency");
    expect(dropOriginalArtistExtra("베베(BEBE) - 'XXL' (원곡: YOUNG POSSE)", "")).toBe("");
  });
});

describe("extractContestantsCore — 그물은 사람 · 팀 단위의 세 줄 지시문에만", () => {
  const reply = JSON.stringify({ extractions: [{ id: bebe.videoId, name: "베베", affiliation: "YOUNG POSSE", nationality: "KR", confident: true }] });
  it("팀 + 세 줄 → 소속 비움", async () => {
    const out = await extractContestantsCore(
      { uid: "a", items: [bebe], entryUnit: "group", aiBrief: crewBrief, tournamentTitle: "t" },
      { createMessage: vi.fn(async () => reply) },
    );
    expect(out[0].affiliation).toBe("");
  });
  it("그 외(노래 대회)는 가수가 덧붙이는 정보가 맞을 수 있어 그대로", async () => {
    const out = await extractContestantsCore(
      { uid: "a", items: [bebe], entryUnit: "other", aiBrief: { entry: "노래 제목", extra: "가수", rules: "" }, tournamentTitle: "t" },
      { createMessage: vi.fn(async () => reply) },
    );
    expect(out[0].affiliation).toBe("YOUNG POSSE");
  });
});
