/**
 * PITCH-2 PR B — 기사 조회 기록 표지 id(1시간 1번) · 표지 수명.
 * 트랜잭션 쪽(첫 조회 셈 · 중복 안 셈 · 초안 안 셈)은 에뮬레이터 통합 시험
 * tests/rules/article-view.store.test.ts 가 본다.
 */
import { describe, expect, it } from "vitest";
import {
  VIEW_MARK_TTL_MS,
  viewMarkExpireAtMs,
  viewMarkId,
} from "../core/articleViewCore";

const HOUR = 3_600_000;
// 2026-11-18 21:00:00 KST = 12:00 UTC (정각)
const T = Date.UTC(2026, 10, 18, 12, 0, 0);

describe("viewMarkId — 같은 연결 · 같은 기사 · 같은 시간(정각~정각)이면 같은 id", () => {
  it("한 시간 안에서는 같다", () => {
    expect(viewMarkId("salt", "1.2.3.4", "s1", T)).toBe(viewMarkId("salt", "1.2.3.4", "s1", T + HOUR - 1));
  });
  it("정각을 넘기면 다르다", () => {
    expect(viewMarkId("salt", "1.2.3.4", "s1", T)).not.toBe(viewMarkId("salt", "1.2.3.4", "s1", T + HOUR));
  });
  it("기사 · IP · 소금이 다르면 다르다", () => {
    const base = viewMarkId("salt", "1.2.3.4", "s1", T);
    expect(viewMarkId("salt", "1.2.3.4", "s2", T)).not.toBe(base);
    expect(viewMarkId("salt", "5.6.7.8", "s1", T)).not.toBe(base);
    expect(viewMarkId("other", "1.2.3.4", "s1", T)).not.toBe(base);
  });
  it("IP 원문이 id 에 들어가지 않는다(해시 64자)", () => {
    const id = viewMarkId("salt", "1.2.3.4", "s1", T);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(id).not.toContain("1.2.3.4");
  });
});

describe("viewMarkExpireAtMs — 표지는 2시간 뒤 자동 삭제(TTL)", () => {
  it("2시간", () => {
    expect(VIEW_MARK_TTL_MS).toBe(2 * HOUR);
    expect(viewMarkExpireAtMs(T)).toBe(T + 2 * HOUR);
  });
});
