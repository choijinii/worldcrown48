import { describe, expect, it } from "vitest";
import { editEn, nameEditRows, planNameEdits } from "@/lib/lab/nameEdits";

// NAME-I18N-1 PR 2 — 발행 뒤 The Lab 에서 엔트리의 en·es 이름을 보고 고친다(지시서 §2).
// 대표 2026-10-24 A안: 발음이 안 맞아 비운 이름은 영어 칸이 빈 채로 온다 → 맨 위 "먼저 볼 이름".

const docs = [
  { id: "c1", order: 1, name: "뉴진스", nameI18n: { ko: "뉴진스", en: "NewJeans", es: "NewJeans" } },
  { id: "c2", order: 2, name: "화란", nameI18n: { ko: "화란", en: "", es: "" } },
  { id: "c3", order: 3, name: "옛 엔트리" },
];

describe("nameEditRows — 편집 칸", () => {
  it("영어가 빈 이름(옛 문서 포함)을 먼저 볼 이름으로 맨 위에, 나머지는 순서대로", () => {
    const rows = nameEditRows(docs);
    expect(rows.map((r) => [r.id, r.flagged])).toEqual([
      ["c2", true],
      ["c3", true],
      ["c1", false],
    ]);
    expect(rows[2]).toMatchObject({ name: "뉴진스", en: "NewJeans", es: "NewJeans" });
    expect(rows[1]).toMatchObject({ name: "옛 엔트리", en: "", es: "" });
  });
});

describe("editEn — es 는 en 을 따라간다 (원장 D-61: es = en 복사)", () => {
  it("es 가 비었거나 en 과 같았으면 따라간다", () => {
    const [flagged] = nameEditRows(docs);
    expect(editEn(flagged, "Hwaran")).toMatchObject({ en: "Hwaran", es: "Hwaran" });
    const nj = nameEditRows(docs)[2];
    expect(editEn(nj, "NEWJEANS")).toMatchObject({ en: "NEWJEANS", es: "NEWJEANS" });
  });

  it("사람이 따로 고친 es 는 건드리지 않는다", () => {
    const nj = { ...nameEditRows(docs)[2], es: "Nuevos Jeans" };
    expect(editEn(nj, "NEWJEANS").es).toBe("Nuevos Jeans");
  });
});

describe("planNameEdits — 저장할 값", () => {
  it("바뀐 엔트리만 · nameI18n 한 칸만 · ko = 한글 정본 · 앞뒤 빈칸 정리", () => {
    const before = nameEditRows(docs);
    const after = before.map((r) => (r.id === "c2" ? editEn(r, "  Hwaran ") : r));
    expect(planNameEdits(before, after)).toEqual({
      writes: [{ id: "c2", nameI18n: { ko: "화란", en: "Hwaran", es: "Hwaran" } }],
      invalid: [],
    });
  });

  it("es 를 비우면 en 을 복사해 저장한다", () => {
    const before = nameEditRows(docs);
    const after = before.map((r) => (r.id === "c1" ? { ...r, es: "" } : r));
    expect(planNameEdits(before, after).writes).toEqual([]);
    const after2 = before.map((r) => (r.id === "c1" ? { ...r, en: "NewJeans!", es: "" } : r));
    expect(planNameEdits(before, after2).writes).toEqual([
      { id: "c1", nameI18n: { ko: "뉴진스", en: "NewJeans!", es: "NewJeans!" } },
    ]);
  });

  it("한글이 든 영어·스페인어 칸은 저장하지 않고 알린다", () => {
    const before = nameEditRows(docs);
    const after = before.map((r) => (r.id === "c2" ? { ...r, en: "화란", es: "" } : r));
    expect(planNameEdits(before, after)).toEqual({ writes: [], invalid: ["c2"] });
  });

  it("영어를 지워 비우면 비운 채로 저장한다 — 화면은 한글", () => {
    const before = nameEditRows(docs);
    const after = before.map((r) => (r.id === "c1" ? { ...r, en: "", es: "" } : r));
    expect(planNameEdits(before, after).writes).toEqual([
      { id: "c1", nameI18n: { ko: "뉴진스", en: "", es: "" } },
    ]);
  });
});

