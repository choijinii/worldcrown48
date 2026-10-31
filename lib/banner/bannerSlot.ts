/**
 * bannerSlot — 배너 자리 선택 규칙 (ARENA-1 PR 1 · 원장 D-21 · 킥 §12 B-2).
 *
 * 배너는 화면 하나의 장식이 아니라 사이트 전체의 **자리 체계**다. 자리마다 이름이 있고,
 * 관리자가 `banners` 컬렉션에 무엇을 보일지 넣는다(관리 화면 = 소킥 BANNER-1).
 *
 *   · 자리 이름이 같고 · 켜져 있고(active) · 노출 기간 안인 배너 중 priority 가 가장 작은 1건.
 *     자동 회전(캐러셀) 없음 — 자리당 1장 (D-21 아니라고 한 것).
 *   · 없으면 **기본 공지**. "빈칸 런칭 금지"를 기술로 보장하는 장치라 resolveBanner 는
 *     절대 빈 값을 돌려주지 않는다.
 *
 * 순수 모듈 — Firestore 읽기·렌더는 components/layout/BannerSlot 이 한다.
 */
import type { MessageKey } from "@/lib/i18n/messages";
import type { LocalizedText } from "@/lib/types/tournament";
import { LAUNCH_AT_MS, isBeforeLaunch } from "@/lib/launch/launchAt";

/** 런칭 시점 자리 목록(D-21 정의). */
export const BANNER_SLOT_NAMES = [
  "arena-match-below",
  "arena-home",
  "pitch-between",
  "newsroom-list",
  "newsroom-article",
  /** NAV-1 — `/records` Charts 대회 목록 아래(970×90 / 320×100, 정본 31 · 32). */
  "records-below",
  /** NAV-1 — `/account` 비로그인 안내 화면 아래(970×90 / 320×100, 정본 v4 40 · 41). */
  "locker-below",
  /** PRE-REG-1 — `/launch` 맨 아래(SNS 링크 아래 · 970×90 / 320×100). 등록 칸 근처에 두지 않는다. */
  "launch-below",
  /** ARENA-2 — 아레나 홈 진행 중 목록 아래 가로 띠(970×90 / 320×100 · D-21). */
  "arena-between",
  /** ARENA-2 — 가로 띠 오른쪽 칸(300×90 · 데스크톱만 · D-69). */
  "arena-beside",
  /** ARENA-2 — 진행 중 목록 오른쪽 "카테고리 뉴스" 칸 안(300×250 · D-69). */
  "arena-side-active",
  /** ARENA-2 — 마감 대회 게시판 오른쪽 "마감 대회 뉴스" 칸 안(300×250 · D-69). */
  "arena-side-closed",
] as const;

export type BannerSlotName = (typeof BANNER_SLOT_NAMES)[number];

/** Firestore Timestamp · epoch ms 둘 다 받는다. */
type TimeLike = number | { toMillis: () => number };

/** `banners/{id}` 문서 (최소 형태 — 킥 §12 B-2). 종류는 지금 공지만. */
export interface BannerDoc {
  id: string;
  slot: string;
  kind: "notice";
  title: LocalizedText;
  body?: LocalizedText;
  href?: string;
  active: boolean;
  priority: number;
  startAt?: TimeLike | null;
  endAt?: TimeLike | null;
}

export type BannerAudience = "guest" | "member";

export type DefaultNotice =
  | { titleKey: MessageKey; action: "signIn" }
  | { titleKey: MessageKey; action: "link"; href: string }
  /** 누르지 않는 글자 배너 — 링크·화살표 없음(사전등록 페이지 · 원장 D-60). */
  | { titleKey: MessageKey; action: "text" };

export type ResolvedBanner =
  | { source: "doc"; banner: BannerDoc }
  | { source: "default"; notice: DefaultNotice };

function toMs(t: TimeLike | null | undefined): number | null {
  if (typeof t === "number") return t;
  if (t && typeof t.toMillis === "function") return t.toMillis();
  return null;
}

function hasTitle(d: BannerDoc): boolean {
  const t = d.title;
  return Boolean(t && typeof t === "object" && [t.ko, t.en, t.es].some((s) => typeof s === "string" && s.trim()));
}

