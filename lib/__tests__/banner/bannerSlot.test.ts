/**
 * ARENA-1 PR 1 — 배너 자리 (원장 D-21 · 킥 §12 B-2).
 *
 * 자리(slot) 이름으로 `banners` 에서 켜진 배너 1건을 고른다(priority 오름차순).
 * 없으면 **기본 공지**를 보인다 — "빈칸 런칭 금지"를 기술적으로 보장하는 장치다.
 * 기본 공지는 비로그인(게스트 포함) = 로그인 유도 / 로그인 = 크라운 카드 공유 유도 (§5 게이트 1·4).
 */
import { describe, expect, it } from "vitest";
import {
  ARENA_AD_BOX_NOTICES,
  BANNER_SLOT_NAMES,
  bannerAudience,
  defaultNotice,
  pickBanner,
  resolveBanner,
  type BannerDoc,
  type BannerSlotName,
} from "@/lib/banner/bannerSlot";
import { MESSAGES } from "@/lib/i18n/messages";
import { LAUNCH_AT_MS } from "@/lib/launch/launchAt";

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

describe("자리 이름 목록 (D-21)", () => {
  it("NAV-1 — Locker Room 안내 화면 아래 자리 locker-below 가 있다(정본 40 · 41)", () => {
    expect(BANNER_SLOT_NAMES).toContain("locker-below");
    expect(BANNER_SLOT_NAMES).toContain("records-below");
  });

  it("locker-below 도 배너가 없으면 기본 공지 — 빈칸 금지", () => {
    const r = resolveBanner([], "locker-below" satisfies BannerSlotName, NOW, "guest");
    expect(r.source).toBe("default");
  });

  it("PRE-REG-1 — 사전등록 페이지 맨 아래 자리 launch-below 가 있다(원장 D-21 적용)", () => {
    expect(BANNER_SLOT_NAMES).toContain("launch-below");
  });

  it("launch-below 의 기본 공지는 누르지 않는 글자 배너 하나 — 비로그인·로그인 같음(원장 D-60)", () => {
    for (const audience of ["guest", "member"] as const) {
      expect(resolveBanner([], "launch-below" satisfies BannerSlotName, NOW, audience)).toEqual({
        source: "default",
        notice: { titleKey: "banner.launch.title", action: "text" },
      });
    }
  });

  it("다른 자리의 기본 공지는 그대로(launch-below 만 바뀐다)", () => {
    // pitch-between 의 런칭 전 기본 공지는 D-59 시험이 따로 본다.
    for (const slot of BANNER_SLOT_NAMES.filter((n) => n !== "launch-below" && n !== "pitch-between" && !(n in ARENA_AD_BOX_NOTICES))) {
      expect(resolveBanner([], slot, NOW, "guest")).toEqual({ source: "default", notice: defaultNotice("guest") });
      expect(resolveBanner([], slot, NOW, "member")).toEqual({ source: "default", notice: defaultNotice("member") });
    }
  });
});

