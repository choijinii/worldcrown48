/**
 * LAB-FIX-3 추가분 (원장 D-90) — 대회 종류(영상 대회 · 이미지 대회) 판정.
 */
import { describe, expect, it } from "vitest";
import { inferMediaKind, isMediaPublishable, resolveMediaKind } from "@/lib/lab/mediaKind";
import { buildTournamentDoc, type ContestantDraft } from "@/lib/lab/tournamentDoc";
import { fromDraftDoc, toDraftFields, DRAFT_FIELDS, type DraftEditorState } from "@/lib/lab/tournamentDraft";
import { EMPTY_PICK } from "@/lib/thumbnail/pick";

const named = (name: string): ContestantDraft => ({ name, nationality: "", affiliation: "", imageSearchKeyword: "" });
const video = (name: string): ContestantDraft => ({ ...named(name), videoId: "dQw4w9WgXcQ" });
const image = (name: string): ContestantDraft => ({ ...named(name), imageUrl: "https://x/1.jpg" });

describe("inferMediaKind — 기존 초안 자동 결정", () => {
  it("아무 미디어도 없으면 미정", () => {
    expect(inferMediaKind([named("a"), named("b")])).toEqual({ kind: null, mixed: false });
  });
  it("영상이 하나라도 있으면 영상 대회", () => {
    expect(inferMediaKind([named("a"), video("b")])).toEqual({ kind: "video", mixed: false });
  });
  it("그림이 하나라도 있으면(영상 없음) 이미지 대회", () => {
    expect(inferMediaKind([named("a"), image("b")])).toEqual({ kind: "image", mixed: false });
  });
  it("둘 다 있으면 영상 대회 + 섞임 표시", () => {
    expect(inferMediaKind([image("a"), video("b")])).toEqual({ kind: "video", mixed: true });
  });
});

describe("resolveMediaKind — 저장값 우선, 없거나 이상하면 추론", () => {
  it("저장값이 맞으면 그대로(칸이 비어 있어도)", () => {
    expect(resolveMediaKind("image", [named("a")])).toBe("image");
    expect(resolveMediaKind("video", [])).toBe("video");
  });
  it("없거나 모르는 값이면 칸에서 추론", () => {
    expect(resolveMediaKind(undefined, [video("a")])).toBe("video");
    expect(resolveMediaKind("both", [image("a")])).toBe("image");
    expect(resolveMediaKind(undefined, [named("a")])).toBeNull();
  });
});

describe("isMediaPublishable — 섞이면 발행 안 됨", () => {
  it("영상 대회에 그림 칸이 있으면 막힘 · 없으면 통과", () => {
    expect(isMediaPublishable("video", [video("a"), named("b")])).toBe(true);
    expect(isMediaPublishable("video", [video("a"), image("b")])).toBe(false);
  });
  it("이미지 대회에 영상 칸이 있으면 막힘", () => {
    expect(isMediaPublishable("image", [image("a"), named("b")])).toBe(true);
    expect(isMediaPublishable("image", [image("a"), video("b")])).toBe(false);
  });
  it("한 칸에 영상과 그림이 함께 있어도 섞임", () => {
    expect(isMediaPublishable("video", [{ ...video("a"), imageUrl: "https://x/1.jpg" }])).toBe(false);
  });
  it("미정이면 섞임만 막는다", () => {
    expect(isMediaPublishable(null, [named("a")])).toBe(true);
    expect(isMediaPublishable(null, [video("a"), image("b")])).toBe(false);
  });
});

describe("초안 저장 · 발행 문서", () => {
  const state = (mediaKind: DraftEditorState["mediaKind"], contestants: ContestantDraft[] = []): DraftEditorState => ({
    step: 2, title: "t", category: "KPOP", description: "", keywords: [], campaignSlug: "", deadlineMs: 1,
    contestants, thumbnailPair: EMPTY_PICK, entryUnit: "individual", mediaKind,
  });

  it("정해진 종류는 저장 → 불러오기 왕복", () => {
    expect(toDraftFields(state("image")).mediaKind).toBe("image");
    expect(fromDraftDoc({ hostUid: "u", ...toDraftFields(state("image")) })?.mediaKind).toBe("image");
  });
  it("미정이면 칸을 싣지 않는다", () => {
    expect("mediaKind" in toDraftFields(state(null))).toBe(false);
  });
  it("옛 초안(칸 없음)은 칸에서 추론 — 영상만 있으면 영상 대회", () => {
    expect(fromDraftDoc({ hostUid: "u", contestants: [video("a"), named("b")] })?.mediaKind).toBe("video");
    expect(fromDraftDoc({ hostUid: "u", contestants: [named("a")] })?.mediaKind).toBeNull();
  });
  it("허용 칸 목록(= firestore.rules hasOnly)에 mediaKind", () => {
    expect(DRAFT_FIELDS).toContain("mediaKind");
  });
  it("발행 문서에 대회 종류가 남는다(있을 때만)", () => {
    const base = {
      title: "t", titleI18n: { ko: "t", en: "t", es: "t" }, description: { ko: "", en: "", es: "" },
      keywords: ["k"], category: "KPOP", hostUid: "u", deadlineMs: 10_000,
    };
    expect(buildTournamentDoc({ ...base, mediaKind: "image" }, ["KPOP"], 0).mediaKind).toBe("image");
    expect("mediaKind" in buildTournamentDoc(base, ["KPOP"], 0)).toBe(false);
  });
});
