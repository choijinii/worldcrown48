/**
 * "다음 발표" 한 줄의 문구를 정하는 순수 판정 (RUN-1 PR 3 · AC 15).
 *
 * 랭킹 캐시는 하루 두 번, **KST 09:00 · 21:00** 에 갱신된다
 * (`functions/src/scheduleRankingCache.ts` — `"0 9,21 * * *"` + `timeZone: "Asia/Seoul"`).
 * 12시간 멈춘 숫자는 팬에게 "고장"으로 읽히므로, 다음 발표가 언제인지 한 줄로 말해 주는 것이
 * 주기 연장의 **필수 동반 조건**이다(핸드오프 §3 Phase 3 · 2026-09-04 대표 확정).
 *
 * 판정은 시각이 아니라 **날짜**로 한다(§8 발표 시각 표기 규칙). ❌ "22시 이후면 내일" 같은
 * 시각 기준으로 박으면 자정을 넘긴 새벽에 틀린 글자가 뜬다.
 *
 * ⚠️ **새벽 구간(KST 00:00~08:59)은 줄을 감춘다.** 이 구간의 다음 발표는 "오늘 09:00" 인데
 * §8 승인 문구는 "오늘 21:00"·"내일 09:00" 두 개뿐이라 그 사실을 말할 문구가 없다. 문구를
 * 임의로 지어내지 않고(§5 DO 7 — 한 글자도 변경 금지) 감추는 쪽을 골랐다. "오늘 21:00"은
 * 12시간 틀린 시각이고 "내일 09:00"은 날짜가 틀린다 — 둘 다 거짓말이다.
 * → **새벽 구간 문구 1건은 대표 승인 대기**다. 승인되면 여기 분기 하나와 키 하나만 늘어난다.
 */

/** §8 고정 발표 시각 (KST). 크론식 `"0 9,21 * * *"` 과 같은 사실이다. */
const PUBLISH_HOURS = [9, 21] as const;

/**
 * 주입된 순간의 KST 시(0~23).
 *
 * `lib/run/kstReset.ts` 의 `todayKST` 와 **같은 방식**(Intl + `Asia/Seoul`)이다. 날짜만 필요한
 * 곳은 그 함수를 그대로 쓰고(`getTodayKST`), 여기는 시가 필요해 한 줄 더 둔다.
 *
 * ❌ `new Date().toISOString().slice(...)` 로 세지 말 것 — UTC라 매일 0~9시에 하루가 어긋난다.
 * `hourCycle: "h23"` 이 필수다. 이걸 빼면 로케일에 따라 자정이 `24` 로 나와 판정이 무너진다.
 */
export function kstHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
}

/**
 * 어느 승인 문구를 쓸지 — `null` 은 "이 구간엔 맞는 문구가 없으니 줄을 감춘다".
 *
 * 호출자가 KST 시를 **주입**한다(함수 안에서 시계를 읽지 않는다). 그래야 날짜 경계가
 * 결정적으로 테스트된다 — §3.0 대표 조건 2와 같은 이유다.
 */
export function nextRankingUpdate(
  hourKST: number,
): "today" | "tomorrow" | null {
  const [morning, evening] = PUBLISH_HOURS;
  // 09:00~20:59 — 다음 발표는 오늘 21:00. (오늘 날짜 그대로)
  if (hourKST >= morning && hourKST < evening) return "today";
  // 21:00~23:59 — 다음 발표는 내일 09:00. (KST 날짜가 하루 넘어간다)
  if (hourKST >= evening) return "tomorrow";
  // 00:00~08:59 — 다음 발표는 "오늘 09:00". 승인 문구에 없는 사실이라 감춘다.
  return null;
}
