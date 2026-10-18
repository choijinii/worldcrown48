/**
 * firstTouch — 처음 들어온 경로(UTM) 기억 (PRE-REG-1 · 원장 D-53).
 *
 * 대표 결정 ①(2026-10-17): 분석 쿠키에 동의한 팬만 브라우저에 7일 기억한다. 동의하지 않은
 * 팬은 브라우저에 남기지 않고(메모리 변수만) 그 방문 안에서 등록할 때만 경로를 붙인다.
 * 방문 중에 동의하면 그때부터 지금 방문의 경로를 7일 기억으로 옮긴다.
 */
import { describe, expect, it } from "vitest";
import {
  FIRST_TOUCH_KEY,
  FIRST_TOUCH_TTL_MS,
  createFirstTouch,
  firstTouchEventParams,
  parseUtm,
  type TouchStorage,
} from "@/lib/launch/firstTouch";

function fakeStorage(init: Record<string, string> = {}): TouchStorage & { data: Record<string, string> } {
  const data = { ...init };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

const NOW = Date.UTC(2026, 9, 18, 3, 0);
const DAY = 24 * 3600 * 1000;

describe("parseUtm — 주소의 utm_* 다섯 칸", () => {
  it("있는 것만 읽는다", () => {
    expect(parseUtm("?utm_source=x&utm_medium=share&lang=ko")).toEqual({ source: "x", medium: "share" });
    expect(
      parseUtm("utm_source=ig&utm_medium=social&utm_campaign=c&utm_content=reel&utm_term=t&other=1"),
    ).toEqual({ source: "ig", medium: "social", campaign: "c", content: "reel", term: "t" });
  });
  it("없거나 빈 값이면 null", () => {
    expect(parseUtm("")).toBeNull();
    expect(parseUtm("?lang=ko")).toBeNull();
    expect(parseUtm("?utm_source=&utm_medium=%20")).toBeNull();
  });
  it("값은 100자로 자른다(서버와 같은 상한)", () => {
    expect(parseUtm(`?utm_campaign=${"c".repeat(150)}`)?.campaign).toHaveLength(100);
  });
});

describe("동의한 팬 — 브라우저에 7일 기억", () => {
  it("처음 경로를 저장하고, 나중에 다른 경로로 와도 덮지 않는다", () => {
    const s = fakeStorage();
    const ft = createFirstTouch(() => s);
    ft.observe("?utm_source=ig&utm_medium=social", NOW, true);
    expect(JSON.parse(s.data[FIRST_TOUCH_KEY])).toEqual({ utm: { source: "ig", medium: "social" }, savedAt: NOW });

    // 다음 방문(새 탭) — 다른 경로
    const ft2 = createFirstTouch(() => s);
    ft2.observe("?utm_source=x", NOW + DAY, true);
    expect(ft2.current(NOW + DAY, true)).toEqual({ source: "ig", medium: "social" });
    expect(JSON.parse(s.data[FIRST_TOUCH_KEY]).utm).toEqual({ source: "ig", medium: "social" });
  });

  it("며칠 뒤 경로 없이 다시 와도 기억한 경로를 쓴다", () => {
    const s = fakeStorage({ [FIRST_TOUCH_KEY]: JSON.stringify({ utm: { source: "yt" }, savedAt: NOW - 3 * DAY }) });
    const ft = createFirstTouch(() => s);
    ft.observe("?lang=ko", NOW, true);
    expect(ft.current(NOW, true)).toEqual({ source: "yt" });
  });

  it("7일이 지나면 버리고, 새 경로가 있으면 그것을 새로 기억한다", () => {
    const s = fakeStorage({
      [FIRST_TOUCH_KEY]: JSON.stringify({ utm: { source: "old" }, savedAt: NOW - FIRST_TOUCH_TTL_MS - 1 }),
    });
    const ft = createFirstTouch(() => s);
    expect(ft.current(NOW, true)).toBeNull();
    expect(s.data[FIRST_TOUCH_KEY]).toBeUndefined();
    ft.observe("?utm_source=new", NOW, true);
    expect(ft.current(NOW, true)).toEqual({ source: "new" });
  });

  it("보관 기간은 7일이다", () => {
    expect(FIRST_TOUCH_TTL_MS).toBe(7 * DAY);
  });

  it("망가진 저장값은 버린다", () => {
    const s = fakeStorage({ [FIRST_TOUCH_KEY]: "{not json" });
    const ft = createFirstTouch(() => s);
    expect(ft.current(NOW, true)).toBeNull();
    expect(s.data[FIRST_TOUCH_KEY]).toBeUndefined();
  });
});

describe("동의하지 않은 팬 — 메모리만", () => {
  it("브라우저에 남기지 않지만 같은 방문 안에서는 경로를 쓴다", () => {
    const s = fakeStorage();
    const ft = createFirstTouch(() => s);
    ft.observe("?utm_source=ig", NOW, false);
    expect(s.data).toEqual({});
    expect(ft.current(NOW, false)).toEqual({ source: "ig" });
  });

  it("사이트 안에서 다른 페이지로 옮겨도(같은 방문) 처음 경로를 유지한다", () => {
    const ft = createFirstTouch(() => fakeStorage());
    ft.observe("?utm_source=ig", NOW, false);
    ft.observe("?lang=ko", NOW + 1000, false);
    ft.observe("?utm_source=x", NOW + 2000, false);
    expect(ft.current(NOW + 3000, false)).toEqual({ source: "ig" });
  });

  it("예전에 동의했을 때 기억한 값이 있어도 동의 없이는 읽지 않는다", () => {
    const s = fakeStorage({ [FIRST_TOUCH_KEY]: JSON.stringify({ utm: { source: "yt" }, savedAt: NOW - DAY }) });
    const ft = createFirstTouch(() => s);
    expect(ft.current(NOW, false)).toBeNull();
  });
});

describe("방문 중에 동의 — 지금 방문의 경로를 7일 기억으로 옮긴다", () => {
  it("동의하는 순간 저장한다", () => {
    const s = fakeStorage();
    const ft = createFirstTouch(() => s);
    ft.observe("?utm_source=ig", NOW, false);
    expect(s.data).toEqual({});
    ft.consentChanged(true, NOW + 5000);
    expect(JSON.parse(s.data[FIRST_TOUCH_KEY])).toEqual({ utm: { source: "ig" }, savedAt: NOW + 5000 });
  });

  it("동의를 거두면 기억한 값을 지운다", () => {
    const s = fakeStorage();
    const ft = createFirstTouch(() => s);
    ft.observe("?utm_source=ig", NOW, true);
    ft.consentChanged(false, NOW + 1);
    expect(s.data[FIRST_TOUCH_KEY]).toBeUndefined();
    expect(ft.current(NOW + 2, false)).toEqual({ source: "ig" });
  });
});

describe("저장소를 못 쓰는 환경", () => {
  it("저장소가 없거나 던져도 메모리로 동작한다", () => {
    const throwing: TouchStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    for (const getStorage of [() => null, () => throwing]) {
      const ft = createFirstTouch(getStorage);
      ft.observe("?utm_source=ig", NOW, true);
      ft.consentChanged(true, NOW);
      expect(ft.current(NOW, true)).toEqual({ source: "ig" });
    }
  });
});

describe("firstTouchEventParams — 등록 이벤트에 붙일 값", () => {
  it("first_utm_* 이름으로, 있는 것만", () => {
    expect(firstTouchEventParams({ source: "ig", campaign: "c" })).toEqual({
      first_utm_source: "ig",
      first_utm_campaign: "c",
    });
    expect(firstTouchEventParams(null)).toEqual({});
  });
});
