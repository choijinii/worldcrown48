import { describe, it, expect, vi } from "vitest";
import {
  needsNameI18n,
  planNameBackfill,
  renderReviewTable,
  parseReviewTable,
  buildNameWrites,
  runDryRun,
  runWrite,
} from "../../scripts/backfill-name-i18n.lib.mjs";

// NAME-I18N-1 §4 — 기존 대회 백필. 기본 dry-run(쓰지 않음) → 대표 검수표 → 고친 표로 --write.

const tournaments = [
  { id: "t1", title: "4세대 걸그룹", status: "active", category: "KPOP" },
  { id: "t2", title: "초안", status: "draft", category: "KPOP" },
];
const contestants = [
  { id: "c2aaaaaaaaaaaaaaaaaa", tournamentId: "t1", order: 2, name: "에스파", affiliation: "SM" },
  { id: "c1aaaaaaaaaaaaaaaaaa", tournamentId: "t1", order: 1, name: "뉴진스", affiliation: "ADOR" },
  {
    id: "c3aaaaaaaaaaaaaaaaaa",
    tournamentId: "t1",
    order: 3,
    name: "아이유",
    affiliation: "",
    nameI18n: { ko: "아이유", en: "IU", es: "IU" },
  },
  { id: "d1aaaaaaaaaaaaaaaaaa", tournamentId: "t2", order: 1, name: "초안 엔트리", affiliation: "" },
];

describe("needsNameI18n", () => {
  it("en 이 비었거나 없을 때만", () => {
    expect(needsNameI18n({ name: "a" })).toBe(true);
    expect(needsNameI18n({ name: "a", nameI18n: { ko: "a", en: " ", es: "" } })).toBe(true);
    expect(needsNameI18n({ name: "a", nameI18n: { ko: "a", en: "A", es: "A" } })).toBe(false);
  });
});

describe("planNameBackfill", () => {
  it("발행된 대회만 · 이미 채워진 엔트리는 건너뜀 · 순서대로", () => {
    const plan = planNameBackfill(tournaments, contestants);
    expect(plan.targets).toHaveLength(1);
    expect(plan.targets[0].tournament.id).toBe("t1");
    expect(plan.targets[0].contestants.map((c) => c.name)).toEqual(["뉴진스", "에스파"]);
    expect(plan.alreadyFilled).toBe(1);
  });
});

const results = [
  {
    tournament: { id: "t1", title: "4세대 걸그룹" },
    rows: [
      { id: "c1aaaaaaaaaaaaaaaaaa", order: 1, name: "뉴진스", en: "NewJeans", sure: true },
      { id: "c2aaaaaaaaaaaaaaaaaa", order: 2, name: "에스파", en: "Aespa", sure: false },
      { id: "c4aaaaaaaaaaaaaaaaaa", order: 4, name: "모르는 이", en: "", sure: false },
    ],
  },
];

describe("renderReviewTable / parseReviewTable", () => {
  it("확신 낮음·실패를 맨 위에 따로 모은다", () => {
    const md = renderReviewTable({ date: "2026-10-22", results });
    const top = md.indexOf("먼저 볼 이름");
    const rest = md.indexOf("나머지");
    expect(top).toBeGreaterThan(-1);
    expect(rest).toBeGreaterThan(top);
    expect(md.indexOf("에스파")).toBeGreaterThan(top);
    expect(md.indexOf("에스파")).toBeLessThan(rest);
    expect(md.indexOf("모르는 이")).toBeLessThan(rest);
    expect(md.indexOf("뉴진스")).toBeGreaterThan(rest);
  });

  it("각 엔트리는 표에 한 번만 — 고칠 자리가 하나", () => {
    const md = renderReviewTable({ date: "2026-10-22", results });
    expect(md.split("c2aaaaaaaaaaaaaaaaaa").length - 1).toBe(1);
  });

  it("그린 표를 다시 읽으면 같은 값 — 대표가 고친 칸이 그대로 읽힌다", () => {
    const md = renderReviewTable({ date: "2026-10-22", results });
    expect(parseReviewTable(md)).toEqual([
      { id: "c2aaaaaaaaaaaaaaaaaa", name: "에스파", en: "Aespa" },
      { id: "c4aaaaaaaaaaaaaaaaaa", name: "모르는 이", en: "" },
      { id: "c1aaaaaaaaaaaaaaaaaa", name: "뉴진스", en: "NewJeans" },
    ]);
    const fixed = md.replace("| Aespa |", "| aespa |");
    expect(parseReviewTable(fixed).find((r) => r.id === "c2aaaaaaaaaaaaaaaaaa")?.en).toBe("aespa");
  });
});

