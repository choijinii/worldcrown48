/**
 * NAV-1 Phase A — 메뉴 지도 (프롬프트 §3 · §0-B · 정본 GNB.jsx).
 *
 * 메뉴바·서랍·펼침 메뉴가 그리는 모든 항목은 lib/layout/navMap 한 곳에서 나온다.
 * 여기서 순서 · 관리자 The Lab 자리 · 스위치 · 흐린 항목 · 펼침 항목 · 3언어를 못 박는다.
 */
import { describe, expect, it } from "vitest";
import {
  LAB_PUBLIC,
  activeNavKey,
  activeSubKey,
  drawerAdminItems,
  drawerItems,
  dropdownItems,
  isDimmed,
  menubarItems,
  NAV_ITEMS,
  type NavSub,
} from "@/lib/layout/navMap";
import { MESSAGES } from "@/lib/i18n/messages";

const keys = (xs: { key: string }[]) => xs.map((x) => x.key);
const allSubs = (): NavSub[] => NAV_ITEMS.flatMap((n) => n.children ?? []);

describe("메뉴바 항목 (§0-B 1 · 10 · 정본 1 · 28)", () => {
  it("팬 = 5개, 이 순서", () => {
    expect(keys(menubarItems({ admin: false, labPublic: false }))).toEqual([
      "pitch",
      "arena",
      "records",
      "newsroom",
      "locker",
    ]);
  });

  it("관리자 + 스위치 꺼짐 = 6개, The Lab 은 The Arena 바로 다음", () => {
    expect(keys(menubarItems({ admin: true, labPublic: false }))).toEqual([
      "pitch",
      "arena",
      "lab",
      "records",
      "newsroom",
      "locker",
    ]);
  });

  it("스위치 켜짐 = 팬에게도 같은 자리에 The Lab", () => {
    expect(keys(menubarItems({ admin: false, labPublic: true }))).toEqual(
      keys(menubarItems({ admin: true, labPublic: false })),
    );
  });

  it("스위치 기본값은 꺼짐 — The Lab 유저 공개는 MVP 1.5(대표 결정)", () => {
    expect(LAB_PUBLIC).toBe(false);
  });

  it("CTA(참가하기)·Launch Pad·Policy Hub 는 메뉴바에 없다", () => {
    const k = keys(menubarItems({ admin: true, labPublic: true }));
    expect(k).not.toContain("launch");
    expect(k).not.toContain("policy");
    expect(k).not.toContain("cta");
  });

  it("▾ 는 펼침 메뉴가 있는 세 항목에만", () => {
    const withMenu = menubarItems({ admin: true, labPublic: false })
      .filter((n) => dropdownItems(n.key).length > 0)
      .map((n) => n.key);
    expect(withMenu).toEqual(["arena", "records", "newsroom"]);
  });

  it("글자 자체의 주소 = 첫 화면 (§0-B 9 DoD)", () => {
    const href = Object.fromEntries(
      menubarItems({ admin: true, labPublic: false }).map((n) => [n.key, n.href]),
    );
    expect(href).toEqual({
      pitch: "/",
      arena: "/arena",
      lab: "/admin/lab",
      records: "/records",
      newsroom: "/news",
      locker: "/account",
    });
  });
});

describe("펼침 메뉴 = 하위 메뉴만, 카테고리 없음 (§0-B 9 · 정본 29 · 30)", () => {
  it("The Arena ▾ Arena Home · Record Room ▾ Charts · Hall of Fame · Newsroom ▾ All Articles", () => {
    expect(keys(dropdownItems("arena"))).toEqual(["arenaHome"]);
    expect(keys(dropdownItems("records"))).toEqual(["charts", "hallOfFame"]);
    expect(keys(dropdownItems("newsroom"))).toEqual(["allArticles"]);
    expect(dropdownItems("pitch")).toEqual([]);
    expect(dropdownItems("locker")).toEqual([]);
  });
});

