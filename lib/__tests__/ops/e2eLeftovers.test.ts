/**
 * OPS-FIX-1 · 원장 D-66 — 실서비스에 남은 E2E 시험 대회를 고르는 규칙.
 *
 * 정리 스크립트(functions/scripts/clear-e2e-leftovers.mjs)와 Playwright 전역 마무리
 * (e2e/global-teardown.ts)가 같은 규칙을 쓴다. 진짜 대회를 지우면 되돌릴 수 없으므로
 * "확실한 신호"가 있을 때만 test 로 고르고, 이름에 e2e·test 가 든 것만으로는 지우지 않는다.
 */
import { describe, expect, it } from "vitest";
import {
  E2E_STALE_AFTER_MS,
  classifyTournament,
  isRunScopedDocOf,
  isStaleE2ETournament,
  planLeftovers,
} from "@/lib/ops/e2eLeftovers";

describe("classifyTournament — 시험 대회 / 확인 필요 / 진짜", () => {
  it("e2e: true 표시가 있으면 시험", () => {
    expect(classifyTournament("abc123", { e2e: true, hostUid: "uid-1", title: "아무 제목" }).verdict).toBe("test");
  });

  it("주인이 seed- 로 시작하면 시험 (E2E 의 seed-operator)", () => {
    expect(classifyTournament("abc123", { hostUid: "seed-operator", title: "x" }).verdict).toBe("test");
  });

  it("시험 파일이 쓰는 고정 id 는 시험", () => {
    for (const id of [
      "arena1-e2e-tournament",
      "c1-e2e-tournament",
      "c2-e2e-tournament",
      "c2-e2e-mobile-tournament",
      "run1-daily-limit-e2e-tournament",
      "hf3-guest-e2e-a",
      "hf3-guest-e2e-b",
      "c3-e2e-loaded",
      "c3-e2e-few",
    ]) {
      expect(classifyTournament(id, { hostUid: "uid-1" }).verdict, id).toBe("test");
    }
  });

  // thumb1-pitch 는 대표 계정(TEST_UID)을 주인으로 쓰고 id 가 자동 — 제목으로만 알아본다.
  // b1-admin-lab 은 Lab 화면으로 "E2E Tournament" 를 발행한다.
  it("시험 파일이 쓰는 고정 제목은 시험 (주인이 사람 계정이어도)", () => {
    expect(classifyTournament("Zx9autoId", { hostUid: "owner-uid", title: "THUMB-1 E2E Pitch" }).verdict).toBe("test");
    expect(classifyTournament("Zx9autoId", { hostUid: "owner-uid", title: "E2E Tournament" }).verdict).toBe("test");
    expect(
      classifyTournament("Zx9autoId", { hostUid: "owner-uid", titleI18n: { ko: "E2E Tournament", en: "", es: "" } })
        .verdict,
    ).toBe("test");
  });

  it("이름에 e2e·test 가 든 것만으로는 지우지 않는다 — 확인 필요", () => {
    expect(classifyTournament("my-test-cup", { hostUid: "uid-1", title: "진짜 대회" }).verdict).toBe("suspect");
    expect(classifyTournament("Ab12", { hostUid: "uid-1", title: "Test of Legends" }).verdict).toBe("suspect");
  });

  it("실서비스의 진짜 대회 세 개는 진짜", () => {
    for (const [id, title] of [
      ["i4D6ghnCTflykgwbBwsH", "현존하는 최고의 댄스퍼포먼스의 남자아이돌은 누구?"],
      ["Ob0J9vBpOmQ9bGaqt1ws", "현재 Kpop 아티스트중에 가장 뛰어난 퍼포먼스를 보여주는 아티스트는 누구?"],
      ["FbzCreuLSW4l7u0VUsKs", "현재 활동하는 kpop여자 아이돌중에 최고의 퍼포먼스를 보여주는 여자 아이돌은 누구?"],
    ]) {
      expect(classifyTournament(id, { hostUid: "89dvYo8s5ia2SywMiVR6ZGhn6Ex2", title }).verdict, id).toBe("real");
    }
  });

  it("왜 그렇게 골랐는지 이유를 남긴다 (표에 쓴다)", () => {
    const r = classifyTournament("c1-e2e-tournament", { hostUid: "seed-operator", e2e: true, title: "E2E Strikers" });
    expect(r.reasons).toEqual(expect.arrayContaining(["e2e 표시", "주인 seed-", "시험 id"]));
  });
});

