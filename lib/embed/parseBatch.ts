/**
 * parseBatch — 대형 텍스트박스 한 뭉치 → 행 단위 판정 (LAB-EV-1 W4 · §8).
 *
 * 48줄을 한 번에 붙여넣는 화면이라, "한 줄이 틀렸으니 전부 다시"는 최악의 UX다.
 * 행마다 통과/실패를 따로 매기고, 실패한 행은 입력 순번(= 운영자가 화면에서 세는
 * "N번 링크")을 그대로 달고 나간다.
 *
 * 정원(N)은 ADR-EV-6의 BRACKET_SIZES에서 온다 — 48 하드코딩 금지. 정원을 세는
 * 대상은 "유효한 행"이다: 깨진 줄이 정원 한 자리를 잡아먹으면 운영자는 왜 마지막
 * 링크가 잘렸는지 영원히 알 수 없다.
 */
import { parseYouTubeLink, type LinkParseFailure } from "./youtubeUrl";

export type BatchRowFailure = LinkParseFailure | "duplicate" | "over-limit";

export interface BatchRow {
  /** 1-based 입력 순번 — 빈 줄을 제외하고 센다. 오류 메시지의 "N번 링크". */
  index: number;
  raw: string;
  ok: boolean;
  videoId?: string;
  startSec?: number | null;
  reason?: BatchRowFailure;
  /** duplicate일 때 처음 나온 행의 index. */
  duplicateOfIndex?: number;
}

export interface SlotAssignment {
  /** 1..N — 주입될 Contestant 슬롯 번호. */
  slot: number;
  index: number;
  videoId: string;
  startSec: number | null;
}

/**
 * 텍스트 한 뭉치를 행 판정 배열로. 빈 줄은 행으로 세지 않는다(붙여넣기 꼬리 개행).
 * @param limit 규모 N — 이 수를 넘는 "유효한" 행은 over-limit으로 밀린다.
 */
export function parseLinkBatch(text: string, limit: number): BatchRow[] {
  const rows: BatchRow[] = [];
  const firstSeen = new Map<string, number>();
  let index = 0;
  let accepted = 0;

  for (const line of text.split("\n")) {
    const parsed = parseYouTubeLink(line);
    if (!parsed.ok && parsed.reason === "blank") continue;
    index += 1;

    if (!parsed.ok) {
      rows.push({ index, raw: line.trim(), ok: false, reason: parsed.reason });
      continue;
    }

    const seenAt = firstSeen.get(parsed.videoId);
    if (seenAt !== undefined) {
      rows.push({
        index,
        raw: line.trim(),
        ok: false,
        reason: "duplicate",
        duplicateOfIndex: seenAt,
        videoId: parsed.videoId,
      });
      continue;
    }

    if (accepted >= limit) {
      rows.push({
        index,
        raw: line.trim(),
        ok: false,
        reason: "over-limit",
        videoId: parsed.videoId,
      });
      continue;
    }

    firstSeen.set(parsed.videoId, index);
    accepted += 1;
    rows.push({
      index,
      raw: line.trim(),
      ok: true,
      videoId: parsed.videoId,
      startSec: parsed.startSec,
    });
  }

  return rows;
}

/**
 * 통과한 행을 슬롯에 배치한다.
 *
 * LAB-UX-1 ③(대표 확정 2026-08-26) — 예전에는 무조건 **슬롯 01..N**에 꽂았다.
 * 그래서 링크를 붙이면 이미 채워 둔 칸을 덮어썼고, "복구 도구"가 오히려 작업을
 * 지우는 도구였다. 이제 **빈칸에만, 빈칸 개수만큼** 넣는다.
 *
 * @param blankIndexes 비어 있는 슬롯의 0-based index를 **화면 순서대로**. 생략하면
 *   예전처럼 앞에서부터 채운다(다른 호출부·테스트 호환).
 *
 * 빈칸보다 링크가 많으면 남는 링크는 배정되지 않는다 — 넘치는 링크가 채워진 칸을
 * 밀어내는 일은 없다. 몇 개가 남았는지는 화면이 세어 알려준다.
 */
export function assignSlots(
  rows: BatchRow[],
  blankIndexes?: readonly number[],
): SlotAssignment[] {
  const passing = rows.filter((r) => r.ok && r.videoId);
  const targets = blankIndexes ?? passing.map((_, i) => i);
  return passing.slice(0, targets.length).map((r, i) => ({
    slot: targets[i] + 1,
    index: r.index,
    videoId: r.videoId as string,
    startSec: r.startSec ?? null,
  }));
}

/** 통과·경고·차단 집계 — 결과 리스트 헤더의 요약 줄. */
export function summarizeRows(rows: BatchRow[]): { total: number; ok: number; failed: number } {
  const ok = rows.filter((r) => r.ok).length;
  return { total: rows.length, ok, failed: rows.length - ok };
}
