/**
 * PITCH-2 PR B — 기사 조회 기록 표지 id(1시간 1번) · 표지 수명.
 * 트랜잭션 쪽(첫 조회 셈 · 중복 안 셈 · 초안 안 셈)은 에뮬레이터 통합 시험
 * tests/rules/article-view.store.test.ts 가 본다.
 */
import { describe, expect, it } from "vitest";
import {
  EMULATOR_CLIENT,
  VIEW_MARK_TTL_MS,
  clientIpOf,
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

type Raw = Parameters<typeof clientIpOf>[0];
const req = (xff?: string, ip?: string): Raw => ({ ip, headers: xff === undefined ? {} : { "x-forwarded-for": xff } });

describe("clientIpOf — 구글 앞단이 덧붙인 맨 오른쪽 주소(팬이 적어 보낸 왼쪽 값은 보지 않는다)", () => {
  it("머리글이 주소 하나면 그 주소", () => {
    expect(clientIpOf(req("1.2.3.4"), false)).toBe("1.2.3.4");
  });
  it("팬이 가짜 값을 앞에 적어 보내도 맨 오른쪽(진짜) 주소", () => {
    expect(clientIpOf(req("6.6.6.6, 7.7.7.7, 1.2.3.4"), false)).toBe("1.2.3.4");
    expect(clientIpOf(req("9.9.9.9,1.2.3.4"), false)).toBe(clientIpOf(req("8.8.8.8,1.2.3.4"), false));
  });
  it("req.ip(머리글 맨 왼쪽 = 위조 가능)는 보지 않는다", () => {
    expect(clientIpOf(req(undefined, "6.6.6.6"), false)).toBe("");
  });
  it("머리글이 배열로 와도 마지막 값", () => {
    expect(clientIpOf({ headers: { "x-forwarded-for": ["6.6.6.6", "1.2.3.4"] } } as Raw, false)).toBe("1.2.3.4");
  });
  it("IPv6 는 앞 64비트로 묶는다(주소를 계속 바꾸는 우회 막기)", () => {
    expect(clientIpOf(req("2001:db8:1:2:aaaa:bbbb:cccc:dddd"), false)).toBe("2001:db8:1:2::/64");
    expect(clientIpOf(req("2001:db8:1:2::1"), false)).toBe("2001:db8:1:2::/64");
    expect(clientIpOf(req("2001:db8::5"), false)).toBe("2001:db8:0:0::/64");
  });
  it("IPv4 를 담은 IPv6(::ffff:) 는 IPv4 로", () => {
    expect(clientIpOf(req("::ffff:1.2.3.4"), false)).toBe("1.2.3.4");
  });
  it("실서비스에서 머리글이 없으면 빈 글자(세지 않는다)", () => {
    expect(clientIpOf(req(), false)).toBe("");
    expect(clientIpOf(undefined, false)).toBe("");
  });
  it("에뮬레이터는 머리글이 없어 고정 이름", () => {
    expect(clientIpOf(req(), true)).toBe(EMULATOR_CLIENT);
    expect(clientIpOf(undefined, true)).toBe(EMULATOR_CLIENT);
  });
});
