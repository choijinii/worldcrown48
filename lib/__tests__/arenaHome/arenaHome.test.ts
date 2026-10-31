/**
 * ARENA-2 PR 1 — 아레나 홈 규칙 (원장 D-37 · D-45 · D-63 · D-66 · D-71 · 킥 §2 · §4).
 *
 * 전광판 고르기 · 카테고리 주소 · 카테고리 거르기 · 게시판 검색 · 쪽 나누기 · 문서 → 대회 변환.
 */
import { describe, expect, it } from "vitest";
import {
  ACTIVE_PAGE_SIZE,
  CLOSED_PAGE_SIZE,
  arenaHomeHref,
  categoryFromParam,
  categoryParam,
  closedBoard,
  filterByCategory,
  formatClosedAt,
  formatDeadline,
  matchesClosedSearch,
  pageWindow,
  paginate,
  pickBoardTournament,
  tabCategories,
  toArenaTournament,
  type ArenaTournament,
  type ClosedRow,
} from "@/lib/arenaHome/arenaHome";
import type { CategoryDoc } from "@/lib/taxonomy/category";

const NOW = Date.parse("2026-10-27T12:00:00+09:00");
const H = 3_600_000;

function t(id: string, over: Partial<ArenaTournament> = {}): ArenaTournament {
  return {
    id,
    status: "active",
    hostUid: "host",
    deadlineMs: NOW + 24 * H,
    title: `제목 ${id}`,
    titleI18n: null,
    category: "KPOP",
    description: null,
    featured: false,
    createdAtMs: NOW - 48 * H,
    ...over,
  };
}

describe("pickBoardTournament — 전광판 (D-71)", () => {
  const a = t("a", { createdAtMs: NOW - 10 * H });
  const b = t("b", { createdAtMs: NOW - 1 * H });
  const f = t("f", { featured: true, createdAtMs: NOW - 99 * H });

  it("?t= 가 진행 중 대회를 가리키면 그 대회", () => {
    expect(pickBoardTournament([a, b, f], "a")?.id).toBe("a");
  });

  it("?t= 가 없으면 featured 대회", () => {
    expect(pickBoardTournament([a, b, f], null)?.id).toBe("f");
  });

  it("featured 도 없으면 가장 최근에 만든 진행 중 대회", () => {
    expect(pickBoardTournament([a, b], null)?.id).toBe("b");
  });

  it("?t= 가 목록에 없는 대회(마감·비공개·없는 id)면 기본 규칙으로 돌아간다 — 마감 대회에는 대기실이 없다(D-37)", () => {
    expect(pickBoardTournament([a, b, f], "ended-one")?.id).toBe("f");
  });

  it("만든 시각이 없는 대회는 최근 순에서 뒤로", () => {
    expect(pickBoardTournament([t("x", { createdAtMs: null }), a], null)?.id).toBe("a");
  });

  it("진행 중 대회가 없으면 null", () => {
    expect(pickBoardTournament([], "a")).toBeNull();
  });
});

describe("카테고리 주소 — 소문자 주소 · 대문자 id", () => {
  const ids = ["KPOP", "CREATOR"];

  it("?cat=kpop → KPOP", () => {
    expect(categoryFromParam("kpop", ids)).toBe("KPOP");
    expect(categoryFromParam("KPop", ids)).toBe("KPOP");
  });

  it("모르는 값 · 빈 값 → null(전체)", () => {
    expect(categoryFromParam("football", ids)).toBeNull();
    expect(categoryFromParam("", ids)).toBeNull();
    expect(categoryFromParam(null, ids)).toBeNull();
  });

  it("주소에는 소문자로 적는다", () => {
    expect(categoryParam("KPOP")).toBe("kpop");
  });

  it("아레나 홈 주소 — t · cat 순서 · 없으면 뺀다", () => {
    expect(arenaHomeHref({})).toBe("/arena");
    expect(arenaHomeHref({ t: "abc" })).toBe("/arena?t=abc");
    expect(arenaHomeHref({ cat: "KPOP" })).toBe("/arena?cat=kpop");
    expect(arenaHomeHref({ t: "a b", cat: "CREATOR" })).toBe("/arena?t=a%20b&cat=creator");
  });
});

