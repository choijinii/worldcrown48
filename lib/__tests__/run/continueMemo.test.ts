/**
 * NAV-1 E — 선택 이어가기 알약의 브라우저 메모 (원장 D-18 · 대표 결정 2026-10-11).
 *
 * 판정 = 브라우저 메모 + 기존 읽기(Firestore 읽기 추가 0). 매치 화면에서 선택할 때마다 대회 id·시각을
 * 적고, 대회를 마치면 지운다. 메모 읽기·쓰기는 실패해도 화면이 깨지지 않는다.
 */
import { describe, expect, it } from "vitest";
import {
  CONTINUE_MEMO_MAX_AGE_MS,
  CONTINUE_MEMO_KEY,
  CONTINUE_PILL_ENABLED,
  clearContinue,
  continuePillHref,
  noteContinue,
  readContinueMemo,
} from "@/lib/run/continueMemo";

function memStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    key: (i) => Array.from(m.keys())[i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

function throwingStorage(): Storage {
  const boom = () => {
    throw new Error("SecurityError");
  };
  return { length: 0, clear: boom, getItem: boom, key: boom, removeItem: boom, setItem: boom } as unknown as Storage;
}

describe("메모 쓰기·읽기·지우기", () => {
  it("선택할 때 대회 id·시각을 적고, 다시 읽는다", () => {
    const s = memStorage();
    noteContinue("t1", 1000, s);
    expect(readContinueMemo(s)).toEqual({ tournamentId: "t1", at: 1000 });
  });

  it("다른 대회에서 선택하면 그 대회로 바뀐다 — 가장 최근 하나", () => {
    const s = memStorage();
    noteContinue("t1", 1000, s);
    noteContinue("t2", 2000, s);
    expect(readContinueMemo(s)?.tournamentId).toBe("t2");
  });

  it("대회를 마치면 지운다 — 다른 대회의 완주는 지금 메모를 지우지 않는다", () => {
    const s = memStorage();
    noteContinue("t2", 2000, s);
    clearContinue("t1", s);
    expect(readContinueMemo(s)?.tournamentId).toBe("t2");
    clearContinue("t2", s);
    expect(readContinueMemo(s)).toBeNull();
  });

  it("깨진 메모는 없는 것으로", () => {
    const s = memStorage();
    s.setItem(CONTINUE_MEMO_KEY, "{not json");
    expect(readContinueMemo(s)).toBeNull();
    s.setItem(CONTINUE_MEMO_KEY, JSON.stringify({ tournamentId: "", at: 1 }));
    expect(readContinueMemo(s)).toBeNull();
    s.setItem(CONTINUE_MEMO_KEY, JSON.stringify({ tournamentId: "t", at: "x" }));
    expect(readContinueMemo(s)).toBeNull();
  });

  it("저장소가 막혀도(사생활 보호 창 등) 던지지 않는다", () => {
    const s = throwingStorage();
    expect(() => noteContinue("t1", 1, s)).not.toThrow();
    expect(() => clearContinue("t1", s)).not.toThrow();
    expect(readContinueMemo(s)).toBeNull();
    expect(readContinueMemo(null)).toBeNull();
  });
});

describe("알약 주소 — 그 대회의 매치 화면에서는 숨긴다", () => {
  const memo = { tournamentId: "t1", at: 1 };

  const NOW = 2;

  it("메모가 있으면 그 대결로", () => {
    expect(continuePillHref(memo, "/", NOW, true)).toBe("/arena/t1");
    expect(continuePillHref(memo, "/records", NOW, true)).toBe("/arena/t1");
    expect(continuePillHref(memo, "/arena/t2", NOW, true)).toBe("/arena/t1");
    expect(continuePillHref(memo, "/arena/t1/ranking", NOW, true)).toBe("/arena/t1");
  });

  it("그 대회의 매치 화면 = 숨김", () => {
    expect(continuePillHref(memo, "/arena/t1", NOW, true)).toBeNull();
  });

  it("메모 없음 · 스위치 꺼짐 = 숨김", () => {
    expect(continuePillHref(null, "/", NOW, true)).toBeNull();
    expect(continuePillHref(memo, "/", NOW, false)).toBeNull();
  });

  it("id 는 주소에 안전하게", () => {
    expect(continuePillHref({ tournamentId: "a b", at: 1 }, "/", NOW, true)).toBe("/arena/a%20b");
  });

  it("마지막 선택이 7일을 넘긴 메모는 숨김 — 끝낼 수 없게 된 판(마감 등)이 알약으로 남지 않게", () => {
    expect(CONTINUE_MEMO_MAX_AGE_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(continuePillHref(memo, "/", 1 + CONTINUE_MEMO_MAX_AGE_MS, true)).toBe("/arena/t1");
    expect(continuePillHref(memo, "/", 2 + CONTINUE_MEMO_MAX_AGE_MS, true)).toBeNull();
  });

  it("기능 스위치 기본값은 켜짐", () => {
    expect(CONTINUE_PILL_ENABLED).toBe(true);
  });
});

describe("메모 지우기 — 끝낼 수 없게 된 판 · 로그아웃", () => {
  it("clearContinueAny — 어느 대회든 지운다(로그아웃 · 공용 기기)", async () => {
    const { clearContinueAny } = await import("@/lib/run/continueMemo");
    const s = memStorage();
    noteContinue("t9", 1, s);
    clearContinueAny(s);
    expect(readContinueMemo(s)).toBeNull();
    expect(() => clearContinueAny(throwingStorage())).not.toThrow();
  });
});
