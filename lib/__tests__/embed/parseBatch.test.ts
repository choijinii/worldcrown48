/**
 * LAB-EV-1 Phase A — 일괄 입력 파싱 (W4 · §8 Edge).
 *
 * 48줄을 한 번에 붙여넣는 화면이다. 한 줄이 잘못됐다고 47줄을 버리면 안 된다:
 * 행 단위로 통과/실패를 표시하고, 통과분만 슬롯에 순서대로 주입한다.
 * 규모 N(48/24/12)은 ADR-EV-6 — 48 하드코딩 금지.
 */
import { describe, expect, it } from "vitest";
import { parseLinkBatch, assignSlots } from "@/lib/embed/parseBatch";

const A = "9bZkp7q19f0";
const B = "dQw4w9WgXcQ";
const C = "_-aB3cD4eF5";

const url = (id: string) => `https://youtu.be/${id}`;

describe("parseLinkBatch — 행 단위 판정", () => {
  it("빈 줄은 행으로 세지 않는다 (붙여넣기 꼬리 개행)", () => {
    const rows = parseLinkBatch(`${url(A)}\n\n${url(B)}\n  \n`, 48);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.index)).toEqual([1, 2]);
  });

  it("행 번호는 입력 순서 그대로 (오류 메시지가 '3번 링크'라고 짚을 수 있게)", () => {
    const rows = parseLinkBatch(`${url(A)}\nnot a link\n${url(B)}`, 48);
    expect(rows[1]).toMatchObject({ index: 2, ok: false, reason: "not-a-link" });
    expect(rows[2]).toMatchObject({ index: 3, ok: true, videoId: B });
  });

  it("중복 링크는 두 번째부터 duplicate — 처음 나온 행을 가리킨다", () => {
    const rows = parseLinkBatch(`${url(A)}\n${url(B)}\n${url(A)}`, 48);
    expect(rows[2]).toMatchObject({
      index: 3,
      ok: false,
      reason: "duplicate",
      duplicateOfIndex: 1,
    });
  });

  it("규모 N을 넘는 행은 over-limit (앞 N개는 그대로 통과)", () => {
    const rows = parseLinkBatch([url(A), url(B), url(C)].join("\n"), 2);
    expect(rows[0].ok).toBe(true);
    expect(rows[1].ok).toBe(true);
    expect(rows[2]).toMatchObject({ index: 3, ok: false, reason: "over-limit" });
  });

  it("over-limit 판정은 '유효한 행'만 센다 (깨진 줄이 정원을 잡아먹지 않는다)", () => {
    const rows = parseLinkBatch(["oops", url(A), url(B)].join("\n"), 2);
    expect(rows[0]).toMatchObject({ ok: false, reason: "not-a-link" });
    expect(rows[1].ok).toBe(true);
    expect(rows[2].ok).toBe(true);
  });

  it("t= 시작 초를 행에 실어 나른다 (운영자가 공유 시점을 지정한 경우)", () => {
    const rows = parseLinkBatch(`https://youtu.be/${A}?t=95`, 48);
    expect(rows[0]).toMatchObject({ ok: true, videoId: A, startSec: 95 });
  });

  it("빈 입력 → 행 0개", () => {
    expect(parseLinkBatch("", 48)).toEqual([]);
    expect(parseLinkBatch("\n\n  \n", 48)).toEqual([]);
  });
});

describe("assignSlots — 통과분만 01..N 순서 주입 (W4)", () => {
  it("깨진 행을 건너뛰고 슬롯은 빈틈 없이 채운다", () => {
    const rows = parseLinkBatch(`${url(A)}\nbroken\n${url(B)}`, 48);
    expect(assignSlots(rows)).toEqual([
      { slot: 1, index: 1, videoId: A, startSec: null },
      { slot: 2, index: 3, videoId: B, startSec: null },
    ]);
  });

  it("통과 행이 없으면 빈 배열", () => {
    expect(assignSlots(parseLinkBatch("nope\nnope2", 48))).toEqual([]);
  });
});