describe("tabCategories — 탭 = 공개(live) 카테고리 · order 순", () => {
  const cat = (id: string, status: CategoryDoc["status"], order: number): CategoryDoc => ({
    id,
    name: { ko: id, en: id, es: id },
    status,
    phase: 1,
    order,
  });

  it("hidden·scheduled 는 빼고 order 순", () => {
    const tabs = tabCategories([cat("CREATOR", "live", 2), cat("FOOTBALL", "hidden", 0), cat("KPOP", "live", 1), cat("KDRAMA", "scheduled", 3)]);
    expect(tabs.map((c) => c.id)).toEqual(["KPOP", "CREATOR"]);
  });
});

describe("filterByCategory — 탭 하나가 진행 중 · 마감을 함께 거른다 (D-63)", () => {
  const list = [t("k1"), t("c1", { category: "CREATOR" }), t("k2")];

  it("null = 전체", () => {
    expect(filterByCategory(list, null)).toHaveLength(3);
  });

  it("고른 카테고리만", () => {
    expect(filterByCategory(list, "CREATOR").map((x) => x.id)).toEqual(["c1"]);
  });
});

describe("matchesClosedSearch — 제목 3언어 + 챔피언 이름 (D-63)", () => {
  const row: ClosedRow = {
    t: t("e", { title: "걸그룹 서머송 48", titleI18n: { ko: "걸그룹 서머송 48", en: "Girl Group Summer Songs 48", es: "Canciones de verano 48" } }),
    champion: { name: "에스파", nameI18n: { ko: "에스파", en: "aespa", es: "aespa" } },
  };

  it("빈 검색어는 모두 맞음", () => {
    expect(matchesClosedSearch(row, "")).toBe(true);
    expect(matchesClosedSearch(row, "   ")).toBe(true);
  });

  it("제목 ko · en · es 어느 것이든 (대소문자 무시)", () => {
    expect(matchesClosedSearch(row, "서머송")).toBe(true);
    expect(matchesClosedSearch(row, "summer")).toBe(true);
    expect(matchesClosedSearch(row, "VERANO")).toBe(true);
  });

  it("챔피언 이름 — 한글 정본 · 언어별 표기", () => {
    expect(matchesClosedSearch(row, "에스파")).toBe(true);
    expect(matchesClosedSearch(row, "AESPA")).toBe(true);
  });

  it("맞지 않으면 false", () => {
    expect(matchesClosedSearch(row, "twice")).toBe(false);
    expect(matchesClosedSearch(row, "nothing")).toBe(false);
  });

  it("앞뒤 공백 무시 · 자모가 나뉜 한글(NFD)도 찾는다", () => {
    expect(matchesClosedSearch(row, "  서머송 ")).toBe(true);
    expect(matchesClosedSearch(row, "서머송".normalize("NFD"))).toBe(true);
  });
});

describe("paginate — 쪽 나누기", () => {
  const items = Array.from({ length: 23 }, (_, i) => i);

  it("10개씩 · 쪽 수", () => {
    const p = paginate(items, 1, 10);
    expect(p.items).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(p.pageCount).toBe(3);
    expect(paginate(items, 3, 10).items).toEqual([20, 21, 22]);
  });

  it("범위 밖 쪽은 끝으로 당긴다 · 빈 목록은 1쪽 1개", () => {
    expect(paginate(items, 9, 10).page).toBe(3);
    expect(paginate(items, 0, 10).page).toBe(1);
    expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, pageCount: 1 });
  });

  it("상수 — 게시판 10줄 · 진행 중 목록 4줄씩", () => {
    expect(CLOSED_PAGE_SIZE).toBe(10);
    expect(ACTIVE_PAGE_SIZE).toBe(4);
  });
});

