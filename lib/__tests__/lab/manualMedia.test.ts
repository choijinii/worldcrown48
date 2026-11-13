/**
 * LAB-FIX-3 (원장 D-89) — 엔트리 칸의 손 넣기 순수 층.
 * 칸 모드 · 보이는 버튼 · 영상 주소 해석 · 넣기/빼기 병합 · 주소 기억 저장.
 */
import { describe, expect, it } from "vitest";
import {
  addManualVideo,
  parseManualVideoUrl,
  removeManualVideo,
  slotButtons,
  slotMode,
} from "@/lib/lab/manualMedia";
import { clearVideo } from "@/lib/lab/videoDraft";
import { applySourcingResults } from "@/lib/lab/sourcingDraft";
import { buildContestantDocs, type ContestantDraft } from "@/lib/lab/tournamentDoc";
import { fromDraftDoc, toDraftFields, type DraftEditorState } from "@/lib/lab/tournamentDraft";
import type { LinkVerdict } from "@/lib/embed/verdict";
import { EMPTY_PICK } from "@/lib/thumbnail/pick";

const empty = (): ContestantDraft => ({ name: "", nationality: "", affiliation: "", imageSearchKeyword: "" });
const named = (name: string): ContestantDraft => ({ ...empty(), name });
const ID = "dQw4w9WgXcQ";
const URL = `https://www.youtube.com/watch?v=${ID}`;

function verdict(status: LinkVerdict["status"] = "pass"): LinkVerdict {
  return {
    videoId: ID,
    exists: status !== "blocked",
    embeddable: status !== "blocked",
    regionBlockedIn: [],
    regionAllowedOnly: [],
    ageRestricted: false,
    isLive: false,
    durationSec: 200,
    title: "NewJeans 'Ditto' MV",
    channelTitle: "HYBE LABELS",
    thumbnailUrl: "",
    status,
    reasons: status === "blocked" ? ["not-embeddable"] : [],
  };
}

describe("slotMode · slotButtons — 칸 상태 → 보이는 버튼", () => {
  it("자동 칸(자동 길로 영상이 들어온 칸): [새 영상 찾기]만", () => {
    const c = { ...named("하니"), videoId: ID };
    expect(slotMode(c)).toBe("auto");
    expect(slotButtons(c)).toEqual({ manual: false, video: null, image: null, imageFile: false, refresh: true });
  });

  it("수동 칸 — 비어 있음: [영상]·[이미지]·[이미지 파일] 모두 꺼짐, [영상 찾기] 없음", () => {
    expect(slotMode(named("하니"))).toBe("manual");
    expect(slotButtons(named("하니"))).toEqual({ manual: true, video: "off", image: "off", imageFile: true, refresh: false });
    expect(slotButtons(empty()).manual).toBe(true);
  });

  it("수동 칸 — 손으로 영상 넣음: [영상] 켜짐", () => {
    const c = { ...named("하니"), videoId: ID, manualVideo: true };
    expect(slotMode(c)).toBe("manual");
    expect(slotButtons(c)).toMatchObject({ video: "on", image: "off", refresh: false });
  });

  it("그림만 있는 칸(어느 길이든): [이미지] 켜짐", () => {
    const c = { ...named("하니"), imageUrl: "https://x/1.jpg" };
    expect(slotButtons(c)).toMatchObject({ manual: true, video: "off", image: "on", imageFile: true });
  });
});

describe("parseManualVideoUrl — 유튜브만", () => {
  it.each([
    [URL, ID],
    [`https://youtu.be/${ID}?t=42`, ID],
    [`https://www.youtube.com/shorts/${ID}`, ID],
  ])("%s → 통과", (raw, id) => {
    const r = parseManualVideoUrl(raw);
    expect(r.ok && r.videoId).toBe(id);
  });

  it("youtu.be 의 t= 는 시작 초로", () => {
    const r = parseManualVideoUrl(`https://youtu.be/${ID}?t=42`);
    expect(r.ok && r.startSec).toBe(42);
  });

  it.each(["https://vimeo.com/76979871", "그냥 글자"])("%s → 유튜브만(only-youtube)", (raw) => {
    expect(parseManualVideoUrl(raw)).toEqual({ ok: false, reason: "only-youtube" });
  });

  it("유튜브 채널 주소 → 영상 id 없음", () => {
    expect(parseManualVideoUrl("https://www.youtube.com/@NewJeans_official/")).toEqual({ ok: false, reason: "no-video-id" });
  });

  it("빈 글자 → blank", () => {
    expect(parseManualVideoUrl("   ")).toEqual({ ok: false, reason: "blank" });
  });
});

