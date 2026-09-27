/**
 * "지난 발표" 판정 (CHART-HEAD · 2026-09-27 대표 승인) — 발표 시각 알약의 앞부분.
 *
 * `ranking_cache.generatedAt` 을 KST로 바꿔 **오늘 · 어제 · 그 이전(날짜)** 중 하나로 말한다.
 * 발표는 하루 두 번(KST 09:00 · 21:00)이라 새벽(00:00~08:59)에 보면 지난 발표는 매일
 * "어제 21:00"이다. "그 이전"은 크론이 멈췄거나 시드 대회일 때만 나온다.
 *
 * 판정은 시각이 아니라 **KST 날짜**로 한다(`nextRankingUpdate` 와 같은 원칙). 날짜 문자열은
 * `lib/run/kstReset.todayKST` 하나로 센다 — 다른 방식으로 세면 자정 근처에 어긋난다.
 *
 * 시계는 호출자가 주입한다(함수 안에서 `Date.now()` 를 읽지 않는다).
 */
import { todayKST } from "@/lib/run/kstReset";

export interface LastRankingUpdate {
  /** 판정 결과 — 문구 키를 고른다. */
  day: "today" | "yesterday" | "date";
  /** KST "HH:MM" (자정은 "00:00"). */
  time: string;
  /** KST "MM·DD" — 마감 표기(`2026·11·30`)의 가운뎃점을 따른다. */
  date: string;
}

const DAY_MS = 86_400_000;

export function lastRankingUpdate(
  generatedAtMs: number,
  nowMs: number,
): LastRankingUpdate {
  const at = new Date(generatedAtMs);
  const genDay = todayKST(at);
  const today = todayKST(new Date(nowMs));
  // 어제(KST) = 오늘 KST 날짜에서 하루를 뺀 날. KST에는 서머타임이 없어 24시간 빼기가 안전하다.
  const yesterday = todayKST(new Date(nowMs - DAY_MS));

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
  const [, mm, dd] = genDay.split("-");

  // 시계가 조금 뒤처져 generatedAt 이 "미래"로 보여도 오늘로 친다.
  const day =
    genDay >= today ? "today" : genDay === yesterday ? "yesterday" : "date";
  return { day, time, date: `${mm}·${dd}` };
}
