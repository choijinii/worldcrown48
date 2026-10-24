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
