import { describe, it, expect } from "vitest";
import { shouldGenerateCrownCard } from "../core/onChampionConfirmedCore";
import { crownCardStoragePath } from "../_run/runDocId";

/**
 * onChampionConfirmedCore — pure transition guard for the Crown Card trigger
 * (handoff §3, 부록 D, ADR-0005). Fires only on the false→true `complete`
 * edge of a per-Voter roundProgress doc that carries a real Champion. Idempotent
 * by design: a redelivered "already complete" update must NOT re-fire.
 */
const complete = (over: Record<string, unknown> = {}) => ({
  userId: "voter1",
  tournamentId: "t1",
  complete: true,
  championId: "c7",
  ...over,
});

describe("shouldGenerateCrownCard", () => {
  it("fires on the false→true complete edge with a Champion", () => {
    expect(shouldGenerateCrownCard({ complete: false }, complete())).toBe(true);
    expect(shouldGenerateCrownCard(undefined, complete())).toBe(true);
  });

  it("does NOT fire when before was already complete (redelivered event)", () => {
    expect(shouldGenerateCrownCard(complete(), complete())).toBe(false);
  });

  it("does NOT fire on a round-transition write (no complete flag)", () => {
    const transition = { userId: "voter1", tournamentId: "t1", fromRound: 1, toRound: 2 };
    expect(shouldGenerateCrownCard(undefined, transition)).toBe(false);
  });

  it("does NOT fire when after is missing required fields", () => {
    expect(shouldGenerateCrownCard({ complete: false }, complete({ championId: null }))).toBe(false);
    expect(shouldGenerateCrownCard({ complete: false }, complete({ userId: undefined }))).toBe(false);
    expect(shouldGenerateCrownCard({ complete: false }, complete({ tournamentId: "" }))).toBe(false);
  });

  it("does NOT fire when after is undefined (doc deleted)", () => {
    expect(shouldGenerateCrownCard({ complete: false }, undefined)).toBe(false);
  });

  // HF-3 §확인 필요 2 (Guest Run Crown Card transfer, Option A) — VERIFIED here.
  // linkSessionVote re-parents a COMPLETED guest run to the Google uid by a
  // 2-stage write on roundProgress/{googleUid}_{tid}: (1) create complete=false,
  // then (2) update complete=true + championId. The onDocumentUpdated trigger
  // then sees before.complete=false / after.complete=true → this guard must
  // return true so the Crown Card regenerates under the new uid.
  // IMPLEMENTATION CAVEAT (enforced in linkSessionVote, not provable here): the
  // two writes MUST be separate commits — a single create carrying complete=true
  // fires only onDocumentCreated, never onDocumentUpdated, so the card trigger
  // would never run.
  it("fires on the linkSessionVote 2-stage transfer edge (Option A)", () => {
    const created = { userId: "googleUid", tournamentId: "t1", complete: false };
    const updated = {
      userId: "googleUid",
      tournamentId: "t1",
      complete: true,
      championId: "c7",
    };
    expect(shouldGenerateCrownCard(created, updated)).toBe(true);
  });
});

/**
 * RUN-1 §9 함정 10 — 회귀 잠금.
 *
 * 이미지 경로가 `crown-cards/{tid}/{uid}.png` 라 2판째가 1판째 그림을 덮어썼다.
 * 카드 문서만 회차별로 나눠도 그림이 하나면 AC 5(지난 카드 보존)는 실패한다.
 */
describe("Crown Card 이미지 경로 — 회차 (RUN-1, §9 함정 10)", () => {
  it("① 1회차 경로는 현행과 같다 — 옛 카드 이미지가 그대로 살아 있다", () => {
    expect(crownCardStoragePath("gen4_idol_48", "u1", 1)).toBe(
      "crown-cards/gen4_idol_48/u1.png",
    );
  });

  it("② 2회차는 파일이 따로다 — 1판째 그림을 덮으면 지난 카드가 사라진다 (AC 5)", () => {
    expect(crownCardStoragePath("gen4_idol_48", "u1", 2)).toBe(
      "crown-cards/gen4_idol_48/u1_r2.png",
    );
  });

  it("③ 5판이면 그림 파일도 5개다", () => {
    const paths = [1, 2, 3, 4, 5].map((n) =>
      crownCardStoragePath("gen4_idol_48", "u1", n),
    );
    expect(new Set(paths).size).toBe(5);
  });
});