describe("isRunScopedDocOf — {uid}_{tid}[_rN] 문서가 그 대회 것인가", () => {
  const TID = "c1-e2e-tournament";

  it("첫 판과 2~5판 문서", () => {
    expect(isRunScopedDocOf(`uid1_${TID}`, TID)).toBe(true);
    expect(isRunScopedDocOf(`uid1_${TID}_r2`, TID)).toBe(true);
    expect(isRunScopedDocOf(`uid1_${TID}_r5`, TID)).toBe(true);
  });

  it("다른 대회 · 이름이 이어 붙은 다른 대회 · 접두어만 같은 것은 아니다", () => {
    expect(isRunScopedDocOf("uid1_other", TID)).toBe(false);
    expect(isRunScopedDocOf(`uid1_${TID}-copy`, TID)).toBe(false);
    expect(isRunScopedDocOf(`uid1_x${TID}`, TID)).toBe(false);
    expect(isRunScopedDocOf(TID, TID)).toBe(false);
  });
});

describe("isStaleE2ETournament — 전역 마무리가 쓸어 낼 대회", () => {
  const NOW = 1_800_000_000_000;

  it("e2e 표시 + 심은 지 2시간 넘음 = 쓸어 냄", () => {
    expect(isStaleE2ETournament({ e2e: true, e2eSeededAt: NOW - E2E_STALE_AFTER_MS - 1 }, NOW)).toBe(true);
  });

  it("2시간 안 = 동시에 도는 다른 CI 실행의 대회일 수 있어 그대로", () => {
    expect(isStaleE2ETournament({ e2e: true, e2eSeededAt: NOW - E2E_STALE_AFTER_MS + 1 }, NOW)).toBe(false);
  });

  it("표시가 없거나 심은 시각을 모르면 건드리지 않는다", () => {
    expect(isStaleE2ETournament({ e2eSeededAt: NOW - 10 * E2E_STALE_AFTER_MS }, NOW)).toBe(false);
    expect(isStaleE2ETournament({ e2e: true }, NOW)).toBe(false);
  });

  it("Firestore Timestamp(toMillis) · Date 도 읽는다", () => {
    const old = NOW - 3 * E2E_STALE_AFTER_MS;
    expect(isStaleE2ETournament({ e2e: true, e2eSeededAt: { toMillis: () => old } }, NOW)).toBe(true);
    expect(isStaleE2ETournament({ e2e: true, e2eSeededAt: new Date(old) }, NOW)).toBe(true);
  });

  it("E2E_STALE_AFTER_MS = 2시간", () => {
    expect(E2E_STALE_AFTER_MS).toBe(2 * 60 * 60 * 1000);
  });
});

describe("planLeftovers — 정리 스크립트의 표", () => {
  it("test 는 지울 목록, suspect 는 확인 목록, 진짜는 개수만 — 진짜 대회는 어느 목록에도 없다", () => {
    const plan = planLeftovers([
      { id: "c1-e2e-tournament", data: { hostUid: "seed-operator", title: "E2E Strikers" } },
      { id: "Zx9autoId", data: { hostUid: "owner", title: "THUMB-1 E2E Pitch" } },
      { id: "my-test-cup", data: { hostUid: "owner", title: "진짜일지도" } },
      { id: "i4D6ghnCTflykgwbBwsH", data: { hostUid: "owner", title: "현존하는 최고의 댄스퍼포먼스의 남자아이돌은 누구?" } },
    ]);
    expect(plan.toDelete.map((t) => t.id)).toEqual(["c1-e2e-tournament", "Zx9autoId"]);
    expect(plan.toReview.map((t) => t.id)).toEqual(["my-test-cup"]);
    expect(plan.realCount).toBe(1);
  });

  it("제목은 title → titleI18n.ko 순으로 표에 싣는다", () => {
    const plan = planLeftovers([{ id: "c3-e2e-few", data: { titleI18n: { ko: "적은 판" } } }]);
    expect(plan.toDelete[0].title).toBe("적은 판");
  });
});
