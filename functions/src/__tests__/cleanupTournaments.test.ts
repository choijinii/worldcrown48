/**
 * cleanup-tournaments — 계획 층 테스트 (RUN-1 PR 2 배포 전제 0단계).
 *
 * 이 정리는 프로덕션 `tournaments` 를 고치는 되돌리기 어려운 작업이라, 실행 전에 확인할 수
 * 있는 지점이 여기뿐이다. 목록은 2026-09-08 실측 + 대표 확정본이며, 아래 숫자·값이 흔들리면
 * 그건 누가 목록을 임의로 고쳤다는 뜻이다.
 */
import { describe, expect, it } from "vitest";
import {
  EXTEND_IDS,
  HIDE_IDS,
  HIDE_SEED_IDS,
  HIDE_NO_DEADLINE_IDS,
  HIDDEN_STATUS,
  PROTECTED_UIDS,
  TEST_ANON_UIDS,
  assertPlanIsSound,
  planTournamentCleanup,
} from "../../scripts/cleanup-tournaments.lib.mjs";

const DEADLINE_MS = Date.UTC(2026, 10, 30, 14, 59, 0); // 2026-11-30 23:59 KST

describe("정리 대상 목록 — 2026-09-08 실측과 대표 확정본", () => {
  it("연장 4건 · 숨김 15건 = 노출 중이던 19건 전부를 덮는다", () => {
    expect(EXTEND_IDS).toHaveLength(4);
    expect(HIDE_IDS).toHaveLength(15);
    expect(EXTEND_IDS.length + HIDE_IDS.length).toBe(19);
  });

  it("숨김은 시드·미리보기 10건 + 마감 없는 5건으로 나뉜다", () => {
    expect(HIDE_SEED_IDS).toHaveLength(10);
    expect(HIDE_NO_DEADLINE_IDS).toHaveLength(5);
  });

  it("연장과 숨김이 같은 Tournament를 겹쳐 집지 않는다", () => {
    const overlap = EXTEND_IDS.filter((id) => HIDE_IDS.includes(id));
    expect(overlap).toEqual([]);
  });

  it("숨김 status 는 코드에 실재하는 값이다 (hidden·archived 는 없다)", () => {
    // lib/types/tournament.ts: TournamentStatus = "active" | "ended" | "draft"
    expect(["active", "ended", "draft"]).toContain(HIDDEN_STATUS);
    expect(HIDDEN_STATUS).toBe("draft");
  });
});

describe("planTournamentCleanup", () => {
  it("연장 단계는 주입받은 마감 시각만 쓴다", () => {
    const plan = planTournamentCleanup({ deadlineMs: DEADLINE_MS });
    const extend = plan.filter((s) => s.op === "extend");
    expect(extend).toHaveLength(4);
    for (const step of extend) {
      expect(step.patch).toEqual({ tournamentDeadline: DEADLINE_MS });
    }
  });

  it("숨김 단계는 status 만 바꾼다 — 마감은 건드리지 않는다", () => {
    const plan = planTournamentCleanup({ deadlineMs: DEADLINE_MS });
    const hide = plan.filter((s) => s.op === "hide");
    expect(hide).toHaveLength(15);
    for (const step of hide) {
      expect(step.patch).toEqual({ status: "draft" });
      expect(step.patch).not.toHaveProperty("tournamentDeadline");
    }
  });

  it("시계를 내부에서 읽지 않는다 — deadlineMs 가 없으면 계획을 만들지 않는다", () => {
    expect(() => planTournamentCleanup({})).toThrow(/deadlineMs/);
  });

  it("계획에 중복된 문서가 있으면 실행 전에 터진다", () => {
    const plan = planTournamentCleanup({ deadlineMs: DEADLINE_MS });
    expect(() => assertPlanIsSound(plan)).not.toThrow();
    expect(() =>
      assertPlanIsSound([...plan, { id: EXTEND_IDS[0], op: "hide", patch: {} }]),
    ).toThrow(/중복/);
  });
});

describe("삭제 대상 uid", () => {
  it("데이터로 증명된 익명 계정 1개뿐이다", () => {
    // tournament_runs·guest_runs 는 PR 1이 만든 컬렉션 → 그 문서를 가진 익명 uid는
    // 09-06 이후 산물임이 증명된다. 나머지 익명 7개는 실제 게스트 팬과 구분되지 않는다.
    expect(TEST_ANON_UIDS).toHaveLength(1);
  });

  it("대표님 실계정은 삭제 대상과 겹치지 않는다", () => {
    const overlap = TEST_ANON_UIDS.filter((uid) => PROTECTED_UIDS.includes(uid));
    expect(overlap).toEqual([]);
  });
});
