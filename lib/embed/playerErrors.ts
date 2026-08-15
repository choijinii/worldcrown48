/**
 * playerErrors — IFrame Player API 에러 코드 해석 (LAB-EV-1 W3 · §8).
 *
 * 검증(videos.list)이 통과라고 해도 런타임 재생은 따로 실패할 수 있다: 권리자가
 * 방금 임베드를 껐거나(101·150), 영상이 내려갔거나(100). 그때 카드가 검은 사각형이
 * 되면 안 되므로 썸네일로 폴백하고, "임베드 차단"으로 판명난 코드는 videoStatus에
 * 마킹해 다음 검수/크론이 알아채게 한다(§8 마지막 항목).
 */

export const PLAYER_ERROR_CODES = {
  /** 잘못된 파라미터(대개 videoId 오타). */
  INVALID_PARAM: 2,
  /** HTML5 플레이어 내부 오류. */
  HTML5: 5,
  /** 영상 없음/비공개. */
  NOT_FOUND: 100,
  /** 소유자가 임베드 재생을 막음. */
  EMBED_BLOCKED: 101,
  /** 101과 같은 뜻으로 유튜브가 함께 쓰는 코드. */
  EMBED_BLOCKED_ALT: 150,
} as const;

export type PlayerErrorKind =
  | "invalid-param"
  | "html5"
  | "not-found"
  | "embed-blocked"
  | "unknown";

export interface PlayerErrorInfo {
  code: number;
  kind: PlayerErrorKind;
  /** true면 링크를 갈아야 한다 — videoStatus.embeddable=false로 마킹할 근거. */
  embedBlocked: boolean;
  /** 일시적일 수 있어 재시도가 의미 있는가(HTML5 오류). */
  retryable: boolean;
}

export function describePlayerError(code: number): PlayerErrorInfo {
  switch (code) {
    case PLAYER_ERROR_CODES.INVALID_PARAM:
      return { code, kind: "invalid-param", embedBlocked: false, retryable: false };
    case PLAYER_ERROR_CODES.HTML5:
      return { code, kind: "html5", embedBlocked: false, retryable: true };
    case PLAYER_ERROR_CODES.NOT_FOUND:
      return { code, kind: "not-found", embedBlocked: true, retryable: false };
    case PLAYER_ERROR_CODES.EMBED_BLOCKED:
    case PLAYER_ERROR_CODES.EMBED_BLOCKED_ALT:
      return { code, kind: "embed-blocked", embedBlocked: true, retryable: false };
    default:
      return { code, kind: "unknown", embedBlocked: false, retryable: true };
  }
}
