/**
 * runDocId — 문서 이름을 만드는 유일한 곳 (핸드오프 §3.0 B안 조건 1).
 *
 * 1회차에 접미사를 붙이지 않는 이유는 PR 1(서버)만 배포된 구간을 없애기 위해서다 —
 * 옛 화면은 접미사 없는 roundProgress를 구독하므로, 1회차 이름이 바뀌면
 * 라운드 전환이 영영 안 뜨고 THE FINAL에서 멈춘다 (2026-07-06 HF-1.6과 같은 유형).
 *
 * 대표 경고: "1회차만 예외가 분기로 흩어지면 그게 다음 버그다." → 경계 3건을 여기 못 박는다.
 */
import { describe, expect, it } from "vitest";
import {
  bracketSeedCacheKey,
  crownCardStoragePath,
  runDocId,
  tournamentRunsDocId,
} from "@/lib/run/runDocId";

const UID = "abc123";
// 실제 슬러그는 '_' 를 포함한다 (§9 함정 2) — 이름 규칙이 여기서 깨지면 안 된다.
const TID = "gen4_idol_48";

describe("runDocId", () => {
  it("① 1회차는 접미사가 없다 — 현행 문서 이름과 완전히 같다", () => {
    expect(runDocId(UID, TID, 1)).toBe("abc123_gen4_idol_48");
  });

  it("② 2회차는 _r2", () => {
    expect(runDocId(UID, TID, 2)).toBe("abc123_gen4_idol_48_r2");
  });

  it("③ 5회차는 _r5", () => {
    expect(runDocId(UID, TID, 5)).toBe("abc123_gen4_idol_48_r5");
  });

  it("④ 소유자 판정(docId.split('_')[0])이 회차와 무관하게 uid를 준다 — 보안 규칙이 여기 걸린다", () => {
    expect(runDocId(UID, TID, 1).split("_")[0]).toBe(UID);
    expect(runDocId(UID, TID, 4).split("_")[0]).toBe(UID);
  });

  it("⑤ 0회차·소수·NaN은 던진다 — 잘못된 회차로 만든 이름은 남의 판을 덮는다", () => {
    expect(() => runDocId(UID, TID, 0)).toThrow(/runIndex/);
    expect(() => runDocId(UID, TID, 1.5)).toThrow(/runIndex/);
    expect(() => runDocId(UID, TID, Number.NaN)).toThrow(/runIndex/);
  });
});

describe("crownCardStoragePath", () => {
  it("⑥ 1회차 이미지 경로는 현행과 같다", () => {
    expect(crownCardStoragePath(TID, UID, 1)).toBe("crown-cards/gen4_idol_48/abc123.png");
  });

  it("⑦ 2회차는 이미지가 따로 저장된다 — 1회차 그림을 덮으면 AC 5가 깨진다", () => {
    expect(crownCardStoragePath(TID, UID, 2)).toBe("crown-cards/gen4_idol_48/abc123_r2.png");
  });
});

describe("bracketSeedCacheKey", () => {
  it("⑧ 1회차 캐시 키는 현행과 같다", () => {
    expect(bracketSeedCacheKey(UID, TID, 1)).toBe("wc48_bracket_seed_abc123_gen4_idol_48");
  });

  it("⑨ 2회차는 다른 키 — 회차마다 씨앗이 달라야 대진표가 새로 섞인다 (AC 3)", () => {
    expect(bracketSeedCacheKey(UID, TID, 2)).toBe("wc48_bracket_seed_abc123_gen4_idol_48_r2");
  });
});

describe("tournamentRunsDocId", () => {
  it("⑩ 회차가 붙지 않는다 — 이 문서 하나가 그 Tournament의 모든 판을 관장한다", () => {
    expect(tournamentRunsDocId(UID, TID)).toBe("abc123_gen4_idol_48");
  });

  it("⑪ 소유자 판정이 uid를 준다 — 보안 규칙이 여기 걸린다", () => {
    expect(tournamentRunsDocId(UID, TID).split("_")[0]).toBe(UID);
  });
});
