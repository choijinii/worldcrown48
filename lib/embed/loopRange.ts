/**
 * loopRange — 10초 루프 구간과 플레이어 파라미터 (LAB-EV-1 W3 · ADR-EV-1·3).
 *
 * LoopPlayer는 이 두 함수 위에 얹힌 얇은 래퍼여야 한다: 구간 계산과 노출 정책은
 * 전부 여기(순수 로직)에 있고, 컴포넌트는 IFrame API에 값을 넘기기만 한다.
 * 덕분에 ADR-EV-7의 "MVP2 단건 위젯"이 UI를 새로 짜도 규칙은 그대로 재사용된다.
 */
import { LOOP_SECONDS } from "./constants";

export interface LoopRangeInput {
  startSec: number;
  durationSec: number | null;
  loopSec?: number;
}

export interface LoopRange {
  startSec: number;
  endSec: number;
}

/**
 * 시작점 + 루프 길이 → 실제 재생 구간. §8의 짧은 영상·범위 밖 시작점을 접어 넣는다:
 *   길이 < 루프          → 영상 전체
 *   시작점 + 루프 > 길이 → 끝까지만 (시작점이 아예 밖이면 마지막 루프 구간으로)
 */
export function resolveLoopRange({
  startSec,
  durationSec,
  loopSec = LOOP_SECONDS,
}: LoopRangeInput): LoopRange {
  const start = Math.max(0, Math.floor(startSec));

  if (durationSec === null) return { startSec: start, endSec: start + loopSec };

  const duration = Math.max(0, Math.floor(durationSec));
  if (duration <= loopSec) return { startSec: 0, endSec: duration };
  if (start >= duration) return { startSec: duration - loopSec, endSec: duration };
  return { startSec: start, endSec: Math.min(start + loopSec, duration) };
}

/**
 * ADR-EV-3 카드 노출 조합의 파라미터 절반. 나머지 절반(1:1 크롭·클릭 차단·출처
 * 칩)은 LoopPlayer의 CSS/마크업이 맡는다.
 *
 * mute=1은 협상 대상이 아니다: 자동재생을 브라우저가 허용하는 유일한 조건이자
 * ADR-EV-1의 "무음 고정"이다.
 */
export function buildPlayerVars({ startSec, endSec }: LoopRange): Record<string, number> {
  return {
    autoplay: 1,
    mute: 1,
    controls: 0,
    playsinline: 1,
    rel: 0,
    modestbranding: 1,
    disablekb: 1,
    fs: 0,
    iv_load_policy: 3,
    start: startSec,
    end: endSec,
  };
}

/** [원본 열기] · 출처 칩 "▶ YouTube" 목적지 — 언제나 원본 watch 페이지. */
export function buildWatchUrl(videoId: string, startSec?: number): string {
  const base = `https://www.youtube.com/watch?v=${videoId}`;
  return typeof startSec === "number" && startSec > 0 ? `${base}&t=${Math.floor(startSec)}s` : base;
}

/**
 * 지금 재생 위치가 구간을 벗어났는가 — LoopPlayer의 되감기 판정.
 *
 * `end` 파라미터만 믿으면 유튜브가 재생을 "정지"시킨 뒤 ENDED가 오기까지 한 박자
 * 검은 화면이 생긴다. 끝에 닿기 직전(guard)에 미리 되감아야 이음매가 안 보인다.
 * 앞으로 튄 경우(사용자 조작·버퍼링 점프)도 되감기 대상이다.
 */
export function shouldLoopBack(
  currentSec: number,
  range: LoopRange,
  guardSec = 0.3,
): boolean {
  if (currentSec >= range.endSec - guardSec) return true;
  return currentSec < range.startSec - 1;
}

/** 썸네일 폴백(에러 2·5·100·101·150 · 판정 리스트 미리보기 공용). */
export function buildThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
