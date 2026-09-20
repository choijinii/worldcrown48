/**
 * ARENA-1 PR 1 — 배너 자리 (원장 D-21 · 킥 §12 B-2).
 *
 * 자리(slot) 이름으로 `banners` 에서 켜진 배너 1건을 고른다(priority 오름차순).
 * 없으면 **기본 공지**를 보인다 — "빈칸 런칭 금지"를 기술적으로 보장하는 장치다.
 * 기본 공지는 비로그인(게스트 포함) = 로그인 유도 / 로그인 = 크라운 카드 공유 유도 (§5 게이트 1·4).
 */
import { describe, expect, it } from "vitest";
import {
  bannerAudience,
  defaultNotice,
  pickBanner,
  resolveBanner,
  type BannerDoc,
} from "@/lib/banner/bannerSlot";
import { MESSAGES } from "@/lib/i18n/messages";

const NOW = Date.UTC(2026, 8, 19, 12, 0, 0);

const doc = (over: Partial<BannerDoc> = {}): BannerDoc => ({
  id: "b1",
  slot: "arena-match-below",
  kind: "notice",
  title: { ko: "공지", en: "Notice", es: "Aviso" },
  active: true,
  priority: 10,
  ...over,
});

describe("pickBanner", () => {
  it("배너가 없으면 null", () => {
    expect(pickBanner([], "arena-match-below", NOW)).toBeNull();
  });

  it("켜진 배너 1건을 고른다", () => {
    expect(pickBanner([doc()], "arena-match-below", NOW)?.id).toBe("b1");
  });

  it("꺼진 배너는 무시한다", () => {
    expect(pickBanner([doc({ active: false })], "arena-match-below", NOW)).toBeNull();
  });

  it("다른 자리의 배너는 무시한다", () => {
    expect(pickBanner([doc({ slot: "pitch-between" })], "arena-match-below", NOW)).toBeNull();
  });

  it("여러 건이면 priority 가 작은 것 하나 (자동 회전 없음 — D-21)", () => {
    const got = pickBanner(
      [doc({ id: "late", priority: 20 }), doc({ id: "first", priority: 1 }), doc({ id: "mid", priority: 5 })],
      "arena-match-below",
      NOW,
    );
    expect(got?.id).toBe("first");
  });

  it("노출 기간 밖이면 무시한다 (startAt 전 · endAt 후)", () => {
    expect(pickBanner([doc({ startAt: NOW + 1 })], "arena-match-below", NOW)).toBeNull();
    expect(pickBanner([doc({ endAt: NOW - 1 })], "arena-match-below", NOW)).toBeNull();
    expect(pickBanner([doc({ startAt: NOW - 1, endAt: NOW + 1 })], "arena-match-below", NOW)?.id).toBe("b1");
  });

  it("Firestore Timestamp 모양(toMillis)도 읽는다", () => {
    const ts = (ms: number) => ({ toMillis: () => ms });
    expect(pickBanner([doc({ endAt: ts(NOW - 1) })], "arena-match-below", NOW)).toBeNull();
    expect(pickBanner([doc({ startAt: ts(NOW - 1) })], "arena-match-below", NOW)?.id).toBe("b1");
  });

  it("제목이 빈 배너는 고르지 않는다 — 빈 상자를 그리지 않는다", () => {
    expect(
      pickBanner([doc({ title: { ko: "", en: "", es: "" } })], "arena-match-below", NOW),
    ).toBeNull();
  });

  it("모양이 깨진 문서(title 없음·priority 문자열)는 무시하거나 뒤로 민다", () => {
    const broken = { ...doc({ id: "broken" }), title: undefined } as unknown as BannerDoc;
    expect(pickBanner([broken], "arena-match-below", NOW)).toBeNull();
    const oddPriority = doc({ id: "odd", priority: "x" as unknown as number });
    expect(pickBanner([oddPriority, doc({ id: "ok", priority: 99 })], "arena-match-below", NOW)?.id).toBe("ok");
  });
});

describe("bannerAudience", () => {
  it("로그인(익명 아님) = member, 게스트·미확인 = guest", () => {
    expect(bannerAudience({ signedIn: true, isAnonymous: false })).toBe("member");
    expect(bannerAudience({ signedIn: true, isAnonymous: true })).toBe("guest");
    expect(bannerAudience({ signedIn: false, isAnonymous: false })).toBe("guest");
  });
});

describe("defaultNotice — §5 게이트 1·4", () => {
  it("게스트 → 로그인 유도 (링크: 로그인 화면)", () => {
    expect(defaultNotice("guest")).toEqual({
      titleKey: "banner.default.guest.title",
      action: "signIn",
    });
  });
  it("로그인 → 크라운 카드 공유 유도 (링크: /account 카드 목록)", () => {
    expect(defaultNotice("member")).toEqual({
      titleKey: "banner.default.member.title",
      action: "link",
      href: "/account",
    });
  });
});

describe("resolveBanner — 빈칸 런칭 금지", () => {
  it("배너가 있으면 그 배너", () => {
    const r = resolveBanner([doc()], "arena-match-below", NOW, "guest");
    expect(r.source).toBe("doc");
  });
  it("없으면 언제나 기본 공지 (null 을 돌려주지 않는다)", () => {
    expect(resolveBanner([], "arena-match-below", NOW, "guest")).toEqual({
      source: "default",
      notice: defaultNotice("guest"),
    });
    expect(resolveBanner([doc({ active: false })], "arena-match-below", NOW, "member").source).toBe(
      "default",
    );
  });
});

// 기본 공지 문구 — §5 게이트 1·4 대표 승인본(2026-09-19)을 글자 단위로 고정한다.

describe("기본 공지 문구 (대표 승인 2026-09-19)", () => {
  it("게이트 1 — 비로그인: 로그인 유도", () => {
    expect(MESSAGES["banner.default.guest.title"]).toEqual({
      ko: "로그인하면 크라운 카드를 간직하고, 대회마다 하루 5번 참여할 수 있어요",
      en: "Sign in to keep your Crown Card and play up to 5 times a day per tournament",
      es: "Inicia sesión para guardar tu Crown Card y participar hasta 5 veces al día por torneo",
    });
  });
  it("게이트 4 — 로그인: 크라운 카드 공유 유도", () => {
    expect(MESSAGES["banner.default.member.title"]).toEqual({
      ko: "대회를 마치면 크라운 카드가 생겨요 — 친구에게 공유해 보세요",
      en: "Finish a tournament to earn your Crown Card — share it with friends",
      es: "Termina un torneo y consigue tu Crown Card — compártela con tus amigos",
    });
  });
});
