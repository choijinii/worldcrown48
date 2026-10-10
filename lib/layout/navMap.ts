/**
 * navMap — 메뉴 지도 한 곳 (NAV-1 · 프롬프트 §3 · §0-B · 정본 GNB.jsx).
 *
 * 메뉴바 · 펼침 메뉴 · ☰ 서랍이 그리는 모든 항목이 여기서 나온다. 부품은 그리기만 한다.
 *
 *   메뉴바   The Pitch · The Arena ▾ · [The Lab] · Record Room ▾ · Newsroom ▾ · Locker Room
 *   펼침     하위 메뉴만(카테고리는 서랍에만) — §0-B 9
 *   서랍     전체 나무 + Policy Hub, 관리자 묶음은 구분선 아래 — 정본 4 · 5 · 8
 *
 * **흐린 항목** = 아직 페이지가 없는 하위 항목. 주소(`href`)가 `null` 인 것이 곧 흐림이다 —
 * 판정은 표시 이름이 아니라 키로 한다(프롬프트 §2-B). 화면에 "곧 열림" 글자는 없다(§0-B 2).
 *
 * **The Lab 스위치**(§0-B 10) — `LAB_PUBLIC`. 꺼져 있으면 The Lab 은 관리자에게만 보인다
 * (원장 D-19 "팬에게 안 보임"). 켜면 팬 메뉴의 The Arena 다음 자리에 나타난다.
 * *이 스위치가 정하지 않는 것*: 페이지 보호 — `/admin/lab` 은 켜져도 `adminGate` 가 지킨다.
 *
 * 메뉴·브랜드 이름(The Pitch · The Arena · …)은 3개 언어 모두 영어 그대로라 `label` 은 글자,
 * 하위 항목은 언어마다 다를 수 있어 카탈로그 키(`labelKey`)를 가진다.
 */
import type { MessageKey } from "@/lib/i18n/messages";

/** The Lab 을 팬 메뉴에 보일지. 유저 공개 날 이 한 줄을 true 로 바꾼다(MVP 1.5 · 대표 결정). */
export const LAB_PUBLIC = false;

export type NavKey = "pitch" | "arena" | "lab" | "records" | "newsroom" | "locker" | "policy";

export type NavSubKey =
  | "arenaHome"
  | "kpop"
  | "creator"
  | "charts"
  | "hallOfFame"
  | "allArticles"
  | "rankings"
  | "newsRecords"
  | "stars"
  | "tournaments"
  | "worldPress"
  | "privacy"
  | "terms"
  | "community"
  | "cookies";

export interface NavSub {
  key: NavSubKey;
  labelKey: MessageKey;
  /** `null` = 아직 페이지가 없다 → 흐린 줄(링크 아님). */
  href: string | null;
  /** 메뉴바 펼침 메뉴에도 나오는가(§0-B 9). 서랍에는 언제나 나온다. */
  inDropdown?: boolean;
}

export interface NavItem {
  key: NavKey;
  /** 3개 언어 모두 같은 영어 이름. */
  label: string;
  /** 글자 자체를 누르면 가는 첫 화면. Policy Hub 는 서랍에서 펼치기만 한다(`null`). */
  href: string | null;
  children?: NavSub[];
  /** 서랍에만 나온다(메뉴바에 없음). */
  drawerOnly?: boolean;
}

export interface AdminNavItem {
  key: "lab" | "adminDashboard" | "newsDesk";
  label: string;
  href: string;
}

const LAB: NavItem = { key: "lab", label: "The Lab", href: "/admin/lab" };