describe("서랍 (정본 4 · 5 · 8 · §3)", () => {
  it("팬 항목 순서 · Launch Pad 없음 · Policy Hub 는 서랍에만", () => {
    expect(keys(drawerItems({ labPublic: false }))).toEqual([
      "pitch",
      "arena",
      "records",
      "newsroom",
      "locker",
      "policy",
    ]);
  });

  it("하위 목록 — The Arena 3 · Record Room 2 · Newsroom 6 · Policy Hub 4", () => {
    const byKey = Object.fromEntries(drawerItems({ labPublic: false }).map((n) => [n.key, keys(n.children ?? [])]));
    expect(byKey.arena).toEqual(["arenaHome", "kpop", "creator"]);
    expect(byKey.records).toEqual(["charts", "hallOfFame"]);
    expect(byKey.newsroom).toEqual([
      "allArticles",
      "rankings",
      "newsRecords",
      "stars",
      "tournaments",
      "worldPress",
    ]);
    expect(byKey.policy).toEqual(["privacy", "terms", "community", "cookies"]);
    expect(byKey.pitch).toEqual([]);
    expect(byKey.locker).toEqual([]);
  });

  it("관리자 묶음 = The Lab · Admin Dashboard · News Desk — 관리자에게만", () => {
    expect(keys(drawerAdminItems({ admin: true, labPublic: false }))).toEqual([
      "lab",
      "adminDashboard",
      "newsDesk",
    ]);
    expect(drawerAdminItems({ admin: false, labPublic: false })).toEqual([]);
    expect(drawerAdminItems({ admin: false, labPublic: true })).toEqual([]);
  });

  it("스위치 켜짐 — The Lab 은 팬 항목(The Arena 다음)으로 옮기고 관리자 묶음에서 빠진다", () => {
    expect(keys(drawerItems({ labPublic: true })).slice(0, 3)).toEqual(["pitch", "arena", "lab"]);
    expect(keys(drawerAdminItems({ admin: true, labPublic: true }))).toEqual(["adminDashboard", "newsDesk"]);
  });

  it("관리자 주소", () => {
    expect(drawerAdminItems({ admin: true, labPublic: false }).map((a) => a.href)).toEqual([
      "/admin/lab",
      "/admin",
      "/admin/newsdesk",
    ]);
  });
});

describe("흐린 항목 (§0-B 2 · R3)", () => {
  it("정본 GNB.jsx 의 DIM 목록과 같다 — 판정은 키로", () => {
    const dimmed = allSubs().filter(isDimmed).map((s) => s.key);
    expect(dimmed).toEqual([
      "kpop",
      "creator",
      "hallOfFame",
      "rankings",
      "newsRecords",
      "stars",
      "tournaments",
      "worldPress",
    ]);
  });

  it("흐린 항목에는 주소가 없고, 열린 항목에는 있다", () => {
    for (const s of allSubs()) {
      if (isDimmed(s)) expect(s.href).toBeNull();
      else expect(s.href).toMatch(/^\//);
    }
  });

  it("열린 하위 주소", () => {
    const href = Object.fromEntries(allSubs().filter((s) => !isDimmed(s)).map((s) => [s.key, s.href]));
    expect(href).toEqual({
      arenaHome: "/arena",
      charts: "/records",
      allArticles: "/news",
      privacy: "/policies/privacy",
      terms: "/policies/terms",
      community: "/policies/community",
      cookies: "/policies/cookies",
    });
  });
});

describe("3개 언어 라벨", () => {
  it("모든 하위 항목 라벨 키가 카탈로그에 ko · en · es 로 있다", () => {
    for (const s of allSubs()) {
      const entry = MESSAGES[s.labelKey] as { ko?: string; en?: string; es?: string } | undefined;
      expect(entry, s.labelKey).toBeDefined();
      expect(entry?.ko, `${s.labelKey}.ko`).toBeTruthy();
      expect(entry?.en, `${s.labelKey}.en`).toBeTruthy();
      expect(entry?.es, `${s.labelKey}.es`).toBeTruthy();
    }
  });

  it("메뉴·브랜드 이름은 3언어 모두 영어 그대로 (§3)", () => {
    const brand = ["arenaHome", "kpop", "creator", "charts", "hallOfFame"];
    for (const s of allSubs().filter((x) => brand.includes(x.key))) {
      const e = MESSAGES[s.labelKey] as { ko: string; en: string; es: string };
      expect(e.ko).toBe(e.en);
      expect(e.es).toBe(e.en);
    }
    for (const n of NAV_ITEMS) expect(n.label).toMatch(/^[A-Za-z ]+$/);
  });
});

describe("현재 항목 판정", () => {
  it.each([
    ["/", "pitch"],
    ["/arena", "arena"],
    ["/arena/abc", "arena"],
    ["/arena/abc/champion", "arena"],
    ["/arena/abc/ranking", "records"],
    ["/records", "records"],
    ["/news", "newsroom"],
    ["/news/some-slug", "newsroom"],
    ["/account", "locker"],
    ["/admin/lab", "lab"],
    ["/admin/lab/new", "lab"],
    ["/admin", null],
    ["/policies/privacy", null],
    ["/launch", null],
    ["/arenas", null],
  ])("%s → %s", (path, key) => {
    expect(activeNavKey(path)).toBe(key);
  });

  it.each([
    ["/arena", "arenaHome"],
    ["/records", "charts"],
    ["/arena/abc/ranking", "charts"],
    ["/news", "allArticles"],
    ["/news/x", null],
    ["/", null],
  ])("하위 %s → %s", (path, key) => {
    expect(activeSubKey(path)).toBe(key);
  });
});
