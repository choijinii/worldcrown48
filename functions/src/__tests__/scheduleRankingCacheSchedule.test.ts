/**
 * RUN-1 PR 3 · AC 14 — 랭킹 발표 주기가 **KST 09:00·21:00 에 못박혀 있다.**
 *
 * `onSchedule` 의 설정은 런타임에 실행해 볼 수 있는 값이 아니라(배포 시각에 Cloud Scheduler
 * 가 읽는다) 소스를 읽어 검증한다. 리포에 이미 같은 방식의 가드가 있다 —
 * `lib/__tests__/hexGuard.test.ts`.
 *
 * 이 테스트가 지키는 것은 크론식 한 줄이 아니라 **화면 문구의 사실성**이다. §8 승인 문구는
 * "오늘 21:00" · "내일 09:00" 이라는 **고정 시각**이라, 스케줄이 그 시각에 못박혀 있지 않으면
 * 화면이 거짓말을 한다. 그래서 `"every 12 hours"`(배포 시각 기준 상대 주기 — 배포할 때마다
 * 발표 시각이 달라진다)는 이름부터 금지다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(
  join(__dirname, "..", "scheduleRankingCache.ts"),
  "utf8",
);

describe("scheduleRankingCache 스케줄 (AC 14)", () => {
  it("크론식이 KST 09:00·21:00 고정이다", () => {
    expect(SOURCE).toContain('schedule: "0 9,21 * * *"');
  });

  it("timeZone 이 Asia/Seoul 이다", () => {
    // 없으면 UTC로 돌아 KST 18:00·06:00에 발표된다 — 문구와 12시간이 어긋난다.
    expect(SOURCE).toContain('timeZone: "Asia/Seoul"');
  });

  it('상대 주기("every ...")를 쓰지 않는다', () => {
    expect(SOURCE).not.toMatch(/schedule:\s*"every /);
  });

  it("긴 실행 여유(timeoutSeconds 540)는 그대로 유지한다", () => {
    expect(SOURCE).toContain("timeoutSeconds: 540");
  });

  it("조회 하한이 마감 유예 창이다 — 마감 직전 선택이 최종 랭킹에서 빠지지 않는다", () => {
    // `> now` 로 되돌아가면 팬이 보는 최종 랭킹에서 마감 직전 최대 12시간이 사라지고
    // (팬은 W-7 때문에 마감 후에만 본다) `onChampionForNews` 의 기사 Champion까지 틀어진다.
    expect(SOURCE).toContain("rankingWindowStartMs");
    expect(SOURCE).not.toMatch(/where\("tournamentDeadline",\s*">",\s*now\)/);
  });

  it("HISTORY_KEEP 이 2다 — 하루 2회 발표에서 '24시간 전'이 되는 세대 수", () => {
    // 60분 주기 시절의 24는 12일 전을 가리키게 된다. T-3(#1 +200% over 24h)의 기준선이
    // 사실과 맞으려면 발표 2회 전이어야 한다.
    expect(SOURCE).toMatch(/const HISTORY_KEEP = 2;/);
  });
});