// LAB-FIX-2 (원장 D-88) — 편집기 이름 칸은 글자만 바꾼다. 영상·검색어·소속·국가·그림은 그대로 두고,
// AI 배지("제안"·"수동 필요")만 뗀다. 영상 빼기는 운영자가 영상 ✕ · [새 영상 찾기]를 눌러서만.
import { applyContestantPatch, namePatchDropsBadge } from "@/lib/lab/nameEdits";
import { mismatchSlots } from "@/lib/lab/nameVideoMismatch";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";

const withVideo: ContestantDraft = {
  name: "방탄소년단",
  nationality: "KR",
  affiliation: "BIGHIT MUSIC",
  imageSearchKeyword: "BTS stage",
  videoId: "dQw4w9WgXcQ",
  videoStartSec: 30,
  videoEndSec: 45,
  videoSourceUrl: "u",
  videoTitle: "방탄소년단 무대",
  videoChannel: "HYBE LABELS",
  imageUrl: "still.jpg",
};

describe("applyContestantPatch — 이름 칸은 글자만 바꾼다 (D-88)", () => {
  it("★오타 고치기(방탄소년닫 → 방탄소년단) — 영상·검색어 그대로", () => {
    const typo = applyContestantPatch(withVideo, { name: "방탄소년닫" });
    const fixed = applyContestantPatch(typo, { name: "방탄소년단" });
    expect(fixed).toEqual(withVideo);
  });

  it("★다른 인물로 바꿔도(세븐틴) 영상·검색어·소속·국가·그림을 떼지 않는다", () => {
    const next = applyContestantPatch(withVideo, { name: "세븐틴" });
    expect(next).toEqual({ ...withVideo, name: "세븐틴" });
  });

  it("★영상만 있는 칸에 한 글자씩 치기 — 어느 글자에서도 영상이 사라지지 않는다", () => {
    let d: ContestantDraft = { ...withVideo, name: "" };
    for (const partial of ["베", "베이", "베이비", "베이비몬", "베이비몬스", "베이비몬스터"]) {
      d = applyContestantPatch(d, { name: partial });
      expect(d.videoId).toBe("dQw4w9WgXcQ");
      expect(d.imageSearchKeyword).toBe("BTS stage");
    }
  });

  it("입력 draft 를 바꾸지 않는다", () => {
    applyContestantPatch(withVideo, { name: "세븐틴" });
    expect(withVideo.name).toBe("방탄소년단");
  });
});

describe("namePatchDropsBadge — 이름이 바뀌면 AI 배지만 뗀다", () => {
  it("이름 글자가 바뀌면 뗀다 · 비워도 뗀다", () => {
    expect(namePatchDropsBadge("카리나", { name: "카리나2" })).toBe(true);
    expect(namePatchDropsBadge("카리나", { name: "" })).toBe(true);
  });
  it("이름이 그대로거나 이름이 아닌 칸만 바뀌면 그대로", () => {
    expect(namePatchDropsBadge("카리나", { name: "카리나" })).toBe(false);
    expect(namePatchDropsBadge("카리나", { affiliation: "aespa" })).toBe(false);
  });
});

describe("이름을 바꾼 칸 — 불일치 배지가 유일한 안전장치 (D-88)", () => {
  it("★세븐틴으로 바꾼 칸은 영상(방탄소년단 무대)과 어긋나 불일치로 잡힌다", () => {
    const renamed = applyContestantPatch({ ...withVideo, affiliation: "" }, { name: "세븐틴" });
    expect(mismatchSlots([withVideo, renamed])).toEqual([1]);
  });
  it("오타를 바로잡은 칸은 불일치가 아니다", () => {
    expect(mismatchSlots([applyContestantPatch(withVideo, { name: "방탄소년단" })])).toEqual([]);
  });
});