describe("addManualVideo — 그 칸 하나만", () => {
  const grid = (): ContestantDraft[] => Array.from({ length: 48 }, (_, i) => named(`엔트리${i + 1}`));

  it("이름 있는 칸: 영상 + 손 넣기 표시 + 주소 기억, 이름·소속·국가 그대로(D-88), 다른 칸 변화 0", () => {
    const before = grid();
    const extraction = { videoId: ID, name: "뉴진스", affiliation: "ADOR", nationality: "KR", confident: true };
    const after = addManualVideo(before, 5, verdict(), null, URL, extraction, 48, empty);
    expect(after[5]).toMatchObject({ name: "엔트리6", affiliation: "", nationality: "", videoId: ID, manualVideo: true, manualVideoUrl: URL });
    after.forEach((c, i) => {
      if (i !== 5) expect(c).toEqual(before[i]);
    });
  });

  it("이름 빈 칸: 추출 결과로 이름·소속·국가 채움", () => {
    const before = grid();
    before[7] = empty();
    const extraction = { videoId: ID, name: "뉴진스", affiliation: "ADOR", nationality: "KR", confident: true };
    const after = addManualVideo(before, 7, verdict(), 30, URL, extraction, 48, empty);
    expect(after[7]).toMatchObject({ name: "뉴진스", affiliation: "ADOR", nationality: "KR", videoId: ID, videoStartSec: 30 });
  });

  it("차단 판정이면 칸 변화 0", () => {
    const before = grid();
    const after = addManualVideo(before, 2, verdict("blocked"), null, URL, null, 48, empty);
    expect(after[2]).toEqual(before[2]);
  });
});

describe("빼기 · 자동 길 — 손 넣기 표시", () => {
  it("removeManualVideo: 영상·표시는 빠지고 기억한 주소는 남는다", () => {
    const c = { ...named("하니"), videoId: ID, videoStartSec: 0, manualVideo: true, manualVideoUrl: URL };
    const out = removeManualVideo(c);
    expect(out.videoId).toBeUndefined();
    expect(out.manualVideo).toBeUndefined();
    expect(out.manualVideoUrl).toBe(URL);
  });

  it("clearVideo 는 손 넣기 표시도 지운다(자동 길이 새 영상을 넣으면 자동 칸)", () => {
    const out = clearVideo({ ...named("하니"), videoId: ID, manualVideo: true, manualVideoUrl: URL });
    expect(out.manualVideo).toBeUndefined();
    expect(out.manualVideoUrl).toBe(URL);
  });

  it("[동영상 생성]·[새 영상 찾기](applySourcingResults)가 넣으면 손 넣기 표시가 빠진다", () => {
    const drafts = [{ ...named("하니"), videoId: "aaaaaaaaaaa", manualVideo: true }];
    const { drafts: out } = applySourcingResults(
      drafts,
      [{ index: 0, status: "suggested", verdict: verdict(), startSec: null } as never],
      1,
      empty,
    );
    expect(out[0].videoId).toBe(ID);
    expect(out[0].manualVideo).toBeUndefined();
  });
});

describe("주소 기억 — 초안에는 저장, 발행 문서에는 없음", () => {
  const state = (contestants: ContestantDraft[]): DraftEditorState => ({
    step: 2,
    title: "t",
    category: "KPOP",
    description: "",
    keywords: [],
    campaignSlug: "",
    deadlineMs: 1,
    contestants,
    thumbnailPair: EMPTY_PICK,
    entryUnit: "individual",
  });

  it("저장 → 불러오기 왕복에 3필드가 남는다", () => {
    const c = { ...named("하니"), videoId: ID, manualVideo: true, manualVideoUrl: URL, manualImageUrl: "https://x/1.jpg" };
    const back = fromDraftDoc({ hostUid: "u", ...toDraftFields(state([c])) });
    expect(back?.contestants[0]).toMatchObject({ manualVideo: true, manualVideoUrl: URL, manualImageUrl: "https://x/1.jpg" });
  });

  it("옛 초안(필드 없음)·이상한 값은 버린다", () => {
    const back = fromDraftDoc({ hostUid: "u", contestants: [{ name: "a", manualVideo: "yes", manualVideoUrl: 3 }] });
    expect(back?.contestants[0].manualVideo).toBeUndefined();
    expect(back?.contestants[0].manualVideoUrl).toBeUndefined();
  });

  it("발행 문서(buildContestantDocs)에는 기억 필드가 들어가지 않는다", () => {
    const drafts = Array.from({ length: 48 }, () => ({
      ...named("하니"),
      videoId: ID,
      manualVideo: true,
      manualVideoUrl: URL,
      manualImageUrl: "https://x/1.jpg",
    }));
    const docs = buildContestantDocs("t1", "u", drafts);
    const json = JSON.stringify(docs);
    expect(json).not.toContain("manualVideo");
    expect(json).not.toContain("manualImageUrl");
  });
});