// THUMB-1 PR 2 · 원장 D-59 — 런칭 전 피치 배너 자리의 기본 공지 = 사전등록 안내.
describe("D-59 — 런칭 전 pitch-between 기본 공지 = 사전등록 안내", () => {
  const BEFORE = LAUNCH_AT_MS - 60_000;
  const AFTER = LAUNCH_AT_MS + 60_000;
  const PRELAUNCH = {
    source: "default",
    notice: { titleKey: "banner.prelaunch.title", action: "link", href: "/launch" },
  };

  it("런칭 전 · 배너가 없으면 사전등록 안내 + /launch 링크 (게스트·로그인 같다)", () => {
    expect(resolveBanner([], "pitch-between", BEFORE, "guest")).toEqual(PRELAUNCH);
    expect(resolveBanner([], "pitch-between", BEFORE, "member")).toEqual(PRELAUNCH);
  });

  it("런칭 시각이 지나면 자동으로 기존 기본 공지(2026-09-19 승인본)", () => {
    expect(resolveBanner([], "pitch-between", AFTER, "guest")).toEqual({
      source: "default",
      notice: defaultNotice("guest"),
    });
    expect(resolveBanner([], "pitch-between", LAUNCH_AT_MS, "member")).toEqual({
      source: "default",
      notice: defaultNotice("member"),
    });
  });

  it("관리자가 넣은 배너가 있으면 런칭 전에도 그 배너 — 바뀌는 건 기본 공지뿐", () => {
    const r = resolveBanner([doc({ slot: "pitch-between" })], "pitch-between", BEFORE, "guest");
    expect(r.source).toBe("doc");
  });

  it("다른 자리는 런칭 전에도 기존 기본 공지 그대로", () => {
    for (const slot of BANNER_SLOT_NAMES.filter((s) => s !== "pitch-between")) {
      expect(resolveBanner([], slot, BEFORE, "guest")).toEqual({
        source: "default",
        notice: defaultNotice("guest", slot), // launch-below 는 D-60 글자 배너
      });
    }
  });

  it("런칭 시각을 주입할 수 있다(설정값 하나 기준)", () => {
    expect(resolveBanner([], "pitch-between", 100, "guest", 200)).toEqual(PRELAUNCH);
    expect(resolveBanner([], "pitch-between", 200, "guest", 200).source === "default").toBe(true);
    expect(resolveBanner([], "pitch-between", 200, "guest", 200)).not.toEqual(PRELAUNCH);
  });

  it("사전등록 안내 문구는 3언어가 다 있고 날짜·숫자·금지 낱말이 없다", () => {
    const m = MESSAGES["banner.prelaunch.title" as keyof typeof MESSAGES] as Record<string, string>;
    for (const lang of ["ko", "en", "es"]) {
      expect(m[lang], lang).toBeTruthy();
      expect(m[lang]).not.toMatch(/\d/);
      expect(m[lang]).not.toMatch(/표|투표|Vote|Voter|월드컵|FIFA|The Lab|배지|badge/i);
    }
  });
});

// ARENA-2 PR 1 · 원장 D-21 · D-69 — 아레나 홈 자리. 가로 띠(970×90 / 320×100)는 기본 공지 그대로,
// 광고 칸(300×250 · 300×90)은 자리마다 쓸모 있는 안내 하나(D-21 "팬에게 유익한 공지").
describe("ARENA-2 — 아레나 홈 배너 자리", () => {
  it("자리 이름 — 가로 띠 · 띠 옆 칸 · 오른쪽 칸 둘", () => {
    for (const n of ["arena-between", "arena-beside", "arena-side-active", "arena-side-closed"]) {
      expect(BANNER_SLOT_NAMES).toContain(n);
    }
  });

  it("가로 띠 arena-between 은 사이트 기본 공지(로그인 · 공유 유도)", () => {
    expect(resolveBanner([], "arena-between", NOW, "guest")).toEqual({ source: "default", notice: defaultNotice("guest") });
    expect(resolveBanner([], "arena-between", NOW, "member")).toEqual({ source: "default", notice: defaultNotice("member") });
  });

  it("광고 칸의 기본 공지 — 차트 · 뉴스룸으로 가는 안내 (게스트 · 로그인 같다)", () => {
    const expected = {
      "arena-beside": { titleKey: "banner.arena.beside.title", action: "link", href: "/records" },
      "arena-side-active": { titleKey: "banner.arena.sideActive.title", action: "link", href: "/news" },
      "arena-side-closed": { titleKey: "banner.arena.sideClosed.title", action: "link", href: "/records" },
    } as const;
    for (const [slot, notice] of Object.entries(expected)) {
      for (const audience of ["guest", "member"] as const) {
        expect(resolveBanner([], slot, NOW, audience)).toEqual({ source: "default", notice });
      }
    }
  });

  it("광고 칸 기본 공지 문구는 3언어가 다 있다", () => {
    for (const n of Object.values(ARENA_AD_BOX_NOTICES)) {
      const m = MESSAGES[n.titleKey] as { ko: string; en: string; es?: string };
      expect(m.ko && m.en && m.es).toBeTruthy();
    }
  });

  it("관리자가 넣은 배너가 있으면 광고 칸도 그 배너", () => {
    expect(resolveBanner([doc({ slot: "arena-side-active" })], "arena-side-active", NOW, "guest").source).toBe("doc");
  });
});