describe("closedBoard — 카테고리 → 검색 → 쪽", () => {
  const rows: ClosedRow[] = Array.from({ length: 12 }, (_, i) => ({
    t: t(`e${i}`, { category: i % 3 === 0 ? "CREATOR" : "KPOP", deadlineMs: NOW - (i + 1) * H, title: `대회 ${i}` }),
    champion: i === 5 ? { name: "트와이스", nameI18n: { ko: "트와이스", en: "TWICE", es: "TWICE" } } : { name: `챔프${i}` },
  }));

  it("순서는 받은 그대로(마감 최신순은 split 이 정한다) · 10줄/쪽", () => {
    const b = closedBoard(rows, { category: null, query: "", page: 2 });
    expect(b.total).toBe(12);
    expect(b.pageCount).toBe(2);
    expect(b.rows.map((r) => r.t.id)).toEqual(["e10", "e11"]);
  });

  it("카테고리와 검색이 겹친다", () => {
    expect(closedBoard(rows, { category: "CREATOR", query: "", page: 1 }).total).toBe(4);
    expect(closedBoard(rows, { category: "KPOP", query: "twice", page: 1 }).rows.map((r) => r.t.id)).toEqual(["e5"]);
    expect(closedBoard(rows, { category: "CREATOR", query: "twice", page: 1 }).total).toBe(0);
  });
});

describe("toArenaTournament — Firestore 문서 → 화면 값", () => {
  const ts = (ms: number) => ({ toMillis: () => ms });

  it("필요한 칸만 · 시각은 ms", () => {
    const x = toArenaTournament("id1", {
      title: "T",
      titleI18n: { ko: "T", en: "T-en", es: "T-es" },
      description: { ko: "설명", en: "desc", es: "" },
      category: "KPOP",
      status: "active",
      hostUid: "h",
      featured: true,
      createdAt: ts(100),
      tournamentDeadline: ts(200),
      thumbnailPair: { a: "c1", b: "c2", aPos: 10, bPos: 90 },
      e2e: true,
      keywords: ["x"],
    });
    expect(x).toEqual({
      id: "id1",
      title: "T",
      titleI18n: { ko: "T", en: "T-en", es: "T-es" },
      description: { ko: "설명", en: "desc", es: "" },
      category: "KPOP",
      status: "active",
      hostUid: "h",
      e2e: true,
      featured: true,
      createdAtMs: 100,
      deadlineMs: 200,
      thumbnailPair: { a: "c1", b: "c2", aPos: 10, bPos: 90 },
    });
  });

  it("빠진 칸은 안전한 기본값 — 그대로 직렬화된다(undefined 없음)", () => {
    const x = toArenaTournament("id2", {});
    expect(x).toEqual({
      id: "id2",
      title: "",
      titleI18n: null,
      description: null,
      category: undefined,
      status: undefined,
      hostUid: undefined,
      e2e: undefined,
      featured: false,
      createdAtMs: null,
      deadlineMs: null,
    });
    expect(JSON.parse(JSON.stringify(x)).featured).toBe(false);
  });
});

describe("formatDeadline — 한국 시간 · MM.DD (요일) HH:mm", () => {
  const ms = Date.parse("2026-11-02T23:59:00+09:00");

  it("언어별 요일", () => {
    expect(formatDeadline(ms, "ko")).toBe("11.02 (월) 23:59");
    expect(formatDeadline(ms, "en")).toBe("11.02 (Mon) 23:59");
    expect(formatDeadline(ms, "es")).toBe("11.02 (lun) 23:59");
  });

  it("UTC 로는 다른 날이어도 한국 날짜", () => {
    expect(formatDeadline(Date.parse("2026-11-02T16:30:00Z"), "ko")).toBe("11.03 (화) 01:30");
  });

  it("마감 시각 없음 = 빈 글자", () => {
    expect(formatDeadline(null, "ko")).toBe("");
  });

  it("게시판 마감 칸 — 요일 없이", () => {
    expect(formatClosedAt(ms)).toBe("11.02 23:59");
    expect(formatClosedAt(null)).toBe("");
  });
});

describe("pageWindow — 쪽 번호는 최대 5개", () => {
  it("쪽이 적으면 전부", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it("지금 쪽을 가운데에 · 끝에서는 끝에 붙인다", () => {
    expect(pageWindow(6, 12)).toEqual([4, 5, 6, 7, 8]);
    expect(pageWindow(1, 12)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(12, 12)).toEqual([8, 9, 10, 11, 12]);
  });
});
