/**
 * kstReset — 자정 리셋 판정이 리포 전체에서 하나뿐임을 고정한다.
 *
 * 1안(회차 누적 + 오늘 판 수)에서 자정 리셋은 문서 id가 아니라 코드 판정이 됐다.
 * 핸드오프 §3.0 조건 2가 지목한 "1안이 새로 만든 유일한 위험"이 여기다.
 */
import { describe, expect, it } from "vitest";
import { isSameKstDay, todayKST } from "@/lib/run/kstReset";

describe("isSameKstDay", () => {
  it("① 같은 날이면 true", () => {
    expect(isSameKstDay("2026-09-05", "2026-09-05")).toBe(true);
  });

  it("② 어제면 false — 어제 값은 없는 것으로 본다", () => {
    expect(isSameKstDay("2026-09-04", "2026-09-05")).toBe(false);
  });

  it("③ 문서가 없어 날짜가 null이면 false", () => {
    expect(isSameKstDay(null, "2026-09-05")).toBe(false);
  });

  it("④ 빈 문자열도 false — 손상된 필드를 오늘로 읽지 않는다", () => {
    expect(isSameKstDay("", "2026-09-05")).toBe(false);
  });
});

/**
 * todayKST — "오늘(KST)"을 세는 유일한 함수 (2026-09-05 대표 지시).
 *
 * 이 값은 모든 판 판정의 입력이다. 서버와 클라이언트가 각자 세면 자정 근처에 하루가
 * 어긋나고, 그게 §9 함정 5가 경고한 P0다 — lib/run/ 을 만든 이유가 "같은 테스트로 검증된
 * 두 코드"가 아니라 "문자 그대로 같은 코드"인데 정작 입력값이 두 코드로 남으면 헛일이다.
 *
 * ⚠️ new Date().toISOString().slice(0,10) 은 UTC라 매일 0~9시에 "어제"를 준다.
 */
describe("todayKST", () => {
  it("⑤ KST 자정 경계 — UTC 14:59:59는 아직 어제다", () => {
    expect(todayKST(new Date("2026-09-05T14:59:59Z"))).toBe("2026-09-05");
  });

  it("⑥ KST 자정 경계 — UTC 15:00:00은 다음 날이다 (KST 00:00)", () => {
    expect(todayKST(new Date("2026-09-05T15:00:00Z"))).toBe("2026-09-06");
  });

  it("⑦ UTC 00:00~09:00 구간에서 UTC 기준으로 세면 하루가 밀린다", () => {
    // 조건 1이 경고한 바로 그 구간. UTC로 자르면 "2026-09-05"가 나온다.
    expect(todayKST(new Date("2026-09-05T00:00:00Z"))).toBe("2026-09-05");
    expect(todayKST(new Date("2026-09-05T08:59:59Z"))).toBe("2026-09-05");
    // 서울은 이미 9월 5일 09:00~17:59다 — 날짜는 같지만 UTC 자정 직전이 위험하다.
    expect(todayKST(new Date("2026-09-04T23:00:00Z"))).toBe("2026-09-05");
  });

  it("⑧ YYYY-MM-DD 형식이다 — Firestore 문서 id에 그대로 들어간다", () => {
    expect(todayKST(new Date("2026-01-02T03:04:05Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
