/**
 * Lab 내리기 창 — 순수 판정 (IMAGE-1 PR 3 · 원장 D-77 · D-83 · D-93).
 *
 * 내리기 스위치 하나가 대회 종류(D-90 · 발행 문서 `mediaKind`)를 따른다. `mediaKind` 가 없는 옛 대회는 영상 대회다
 * (2026-11-16 실서비스 발행 대회 3개 모두 영상 대회 — 종류 칸 없음). 판정·쓰기는 서버(takeDownEntry)가 한다 —
 * 여기는 창에 무엇을 보일지만 정한다.
 */
import type { MessageKey } from "@/lib/i18n/messages";
import { isValidVideoId } from "@/lib/embed/youtubeUrl";
import { sourceHost } from "@/lib/media/storageUrl";

export type TakedownKind = "image" | "video";

export function takedownKind(t: { mediaKind?: string }): TakedownKind {
  return t.mediaKind === "image" ? "image" : "video";
}

export interface TakedownCopy {
  button: MessageKey;
  title: MessageKey;
  note: MessageKey;
  confirm: MessageKey;
  run: MessageKey;
  done: MessageKey;
  fail: MessageKey;
  empty: MessageKey;
}

export function takedownCopy(kind: TakedownKind): TakedownCopy {
  const k = kind === "image" ? "image" : "video";
  return {
    button: `lab.takedown.${k}.button`,
    title: `lab.takedown.${k}.title`,
    note: `lab.takedown.${k}.note`,
    confirm: `lab.takedown.${k}.confirm`,
    run: `lab.takedown.${k}.run`,
    done: `lab.takedown.${k}.done`,
    fail: `lab.takedown.${k}.fail`,
    empty: `lab.takedown.${k}.empty`,
  };
}

/** 서버와 같은 상한(functions/src/core/entryTakedown.ts MAX_REASON_LENGTH). */
export const MAX_REASON_LENGTH = 300;

export function isReasonValid(reason: string): boolean {
  const r = reason.trim();
  return r.length > 0 && r.length <= MAX_REASON_LENGTH;
}

export interface TakedownContestant {
  id: string;
  order: number;
  name: string;
  media?: {
    type?: string;
    embed?: { videoId?: string; gone?: boolean };
    image?: { url?: string; sourcePage?: string; origin?: string };
    takedown?: { at: number };
  };
}

export interface TakedownRecordLite {
  atMs?: number;
  reason?: string;
}

export interface TakedownRow {
  id: string;
  order: number;
  name: string;
  /** can = [내리기] · down = 이미 내림(문구 15) · none = 내릴 것이 없는 칸 */
  state: "can" | "down" | "none";
  /** 그림 대회 — 출처 도메인 글자(파일로 넣은 그림은 빈 글자). */
  host: string;
  /** 내린 날짜 YYYY-MM-DD (KST). */
  date: string;
  reason: string;
}

const kstDate = (ms: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(ms),
  );

export function takedownRows(
  kind: TakedownKind,
  contestants: readonly TakedownContestant[],
  records: Readonly<Record<string, TakedownRecordLite>>,
): TakedownRow[] {
  return [...contestants]
    .sort((a, b) => a.order - b.order)
    .map((c) => {
      const base = { id: c.id, order: c.order, name: c.name, host: "", date: "", reason: "" };
      const m = c.media;
      if (m?.takedown) {
        const rec = records[c.id];
        return { ...base, state: "down" as const, date: kstDate(rec?.atMs ?? m.takedown.at), reason: rec?.reason ?? "" };
      }
      if (kind === "image") {
        if (!m?.image?.url) return { ...base, state: "none" as const };
        return { ...base, state: "can" as const, host: m.image.origin === "upload" ? "" : sourceHost(m.image.sourcePage) };
      }
      // 영상 대회: 재검사에서 내려간(gone) 영상도 기록·문서에서 지울 수 있게 [내리기]를 둔다.
      return { ...base, state: isValidVideoId(m?.embed?.videoId) ? ("can" as const) : ("none" as const) };
    });
}
