/**
 * RUN-1 PR 3 · EVENT_SPEC v1.2 ⑩ — 판(회차) 단위 계측의 열쇠 `match_session_id`.
 *
 * 참가 규칙 v2.0으로 한 사람이 같은 대회를 하루 5판까지 돈다. 회차가 값에 안 들어가면
 * 완주율·이탈 라운드가 판 단위로 안 나뉜다("사람×대회 1:1" 가정은 폐기됐다).
 *
 * ⚠️ `tournamentId` 에는 `_` 가 들어 있다(`gen4_idol_48`). 구분자로 `_` 를 쓰면 다른 조합이
 * 같은 입력 문자열이 되는 자리가 생긴다(§9 함정 2와 같은 유형) — 그래서 경계 테스트가 있다.
 */
import { describe, expect, it } from "vitest";
import { matchSessionId } from "@/lib/analytics/matchSessionId";

const UID = "abc123XYZ";
const TID = "gen4_idol_48";

describe("matchSessionId", () => {
  it("같은 입력이면 늘 같은 값 (기기·세션이 달라도 재현된다)", () => {
    expect(matchSessionId(UID, TID, 1)).toBe(matchSessionId(UID, TID, 1));
  });

  it("길이가 16자다", () => {
    expect(matchSessionId(UID, TID, 1)).toHaveLength(16);
    expect(matchSessionId("u", "t", 99)).toHaveLength(16);
  });

  it("회차가 다르면 값이 다르다 — 이 PR의 존재 이유다", () => {
    const r1 = matchSessionId(UID, TID, 1);
    const r2 = matchSessionId(UID, TID, 2);
    const r3 = matchSessionId(UID, TID, 3);
    expect(new Set([r1, r2, r3]).size).toBe(3);
  });

  it("uid 가 다르면 값이 다르다", () => {
    expect(matchSessionId("uidA", TID, 1)).not.toBe(matchSessionId("uidB", TID, 1));
  });

  it("Tournament 가 다르면 값이 다르다", () => {
    expect(matchSessionId(UID, "gen4_idol_48", 1)).not.toBe(
      matchSessionId(UID, "best_stage_48", 1),
    );
  });

  it("경계: `a_b`+`c` 와 `a`+`b_c` 가 서로 다른 값이다 (구분자 충돌 방지)", () => {
    expect(matchSessionId("a_b", "c", 1)).not.toBe(matchSessionId("a", "b_c", 1));
  });

  it("16진수 소문자만 쓴다 (GA 파라미터로 안전한 문자)", () => {
    expect(matchSessionId(UID, TID, 7)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("앞자리와 뒷자리가 서로 묶여 있지 않다", () => {
    // 같은 입력을 시드만 바꿔 두 번 돌리면 FNV의 낮은 비트가 확산되지 않아 뒷자리의
    // 낮은 두 비트가 앞자리로 결정돼 버린다. 그러면 16자가 16자만큼 일하지 않는다.
    const lowBitsTied = Array.from({ length: 64 }, (_, i) => {
      const v = matchSessionId(UID, TID, i + 1);
      const a = parseInt(v.slice(0, 8), 16);
      const b = parseInt(v.slice(8), 16);
      return ((a ^ b) & 0b11) === 0b10; // 같은 입력 2회 구현에서 늘 참이던 불변식
    });
    expect(lowBitsTied.every(Boolean)).toBe(false);
  });

  it("동기 함수다 — Promise 를 돌려주지 않는다", () => {
    // 비동기가 섞이면 이벤트 발화 지점이 전부 오염된다(발화 순서·누락).
    expect(typeof matchSessionId(UID, TID, 1)).toBe("string");
  });
});