/** 팬 메뉴 나무(The Lab 제외). 순서가 곧 화면 순서. */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: "pitch", label: "The Pitch", href: "/" },
  {
    key: "arena",
    label: "The Arena",
    href: "/arena",
    children: [
      { key: "arenaHome", labelKey: "nav.sub.arenaHome", href: "/arena", inDropdown: true },
      { key: "kpop", labelKey: "nav.sub.kpop", href: null },
      { key: "creator", labelKey: "nav.sub.creator", href: null },
    ],
  },
  {
    key: "records",
    label: "Record Room",
    href: "/records",
    children: [
      { key: "charts", labelKey: "nav.sub.charts", href: "/records", inDropdown: true },
      { key: "hallOfFame", labelKey: "nav.sub.hallOfFame", href: null, inDropdown: true },
    ],
  },
  {
    key: "newsroom",
    label: "Newsroom",
    href: "/news",
    children: [
      { key: "allArticles", labelKey: "nav.sub.allArticles", href: "/news", inDropdown: true },
      { key: "rankings", labelKey: "nav.sub.rankings", href: null },
      { key: "newsRecords", labelKey: "nav.sub.newsRecords", href: null },
      { key: "stars", labelKey: "nav.sub.stars", href: null },
      { key: "tournaments", labelKey: "nav.sub.tournaments", href: null },
      { key: "worldPress", labelKey: "nav.sub.worldPress", href: null },
    ],
  },
  { key: "locker", label: "Locker Room", href: "/account" },
  {
    key: "policy",
    label: "Policy Hub",
    href: null,
    drawerOnly: true,
    children: [
      { key: "privacy", labelKey: "nav.sub.privacy", href: "/policies/privacy" },
      { key: "terms", labelKey: "nav.sub.terms", href: "/policies/terms" },
      { key: "community", labelKey: "nav.sub.community", href: "/policies/community" },
      { key: "cookies", labelKey: "nav.sub.cookies", href: "/policies/cookies" },
    ],
  },
];

/** The Lab 을 The Arena 바로 다음에 끼운다(정본 28). */
function withLab(items: readonly NavItem[]): NavItem[] {
  return items.flatMap((n) => (n.key === "arena" ? [n, LAB] : [n]));
}

/** 데스크톱 메뉴바. 팬 5개 · 관리자(스위치 꺼짐) 또는 스위치 켜짐 6개. */
export function menubarItems(opts: { admin: boolean; labPublic: boolean }): NavItem[] {
  const fan = NAV_ITEMS.filter((n) => !n.drawerOnly);
  return opts.admin || opts.labPublic ? withLab(fan) : [...fan];
}

/** 서랍의 팬 항목. 스위치가 켜지면 The Lab 이 팬 항목이 된다. */
export function drawerItems(opts: { labPublic: boolean }): NavItem[] {
  return opts.labPublic ? withLab(NAV_ITEMS) : [...NAV_ITEMS];
}

/** 서랍 구분선 아래 관리자 묶음(정본 5). 관리자가 아니면 빈 목록. */
export function drawerAdminItems(opts: { admin: boolean; labPublic: boolean }): AdminNavItem[] {
  if (!opts.admin) return [];
  const all: AdminNavItem[] = [
    { key: "lab", label: "The Lab", href: "/admin/lab" },
    { key: "adminDashboard", label: "Admin Dashboard", href: "/admin" },
    { key: "newsDesk", label: "News Desk", href: "/admin/newsdesk" },
  ];
  return opts.labPublic ? all.filter((a) => a.key !== "lab") : all;
}

/** 메뉴바 ▾ 펼침 메뉴의 항목. 펼침이 없는 항목은 빈 목록. */
export function dropdownItems(key: NavKey): NavSub[] {
  const item = NAV_ITEMS.find((n) => n.key === key);
  return (item?.children ?? []).filter((s) => s.inDropdown);
}

/** 아직 페이지가 없는 하위 항목. */
export function isDimmed(sub: NavSub): boolean {
  return sub.href === null;
}

function under(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * 지금 페이지가 어느 메뉴에 속하나(`aria-current`). 대회의 **차트**는 Record Room ▸ Charts 의
 * 목적지라 Record Room, 매치·크라운 카드는 The Arena.
 */
export function activeNavKey(pathname: string): NavKey | null {
  if (pathname === "/") return "pitch";
  if (under(pathname, "/arena")) return pathname.endsWith("/ranking") ? "records" : "arena";
  if (under(pathname, "/records")) return "records";
  if (under(pathname, "/news")) return "newsroom";
  if (under(pathname, "/account")) return "locker";
  if (under(pathname, "/admin/lab")) return "lab";
  return null;
}

/** 펼침 메뉴·서랍에서 지금 줄(흰색 700 + 왼쪽 표식). */
export function activeSubKey(pathname: string): NavSubKey | null {
  if (pathname === "/arena") return "arenaHome";
  if (pathname === "/records" || (under(pathname, "/arena") && pathname.endsWith("/ranking"))) return "charts";
  if (pathname === "/news") return "allArticles";
  return null;
}