function inWindow(d: BannerDoc, nowMs: number): boolean {
  const start = toMs(d.startAt);
  const end = toMs(d.endAt);
  if (start !== null && nowMs < start) return false;
  if (end !== null && nowMs > end) return false;
  return true;
}

const priorityOf = (d: BannerDoc): number =>
  typeof d.priority === "number" && Number.isFinite(d.priority) ? d.priority : Number.POSITIVE_INFINITY;

export function pickBanner(docs: BannerDoc[], slot: string, nowMs: number): BannerDoc | null {
  const live = docs
    .filter((d) => d && d.slot === slot && d.active === true && hasTitle(d) && inWindow(d, nowMs))
    .sort((a, b) => priorityOf(a) - priorityOf(b));
  return live[0] ?? null;
}

/** 게스트(익명)·미로그인 = guest. 기본 공지의 갈래를 정한다. */
export function bannerAudience(user: { signedIn: boolean; isAnonymous: boolean }): BannerAudience {
  return user.signedIn && !user.isAnonymous ? "member" : "guest";
}

/**
 * 기본 공지 — 대표 승인 2026-09-19.
 *   게이트 1 (guest)  : 로그인 유도 — 링크는 로그인 화면
 *   게이트 4 (member) : 크라운 카드 **공유** 유도 — 링크는 /account 카드 목록
 */
/**
 * 아레나 홈 광고 칸(300×250 · 300×90 · D-69)의 기본 공지 — 자리마다 쓸모 있는 안내 하나
 * (D-21 "팬에게 유익한 공지"). 같은 화면에 로그인 유도가 여러 번 겹치지 않게 가로 띠 하나만
 * 사이트 기본 공지를 쓴다. 비로그인·로그인 같음.
 */
export const ARENA_AD_BOX_NOTICES = {
  "arena-beside": { titleKey: "banner.arena.beside.title", action: "link", href: "/records" },
  "arena-side-active": { titleKey: "banner.arena.sideActive.title", action: "link", href: "/news" },
  "arena-side-closed": { titleKey: "banner.arena.sideClosed.title", action: "link", href: "/records" },
} as const satisfies Partial<Record<BannerSlotName, DefaultNotice>>;

export function defaultNotice(audience: BannerAudience, slot?: string): DefaultNotice {
  // 사전등록 페이지 맨 아래는 사전등록 참가 안내 글자 하나 — 로그인 유도를 하지 않는다(원장 D-60).
  if (slot === "launch-below") return { titleKey: "banner.launch.title", action: "text" };
  if (slot && slot in ARENA_AD_BOX_NOTICES) return ARENA_AD_BOX_NOTICES[slot as keyof typeof ARENA_AD_BOX_NOTICES];
  return audience === "member"
    ? { titleKey: "banner.default.member.title", action: "link", href: "/account" }
    : { titleKey: "banner.default.guest.title", action: "signIn" };
}

/**
 * 런칭 전 기본 공지 = 사전등록 안내 (원장 D-59 · 2026-10-18 대표). 누르면 `/launch`.
 * 런칭 시각(`LAUNCH_AT_MS`)이 지나면 자동으로 위 `defaultNotice` 로 돌아간다 — 런칭 날
 * 끄는 작업이 없다. 관문(피치 → /launch 돌려보내기)은 만들지 않는다(D-59 아니라고 한 것).
 */
const PRELAUNCH_SLOTS: readonly string[] = ["pitch-between"];
const PRELAUNCH_NOTICE: DefaultNotice = {
  titleKey: "banner.prelaunch.title",
  action: "link",
  href: "/launch",
};

export function resolveBanner(
  docs: BannerDoc[],
  slot: string,
  nowMs: number,
  audience: BannerAudience,
  launchAtMs: number = LAUNCH_AT_MS,
): ResolvedBanner {
  const banner = pickBanner(docs, slot, nowMs);
  if (banner) return { source: "doc", banner };
  if (PRELAUNCH_SLOTS.includes(slot) && isBeforeLaunch(nowMs, launchAtMs)) {
    return { source: "default", notice: PRELAUNCH_NOTICE };
  }
  return { source: "default", notice: defaultNotice(audience, slot) };
}
