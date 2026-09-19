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

/** 런칭 시점 자리 목록(D-21 정의). 이 PR은 ① 만 배치한다. */
export type BannerSlotName =
  | "arena-match-below"
  | "arena-home"
  | "pitch-between"
  | "newsroom-list"
  | "newsroom-article";

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
  | { titleKey: MessageKey; action: "link"; href: string };

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
export function defaultNotice(audience: BannerAudience): DefaultNotice {
  return audience === "member"
    ? { titleKey: "banner.default.member.title", action: "link", href: "/account" }
    : { titleKey: "banner.default.guest.title", action: "signIn" };
}

export function resolveBanner(
  docs: BannerDoc[],
  slot: string,
  nowMs: number,
  audience: BannerAudience,
): ResolvedBanner {
  const banner = pickBanner(docs, slot, nowMs);
  return banner ? { source: "doc", banner } : { source: "default", notice: defaultNotice(audience) };
}