describe("buildNameWrites", () => {
  const docs = new Map(contestants.map((c) => [c.id, c]));

  it("en = es · ko = name 으로 쓴다", () => {
    const { writes } = buildNameWrites([{ id: "c1aaaaaaaaaaaaaaaaaa", name: "뉴진스", en: "NewJeans" }], docs);
    expect(writes).toEqual([
      { id: "c1aaaaaaaaaaaaaaaaaa", nameI18n: { ko: "뉴진스", en: "NewJeans", es: "NewJeans" } },
    ]);
  });

  it("이미 채워짐 · 빈 영어 · 한글 영어 · 한글 이름이 바뀜 · 문서 없음 · 중복은 쓰지 않고 이유를 남긴다", () => {
    const { writes, skipped } = buildNameWrites(
      [
        { id: "c3aaaaaaaaaaaaaaaaaa", name: "아이유", en: "IU" },
        { id: "c2aaaaaaaaaaaaaaaaaa", name: "에스파", en: "" },
        { id: "c1aaaaaaaaaaaaaaaaaa", name: "뉴진스", en: "뉴진스" },
        { id: "d1aaaaaaaaaaaaaaaaaa", name: "다른 이름", en: "X" },
        { id: "zzzzzzzzzzzzzzzzzzzz", name: "없음", en: "X" },
      ],
      docs,
    );
    expect(writes).toEqual([]);
    expect(skipped.map((s) => s.reason)).toEqual([
      "already-filled",
      "empty-en",
      "hangul-en",
      "name-changed",
      "missing-doc",
    ]);
    const dup = buildNameWrites(
      [
        { id: "c1aaaaaaaaaaaaaaaaaa", name: "뉴진스", en: "NewJeans" },
        { id: "c1aaaaaaaaaaaaaaaaaa", name: "뉴진스", en: "NewJeans" },
      ],
      docs,
    );
    expect(dup.writes).toHaveLength(1);
    expect(dup.skipped.map((s) => s.reason)).toEqual(["duplicate"]);
  });
});

describe("runDryRun / runWrite", () => {
  const translate = vi.fn(async (entries: { name: string }[]) => ({
    nameI18n: entries.map((e) => ({ ko: e.name, en: e.name === "뉴진스" ? "NewJeans" : "Aespa", es: "" })),
    unsure: [1],
    failed: [],
  }));

  it("dry-run 은 Firestore 에 쓰지 않는다 — 대회마다 AI 1번 · 검수표만 돌려준다", async () => {
    const write = vi.fn();
    const out = await runDryRun(
      { loadTournaments: async () => tournaments, loadContestants: async () => contestants, translate, write },
      { date: "2026-10-22" },
    );
    expect(write).not.toHaveBeenCalled();
    expect(translate).toHaveBeenCalledTimes(1);
    expect(translate.mock.calls[0][0].map((e: { name: string }) => e.name)).toEqual(["뉴진스", "에스파"]);
    expect(out.md).toContain("NewJeans");
    expect(out.summary).toMatchObject({ tournaments: 1, names: 2, unsure: 1, failed: 0, alreadyFilled: 1 });
  });

  // 대표 2026-10-24 A안: 발음이 안 맞아 비운 이름은 "받지 못함"과 따로 세고, 표에 AI 가 낸 이름을
  // 참고로 한 줄 남긴다(영어 칸은 비어 있다 — 그대로 두면 쓰지 않는다).
  it("발음이 안 맞아 비운 이름은 따로 세고 먼저 볼 이름에 AI 가 낸 이름과 함께 싣는다", async () => {
    const out = await runDryRun(
      {
        loadTournaments: async () => tournaments,
        loadContestants: async () => contestants,
        translate: async (entries: { name: string }[]) => ({
          nameI18n: entries.map((e) => ({ ko: e.name, en: e.name === "뉴진스" ? "NewJeans" : "", es: "" })),
          unsure: [],
          failed: [],
          mismatch: [{ index: 1, en: "Yeji" }],
        }),
        write: vi.fn(),
      },
      { date: "2026-10-24" },
    );
    expect(out.summary).toMatchObject({ names: 2, unsure: 0, failed: 0, mismatch: 1 });
    const [top] = out.md.split("## 2.");
    expect(top).toContain("| 2 | 에스파 |  |");
    expect(top).toMatch(/발음이 안 맞아 비운 이름: 에스파 \(AI: Yeji\)/);
    expect(parseReviewTable(out.md).find((r) => r.name === "에스파")?.en).toBe("");
  });

  it("--write 는 검수표의 값만 쓴다(AI 호출 없음) — 다시 돌려도 이미 채워진 것은 건너뜀", async () => {
    const md = renderReviewTable({ date: "2026-10-22", results });
    const write = vi.fn(async () => {});
    const translateSpy = vi.fn();
    const out = await runWrite(
      { loadTournaments: async () => tournaments, loadContestants: async () => contestants, translate: translateSpy, write },
      md,
    );
    expect(translateSpy).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][0]).toEqual([
      { id: "c2aaaaaaaaaaaaaaaaaa", nameI18n: { ko: "에스파", en: "Aespa", es: "Aespa" } },
      { id: "c1aaaaaaaaaaaaaaaaaa", nameI18n: { ko: "뉴진스", en: "NewJeans", es: "NewJeans" } },
    ]);
    expect(out.skipped.map((s: { reason: string }) => s.reason)).toEqual(["missing-doc"]);
  });
});
